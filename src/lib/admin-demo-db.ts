import { randomBytes } from "node:crypto";
import {
  AdStatus,
  BillingInterval,
  BillingMethod,
  BillingPlan,
  BillingStatus,
  type AuditLog,
  InvitationStatus,
  MembershipStatus,
  UserRole,
  type Ad,
  type BillingAccount,
  type Campaign,
  type Invitation,
  type OrganizationUnit,
  type Tenant,
  type TenantMembership,
  type User,
} from "@prisma/client";
import type {
  AdRecord,
  AdChannel,
  AdminAdsPayload,
  AdminBillingPayload,
  AdminInvitationRecord,
  AdminMemberRecord,
  AdminRoleKey,
  AdminUsersPayload,
  EditableBillingInput,
  EditableAdInput,
  InvitationNotice,
  InviteInput,
  Locale,
  PublicRepositoryAdRecord,
  PublicRepositoryFilters,
  PublicRepositoryOption,
  PublicRepositoryPayload,
  Status,
} from "@/lib/admin-demo-types";
import { prisma } from "@/lib/prisma";

const tenantSlug = "demo-party";
const campaignSlug = "municipal-2026";

type AdWithUnit = Ad & {
  orgUnit: OrganizationUnit;
};
type AdWithRepositoryRelations = AdWithUnit & {
  campaign: Campaign;
};
type MembershipWithUserAndUnit = TenantMembership & {
  user: User;
  orgUnit: OrganizationUnit | null;
};
type InvitationWithUnit = Invitation & {
  orgUnit: OrganizationUnit | null;
};
type AuditPackageAd = AdWithUnit & {
  auditLogs: AuditLog[];
};

type BillingAccountWithTenant = BillingAccount & {
  tenant: Tenant;
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
  const missing = missingForAd(ad, locale);
  const status = statusForAd(ad, missing);

  return {
    id: ad.code,
    publicUrl: `${appUrl()}/ad/${ad.publicToken}`,
    title: isCs ? ad.titleCs : ad.titleEn,
    branch: isCs ? ad.orgUnit.nameCs : ad.orgUnit.nameEn,
    owner: isCs ? ad.ownerCs : ad.ownerEn,
    type: isCs ? ad.mediaTypeCs : ad.mediaTypeEn,
    channel: normalizeChannel(ad.channel),
    publicationDate: formatDate(ad.publicationDate, locale),
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

function billingPlanLabel(plan: BillingPlan, locale: Locale) {
  const labels: Record<BillingPlan, Record<Locale, string>> = {
    SMALL_PARTY: { cs: "Malá strana", en: "Small party" },
    LARGE_PARTY: { cs: "Velká strana", en: "Large party" },
    CUSTOM: { cs: "Custom řešení", en: "Custom solution" },
  };

  return labels[plan][locale];
}

function billingIntervalLabel(interval: BillingInterval, locale: Locale) {
  const labels: Record<BillingInterval, Record<Locale, string>> = {
    MONTHLY: { cs: "měsíčně", en: "monthly" },
    YEARLY: { cs: "ročně", en: "yearly" },
  };

  return labels[interval][locale];
}

function billingMethodLabel(method: BillingMethod, locale: Locale) {
  const labels: Record<BillingMethod, Record<Locale, string>> = {
    STRIPE: { cs: "Stripe", en: "Stripe" },
    INVOICE: { cs: "faktura", en: "invoice" },
  };

  return labels[method][locale];
}

function billingStatusLabel(status: BillingStatus, locale: Locale) {
  const labels: Record<BillingStatus, Record<Locale, string>> = {
    TRIAL: { cs: "trial", en: "trial" },
    ACTIVE: { cs: "aktivní", en: "active" },
    PENDING_INVOICE_APPROVAL: { cs: "čeká na schválení faktury", en: "pending invoice approval" },
    PAST_DUE: { cs: "po splatnosti", en: "past due" },
    PAUSED: { cs: "pozastaveno", en: "paused" },
    CANCELLED: { cs: "zrušeno", en: "cancelled" },
  };

  return labels[status][locale];
}

function formatOptionalDate(date: Date | null, locale: Locale) {
  return date ? formatDate(date, locale) : "";
}

function hasStripeConfig() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

function effectiveBillingPrice(account: BillingAccount, locale: Locale) {
  const amount = account.interval === BillingInterval.YEARLY ? account.yearlyPriceEur : account.monthlyPriceEur;
  const suffix = account.interval === BillingInterval.YEARLY ? (locale === "cs" ? " / rok" : " / year") : (locale === "cs" ? " / měsíc" : " / month");

  return `${amount} EUR${suffix}`;
}

function mapBillingAccount(account: BillingAccountWithTenant, locale: Locale): AdminBillingPayload {
  return {
    tenant: {
      name: locale === "cs" ? account.tenant.nameCs : account.tenant.nameEn,
      slug: account.tenant.slug,
    },
    billing: {
      plan: account.plan,
      planLabel: billingPlanLabel(account.plan, locale),
      interval: account.interval,
      intervalLabel: billingIntervalLabel(account.interval, locale),
      method: account.method,
      methodLabel: billingMethodLabel(account.method, locale),
      status: account.status,
      statusLabel: billingStatusLabel(account.status, locale),
      discountPercent: account.discountPercent,
      monthlyPriceEur: account.monthlyPriceEur,
      yearlyPriceEur: account.yearlyPriceEur,
      effectivePrice: effectiveBillingPrice(account, locale),
      invoiceEmail: account.invoiceEmail,
      invoiceApprovedAt: formatOptionalDate(account.invoiceApprovedAt, locale),
      currentPeriodEndsAt: formatOptionalDate(account.currentPeriodEndsAt, locale),
      trialEndsAt: formatOptionalDate(account.trialEndsAt, locale),
      stripeCustomerId: account.stripeCustomerId,
      stripeSubscriptionId: account.stripeSubscriptionId,
      stripeConfigured: hasStripeConfig(),
      note: locale === "cs" ? account.noteCs : account.noteEn,
    },
  };
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

function normalizeChannel(value: string): AdChannel {
  return value === "online" ? "online" : "offline";
}

function isBlank(value: string | null | undefined) {
  return !value?.trim();
}

function requiresTargetingDetails(input: Pick<EditableAdInput, "isTargeted" | "targeting" | "targetAudience">) {
  const targeting = input.targeting.trim().toLowerCase();

  return input.isTargeted || (targeting !== "" && targeting !== "nepoužito" && targeting !== "not used");
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

  return statusForMissing(missing, ad.publicationDate);
}

function statusForInput(input: EditableAdInput) {
  return statusForMissing(requiredMissing(input, "cs"), parsePublicationDate(input.publicationDate));
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

export async function getPublicRepositoryPayload(
  requestedTenantSlug: string,
  locale: Locale,
  inputFilters: Partial<PublicRepositoryFilters> = {},
): Promise<PublicRepositoryPayload | null> {
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
    },
    include: {
      orgUnit: true,
      campaign: true,
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

function normalizeBillingPlan(value: string): BillingPlan {
  return value === BillingPlan.SMALL_PARTY || value === BillingPlan.CUSTOM ? value : BillingPlan.LARGE_PARTY;
}

function normalizeBillingInterval(value: string): BillingInterval {
  return value === BillingInterval.MONTHLY ? BillingInterval.MONTHLY : BillingInterval.YEARLY;
}

function normalizeBillingMethod(value: string): BillingMethod {
  return value === BillingMethod.INVOICE ? BillingMethod.INVOICE : BillingMethod.STRIPE;
}

function normalizeBillingStatus(value: string): BillingStatus {
  const allowed = new Set<BillingStatus>([
    BillingStatus.TRIAL,
    BillingStatus.ACTIVE,
    BillingStatus.PENDING_INVOICE_APPROVAL,
    BillingStatus.PAST_DUE,
    BillingStatus.PAUSED,
    BillingStatus.CANCELLED,
  ]);

  return allowed.has(value as BillingStatus) ? (value as BillingStatus) : BillingStatus.ACTIVE;
}

function clampDiscount(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

function positivePrice(value: number, fallback: number) {
  if (!Number.isFinite(value) || value < 0) {
    return fallback;
  }

  return Math.round(value);
}

async function ensureDemoBillingAccount() {
  const { tenant } = await getDemoTenantAndCampaign();

  return prisma.billingAccount.upsert({
    where: {
      tenantId: tenant.id,
    },
    update: {},
    create: {
      tenantId: tenant.id,
      plan: BillingPlan.LARGE_PARTY,
      interval: BillingInterval.YEARLY,
      method: BillingMethod.STRIPE,
      status: BillingStatus.ACTIVE,
      discountPercent: 50,
      monthlyPriceEur: 99,
      yearlyPriceEur: 999,
      invoiceEmail: "billing@demo-strana.cz",
      currentPeriodEndsAt: new Date("2027-05-26T00:00:00.000Z"),
      noteCs: "Akční cena pro velkou stranu. Fakturační režim lze přepnout na ruční schválení.",
      noteEn: "Promotional large party price. Billing can be switched to manual invoice approval.",
    },
    include: {
      tenant: true,
    },
  });
}

export async function getDemoBillingPayload(locale: Locale) {
  const billingAccount = await ensureDemoBillingAccount();

  return mapBillingAccount(billingAccount, locale);
}

export async function updateDemoBillingAccount(input: EditableBillingInput, locale: Locale) {
  const { tenant } = await getDemoTenantAndCampaign();
  const method = normalizeBillingMethod(input.method);
  const status = normalizeBillingStatus(input.status);
  const invoiceApprovedAt =
    method === BillingMethod.INVOICE && status !== BillingStatus.PENDING_INVOICE_APPROVAL ? new Date() : null;

  const billingAccount = await prisma.billingAccount.upsert({
    where: {
      tenantId: tenant.id,
    },
    update: {
      plan: normalizeBillingPlan(input.plan),
      interval: normalizeBillingInterval(input.interval),
      method,
      status,
      discountPercent: clampDiscount(input.discountPercent),
      monthlyPriceEur: positivePrice(input.monthlyPriceEur, 99),
      yearlyPriceEur: positivePrice(input.yearlyPriceEur, 999),
      stripeCustomerId: input.stripeCustomerId.trim(),
      stripeSubscriptionId: input.stripeSubscriptionId.trim(),
      invoiceEmail: normalizeEmail(input.invoiceEmail || "billing@demo-strana.cz"),
      invoiceApprovedAt,
      noteCs: input.note.trim(),
      noteEn: input.note.trim(),
    },
    create: {
      tenantId: tenant.id,
      plan: normalizeBillingPlan(input.plan),
      interval: normalizeBillingInterval(input.interval),
      method,
      status,
      discountPercent: clampDiscount(input.discountPercent),
      monthlyPriceEur: positivePrice(input.monthlyPriceEur, 99),
      yearlyPriceEur: positivePrice(input.yearlyPriceEur, 999),
      stripeCustomerId: input.stripeCustomerId.trim(),
      stripeSubscriptionId: input.stripeSubscriptionId.trim(),
      invoiceEmail: normalizeEmail(input.invoiceEmail || "billing@demo-strana.cz"),
      invoiceApprovedAt,
      currentPeriodEndsAt: new Date("2027-05-26T00:00:00.000Z"),
      noteCs: input.note.trim(),
      noteEn: input.note.trim(),
    },
    include: {
      tenant: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actor: "demo-admin",
      action: "update_billing",
      messageCs: `Upravena fakturace: ${billingPlanLabel(billingAccount.plan, "cs")}, ${billingMethodLabel(billingAccount.method, "cs")}.`,
      messageEn: `Billing updated: ${billingPlanLabel(billingAccount.plan, "en")}, ${billingMethodLabel(billingAccount.method, "en")}.`,
    },
  });

  return mapBillingAccount(billingAccount, locale);
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
    tenantSlug: tenant.slug,
    campaign: locale === "cs" ? campaign.nameCs : campaign.nameEn,
    election: campaign.election,
    ad: mapAd(ad, locale),
    lastUpdated: formatDate(ad.updatedAt, locale),
    publicUrl: `${appUrl()}/ad/${ad.publicToken}`,
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
      auditLogs: {
        orderBy: {
          createdAt: "asc",
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
      publicUrl: `${appUrl()}/ad/${typedAd.publicToken}`,
      lastUpdated: typedAd.updatedAt.toISOString(),
      missing: locale === "cs" ? typedAd.missingCs : typedAd.missingEn,
    },
    auditLogs: typedAd.auditLogs.map((log) => ({
      id: log.id,
      actor: log.actor,
      action: log.action,
      message: locale === "cs" ? log.messageCs : log.messageEn,
      createdAt: log.createdAt.toISOString(),
    })),
  };
}
