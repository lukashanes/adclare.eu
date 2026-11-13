import { AdWorkflowStatus, EmailStatus } from "@/generated/prisma/client";
import { writeAuditEvent, writeSystemAuditEvent, type AuditRequestContext } from "@/lib/audit";
import {
  cloudflareEmailMissingConfigError,
  deliverEmailMessage,
  escapeEmailHtml,
  isCloudflareEmailConfigured,
} from "@/lib/cloudflare-email";
import { publicAppUrl } from "@/lib/instance-config";
import { prisma } from "@/lib/prisma";

export type ComplianceReportInput = {
  reporterName: string;
  reporterEmail: string;
  reason: string;
  details: string;
};

export async function sendTrackedComplianceEmail(input: {
  tenantId: string;
  toEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
}) {
  const email = await prisma.emailMessage.create({
    data: {
      tenantId: input.tenantId,
      toEmail: input.toEmail,
      subject: input.subject,
      bodyText: input.bodyText,
      bodyHtml: input.bodyHtml,
      provider: "cloudflare_email_service",
      status: EmailStatus.PENDING_PROVIDER,
      error: isCloudflareEmailConfigured() ? "" : cloudflareEmailMissingConfigError,
    },
  });

  return deliverEmailMessage(email, {
    bodyText: input.bodyText,
    bodyHtml: input.bodyHtml,
  });
}

export async function createComplianceReport(publicToken: string, input: ComplianceReportInput, requestContext: AuditRequestContext) {
  const ad = await prisma.ad.findFirst({
    where: {
      publicToken,
      workflowStatus: {
        in: [AdWorkflowStatus.PUBLISHED, AdWorkflowStatus.ARCHIVED],
      },
    },
    select: {
      id: true,
      tenantId: true,
      code: true,
      titleCs: true,
      tenant: {
        select: {
          nameCs: true,
          complianceEmail: true,
          contactEmail: true,
        },
      },
    },
  });

  if (!ad) {
    return null;
  }

  const report = await prisma.$transaction(async (tx) => {
    const report = await tx.complianceReport.create({
      data: {
        tenantId: ad.tenantId,
        adId: ad.id,
        reporterName: input.reporterName,
        reporterEmail: input.reporterEmail,
        reason: input.reason,
        details: input.details,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    await writeAuditEvent(tx, {
      tenantId: ad.tenantId,
      adId: ad.id,
      entityType: "compliance_report",
      entityId: report.id,
      entityLabel: ad.code,
      actor: input.reporterEmail,
      actorRole: "public",
      actorScope: "public notice",
      action: "create_compliance_report",
      severity: "warning",
      messageCs: `Přijato veřejné hlášení k reklamě ${ad.code}.`,
      messageEn: `Received a public compliance report for ad ${ad.code}.`,
      metadata: {
        reportId: report.id,
        reason: input.reason,
        reporterName: input.reporterName,
      },
      requestContext,
    });

    return {
      id: report.id,
      createdAt: report.createdAt.toISOString(),
    };
  });

  const recipient = ad.tenant.complianceEmail || ad.tenant.contactEmail;

  if (recipient) {
    const reviewUrl = `${publicAppUrl()}/app#review`;
    const subject = `Adclare: nové hlášení k reklamě ${ad.code}`;
    const bodyText = [
      `Nové hlášení k reklamě ${ad.code}: ${ad.titleCs}`,
      "",
      `Oznamovatel: ${input.reporterName} <${input.reporterEmail}>`,
      `Důvod: ${input.reason}`,
      "",
      "Hlášení otevřete v Adclare:",
      reviewUrl,
    ].join("\n");
    const bodyHtml = `
      <p>Nové hlášení k reklamě <strong>${escapeEmailHtml(ad.code)}</strong>: ${escapeEmailHtml(ad.titleCs)}</p>
      <p><strong>Oznamovatel:</strong> ${escapeEmailHtml(input.reporterName)} &lt;${escapeEmailHtml(input.reporterEmail)}&gt;</p>
      <p><strong>Důvod:</strong> ${escapeEmailHtml(input.reason)}</p>
      <p><a href="${escapeEmailHtml(reviewUrl)}">Otevřít hlášení v Adclare</a></p>
    `;
    const delivered = await sendTrackedComplianceEmail({
      tenantId: ad.tenantId,
      toEmail: recipient,
      subject,
      bodyText,
      bodyHtml,
    });

    await writeSystemAuditEvent({
      tenantId: ad.tenantId,
      adId: ad.id,
      entityType: "compliance_report",
      entityId: report.id,
      entityLabel: ad.code,
      actor: "system",
      actorRole: "system",
      actorScope: "tenant",
      action: "notify_compliance_report",
      outcome: delivered.status === EmailStatus.SENT ? "success" : "failure",
      severity: delivered.status === EmailStatus.SENT ? "info" : "warning",
      messageCs: `E-mailové upozornění k hlášení reklamy ${ad.code} bylo ${delivered.status === EmailStatus.SENT ? "odesláno" : "uloženo k doručení"}.`,
      messageEn: `The email notification for ad ${ad.code} was ${delivered.status === EmailStatus.SENT ? "sent" : "queued for delivery"}.`,
      metadata: {
        emailMessageId: delivered.id,
        emailStatus: delivered.status,
      },
      requestContext,
    });
  } else {
    await writeSystemAuditEvent({
      tenantId: ad.tenantId,
      adId: ad.id,
      entityType: "compliance_report",
      entityId: report.id,
      entityLabel: ad.code,
      actor: "system",
      actorRole: "system",
      actorScope: "tenant",
      action: "notify_compliance_report",
      outcome: "failure",
      severity: "warning",
      messageCs: `Hlášení k reklamě ${ad.code} bylo uloženo bez e-mailového upozornění.`,
      messageEn: `The compliance report for ad ${ad.code} was stored without an email notification.`,
      metadata: {
        reason: "missing_compliance_email",
      },
      requestContext,
    });
  }

  const publicNoticeUrl = `${publicAppUrl()}/ad/${encodeURIComponent(publicToken)}`;
  const confirmationText = [
    `Potvrzujeme přijetí hlášení ${report.id} k reklamě ${ad.code}.`,
    "",
    `Oznamovatel: ${input.reporterName}`,
    `Důvod: ${input.reason}`,
    "",
    "Veřejné oznámení:",
    publicNoticeUrl,
    "",
    "O výsledku vás budeme informovat na tento e-mail. Pokud s vyřízením nebudete souhlasit, můžete se obrátit na příslušný dozorový orgán nebo využít jiný dostupný prostředek nápravy.",
  ].join("\n");
  const confirmationHtml = `
    <p>Potvrzujeme přijetí hlášení <strong>${escapeEmailHtml(report.id)}</strong> k reklamě <strong>${escapeEmailHtml(ad.code)}</strong>.</p>
    <p><strong>Oznamovatel:</strong> ${escapeEmailHtml(input.reporterName)}</p>
    <p><strong>Důvod:</strong> ${escapeEmailHtml(input.reason)}</p>
    <p><a href="${escapeEmailHtml(publicNoticeUrl)}">Otevřít veřejné oznámení</a></p>
    <p>O výsledku vás budeme informovat na tento e-mail. Pokud s vyřízením nebudete souhlasit, můžete se obrátit na příslušný dozorový orgán nebo využít jiný dostupný prostředek nápravy.</p>
  `;
  const confirmation = await sendTrackedComplianceEmail({
    tenantId: ad.tenantId,
    toEmail: input.reporterEmail,
    subject: `Adclare: potvrzení hlášení ${report.id}`,
    bodyText: confirmationText,
    bodyHtml: confirmationHtml,
  });

  await writeSystemAuditEvent({
    tenantId: ad.tenantId,
    adId: ad.id,
    entityType: "compliance_report",
    entityId: report.id,
    entityLabel: ad.code,
    actor: "system",
    actorRole: "system",
    actorScope: "tenant",
    action: "confirm_compliance_report",
    outcome: confirmation.status === EmailStatus.SENT ? "success" : "failure",
    severity: confirmation.status === EmailStatus.SENT ? "info" : "warning",
    messageCs: `Potvrzení přijetí hlášení ${report.id} bylo ${confirmation.status === EmailStatus.SENT ? "odesláno" : "uloženo k doručení"}.`,
    messageEn: `Receipt confirmation for report ${report.id} was ${confirmation.status === EmailStatus.SENT ? "sent" : "queued for delivery"}.`,
    metadata: {
      emailMessageId: confirmation.id,
      emailStatus: confirmation.status,
    },
    requestContext,
  });

  return report;
}
