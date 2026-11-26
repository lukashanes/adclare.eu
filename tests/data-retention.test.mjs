import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { loadSource } from "./load-source.mjs";

const now = new Date("2026-11-25T12:00:00.000Z");
const ago = (days, offset = 0) => new Date(now.getTime() - days * 86_400_000 + offset);

function fixture({ locked = true, fail = false } = {}) {
  const rows = {
    emailMessage: ["PENDING_PROVIDER", "SENT", "FAILED"].flatMap((status) => [
      { id: `old-${status}`, status, createdAt: ago(1095), error: "TEST", providerMessageId: "TEST" },
      { id: `keep-${status}`, status, createdAt: ago(1095, 1), error: "TEST", providerMessageId: "TEST" },
    ]).concat([
      { id: "retry-old-invitation", createdAt: ago(1), invitation: { createdAt: ago(1096) } },
      { id: "recent-diagnostic", createdAt: ago(90, 1), error: "TEST", providerMessageId: "TEST" },
    ]),
    invitation: ["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"].flatMap((status) => [
      { id: `old-${status}`, status, createdAt: ago(1095), updatedAt: now },
      { id: `keep-${status}`, status, createdAt: ago(1095, 1) },
    ]),
    loginToken: [{ id: "old", createdAt: ago(90) }, { id: "keep", createdAt: ago(90, 1) }],
    userSession: [{ id: "expired", expiresAt: now }, { id: "active", expiresAt: new Date(now.getTime() + 1) }],
    rateLimitBucket: [
      { id: "old", resetAt: ago(29), updatedAt: ago(30) },
      { id: "recent", resetAt: ago(1), updatedAt: ago(30, 1) },
      { id: "active", resetAt: new Date(now.getTime() + 1), updatedAt: ago(30) },
    ],
    auditLog: [
      { id: "old-login", action: "request_login_link", createdAt: ago(90) },
      { id: "old-invitation", action: "create_invitation", createdAt: ago(90) },
      { id: "recent-login", action: "login_magic_link", createdAt: ago(90, 1) },
      { id: "business-archive", action: "publish_ad", createdAt: ago(1096) },
    ],
  };
  function matches(row, where) {
    return Object.entries(where).every(([key, value]) => {
      if (key === "OR") return value.some((condition) => matches(row, condition));
      if (Object.hasOwn(value, "lte")) return row[key] !== undefined && row[key] <= value.lte;
      if (Object.hasOwn(value, "in")) return value.in.includes(row[key]);
      if (Object.hasOwn(value, "not")) return row[key] !== value.not;
      return row[key] && matches(row[key], value);
    });
  }
  const tx = Object.fromEntries(Object.keys(rows).map((model) => [model, {
    deleteMany: async ({ where }) => {
      if (fail && model === "invitation") throw new Error("TEST-private-database-error");
      const before = rows[model].length;
      rows[model] = rows[model].filter((row) => !matches(row, where));
      return { count: before - rows[model].length };
    },
    updateMany: async ({ where, data }) => {
      let count = 0;
      for (const row of rows[model]) if (matches(row, where)) { Object.assign(row, data); count++; }
      return { count };
    },
  }]));
  tx.$queryRaw = async () => [{ locked, now }];
  return {
    rows,
    prisma: {
      $transaction: async (callback) => {
        const backup = structuredClone(rows);
        try { return await callback(tx); }
        catch (error) { Object.assign(rows, backup); throw error; }
      },
    },
  };
}

test("forms expire after exactly 1095 days, including all email and invitation states and later retries", async () => {
  const { rows, prisma } = fixture();
  const { cleanupPersonalData } = await loadSource("src/lib/data-retention.ts", { "@/lib/prisma": { prisma } });
  const result = await cleanupPersonalData(now);
  assert.equal(result.emails, 4);
  assert.equal(result.invitations, 4);
  assert.deepEqual(rows.emailMessage.map(({ id }) => id), ["keep-PENDING_PROVIDER", "keep-SENT", "keep-FAILED", "recent-diagnostic"]);
  assert.ok(rows.invitation.every(({ id }) => id.startsWith("keep-")));
  assert.ok(rows.emailMessage.filter(({ id }) => id.startsWith("keep-")).every(({ error, providerMessageId }) => !error && !providerMessageId));
  assert.equal(rows.emailMessage.find(({ id }) => id === "recent-diagnostic").error, "TEST");
  const repeat = await cleanupPersonalData(now);
  assert.equal(repeat.emails, 0, "a repeat run is idempotent");
  assert.equal(repeat.emailDiagnostics, 0, "already cleared diagnostics are not rewritten");
});

test("technical cleanup respects 30/90-day boundaries and leaves live limits, accounts and the business archive alone", async () => {
  const { rows, prisma } = fixture();
  const { cleanupPersonalData } = await loadSource("src/lib/data-retention.ts", { "@/lib/prisma": { prisma } });
  await cleanupPersonalData();
  assert.deepEqual(rows.loginToken.map(({ id }) => id), ["keep"]);
  assert.deepEqual(rows.userSession.map(({ id }) => id), ["active"]);
  assert.deepEqual(rows.rateLimitBucket.map(({ id }) => id), ["recent", "active"]);
  assert.deepEqual(rows.auditLog.map(({ id }) => id), ["recent-login", "business-archive"]);
  // No user/tenant/ad/asset delegates are provided: touching them fails the test.
});

test("an overlapping cleanup skips and a failed transaction propagates failure without partial deletion", async () => {
  for (const options of [{ locked: false }, { fail: true }]) {
    const { rows, prisma } = fixture(options);
    const before = structuredClone(rows);
    const { cleanupPersonalData } = await loadSource("src/lib/data-retention.ts", { "@/lib/prisma": { prisma } });
    if (options.fail) await assert.rejects(cleanupPersonalData(now), /TEST-private/);
    else assert.deepEqual(await cleanupPersonalData(now), { skipped: true });
    assert.deepEqual(rows, before);
  }
});

test("the worker runs immediately, retries hourly after failure and logs no underlying error", async () => {
  const { runRetentionWorker } = await loadSource("src/lib/retention-worker.ts");
  let runs = 0;
  const reports = [];
  const waits = [];
  const stop = new Error("TEST-stop");
  await assert.rejects(runRetentionWorker(
    async () => { runs++; if (runs === 1) throw new Error("TEST-private"); },
    async (ms) => { waits.push(ms); if (runs === 2) throw stop; },
    (ok) => reports.push(ok),
    true,
  ), (error) => error === stop);
  assert.deepEqual(reports, [false, true]);
  assert.deepEqual(waits, [3_600_000, 3_600_000]);
  await assert.rejects(runRetentionWorker(async () => { throw new Error("TEST-private"); }, async () => {}, () => {}, false),
    { message: "Personal data cleanup failed." });
});

test("the SQL guard permits only expired technical deletes and deployment starts the worker", async () => {
  const policy = await loadSource("src/lib/retention-policy.ts");
  assert.equal(policy.FORM_RETENTION_DAYS, 1095);
  const sql = await readFile("prisma/migrations/20261125120000_auth_log_retention/migration.sql", "utf8");
  const sqlActions = [...sql.matchAll(/'([a-z_]+)'/g)].map(([, action]) => action).filter((action) => action !== "DELETE");
  assert.deepEqual(sqlActions, policy.TECHNICAL_AUDIT_ACTIONS);
  assert.ok(sql.includes(`INTERVAL '${policy.TECHNICAL_RETENTION_DAYS} days'`));
  assert.match(sql, /TG_OP = 'DELETE'/);
  assert.match(sql, /RAISE EXCEPTION 'audit_logs are append-only'/);
  const compose = await readFile("docker-compose.prod.yml", "utf8");
  assert.match(compose, /retention:[\s\S]*?target: retention[\s\S]*?restart: unless-stopped/);
  assert.match(await readFile("Dockerfile", "utf8"), /FROM migrator AS retention[\s\S]*?"--watch"/);
  assert.match(await readFile("docker-compose.yml", "utf8"), /retention:[\s\S]*?target: retention[\s\S]*?condition: service_completed_successfully/);
});
