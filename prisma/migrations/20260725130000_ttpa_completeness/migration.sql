CREATE TYPE "ComplianceReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'REJECTED');

ALTER TABLE "tenants"
ADD COLUMN "complianceEmail" TEXT NOT NULL DEFAULT '';

UPDATE "tenants"
SET "complianceEmail" = "contactEmail"
WHERE "complianceEmail" = '';

ALTER TABLE "campaigns"
ADD COLUMN "electionLevel" TEXT NOT NULL DEFAULT '',
ADD COLUMN "electionDate" TIMESTAMP(3),
ADD COLUMN "officialInformationUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN "aggregatedAmount" TEXT NOT NULL DEFAULT '',
ADD COLUMN "benefitsInKind" TEXT NOT NULL DEFAULT '',
ADD COLUMN "currency" TEXT NOT NULL DEFAULT '',
ADD COLUMN "calculationMethodCs" TEXT NOT NULL DEFAULT '',
ADD COLUMN "calculationMethodEn" TEXT NOT NULL DEFAULT '';

ALTER TABLE "ads"
ADD COLUMN "ownerEmail" TEXT NOT NULL DEFAULT '',
ADD COLUMN "ownerPostalAddress" TEXT NOT NULL DEFAULT '',
ADD COLUMN "ownerEstablishmentAddress" TEXT NOT NULL DEFAULT '',
ADD COLUMN "ownerRegistrationNumber" TEXT NOT NULL DEFAULT '',
ADD COLUMN "ownerEntityType" TEXT NOT NULL DEFAULT '',
ADD COLUMN "controllerNameCs" TEXT NOT NULL DEFAULT '',
ADD COLUMN "controllerNameEn" TEXT NOT NULL DEFAULT '',
ADD COLUMN "controllerEmail" TEXT NOT NULL DEFAULT '',
ADD COLUMN "controllerPostalAddress" TEXT NOT NULL DEFAULT '',
ADD COLUMN "controllerEstablishmentAddress" TEXT NOT NULL DEFAULT '',
ADD COLUMN "controllerEntityType" TEXT NOT NULL DEFAULT '',
ADD COLUMN "disseminationStartsAt" TIMESTAMP(3),
ADD COLUMN "disseminationEndsAt" TIMESTAMP(3),
ADD COLUMN "payerEmail" TEXT NOT NULL DEFAULT '',
ADD COLUMN "payerPostalAddress" TEXT NOT NULL DEFAULT '',
ADD COLUMN "payerEstablishmentAddress" TEXT NOT NULL DEFAULT '',
ADD COLUMN "payerEntityType" TEXT NOT NULL DEFAULT '',
ADD COLUMN "benefitsInKind" TEXT NOT NULL DEFAULT '',
ADD COLUMN "currency" TEXT NOT NULL DEFAULT '',
ADD COLUMN "fundingOrigin" TEXT NOT NULL DEFAULT '',
ADD COLUMN "fundingJurisdiction" TEXT NOT NULL DEFAULT '',
ADD COLUMN "calculationMethodCs" TEXT NOT NULL DEFAULT '',
ADD COLUMN "calculationMethodEn" TEXT NOT NULL DEFAULT '',
ADD COLUMN "europeanRepositoryUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN "republishedAfterInfringement" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "infringementDetailsCs" TEXT NOT NULL DEFAULT '',
ADD COLUMN "infringementDetailsEn" TEXT NOT NULL DEFAULT '',
ADD COLUMN "usesPersonalData" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "targetingDataCategoriesCs" TEXT NOT NULL DEFAULT '',
ADD COLUMN "targetingDataCategoriesEn" TEXT NOT NULL DEFAULT '',
ADD COLUMN "targetingLogicCs" TEXT NOT NULL DEFAULT '',
ADD COLUMN "targetingLogicEn" TEXT NOT NULL DEFAULT '',
ADD COLUMN "targetingAiUseCs" TEXT NOT NULL DEFAULT '',
ADD COLUMN "targetingAiUseEn" TEXT NOT NULL DEFAULT '',
ADD COLUMN "targetingPolicyUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN "dataControllerCs" TEXT NOT NULL DEFAULT '',
ADD COLUMN "dataControllerEn" TEXT NOT NULL DEFAULT '',
ADD COLUMN "consentWithdrawUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN "dataRightsUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN "privacyInformationUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN "reachViews" INTEGER,
ADD COLUMN "reachEngagements" INTEGER,
ADD COLUMN "reachClicks" INTEGER,
ADD COLUMN "reachLikes" INTEGER,
ADD COLUMN "reachComments" INTEGER;

UPDATE "ads"
SET "disseminationStartsAt" = "publicationDate"
WHERE "disseminationStartsAt" IS NULL;

UPDATE "ads"
SET
  "workflowStatus" = 'NEEDS_DATA',
  "status" = CASE WHEN "publicationDate" <= CURRENT_DATE THEN 'BLOCKED'::"AdStatus" ELSE 'WARNING'::"AdStatus" END,
  "statusLabelCs" = CASE WHEN "publicationDate" <= CURRENT_DATE THEN 'Červená' ELSE 'Doplnit' END,
  "statusLabelEn" = CASE WHEN "publicationDate" <= CURRENT_DATE THEN 'Red' ELSE 'Complete' END,
  "missingCs" = ARRAY['identifikace zadavatele a plátce', 'strukturované financování', 'období šíření', 'údaje kampaně podle TTPA'],
  "missingEn" = ARRAY['sponsor and payer identification', 'structured funding', 'dissemination period', 'TTPA campaign data'],
  "approvedAt" = NULL,
  "publishedAt" = NULL,
  "lockedAt" = NULL,
  "statusNoteCs" = 'Záznam je potřeba doplnit podle úplného formátu TTPA.',
  "statusNoteEn" = 'The record must be completed using the full TTPA format.';

CREATE TABLE "compliance_reports" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "adId" TEXT NOT NULL,
  "reporterEmail" TEXT NOT NULL DEFAULT '',
  "reason" TEXT NOT NULL,
  "details" TEXT NOT NULL,
  "status" "ComplianceReportStatus" NOT NULL DEFAULT 'OPEN',
  "resolution" TEXT NOT NULL DEFAULT '',
  "ipAddress" TEXT NOT NULL DEFAULT '',
  "userAgent" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "compliance_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "compliance_reports_tenantId_status_createdAt_idx"
ON "compliance_reports"("tenantId", "status", "createdAt");

CREATE INDEX "compliance_reports_adId_createdAt_idx"
ON "compliance_reports"("adId", "createdAt");

ALTER TABLE "compliance_reports"
ADD CONSTRAINT "compliance_reports_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "compliance_reports"
ADD CONSTRAINT "compliance_reports_adId_fkey"
FOREIGN KEY ("adId") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
