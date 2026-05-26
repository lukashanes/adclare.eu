-- CreateEnum
CREATE TYPE "AdStatus" AS ENUM ('READY', 'WARNING', 'BLOCKED', 'REVIEW');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameCs" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameCs" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "election" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_units" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "nameCs" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ads" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "orgUnitId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "titleCs" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "ownerCs" TEXT NOT NULL,
    "ownerEn" TEXT NOT NULL,
    "mediaTypeCs" TEXT NOT NULL,
    "mediaTypeEn" TEXT NOT NULL,
    "publicationDate" TIMESTAMP(3) NOT NULL,
    "periodCs" TEXT NOT NULL,
    "periodEn" TEXT NOT NULL,
    "payerCs" TEXT NOT NULL,
    "payerEn" TEXT NOT NULL,
    "amount" TEXT NOT NULL DEFAULT '',
    "fundingSourceCs" TEXT NOT NULL DEFAULT '',
    "fundingSourceEn" TEXT NOT NULL DEFAULT '',
    "targetingCs" TEXT NOT NULL DEFAULT '',
    "targetingEn" TEXT NOT NULL DEFAULT '',
    "missingCs" TEXT[],
    "missingEn" TEXT[],
    "status" "AdStatus" NOT NULL,
    "statusLabelCs" TEXT NOT NULL,
    "statusLabelEn" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "adId" TEXT,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "messageCs" TEXT NOT NULL,
    "messageEn" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "campaigns_tenantId_idx" ON "campaigns"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_tenantId_slug_key" ON "campaigns"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "organization_units_tenantId_idx" ON "organization_units"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_units_tenantId_slug_key" ON "organization_units"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "ads_tenantId_status_idx" ON "ads"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ads_tenantId_campaignId_idx" ON "ads"("tenantId", "campaignId");

-- CreateIndex
CREATE INDEX "ads_tenantId_orgUnitId_idx" ON "ads"("tenantId", "orgUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "ads_tenantId_code_key" ON "ads"("tenantId", "code");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_adId_createdAt_idx" ON "audit_logs"("adId", "createdAt");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_units" ADD CONSTRAINT "organization_units_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads" ADD CONSTRAINT "ads_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads" ADD CONSTRAINT "ads_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads" ADD CONSTRAINT "ads_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "organization_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_adId_fkey" FOREIGN KEY ("adId") REFERENCES "ads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
