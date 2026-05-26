import { AdStatus, type Ad, type Campaign, type OrganizationUnit, type Tenant } from "@prisma/client";
import type { AdRecord, AdminAdsPayload, EditableAdInput, Locale, Status } from "@/lib/admin-demo-types";
import { prisma } from "@/lib/prisma";

const tenantSlug = "demo-party";
const campaignSlug = "municipal-2026";

type AdWithUnit = Ad & {
  orgUnit: OrganizationUnit;
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
