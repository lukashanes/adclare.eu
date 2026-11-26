import assert from "node:assert/strict";
import { test } from "node:test";
import { loadSource } from "./load-source.mjs";

test("login retains recipient normalization, five hourly links and the two-minute cooldown", async (t) => {
  const keys = ["CLOUDFLARE_EMAIL_ACCOUNT_ID", "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_EMAIL_API_TOKEN"];
  const previous = keys.map(key => process.env[key]);
  keys.forEach(key => delete process.env[key]);
  t.after(() => keys.forEach((key, i) => { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i]; }));
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  const tokens = [];
  let emails = 0;
  const { requestAppLoginLink } = await loadSource("src/lib/app-auth.ts", {
    "@/generated/prisma/client": { EmailStatus: { PENDING_PROVIDER: "PENDING_PROVIDER" }, MembershipStatus: { ACTIVE: "ACTIVE" } },
    "@/lib/email-policy": { reserveEmailQuota: async () => ({ allowed: true }), notifyEmailQuota: async () => {} },
    "@/lib/instance-config": { publicAppUrl: () => "https://adclare.test", defaultEmailFrom: () => "TEST@example.invalid", logPendingEmailLink: () => {} },
    "@/lib/prisma": { prisma: {
      user: { findUnique: async () => ({ memberships: [{ tenantId: "TEST" }] }) },
      loginToken: {
        findMany: async ({ where, take }) => tokens.filter(token => token.email === where.email && token.createdAt >= where.createdAt.gte).slice(-take).reverse(),
        create: async ({ data }) => tokens.push({ ...data, createdAt: new Date(now) }),
      },
      emailMessage: { create: async () => { emails++; return { id: "TEST" }; } },
      auditLog: { create: async () => ({}) },
    } },
  });
  for (let i = 0; i < 6; i++) {
    await requestAppLoginLink(i % 2 ? "TEST-user@example.invalid" : " test-USER@example.invalid ");
    now += 3 * 60 * 1000;
  }
  assert.equal(emails, 5);
  await requestAppLoginLink("TEST-other@example.invalid");
  assert.equal(emails, 6);
  await requestAppLoginLink("TEST-other@example.invalid");
  assert.equal(emails, 6);
});
