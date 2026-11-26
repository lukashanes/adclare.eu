import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { notifyEmailQuota, reserveEmailQuota, sendPolicyEmail, teamEmailRecipient } from "@/lib/email-policy";

type SubmissionInput = {
  email?: string;
  name?: string;
  organizationName?: string;
  turnstileToken: string;
  adclare_guard: string;
};

export async function receivePublicSubmission(request: Request, kind: "LOGIN" | "SIGNUP" | "INVITE_ACCEPT", input: SubmissionInput, invitationToken?: string) {
  const suspicious = input.adclare_guard.length > 0;
  const verification = suspicious ? { ok: false, skipped: false } : await verifyTurnstileToken(request, input.turnstileToken);
  const verified = verification.ok && !verification.skipped;
  // Explicit allowlist: neither Turnstile nor invitation/login bearer tokens,
  // trap contents, IPs or arbitrary JSON are copied into the submission archive.
  const submission = await prisma.publicSubmission.create({ data: {
    kind,
    email: input.email ?? "",
    name: input.name ?? "",
    organizationName: input.organizationName ?? "",
    invitationTokenHash: invitationToken ? createHash("sha256").update(invitationToken).digest("base64url") : "",
    verification: suspicious ? "SUSPICIOUS" : verified ? "VERIFIED" : "UNVERIFIED",
    state: verified ? "RECEIVED" : "HELD",
    teamEmailStatus: suspicious ? "SUPPRESSED_SUSPICIOUS" : "PENDING",
  } });
  if (!suspicious) {
    // The saved submission is authoritative even if quota/email infrastructure
    // fails. Never turn a saved unverified submission into a rejection.
    try {
      const quota = await reserveEmailQuota(verified ? "team" : "unverified");
      const status = quota.allowed ? await sendPolicyEmail(teamEmailRecipient(),
        `${verified ? "" : "[Neověřeno] "}Adclare: ${kind}`, [
          `Podání: ${submission.id}`, `Typ: ${kind}`, `E-mail: ${input.email ?? ""}`,
          `Jméno: ${input.name ?? ""}`, `Organizace: ${input.organizationName ?? ""}`,
          "Podání je uložené v public_submissions. Vlastník kontroly: admin@aenze.com.",
        ].join("\n")) : "HELD_LIMIT";
      await prisma.publicSubmission.update({ where: { id: submission.id }, data: { teamEmailStatus: status } });
      await notifyEmailQuota(quota);
    } catch {
      // No personal data or provider errors in application logs.
      console.error("[adclare] Submission saved; team notification incomplete.");
    }
  }
  return { id: submission.id, verified, suspicious };
}

export async function markSubmissionProcessed(id: string) {
  await prisma.publicSubmission.update({ where: { id }, data: { state: "PROCESSED" } });
}
