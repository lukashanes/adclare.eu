ALTER TABLE "tenants" ADD COLUMN "contactEmail" TEXT NOT NULL DEFAULT '';
ALTER TABLE "tenants" ADD COLUMN "defaultLocale" TEXT NOT NULL DEFAULT 'cs';
ALTER TABLE "tenants" ADD COLUMN "publicRepositoryEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "tenants" ADD COLUMN "retentionYears" INTEGER NOT NULL DEFAULT 7;

ALTER TABLE "organization_units" ADD COLUMN "parentId" TEXT;
ALTER TABLE "organization_units" ADD COLUMN "contactEmail" TEXT NOT NULL DEFAULT '';
ALTER TABLE "organization_units" ADD COLUMN "descriptionCs" TEXT NOT NULL DEFAULT '';
ALTER TABLE "organization_units" ADD COLUMN "descriptionEn" TEXT NOT NULL DEFAULT '';
ALTER TABLE "organization_units" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "organization_units_parentId_idx" ON "organization_units"("parentId");
CREATE INDEX "organization_units_tenantId_archivedAt_idx" ON "organization_units"("tenantId", "archivedAt");

ALTER TABLE "organization_units" ADD CONSTRAINT "organization_units_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "organization_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
