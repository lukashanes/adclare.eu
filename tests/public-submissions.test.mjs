import assert from "node:assert/strict";
import { test } from "node:test";
import { loadSource } from "./load-source.mjs";

async function fixture({ ok = false, skipped = false, quota = true, failEmail = false, real = false } = {}) {
  const rows = [];
  const mail = [];
  const calls = [];
  const mocks = {
    "@/lib/prisma": { prisma: { publicSubmission: {
      create: async ({ data }) => { calls.push("save"); rows.push({ id: "TEST-id", ...data }); return rows[0]; },
      update: async ({ data }) => Object.assign(rows[0], data),
    } } },
    "@/lib/turnstile": { verifyTurnstileToken: async () => { calls.push("verify"); return { ok, skipped }; } },
    "@/lib/email-policy": {
      reserveEmailQuota: async category => { calls.push(category); return { allowed: quota }; },
      notifyEmailQuota: async () => {}, teamEmailRecipient: () => "TEST-team@example.invalid",
      sendPolicyEmail: async (...args) => { assert.equal(rows.length, 1); mail.push(args); return failEmail ? "FAILED" : "SENT"; },
    },
  };
  if (real) delete mocks["@/lib/turnstile"];
  const { receivePublicSubmission } = await loadSource("src/lib/public-submission.ts", mocks);
  return { rows, mail, calls, receive: (input = {}) => receivePublicSubmission(new Request("https://adclare.test"), "INVITE_ACCEPT", {
    email: "TEST@example.invalid", name: "TEST", turnstileToken: "TEST-secret-token", adclare_guard: "", ...input,
  }, "TEST-invitation-secret") };
}

for (const options of [{}, { ok: false, failEmail: true }, { ok: true, skipped: true }]) {
  test(`unverified submission survives verification/provider failure ${JSON.stringify(options)}`, async () => {
    const { receive, rows, mail } = await fixture(options);
    const result = await receive();
    assert.equal(result.verified, false);
    assert.equal(rows[0].verification, "UNVERIFIED");
    assert.equal(rows[0].state, "HELD");
    assert.match(mail[0][1], /^\[Neověřeno\]/);
    assert.equal(rows[0].teamEmailStatus, options.failEmail ? "FAILED" : "SENT");
    assert.ok(!JSON.stringify({ rows, mail }).includes("TEST-secret-token"));
    assert.ok(!JSON.stringify({ rows, mail }).includes("TEST-invitation-secret"));
  });
}

test("a filled trap is retained as suspicious without any verification or email", async () => {
  const { receive, rows, mail, calls } = await fixture({ ok: true });
  assert.equal((await receive({ adclare_guard: "TEST-trap-secret" })).suspicious, true);
  assert.deepEqual(calls, ["save"]);
  assert.equal(rows[0].verification, "SUSPICIOUS");
  assert.equal(mail.length, 0);
  assert.ok(!JSON.stringify(rows).includes("TEST-trap-secret"));
});

test("quota overflow stores the submission without sending it", async () => {
  const { receive, rows, mail } = await fixture({ quota: false });
  await receive();
  assert.equal(rows[0].teamEmailStatus, "HELD_LIMIT");
  assert.equal(mail.length, 0);
});

test("verified submissions are archived and notified as verified", async () => {
  const { receive, rows, mail } = await fixture({ ok: true });
  assert.equal((await receive()).verified, true);
  assert.equal(rows[0].verification, "VERIFIED");
  assert.equal(rows[0].state, "RECEIVED");
  assert.ok(!mail[0][1].includes("[Neověřeno]"));
});

test("malformed/oversized signal tokens never reject otherwise valid form data", async () => {
  const { parseSignupInput } = await loadSource("src/lib/request-validation.ts");
  for (const turnstileToken of [undefined, 42, {}, "x".repeat(2049)]) {
    const body = parseSignupInput({ email: "TEST@example.invalid", name: "TEST", organizationName: "TEST", turnstileToken });
    assert.equal(body.turnstileToken, "");
    assert.equal(body.adclare_guard, "");
  }
});

test("missing, invalid and unavailable real Turnstile verification all archive unverified submissions", async (t) => {
  const keys = ["TURNSTILE_SECRET_KEY", "TURNSTILE_ALLOWED_HOSTNAMES"];
  const previous = keys.map(key => process.env[key]);
  Object.assign(process.env, { TURNSTILE_SECRET_KEY: "TEST", TURNSTILE_ALLOWED_HOSTNAMES: "adclare.test" });
  t.after(() => keys.forEach((key, i) => { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i]; }));
  let unavailable = false;
  t.mock.method(globalThis, "fetch", async () => {
    if (unavailable) throw new Error("TEST-provider-unavailable");
    return Response.json({ success: false });
  });
  for (const token of ["", "TEST-invalid", "TEST-unavailable"]) {
    unavailable = token === "TEST-unavailable";
    const { receive, rows, mail } = await fixture({ real: true });
    assert.equal((await receive({ turnstileToken: token })).verified, false);
    assert.equal(rows[0].verification, "UNVERIFIED");
    assert.match(mail[0][1], /^\[Neověřeno\]/);
  }
});
