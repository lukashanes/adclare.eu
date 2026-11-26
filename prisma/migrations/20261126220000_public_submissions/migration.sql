CREATE TABLE "public_submissions" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL DEFAULT '',
    "organizationName" TEXT NOT NULL DEFAULT '',
    "invitationTokenHash" TEXT NOT NULL DEFAULT '',
    "verification" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'HELD',
    "teamEmailStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "public_submissions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "public_submissions_verification_check" CHECK ("verification" IN ('VERIFIED', 'UNVERIFIED', 'SUSPICIOUS'))
);
CREATE INDEX "public_submissions_verification_createdAt_idx" ON "public_submissions"("verification", "createdAt");
CREATE INDEX "public_submissions_email_createdAt_idx" ON "public_submissions"("email", "createdAt");
CREATE INDEX "public_submissions_invitationTokenHash_idx" ON "public_submissions"("invitationTokenHash");

CREATE TABLE "email_daily_quotas" (
    "day" TEXT NOT NULL,
    "teamCount" INTEGER NOT NULL DEFAULT 0,
    "unverifiedCount" INTEGER NOT NULL DEFAULT 0,
    "visitorCount" INTEGER NOT NULL DEFAULT 0,
    "alertClaimed" BOOLEAN NOT NULL DEFAULT false,
    "alertStatus" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "email_daily_quotas_pkey" PRIMARY KEY ("day"),
    CONSTRAINT "email_daily_quotas_counts_check" CHECK (
      "teamCount" BETWEEN 0 AND 200 AND "unverifiedCount" BETWEEN 0 AND 20
      AND "visitorCount" BETWEEN 0 AND 100 AND "unverifiedCount" <= "teamCount"
    )
);
