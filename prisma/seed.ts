import {
  PrismaClient,
  AdStatus,
  AdWorkflowStatus,
  ApprovalStatus,
  MembershipStatus,
  UserRole,
} from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomBytes } from "node:crypto";

function databaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }

  return process.env.DATABASE_URL;
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl() }),
});

const tenantSlug = "demo-party";
const campaignSlug = "municipal-2026";

const units = [
  ["ostrava-jih", "oblast", "Ostrava-Jih", "Ostrava-South"],
  ["brno-stred", "oblast", "Brno-střed", "Brno-centre"],
  ["liberec", "kraj", "Liberec", "Liberec"],
  ["praha-3", "oblast", "Praha 3", "Prague 3"],
  ["plzen", "oblast", "Plzeň", "Pilsen"],
];

const ads = [
  {
    code: "OST-011",
    unitSlug: "ostrava-jih",
    titleCs: "Leták: čisté ulice",
    titleEn: "Leaflet: cleaner streets",
    ownerCs: "Lokální tým Ostrava",
    ownerEn: "Local Ostrava team",
    mediaTypeCs: "tisk",
    mediaTypeEn: "print",
    channel: "offline",
    publicationDate: new Date("2026-09-05T00:00:00.000Z"),
    periodCs: "5. 9. - 20. 9. 2026",
    periodEn: "5 Sep - 20 Sep 2026",
    distributionAreaCs: "Ostrava-Jih",
    distributionAreaEn: "Ostrava-South",
    payerCs: "Demo strana",
    payerEn: "Demo party",
    supplierCs: "",
    supplierEn: "",
    amount: "",
    fundingSourceCs: "",
    fundingSourceEn: "",
    language: "cs",
    isTargeted: false,
    targetingCs: "nepoužito",
    targetingEn: "not used",
    targetAudienceCs: "",
    targetAudienceEn: "",
    missingCs: ["dodavatel", "částka", "původ financí"],
    missingEn: ["supplier", "amount", "funding source"],
    status: AdStatus.WARNING,
    statusLabelCs: "Doplnit",
    statusLabelEn: "Complete",
    workflowStatus: AdWorkflowStatus.NEEDS_DATA,
  },
  {
    code: "BRN-032",
    unitSlug: "brno-stred",
    titleCs: "Video: doprava v centru",
    titleEn: "Video: city transport",
    ownerCs: "Mediální tým Brno",
    ownerEn: "Brno media team",
    mediaTypeCs: "video",
    mediaTypeEn: "video",
    channel: "online",
    publicationDate: new Date("2026-09-14T00:00:00.000Z"),
    periodCs: "14. 9. - 28. 9. 2026",
    periodEn: "14 Sep - 28 Sep 2026",
    distributionAreaCs: "Brno-střed a přilehlé městské části",
    distributionAreaEn: "Brno-centre and nearby districts",
    payerCs: "Demo strana",
    payerEn: "Demo party",
    supplierCs: "Studio Brno Creative",
    supplierEn: "Brno Creative Studio",
    amount: "42 000 Kč",
    fundingSourceCs: "",
    fundingSourceEn: "",
    language: "cs",
    isTargeted: true,
    targetingCs: "věk, lokalita",
    targetingEn: "age, location",
    targetAudienceCs: "",
    targetAudienceEn: "",
    missingCs: ["původ financí", "cílové publikum"],
    missingEn: ["funding source", "target audience"],
    status: AdStatus.WARNING,
    statusLabelCs: "Doplnit",
    statusLabelEn: "Complete",
    workflowStatus: AdWorkflowStatus.NEEDS_DATA,
  },
  {
    code: "LBC-006",
    unitSlug: "liberec",
    titleCs: "Billboard: dostupná energie",
    titleEn: "Billboard: energy costs",
    ownerCs: "Krajský tým Liberec",
    ownerEn: "Liberec regional team",
    mediaTypeCs: "billboard",
    mediaTypeEn: "billboard",
    channel: "offline",
    publicationDate: new Date("2026-09-18T00:00:00.000Z"),
    periodCs: "18. 9. - 10. 10. 2026",
    periodEn: "18 Sep - 10 Oct 2026",
    distributionAreaCs: "Liberecký kraj",
    distributionAreaEn: "Liberec region",
    payerCs: "Demo strana",
    payerEn: "Demo party",
    supplierCs: "Outdoor Media CZ",
    supplierEn: "Outdoor Media CZ",
    amount: "118 500 Kč",
    fundingSourceCs: "volební účet",
    fundingSourceEn: "campaign account",
    language: "cs",
    isTargeted: false,
    targetingCs: "nepoužito",
    targetingEn: "not used",
    targetAudienceCs: "",
    targetAudienceEn: "",
    missingCs: ["schválení plátce"],
    missingEn: ["payer approval"],
    status: AdStatus.REVIEW,
    statusLabelCs: "Kontrola",
    statusLabelEn: "Review",
    workflowStatus: AdWorkflowStatus.READY_FOR_REVIEW,
  },
  {
    code: "PHA-014",
    unitSlug: "praha-3",
    titleCs: "Citylight: dostupné bydlení",
    titleEn: "Citylight: housing access",
    ownerCs: "Praha 3",
    ownerEn: "Prague 3",
    mediaTypeCs: "citylight",
    mediaTypeEn: "citylight",
    channel: "offline",
    publicationDate: new Date("2026-09-12T00:00:00.000Z"),
    periodCs: "12. 9. - 30. 9. 2026",
    periodEn: "12 Sep - 30 Sep 2026",
    distributionAreaCs: "Praha 3",
    distributionAreaEn: "Prague 3",
    payerCs: "Demo strana",
    payerEn: "Demo party",
    supplierCs: "Městský mobiliář Praha",
    supplierEn: "Prague Street Furniture",
    amount: "65 000 Kč",
    fundingSourceCs: "volební účet",
    fundingSourceEn: "campaign account",
    language: "cs",
    isTargeted: false,
    targetingCs: "nepoužito",
    targetingEn: "not used",
    targetAudienceCs: "",
    targetAudienceEn: "",
    missingCs: [],
    missingEn: [],
    status: AdStatus.READY,
    statusLabelCs: "Připraveno",
    statusLabelEn: "Ready",
    workflowStatus: AdWorkflowStatus.APPROVED,
  },
  {
    code: "PLZ-019",
    unitSlug: "plzen",
    titleCs: "Banner: školky bez čekání",
    titleEn: "Banner: childcare capacity",
    ownerCs: "Online tým Plzeň",
    ownerEn: "Pilsen online team",
    mediaTypeCs: "online banner",
    mediaTypeEn: "online banner",
    channel: "online",
    publicationDate: new Date("2026-09-21T00:00:00.000Z"),
    periodCs: "21. 9. - 9. 10. 2026",
    periodEn: "21 Sep - 9 Oct 2026",
    distributionAreaCs: "Plzeň",
    distributionAreaEn: "Pilsen",
    payerCs: "Demo strana",
    payerEn: "Demo party",
    supplierCs: "Digitální agentura Plzeň",
    supplierEn: "Pilsen Digital Agency",
    amount: "19 900 Kč",
    fundingSourceCs: "volební účet",
    fundingSourceEn: "campaign account",
    language: "cs",
    isTargeted: true,
    targetingCs: "lokalita Plzeň",
    targetingEn: "Pilsen location",
    targetAudienceCs: "uživatelé sociálních sítí v Plzni a okolí",
    targetAudienceEn: "social media users in and around Pilsen",
    missingCs: [],
    missingEn: [],
    status: AdStatus.READY,
    statusLabelCs: "Schváleno",
    statusLabelEn: "Approved",
    workflowStatus: AdWorkflowStatus.PUBLISHED,
  },
];

function createPublicToken() {
  return randomBytes(18).toString("base64url");
}

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: {
      nameCs: "Demo strana",
      nameEn: "Demo party",
    },
    create: {
      slug: tenantSlug,
      nameCs: "Demo strana",
      nameEn: "Demo party",
    },
  });

  const campaign = await prisma.campaign.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: campaignSlug } },
    update: {
      nameCs: "Komunální volby 2026",
      nameEn: "Municipal election 2026",
      election: "municipal-2026",
      startsAt: new Date("2026-08-01T00:00:00.000Z"),
      endsAt: new Date("2026-10-10T00:00:00.000Z"),
    },
    create: {
      tenantId: tenant.id,
      slug: campaignSlug,
      nameCs: "Komunální volby 2026",
      nameEn: "Municipal election 2026",
      election: "municipal-2026",
      startsAt: new Date("2026-08-01T00:00:00.000Z"),
      endsAt: new Date("2026-10-10T00:00:00.000Z"),
    },
  });

  const unitBySlug = new Map();
  for (const [slug, kind, nameCs, nameEn] of units) {
    const unit = await prisma.organizationUnit.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug } },
      update: { kind, nameCs, nameEn },
      create: { tenantId: tenant.id, slug, kind, nameCs, nameEn },
    });
    unitBySlug.set(slug, unit);
  }

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@demo-strana.cz" },
    update: { name: "Admin demo strany" },
    create: {
      email: "admin@demo-strana.cz",
      name: "Admin demo strany",
    },
  });

  await prisma.tenantMembership.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: adminUser.id,
      },
    },
    update: {
      role: UserRole.PARTY_ADMIN,
      status: MembershipStatus.ACTIVE,
      orgUnitId: null,
    },
    create: {
      tenantId: tenant.id,
      userId: adminUser.id,
      role: UserRole.PARTY_ADMIN,
      status: MembershipStatus.ACTIVE,
    },
  });

  for (const ad of ads) {
    const unit = unitBySlug.get(ad.unitSlug);
    const savedAd = await prisma.ad.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: ad.code } },
      update: {
        campaignId: campaign.id,
        orgUnitId: unit.id,
        titleCs: ad.titleCs,
        titleEn: ad.titleEn,
        ownerCs: ad.ownerCs,
        ownerEn: ad.ownerEn,
        mediaTypeCs: ad.mediaTypeCs,
        mediaTypeEn: ad.mediaTypeEn,
        channel: ad.channel,
        publicationDate: ad.publicationDate,
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
        statusLabelCs: ad.statusLabelCs,
        statusLabelEn: ad.statusLabelEn,
        workflowStatus: ad.workflowStatus,
        reviewRequestedAt: ad.workflowStatus === AdWorkflowStatus.READY_FOR_REVIEW ? new Date("2026-08-20T00:00:00.000Z") : null,
        approvedAt:
          ad.workflowStatus === AdWorkflowStatus.APPROVED || ad.workflowStatus === AdWorkflowStatus.PUBLISHED
            ? new Date("2026-08-24T00:00:00.000Z")
            : null,
        publishedAt: ad.workflowStatus === AdWorkflowStatus.PUBLISHED ? new Date("2026-08-25T00:00:00.000Z") : null,
        lockedAt: ad.workflowStatus === AdWorkflowStatus.PUBLISHED ? new Date("2026-08-25T00:00:00.000Z") : null,
        reviewerName:
          ad.workflowStatus === AdWorkflowStatus.APPROVED || ad.workflowStatus === AdWorkflowStatus.PUBLISHED ? "Centrální kontrola" : "",
        statusNoteCs:
          ad.workflowStatus === AdWorkflowStatus.PUBLISHED
            ? "Publikovaná verze je uzamčená."
            : ad.workflowStatus === AdWorkflowStatus.APPROVED
              ? "Záznam je schválený a připravený k publikaci."
              : ad.workflowStatus === AdWorkflowStatus.READY_FOR_REVIEW
                ? "Záznam čeká na centrální kontrolu."
                : "Záznam čeká na doplnění povinných údajů.",
        statusNoteEn:
          ad.workflowStatus === AdWorkflowStatus.PUBLISHED
            ? "Published version is locked."
            : ad.workflowStatus === AdWorkflowStatus.APPROVED
              ? "The record is approved and ready to publish."
              : ad.workflowStatus === AdWorkflowStatus.READY_FOR_REVIEW
                ? "The record is waiting for central review."
                : "The record is waiting for required data.",
      },
      create: {
        tenantId: tenant.id,
        campaignId: campaign.id,
        orgUnitId: unit.id,
        code: ad.code,
        publicToken: createPublicToken(),
        titleCs: ad.titleCs,
        titleEn: ad.titleEn,
        ownerCs: ad.ownerCs,
        ownerEn: ad.ownerEn,
        mediaTypeCs: ad.mediaTypeCs,
        mediaTypeEn: ad.mediaTypeEn,
        channel: ad.channel,
        publicationDate: ad.publicationDate,
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
        statusLabelCs: ad.statusLabelCs,
        statusLabelEn: ad.statusLabelEn,
        workflowStatus: ad.workflowStatus,
        reviewRequestedAt: ad.workflowStatus === AdWorkflowStatus.READY_FOR_REVIEW ? new Date("2026-08-20T00:00:00.000Z") : null,
        approvedAt:
          ad.workflowStatus === AdWorkflowStatus.APPROVED || ad.workflowStatus === AdWorkflowStatus.PUBLISHED
            ? new Date("2026-08-24T00:00:00.000Z")
            : null,
        publishedAt: ad.workflowStatus === AdWorkflowStatus.PUBLISHED ? new Date("2026-08-25T00:00:00.000Z") : null,
        lockedAt: ad.workflowStatus === AdWorkflowStatus.PUBLISHED ? new Date("2026-08-25T00:00:00.000Z") : null,
        reviewerName:
          ad.workflowStatus === AdWorkflowStatus.APPROVED || ad.workflowStatus === AdWorkflowStatus.PUBLISHED ? "Centrální kontrola" : "",
        statusNoteCs:
          ad.workflowStatus === AdWorkflowStatus.PUBLISHED
            ? "Publikovaná verze je uzamčená."
            : ad.workflowStatus === AdWorkflowStatus.APPROVED
              ? "Záznam je schválený a připravený k publikaci."
              : ad.workflowStatus === AdWorkflowStatus.READY_FOR_REVIEW
                ? "Záznam čeká na centrální kontrolu."
                : "Záznam čeká na doplnění povinných údajů.",
        statusNoteEn:
          ad.workflowStatus === AdWorkflowStatus.PUBLISHED
            ? "Published version is locked."
            : ad.workflowStatus === AdWorkflowStatus.APPROVED
              ? "The record is approved and ready to publish."
              : ad.workflowStatus === AdWorkflowStatus.READY_FOR_REVIEW
                ? "The record is waiting for central review."
                : "The record is waiting for required data.",
      },
    });

    await prisma.auditLog.upsert({
      where: { id: `${savedAd.id}:seed` },
      update: {
        tenantId: tenant.id,
        adId: savedAd.id,
        actor: "system",
        action: "seed",
        messageCs: `Seed demo reklamy ${ad.code}`,
        messageEn: `Seeded demo ad ${ad.code}`,
      },
      create: {
        id: `${savedAd.id}:seed`,
        tenantId: tenant.id,
        adId: savedAd.id,
        actor: "system",
        action: "seed",
        messageCs: `Seed demo reklamy ${ad.code}`,
        messageEn: `Seeded demo ad ${ad.code}`,
      },
    });

    if (ad.workflowStatus === AdWorkflowStatus.READY_FOR_REVIEW || ad.workflowStatus === AdWorkflowStatus.APPROVED || ad.workflowStatus === AdWorkflowStatus.PUBLISHED) {
      await prisma.approval.upsert({
        where: { id: `${savedAd.id}:review-requested` },
        update: {
          tenantId: tenant.id,
          adId: savedAd.id,
          actor: "system",
          status: ApprovalStatus.REQUESTED,
          noteCs: "Seed: reklama předána ke kontrole.",
          noteEn: "Seed: ad submitted for review.",
        },
        create: {
          id: `${savedAd.id}:review-requested`,
          tenantId: tenant.id,
          adId: savedAd.id,
          actor: "system",
          status: ApprovalStatus.REQUESTED,
          noteCs: "Seed: reklama předána ke kontrole.",
          noteEn: "Seed: ad submitted for review.",
        },
      });
    }

    if (ad.workflowStatus === AdWorkflowStatus.APPROVED || ad.workflowStatus === AdWorkflowStatus.PUBLISHED) {
      await prisma.approval.upsert({
        where: { id: `${savedAd.id}:approved` },
        update: {
          tenantId: tenant.id,
          adId: savedAd.id,
          actor: "central-review",
          status: ApprovalStatus.APPROVED,
          noteCs: "Seed: reklama schválena.",
          noteEn: "Seed: ad approved.",
        },
        create: {
          id: `${savedAd.id}:approved`,
          tenantId: tenant.id,
          adId: savedAd.id,
          actor: "central-review",
          status: ApprovalStatus.APPROVED,
          noteCs: "Seed: reklama schválena.",
          noteEn: "Seed: ad approved.",
        },
      });
    }

    if (ad.workflowStatus === AdWorkflowStatus.PUBLISHED) {
      await prisma.approval.upsert({
        where: { id: `${savedAd.id}:published` },
        update: {
          tenantId: tenant.id,
          adId: savedAd.id,
          actor: "central-review",
          status: ApprovalStatus.PUBLISHED,
          noteCs: "Seed: reklama publikována.",
          noteEn: "Seed: ad published.",
        },
        create: {
          id: `${savedAd.id}:published`,
          tenantId: tenant.id,
          adId: savedAd.id,
          actor: "central-review",
          status: ApprovalStatus.PUBLISHED,
          noteCs: "Seed: reklama publikována.",
          noteEn: "Seed: ad published.",
        },
      });
    }
  }

  console.log(`Seeded ${ads.length} ads for ${tenant.slug}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
