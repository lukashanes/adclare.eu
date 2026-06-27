import {
  PrismaClient,
  AdStatus,
  AdWorkflowStatus,
  ApprovalStatus,
  MembershipStatus,
  Prisma,
  UserRole,
} from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { computeAuditEntryHash } from "../src/lib/audit-hash";

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
const regionalCampaignSlug = "regional-2026";

const units = [
  ["central", "centrala", "Centrála", "Headquarters"],
  ["ostrava-jih", "oblast", "Ostrava-Jih", "Ostrava-South"],
  ["brno-stred", "oblast", "Brno-střed", "Brno-centre"],
  ["liberec", "kraj", "Liberec", "Liberec"],
  ["praha-3", "oblast", "Praha 3", "Prague 3"],
  ["plzen", "oblast", "Plzeň", "Pilsen"],
  ["hradec-kralove", "oblast", "Hradec Králové", "Hradec Kralove"],
  ["olomouc", "oblast", "Olomouc", "Olomouc"],
];

const candidates = [
  {
    slug: "jan-novak",
    unitSlug: "ostrava-jih",
    nameCs: "Jan Novák",
    nameEn: "Jan Novák",
    contactEmail: "jan.novak@example.org",
    ballotNumber: "1",
    descriptionCs: "Lídr kandidátky pro Ostravu-Jih.",
    descriptionEn: "Lead candidate for Ostrava-South.",
  },
  {
    slug: "eva-svobodova",
    unitSlug: "brno-stred",
    nameCs: "Eva Svobodová",
    nameEn: "Eva Svobodová",
    contactEmail: "eva.svobodova@example.org",
    ballotNumber: "2",
    descriptionCs: "Kandidátka pro dopravu a veřejný prostor.",
    descriptionEn: "Candidate focused on transport and public space.",
  },
  {
    slug: "petr-dvorak",
    unitSlug: "liberec",
    nameCs: "Petr Dvořák",
    nameEn: "Petr Dvořák",
    contactEmail: "petr.dvorak@example.org",
    ballotNumber: "3",
    descriptionCs: "Krajský kandidát pro energetiku a rozpočet.",
    descriptionEn: "Regional candidate focused on energy and budget.",
  },
  {
    slug: "tereza-kralova",
    unitSlug: "praha-3",
    nameCs: "Tereza Králová",
    nameEn: "Tereza Králová",
    contactEmail: "tereza.kralova@example.org",
    ballotNumber: "4",
    descriptionCs: "Kandidátka pro bydlení a městské služby.",
    descriptionEn: "Candidate focused on housing and city services.",
  },
  {
    slug: "lucie-maresova",
    unitSlug: "hradec-kralove",
    nameCs: "Lucie Marešová",
    nameEn: "Lucie Marešová",
    contactEmail: "lucie.maresova@example.org",
    ballotNumber: "5",
    descriptionCs: "Kandidátka pro školství a dostupné služby.",
    descriptionEn: "Candidate focused on education and accessible services.",
  },
  {
    slug: "martin-prochazka",
    unitSlug: "olomouc",
    nameCs: "Martin Procházka",
    nameEn: "Martin Procházka",
    contactEmail: "martin.prochazka@example.org",
    ballotNumber: "6",
    descriptionCs: "Kandidát pro transparentní hospodaření města.",
    descriptionEn: "Candidate focused on transparent city spending.",
  },
];

const ads = [
  {
    code: "OST-011",
    campaignSlug,
    unitSlug: "ostrava-jih",
    candidateSlug: "jan-novak",
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
    campaignSlug,
    unitSlug: "brno-stred",
    candidateSlug: "eva-svobodova",
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
    campaignSlug: regionalCampaignSlug,
    unitSlug: "liberec",
    candidateSlug: "petr-dvorak",
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
    campaignSlug,
    unitSlug: "praha-3",
    candidateSlug: "tereza-kralova",
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
    campaignSlug,
    unitSlug: "plzen",
    candidateSlug: "",
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
  {
    code: "HKR-027",
    campaignSlug,
    unitSlug: "hradec-kralove",
    candidateSlug: "lucie-maresova",
    titleCs: "Plakát: školky bez čekání",
    titleEn: "Poster: childcare without waiting",
    ownerCs: "Tým Hradec Králové",
    ownerEn: "Hradec Kralove team",
    mediaTypeCs: "plakát",
    mediaTypeEn: "poster",
    channel: "offline",
    publicationDate: new Date("2026-09-08T00:00:00.000Z"),
    periodCs: "8. 9. - 1. 10. 2026",
    periodEn: "8 Sep - 1 Oct 2026",
    distributionAreaCs: "Hradec Králové, školská zařízení a okolí MHD",
    distributionAreaEn: "Hradec Kralove, schools and public transport stops",
    payerCs: "Demo strana",
    payerEn: "Demo party",
    supplierCs: "Tiskárna Východ",
    supplierEn: "East Print Studio",
    amount: "31 400 Kč",
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
    status: AdStatus.REVIEW,
    statusLabelCs: "Ke kontrole",
    statusLabelEn: "Review",
    workflowStatus: AdWorkflowStatus.READY_FOR_REVIEW,
  },
  {
    code: "OLM-041",
    campaignSlug: regionalCampaignSlug,
    unitSlug: "olomouc",
    candidateSlug: "martin-prochazka",
    titleCs: "Carousel: otevřený rozpočet",
    titleEn: "Carousel: open budget",
    ownerCs: "Online tým Olomouc",
    ownerEn: "Olomouc online team",
    mediaTypeCs: "social post",
    mediaTypeEn: "social post",
    channel: "online",
    publicationDate: new Date("2026-09-22T00:00:00.000Z"),
    periodCs: "22. 9. - 8. 10. 2026",
    periodEn: "22 Sep - 8 Oct 2026",
    distributionAreaCs: "Olomouc a okolí do 20 km",
    distributionAreaEn: "Olomouc and 20 km surroundings",
    payerCs: "Demo strana",
    payerEn: "Demo party",
    supplierCs: "Social Lab",
    supplierEn: "Social Lab",
    amount: "27 800 Kč",
    fundingSourceCs: "volební účet",
    fundingSourceEn: "campaign account",
    language: "cs",
    isTargeted: true,
    targetingCs: "lokalita, zájem o komunální témata",
    targetingEn: "location, interest in municipal topics",
    targetAudienceCs: "uživatelé 18+ v Olomouci se zájmem o městská témata",
    targetAudienceEn: "users 18+ in Olomouc interested in city topics",
    missingCs: [],
    missingEn: [],
    status: AdStatus.READY,
    statusLabelCs: "Publikováno",
    statusLabelEn: "Published",
    workflowStatus: AdWorkflowStatus.PUBLISHED,
  },
  {
    code: "CEN-052",
    campaignSlug: regionalCampaignSlug,
    unitSlug: "central",
    candidateSlug: "",
    titleCs: "EN banner: transparent campaign records",
    titleEn: "Banner: transparent campaign records",
    ownerCs: "Centrální digitální tým",
    ownerEn: "Central digital team",
    mediaTypeCs: "online banner",
    mediaTypeEn: "online banner",
    channel: "online",
    publicationDate: new Date("2026-09-25T00:00:00.000Z"),
    periodCs: "25. 9. - 10. 10. 2026",
    periodEn: "25 Sep - 10 Oct 2026",
    distributionAreaCs: "celostátní online kampaň",
    distributionAreaEn: "national online campaign",
    payerCs: "Demo strana",
    payerEn: "Demo party",
    supplierCs: "Central Media Desk",
    supplierEn: "Central Media Desk",
    amount: "84 000 Kč",
    fundingSourceCs: "volební účet",
    fundingSourceEn: "campaign account",
    language: "en",
    isTargeted: true,
    targetingCs: "zájmy a lokalita",
    targetingEn: "interests and location",
    targetAudienceCs: "voliči v krajských městech, 18+",
    targetAudienceEn: "voters in regional cities, 18+",
    missingCs: [],
    missingEn: [],
    status: AdStatus.READY,
    statusLabelCs: "Schváleno",
    statusLabelEn: "Approved",
    workflowStatus: AdWorkflowStatus.APPROVED,
  },
  {
    code: "OST-044",
    campaignSlug,
    unitSlug: "ostrava-jih",
    candidateSlug: "jan-novak",
    titleCs: "Citylight: bezpečné přechody",
    titleEn: "Citylight: safer crossings",
    ownerCs: "Lokální tým Ostrava",
    ownerEn: "Local Ostrava team",
    mediaTypeCs: "citylight",
    mediaTypeEn: "citylight",
    channel: "offline",
    publicationDate: new Date("2026-09-16T00:00:00.000Z"),
    periodCs: "16. 9. - 9. 10. 2026",
    periodEn: "16 Sep - 9 Oct 2026",
    distributionAreaCs: "Ostrava-Jih, okolí škol a přechodů",
    distributionAreaEn: "Ostrava-South, near schools and crossings",
    payerCs: "Demo strana",
    payerEn: "Demo party",
    supplierCs: "Outdoor Media CZ",
    supplierEn: "Outdoor Media CZ",
    amount: "58 600 Kč",
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
    statusLabelCs: "Publikováno",
    statusLabelEn: "Published",
    workflowStatus: AdWorkflowStatus.PUBLISHED,
  },
];

function createPublicToken() {
  return randomBytes(18).toString("base64url");
}

function localStorageRoot() {
  return (process.env.ADCLARE_LOCAL_STORAGE_DIR || process.env.LOCAL_UPLOAD_DIR || ".data/uploads").trim();
}

function storageDriver() {
  const configured = (process.env.ADCLARE_STORAGE_DRIVER || process.env.OBJECT_STORAGE_DRIVER || "local").trim().toLowerCase();
  return configured === "s3" || configured === "object-storage" || configured === "object_storage" ? "s3" : "local";
}

function safeSegment(value: string, fallback: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/(^[.-]+|[.-]+$)/g, "")
      .slice(0, 120) || fallback
  );
}

function localObjectPath(key: string) {
  const root = resolve(localStorageRoot());
  const target = resolve(root, key);

  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    throw new Error("Invalid local storage key.");
  }

  return target;
}

function demoPdfBytes(adCode: string, title: string) {
  const text = `Adclare demo asset\n${adCode}\n${title}\n`;
  return Buffer.from(`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length ${text.length + 35} >>
stream
BT /F1 18 Tf 72 760 Td (${text.replaceAll("\n", " ")}) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000010 00000 n
0000000060 00000 n
0000000117 00000 n
0000000210 00000 n
trailer
<< /Root 1 0 R /Size 5 >>
startxref
320
%%EOF
`);
}

async function ensureDemoAsset(tenantId: string, tenantSlugValue: string, adId: string, adCode: string, title: string, actor: string) {
  const driver = storageDriver();

  if (driver !== "local") {
    return;
  }

  const bytes = demoPdfBytes(adCode, title);
  const fileName = `${safeSegment(adCode, "ad")}-demo-creative.pdf`;
  const originalName = `${adCode} demo creative.pdf`;
  const storageKey = ["tenants", safeSegment(tenantSlugValue, "tenant"), "ads", safeSegment(adCode, "ad"), "demo", fileName].join("/");
  const target = localObjectPath(storageKey);

  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, bytes);

  const existing = await prisma.adAsset.findFirst({
    where: {
      tenantId,
      adId,
      storageKey,
    },
    select: { id: true },
  });

  if (existing) {
    return;
  }

  await prisma.adAsset.create({
    data: {
      tenantId,
      adId,
      fileName,
      originalName,
      contentType: "application/pdf",
      byteSize: bytes.length,
      storageProvider: "local",
      storageBucket: "",
      storageKey,
      publicUrl: "",
      checksumSha256: createHash("sha256").update(bytes).digest("hex"),
      uploadedBy: actor,
    },
  });
}

type SeedAuditInput = {
  id: string;
  tenantId: string;
  adId?: string | null;
  entityType: string;
  entityId: string;
  entityLabel: string;
  actor: string;
  actorRole?: string;
  actorScope?: string;
  action: string;
  severity?: string;
  messageCs: string;
  messageEn: string;
  metadata?: Prisma.InputJsonValue;
  createdAt?: Date;
};

async function createSeedAuditIfMissing(input: SeedAuditInput) {
  const existing = await prisma.auditLog.findUnique({
    where: { id: input.id },
    select: { id: true },
  });

  if (existing) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO "audit_chains" ("tenantId", "lastSequence", "lastHash", "updatedAt")
      VALUES (${input.tenantId}, 0, '', CURRENT_TIMESTAMP)
      ON CONFLICT ("tenantId") DO NOTHING
    `;

    const chains = await tx.$queryRaw<Array<{ lastSequence: bigint; lastHash: string }>>`
      SELECT "lastSequence", "lastHash"
      FROM "audit_chains"
      WHERE "tenantId" = ${input.tenantId}
      FOR UPDATE
    `;
    const chain = chains[0] ?? { lastSequence: 0n, lastHash: "" };
    const sequence = chain.lastSequence + 1n;
    const createdAt = input.createdAt ?? new Date();
    const payload = {
      tenantId: input.tenantId,
      adId: input.adId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      entityLabel: input.entityLabel,
      actor: input.actor,
      actorUserId: null,
      actorRole: input.actorRole ?? "",
      actorScope: input.actorScope ?? "",
      action: input.action,
      outcome: "success",
      severity: input.severity ?? "info",
      messageCs: input.messageCs,
      messageEn: input.messageEn,
      ipAddress: "",
      userAgent: "prisma-seed",
      requestId: `seed-${input.id}`,
      correlationId: `seed-${input.id}`,
      before: null,
      after: null,
      diff: null,
      metadata: input.metadata ?? Prisma.JsonNull,
      sequence,
      previousHash: chain.lastHash,
      createdAt,
    };
    const entryHash = computeAuditEntryHash(payload);

    await tx.auditLog.create({
      data: {
        id: input.id,
        tenantId: payload.tenantId,
        adId: payload.adId,
        entityType: payload.entityType,
        entityId: payload.entityId,
        entityLabel: payload.entityLabel,
        actor: payload.actor,
        actorUserId: payload.actorUserId,
        actorRole: payload.actorRole,
        actorScope: payload.actorScope,
        action: payload.action,
        outcome: payload.outcome,
        severity: payload.severity,
        messageCs: payload.messageCs,
        messageEn: payload.messageEn,
        ipAddress: payload.ipAddress,
        userAgent: payload.userAgent,
        requestId: payload.requestId,
        correlationId: payload.correlationId,
        metadata: payload.metadata,
        sequence,
        previousHash: payload.previousHash,
        entryHash,
        createdAt,
      },
    });

    await tx.auditChain.update({
      where: { tenantId: input.tenantId },
      data: {
        lastSequence: sequence,
        lastHash: entryHash,
      },
    });
  });
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
      descriptionCs: "Demo kampaň pro lokální a krajské reklamní materiály.",
      descriptionEn: "Demo campaign for local and regional advertising material.",
      tags: ["komunální volby", "lokální týmy", "TTPA"],
      startsAt: new Date("2026-08-01T00:00:00.000Z"),
      endsAt: new Date("2026-10-10T00:00:00.000Z"),
      archivedAt: null,
    },
    create: {
      tenantId: tenant.id,
      slug: campaignSlug,
      nameCs: "Komunální volby 2026",
      nameEn: "Municipal election 2026",
      election: "municipal-2026",
      descriptionCs: "Demo kampaň pro lokální a krajské reklamní materiály.",
      descriptionEn: "Demo campaign for local and regional advertising material.",
      tags: ["komunální volby", "lokální týmy", "TTPA"],
      startsAt: new Date("2026-08-01T00:00:00.000Z"),
      endsAt: new Date("2026-10-10T00:00:00.000Z"),
    },
  });
  const regionalCampaign = await prisma.campaign.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: regionalCampaignSlug } },
    update: {
      nameCs: "Krajská kampaň 2026",
      nameEn: "Regional campaign 2026",
      election: "regional-2026",
      descriptionCs: "Demo kampaň pro krajské a online reklamní formáty.",
      descriptionEn: "Demo campaign for regional and online ad formats.",
      tags: ["krajská kampaň", "online", "TTPA"],
      startsAt: new Date("2026-08-10T00:00:00.000Z"),
      endsAt: new Date("2026-10-10T00:00:00.000Z"),
      archivedAt: null,
    },
    create: {
      tenantId: tenant.id,
      slug: regionalCampaignSlug,
      nameCs: "Krajská kampaň 2026",
      nameEn: "Regional campaign 2026",
      election: "regional-2026",
      descriptionCs: "Demo kampaň pro krajské a online reklamní formáty.",
      descriptionEn: "Demo campaign for regional and online ad formats.",
      tags: ["krajská kampaň", "online", "TTPA"],
      startsAt: new Date("2026-08-10T00:00:00.000Z"),
      endsAt: new Date("2026-10-10T00:00:00.000Z"),
    },
  });
  const campaignBySlug = new Map([
    [campaignSlug, campaign],
    [regionalCampaignSlug, regionalCampaign],
  ]);

  const unitBySlug = new Map();
  for (const [slug, kind, nameCs, nameEn] of units) {
    const unit = await prisma.organizationUnit.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug } },
      update: { kind, nameCs, nameEn },
      create: { tenantId: tenant.id, slug, kind, nameCs, nameEn },
    });
    unitBySlug.set(slug, unit);
  }

  const candidateBySlug = new Map();
  for (const candidate of candidates) {
    const unit = unitBySlug.get(candidate.unitSlug);
    const savedCandidate = await prisma.candidate.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: candidate.slug } },
      update: {
        orgUnitId: unit?.id ?? null,
        nameCs: candidate.nameCs,
        nameEn: candidate.nameEn,
        contactEmail: candidate.contactEmail,
        ballotNumber: candidate.ballotNumber,
        descriptionCs: candidate.descriptionCs,
        descriptionEn: candidate.descriptionEn,
        archivedAt: null,
      },
      create: {
        tenantId: tenant.id,
        orgUnitId: unit?.id ?? null,
        slug: candidate.slug,
        nameCs: candidate.nameCs,
        nameEn: candidate.nameEn,
        contactEmail: candidate.contactEmail,
        ballotNumber: candidate.ballotNumber,
        descriptionCs: candidate.descriptionCs,
        descriptionEn: candidate.descriptionEn,
      },
    });
    candidateBySlug.set(candidate.slug, savedCandidate);
  }

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@demo-strana.cz" },
    update: { name: "Instalační admin" },
    create: {
      email: "admin@demo-strana.cz",
      name: "Instalační admin",
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
      role: UserRole.SUPER_ADMIN,
      status: MembershipStatus.ACTIVE,
      orgUnitId: null,
      candidateId: null,
    },
    create: {
      tenantId: tenant.id,
      userId: adminUser.id,
      role: UserRole.SUPER_ADMIN,
      status: MembershipStatus.ACTIVE,
    },
  });

  const candidateUser = await prisma.user.upsert({
    where: { email: "kandidat@demo-strana.cz" },
    update: { name: "Jan Novák" },
    create: {
      email: "kandidat@demo-strana.cz",
      name: "Jan Novák",
    },
  });
  const janCandidate = candidateBySlug.get("jan-novak");

  if (!janCandidate?.orgUnitId) {
    throw new Error("Seed candidate jan-novak must have an organization unit.");
  }

  await prisma.tenantMembership.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: candidateUser.id,
      },
    },
    update: {
      role: UserRole.CANDIDATE,
      status: MembershipStatus.ACTIVE,
      orgUnitId: janCandidate.orgUnitId,
      candidateId: janCandidate.id,
    },
    create: {
      tenantId: tenant.id,
      userId: candidateUser.id,
      role: UserRole.CANDIDATE,
      status: MembershipStatus.ACTIVE,
      orgUnitId: janCandidate.orgUnitId,
      candidateId: janCandidate.id,
    },
  });

  const roleUsers = [
    {
      email: "review@demo-strana.cz",
      name: "Centrální kontrola",
      role: UserRole.CENTRAL_REVIEWER,
      unitSlug: "",
      candidateSlug: "",
    },
    {
      email: "praha3@demo-strana.cz",
      name: "Praha 3 admin",
      role: UserRole.LOCAL_ADMIN,
      unitSlug: "praha-3",
      candidateSlug: "",
    },
    {
      email: "grafik@demo-strana.cz",
      name: "Externí grafik",
      role: UserRole.DESIGNER,
      unitSlug: "central",
      candidateSlug: "",
    },
    {
      email: "audit@demo-strana.cz",
      name: "Kontrolní auditor",
      role: UserRole.READONLY_AUDITOR,
      unitSlug: "",
      candidateSlug: "",
    },
  ];

  for (const roleUser of roleUsers) {
    const user = await prisma.user.upsert({
      where: { email: roleUser.email },
      update: { name: roleUser.name },
      create: {
        email: roleUser.email,
        name: roleUser.name,
      },
    });
    const roleUnit = roleUser.unitSlug ? unitBySlug.get(roleUser.unitSlug) : null;
    const roleCandidate = roleUser.candidateSlug ? candidateBySlug.get(roleUser.candidateSlug) : null;

    await prisma.tenantMembership.upsert({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: user.id,
        },
      },
      update: {
        role: roleUser.role,
        status: MembershipStatus.ACTIVE,
        orgUnitId: roleUnit?.id ?? null,
        candidateId: roleCandidate?.id ?? null,
      },
      create: {
        tenantId: tenant.id,
        userId: user.id,
        role: roleUser.role,
        status: MembershipStatus.ACTIVE,
        orgUnitId: roleUnit?.id ?? null,
        candidateId: roleCandidate?.id ?? null,
      },
    });
  }

  for (const ad of ads) {
    const unit = unitBySlug.get(ad.unitSlug);
    const candidate = ad.candidateSlug ? candidateBySlug.get(ad.candidateSlug) : null;
    const adCampaign = campaignBySlug.get(ad.campaignSlug) ?? campaign;
    const savedAd = await prisma.ad.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: ad.code } },
      update: {
        campaignId: adCampaign.id,
        orgUnitId: unit.id,
        candidateId: candidate?.id ?? null,
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
        responsibleName: ad.ownerCs,
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
        campaignId: adCampaign.id,
        orgUnitId: unit.id,
        candidateId: candidate?.id ?? null,
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
        responsibleName: ad.ownerCs,
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

    if (ad.workflowStatus !== AdWorkflowStatus.NEEDS_DATA) {
      await ensureDemoAsset(tenant.id, tenant.slug, savedAd.id, savedAd.code, ad.titleCs, "demo seed");
    }

    await createSeedAuditIfMissing({
      id: `${savedAd.id}:seed-created`,
      tenantId: tenant.id,
      adId: savedAd.id,
      entityType: "ad",
      entityId: savedAd.id,
      entityLabel: ad.code,
      actor: "system",
      actorRole: "seed",
      action: "seed_ad",
      messageCs: `Demo reklama ${ad.code} založena v seed datech.`,
      messageEn: `Demo ad ${ad.code} created by seed data.`,
      metadata: {
        code: ad.code,
        campaign: ad.campaignSlug,
        workflowStatus: ad.workflowStatus,
        channel: ad.channel,
      },
      createdAt: new Date("2026-08-15T09:00:00.000Z"),
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
      await createSeedAuditIfMissing({
        id: `${savedAd.id}:audit-review-requested`,
        tenantId: tenant.id,
        adId: savedAd.id,
        entityType: "ad",
        entityId: savedAd.id,
        entityLabel: ad.code,
        actor: "campaign-manager",
        actorRole: "CAMPAIGN_MANAGER",
        actorScope: ad.unitSlug,
        action: "request_review",
        messageCs: `Reklama ${ad.code} předána ke kontrole.`,
        messageEn: `Ad ${ad.code} submitted for review.`,
        metadata: {
          workflowStatus: ad.workflowStatus,
        },
        createdAt: new Date("2026-08-20T09:30:00.000Z"),
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
      await createSeedAuditIfMissing({
        id: `${savedAd.id}:audit-approved`,
        tenantId: tenant.id,
        adId: savedAd.id,
        entityType: "ad",
        entityId: savedAd.id,
        entityLabel: ad.code,
        actor: "central-review",
        actorRole: "CENTRAL_REVIEWER",
        action: "approve_ad",
        messageCs: `Reklama ${ad.code} schválena.`,
        messageEn: `Ad ${ad.code} approved.`,
        metadata: {
          reviewer: "Centrální kontrola",
        },
        createdAt: new Date("2026-08-24T11:00:00.000Z"),
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
      await createSeedAuditIfMissing({
        id: `${savedAd.id}:audit-published`,
        tenantId: tenant.id,
        adId: savedAd.id,
        entityType: "ad",
        entityId: savedAd.id,
        entityLabel: ad.code,
        actor: "central-review",
        actorRole: "CENTRAL_REVIEWER",
        action: "publish_ad",
        messageCs: `Reklama ${ad.code} publikována do veřejného archivu.`,
        messageEn: `Ad ${ad.code} published to the public archive.`,
        metadata: {
          publicToken: savedAd.publicToken,
        },
        createdAt: new Date("2026-08-25T12:00:00.000Z"),
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
