import { createHash } from "node:crypto";
import { InvitationStatus, MembershipStatus, UserRole, type Candidate, type OrganizationUnit } from "@/generated/prisma/client";
import { writeAuditEvent } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import type { InvitationNotice, Locale } from "@/lib/workspace-types";

function hashToken(value: string) {
  return createHash("sha256").update(value).digest("base64url");
}

function formatDate(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "cs" ? "cs-CZ" : "en-GB", {
    day: "numeric",
    month: locale === "cs" ? "numeric" : "short",
    year: "numeric",
  }).format(date);
}

function roleLabel(role: UserRole, locale: Locale) {
  const labels: Record<UserRole, Record<Locale, string>> = {
    SUPER_ADMIN: { cs: "super admin", en: "super admin" },
    PARTY_ADMIN: { cs: "admin strany", en: "party admin" },
    CENTRAL_REVIEWER: { cs: "centrální kontrola", en: "central reviewer" },
    LOCAL_ADMIN: { cs: "admin pobočky", en: "local admin" },
    CAMPAIGN_MANAGER: { cs: "manažer kampaně", en: "campaign manager" },
    CANDIDATE: { cs: "kandidát", en: "candidate" },
    DESIGNER: { cs: "grafik", en: "designer" },
    READONLY_AUDITOR: { cs: "audit", en: "audit" },
  };

  return labels[role][locale];
}

function candidateLabel(candidate: Candidate | null | undefined, locale: Locale) {
  if (!candidate) {
    return "";
  }

  return locale === "cs" ? candidate.nameCs : candidate.nameEn;
}

function accessScopeLabel(orgUnit: OrganizationUnit | null, candidate: Candidate | null | undefined, locale: Locale) {
  const candidateName = candidateLabel(candidate, locale);

  if (candidateName) {
    return locale === "cs" ? `kandidát ${candidateName}` : `candidate ${candidateName}`;
  }

  if (!orgUnit) {
    return locale === "cs" ? "celá strana" : "whole party";
  }

  return locale === "cs" ? orgUnit.nameCs : orgUnit.nameEn;
}

function invitationStatusKey(status: InvitationStatus, expiresAt: Date): InvitationNotice["status"] {
  if (status === InvitationStatus.PENDING && expiresAt.getTime() < Date.now()) {
    return "EXPIRED";
  }

  return status;
}

export async function getInvitationNotice(token: string, locale: Locale): Promise<InvitationNotice | null> {
  const rawToken = decodeURIComponent(token);
  const invitation = await prisma.invitation.findUnique({
    where: {
      tokenHash: hashToken(rawToken),
    },
    include: {
      tenant: true,
      orgUnit: true,
      candidate: true,
    },
  });

  if (!invitation) {
    return null;
  }

  return {
    token: rawToken,
    email: invitation.email,
    role: roleLabel(invitation.role, locale),
    scope: accessScopeLabel(invitation.orgUnit, invitation.candidate ?? null, locale),
    tenant: locale === "cs" ? invitation.tenant.nameCs : invitation.tenant.nameEn,
    status: invitationStatusKey(invitation.status, invitation.expiresAt),
    expiresAt: formatDate(invitation.expiresAt, locale),
  };
}

export async function acceptInvitation(token: string, name: string, locale: Locale) {
  const rawToken = decodeURIComponent(token);
  const invitation = await prisma.invitation.findUnique({
    where: {
      tokenHash: hashToken(rawToken),
    },
    include: {
      tenant: true,
      orgUnit: true,
      candidate: true,
    },
  });

  if (!invitation || invitationStatusKey(invitation.status, invitation.expiresAt) !== "PENDING") {
    return null;
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: {
        email: invitation.email,
      },
      update: {
        name: name.trim() || invitation.email,
      },
      create: {
        email: invitation.email,
        name: name.trim() || invitation.email,
      },
    });

    await tx.tenantMembership.upsert({
      where: {
        tenantId_userId: {
          tenantId: invitation.tenantId,
          userId: user.id,
        },
      },
      update: {
        role: invitation.role,
        status: MembershipStatus.ACTIVE,
        orgUnitId: invitation.orgUnitId,
        candidateId: invitation.candidateId,
      },
      create: {
        tenantId: invitation.tenantId,
        userId: user.id,
        orgUnitId: invitation.orgUnitId,
        candidateId: invitation.candidateId,
        role: invitation.role,
        status: MembershipStatus.ACTIVE,
      },
    });

    await tx.invitation.update({
      where: {
        id: invitation.id,
      },
      data: {
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });

    await writeAuditEvent(tx, {
      tenantId: invitation.tenantId,
      actor: user.email,
      actorUserId: user.id,
      actorRole: invitation.role,
      actorScope: accessScopeLabel(invitation.orgUnit, invitation.candidate, "cs"),
      entityType: "invitation",
      entityId: invitation.id,
      entityLabel: user.email,
      action: "accept_invitation",
      messageCs: `Pozvánka přijata uživatelem ${user.email}.`,
      messageEn: `Invitation accepted by ${user.email}.`,
      after: {
        email: user.email,
        role: invitation.role,
        orgUnitId: invitation.orgUnitId,
        candidateId: invitation.candidateId,
        status: InvitationStatus.ACCEPTED,
      },
    });
  });

  return getInvitationNotice(rawToken, locale);
}
