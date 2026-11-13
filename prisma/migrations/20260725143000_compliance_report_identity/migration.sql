ALTER TABLE "compliance_reports"
ADD COLUMN "reporterName" TEXT NOT NULL DEFAULT '';

ALTER TABLE "compliance_reports"
ALTER COLUMN "reporterName" DROP DEFAULT;
