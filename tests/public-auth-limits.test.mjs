import assert from "node:assert/strict";
import { test } from "node:test";
import { loadSource } from "./load-source.mjs";

const cases = [
  { path: "login/request-link", body: { email: "TEST@example.invalid" } },
  { path: "signup", body: { email: "TEST@example.invalid", name: "TEST", organizationName: "TEST" } },
  { path: "invite/[token]/accept", body: { name: "TEST" } },
];

for (const { path, body } of cases) {
  for (const verification of ["VERIFIED", "UNVERIFIED", "SUSPICIOUS"]) {
    test(`${path}: ${verification} is saved before any account operation`, async () => {
      const calls = [];
      const operation = async () => { calls.push("operation"); return { ok: true }; };
      const { POST } = await loadSource(`src/app/api/${path}/route.ts`, {
        "@/lib/public-endpoint": { guardPublicEndpoint: async () => null },
        "@/lib/public-submission": {
          receivePublicSubmission: async () => { calls.push("saved"); return { id: "TEST", verified: verification === "VERIFIED", suspicious: verification === "SUSPICIOUS" }; },
          markSubmissionProcessed: async () => calls.push("processed"),
        },
        "@/lib/app-auth": { requestAppLoginLink: operation },
        "@/lib/signup": { createSignupWorkspace: operation },
        "@/lib/workspace-db": { acceptInvitation: operation, normalizeLocale: () => "cs" },
      });
      const response = await POST(new Request(`https://adclare.test/api/${path}`, {
        method: "POST", headers: { host: "adclare.test", origin: "https://adclare.test" }, body: JSON.stringify(body),
      }), { params: Promise.resolve({ token: "TEST-token" }) });
      assert.equal(response.status, 200);
      assert.deepEqual(calls, verification === "VERIFIED" ? ["saved", "operation", "processed"] : ["saved"]);
      if (verification !== "VERIFIED") assert.equal((await response.json()).held, true);
    });
  }
}

test("public API budget is shared across targets, resets after ten seconds and isolates trusted IPs", async () => {
  let now = 0;
  const buckets = new Map();
  const { guardPublicEndpoint } = await loadSource("src/lib/public-endpoint.ts", {
    "@/lib/rate-limit": {
      requestIp: (r) => r.headers.get("x-real-ip") || "unknown",
      rateLimitHeaders: () => ({ "X-RateLimit-Remaining": "0" }),
      checkRateLimit: async ({ scope, identifier, limit, windowMs }) => {
        assert.equal(limit, 20); assert.equal(windowMs, 10_000);
        const key = `${scope}:${identifier}`;
        let row = buckets.get(key);
        if (!row || row.reset <= now) buckets.set(key, row = { count: 0, reset: now + windowMs });
        return { allowed: ++row.count <= limit };
      },
    },
  });
  const request = (i, ip = "192.0.2.1") => new Request(`https://adclare.test/api/${i % 2 ? "health" : "repo/TEST/ads"}?q=${i}`, { headers: { "x-real-ip": ip } });
  for (let i = 0; i < 20; i++) assert.equal(await guardPublicEndpoint(request(i)), null);
  assert.equal((await guardPublicEndpoint(request(21))).status, 429);
  assert.equal(await guardPublicEndpoint(request(22, "192.0.2.2")), null);
  now = 10_000;
  assert.equal(await guardPublicEndpoint(request(23)), null);
});
