import { prisma } from "@/lib/prisma";
import {
  FORM_RETENTION_DAYS,
  RATE_LIMIT_RETENTION_DAYS,
  TECHNICAL_AUDIT_ACTIONS,
  TECHNICAL_RETENTION_DAYS,
  retentionCutoff,
} from "@/lib/retention-policy";

export async function cleanupPersonalData(at?: Date) {
  return prisma.$transaction(async (tx) => {
    const [lock] = await tx.$queryRaw<Array<{ locked: boolean; now: Date }>>`
      SELECT pg_try_advisory_xact_lock(2147291802) AS locked, CURRENT_TIMESTAMP AS now
    `;
    if (!lock?.locked) return { skipped: true };

    // Use the same database clock as the audit trigger, even if an application
    // host's clock differs. An explicit time is only needed by offline tests.
    const now = at ?? lock.now;
    const formCutoff = retentionCutoff(now, FORM_RETENTION_DAYS);
    const technicalCutoff = retentionCutoff(now, TECHNICAL_RETENTION_DAYS);
    const rateLimitCutoff = retentionCutoff(now, RATE_LIMIT_RETENTION_DAYS);

    // No status filter: pending, failed and successfully sent correspondence
    // expire alike. Retrying an invitation must not restart its retention.
    const emails = await tx.emailMessage.deleteMany({
      where: {
        OR: [
          { createdAt: { lte: formCutoff } },
          { invitation: { createdAt: { lte: formCutoff } } },
        ],
      },
    });
    const invitations = await tx.invitation.deleteMany({
      where: { createdAt: { lte: formCutoff } },
    });
    const emailDiagnostics = await tx.emailMessage.updateMany({
      where: {
        createdAt: { lte: technicalCutoff },
        OR: [{ error: { not: "" } }, { providerMessageId: { not: "" } }],
      },
      data: { error: "", providerMessageId: "" },
    });
    const tokens = await tx.loginToken.deleteMany({
      where: { createdAt: { lte: technicalCutoff } },
    });
    const sessions = await tx.userSession.deleteMany({
      where: { expiresAt: { lte: now } },
    });
    const rateLimits = await tx.rateLimitBucket.deleteMany({
      where: { resetAt: { lte: now }, updatedAt: { lte: rateLimitCutoff } },
    });
    const auditLogs = await tx.auditLog.deleteMany({
      where: {
        action: { in: TECHNICAL_AUDIT_ACTIONS },
        createdAt: { lte: technicalCutoff },
      },
    });

    return {
      skipped: false,
      emails: emails.count,
      invitations: invitations.count,
      emailDiagnostics: emailDiagnostics.count,
      tokens: tokens.count,
      sessions: sessions.count,
      rateLimits: rateLimits.count,
      auditLogs: auditLogs.count,
    };
  }, { timeout: 60_000 });
}
