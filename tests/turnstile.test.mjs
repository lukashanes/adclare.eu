import assert from "node:assert/strict";
import { test } from "node:test";
import { loadSource } from "./load-source.mjs";

test("Turnstile success must include the configured hostname and a bounded request", async (t) => {
  const previous = Object.fromEntries(["TURNSTILE_SECRET_KEY", "TURNSTILE_ALLOWED_HOSTNAMES"].map((key) => [key, process.env[key]]));
  process.env.TURNSTILE_SECRET_KEY = "TEST-not-a-real-secret";
  process.env.TURNSTILE_ALLOWED_HOSTNAMES = "adclare.test";
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  const { verifyTurnstileToken } = await loadSource("src/lib/turnstile.ts");
  let result = { success: true, hostname: "adclare.test" };
  const calls = [];
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    calls.push(options);
    return Response.json(result);
  });
  const request = new Request("https://adclare.test/api/TEST");
  assert.equal((await verifyTurnstileToken(request, "TEST-token")).ok, true);
  result = { success: true };
  assert.equal((await verifyTurnstileToken(request, "TEST-token")).ok, false);
  result = { success: true, hostname: "attacker.invalid" };
  assert.equal((await verifyTurnstileToken(request, "TEST-token")).ok, false);
  result = { success: true, hostname: "ADCLARE.TEST" };
  assert.equal((await verifyTurnstileToken(request, "TEST-token")).ok, true);
  assert.ok(calls.every(({ signal }) => signal instanceof AbortSignal));
});

test("Turnstile preserves provider errors and falls back to the public app hostname", async (t) => {
  const keys = ["TURNSTILE_SECRET_KEY", "TURNSTILE_ALLOWED_HOSTNAMES", "APP_URL"];
  const previous = keys.map((key) => process.env[key]);
  t.after(() => keys.forEach((key, i) => { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i]; }));
  process.env.TURNSTILE_SECRET_KEY = "TEST-not-a-real-secret";
  process.env.TURNSTILE_ALLOWED_HOSTNAMES = "";
  process.env.APP_URL = "https://adclare.test";
  const { verifyTurnstileToken } = await loadSource("src/lib/turnstile.ts");
  let result = { success: false, "error-codes": ["timeout-or-duplicate"] };
  t.mock.method(globalThis, "fetch", async () => Response.json(result));
  const request = new Request("https://adclare.test/api/TEST");
  assert.deepEqual((await verifyTurnstileToken(request, "TEST-token")).errorCodes, ["timeout-or-duplicate"]);
  result = { success: true, hostname: "adclare.test" };
  assert.equal((await verifyTurnstileToken(request, "TEST-token")).ok, true);
});

test("Turnstile aborts a stalled provider request at its configured timeout", async (t) => {
  const previous = process.env.TURNSTILE_SECRET_KEY;
  process.env.TURNSTILE_SECRET_KEY = "TEST-not-a-real-secret";
  t.after(() => { if (previous === undefined) delete process.env.TURNSTILE_SECRET_KEY; else process.env.TURNSTILE_SECRET_KEY = previous; });
  const timeout = AbortSignal.timeout;
  t.mock.method(AbortSignal, "timeout", (ms) => { assert.equal(ms, 10_000); return timeout(5); });
  t.mock.method(globalThis, "fetch", async (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  }));
  const keepAlive = setInterval(() => {}, 100);
  t.after(() => clearInterval(keepAlive));
  const { verifyTurnstileToken } = await loadSource("src/lib/turnstile.ts");
  assert.deepEqual((await verifyTurnstileToken(new Request("https://adclare.test"), "TEST-token")).errorCodes, ["internal-error"]);
});
