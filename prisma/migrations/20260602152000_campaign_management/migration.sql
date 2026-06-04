ALTER TABLE "campaigns" ADD COLUMN "descriptionCs" TEXT NOT NULL DEFAULT '';
ALTER TABLE "campaigns" ADD COLUMN "descriptionEn" TEXT NOT NULL DEFAULT '';
ALTER TABLE "campaigns" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "campaigns" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "campaigns_tenantId_archivedAt_idx" ON "campaigns"("tenantId", "archivedAt");
