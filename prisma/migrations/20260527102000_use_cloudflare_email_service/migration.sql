UPDATE "email_messages"
SET "provider" = 'cloudflare_email_service'
WHERE "provider" = 'resend';

ALTER TABLE "email_messages"
ALTER COLUMN "provider" SET DEFAULT 'cloudflare_email_service';
