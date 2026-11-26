import assert from "node:assert/strict";
import { test } from "node:test";
import { loadSource } from "./load-source.mjs";

async function fixture() {
  let now = new Date("2026-11-26T12:00:00Z");
  const rows = new Map();
  let lock = Promise.resolve();
  const emailDailyQuota = {
    upsert: async ({ where: { day } }) => {
      if (!rows.has(day)) rows.set(day, { day, teamCount: 0, unverifiedCount: 0, visitorCount: 0, alertClaimed: false });
      return { ...rows.get(day) };
    },
    update: async ({ where: { day }, data }) => {
      const row = rows.get(day);
      for (const [key, value] of Object.entries(data)) row[key] = typeof value === "object" ? row[key] + value.increment : value;
      return row;
    },
  };
  const api = await loadSource("src/lib/email-policy.ts", {
    "@/lib/prisma": { prisma: {
      emailDailyQuota,
      $transaction: (callback) => {
        const result = lock.then(() => callback({ emailDailyQuota, $queryRaw: async (sql) => {
          assert.match(sql.join(""), /pg_advisory_xact_lock|clock_timestamp/);
          return [{ now }];
        } }));
        lock = result.catch(() => {});
        return result;
      },
    } },
  });
  return { api, rows, at: (date) => { now = new Date(date); } };
}

test("concurrent site-wide team reservations leave a slot for exactly one alert within 200", async () => {
  const { api, rows } = await fixture();
  const claims = await Promise.all(Array.from({ length: 230 }, () => api.reserveEmailQuota("team")));
  assert.equal(claims.filter(r => r.allowed).length, 199);
  assert.equal(claims.filter(r => r.alert).length, 1);
  assert.equal(rows.get("2026-11-26").teamCount, 200);
  assert.equal((await api.reserveEmailQuota("unverified")).allowed, false);
});

test("only 20 unverified notifications, verified mail can continue and the alert shares the team budget", async () => {
  const { api, rows } = await fixture();
  const claims = await Promise.all(Array.from({ length: 40 }, () => api.reserveEmailQuota("unverified")));
  assert.equal(claims.filter(r => r.allowed).length, 20);
  assert.equal(claims.filter(r => r.alert).length, 1);
  assert.equal((await api.reserveEmailQuota("team")).allowed, true);
  assert.equal(rows.get("2026-11-26").teamCount, 22);
  for (let i = 0; i < 200; i++) await api.reserveEmailQuota("team");
  assert.equal(rows.get("2026-11-26").teamCount, 200);
});

test("login links and invitations share 100 visitor slots and renew at Prague midnight", async () => {
  const { api, rows, at } = await fixture();
  at("2026-11-26T22:59:59Z");
  const claims = await Promise.all(Array.from({ length: 120 }, () => api.reserveEmailQuota("visitor")));
  assert.equal(claims.filter(r => r.allowed).length, 100);
  assert.equal(claims.filter(r => r.alert).length, 1);
  at("2026-11-26T23:00:00Z");
  assert.equal((await api.reserveEmailQuota("visitor")).allowed, true);
  assert.equal(rows.get("2026-11-27").visitorCount, 1);
  assert.equal(api.emailQuotaDay(new Date("2026-07-10T22:00:00Z")), "2026-07-11");
});

test("provider failures do not return reserved slots or retry a daily alert; no attachments are sent", async (t) => {
  const keys = ["CLOUDFLARE_EMAIL_ACCOUNT_ID", "CLOUDFLARE_EMAIL_API_TOKEN", "SUPPORT_EMAIL"];
  const previous = keys.map(key => process.env[key]);
  Object.assign(process.env, { CLOUDFLARE_EMAIL_ACCOUNT_ID: "TEST", CLOUDFLARE_EMAIL_API_TOKEN: "TEST", SUPPORT_EMAIL: "TEST-team@example.invalid" });
  t.after(() => keys.forEach((key, i) => { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i]; }));
  let sent = 0;
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    const mail = JSON.parse(options.body);
    assert.equal(mail.to, "TEST-team@example.invalid");
    assert.ok(!Object.hasOwn(mail, "attachments"));
    assert.ok(options.signal instanceof AbortSignal);
    sent++;
    throw new Error("TEST-provider-error");
  });
  const { api, rows } = await fixture();
  for (let i = 0; i < 100; i++) await api.reserveEmailQuota("visitor");
  await api.notifyEmailQuota(await api.reserveEmailQuota("visitor"));
  await api.notifyEmailQuota(await api.reserveEmailQuota("visitor"));
  assert.equal(sent, 1);
  assert.equal(rows.get("2026-11-26").alertStatus, "FAILED");
  assert.equal(rows.get("2026-11-26").visitorCount, 100);
});

for (const path of ["src/lib/app-auth.ts", "src/lib/workspace-db.ts"]) {
  test(`${path} suppresses visitor delivery above the shared daily quota`, async (t) => {
    const { readFile } = await import("node:fs/promises");
    const source = await readFile(path, "utf8");
    // Exercise the real delivery function without loading unrelated workspace
    // business operations. All I/O is replaced, including provider fetch.
    const ts = (await import("typescript")).default;
    const name = path.includes("app-auth") ? "deliverLoginEmail" : "deliverEmailMessage";
    const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
    const fn = ast.statements.find(s => ts.isFunctionDeclaration(s) && s.name.text === name);
    const js = ts.transpileModule(fn.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2023 } }).outputText;
    let stored = 0;
    let alerts = 0;
    const prisma = { emailMessage: {
      create: async () => { stored++; return { id: "TEST" }; },
      update: async ({ data }) => { assert.match(data.error, /limit/); return data; },
    } };
    t.mock.method(globalThis, "fetch", async () => { throw new Error("Visitor must not be sent"); });
    const deliver = new Function("prisma", "reserveEmailQuota", "notifyEmailQuota", "escapeHtml", "EmailStatus", "isCloudflareEmailConfigured", `${js}; return ${name};`)(
      prisma, async category => { assert.equal(category, "visitor"); return { allowed: false }; }, async () => { alerts++; }, s => s, { PENDING_PROVIDER: "PENDING_PROVIDER" }, () => true,
    );
    const result = path.includes("app-auth") ? await deliver("TEST", "TEST@example.invalid", "https://adclare.test/TEST") : await deliver({ id: "TEST" });
    assert.match(result.error, /limit/);
    assert.equal(alerts, 1);
    assert.equal(stored, path.includes("app-auth") ? 1 : 0);
  });
}
