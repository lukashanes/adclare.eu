import { prisma } from "@/lib/prisma";
import { defaultEmailFrom } from "@/lib/instance-config";

export const TEAM_EMAIL_LIMIT = 200;
export const UNVERIFIED_EMAIL_LIMIT = 20;
export const VISITOR_EMAIL_LIMIT = 100;

export function teamEmailRecipient() {
  return process.env.SUPPORT_EMAIL?.trim() || "support@adclare.eu";
}

export function emailProviderConfigured() {
  return Boolean((process.env.CLOUDFLARE_EMAIL_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID)?.trim()
    && process.env.CLOUDFLARE_EMAIL_API_TOKEN?.trim());
}

export function emailQuotaDay(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Prague", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

// Reservations count attempts, including failures. Never refund an uncertain
// delivery: a timeout may have occurred after the provider accepted the email.
export async function reserveEmailQuota(category: "team" | "unverified" | "visitor") {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(2147291803)`;
    // Read the database wall clock after waiting for the lock, including midnight.
    const [clock] = await tx.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`;
    const day = emailQuotaDay(clock.now);
    const quota = await tx.emailDailyQuota.upsert({ where: { day }, create: { day }, update: {} });
    // Reserve one of the 200 team slots for the single daily limit alert.
    const allowed = category === "visitor" ? quota.visitorCount < VISITOR_EMAIL_LIMIT
      : quota.teamCount < TEAM_EMAIL_LIMIT - Number(!quota.alertClaimed)
        && (category !== "unverified" || quota.unverifiedCount < UNVERIFIED_EMAIL_LIMIT);
    const alert = !allowed && !quota.alertClaimed && quota.teamCount < TEAM_EMAIL_LIMIT;
    await tx.emailDailyQuota.update({
      where: { day },
      data: {
        teamCount: { increment: Number(allowed && category !== "visitor") + Number(alert) },
        unverifiedCount: { increment: Number(allowed && category === "unverified") },
        visitorCount: { increment: Number(allowed && category === "visitor") },
        ...(alert ? { alertClaimed: true, alertStatus: "RESERVED" } : {}),
      },
    });
    return { allowed, alert, day };
  });
}

export async function sendPolicyEmail(to: string, subject: string, text: string) {
  if (!emailProviderConfigured()) return "PENDING_PROVIDER";
  try {
    const account = (process.env.CLOUDFLARE_EMAIL_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/email/sending/send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_EMAIL_API_TOKEN!.trim()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: defaultEmailFrom(), to, subject, text }),
      signal: AbortSignal.timeout(10_000),
    });
    const result = await response.json().catch(() => ({}));
    return response.ok && result.success === true && !result.result?.permanent_bounces?.includes(to) ? "SENT" : "FAILED";
  } catch {
    return "FAILED";
  }
}

export async function notifyEmailQuota(reservation: Awaited<ReturnType<typeof reserveEmailQuota>>) {
  if (!reservation.alert) return;
  const status = await sendPolicyEmail(teamEmailRecipient(), "Adclare: denní limit e-mailů", [
    `Dne ${reservation.day} byl dosažen denní limit e-mailů pro tento web.`,
    "Další podání zůstávají uložená bez e-mailu. Kontrolu zadržených a podezřelých podání zajišťuje admin@aenze.com.",
  ].join("\n"));
  await prisma.emailDailyQuota.update({ where: { day: reservation.day }, data: { alertStatus: status } });
}
