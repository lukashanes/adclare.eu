ALTER TABLE "invitations" ADD COLUMN "tokenHash" TEXT;

UPDATE "invitations"
SET "tokenHash" = 'legacy-invalid-' || "id"
WHERE "tokenHash" IS NULL;

ALTER TABLE "invitations" ALTER COLUMN "tokenHash" SET NOT NULL;

DROP INDEX IF EXISTS "invitations_token_key";

ALTER TABLE "invitations" DROP COLUMN "token";

CREATE UNIQUE INDEX "invitations_tokenHash_key" ON "invitations"("tokenHash");
