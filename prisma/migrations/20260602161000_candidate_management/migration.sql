CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orgUnitId" TEXT,
    "slug" TEXT NOT NULL,
    "nameCs" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL DEFAULT '',
    "ballotNumber" TEXT NOT NULL DEFAULT '',
    "descriptionCs" TEXT NOT NULL DEFAULT '',
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ads" ADD COLUMN "candidateId" TEXT;

CREATE UNIQUE INDEX "candidates_tenantId_slug_key" ON "candidates"("tenantId", "slug");
CREATE INDEX "candidates_tenantId_idx" ON "candidates"("tenantId");
CREATE INDEX "candidates_tenantId_orgUnitId_idx" ON "candidates"("tenantId", "orgUnitId");
CREATE INDEX "candidates_tenantId_archivedAt_idx" ON "candidates"("tenantId", "archivedAt");
CREATE INDEX "ads_tenantId_candidateId_idx" ON "ads"("tenantId", "candidateId");

ALTER TABLE "candidates" ADD CONSTRAINT "candidates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "organization_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ads" ADD CONSTRAINT "ads_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
