import { randomBytes } from "node:crypto";
import {
  AdStatus,
  AdWorkflowStatus,
  ApprovalStatus,
  type AdAsset,
  EmailStatus,
  type AuditLog,
  type AdVersion,
  type Approval,
  InvitationStatus,
  MembershipStatus,
  UserRole,
  type Ad,
  type Campaign,
  type EmailMessage,
  type Invitation,
  type OrganizationUnit,
  type Tenant,
  type TenantMembership,
  type User,
} from "@/generated/prisma/client";
import type {
  AdRecord,
  AdChannel,
  AdImportInputRow,
  AdImportResult,
  AdminAdsPayload,
  AppBranchInput,
  AppWorkspacePayload,
  AdminInvitationRecord,
  AdminMemberRecord,
  AdminRoleKey,
  AdminUsersPayload,
  EditableAdInput,
  InvitationNotice,
  InviteInput,
  Locale,
  PublicRepositoryAdRecord,
  PublicRepositoryFilters,
  PublicRepositoryOption,
  PublicRepositoryPayload,
  ReviewDecisionInput,
  Status,
} from "@/lib/admin-demo-types";
import { defaultEmailFrom, publicAppUrl } from "@/lib/instance-config";
import { objectStorageStatus } from "@/lib/object-storage";
import { prisma } from "@/lib/prisma";

const tenantSlug = "demo-party";
const campaignSlug = "municipal-2026";
const publicWorkflowStatuses: AdWorkflowStatus[] = [AdWorkflowStatus.PUBLISHED, AdWorkflowStatus.ARCHIVED];

type AdWithUnit = Ad & {
  orgUnit: OrganizationUnit;
  campaign: Campaign;
  tenant?: Tenant;
  assets?: AdAsset[];
  approvals?: Approval[];
};
type AdWithRepositoryRelations = AdWithUnit;
type MembershipWithUserAndUnit = TenantMembership & {
  user: User;
  orgUnit: OrganizationUnit | null;
};
type InvitationWithUnit = Invitation & {
  orgUnit: OrganizationUnit | null;
  emailMessages?: EmailMessage[];
};
type AuditPackageAd = AdWithUnit & {
  auditLogs: AuditLog[];
  versions: AdVersion[];
  approvals: Approval[];
  assets: AdAsset[];
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

function formatDateTime(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "cs" ? "cs-CZ" : "en-GB", {
    day: "numeric",
    month: locale === "cs" ? "numeric" : "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function isoDate(date: Date | null) {
  return date ? date.toISOString() : "";
}

function daysUntil(date: Date) {
  const deadline = new Date(date);
  deadline.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.round((deadline.getTime() - today.getTime()) / 86_400_000);
}

function deadlineState(ad: Ad, missing: string[]) {
  if (missing.length === 0) {
    return "clear";
  }

  const days = daysUntil(ad.publicationDate);

  if (days < 0) {
    return "overdue";
  }

  if (days <= 3) {
    return "due-soon";
  }

  return "upcoming";
}

function deadlineLabel(ad: Ad, missing: string[], locale: Locale) {
  const days = daysUntil(ad.publicationDate);

  if (missing.length === 0) {
    return locale === "cs" ? "bez blokace" : "clear";
  }

  if (days < 0) {
    return locale === "cs" ? `${Math.abs(days)} dnů po termínu` : `${Math.abs(days)} days overdue`;
  }

  if (days === 0) {
    return locale === "cs" ? "termín dnes" : "due today";
  }

  return locale === "cs" ? `${days} dnů do vyvěšení` : `${days} days to publication`;
}

function workflowLabel(status: AdWorkflowStatus, locale: Locale) {
  const labels: Record<AdWorkflowStatus, Record<Locale, string>> = {
    DRAFT: { cs: "koncept", en: "draft" },
    NEEDS_DATA: { cs: "k doplnění", en: "needs data" },
    READY_FOR_REVIEW: { cs: "ke kontrole", en: "ready for review" },
    APPROVED: { cs: "schváleno", en: "approved" },
    PUBLISHED: { cs: "publikováno", en: "published" },
    ARCHIVED: { cs: "archiv", en: "archived" },
  };

  return labels[status][locale];
}

function approvalStatusLabel(status: ApprovalStatus, locale: Locale) {
  const labels: Record<ApprovalStatus, Record<Locale, string>> = {
    REQUESTED: { cs: "předáno ke kontrole", en: "review requested" },
    APPROVED: { cs: "schváleno", en: "approved" },
    CHANGES_REQUESTED: { cs: "vráceno k doplnění", en: "changes requested" },
    REJECTED: { cs: "zamítnuto", en: "rejected" },
    PUBLISHED: { cs: "publikováno", en: "published" },
  };

  return labels[status][locale];
}

function formatBytes(bytes: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "cs" ? "cs-CZ" : "en-GB", {
    maximumFractionDigits: bytes >= 1024 * 1024 ? 1 : 0,
  }).format(bytes >= 1024 * 1024 ? bytes / 1024 / 1024 : Math.max(1, Math.round(bytes / 1024))) + (bytes >= 1024 * 1024 ? " MB" : " KB");
}

function mapAsset(asset: AdAsset, adCode: string, locale: Locale) {
  return {
    id: asset.id,
    fileName: asset.fileName,
    originalName: asset.originalName,
    contentType: asset.contentType,
    byteSize: asset.byteSize,
    sizeLabel: formatBytes(asset.byteSize, locale),
    uploadedAt: formatDate(asset.createdAt, locale),
    downloadUrl: `/api/app/ads/${encodeURIComponent(adCode)}/assets/${encodeURIComponent(asset.id)}`,
    checksumSha256: asset.checksumSha256,
  };
}

function mapReviewEvent(event: Approval, locale: Locale) {
  const isCs = locale === "cs";

  return {
    id: event.id,
    status: event.status,
    statusLabel: approvalStatusLabel(event.status, locale),
    actor: event.actor,
    note: isCs ? event.noteCs : event.noteEn,
    createdAt: formatDateTime(event.createdAt, locale),
  };
}

function mapAd(ad: AdWithUnit, locale: Locale): AdRecord {
  const isCs = locale === "cs";
  const missing = missingForAd(ad, locale);
  const status = statusForAd(ad, missing);
  const workflowStatus = workflowStatusForAd(ad, missing);
  const state = deadlineState(ad, missing);
  const assets = (ad.assets ?? []).map((asset) => mapAsset(asset, ad.code, locale));
  const reviewEvents = (ad.approvals ?? []).map((event) => mapReviewEvent(event, locale));

  return {
    id: ad.code,
    publicUrl: `${publicAppUrl()}/ad/${ad.publicToken}`,
    title: isCs ? ad.titleCs : ad.titleEn,
    tenantSlug: ad.tenant?.slug ?? tenantSlug,
    campaign: isCs ? ad.campaign.nameCs : ad.campaign.nameEn,
    campaignSlug: ad.campaign.slug,
    branch: isCs ? ad.orgUnit.nameCs : ad.orgUnit.nameEn,
    owner: isCs ? ad.ownerCs : ad.ownerEn,
    type: isCs ? ad.mediaTypeCs : ad.mediaTypeEn,
    channel: normalizeChannel(ad.channel),
    publicationDate: formatDate(ad.publicationDate, locale),
    publicationDateIso: ad.publicationDate.toISOString().slice(0, 10),
    period: isCs ? ad.periodCs : ad.periodEn,
    distributionArea: isCs ? ad.distributionAreaCs : ad.distributionAreaEn,
    payer: isCs ? ad.payerCs : ad.payerEn,
    supplier: isCs ? ad.supplierCs : ad.supplierEn,
    amount: ad.amount,
    fundingSource: isCs ? ad.fundingSourceCs : ad.fundingSourceEn,
    language: ad.language,
    isTargeted: ad.isTargeted,
    targeting: isCs ? ad.targetingCs : ad.targetingEn,
    targetAudience: isCs ? ad.targetAudienceCs : ad.targetAudienceEn,
    missing,
    status: statusMap[status],
    statusLabel: statusLabel(status, locale),
    workflowStatus,
    workflowLabel: workflowLabel(workflowStatus, locale),
    deadlineState: state,
    deadlineLabel: deadlineLabel(ad, missing, locale),
    daysUntilPublication: daysUntil(ad.publicationDate),
    responsibleName: ad.responsibleName,
    reviewerName: ad.reviewerName,
    statusNote: isCs ? ad.statusNoteCs : ad.statusNoteEn,
    version: ad.version,
    locked: Boolean(ad.lockedAt),
    reviewRequestedAt: isoDate(ad.reviewRequestedAt),
    approvedAt: isoDate(ad.approvedAt),
    publishedAt: isoDate(ad.publishedAt),
    archivedAt: isoDate(ad.archivedAt),
    updatedAt: formatDate(ad.updatedAt, locale),
    canRequestReview: missing.length === 0 && workflowStatus !== AdWorkflowStatus.READY_FOR_REVIEW && workflowStatus !== AdWorkflowStatus.APPROVED && workflowStatus !== AdWorkflowStatus.PUBLISHED,
    canApprove: missing.length === 0 && workflowStatus === AdWorkflowStatus.READY_FOR_REVIEW,
    canPublish: missing.length === 0 && workflowStatus === AdWorkflowStatus.APPROVED,
    canRequestChanges: missing.length === 0 && (workflowStatus === AdWorkflowStatus.READY_FOR_REVIEW || workflowStatus === AdWorkflowStatus.APPROVED),
    canDownloadQr: missing.length === 0 && workflowStatus !== AdWorkflowStatus.ARCHIVED && workflowStatus !== AdWorkflowStatus.NEEDS_DATA,
    assetCount: assets.length,
    assets,
    reviewEvents,
  };
}

function createPublicToken() {
  return randomBytes(18).toString("base64url");
}

function createInviteToken() {
  return randomBytes(24).toString("base64url");
}

function isDemoPublicRepositoryEnabled() {
  return process.env.NEXT_PUBLIC_SHOW_DEMO_REPO === "1";
}

function cloudflareEmailAccountId() {
  return (process.env.CLOUDFLARE_EMAIL_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
}

function cloudflareEmailApiToken() {
  return (process.env.CLOUDFLARE_EMAIL_API_TOKEN || "").trim();
}

function isCloudflareEmailConfigured() {
  return Boolean(cloudflareEmailAccountId() && cloudflareEmailApiToken());
}

const cloudflareEmailMissingConfigError = "CLOUDFLARE_EMAIL_ACCOUNT_ID and CLOUDFLARE_EMAIL_API_TOKEN are not configured.";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function invitationEmailCopy(invitation: Invitation & { tenant: Tenant; orgUnit: OrganizationUnit | null }) {
  const inviteUrl = `${publicAppUrl()}/invite/${invitation.token}`;
  const tenantName = invitation.tenant.nameCs;
  const scope = scopeLabel(invitation.orgUnit, "cs");
  const role = roleLabel(invitation.role, "cs");
  const subject = `Pozvánka do Adclare: ${tenantName}`;
  const bodyText = [
    `Dobrý den,`,
    ``,
    `byl vám vytvořen přístup do Adclare pro ${tenantName}.`,
    `Role: ${role}`,
    `Rozsah: ${scope}`,
    ``,
    `Pozvánku přijmete zde:`,
    inviteUrl,
    ``,
    `Odkaz je platný do ${formatDate(invitation.expiresAt, "cs")}.`,
  ].join("\n");
  const bodyHtml = `
    <p>Dobrý den,</p>
    <p>Byl vám vytvořen přístup do <strong>Adclare</strong> pro ${escapeHtml(tenantName)}.</p>
    <p><strong>Role:</strong> ${escapeHtml(role)}<br><strong>Rozsah:</strong> ${escapeHtml(scope)}</p>
    <p><a href="${escapeHtml(inviteUrl)}">Přijmout pozvánku</a></p>
    <p>Odkaz je platný do ${escapeHtml(formatDate(invitation.expiresAt, "cs"))}.</p>
  `;

  return { subject, bodyText, bodyHtml, inviteUrl };
}

async function deliverEmailMessage(email: EmailMessage, content?: { bodyText: string; bodyHtml: string }) {
  if (!isCloudflareEmailConfigured()) {
    return prisma.emailMessage.update({
      where: {
        id: email.id,
      },
      data: {
        provider: "cloudflare_email_service",
        status: EmailStatus.PENDING_PROVIDER,
        error: cloudflareEmailMissingConfigError,
      },
    });
  }

  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cloudflareEmailAccountId()}/email/sending/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cloudflareEmailApiToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: defaultEmailFrom(),
        to: email.toEmail,
        subject: email.subject,
        html: content?.bodyHtml ?? email.bodyHtml,
        text: content?.bodyText ?? email.bodyText,
      }),
    });

    const result = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      errors?: { code?: number; message?: string }[];
      result?: {
        delivered?: string[];
        permanent_bounces?: string[];
        queued?: string[];
      };
    };

    if (!response.ok || !result.success) {
      const message = result.errors?.map((errorItem) => errorItem.message || errorItem.code).filter(Boolean).join(", ");
      throw new Error(message || `Cloudflare Email Service responded with ${response.status}.`);
    }

    if (result.result?.permanent_bounces?.includes(email.toEmail)) {
      throw new Error("Cloudflare Email Service reported a permanent bounce.");
    }

    const delivered = result.result?.delivered ?? [];
    const queued = result.result?.queued ?? [];

    return prisma.emailMessage.update({
      where: {
        id: email.id,
      },
      data: {
        status: EmailStatus.SENT,
        provider: "cloudflare_email_service",
        providerMessageId: [...delivered.map((item) => `delivered:${item}`), ...queued.map((item) => `queued:${item}`)].join(","),
        error: "",
        sentAt: new Date(),
      },
    });
  } catch (error) {
    return prisma.emailMessage.update({
      where: {
        id: email.id,
      },
      data: {
        status: EmailStatus.FAILED,
        provider: "cloudflare_email_service",
        error: error instanceof Error ? error.message : "Unknown email send error.",
      },
    });
  }
}

async function sendInvitationEmail(invitation: Invitation & { tenant: Tenant; orgUnit: OrganizationUnit | null }) {
  const { subject, bodyText, bodyHtml, inviteUrl } = invitationEmailCopy(invitation);
  const storedBodyText = bodyText.replaceAll(inviteUrl, "[invitation link redacted]");
  const storedBodyHtml = bodyHtml.replaceAll(escapeHtml(inviteUrl), "#").replaceAll(inviteUrl, "#");
  const email = await prisma.emailMessage.create({
    data: {
      tenantId: invitation.tenantId,
      invitationId: invitation.id,
      toEmail: invitation.email,
      subject,
      bodyText: storedBodyText,
      bodyHtml: storedBodyHtml,
      provider: "cloudflare_email_service",
      status: EmailStatus.PENDING_PROVIDER,
      error: isCloudflareEmailConfigured() ? "" : cloudflareEmailMissingConfigError,
    },
  });

  return deliverEmailMessage(email, { bodyText, bodyHtml });
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

function emailStatusLabel(status: EmailStatus, locale: Locale) {
  const labels: Record<EmailStatus, Record<Locale, string>> = {
    PENDING_PROVIDER: { cs: "čeká na e-mail provider", en: "waiting for email provider" },
    SENT: { cs: "e-mail odeslán", en: "email sent" },
    FAILED: { cs: "odeslání selhalo", en: "send failed" },
  };

  return labels[status][locale];
}

function latestEmailStatus(invitation: InvitationWithUnit): EmailStatus {
  return invitation.emailMessages?.[0]?.status ?? EmailStatus.PENDING_PROVIDER;
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
  const emailStatus = latestEmailStatus(invitation);

  return {
    id: invitation.id,
    email: invitation.email,
    role: roleLabel(invitation.role, locale),
    roleKey: invitation.role as AdminRoleKey,
    scope: scopeLabel(invitation.orgUnit, locale),
    status: invitationStatusLabel(invitation.status, invitation.expiresAt, locale),
    statusKey: invitationStatusKey(invitation.status, invitation.expiresAt),
    emailStatus: emailStatusLabel(emailStatus, locale),
    emailStatusKey: emailStatus,
    expiresAt: formatDate(invitation.expiresAt, locale),
    inviteUrl: `${publicAppUrl()}/invite/${invitation.token}`,
  };
}

function mapPayload(tenant: Tenant, campaign: Campaign, campaigns: Campaign[], branches: OrganizationUnit[], ads: AdWithUnit[], locale: Locale): AdminAdsPayload {
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
    campaigns: campaigns.map((item) => ({
      value: item.slug,
      label: isCs ? item.nameCs : item.nameEn,
    })),
    branches: branches.map((branch) => ({
      id: branch.id,
      name: isCs ? branch.nameCs : branch.nameEn,
    })),
    ads: ads.map((ad) => mapAd(ad, locale)),
  };
}

function mapRepositoryAd(ad: AdWithRepositoryRelations, locale: Locale): PublicRepositoryAdRecord {
  return {
    ...mapAd(ad, locale),
    campaign: locale === "cs" ? ad.campaign.nameCs : ad.campaign.nameEn,
    campaignSlug: ad.campaign.slug,
    election: ad.campaign.election,
    lastUpdated: formatDate(ad.updatedAt, locale),
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
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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

function nextImportCode(branch: string, rowNumber: number) {
  const prefix = slugify(branch).slice(0, 3).toUpperCase() || "IMP";
  return `${prefix}-IMP-${String(Date.now()).slice(-6)}-${rowNumber}`;
}

function normalizeChannel(value: string): AdChannel {
  return value === "online" ? "online" : "offline";
}

function isBlank(value: string | null | undefined) {
  return !value?.trim();
}

function requiresTargetingDetails(input: Pick<EditableAdInput, "isTargeted" | "targeting" | "targetAudience">) {
  const targeting = input.targeting
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  const noTargetingValues = new Set(["", "nepouzito", "not used", "ne", "no", "false", "0", "bez cileni", "netargetovano", "zadne"]);

  return input.isTargeted || !noTargetingValues.has(targeting);
}

function requiredMissing(input: EditableAdInput, locale: Locale) {
  const missing: string[] = [];

  const labels =
    locale === "cs"
      ? {
          title: "název materiálu",
          owner: "zadavatel",
          type: "typ reklamy",
          publicationDate: "datum zveřejnění",
          period: "období šíření",
          distributionArea: "oblast šíření",
          payer: "plátce",
          supplier: "dodavatel",
          amount: "částka",
          fundingSource: "původ financí",
          language: "jazyk",
          targeting: "cílení",
          targetAudience: "cílové publikum",
        }
      : {
          title: "asset title",
          owner: "advertiser",
          type: "ad type",
          publicationDate: "publication date",
          period: "display period",
          distributionArea: "distribution area",
          payer: "payer",
          supplier: "supplier",
          amount: "amount",
          fundingSource: "funding source",
          language: "language",
          targeting: "targeting",
          targetAudience: "target audience",
        };

  if (isBlank(input.title)) {
    missing.push(labels.title);
  }

  if (isBlank(input.owner)) {
    missing.push(labels.owner);
  }

  if (isBlank(input.type)) {
    missing.push(labels.type);
  }

  if (isBlank(input.publicationDate)) {
    missing.push(labels.publicationDate);
  }

  if (isBlank(input.period)) {
    missing.push(labels.period);
  }

  if (isBlank(input.distributionArea)) {
    missing.push(labels.distributionArea);
  }

  if (isBlank(input.payer)) {
    missing.push(labels.payer);
  }

  if (isBlank(input.supplier)) {
    missing.push(labels.supplier);
  }

  if (isBlank(input.amount)) {
    missing.push(labels.amount);
  }

  if (isBlank(input.fundingSource)) {
    missing.push(labels.fundingSource);
  }

  if (isBlank(input.language)) {
    missing.push(labels.language);
  }

  if (requiresTargetingDetails(input)) {
    if (isBlank(input.targeting)) {
      missing.push(labels.targeting);
    }

    if (isBlank(input.targetAudience)) {
      missing.push(labels.targetAudience);
    }
  }

  return missing;
}

function missingForAd(ad: Ad, locale: Locale) {
  return requiredMissing(
    {
      title: locale === "cs" ? ad.titleCs : ad.titleEn,
      branch: "",
      owner: locale === "cs" ? ad.ownerCs : ad.ownerEn,
      type: locale === "cs" ? ad.mediaTypeCs : ad.mediaTypeEn,
      channel: normalizeChannel(ad.channel),
      publicationDate: ad.publicationDate.toISOString().slice(0, 10),
      period: locale === "cs" ? ad.periodCs : ad.periodEn,
      distributionArea: locale === "cs" ? ad.distributionAreaCs : ad.distributionAreaEn,
      payer: locale === "cs" ? ad.payerCs : ad.payerEn,
      supplier: locale === "cs" ? ad.supplierCs : ad.supplierEn,
      amount: ad.amount,
      fundingSource: locale === "cs" ? ad.fundingSourceCs : ad.fundingSourceEn,
      language: ad.language,
      isTargeted: ad.isTargeted,
      targeting: locale === "cs" ? ad.targetingCs : ad.targetingEn,
      targetAudience: locale === "cs" ? ad.targetAudienceCs : ad.targetAudienceEn,
    },
    locale,
  );
}

function statusForMissing(missing: string[], publicationDate: Date) {
  if (missing.length === 0) {
    return AdStatus.READY;
  }

  const deadline = new Date(publicationDate);
  deadline.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return deadline.getTime() <= today.getTime() ? AdStatus.BLOCKED : AdStatus.WARNING;
}

function statusForAd(ad: Ad, missing: string[]) {
  if (ad.status === AdStatus.REVIEW && missing.length === 0) {
    return AdStatus.REVIEW;
  }

  if (ad.workflowStatus === AdWorkflowStatus.NEEDS_DATA && missing.length === 0) {
    return ad.status;
  }

  return statusForMissing(missing, ad.publicationDate);
}

function workflowStatusForAd(ad: Ad, missing: string[]) {
  if (ad.workflowStatus === AdWorkflowStatus.ARCHIVED || ad.workflowStatus === AdWorkflowStatus.PUBLISHED) {
    return ad.workflowStatus;
  }

  if (ad.workflowStatus === AdWorkflowStatus.NEEDS_DATA) {
    return AdWorkflowStatus.NEEDS_DATA;
  }

  if (missing.length > 0) {
    return AdWorkflowStatus.NEEDS_DATA;
  }

  if (ad.workflowStatus === AdWorkflowStatus.READY_FOR_REVIEW || ad.workflowStatus === AdWorkflowStatus.APPROVED) {
    return ad.workflowStatus;
  }

  return AdWorkflowStatus.READY_FOR_REVIEW;
}

function isPublicWorkflowStatus(status: AdWorkflowStatus) {
  return publicWorkflowStatuses.includes(status);
}

function statusForInput(input: EditableAdInput) {
  return statusForMissing(requiredMissing(input, "cs"), parsePublicationDate(input.publicationDate));
}

function workflowForInput(input: EditableAdInput) {
  return requiredMissing(input, "cs").length === 0 ? AdWorkflowStatus.READY_FOR_REVIEW : AdWorkflowStatus.NEEDS_DATA;
}

function statusLabel(status: AdStatus, locale: Locale) {
  const labels: Record<AdStatus, Record<Locale, string>> = {
    READY: { cs: "Připraveno", en: "Ready" },
    WARNING: { cs: "Doplnit", en: "Complete" },
    BLOCKED: { cs: "Červená", en: "Red" },
    REVIEW: { cs: "Kontrola", en: "Review" },
  };

  return labels[status][locale];
}

function publicStatusOptions(locale: Locale): PublicRepositoryOption[] {
  return [
    { value: "all", label: locale === "cs" ? "Všechny stavy" : "All statuses" },
    { value: "ready", label: statusLabel(AdStatus.READY, locale) },
    { value: "warning", label: statusLabel(AdStatus.WARNING, locale) },
    { value: "blocked", label: statusLabel(AdStatus.BLOCKED, locale) },
    { value: "review", label: statusLabel(AdStatus.REVIEW, locale) },
  ];
}

function publicChannelOptions(locale: Locale): PublicRepositoryOption[] {
  return [
    { value: "all", label: locale === "cs" ? "Online i offline" : "Online and offline" },
    { value: "online", label: "Online" },
    { value: "offline", label: "Offline" },
  ];
}

function uniqueOptions(values: string[], allLabel: string): PublicRepositoryOption[] {
  const seen = new Set<string>();
  const options = values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .sort((a, b) => a.localeCompare(b, "cs"));

  return [{ value: "all", label: allLabel }, ...options.map((value) => ({ value, label: value }))];
}

function normalizeRepositoryFilters(input: Partial<PublicRepositoryFilters>): PublicRepositoryFilters {
  const channel = input.channel === "online" || input.channel === "offline" ? input.channel : "all";
  const status =
    input.status === "ready" || input.status === "warning" || input.status === "blocked" || input.status === "review"
      ? input.status
      : "all";

  return {
    q: input.q?.trim() || "",
    channel,
    status,
    type: input.type?.trim() || "all",
    branch: input.branch?.trim() || "all",
    campaign: input.campaign?.trim() || "all",
  };
}

function matchesValue(filter: string, value: string) {
  return filter === "all" || value === filter;
}

function matchesSearch(ad: PublicRepositoryAdRecord, query: string) {
  if (!query) {
    return true;
  }

  const needle = query.toLowerCase();
  const haystack = [
    ad.id,
    ad.title,
    ad.branch,
    ad.owner,
    ad.type,
    ad.campaign,
    ad.distributionArea,
    ad.payer,
    ad.supplier,
    ad.fundingSource,
    ad.targeting,
    ad.targetAudience,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(needle);
}

function statusLabelForInput(input: EditableAdInput, locale: Locale) {
  return statusLabel(statusForInput(input), locale);
}

function defaultTargeting(input: EditableAdInput, locale: Locale) {
  if (input.isTargeted) {
    return input.targeting.trim();
  }

  return input.targeting.trim() || (locale === "cs" ? "nepoužito" : "not used");
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
  const [ads, campaigns, branches] = await Promise.all([
    prisma.ad.findMany({
      where: {
        tenantId: tenant.id,
        campaignId: campaign.id,
      },
      include: {
        orgUnit: true,
        campaign: true,
        tenant: true,
        assets: {
          orderBy: {
            createdAt: "desc",
          },
        },
        approvals: {
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        },
      },
      orderBy: [{ publicationDate: "asc" }, { code: "asc" }],
    }),
    prisma.campaign.findMany({
      where: {
        tenantId: tenant.id,
      },
      orderBy: {
        startsAt: "desc",
      },
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

  return mapPayload(tenant, campaign, campaigns, branches, ads, locale);
}

export async function getPublicRepositoryPayload(
  requestedTenantSlug: string,
  locale: Locale,
  inputFilters: Partial<PublicRepositoryFilters> = {},
): Promise<PublicRepositoryPayload | null> {
  if (requestedTenantSlug === tenantSlug && !isDemoPublicRepositoryEnabled()) {
    return null;
  }

  const tenant = await prisma.tenant.findUnique({
    where: {
      slug: requestedTenantSlug,
    },
  });

  if (!tenant) {
    return null;
  }

  const ads = await prisma.ad.findMany({
    where: {
      tenantId: tenant.id,
      workflowStatus: {
        in: publicWorkflowStatuses,
      },
    },
    include: {
      orgUnit: true,
      campaign: true,
      tenant: true,
    },
    orderBy: [{ publicationDate: "desc" }, { code: "asc" }],
  });

  const mappedAds = ads.map((ad) => mapRepositoryAd(ad, locale));
  const filters = normalizeRepositoryFilters(inputFilters);
  const filteredAds = mappedAds.filter(
    (ad) =>
      matchesSearch(ad, filters.q) &&
      matchesValue(filters.channel, ad.channel) &&
      matchesValue(filters.status, ad.status) &&
      matchesValue(filters.type, ad.type) &&
      matchesValue(filters.branch, ad.branch) &&
      matchesValue(filters.campaign, ad.campaignSlug),
  );

  return {
    tenant: {
      name: locale === "cs" ? tenant.nameCs : tenant.nameEn,
      slug: tenant.slug,
    },
    ads: filteredAds,
    totalCount: mappedAds.length,
    filteredCount: filteredAds.length,
    filters,
    options: {
      channels: publicChannelOptions(locale),
      statuses: publicStatusOptions(locale),
      types: uniqueOptions(mappedAds.map((ad) => ad.type), locale === "cs" ? "Všechny typy" : "All types"),
      branches: uniqueOptions(mappedAds.map((ad) => ad.branch), locale === "cs" ? "Všechny pobočky" : "All branches"),
      campaigns: [
        { value: "all", label: locale === "cs" ? "Všechny kampaně" : "All campaigns" },
        ...uniqueOptions(
          mappedAds.map((ad) => `${ad.campaignSlug}::${ad.campaign}`),
          "",
        )
          .slice(1)
          .map((option) => {
            const [value, label] = option.value.split("::");
            return { value, label };
          }),
      ],
    },
  };
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
        emailMessages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
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
      tenant: true,
      orgUnit: true,
    },
  });

  const emailMessage = await sendInvitationEmail(invitation);

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actor: "demo-admin",
      action: "create_invitation",
      messageCs: `Vytvořena pozvánka pro ${email}. Stav e-mailu: ${emailStatusLabel(emailMessage.status, "cs")}.`,
      messageEn: `Created invitation for ${email}. Email status: ${emailStatusLabel(emailMessage.status, "en")}.`,
    },
  });

  return mapInvitation({ ...invitation, emailMessages: [emailMessage] }, locale);
}

export async function retryDemoInvitationEmail(invitationId: string, locale: Locale) {
  const { tenant } = await getDemoTenantAndCampaign();
  const invitation = await prisma.invitation.findFirst({
    where: {
      id: invitationId,
      tenantId: tenant.id,
    },
    include: {
      tenant: true,
      orgUnit: true,
      emailMessages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  if (!invitation) {
    throw new Error("Invitation not found.");
  }

  const latestEmail = invitation.emailMessages[0];
  const emailMessage = latestEmail?.status === EmailStatus.SENT ? latestEmail : await sendInvitationEmail(invitation);

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actor: "demo-admin",
      action: "retry_invitation_email",
      messageCs: `Znovu zpracováno odeslání pozvánky pro ${invitation.email}. Stav e-mailu: ${emailStatusLabel(emailMessage.status, "cs")}.`,
      messageEn: `Retried invitation email for ${invitation.email}. Email status: ${emailStatusLabel(emailMessage.status, "en")}.`,
    },
  });

  return mapInvitation({ ...invitation, emailMessages: [emailMessage] }, locale);
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
      },
      create: {
        tenantId: invitation.tenantId,
        userId: user.id,
        orgUnitId: invitation.orgUnitId,
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

    await tx.auditLog.create({
      data: {
        tenantId: invitation.tenantId,
        actor: user.email,
        actorUserId: user.id,
        action: "accept_invitation",
        messageCs: `Pozvánka přijata uživatelem ${user.email}.`,
        messageEn: `Invitation accepted by ${user.email}.`,
      },
    });
  });

  return getInvitationNotice(token, locale);
}

export async function getDemoTransparencyNotice(publicToken: string, locale: Locale) {
  const ad = await prisma.ad.findUnique({
    where: {
      publicToken,
    },
    include: {
      orgUnit: true,
      campaign: true,
      tenant: true,
    },
  });

  if (!ad) {
    return null;
  }

  const publicUrl = `${publicAppUrl()}/ad/${ad.publicToken}`;

  if (!isPublicWorkflowStatus(ad.workflowStatus)) {
    return {
      status: "pending" as const,
      publicToken: ad.publicToken,
      publicUrl,
      lastUpdated: formatDate(ad.updatedAt, locale),
    };
  }

  return {
    status: "published" as const,
    tenant: locale === "cs" ? ad.tenant.nameCs : ad.tenant.nameEn,
    tenantSlug: ad.tenant.slug,
    campaign: locale === "cs" ? ad.campaign.nameCs : ad.campaign.nameEn,
    election: ad.campaign.election,
    ad: mapAd(ad, locale),
    lastUpdated: formatDate(ad.updatedAt, locale),
    publicUrl,
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

  const updated = await prisma.$transaction(async (tx) => {
    const completed = await tx.ad.update({
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
        supplierCs: ad.supplierCs || "interní tým / dodavatel kampaně",
        supplierEn: ad.supplierEn || "internal team / campaign supplier",
        distributionAreaCs: ad.distributionAreaCs || (ad.orgUnitId ? "lokální oblast" : "území kampaně"),
        distributionAreaEn: ad.distributionAreaEn || (ad.orgUnitId ? "local area" : "campaign area"),
        language: ad.language || "cs",
        targetAudienceCs: ad.isTargeted ? ad.targetAudienceCs || "voliči v určené oblasti" : ad.targetAudienceCs,
        targetAudienceEn: ad.isTargeted ? ad.targetAudienceEn || "voters in the selected area" : ad.targetAudienceEn,
        missingCs: [],
        missingEn: [],
        status: AdStatus.REVIEW,
        statusLabelCs: "Kontrola",
        statusLabelEn: "Review",
        workflowStatus: AdWorkflowStatus.READY_FOR_REVIEW,
        reviewRequestedAt: new Date(),
        lockedAt: null,
        statusNoteCs: "Povinné údaje jsou doplněné a záznam čeká na kontrolu.",
        statusNoteEn: "Required data is complete and the record is waiting for review.",
      },
      include: {
        orgUnit: true,
        campaign: true,
        tenant: true,
        assets: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        adId: completed.id,
        actor: "demo-admin",
        action: "complete_required_data",
        messageCs: `Doplněna povinná data u reklamy ${completed.code}.`,
        messageEn: `Required data completed for ad ${completed.code}.`,
      },
    });

    await tx.approval.create({
      data: {
        tenantId: tenant.id,
        adId: completed.id,
        actor: "demo-admin",
        status: ApprovalStatus.REQUESTED,
        noteCs: "Reklama byla předána ke kontrole.",
        noteEn: "Ad was submitted for review.",
      },
    });

    return completed;
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

  const ad = await prisma.$transaction(async (tx) => {
    const created = await tx.ad.create({
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
        channel: normalizeChannel(input.channel),
        publicationDate: parsePublicationDate(input.publicationDate),
        periodCs: input.period.trim(),
        periodEn: input.period.trim(),
        distributionAreaCs: input.distributionArea.trim(),
        distributionAreaEn: input.distributionArea.trim(),
        payerCs: input.payer.trim(),
        payerEn: input.payer.trim(),
        supplierCs: input.supplier.trim(),
        supplierEn: input.supplier.trim(),
        amount: input.amount.trim(),
        fundingSourceCs: input.fundingSource.trim(),
        fundingSourceEn: input.fundingSource.trim(),
        language: input.language.trim(),
        isTargeted: input.isTargeted,
        targetingCs: defaultTargeting(input, "cs"),
        targetingEn: defaultTargeting(input, "en"),
        targetAudienceCs: input.targetAudience.trim(),
        targetAudienceEn: input.targetAudience.trim(),
        missingCs,
        missingEn,
        status,
        statusLabelCs: statusLabelForInput(input, "cs"),
        statusLabelEn: statusLabelForInput(input, "en"),
        workflowStatus: workflowForInput(input),
        reviewRequestedAt: missingCs.length === 0 ? new Date() : null,
        statusNoteCs:
          missingCs.length === 0
            ? "Záznam byl vytvořen s kompletními údaji a čeká na kontrolu."
            : "Záznam čeká na doplnění povinných údajů.",
        statusNoteEn:
          missingEn.length === 0
            ? "The record was created with complete data and is waiting for review."
            : "The record is waiting for required data.",
      },
      include: {
        orgUnit: true,
        campaign: true,
        tenant: true,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        adId: created.id,
        actor: "demo-admin",
        action: "create_ad",
        messageCs: `Vytvořena reklama ${created.code}.`,
        messageEn: `Created ad ${created.code}.`,
      },
    });

    if (missingCs.length === 0) {
      await tx.approval.create({
        data: {
          tenantId: tenant.id,
          adId: created.id,
          actor: "demo-admin",
          status: ApprovalStatus.REQUESTED,
          noteCs: "Reklama byla vytvořena a předána ke kontrole.",
          noteEn: "Ad was created and submitted for review.",
        },
      });
    }

    return created;
  });

  return mapAd(ad, locale);
}

function adSnapshot(ad: Ad) {
  return {
    code: ad.code,
    publicToken: ad.publicToken,
    titleCs: ad.titleCs,
    titleEn: ad.titleEn,
    ownerCs: ad.ownerCs,
    ownerEn: ad.ownerEn,
    mediaTypeCs: ad.mediaTypeCs,
    mediaTypeEn: ad.mediaTypeEn,
    channel: ad.channel,
    publicationDate: ad.publicationDate.toISOString(),
    periodCs: ad.periodCs,
    periodEn: ad.periodEn,
    distributionAreaCs: ad.distributionAreaCs,
    distributionAreaEn: ad.distributionAreaEn,
    payerCs: ad.payerCs,
    payerEn: ad.payerEn,
    supplierCs: ad.supplierCs,
    supplierEn: ad.supplierEn,
    amount: ad.amount,
    fundingSourceCs: ad.fundingSourceCs,
    fundingSourceEn: ad.fundingSourceEn,
    language: ad.language,
    isTargeted: ad.isTargeted,
    targetingCs: ad.targetingCs,
    targetingEn: ad.targetingEn,
    targetAudienceCs: ad.targetAudienceCs,
    targetAudienceEn: ad.targetAudienceEn,
    missingCs: ad.missingCs,
    missingEn: ad.missingEn,
    status: ad.status,
    workflowStatus: ad.workflowStatus,
    version: ad.version,
    publishedAt: ad.publishedAt?.toISOString() ?? null,
    lockedAt: ad.lockedAt?.toISOString() ?? null,
  };
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
  const versionBumpNeeded = Boolean(existing.lockedAt || existing.workflowStatus === AdWorkflowStatus.PUBLISHED);
  const nextVersion = versionBumpNeeded ? existing.version + 1 : existing.version;

  const ad = await prisma.$transaction(async (tx) => {
    if (versionBumpNeeded) {
      await tx.adVersion.upsert({
        where: {
          adId_version: {
            adId: existing.id,
            version: existing.version,
          },
        },
        update: {
          snapshot: adSnapshot(existing),
          reason: "edit_locked_ad",
        },
        create: {
          tenantId: existing.tenantId,
          adId: existing.id,
          version: existing.version,
          reason: "edit_locked_ad",
          snapshot: adSnapshot(existing),
        },
      });
    }

    const updated = await tx.ad.update({
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
        channel: normalizeChannel(input.channel),
        publicationDate: parsePublicationDate(input.publicationDate),
        periodCs: input.period.trim(),
        periodEn: input.period.trim(),
        distributionAreaCs: input.distributionArea.trim(),
        distributionAreaEn: input.distributionArea.trim(),
        payerCs: input.payer.trim(),
        payerEn: input.payer.trim(),
        supplierCs: input.supplier.trim(),
        supplierEn: input.supplier.trim(),
        amount: input.amount.trim(),
        fundingSourceCs: input.fundingSource.trim(),
        fundingSourceEn: input.fundingSource.trim(),
        language: input.language.trim(),
        isTargeted: input.isTargeted,
        targetingCs: defaultTargeting(input, "cs"),
        targetingEn: defaultTargeting(input, "en"),
        targetAudienceCs: input.targetAudience.trim(),
        targetAudienceEn: input.targetAudience.trim(),
        missingCs,
        missingEn,
        status,
        statusLabelCs: statusLabelForInput(input, "cs"),
        statusLabelEn: statusLabelForInput(input, "en"),
        workflowStatus: workflowForInput(input),
        version: nextVersion,
        reviewRequestedAt: missingCs.length === 0 ? new Date() : null,
        approvedAt: null,
        publishedAt: versionBumpNeeded ? null : existing.publishedAt,
        lockedAt: null,
        statusNoteCs:
          missingCs.length === 0
            ? versionBumpNeeded
              ? `Upravena publikovaná reklama. Vznikla verze ${nextVersion} a čeká na kontrolu.`
              : "Změny jsou uložené a záznam čeká na kontrolu."
            : "Záznam čeká na doplnění povinných údajů.",
        statusNoteEn:
          missingEn.length === 0
            ? versionBumpNeeded
              ? `Published ad edited. Version ${nextVersion} was created and is waiting for review.`
              : "Changes are saved and the record is waiting for review."
            : "The record is waiting for required data.",
      },
      include: {
        orgUnit: true,
        campaign: true,
        tenant: true,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        adId: updated.id,
        actor: "demo-admin",
        action: "update_ad",
        messageCs: versionBumpNeeded ? `Upravena publikovaná reklama ${updated.code}; vytvořena verze ${nextVersion}.` : `Upravena reklama ${updated.code}.`,
        messageEn: versionBumpNeeded ? `Updated published ad ${updated.code}; version ${nextVersion} created.` : `Updated ad ${updated.code}.`,
      },
    });

    if (missingCs.length === 0) {
      await tx.approval.create({
        data: {
          tenantId: tenant.id,
          adId: updated.id,
          actor: "demo-admin",
          status: ApprovalStatus.REQUESTED,
          noteCs: `Verze ${updated.version} čeká na kontrolu.`,
          noteEn: `Version ${updated.version} is waiting for review.`,
        },
      });
    }

    return updated;
  });

  return mapAd(ad, locale);
}

async function findTenantAd(code: string) {
  const { tenant } = await getDemoTenantAndCampaign();
  const ad = await prisma.ad.findUnique({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code,
      },
    },
    include: {
      orgUnit: true,
      campaign: true,
      tenant: true,
    },
  });

  return { tenant, ad };
}

export async function approveDemoAd(code: string, locale: Locale) {
  const { tenant, ad } = await findTenantAd(code);

  if (!ad) {
    return null;
  }

  const missing = missingForAd(ad, "cs");

  if (missing.length > 0) {
    throw new Error("Required data is missing.");
  }

  if (ad.workflowStatus !== AdWorkflowStatus.READY_FOR_REVIEW) {
    throw new Error("Ad is not waiting for review.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const approved = await tx.ad.update({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code,
        },
      },
      data: {
        status: AdStatus.READY,
        statusLabelCs: "Schváleno",
        statusLabelEn: "Approved",
        workflowStatus: AdWorkflowStatus.APPROVED,
        approvedAt: new Date(),
        reviewerName: "Centrální kontrola",
        statusNoteCs: `Verze ${ad.version} je schválená a připravená k publikaci.`,
        statusNoteEn: `Version ${ad.version} is approved and ready to publish.`,
      },
      include: {
        orgUnit: true,
        campaign: true,
        tenant: true,
      },
    });

    await tx.approval.create({
      data: {
        tenantId: tenant.id,
        adId: ad.id,
        actor: "demo-admin",
        status: ApprovalStatus.APPROVED,
        noteCs: `Verze ${ad.version} byla schválena.`,
        noteEn: `Version ${ad.version} was approved.`,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        adId: ad.id,
        actor: "demo-admin",
        action: "approve_ad",
        messageCs: `Schválena reklama ${ad.code}, verze ${ad.version}.`,
        messageEn: `Approved ad ${ad.code}, version ${ad.version}.`,
      },
    });

    return tx.ad.findUniqueOrThrow({
      where: {
        id: approved.id,
      },
      include: {
        orgUnit: true,
        campaign: true,
        tenant: true,
        assets: {
          orderBy: {
            createdAt: "desc",
          },
        },
        approvals: {
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        },
      },
    });
  });

  return mapAd(updated, locale);
}

export async function publishDemoAd(code: string, locale: Locale) {
  const { tenant, ad } = await findTenantAd(code);

  if (!ad) {
    return null;
  }

  const missing = missingForAd(ad, "cs");

  if (missing.length > 0) {
    throw new Error("Required data is missing.");
  }

  if (ad.workflowStatus !== AdWorkflowStatus.APPROVED) {
    throw new Error("Ad must be approved before publication.");
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const published = await tx.ad.update({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code,
        },
      },
      data: {
        status: AdStatus.READY,
        statusLabelCs: "Publikováno",
        statusLabelEn: "Published",
        workflowStatus: AdWorkflowStatus.PUBLISHED,
        approvedAt: ad.approvedAt ?? now,
        publishedAt: now,
        lockedAt: now,
        reviewerName: ad.reviewerName || "Centrální kontrola",
        statusNoteCs: `Verze ${ad.version} je publikovaná a uzamčená.`,
        statusNoteEn: `Version ${ad.version} is published and locked.`,
      },
      include: {
        orgUnit: true,
        campaign: true,
        tenant: true,
      },
    });

    await tx.approval.create({
      data: {
        tenantId: tenant.id,
        adId: ad.id,
        actor: "demo-admin",
        status: ApprovalStatus.PUBLISHED,
        noteCs: `Verze ${ad.version} byla publikována.`,
        noteEn: `Version ${ad.version} was published.`,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        adId: ad.id,
        actor: "demo-admin",
        action: "publish_ad",
        messageCs: `Publikována a uzamčena reklama ${ad.code}, verze ${ad.version}.`,
        messageEn: `Published and locked ad ${ad.code}, version ${ad.version}.`,
      },
    });

    return published;
  });

  return mapAd(updated, locale);
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

export async function getDemoAuditPackage(code: string, locale: Locale) {
  const { tenant, campaign } = await getDemoTenantAndCampaign();
  const ad = await prisma.ad.findUnique({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code,
      },
    },
    include: {
      orgUnit: true,
      campaign: true,
      tenant: true,
      auditLogs: {
        orderBy: {
          createdAt: "asc",
        },
      },
      versions: {
        orderBy: {
          version: "asc",
        },
      },
      approvals: {
        orderBy: {
          createdAt: "asc",
        },
      },
      assets: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!ad) {
    return null;
  }

  const typedAd = ad as AuditPackageAd;

  return {
    exportedAt: new Date().toISOString(),
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      name: locale === "cs" ? tenant.nameCs : tenant.nameEn,
    },
    campaign: {
      id: campaign.id,
      slug: campaign.slug,
      name: locale === "cs" ? campaign.nameCs : campaign.nameEn,
      election: campaign.election,
      startsAt: campaign.startsAt.toISOString(),
      endsAt: campaign.endsAt.toISOString(),
    },
    ad: mapAd(typedAd, locale),
    notice: {
      publicUrl: `${publicAppUrl()}/ad/${typedAd.publicToken}`,
      lastUpdated: typedAd.updatedAt.toISOString(),
      missing: locale === "cs" ? typedAd.missingCs : typedAd.missingEn,
      workflowStatus: typedAd.workflowStatus,
      version: typedAd.version,
      lockedAt: typedAd.lockedAt?.toISOString() ?? null,
    },
    versions: typedAd.versions.map((version) => ({
      version: version.version,
      reason: version.reason,
      createdAt: version.createdAt.toISOString(),
      snapshot: version.snapshot,
    })),
    approvals: typedAd.approvals.map((approval) => ({
      actor: approval.actor,
      status: approval.status,
      note: locale === "cs" ? approval.noteCs : approval.noteEn,
      createdAt: approval.createdAt.toISOString(),
    })),
    assets: typedAd.assets.map((asset) => ({
      id: asset.id,
      fileName: asset.fileName,
      originalName: asset.originalName,
      contentType: asset.contentType,
      byteSize: asset.byteSize,
      checksumSha256: asset.checksumSha256,
      storageProvider: asset.storageProvider,
      storageBucket: asset.storageBucket,
      storageKey: asset.storageKey,
      uploadedBy: asset.uploadedBy,
      createdAt: asset.createdAt.toISOString(),
    })),
    auditLogs: typedAd.auditLogs.map((log) => ({
      id: log.id,
      actor: log.actor,
      action: log.action,
      message: locale === "cs" ? log.messageCs : log.messageEn,
      createdAt: log.createdAt.toISOString(),
    })),
  };
}

function isTenantWideRole(role: UserRole) {
  return role === UserRole.SUPER_ADMIN || role === UserRole.PARTY_ADMIN || role === UserRole.CENTRAL_REVIEWER || role === UserRole.READONLY_AUDITOR;
}

function canCreateAppAds(role: UserRole) {
  return (
    role === UserRole.SUPER_ADMIN ||
    role === UserRole.PARTY_ADMIN ||
    role === UserRole.LOCAL_ADMIN ||
    role === UserRole.CAMPAIGN_MANAGER ||
    role === UserRole.CANDIDATE
  );
}

function canEditAppAds(role: UserRole) {
  return canCreateAppAds(role);
}

function canUploadAppAssets(role: UserRole) {
  return canEditAppAds(role) || role === UserRole.DESIGNER;
}

function canApproveAppAds(role: UserRole) {
  return role === UserRole.SUPER_ADMIN || role === UserRole.PARTY_ADMIN || role === UserRole.CENTRAL_REVIEWER;
}

function canPublishAppAds(role: UserRole) {
  return role === UserRole.SUPER_ADMIN || role === UserRole.PARTY_ADMIN || role === UserRole.CENTRAL_REVIEWER;
}

function canManageAppBranches(role: UserRole) {
  return role === UserRole.SUPER_ADMIN || role === UserRole.PARTY_ADMIN;
}

function canManageAppUsers(role: UserRole) {
  return role === UserRole.SUPER_ADMIN || role === UserRole.PARTY_ADMIN;
}

function appRolePermissions(role: UserRole) {
  return {
    canCreateAds: canCreateAppAds(role),
    canEditAds: canEditAppAds(role),
    canUploadAssets: canUploadAppAssets(role),
    canApproveAds: canApproveAppAds(role),
    canPublishAds: canPublishAppAds(role),
    canManageBranches: canManageAppBranches(role),
    canManageUsers: canManageAppUsers(role),
  };
}

async function getAppAccessContext(userId: string) {
  const membership = await prisma.tenantMembership.findFirst({
    where: {
      userId,
      status: MembershipStatus.ACTIVE,
    },
    include: {
      user: true,
      tenant: true,
      orgUnit: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!membership) {
    return null;
  }

  return {
    membership,
    tenantWideRole: isTenantWideRole(membership.role),
  };
}

async function getAppCampaign(tenantId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: {
      tenantId,
    },
    orderBy: {
      startsAt: "desc",
    },
  });

  if (campaign) {
    return campaign;
  }

  return prisma.campaign.create({
    data: {
      tenantId,
      slug: "default-2026",
      nameCs: "Výchozí kampaň",
      nameEn: "Default campaign",
      election: "Volby 2026",
      startsAt: new Date("2026-01-01T00:00:00.000Z"),
      endsAt: new Date("2026-12-31T23:59:59.000Z"),
    },
  });
}

async function getAppUnitForInput(
  context: NonNullable<Awaited<ReturnType<typeof getAppAccessContext>>>,
  input: EditableAdInput,
) {
  if (!context.tenantWideRole) {
    if (!context.membership.orgUnit) {
      throw new Error("User is missing organization unit scope.");
    }

    return context.membership.orgUnit;
  }

  const branch = input.branch.trim();
  const unit = await prisma.organizationUnit.findFirst({
    where: {
      tenantId: context.membership.tenantId,
      OR: [{ id: branch }, { slug: slugify(branch) }, { nameCs: branch }, { nameEn: branch }],
    },
  });

  if (!unit) {
    throw new Error("Vyberte existující pobočku nebo ji nejdřív založte.");
  }

  return unit;
}

async function getAppUnitForImport(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  context: NonNullable<Awaited<ReturnType<typeof getAppAccessContext>>>,
  branchName: string,
) {
  if (!context.tenantWideRole) {
    if (!context.membership.orgUnit) {
      throw new Error("User is missing organization unit scope.");
    }

    return context.membership.orgUnit;
  }

  const name = branchName.trim() || "Import";
  const slug = slugify(name);

  return tx.organizationUnit.upsert({
    where: {
      tenantId_slug: {
        tenantId: context.membership.tenantId,
        slug,
      },
    },
    update: {
      nameCs: name,
      nameEn: name,
    },
    create: {
      tenantId: context.membership.tenantId,
      slug,
      kind: "oblast",
      nameCs: name,
      nameEn: name,
    },
  });
}

async function uniqueImportCode(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  tenantId: string,
  preferredCode: string,
  branch: string,
  rowNumber: number,
  reservedCodes: Set<string>,
) {
  const normalized = normalizeCode(preferredCode || "") || nextImportCode(branch, rowNumber);
  let code = normalized;

  for (let index = 2; index < 50; index += 1) {
    const existing = await tx.ad.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code,
        },
      },
      select: {
        id: true,
      },
    });

    if (!existing && !reservedCodes.has(code)) {
      reservedCodes.add(code);
      return code;
    }

    if (preferredCode) {
      return "";
    }

    code = `${normalized}-${index}`;
  }

  return "";
}

function scopedAdWhere(context: NonNullable<Awaited<ReturnType<typeof getAppAccessContext>>>) {
  return {
    tenantId: context.membership.tenantId,
    ...(context.tenantWideRole ? {} : { orgUnitId: context.membership.orgUnitId || "__missing_org_scope__" }),
  };
}

export async function getAppWorkspacePayload(userId: string, locale: Locale): Promise<AppWorkspacePayload | null> {
  const context = await getAppAccessContext(userId);

  if (!context) {
    return null;
  }

  const { membership, tenantWideRole } = context;
  const permissions = appRolePermissions(membership.role);
  const [ads, branches, memberships, invitations] = await Promise.all([
    prisma.ad.findMany({
      where: scopedAdWhere(context),
      include: {
        orgUnit: true,
        campaign: true,
        tenant: true,
        assets: {
          orderBy: {
            createdAt: "desc",
          },
        },
        approvals: {
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        },
      },
      orderBy: [{ publicationDate: "asc" }, { code: "asc" }],
    }),
    prisma.organizationUnit.findMany({
      where: {
        tenantId: membership.tenantId,
        ...(tenantWideRole ? {} : { id: membership.orgUnitId || "__missing_org_scope__" }),
      },
      orderBy: [{ kind: "asc" }, { nameCs: "asc" }],
    }),
    permissions.canManageUsers
      ? prisma.tenantMembership.findMany({
          where: {
            tenantId: membership.tenantId,
          },
          include: {
            user: true,
            orgUnit: true,
          },
          orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
        })
      : Promise.resolve([]),
    permissions.canManageUsers
      ? prisma.invitation.findMany({
          where: {
            tenantId: membership.tenantId,
          },
          include: {
            orgUnit: true,
            emailMessages: {
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        })
      : Promise.resolve([]),
  ]);

  const mappedAds = ads.map((ad) => mapAd(ad, locale));
  const membershipScope = tenantWideRole
    ? scopeLabel(null, locale)
    : membership.orgUnit
      ? scopeLabel(membership.orgUnit, locale)
      : locale === "cs"
        ? "bez pobočky"
        : "no branch assigned";

  return {
    user: {
      name: membership.user.name,
      email: membership.user.email,
    },
    tenant: {
      name: locale === "cs" ? membership.tenant.nameCs : membership.tenant.nameEn,
      slug: membership.tenant.slug,
    },
    membership: {
      role: roleLabel(membership.role, locale),
      roleKey: membership.role,
      scope: membershipScope,
      status: membershipStatusLabel(membership.status, locale),
    },
    branches: branches.map((branch) => ({
      id: branch.id,
      name: locale === "cs" ? branch.nameCs : branch.nameEn,
    })),
    permissions,
    users: {
      members: memberships.map((member) => mapMember(member, locale)),
      invitations: invitations.map((invitation) => mapInvitation(invitation, locale)),
      branches: branches.map((branch) => ({
        id: branch.id,
        name: locale === "cs" ? branch.nameCs : branch.nameEn,
      })),
    },
    storage: objectStorageStatus(),
    ads: mappedAds,
    counts: {
      all: mappedAds.length,
      needsData: mappedAds.filter((ad) => ad.workflowStatus === "NEEDS_DATA").length,
      review: mappedAds.filter((ad) => ad.workflowStatus === "READY_FOR_REVIEW").length,
      approved: mappedAds.filter((ad) => ad.workflowStatus === "APPROVED").length,
      published: mappedAds.filter((ad) => ad.workflowStatus === "PUBLISHED").length,
      blocked: mappedAds.filter((ad) => ad.status === "blocked").length,
    },
  };
}

export async function createAppBranch(userId: string, input: AppBranchInput, locale: Locale) {
  const context = await getAppAccessContext(userId);

  if (!context || !canManageAppBranches(context.membership.role)) {
    return null;
  }

  const name = input.name.trim();
  const kind = input.kind.trim() || "oblast";
  const baseSlug = slugify(name);

  if (!baseSlug) {
    throw new Error("Branch name is required.");
  }

  let slug = baseSlug;
  for (let index = 2; index < 50; index += 1) {
    const existing = await prisma.organizationUnit.findUnique({
      where: {
        tenantId_slug: {
          tenantId: context.membership.tenantId,
          slug,
        },
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      break;
    }

    slug = `${baseSlug}-${index}`;
  }

  const branch = await prisma.$transaction(async (tx) => {
    const created = await tx.organizationUnit.create({
      data: {
        tenantId: context.membership.tenantId,
        slug,
        kind,
        nameCs: name,
        nameEn: name,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: context.membership.tenantId,
        actor: context.membership.user.email,
        actorUserId: context.membership.userId,
        action: "create_branch",
        messageCs: `Založena pobočka ${created.nameCs}.`,
        messageEn: `Created branch ${created.nameEn}.`,
      },
    });

    return created;
  });

  return {
    id: branch.id,
    name: locale === "cs" ? branch.nameCs : branch.nameEn,
  };
}

export async function createAppInvitation(userId: string, input: InviteInput, locale: Locale) {
  const context = await getAppAccessContext(userId);

  if (!context || !canManageAppUsers(context.membership.role)) {
    return null;
  }

  const email = normalizeEmail(input.email);

  if (!isValidEmail(email)) {
    throw new Error("Zadejte platný e-mail.");
  }

  const role = normalizeInviteRole(input.role);
  const orgUnit =
    input.branchId && role !== UserRole.PARTY_ADMIN && role !== UserRole.CENTRAL_REVIEWER
      ? await prisma.organizationUnit.findFirst({
          where: {
            id: input.branchId,
            tenantId: context.membership.tenantId,
          },
        })
      : null;

  if (role !== UserRole.PARTY_ADMIN && role !== UserRole.CENTRAL_REVIEWER && !orgUnit) {
    throw new Error("Vyberte pobočku pro člověka, který nemá pracovat s celou stranou.");
  }

  await prisma.invitation.updateMany({
    where: {
      tenantId: context.membership.tenantId,
      email,
      status: InvitationStatus.PENDING,
    },
    data: {
      status: InvitationStatus.REVOKED,
    },
  });

  const invitation = await prisma.invitation.create({
    data: {
      tenantId: context.membership.tenantId,
      orgUnitId: orgUnit?.id,
      email,
      role,
      token: createInviteToken(),
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      invitedByUserId: context.membership.userId,
    },
    include: {
      tenant: true,
      orgUnit: true,
    },
  });

  const emailMessage = await sendInvitationEmail(invitation);

  await prisma.auditLog.create({
    data: {
      tenantId: context.membership.tenantId,
      actor: context.membership.user.email,
      actorUserId: context.membership.userId,
      action: "create_invitation",
      messageCs: `Pozván ${email}. Stav e-mailu: ${emailStatusLabel(emailMessage.status, "cs")}.`,
      messageEn: `Invited ${email}. Email status: ${emailStatusLabel(emailMessage.status, "en")}.`,
    },
  });

  return mapInvitation({ ...invitation, emailMessages: [emailMessage] }, locale);
}

export async function retryAppInvitationEmail(userId: string, invitationId: string, locale: Locale) {
  const context = await getAppAccessContext(userId);

  if (!context || !canManageAppUsers(context.membership.role)) {
    return null;
  }

  const invitation = await prisma.invitation.findFirst({
    where: {
      id: invitationId,
      tenantId: context.membership.tenantId,
    },
    include: {
      tenant: true,
      orgUnit: true,
      emailMessages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  if (!invitation) {
    return null;
  }

  const latestEmail = invitation.emailMessages[0];
  const emailMessage = latestEmail?.status === EmailStatus.SENT ? latestEmail : await sendInvitationEmail(invitation);

  await prisma.auditLog.create({
    data: {
      tenantId: context.membership.tenantId,
      actor: context.membership.user.email,
      actorUserId: context.membership.userId,
      action: "retry_invitation_email",
      messageCs: `Znovu zpracováno odeslání pozvánky pro ${invitation.email}. Stav e-mailu: ${emailStatusLabel(emailMessage.status, "cs")}.`,
      messageEn: `Retried invitation email for ${invitation.email}. Email status: ${emailStatusLabel(emailMessage.status, "en")}.`,
    },
  });

  return mapInvitation({ ...invitation, emailMessages: [emailMessage] }, locale);
}

export async function createAppAd(userId: string, input: EditableAdInput, locale: Locale) {
  const context = await getAppAccessContext(userId);

  if (!context || !canCreateAppAds(context.membership.role)) {
    return null;
  }

  const [campaign, unit] = await Promise.all([getAppCampaign(context.membership.tenantId), getAppUnitForInput(context, input)]);
  const code = normalizeCode(input.code || "") || nextCode(unit.nameCs || input.branch);
  const missingCs = requiredMissing(input, "cs");
  const missingEn = requiredMissing(input, "en");
  const status = statusForInput(input);

  const ad = await prisma.$transaction(async (tx) => {
    const created = await tx.ad.create({
      data: {
        tenantId: context.membership.tenantId,
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
        channel: normalizeChannel(input.channel),
        publicationDate: parsePublicationDate(input.publicationDate),
        periodCs: input.period.trim(),
        periodEn: input.period.trim(),
        distributionAreaCs: input.distributionArea.trim(),
        distributionAreaEn: input.distributionArea.trim(),
        payerCs: input.payer.trim(),
        payerEn: input.payer.trim(),
        supplierCs: input.supplier.trim(),
        supplierEn: input.supplier.trim(),
        amount: input.amount.trim(),
        fundingSourceCs: input.fundingSource.trim(),
        fundingSourceEn: input.fundingSource.trim(),
        language: input.language.trim(),
        isTargeted: input.isTargeted,
        targetingCs: defaultTargeting(input, "cs"),
        targetingEn: defaultTargeting(input, "en"),
        targetAudienceCs: input.targetAudience.trim(),
        targetAudienceEn: input.targetAudience.trim(),
        missingCs,
        missingEn,
        status,
        statusLabelCs: statusLabelForInput(input, "cs"),
        statusLabelEn: statusLabelForInput(input, "en"),
        workflowStatus: workflowForInput(input),
        reviewRequestedAt: missingCs.length === 0 ? new Date() : null,
        statusNoteCs:
          missingCs.length === 0
            ? "Záznam byl vytvořen s kompletními údaji a čeká na kontrolu."
            : "Záznam čeká na doplnění povinných údajů.",
        statusNoteEn:
          missingEn.length === 0
            ? "The record was created with complete data and is waiting for review."
            : "The record is waiting for required data.",
      },
      include: {
        orgUnit: true,
        campaign: true,
        tenant: true,
        assets: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: context.membership.tenantId,
        adId: created.id,
        actor: context.membership.user.email,
        actorUserId: context.membership.userId,
        action: "create_ad",
        messageCs: `Vytvořena reklama ${created.code}.`,
        messageEn: `Created ad ${created.code}.`,
      },
    });

    if (missingCs.length === 0) {
      await tx.approval.create({
        data: {
          tenantId: context.membership.tenantId,
          adId: created.id,
          actor: context.membership.user.email,
          status: ApprovalStatus.REQUESTED,
          noteCs: "Reklama byla vytvořena a předána ke kontrole.",
          noteEn: "Ad was created and submitted for review.",
        },
      });
    }

    return created;
  });

  return mapAd(ad, locale);
}

export async function importAppAds(userId: string, rows: AdImportInputRow[], locale: Locale): Promise<AdImportResult | null> {
  const context = await getAppAccessContext(userId);

  if (!context || !canCreateAppAds(context.membership.role)) {
    return null;
  }

  const limitedRows = rows.slice(0, 500);
  const campaign = await getAppCampaign(context.membership.tenantId);
  const reservedCodes = new Set<string>();
  const result: AdImportResult = {
    totalRows: limitedRows.length,
    createdCount: 0,
    skippedCount: 0,
    failedCount: 0,
    created: [],
    skipped: [],
    errors: [],
  };

  for (const row of limitedRows) {
    const input = row.input;
    const title = input.title.trim();

    try {
      const ad = await prisma.$transaction(async (tx) => {
        const unit = await getAppUnitForImport(tx, context, input.branch);
        const code = await uniqueImportCode(tx, context.membership.tenantId, input.code || "", unit.nameCs || input.branch, row.rowNumber, reservedCodes);

        if (!code) {
          return {
            skipped: {
              rowNumber: row.rowNumber,
              code: normalizeCode(input.code || ""),
              title,
              message: "Kód už v databázi existuje.",
            },
          } as const;
        }

        const missingCs = requiredMissing(input, "cs");
        const missingEn = requiredMissing(input, "en");
        const status = statusForInput(input);
        const created = await tx.ad.create({
          data: {
            tenantId: context.membership.tenantId,
            campaignId: campaign.id,
            orgUnitId: unit.id,
            code,
            publicToken: createPublicToken(),
            titleCs: title,
            titleEn: title,
            ownerCs: input.owner.trim(),
            ownerEn: input.owner.trim(),
            mediaTypeCs: input.type.trim(),
            mediaTypeEn: input.type.trim(),
            channel: normalizeChannel(input.channel),
            publicationDate: parsePublicationDate(input.publicationDate),
            periodCs: input.period.trim(),
            periodEn: input.period.trim(),
            distributionAreaCs: input.distributionArea.trim(),
            distributionAreaEn: input.distributionArea.trim(),
            payerCs: input.payer.trim(),
            payerEn: input.payer.trim(),
            supplierCs: input.supplier.trim(),
            supplierEn: input.supplier.trim(),
            amount: input.amount.trim(),
            fundingSourceCs: input.fundingSource.trim(),
            fundingSourceEn: input.fundingSource.trim(),
            language: input.language.trim() || "cs",
            isTargeted: input.isTargeted,
            targetingCs: defaultTargeting(input, "cs"),
            targetingEn: defaultTargeting(input, "en"),
            targetAudienceCs: input.targetAudience.trim(),
            targetAudienceEn: input.targetAudience.trim(),
            missingCs,
            missingEn,
            status,
            statusLabelCs: statusLabelForInput(input, "cs"),
            statusLabelEn: statusLabelForInput(input, "en"),
            workflowStatus: workflowForInput(input),
            reviewRequestedAt: missingCs.length === 0 ? new Date() : null,
            statusNoteCs:
              missingCs.length === 0
                ? "Záznam byl importován s kompletními údaji a čeká na kontrolu."
                : "Záznam byl importován a čeká na doplnění povinných údajů.",
            statusNoteEn:
              missingEn.length === 0
                ? "The record was imported with complete data and is waiting for review."
                : "The record was imported and is waiting for required data.",
          },
          include: {
            orgUnit: true,
            campaign: true,
            tenant: true,
            assets: {
              orderBy: {
                createdAt: "desc",
              },
            },
            approvals: {
              orderBy: {
                createdAt: "desc",
              },
              take: 5,
            },
          },
        });

        await tx.auditLog.create({
          data: {
            tenantId: context.membership.tenantId,
            adId: created.id,
            actor: context.membership.user.email,
            actorUserId: context.membership.userId,
            action: "import_ad",
            messageCs: `Importována reklama ${created.code} z Excelu, řádek ${row.rowNumber}.`,
            messageEn: `Imported ad ${created.code} from Excel, row ${row.rowNumber}.`,
            metadata: {
              rowNumber: row.rowNumber,
              raw: row.raw ?? {},
            },
          },
        });

        if (missingCs.length === 0) {
          await tx.approval.create({
            data: {
              tenantId: context.membership.tenantId,
              adId: created.id,
              actor: context.membership.user.email,
              status: ApprovalStatus.REQUESTED,
              noteCs: "Reklama byla importována a předána ke kontrole.",
              noteEn: "Ad was imported and submitted for review.",
            },
          });
        }

        return {
          ad: created,
        } as const;
      });

      if ("skipped" in ad && ad.skipped) {
        result.skipped.push(ad.skipped);
        result.skippedCount += 1;
      } else {
        result.created.push(mapAd(ad.ad, locale));
        result.createdCount += 1;
      }
    } catch (error) {
      result.errors.push({
        rowNumber: row.rowNumber,
        code: normalizeCode(input.code || ""),
        title,
        message: error instanceof Error ? error.message : "Řádek se nepodařilo importovat.",
      });
      result.failedCount += 1;
    }
  }

  if (result.createdCount > 0) {
    await prisma.auditLog.create({
      data: {
        tenantId: context.membership.tenantId,
        actor: context.membership.user.email,
        actorUserId: context.membership.userId,
        action: "import_ads_batch",
        messageCs: `Import z Excelu založil ${result.createdCount} reklam, přeskočil ${result.skippedCount} a neuložil ${result.failedCount}.`,
        messageEn: `Excel import created ${result.createdCount} ads, skipped ${result.skippedCount} and failed ${result.failedCount}.`,
        metadata: {
          totalRows: result.totalRows,
          createdCount: result.createdCount,
          skippedCount: result.skippedCount,
          failedCount: result.failedCount,
        },
      },
    });
  }

  return result;
}

export async function updateAppAd(userId: string, code: string, input: EditableAdInput, locale: Locale) {
  const context = await getAppAccessContext(userId);

  if (!context || !canEditAppAds(context.membership.role)) {
    return null;
  }

  const existing = await prisma.ad.findUnique({
    where: {
      tenantId_code: {
        tenantId: context.membership.tenantId,
        code,
      },
    },
  });

  if (!existing || (!context.tenantWideRole && existing.orgUnitId !== context.membership.orgUnitId)) {
    return null;
  }

  const unit = await getAppUnitForInput(context, input);
  const missingCs = requiredMissing(input, "cs");
  const missingEn = requiredMissing(input, "en");
  const status = statusForInput(input);
  const versionBumpNeeded = Boolean(existing.lockedAt || existing.workflowStatus === AdWorkflowStatus.PUBLISHED);
  const nextVersion = versionBumpNeeded ? existing.version + 1 : existing.version;

  const ad = await prisma.$transaction(async (tx) => {
    if (versionBumpNeeded) {
      await tx.adVersion.upsert({
        where: {
          adId_version: {
            adId: existing.id,
            version: existing.version,
          },
        },
        update: {
          snapshot: adSnapshot(existing),
          reason: "edit_locked_ad",
        },
        create: {
          tenantId: existing.tenantId,
          adId: existing.id,
          version: existing.version,
          reason: "edit_locked_ad",
          snapshot: adSnapshot(existing),
        },
      });
    }

    const updated = await tx.ad.update({
      where: {
        tenantId_code: {
          tenantId: context.membership.tenantId,
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
        channel: normalizeChannel(input.channel),
        publicationDate: parsePublicationDate(input.publicationDate),
        periodCs: input.period.trim(),
        periodEn: input.period.trim(),
        distributionAreaCs: input.distributionArea.trim(),
        distributionAreaEn: input.distributionArea.trim(),
        payerCs: input.payer.trim(),
        payerEn: input.payer.trim(),
        supplierCs: input.supplier.trim(),
        supplierEn: input.supplier.trim(),
        amount: input.amount.trim(),
        fundingSourceCs: input.fundingSource.trim(),
        fundingSourceEn: input.fundingSource.trim(),
        language: input.language.trim(),
        isTargeted: input.isTargeted,
        targetingCs: defaultTargeting(input, "cs"),
        targetingEn: defaultTargeting(input, "en"),
        targetAudienceCs: input.targetAudience.trim(),
        targetAudienceEn: input.targetAudience.trim(),
        missingCs,
        missingEn,
        status,
        statusLabelCs: statusLabelForInput(input, "cs"),
        statusLabelEn: statusLabelForInput(input, "en"),
        workflowStatus: workflowForInput(input),
        version: nextVersion,
        reviewRequestedAt: missingCs.length === 0 ? new Date() : null,
        approvedAt: null,
        publishedAt: versionBumpNeeded ? null : existing.publishedAt,
        lockedAt: null,
        statusNoteCs:
          missingCs.length === 0
            ? versionBumpNeeded
              ? `Upravena publikovaná reklama. Vznikla verze ${nextVersion} a čeká na kontrolu.`
              : "Změny jsou uložené a záznam čeká na kontrolu."
            : "Záznam čeká na doplnění povinných údajů.",
        statusNoteEn:
          missingEn.length === 0
            ? versionBumpNeeded
              ? `Published ad edited. Version ${nextVersion} was created and is waiting for review.`
              : "Changes are saved and the record is waiting for review."
            : "The record is waiting for required data.",
      },
      include: {
        orgUnit: true,
        campaign: true,
        tenant: true,
        assets: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: context.membership.tenantId,
        adId: updated.id,
        actor: context.membership.user.email,
        actorUserId: context.membership.userId,
        action: versionBumpNeeded ? "create_new_version" : "update_ad",
        messageCs: versionBumpNeeded ? `Upravena publikovaná reklama ${updated.code}, verze ${updated.version}.` : `Upravena reklama ${updated.code}.`,
        messageEn: versionBumpNeeded ? `Edited published ad ${updated.code}, version ${updated.version}.` : `Updated ad ${updated.code}.`,
      },
    });

    if (missingCs.length === 0) {
      await tx.approval.create({
        data: {
          tenantId: context.membership.tenantId,
          adId: updated.id,
          actor: context.membership.user.email,
          status: ApprovalStatus.REQUESTED,
          noteCs: "Záznam byl uložen a předán ke kontrole.",
          noteEn: "Record was saved and submitted for review.",
        },
      });
    }

    return updated;
  });

  return mapAd(ad, locale);
}

export async function getAppAdRecord(userId: string, code: string, locale: Locale) {
  const context = await getAppAccessContext(userId);

  if (!context) {
    return null;
  }

  const ad = await prisma.ad.findUnique({
    where: {
      tenantId_code: {
        tenantId: context.membership.tenantId,
        code,
      },
    },
    include: {
      orgUnit: true,
      campaign: true,
      tenant: true,
      assets: {
        orderBy: {
          createdAt: "desc",
        },
      },
      approvals: {
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      },
    },
  });

  if (!ad || (!context.tenantWideRole && ad.orgUnitId !== context.membership.orgUnitId)) {
    return null;
  }

  return mapAd(ad, locale);
}

export async function prepareAppAuditExport(userId: string, code: string) {
  const context = await getAppAccessContext(userId);

  if (!context) {
    return false;
  }

  const ad = await prisma.ad.findUnique({
    where: {
      tenantId_code: {
        tenantId: context.membership.tenantId,
        code,
      },
    },
  });

  if (!ad || (!context.tenantWideRole && ad.orgUnitId !== context.membership.orgUnitId)) {
    return false;
  }

  await prisma.auditLog.create({
    data: {
      tenantId: context.membership.tenantId,
      adId: ad.id,
      actor: context.membership.user.email,
      actorUserId: context.membership.userId,
      action: "prepare_audit_export",
      messageCs: `Připraven auditní export pro reklamu ${ad.code}.`,
      messageEn: `Audit export prepared for ad ${ad.code}.`,
    },
  });

  return true;
}

export async function getAppAuditPackage(userId: string, code: string, locale: Locale) {
  const context = await getAppAccessContext(userId);

  if (!context) {
    return null;
  }

  const ad = await prisma.ad.findUnique({
    where: {
      tenantId_code: {
        tenantId: context.membership.tenantId,
        code,
      },
    },
    include: {
      orgUnit: true,
      campaign: true,
      tenant: true,
      auditLogs: {
        orderBy: {
          createdAt: "asc",
        },
      },
      versions: {
        orderBy: {
          version: "asc",
        },
      },
      approvals: {
        orderBy: {
          createdAt: "asc",
        },
      },
      assets: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!ad || (!context.tenantWideRole && ad.orgUnitId !== context.membership.orgUnitId)) {
    return null;
  }

  const typedAd = ad as AuditPackageAd;

  return {
    exportedAt: new Date().toISOString(),
    tenant: {
      id: context.membership.tenant.id,
      slug: context.membership.tenant.slug,
      name: locale === "cs" ? context.membership.tenant.nameCs : context.membership.tenant.nameEn,
    },
    campaign: {
      id: typedAd.campaign.id,
      slug: typedAd.campaign.slug,
      name: locale === "cs" ? typedAd.campaign.nameCs : typedAd.campaign.nameEn,
      election: typedAd.campaign.election,
      startsAt: typedAd.campaign.startsAt.toISOString(),
      endsAt: typedAd.campaign.endsAt.toISOString(),
    },
    ad: mapAd(typedAd, locale),
    notice: {
      publicUrl: `${publicAppUrl()}/ad/${typedAd.publicToken}`,
      lastUpdated: typedAd.updatedAt.toISOString(),
      missing: locale === "cs" ? typedAd.missingCs : typedAd.missingEn,
      workflowStatus: typedAd.workflowStatus,
      version: typedAd.version,
      lockedAt: typedAd.lockedAt?.toISOString() ?? null,
    },
    versions: typedAd.versions.map((version) => ({
      version: version.version,
      reason: version.reason,
      createdAt: version.createdAt.toISOString(),
      snapshot: version.snapshot,
    })),
    approvals: typedAd.approvals.map((approval) => ({
      actor: approval.actor,
      status: approval.status,
      note: locale === "cs" ? approval.noteCs : approval.noteEn,
      createdAt: approval.createdAt.toISOString(),
    })),
    assets: typedAd.assets.map((asset) => ({
      id: asset.id,
      fileName: asset.fileName,
      originalName: asset.originalName,
      contentType: asset.contentType,
      byteSize: asset.byteSize,
      checksumSha256: asset.checksumSha256,
      storageProvider: asset.storageProvider,
      storageBucket: asset.storageBucket,
      storageKey: asset.storageKey,
      uploadedBy: asset.uploadedBy,
      createdAt: asset.createdAt.toISOString(),
    })),
    auditLogs: typedAd.auditLogs.map((log) => ({
      id: log.id,
      actor: log.actor,
      action: log.action,
      message: locale === "cs" ? log.messageCs : log.messageEn,
      createdAt: log.createdAt.toISOString(),
    })),
  };
}

type StoredAdAssetInput = {
  bucket: string;
  key: string;
  publicUrl: string;
  fileName: string;
  originalName: string;
  contentType: string;
  byteSize: number;
  checksumSha256: string;
};

export async function getAppAdUploadTarget(userId: string, code: string) {
  const context = await getAppAccessContext(userId);

  if (!context || !canUploadAppAssets(context.membership.role)) {
    return null;
  }

  const ad = await prisma.ad.findUnique({
    where: {
      tenantId_code: {
        tenantId: context.membership.tenantId,
        code,
      },
    },
  });

  if (!ad || (!context.tenantWideRole && ad.orgUnitId !== context.membership.orgUnitId)) {
    return null;
  }

  return {
    tenantId: context.membership.tenantId,
    tenantSlug: context.membership.tenant.slug,
    adId: ad.id,
    adCode: ad.code,
    userId: context.membership.userId,
    userEmail: context.membership.user.email,
  };
}

export async function attachAppAdAsset(userId: string, code: string, input: StoredAdAssetInput, locale: Locale) {
  const target = await getAppAdUploadTarget(userId, code);

  if (!target) {
    return null;
  }

  const ad = await prisma.$transaction(async (tx) => {
    await tx.adAsset.create({
      data: {
        tenantId: target.tenantId,
        adId: target.adId,
        fileName: input.fileName,
        originalName: input.originalName,
        contentType: input.contentType,
        byteSize: input.byteSize,
        storageBucket: input.bucket,
        storageKey: input.key,
        publicUrl: input.publicUrl,
        checksumSha256: input.checksumSha256,
        uploadedBy: target.userEmail,
        uploadedByUserId: target.userId,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: target.tenantId,
        adId: target.adId,
        actor: target.userEmail,
        actorUserId: target.userId,
        action: "upload_ad_asset",
        messageCs: `Nahrán soubor ${input.originalName} k reklamě ${target.adCode}.`,
        messageEn: `Uploaded file ${input.originalName} for ad ${target.adCode}.`,
        metadata: {
          fileName: input.fileName,
          originalName: input.originalName,
          contentType: input.contentType,
          byteSize: input.byteSize,
          storageKey: input.key,
          checksumSha256: input.checksumSha256,
        },
      },
    });

    return tx.ad.findUniqueOrThrow({
      where: {
        id: target.adId,
      },
      include: {
        orgUnit: true,
        campaign: true,
        tenant: true,
        assets: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
  });

  return mapAd(ad, locale);
}

export async function getAppAdAssetDownload(userId: string, code: string, assetId: string) {
  const context = await getAppAccessContext(userId);

  if (!context) {
    return null;
  }

  const asset = await prisma.adAsset.findUnique({
    where: {
      id: assetId,
    },
    include: {
      ad: true,
    },
  });

  if (
    !asset ||
    asset.tenantId !== context.membership.tenantId ||
    asset.ad.code !== code ||
    (!context.tenantWideRole && asset.ad.orgUnitId !== context.membership.orgUnitId)
  ) {
    return null;
  }

  return {
    id: asset.id,
    fileName: asset.fileName,
    originalName: asset.originalName,
    contentType: asset.contentType,
    byteSize: asset.byteSize,
    storageBucket: asset.storageBucket,
    storageKey: asset.storageKey,
  };
}

export async function approveAppAd(userId: string, code: string, locale: Locale) {
  const context = await getAppAccessContext(userId);

  if (!context || !canApproveAppAds(context.membership.role)) {
    return null;
  }

  const ad = await prisma.ad.findUnique({
    where: {
      tenantId_code: {
        tenantId: context.membership.tenantId,
        code,
      },
    },
  });

  if (!ad || (!context.tenantWideRole && ad.orgUnitId !== context.membership.orgUnitId)) {
    return null;
  }

  const missing = missingForAd(ad, "cs");

  if (missing.length > 0) {
    throw new Error("Required data is missing.");
  }

  if (ad.workflowStatus === AdWorkflowStatus.PUBLISHED || ad.workflowStatus === AdWorkflowStatus.ARCHIVED) {
    throw new Error("Ad is already locked.");
  }

  if (ad.workflowStatus !== AdWorkflowStatus.READY_FOR_REVIEW) {
    throw new Error("Ad is not waiting for review.");
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const approved = await tx.ad.update({
      where: {
        tenantId_code: {
          tenantId: context.membership.tenantId,
          code,
        },
      },
      data: {
        status: AdStatus.READY,
        statusLabelCs: "Schváleno",
        statusLabelEn: "Approved",
        workflowStatus: AdWorkflowStatus.APPROVED,
        approvedAt: now,
        reviewerName: context.membership.user.name,
        statusNoteCs: "Záznam byl schválen a čeká na publikaci.",
        statusNoteEn: "Record was approved and is waiting for publication.",
      },
      include: {
        orgUnit: true,
        campaign: true,
        tenant: true,
        assets: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    await tx.approval.create({
      data: {
        tenantId: context.membership.tenantId,
        adId: ad.id,
        actor: context.membership.user.email,
        status: ApprovalStatus.APPROVED,
        noteCs: "Reklama schválena v pracovní aplikaci.",
        noteEn: "Ad approved in the workspace.",
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: context.membership.tenantId,
        adId: ad.id,
        actor: context.membership.user.email,
        actorUserId: context.membership.userId,
        action: "approve_ad",
        messageCs: `Schválena reklama ${ad.code}.`,
        messageEn: `Approved ad ${ad.code}.`,
      },
    });

    return tx.ad.findUniqueOrThrow({
      where: {
        id: approved.id,
      },
      include: {
        orgUnit: true,
        campaign: true,
        tenant: true,
        assets: {
          orderBy: {
            createdAt: "desc",
          },
        },
        approvals: {
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        },
      },
    });
  });

  return mapAd(updated, locale);
}

export async function requestAppAdChanges(userId: string, code: string, input: ReviewDecisionInput, locale: Locale) {
  const context = await getAppAccessContext(userId);

  if (!context || !canApproveAppAds(context.membership.role)) {
    return null;
  }

  const ad = await prisma.ad.findUnique({
    where: {
      tenantId_code: {
        tenantId: context.membership.tenantId,
        code,
      },
    },
  });

  if (!ad || (!context.tenantWideRole && ad.orgUnitId !== context.membership.orgUnitId)) {
    return null;
  }

  if (ad.workflowStatus === AdWorkflowStatus.PUBLISHED || ad.workflowStatus === AdWorkflowStatus.ARCHIVED) {
    throw new Error("Published or archived ads cannot be returned for changes.");
  }

  if (ad.workflowStatus !== AdWorkflowStatus.READY_FOR_REVIEW && ad.workflowStatus !== AdWorkflowStatus.APPROVED) {
    throw new Error("Ad is not in review.");
  }

  const note = input.note.trim();
  const updated = await prisma.$transaction(async (tx) => {
    const returned = await tx.ad.update({
      where: {
        tenantId_code: {
          tenantId: context.membership.tenantId,
          code,
        },
      },
      data: {
        status: AdStatus.WARNING,
        statusLabelCs: "Vráceno",
        statusLabelEn: "Changes requested",
        workflowStatus: AdWorkflowStatus.NEEDS_DATA,
        approvedAt: null,
        reviewerName: context.membership.user.name,
        statusNoteCs: `Vráceno k doplnění: ${note}`,
        statusNoteEn: `Returned for changes: ${note}`,
      },
      include: {
        orgUnit: true,
        campaign: true,
        tenant: true,
        assets: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    await tx.approval.create({
      data: {
        tenantId: context.membership.tenantId,
        adId: ad.id,
        actor: context.membership.user.email,
        status: ApprovalStatus.CHANGES_REQUESTED,
        noteCs: note,
        noteEn: note,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: context.membership.tenantId,
        adId: ad.id,
        actor: context.membership.user.email,
        actorUserId: context.membership.userId,
        action: "request_ad_changes",
        messageCs: `Reklama ${ad.code} vrácena k doplnění: ${note}`,
        messageEn: `Ad ${ad.code} returned for changes: ${note}`,
      },
    });

    return tx.ad.findUniqueOrThrow({
      where: {
        id: returned.id,
      },
      include: {
        orgUnit: true,
        campaign: true,
        tenant: true,
        assets: {
          orderBy: {
            createdAt: "desc",
          },
        },
        approvals: {
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        },
      },
    });
  });

  return mapAd(updated, locale);
}

export async function publishAppAd(userId: string, code: string, locale: Locale) {
  const context = await getAppAccessContext(userId);

  if (!context || !canPublishAppAds(context.membership.role)) {
    return null;
  }

  const ad = await prisma.ad.findUnique({
    where: {
      tenantId_code: {
        tenantId: context.membership.tenantId,
        code,
      },
    },
  });

  if (!ad || (!context.tenantWideRole && ad.orgUnitId !== context.membership.orgUnitId)) {
    return null;
  }

  const missing = missingForAd(ad, "cs");

  if (missing.length > 0) {
    throw new Error("Required data is missing.");
  }

  if (ad.workflowStatus === AdWorkflowStatus.PUBLISHED || ad.workflowStatus === AdWorkflowStatus.ARCHIVED) {
    throw new Error("Ad is already locked.");
  }

  if (ad.workflowStatus !== AdWorkflowStatus.APPROVED) {
    throw new Error("Ad must be approved before publication.");
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const published = await tx.ad.update({
      where: {
        tenantId_code: {
          tenantId: context.membership.tenantId,
          code,
        },
      },
      data: {
        status: AdStatus.READY,
        statusLabelCs: "Publikováno",
        statusLabelEn: "Published",
        workflowStatus: AdWorkflowStatus.PUBLISHED,
        approvedAt: ad.approvedAt ?? now,
        publishedAt: now,
        lockedAt: now,
        reviewerName: context.membership.user.name,
        statusNoteCs: `Verze ${ad.version} je publikovaná a uzamčená.`,
        statusNoteEn: `Version ${ad.version} is published and locked.`,
      },
      include: {
        orgUnit: true,
        campaign: true,
        tenant: true,
        assets: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    await tx.approval.create({
      data: {
        tenantId: context.membership.tenantId,
        adId: ad.id,
        actor: context.membership.user.email,
        status: ApprovalStatus.PUBLISHED,
        noteCs: "Reklama publikována v pracovní aplikaci.",
        noteEn: "Ad published in the workspace.",
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: context.membership.tenantId,
        adId: ad.id,
        actor: context.membership.user.email,
        actorUserId: context.membership.userId,
        action: "publish_ad",
        messageCs: `Publikována reklama ${ad.code}.`,
        messageEn: `Published ad ${ad.code}.`,
      },
    });

    return tx.ad.findUniqueOrThrow({
      where: {
        id: published.id,
      },
      include: {
        orgUnit: true,
        campaign: true,
        tenant: true,
        assets: {
          orderBy: {
            createdAt: "desc",
          },
        },
        approvals: {
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        },
      },
    });
  });

  return mapAd(updated, locale);
}
