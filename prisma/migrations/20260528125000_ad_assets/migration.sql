CREATE TABLE "ad_assets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "storageProvider" TEXT NOT NULL DEFAULT 's3',
    "storageBucket" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL DEFAULT '',
    "checksumSha256" TEXT NOT NULL DEFAULT '',
    "uploadedBy" TEXT NOT NULL DEFAULT '',
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ad_assets_storageKey_key" ON "ad_assets"("storageKey");
CREATE INDEX "ad_assets_tenantId_createdAt_idx" ON "ad_assets"("tenantId", "createdAt");
CREATE INDEX "ad_assets_adId_createdAt_idx" ON "ad_assets"("adId", "createdAt");

ALTER TABLE "ad_assets" ADD CONSTRAINT "ad_assets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ad_assets" ADD CONSTRAINT "ad_assets_adId_fkey" FOREIGN KEY ("adId") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
