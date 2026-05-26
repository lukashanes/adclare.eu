import { PrismaClient, AdStatus } from "@prisma/client";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();

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
    publicationDate: new Date("2026-09-05T00:00:00.000Z"),
    periodCs: "5. 9. - 20. 9. 2026",
    periodEn: "5 Sep - 20 Sep 2026",
    payerCs: "Demo strana",
    payerEn: "Demo party",
    amount: "",
    fundingSourceCs: "",
    fundingSourceEn: "",
    targetingCs: "nepoužito",
    targetingEn: "not used",
    missingCs: ["částka", "původ financí"],
    missingEn: ["amount", "funding source"],
    status: AdStatus.BLOCKED,
    statusLabelCs: "Po termínu",
    statusLabelEn: "Overdue",
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
    publicationDate: new Date("2026-09-14T00:00:00.000Z"),
    periodCs: "14. 9. - 28. 9. 2026",
    periodEn: "14 Sep - 28 Sep 2026",
    payerCs: "Demo strana",
    payerEn: "Demo party",
    amount: "42 000 Kč",
    fundingSourceCs: "",
    fundingSourceEn: "",
    targetingCs: "věk, lokalita",
    targetingEn: "age, location",
    missingCs: ["původ financí", "cílení"],
    missingEn: ["funding source", "targeting"],
    status: AdStatus.WARNING,
    statusLabelCs: "Doplnit",
    statusLabelEn: "Complete",
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
    publicationDate: new Date("2026-09-18T00:00:00.000Z"),
    periodCs: "18. 9. - 10. 10. 2026",
    periodEn: "18 Sep - 10 Oct 2026",
    payerCs: "Demo strana",
    payerEn: "Demo party",
    amount: "118 500 Kč",
    fundingSourceCs: "volební účet",
    fundingSourceEn: "campaign account",
    targetingCs: "nepoužito",
    targetingEn: "not used",
    missingCs: ["schválení plátce"],
    missingEn: ["payer approval"],
    status: AdStatus.REVIEW,
    statusLabelCs: "Kontrola",
    statusLabelEn: "Review",
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
    publicationDate: new Date("2026-09-12T00:00:00.000Z"),
    periodCs: "12. 9. - 30. 9. 2026",
    periodEn: "12 Sep - 30 Sep 2026",
    payerCs: "Demo strana",
    payerEn: "Demo party",
    amount: "65 000 Kč",
    fundingSourceCs: "volební účet",
    fundingSourceEn: "campaign account",
    targetingCs: "nepoužito",
    targetingEn: "not used",
    missingCs: [],
    missingEn: [],
    status: AdStatus.READY,
    statusLabelCs: "Připraveno",
    statusLabelEn: "Ready",
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
    publicationDate: new Date("2026-09-21T00:00:00.000Z"),
    periodCs: "21. 9. - 9. 10. 2026",
    periodEn: "21 Sep - 9 Oct 2026",
    payerCs: "Demo strana",
    payerEn: "Demo party",
    amount: "19 900 Kč",
    fundingSourceCs: "volební účet",
    fundingSourceEn: "campaign account",
    targetingCs: "lokalita Plzeň",
    targetingEn: "Pilsen location",
    missingCs: [],
    missingEn: [],
    status: AdStatus.READY,
    statusLabelCs: "Schváleno",
    statusLabelEn: "Approved",
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
        publicationDate: ad.publicationDate,
        periodCs: ad.periodCs,
        periodEn: ad.periodEn,
        payerCs: ad.payerCs,
        payerEn: ad.payerEn,
        amount: ad.amount,
        fundingSourceCs: ad.fundingSourceCs,
        fundingSourceEn: ad.fundingSourceEn,
        targetingCs: ad.targetingCs,
        targetingEn: ad.targetingEn,
        missingCs: ad.missingCs,
        missingEn: ad.missingEn,
        status: ad.status,
        statusLabelCs: ad.statusLabelCs,
        statusLabelEn: ad.statusLabelEn,
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
        publicationDate: ad.publicationDate,
        periodCs: ad.periodCs,
        periodEn: ad.periodEn,
        payerCs: ad.payerCs,
        payerEn: ad.payerEn,
        amount: ad.amount,
        fundingSourceCs: ad.fundingSourceCs,
        fundingSourceEn: ad.fundingSourceEn,
        targetingCs: ad.targetingCs,
        targetingEn: ad.targetingEn,
        missingCs: ad.missingCs,
        missingEn: ad.missingEn,
        status: ad.status,
        statusLabelCs: ad.statusLabelCs,
        statusLabelEn: ad.statusLabelEn,
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
