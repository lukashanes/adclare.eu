-- Production hardening for rate limits, Stripe webhook idempotency and richer audit context.
ALTER TABLE "audit_logs"
  ADD COLUMN "actorUserId" TEXT,
  ADD COLUMN "ipAddress" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "userAgent" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "requestId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "metadata" JSONB;

CREATE INDEX "audit_logs_actorUserId_idx" ON "audit_logs"("actorUserId");

CREATE TABLE "rate_limit_buckets" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "identifier" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "resetAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rate_limit_buckets_key_key" ON "rate_limit_buckets"("key");
CREATE INDEX "rate_limit_buckets_scope_identifier_idx" ON "rate_limit_buckets"("scope", "identifier");
CREATE INDEX "rate_limit_buckets_resetAt_idx" ON "rate_limit_buckets"("resetAt");

CREATE TABLE "stripe_webhook_events" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3),
  "error" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stripe_webhook_events_status_idx" ON "stripe_webhook_events"("status");
CREATE INDEX "stripe_webhook_events_type_idx" ON "stripe_webhook_events"("type");
