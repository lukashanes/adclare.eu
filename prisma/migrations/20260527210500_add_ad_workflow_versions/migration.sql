-- CreateEnum
CREATE TYPE "AdWorkflowStatus" AS ENUM ('DRAFT', 'NEEDS_DATA', 'READY_FOR_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('REQUESTED', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED', 'PUBLISHED');

-- AlterTable
ALTER TABLE "ads"
ADD COLUMN "workflowStatus" "AdWorkflowStatus" NOT NULL DEFAULT 'NEEDS_DATA',
ADD COLUMN "responsibleName" TEXT NOT NULL DEFAULT '',
ADD COLUMN "reviewerName" TEXT NOT NULL DEFAULT '',
ADD COLUMN "statusNoteCs" TEXT NOT NULL DEFAULT '',
ADD COLUMN "statusNoteEn" TEXT NOT NULL DEFAULT '',
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "reviewRequestedAt" TIMESTAMP(3),
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "publishedAt" TIMESTAMP(3),
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "lockedAt" TIMESTAMP(3);

-- Backfill workflow from the existing semafor state.
UPDATE "ads"
SET "workflowStatus" = CASE
  WHEN "status" = 'REVIEW' THEN 'READY_FOR_REVIEW'::"AdWorkflowStatus"
  WHEN "status" = 'READY' THEN 'APPROVED'::"AdWorkflowStatus"
  ELSE 'NEEDS_DATA'::"AdWorkflowStatus"
END;

-- CreateTable
CREATE TABLE "ad_versions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL,
    "noteCs" TEXT NOT NULL DEFAULT '',
    "noteEn" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ads_tenantId_workflowStatus_idx" ON "ads"("tenantId", "workflowStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ad_versions_adId_version_key" ON "ad_versions"("adId", "version");

-- CreateIndex
CREATE INDEX "ad_versions_tenantId_createdAt_idx" ON "ad_versions"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ad_versions_adId_createdAt_idx" ON "ad_versions"("adId", "createdAt");

-- CreateIndex
CREATE INDEX "approvals_tenantId_status_idx" ON "approvals"("tenantId", "status");

-- CreateIndex
CREATE INDEX "approvals_adId_createdAt_idx" ON "approvals"("adId", "createdAt");

-- AddForeignKey
ALTER TABLE "ad_versions" ADD CONSTRAINT "ad_versions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_versions" ADD CONSTRAINT "ad_versions_adId_fkey" FOREIGN KEY ("adId") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_adId_fkey" FOREIGN KEY ("adId") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
