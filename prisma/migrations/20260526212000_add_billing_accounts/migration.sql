-- CreateEnum
CREATE TYPE "BillingPlan" AS ENUM ('SMALL_PARTY', 'LARGE_PARTY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "BillingMethod" AS ENUM ('STRIPE', 'INVOICE');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PENDING_INVOICE_APPROVAL', 'PAST_DUE', 'PAUSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "billing_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "plan" "BillingPlan" NOT NULL,
    "interval" "BillingInterval" NOT NULL,
    "method" "BillingMethod" NOT NULL,
    "status" "BillingStatus" NOT NULL,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "monthlyPriceEur" INTEGER NOT NULL,
    "yearlyPriceEur" INTEGER NOT NULL,
    "stripeCustomerId" TEXT NOT NULL DEFAULT '',
    "stripeSubscriptionId" TEXT NOT NULL DEFAULT '',
    "invoiceEmail" TEXT NOT NULL DEFAULT '',
    "invoiceApprovedAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodEndsAt" TIMESTAMP(3),
    "noteCs" TEXT NOT NULL DEFAULT '',
    "noteEn" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_accounts_tenantId_key" ON "billing_accounts"("tenantId");

-- CreateIndex
CREATE INDEX "billing_accounts_status_idx" ON "billing_accounts"("status");

-- CreateIndex
CREATE INDEX "billing_accounts_method_idx" ON "billing_accounts"("method");

-- AddForeignKey
ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
