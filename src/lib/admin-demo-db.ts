import { randomBytes } from "node:crypto";
import {
  AdStatus,
  InvitationStatus,
  MembershipStatus,
  UserRole,
  type Ad,
  type Campaign,
  type Invitation,
  type OrganizationUnit,
  type Tenant,
  type TenantMembership,
  type User,
} from "@prisma/client";
import type {
  AdRecord,
  AdminAdsPayload,
  AdminInvitationRecord,
  AdminMemberRecord,
  AdminRoleKey,
  AdminUsersPayload,
  EditableAdInput,
  InvitationNotice,
  InviteInput,
  Locale,
  Status,
} from "@/lib/admin-demo-types";
import { prisma } from "@/lib/prisma";

const tenantSlug = "demo-party";
const campaignSlug = "municipal-2026";

type AdWithUnit = Ad & {
  orgUnit: OrganizationUnit;
};
type MembershipWithUserAndUnit = TenantMembership & {
  user: User;
  orgUnit: OrganizationUnit | null;
};
type InvitationWithUnit = Invitation & {
  orgUnit: OrganizationUnit | null;
};

const statusMap: Record<AdStatus, Status> = {
  READY: "ready",
  WARNING: "warning",
  BLOCKED: "blocked",
  REVIEW: "review",
};

export function normalizeLocale(value: string | null): Locale {
  return value === "en" ? "en" : "cs";
}

function formatDate(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "cs" ? "cs-CZ" : "en-GB", {
    day: "numeric",
    month: locale === "cs" ? "numeric" : "short",
    year: "numeric",
  }).format(date);
}

function mapAd(ad: AdWithUnit, locale: Locale): AdRecord {
  const isCs = locale === "cs";

  return {
    id: ad.code,
    publicUrl: `https://adclare.eu/ad/${ad.publicToken}`,
    title: isCs ? ad.titleCs : ad.titleEn,
    branch: isCs ? ad.orgUnit.nameCs : ad.orgUnit.nameEn,
    owner: isCs ? ad.ownerCs : ad.ownerEn,
    type: isCs ? ad.mediaTypeCs : ad.mediaTypeEn,
    publicationDate: formatDate(ad.publicationDate, locale),
    period: isCs ? ad.periodCs : ad.periodEn,
    payer: isCs ? ad.payerCs : ad.payerEn,
    amount: ad.amount,
    fundingSource: isCs ? ad.fundingSourceCs : ad.fundingSourceEn,
    targeting: isCs ? ad.targetingCs : ad.targetingEn,
    missing: isCs ? ad.missingCs : ad.missingEn,
    status: statusMap[ad.status],
    statusLabel: isCs ? ad.statusLabelCs : ad.statusLabelEn,
  };
}

function createPublicToken() {
  return randomBytes(18).toString("base64url");
}

function createInviteToken() {
  return randomBytes(24).toString("base64url");
}

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://adclare.eu").replace(/\/$/, "");
}

function roleLabel(role: UserRole, locale: Locale) {
  const labels: Record<UserRole, Record<Locale, string>> = {
    SUPER_ADMIN: { cs: "super admin", en: "super admin" },
    PARTY_ADMIN: { cs: "admin strany", en: "party admin" },
    CENTRAL_REVIEWER: { cs: "centrální kontrolor", en: "central reviewer" },
    LOCAL_ADMIN: { cs: "admin pobočky", en: "local admin" },
    CAMPAIGN_MANAGER: { cs: "manažer kampaně", en: "campaign manager" },
    CANDIDATE: { cs: "kandidát", en: "candidate" },
    DESIGNER: { cs: "grafik", en: "designer" },
    READONLY_AUDITOR: { cs: "auditor", en: "auditor" },
  };

  return labels[role][locale];
}

function membershipStatusLabel(status: MembershipStatus, locale: Locale) {
  const labels: Record<MembershipStatus, Record<Locale, string>> = {
    ACTIVE: { cs: "aktivní", en: "active" },
    INVITED: { cs: "pozván", en: "invited" },
    DISABLED: { cs: "pozastavený", en: "disabled" },
  };

  return labels[status][locale];
}

function invitationStatusLabel(status: InvitationStatus, expiresAt: Date, locale: Locale) {
  const effectiveStatus = status === InvitationStatus.PENDING && expiresAt.getTime() < Date.now() ? InvitationStatus.EXPIRED : status;
  const labels: Record<InvitationStatus, Record<Locale, string>> = {
    PENDING: { cs: "čeká na přijetí", en: "pending" },
    ACCEPTED: { cs: "přijato", en: "accepted" },
    EXPIRED: { cs: "vypršelo", en: "expired" },
    REVOKED: { cs: "zrušeno", en: "revoked" },
  };

  return labels[effectiveStatus][locale];
}

function invitationStatusKey(status: InvitationStatus, expiresAt: Date): AdminInvitationRecord["statusKey"] {
  return status === InvitationStatus.PENDING && expiresAt.getTime() < Date.now() ? "EXPIRED" : status;
}

function scopeLabel(orgUnit: OrganizationUnit | null, locale: Locale) {
  if (!orgUnit) {
    return locale === "cs" ? "celá strana" : "whole party";
  }

  return locale === "cs" ? orgUnit.nameCs : orgUnit.nameEn;
}

function mapMember(member: MembershipWithUserAndUnit, locale: Locale): AdminMemberRecord {
  return {
    id: member.id,
    name: member.user.name,
    email: member.user.email,
    role: roleLabel(member.role, locale),
    roleKey: member.role as AdminRoleKey,
    scope: scopeLabel(member.orgUnit, locale),
    status: membershipStatusLabel(member.status, locale),
  };
}

function mapInvitation(invitation: InvitationWithUnit, locale: Locale): AdminInvitationRecord {
  return {
    id: invitation.id,
    email: invitation.email,
    role: roleLabel(invitation.role, locale),
    roleKey: invitation.role as AdminRoleKey,
    scope: scopeLabel(invitation.orgUnit, locale),
    status: invitationStatusLabel(invitation.status, invitation.expiresAt, locale),
    statusKey: invitationStatusKey(invitation.status, invitation.expiresAt),
    expiresAt: formatDate(invitation.expiresAt, locale),
    inviteUrl: `${appUrl()}/invite/${invitation.token}`,
  };
}

function mapPayload(tenant: Tenant, campaign: Campaign, ads: AdWithUnit[], locale: Locale): AdminAdsPayload {
  const isCs = locale === "cs";

  return {
    tenant: {
      name: isCs ? tenant.nameCs : tenant.nameEn,
      slug: tenant.slug,
    },
    campaign: {
      name: isCs ? campaign.nameCs : campaign.nameEn,
      slug: campaign.slug,
    },
    ads: ads.map((ad) => mapAd(ad, locale)),
  };
}

function slugify(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "unit"
  );
}

function normalizeCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function nextCode(branch: string) {
  const prefix = slugify(branch).slice(0, 3).toUpperCase() || "ADV";
  return `${prefix}-${String(Date.now()).slice(-4)}`;
}

function requiredMissing(input: EditableAdInput, locale: Locale) {
  const missing: string[] = [];

  if (!input.amount.trim()) {
    missing.push(locale === "cs" ? "částka" : "amount");
  }

  if (!input.fundingSource.trim()) {
    missing.push(locale === "cs" ? "původ financí" : "funding source");
  }

  return missing;
}

function statusForInput(input: EditableAdInput) {
  return input.amount.trim() && input.fundingSource.trim() ? AdStatus.READY : AdStatus.WARNING;
}

function statusLabelForInput(input: EditableAdInput, locale: Locale) {
  if (statusForInput(input) === AdStatus.READY) {
    return locale === "cs" ? "Připraveno" : "Ready";
  }

  return locale === "cs" ? "Doplnit" : "Complete";
}

function parsePublicationDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

async function findOrCreateUnit(tenantId: string, branch: string) {
  const slug = slugify(branch);

  return prisma.organizationUnit.upsert({
    where: {
      tenantId_slug: {
        tenantId,
        slug,
      },
    },
    update: {
      nameCs: branch,
      nameEn: branch,
    },
    create: {
      tenantId,
      slug,
      kind: "oblast",
      nameCs: branch,
      nameEn: branch,
    },
  });
}

async function getDemoTenantAndCampaign() {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });

  if (!tenant) {
    throw new Error("Demo tenant is not seeded.");
  }

  const campaign = await prisma.campaign.findUnique({
    where: {
      tenantId_slug: {
        tenantId: tenant.id,
        slug: campaignSlug,
      },
    },
  });

  if (!campaign) {
    throw new Error("Demo campaign is not seeded.");
  }

  return { tenant, campaign };
}

export async function getDemoAdsPayload(locale: Locale) {
  const { tenant, campaign } = await getDemoTenantAndCampaign();
  const ads = await prisma.ad.findMany({
    where: {
      tenantId: tenant.id,
      campaignId: campaign.id,
    },
    include: {
      orgUnit: true,
    },
    orderBy: {
      code: "asc",
    },
  });

  return mapPayload(tenant, campaign, ads, locale);
}

export async function getDemoUsersPayload(locale: Locale): Promise<AdminUsersPayload> {
  const { tenant } = await getDemoTenantAndCampaign();
  const [memberships, invitations, branches] = await Promise.all([
    prisma.tenantMembership.findMany({
      where: {
        tenantId: tenant.id,
      },
      include: {
        user: true,
        orgUnit: true,
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.invitation.findMany({
      where: {
        tenantId: tenant.id,
      },
      include: {
        orgUnit: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    }),
    prisma.organizationUnit.findMany({
      where: {
        tenantId: tenant.id,
      },
      orderBy: {
        slug: "asc",
      },
    }),
  ]);

  return {
    members: memberships.map((member) => mapMember(member, locale)),
    invitations: invitations.map((invitation) => mapInvitation(invitation, locale)),
    branches: branches.map((branch) => ({
      id: branch.id,
      name: locale === "cs" ? branch.nameCs : branch.nameEn,
    })),
  };
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeInviteRole(role: string): UserRole {
  const allowedRoles = new Set<UserRole>([
    UserRole.PARTY_ADMIN,
    UserRole.CENTRAL_REVIEWER,
    UserRole.LOCAL_ADMIN,
    UserRole.CAMPAIGN_MANAGER,
    UserRole.CANDIDATE,
    UserRole.DESIGNER,
    UserRole.READONLY_AUDITOR,
  ]);

  return allowedRoles.has(role as UserRole) ? (role as UserRole) : UserRole.LOCAL_ADMIN;
}

export async function createDemoInvitation(input: InviteInput, locale: Locale) {
  const { tenant } = await getDemoTenantAndCampaign();
  const email = normalizeEmail(input.email);

  if (!isValidEmail(email)) {
    throw new Error("Invalid invitation email.");
  }

  const role = normalizeInviteRole(input.role);
  const orgUnit =
    input.branchId && role !== UserRole.PARTY_ADMIN && role !== UserRole.CENTRAL_REVIEWER
      ? await prisma.organizationUnit.findFirst({
          where: {
            id: input.branchId,
            tenantId: tenant.id,
          },
        })
      : null;

  await prisma.invitation.updateMany({
    where: {
      tenantId: tenant.id,
      email,
      status: InvitationStatus.PENDING,
    },
    data: {
      status: InvitationStatus.REVOKED,
    },
  });

  const invitation = await prisma.invitation.create({
    data: {
      tenantId: tenant.id,
      orgUnitId: orgUnit?.id,
      email,
      role,
      token: createInviteToken(),
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    include: {
      orgUnit: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actor: "demo-admin",
      action: "create_invitation",
      messageCs: `Vytvořena pozvánka pro ${email}.`,
      messageEn: `Created invitation for ${email}.`,
    },
  });

  return mapInvitation(invitation, locale);
}

export async function getInvitationNotice(token: string, locale: Locale): Promise<InvitationNotice | null> {
  const invitation = await prisma.invitation.findUnique({
    where: {
      token,
    },
    include: {
      tenant: true,
      orgUnit: true,
    },
  });

  if (!invitation) {
    return null;
  }

  return {
    token: invitation.token,
    email: invitation.email,
    role: roleLabel(invitation.role, locale),
    scope: scopeLabel(invitation.orgUnit, locale),
    tenant: locale === "cs" ? invitation.tenant.nameCs : invitation.tenant.nameEn,
    status: invitationStatusKey(invitation.status, invitation.expiresAt),
    expiresAt: formatDate(invitation.expiresAt, locale),
  };
}

export async function acceptInvitation(token: string, name: string, locale: Locale) {
  const invitation = await prisma.invitation.findUnique({
    where: {
      token,
    },
    include: {
      tenant: true,
      orgUnit: true,
    },
  });

  if (!invitation || invitationStatusKey(invitation.status, invitation.expiresAt) !== "PENDING") {
    return null;
  }

  const user = await prisma.user.upsert({
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

  await prisma.tenantMembership.upsert({
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
    },
    create: {
      tenantId: invitation.tenantId,
      userId: user.id,
      orgUnitId: invitation.orgUnitId,
      role: invitation.role,
      status: MembershipStatus.ACTIVE,
    },
  });

  await prisma.invitation.update({
    where: {
      id: invitation.id,
    },
    data: {
      status: InvitationStatus.ACCEPTED,
      acceptedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: invitation.tenantId,
      actor: user.email,
      action: "accept_invitation",
      messageCs: `Pozvánka přijata uživatelem ${user.email}.`,
      messageEn: `Invitation accepted by ${user.email}.`,
    },
  });

  return getInvitationNotice(token, locale);
}

export async function getDemoTransparencyNotice(publicToken: string, locale: Locale) {
  const { tenant, campaign } = await getDemoTenantAndCampaign();
  const ad = await prisma.ad.findUnique({
    where: {
      publicToken,
    },
    include: {
      orgUnit: true,
    },
  });

  if (!ad) {
    return null;
  }

  return {
    tenant: locale === "cs" ? tenant.nameCs : tenant.nameEn,
    campaign: locale === "cs" ? campaign.nameCs : campaign.nameEn,
    election: campaign.election,
    ad: mapAd(ad, locale),
    lastUpdated: formatDate(ad.updatedAt, locale),
    publicUrl: `https://adclare.eu/ad/${ad.publicToken}`,
  };
}

export async function completeDemoAd(code: string, locale: Locale) {
  const { tenant } = await getDemoTenantAndCampaign();
  const ad = await prisma.ad.findUnique({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code,
      },
    },
  });

  if (!ad) {
    return null;
  }

  const updated = await prisma.ad.update({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code,
      },
    },
    data: {
      amount: ad.amount || "24 500 Kč",
      fundingSourceCs: ad.fundingSourceCs || "volební účet",
      fundingSourceEn: ad.fundingSourceEn || "campaign account",
      missingCs: [],
      missingEn: [],
      status: AdStatus.REVIEW,
      statusLabelCs: "Kontrola",
      statusLabelEn: "Review",
    },
    include: {
      orgUnit: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      adId: updated.id,
      actor: "demo-admin",
      action: "complete_required_data",
      messageCs: `Doplněna povinná data u reklamy ${updated.code}.`,
      messageEn: `Required data completed for ad ${updated.code}.`,
    },
  });

  return mapAd(updated, locale);
}

export async function createDemoAd(input: EditableAdInput, locale: Locale) {
  const { tenant, campaign } = await getDemoTenantAndCampaign();
  const unit = await findOrCreateUnit(tenant.id, input.branch);
  const code = normalizeCode(input.code || "") || nextCode(input.branch);
  const missingCs = requiredMissing(input, "cs");
  const missingEn = requiredMissing(input, "en");
  const status = statusForInput(input);

  const ad = await prisma.ad.create({
    data: {
      tenantId: tenant.id,
      campaignId: campaign.id,
      orgUnitId: unit.id,
      code,
      publicToken: createPublicToken(),
      titleCs: input.title.trim(),
      titleEn: input.title.trim(),
      ownerCs: input.owner.trim(),
      ownerEn: input.owner.trim(),
      mediaTypeCs: input.type.trim(),
      mediaTypeEn: input.type.trim(),
      publicationDate: parsePublicationDate(input.publicationDate),
      periodCs: input.period.trim(),
      periodEn: input.period.trim(),
      payerCs: input.payer.trim(),
      payerEn: input.payer.trim(),
      amount: input.amount.trim(),
      fundingSourceCs: input.fundingSource.trim(),
      fundingSourceEn: input.fundingSource.trim(),
      targetingCs: input.targeting.trim() || "nepoužito",
      targetingEn: input.targeting.trim() || "not used",
      missingCs,
      missingEn,
      status,
      statusLabelCs: statusLabelForInput(input, "cs"),
      statusLabelEn: statusLabelForInput(input, "en"),
    },
    include: {
      orgUnit: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      adId: ad.id,
      actor: "demo-admin",
      action: "create_ad",
      messageCs: `Vytvořena reklama ${ad.code}.`,
      messageEn: `Created ad ${ad.code}.`,
    },
  });

  return mapAd(ad, locale);
}

export async function updateDemoAd(code: string, input: EditableAdInput, locale: Locale) {
  const { tenant } = await getDemoTenantAndCampaign();
  const existing = await prisma.ad.findUnique({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code,
      },
    },
  });

  if (!existing) {
    return null;
  }

  const unit = await findOrCreateUnit(tenant.id, input.branch);
  const missingCs = requiredMissing(input, "cs");
  const missingEn = requiredMissing(input, "en");
  const status = statusForInput(input);

  const ad = await prisma.ad.update({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code,
      },
    },
    data: {
      orgUnitId: unit.id,
      titleCs: input.title.trim(),
      titleEn: input.title.trim(),
      ownerCs: input.owner.trim(),
      ownerEn: input.owner.trim(),
      mediaTypeCs: input.type.trim(),
      mediaTypeEn: input.type.trim(),
      publicationDate: parsePublicationDate(input.publicationDate),
      periodCs: input.period.trim(),
      periodEn: input.period.trim(),
      payerCs: input.payer.trim(),
      payerEn: input.payer.trim(),
      amount: input.amount.trim(),
      fundingSourceCs: input.fundingSource.trim(),
      fundingSourceEn: input.fundingSource.trim(),
      targetingCs: input.targeting.trim() || "nepoužito",
      targetingEn: input.targeting.trim() || "not used",
      missingCs,
      missingEn,
      status,
      statusLabelCs: statusLabelForInput(input, "cs"),
      statusLabelEn: statusLabelForInput(input, "en"),
    },
    include: {
      orgUnit: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      adId: ad.id,
      actor: "demo-admin",
      action: "update_ad",
      messageCs: `Upravena reklama ${ad.code}.`,
      messageEn: `Updated ad ${ad.code}.`,
    },
  });

  return mapAd(ad, locale);
}

export async function prepareDemoAuditExport(code: string) {
  const { tenant } = await getDemoTenantAndCampaign();
  const ad = await prisma.ad.findUnique({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code,
      },
    },
  });

  if (!ad) {
    return false;
  }

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      adId: ad.id,
      actor: "demo-admin",
      action: "prepare_audit_export",
      messageCs: `Připraven auditní export pro reklamu ${ad.code}.`,
      messageEn: `Audit export prepared for ad ${ad.code}.`,
    },
  });

  return true;
}
