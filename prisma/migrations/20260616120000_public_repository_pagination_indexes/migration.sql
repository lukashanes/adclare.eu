CREATE INDEX IF NOT EXISTS "ads_public_repo_order_idx"
  ON "ads" ("tenantId", "publicationDate" DESC, "code" ASC)
  WHERE "workflowStatus" IN ('PUBLISHED', 'ARCHIVED');

CREATE INDEX IF NOT EXISTS "ads_public_repo_channel_idx"
  ON "ads" ("tenantId", "channel", "publicationDate" DESC, "code" ASC)
  WHERE "workflowStatus" IN ('PUBLISHED', 'ARCHIVED');

CREATE INDEX IF NOT EXISTS "ads_public_repo_status_idx"
  ON "ads" ("tenantId", "status", "publicationDate" DESC, "code" ASC)
  WHERE "workflowStatus" IN ('PUBLISHED', 'ARCHIVED');

CREATE INDEX IF NOT EXISTS "ads_public_repo_campaign_idx"
  ON "ads" ("tenantId", "campaignId", "publicationDate" DESC, "code" ASC)
  WHERE "workflowStatus" IN ('PUBLISHED', 'ARCHIVED');

CREATE INDEX IF NOT EXISTS "ads_public_repo_unit_idx"
  ON "ads" ("tenantId", "orgUnitId", "publicationDate" DESC, "code" ASC)
  WHERE "workflowStatus" IN ('PUBLISHED', 'ARCHIVED');
