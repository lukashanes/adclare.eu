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
  assert.ok(calls.every(({ signal }) => signal instanceof AbortSignal));
});
