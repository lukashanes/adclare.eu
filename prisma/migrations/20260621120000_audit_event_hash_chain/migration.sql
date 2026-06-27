-- Extend audit logs from ad-centric history into a general audit event stream.
ALTER TABLE "audit_logs"
  ADD COLUMN "entityType" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "entityId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "entityLabel" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "actorRole" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "actorScope" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "outcome" TEXT NOT NULL DEFAULT 'success',
  ADD COLUMN "severity" TEXT NOT NULL DEFAULT 'info',
  ADD COLUMN "correlationId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "before" JSONB,
  ADD COLUMN "after" JSONB,
  ADD COLUMN "diff" JSONB,
  ADD COLUMN "sequence" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "previousHash" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "entryHash" TEXT NOT NULL DEFAULT '';

CREATE TABLE "audit_chains" (
  "tenantId" TEXT NOT NULL,
  "lastSequence" BIGINT NOT NULL DEFAULT 0,
  "lastHash" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "audit_chains_pkey" PRIMARY KEY ("tenantId")
);

CREATE INDEX "audit_logs_tenantId_sequence_idx" ON "audit_logs"("tenantId", "sequence");
CREATE INDEX "audit_logs_tenantId_entityType_entityId_idx" ON "audit_logs"("tenantId", "entityType", "entityId");
CREATE INDEX "audit_logs_tenantId_action_createdAt_idx" ON "audit_logs"("tenantId", "action", "createdAt");

ALTER TABLE "audit_chains"
  ADD CONSTRAINT "audit_chains_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "audit_chains" ("tenantId", "lastSequence", "lastHash", "updatedAt")
SELECT "id", 0, '', CURRENT_TIMESTAMP
FROM "tenants"
ON CONFLICT ("tenantId") DO NOTHING;
