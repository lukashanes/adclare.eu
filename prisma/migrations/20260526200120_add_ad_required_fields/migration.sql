-- AlterTable
ALTER TABLE "ads" ADD COLUMN     "channel" TEXT NOT NULL DEFAULT 'offline',
ADD COLUMN     "distributionAreaCs" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "distributionAreaEn" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "isTargeted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'cs',
ADD COLUMN     "supplierCs" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "supplierEn" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "targetAudienceCs" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "targetAudienceEn" TEXT NOT NULL DEFAULT '';
