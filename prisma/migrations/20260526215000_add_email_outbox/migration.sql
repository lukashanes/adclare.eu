-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING_PROVIDER', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "email_messages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invitationId" TEXT,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL DEFAULT '',
    "provider" TEXT NOT NULL DEFAULT 'resend',
    "providerMessageId" TEXT NOT NULL DEFAULT '',
    "status" "EmailStatus" NOT NULL,
    "error" TEXT NOT NULL DEFAULT '',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_messages_tenantId_status_idx" ON "email_messages"("tenantId", "status");

-- CreateIndex
CREATE INDEX "email_messages_invitationId_idx" ON "email_messages"("invitationId");

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
