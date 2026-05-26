ALTER TABLE "ads" ADD COLUMN "publicToken" TEXT;

UPDATE "ads"
SET "publicToken" = lower(
  md5("id" || ':' || "code" || ':' || clock_timestamp()::text || ':' || random()::text) ||
  substr(md5(random()::text || ':' || clock_timestamp()::text), 1, 16)
)
WHERE "publicToken" IS NULL;

ALTER TABLE "ads" ALTER COLUMN "publicToken" SET NOT NULL;

CREATE UNIQUE INDEX "ads_publicToken_key" ON "ads"("publicToken");
