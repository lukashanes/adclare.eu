import {
  AdStatus,
  AdWorkflowStatus,
  type Ad,
  type Candidate,
  type Campaign,
  type OrganizationUnit,
  type Prisma,
  type Tenant,
} from "@/generated/prisma/client";
import { publicAppUrl } from "@/lib/instance-config";
import { prisma } from "@/lib/prisma";
import type {
  AdChannel,
  AdRecord,
  Locale,
  PublicRepositoryAdRecord,
  PublicRepositoryFilters,
  PublicRepositoryOption,
  PublicRepositoryPayload,
  Status,
} from "@/lib/workspace-types";

const publicWorkflowStatuses: AdWorkflowStatus[] = [AdWorkflowStatus.PUBLISHED, AdWorkflowStatus.ARCHIVED];

type AdWithPublicRelations = Ad & {
  orgUnit: OrganizationUnit;
  campaign: Campaign;
  candidate?: Candidate | null;
  tenant?: Tenant;
};

type RepositoryPaginationInput = {
  cursor?: string;
  limit?: string | number;
};

const statusMap: Record<AdStatus, Status> = {
  READY: "ready",
  WARNING: "warning",
  BLOCKED: "blocked",
  REVIEW: "review",
};

const publicStatusFilterMap: Record<Status, AdStatus> = {
  ready: AdStatus.READY,
  warning: AdStatus.WARNING,
  blocked: AdStatus.BLOCKED,
  review: AdStatus.REVIEW,
};

function formatDate(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "cs" ? "cs-CZ" : "en-GB", {
    day: "numeric",
    month: locale === "cs" ? "numeric" : "short",
    year: "numeric",
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

function normalizeChannel(value: string): AdChannel {
  return value === "online" ? "online" : "offline";
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

function statusLabel(status: AdStatus, locale: Locale) {
  const labels: Record<AdStatus, Record<Locale, string>> = {
    READY: { cs: "Připraveno", en: "Ready" },
    WARNING: { cs: "Doplnit", en: "Complete" },
    BLOCKED: { cs: "Červená", en: "Red" },
    REVIEW: { cs: "Kontrola", en: "Review" },
  };

  return labels[status][locale];
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

  if (ad.workflowStatus === AdWorkflowStatus.NEEDS_DATA || missing.length > 0) {
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

function publicMissingForAd(ad: Ad, locale: Locale) {
  return locale === "cs" ? ad.missingCs : ad.missingEn;
}

function mapPublicAd(ad: AdWithPublicRelations, locale: Locale): AdRecord {
  const isCs = locale === "cs";
  const missing = publicMissingForAd(ad, locale);
  const status = statusForAd(ad, missing);
  const workflowStatus = workflowStatusForAd(ad, missing);
  const publicUrl = `${publicAppUrl()}/ad/${ad.publicToken}`;

  return {
    id: ad.code,
    publicUrl,
    title: isCs ? ad.titleCs : ad.titleEn,
    tenantSlug: ad.tenant?.slug ?? "",
    campaignId: ad.campaign.id,
    campaign: isCs ? ad.campaign.nameCs : ad.campaign.nameEn,
    campaignSlug: ad.campaign.slug,
    campaignTags: ad.campaign.tags,
    candidateId: ad.candidateId ?? "",
    candidate: ad.candidate ? (isCs ? ad.candidate.nameCs : ad.candidate.nameEn) : "",
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
    deadlineState: deadlineState(ad, missing),
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
    canRequestReview: false,
    canApprove: false,
    canPublish: false,
    canRequestChanges: false,
    canDownloadQr: missing.length === 0 && workflowStatus !== AdWorkflowStatus.ARCHIVED && workflowStatus !== AdWorkflowStatus.NEEDS_DATA,
    assetCount: 0,
    assets: [],
    reviewEvents: [],
  };
}

function mapRepositoryAd(ad: AdWithPublicRelations, locale: Locale): PublicRepositoryAdRecord {
  return {
    ...mapPublicAd(ad, locale),
    campaign: locale === "cs" ? ad.campaign.nameCs : ad.campaign.nameEn,
    campaignSlug: ad.campaign.slug,
    election: ad.campaign.election,
    lastUpdated: formatDate(ad.updatedAt, locale),
  };
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

function repositoryPageLimit(input: RepositoryPaginationInput) {
  const configured = Number(input.limit || 100);

  if (!Number.isFinite(configured) || configured <= 0) {
    return 100;
  }

  return Math.min(250, Math.max(20, Math.round(configured)));
}

function textContains(value: string) {
  return {
    contains: value,
    mode: "insensitive" as const,
  };
}

function repositoryCursor(cursor: string | undefined) {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      publicationDate?: string;
      code?: string;
    };
    const publicationDate = new Date(parsed.publicationDate || "");
    const code = parsed.code?.trim() || "";

    if (!code || Number.isNaN(publicationDate.getTime())) {
      return null;
    }

    return { publicationDate, code };
  } catch {
    return null;
  }
}

function encodeRepositoryCursor(ad: Pick<Ad, "publicationDate" | "code">) {
  return Buffer.from(
    JSON.stringify({
      publicationDate: ad.publicationDate.toISOString(),
      code: ad.code,
    }),
    "utf8",
  ).toString("base64url");
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

function repositoryAdWhere(tenantId: string, filters: PublicRepositoryFilters, pagination: RepositoryPaginationInput = {}): Prisma.AdWhereInput {
  const and: Prisma.AdWhereInput[] = [
    {
      tenantId,
      workflowStatus: {
        in: publicWorkflowStatuses,
      },
    },
  ];

  if (filters.channel !== "all") {
    and.push({ channel: filters.channel });
  }

  if (filters.status !== "all") {
    and.push({ status: publicStatusFilterMap[filters.status] });
  }

  if (filters.type !== "all") {
    and.push({
      OR: [{ mediaTypeCs: filters.type }, { mediaTypeEn: filters.type }],
    });
  }

  if (filters.branch !== "all") {
    and.push({
      orgUnit: {
        is: {
          OR: [{ slug: slugify(filters.branch) }, { nameCs: filters.branch }, { nameEn: filters.branch }],
        },
      },
    });
  }

  if (filters.campaign !== "all") {
    and.push({
      campaign: {
        is: {
          slug: filters.campaign,
        },
      },
    });
  }

  if (filters.q) {
    const contains = textContains(filters.q);

    and.push({
      OR: [
        { code: contains },
        { titleCs: contains },
        { titleEn: contains },
        { ownerCs: contains },
        { ownerEn: contains },
        { mediaTypeCs: contains },
        { mediaTypeEn: contains },
        { distributionAreaCs: contains },
        { distributionAreaEn: contains },
        { payerCs: contains },
        { payerEn: contains },
        { supplierCs: contains },
        { supplierEn: contains },
        { fundingSourceCs: contains },
        { fundingSourceEn: contains },
        { targetingCs: contains },
        { targetingEn: contains },
        { targetAudienceCs: contains },
        { targetAudienceEn: contains },
        {
          orgUnit: {
            is: {
              OR: [{ nameCs: contains }, { nameEn: contains }, { slug: contains }],
            },
          },
        },
        {
          campaign: {
            is: {
              OR: [{ nameCs: contains }, { nameEn: contains }, { slug: contains }, { election: contains }],
            },
          },
        },
        {
          candidate: {
            is: {
              OR: [{ nameCs: contains }, { nameEn: contains }, { slug: contains }],
            },
          },
        },
      ],
    });
  }

  const cursor = repositoryCursor(pagination.cursor);

  if (cursor) {
    and.push({
      OR: [
        {
          publicationDate: {
            lt: cursor.publicationDate,
          },
        },
        {
          publicationDate: cursor.publicationDate,
          code: {
            gt: cursor.code,
          },
        },
      ],
    });
  }

  return {
    AND: and,
  };
}

function publicRepositoryBaseWhere(tenantId: string): Prisma.AdWhereInput {
  return {
    tenantId,
    workflowStatus: {
      in: publicWorkflowStatuses,
    },
  };
}

export async function getTransparencyNotice(publicToken: string, locale: Locale) {
  const ad = await prisma.ad.findUnique({
    where: {
      publicToken,
    },
    include: {
      orgUnit: true,
      campaign: true,
      candidate: true,
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
    ad: mapPublicAd(ad, locale),
    lastUpdated: formatDate(ad.updatedAt, locale),
    publicUrl,
  };
}

export async function getPublicRepositoryPayload(
  requestedTenantSlug: string,
  locale: Locale,
  inputFilters: Partial<PublicRepositoryFilters> = {},
  inputPagination: RepositoryPaginationInput = {},
): Promise<PublicRepositoryPayload | null> {
  const tenant = await prisma.tenant.findUnique({
    where: {
      slug: requestedTenantSlug,
    },
  });

  if (!tenant?.publicRepositoryEnabled) {
    return null;
  }

  const filters = normalizeRepositoryFilters(inputFilters);
  const limit = repositoryPageLimit(inputPagination);
  const baseWhere = publicRepositoryBaseWhere(tenant.id);
  const filteredWhere = repositoryAdWhere(tenant.id, filters);
  const pagedWhere = repositoryAdWhere(tenant.id, filters, inputPagination);
  const [totalCount, filteredCount, optionAds, pagedAds] = await Promise.all([
    prisma.ad.count({
      where: baseWhere,
    }),
    prisma.ad.count({
      where: filteredWhere,
    }),
    prisma.ad.findMany({
      where: baseWhere,
      select: {
        mediaTypeCs: true,
        mediaTypeEn: true,
        orgUnit: {
          select: {
            nameCs: true,
            nameEn: true,
          },
        },
        campaign: {
          select: {
            slug: true,
            nameCs: true,
            nameEn: true,
          },
        },
      },
      orderBy: [{ publicationDate: "desc" }, { code: "asc" }],
    }),
    prisma.ad.findMany({
      where: pagedWhere,
      include: {
        orgUnit: true,
        campaign: true,
        candidate: true,
        tenant: true,
      },
      orderBy: [{ publicationDate: "desc" }, { code: "asc" }],
      take: limit + 1,
    }),
  ]);

  const hasMore = pagedAds.length > limit;
  const visibleAds = pagedAds.slice(0, limit);
  const lastVisibleAd = visibleAds.at(-1);
  const mappedAds = visibleAds.map((ad) => mapRepositoryAd(ad, locale));

  return {
    tenant: {
      name: locale === "cs" ? tenant.nameCs : tenant.nameEn,
      slug: tenant.slug,
    },
    ads: mappedAds,
    totalCount,
    filteredCount,
    pageInfo: {
      limit,
      hasMore,
      nextCursor: hasMore && lastVisibleAd ? encodeRepositoryCursor(lastVisibleAd) : "",
    },
    filters,
    options: {
      channels: publicChannelOptions(locale),
      statuses: publicStatusOptions(locale),
      types: uniqueOptions(optionAds.map((ad) => (locale === "cs" ? ad.mediaTypeCs : ad.mediaTypeEn)), locale === "cs" ? "Všechny typy" : "All types"),
      branches: uniqueOptions(optionAds.map((ad) => (locale === "cs" ? ad.orgUnit.nameCs : ad.orgUnit.nameEn)), locale === "cs" ? "Všechny pobočky" : "All branches"),
      campaigns: [
        { value: "all", label: locale === "cs" ? "Všechny kampaně" : "All campaigns" },
        ...uniqueOptions(
          optionAds.map((ad) => `${ad.campaign.slug}::${locale === "cs" ? ad.campaign.nameCs : ad.campaign.nameEn}`),
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
