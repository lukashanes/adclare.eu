ALTER TABLE "tenant_memberships" ADD COLUMN "candidateId" TEXT;
ALTER TABLE "invitations" ADD COLUMN "candidateId" TEXT;

CREATE INDEX "tenant_memberships_tenantId_candidateId_idx" ON "tenant_memberships"("tenantId", "candidateId");
CREATE INDEX "invitations_tenantId_candidateId_idx" ON "invitations"("tenantId", "candidateId");

ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
