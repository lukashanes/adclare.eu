import assert from "node:assert/strict";
import { test } from "node:test";
import { loadSource } from "./load-source.mjs";

const { requestIp } = await loadSource("src/lib/request-ip.ts");
const cases = [
  { path: "login/request-link", limit: 8, body: (id) => ({ email: `TEST-${id}@example.invalid` }) },
  { path: "signup", limit: 5, body: (id) => ({ email: `TEST-${id}@example.invalid`, name: "TEST", organizationName: "TEST" }) },
  { path: "invite/[token]/accept", limit: 10, body: () => ({ name: "TEST" }) },
];

async function endpoint(path, loginService) {
  const buckets = new Map();
  const calls = { operations: 0, rate: [], verify: true };
  const operation = async () => { calls.operations++; return { ok: true }; };
  const { POST } = await loadSource(`src/app/api/${path}/route.ts`, {
    "@/lib/app-auth": { requestAppLoginLink: loginService ?? operation },
    "@/lib/signup": { createSignupWorkspace: operation },
    "@/lib/workspace-db": { acceptInvitation: operation, normalizeLocale: () => "cs" },
    "@/lib/turnstile": { verifyTurnstileToken: async () => ({ ok: calls.verify }) },
    "@/lib/rate-limit": {
      requestIp,
      rateLimitHeaders: (result) => ({ "X-RateLimit-Remaining": String(result.remaining) }),
      checkRateLimit: async (options) => {
        calls.rate.push(options);
        const key = JSON.stringify([options.scope, options.identifier]);
        const count = (buckets.get(key) ?? 0) + 1;
        buckets.set(key, count);
        return { allowed: count <= options.limit, remaining: Math.max(0, options.limit - count) };
      },
    },
  });
  return {
    calls,
    post: (body, token = "TEST-token", headers = { "x-real-ip": "192.0.2.1" }) => POST(new Request(`https://adclare.test/api/${path}`, {
      method: "POST", headers: { host: "adclare.test", origin: "https://adclare.test", ...headers }, body: JSON.stringify(body),
    }), { params: Promise.resolve({ token }) }),
  };
}

for (const { path, limit, body } of cases) {
  for (const headers of [{ "x-real-ip": "192.0.2.1" }, {}, { "x-real-ip": "invalid", "x-forwarded-for": "198.51.100.1" }]) {
    test(`${path}: distinct users do not share the small target limit (${JSON.stringify(headers)})`, async () => {
      const { post, calls } = await endpoint(path);
      for (let i = 0; i <= limit; i++) assert.equal((await post(body(i), `TEST-token-${i}`, headers)).status, 200);
      assert.equal(calls.operations, limit + 1);
      assert.ok(calls.rate.every(({ identifier }) => identifier !== "unknown"));
    });
  }
  for (const headers of [{ "x-real-ip": "192.0.2.1" }, {}]) {
    test(`${path}: repeated target remains limited (${JSON.stringify(headers)})`, async () => {
      const { post, calls } = await endpoint(path);
      for (let i = 0; i < limit; i++) assert.equal((await post(body(1), "TEST-token", headers)).status, 200);
      const response = await post(body(1), "TEST-token", headers);
      assert.equal(response.status, 429);
      assert.equal(response.headers.get("X-RateLimit-Remaining"), "0");
      assert.equal(calls.operations, limit);
      assert.ok(!JSON.stringify(calls.rate).includes("TEST-token"), "raw invitation tokens must not be stored in rate buckets");
    });
  }
  test(`${path}: rotating targets cannot bypass the aggregate IP limit`, async () => {
    const { post, calls } = await endpoint(path);
    for (let i = 0; i < limit * 10; i++) assert.equal((await post(body(i), `TEST-token-${i}`)).status, 200);
    assert.equal((await post(body("last"), "TEST-token-last")).status, 429);
    assert.equal(calls.operations, limit * 10);
  });
}

test("failed verification does not consume another IP's target allowance", async () => {
  const { post, calls } = await endpoint("login/request-link");
  calls.verify = false;
  for (let i = 0; i < 8; i++) assert.equal((await post({ email: "TEST-user@example.invalid" })).status, 403);
  calls.verify = true;
  assert.equal((await post({ email: "TEST-user@example.invalid" }, "", { "x-real-ip": "198.51.100.1" })).status, 200);
  assert.equal(calls.operations, 1);
});

test("the existing email service limits recipients across IPs and normalizes case", async (t) => {
  const keys = ["CLOUDFLARE_EMAIL_ACCOUNT_ID", "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_EMAIL_API_TOKEN"];
  const previous = keys.map((key) => process.env[key]);
  keys.forEach((key) => delete process.env[key]);
  t.after(() => keys.forEach((key, i) => { if (previous[i] !== undefined) process.env[key] = previous[i]; }));
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  const tokens = [];
  let emails = 0;
  const { requestAppLoginLink } = await loadSource("src/lib/app-auth.ts", {
    "@/generated/prisma/client": { EmailStatus: { PENDING_PROVIDER: "PENDING_PROVIDER" }, MembershipStatus: { ACTIVE: "ACTIVE" } },
    "@/lib/instance-config": { publicAppUrl: () => "https://adclare.test", defaultEmailFrom: () => "TEST@example.invalid", logPendingEmailLink: () => {} },
    "@/lib/prisma": { prisma: {
      user: { findUnique: async () => ({ memberships: [{ tenantId: "TEST" }] }) },
      loginToken: {
        findMany: async ({ where, take }) => tokens.filter((token) => token.email === where.email && token.createdAt >= where.createdAt.gte).slice(-take).reverse(),
        create: async ({ data }) => tokens.push({ ...data, createdAt: new Date(now) }),
      },
      emailMessage: { create: async () => { emails++; return { id: "TEST" }; } },
      auditLog: { create: async () => ({}) },
    } },
  });
  const { post } = await endpoint("login/request-link", requestAppLoginLink);
  for (let i = 0; i < 6; i++) {
    const response = await post({ email: i % 2 ? "test-USER@example.invalid" : " TEST-user@example.invalid " }, "", { "x-real-ip": `192.0.2.${i + 1}` });
    assert.equal(response.status, 200, "suppression must not disclose account information");
    now += 3 * 60 * 1000;
  }
  assert.equal(emails, 5, "the sixth sequential request is suppressed across IPs");
  await post({ email: "TEST-other@example.invalid" }, "", { "x-real-ip": "198.51.100.1" });
  assert.equal(emails, 6, "another recipient keeps its own allowance");
  await post({ email: "TEST-other@example.invalid" }, "", { "x-real-ip": "198.51.100.2" });
  assert.equal(emails, 6, "the two-minute cooldown also applies across IPs");
});
