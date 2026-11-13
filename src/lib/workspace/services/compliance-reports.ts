import {
  ComplianceReportStatus,
  EmailStatus,
  MembershipStatus,
  type Prisma,
  UserRole,
} from "@/generated/prisma/client";
import { writeAuditEvent, writeSystemAuditEvent } from "@/lib/audit";
import { escapeEmailHtml } from "@/lib/cloudflare-email";
import { sendTrackedComplianceEmail } from "@/lib/compliance-reports";
import { publicAppUrl } from "@/lib/instance-config";
import { prisma } from "@/lib/prisma";

const tenantWideRoles = new Set<UserRole>([
  UserRole.SUPER_ADMIN,
  UserRole.PARTY_ADMIN,
  UserRole.CENTRAL_REVIEWER,
  UserRole.READONLY_AUDITOR,
]);
const reviewRoles = new Set<UserRole>([
  UserRole.SUPER_ADMIN,
  UserRole.PARTY_ADMIN,
  UserRole.CENTRAL_REVIEWER,
  UserRole.LOCAL_ADMIN,
]);

function reportWhere(membership: {
  tenantId: string;
  role: UserRole;
  orgUnitId: string | null;
  candidateId: string | null;
}): Prisma.ComplianceReportWhereInput | null {
  if (tenantWideRoles.has(membership.role)) {
    return { tenantId: membership.tenantId };
  }

  if (membership.role === UserRole.LOCAL_ADMIN || membership.role === UserRole.CAMPAIGN_MANAGER) {
    return membership.orgUnitId
      ? { tenantId: membership.tenantId, ad: { is: { orgUnitId: membership.orgUnitId } } }
      : null;
  }

  if (membership.role === UserRole.CANDIDATE) {
    return membership.candidateId
      ? { tenantId: membership.tenantId, ad: { is: { candidateId: membership.candidateId } } }
      : null;
  }

  return null;
}

function reportResponseDeadline(createdAt: Date, electionDate: Date | null) {
  if (!electionDate) {
    return {
      responseDueAt: "",
      responseOverdue: false,
    };
  }

  const finalMonthStartsAt = new Date(electionDate);
  finalMonthStartsAt.setUTCMonth(finalMonthStartsAt.getUTCMonth() - 1);

  if (createdAt < finalMonthStartsAt || createdAt > electionDate) {
    return {
      responseDueAt: "",
      responseOverdue: false,
    };
  }

  const dueAt = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000);

  return {
    responseDueAt: dueAt.toISOString(),
    responseOverdue: dueAt.getTime() < Date.now(),
  };
}

async function reportMembership(userId: string) {
  return prisma.tenantMembership.findFirst({
    where: {
      userId,
      status: MembershipStatus.ACTIVE,
    },
    select: {
      tenantId: true,
      role: true,
      orgUnitId: true,
      candidateId: true,
      user: {
        select: {
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function listComplianceReports(userId: string, page = 1, limit = 25) {
  const membership = await reportMembership(userId);
  const where = membership ? reportWhere(membership) : null;

  if (!membership || !where) {
    return null;
  }

  const normalizedPage = Math.max(1, Math.trunc(page));
  const normalizedLimit = Math.min(100, Math.max(10, Math.trunc(limit)));
  const [reports, total] = await prisma.$transaction([
    prisma.complianceReport.findMany({
      where,
      include: {
        ad: {
          select: {
            code: true,
            titleCs: true,
            orgUnit: {
              select: {
                nameCs: true,
              },
            },
            campaign: {
              select: {
                electionDate: true,
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (normalizedPage - 1) * normalizedLimit,
      take: normalizedLimit,
    }),
    prisma.complianceReport.count({ where }),
  ]);

  return {
    reports: reports.map((report) => {
      const deadline = reportResponseDeadline(report.createdAt, report.ad.campaign.electionDate);

      return {
        id: report.id,
        adCode: report.ad.code,
        adTitle: report.ad.titleCs,
        branch: report.ad.orgUnit.nameCs,
        reporterEmail: report.reporterEmail,
        reporterName: report.reporterName,
        reason: report.reason,
        details: report.details,
        status: report.status,
        resolution: report.resolution,
        createdAt: report.createdAt.toISOString(),
        resolvedAt: report.resolvedAt?.toISOString() ?? "",
        ...deadline,
      };
    }),
    total,
    page: normalizedPage,
    limit: normalizedLimit,
    hasMore: normalizedPage * normalizedLimit < total,
    canResolve: reviewRoles.has(membership.role),
  };
}

export async function resolveComplianceReport(
  userId: string,
  reportId: string,
  status: ComplianceReportStatus,
  resolution: string,
) {
  const membership = await reportMembership(userId);
  const where = membership ? reportWhere(membership) : null;

  if (!membership || !where || !reviewRoles.has(membership.role)) {
    return null;
  }

  const existing = await prisma.complianceReport.findFirst({
    where: {
      ...where,
      id: reportId,
    },
    include: {
      ad: {
        select: {
          id: true,
          code: true,
          publicToken: true,
          titleCs: true,
        },
      },
    },
  });

  if (!existing) {
    return null;
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.complianceReport.update({
      where: { id: existing.id },
      data: {
        status,
        resolution,
        resolvedAt: status === ComplianceReportStatus.RESOLVED || status === ComplianceReportStatus.REJECTED ? new Date() : null,
      },
    });

    await writeAuditEvent(tx, {
      tenantId: membership.tenantId,
      adId: existing.ad.id,
      entityType: "compliance_report",
      entityId: existing.id,
      entityLabel: existing.ad.code,
      actor: membership.user.email,
      actorUserId: userId,
      actorRole: membership.role,
      actorScope: membership.orgUnitId || membership.candidateId || "tenant",
      action: "resolve_compliance_report",
      messageCs: `Hlášení k reklamě ${existing.ad.code} změněno na ${status}.`,
      messageEn: `Compliance report for ad ${existing.ad.code} changed to ${status}.`,
      before: {
        status: existing.status,
        resolution: existing.resolution,
      },
      after: {
        status,
        resolution,
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      resolution: updated.resolution,
      resolvedAt: updated.resolvedAt?.toISOString() ?? "",
    };
  });

  if (
    existing.reporterEmail &&
    (status === ComplianceReportStatus.RESOLVED || status === ComplianceReportStatus.REJECTED)
  ) {
    const statusLabel = status === ComplianceReportStatus.RESOLVED ? "vyřešeno" : "zamítnuto";
    const noticeUrl = `${publicAppUrl()}/ad/${encodeURIComponent(existing.ad.publicToken)}`;
    const bodyText = [
      `Hlášení ${existing.id} k reklamě ${existing.ad.code} bylo ${statusLabel}.`,
      "",
      `Vyřízení: ${resolution}`,
      "",
      `Veřejné oznámení: ${noticeUrl}`,
      "",
      "Pokud s vyřízením nesouhlasíte, můžete se obrátit na příslušný dozorový orgán nebo využít jiný dostupný prostředek nápravy.",
    ].join("\n");
    const bodyHtml = `
      <p>Hlášení <strong>${escapeEmailHtml(existing.id)}</strong> k reklamě <strong>${escapeEmailHtml(existing.ad.code)}</strong> bylo ${escapeEmailHtml(statusLabel)}.</p>
      <p><strong>Vyřízení:</strong> ${escapeEmailHtml(resolution)}</p>
      <p><a href="${escapeEmailHtml(noticeUrl)}">Otevřít veřejné oznámení</a></p>
      <p>Pokud s vyřízením nesouhlasíte, můžete se obrátit na příslušný dozorový orgán nebo využít jiný dostupný prostředek nápravy.</p>
    `;
    const email = await sendTrackedComplianceEmail({
      tenantId: membership.tenantId,
      toEmail: existing.reporterEmail,
      subject: `Adclare: vyřízení hlášení ${existing.id}`,
      bodyText,
      bodyHtml,
    });

    await writeSystemAuditEvent({
      tenantId: membership.tenantId,
      adId: existing.ad.id,
      entityType: "compliance_report",
      entityId: existing.id,
      entityLabel: existing.ad.code,
      actor: "system",
      actorRole: "system",
      actorScope: "tenant",
      action: "notify_compliance_report_resolution",
      outcome: email.status === EmailStatus.SENT ? "success" : "failure",
      severity: email.status === EmailStatus.SENT ? "info" : "warning",
      messageCs: `Informace o vyřízení hlášení ${existing.id} byla ${email.status === EmailStatus.SENT ? "odeslána" : "uložena k doručení"}.`,
      messageEn: `The resolution notice for report ${existing.id} was ${email.status === EmailStatus.SENT ? "sent" : "queued for delivery"}.`,
      metadata: {
        emailMessageId: email.id,
        emailStatus: email.status,
        reportStatus: status,
      },
    });
  }

  return result;
}
