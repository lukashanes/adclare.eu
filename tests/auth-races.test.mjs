import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { loadSource } from "./load-source.mjs";

const schema = await readFile("prisma/schema.prisma", "utf8");
const enums = Object.fromEntries([...schema.matchAll(/enum (\w+) \{([^}]+)\}/g)].map(([, name, body]) =>
  [name, Object.fromEntries(body.trim().split(/\s+/).map((value) => [value, value]))],
));

for (const mode of ["first-run", "open"]) {
  test(`concurrent ${mode} signup grants the installation admin role once`, async (t) => {
    const previous = process.env.SIGNUP_MODE;
    process.env.SIGNUP_MODE = mode;
    t.after(() => { if (previous === undefined) delete process.env.SIGNUP_MODE; else process.env.SIGNUP_MODE = previous; });
    const tenants = [];
    const roles = [];
    let locked = false;
    let queue = Promise.resolve();
    const tx = {
      $queryRaw: async (query) => { assert.match(query.join(""), /pg_advisory_xact_lock/); locked = true; return [{ one: 1 }]; },
      tenant: {
        count: async () => { assert.equal(locked, true); return tenants.length; },
        findUnique: async ({ where }) => { assert.equal(locked, true); return tenants.find(({ slug }) => slug === where.slug) ?? null; },
        create: async ({ data }) => {
          assert.ok(!tenants.some(({ slug }) => slug === data.slug), "tenant slug must be unique");
          const tenant = { id: `TEST-${tenants.length}`, ...data }; tenants.push(tenant); return tenant;
        },
      },
      user: { upsert: async () => ({ id: "TEST-user" }) },
      organizationUnit: { create: async () => ({}) },
      campaign: { create: async () => ({}) },
      tenantMembership: { create: async ({ data }) => { roles.push(data.role); } },
      auditLog: { create: async () => ({}) },
    };
    const prisma = {
      tenant: { count: async () => tenants.length, findUnique: async () => null },
      tenantMembership: { findFirst: async () => null },
      $transaction: (callback) => {
        const result = queue.then(() => { locked = false; return callback(tx); });
        queue = result.catch(() => {});
        return result;
      },
    };
    const { createSignupWorkspace } = await loadSource("src/lib/signup.ts", {
      "@/generated/prisma/client": enums,
      "@/lib/prisma": { prisma },
      "@/lib/app-auth": { requestAppLoginLink: async () => ({ ok: true }) },
    });
    const results = await Promise.allSettled([1, 2].map((id) => createSignupWorkspace({
      organizationName: "TEST-same-organization", name: `TEST-user-${id}`, email: `TEST-${id}@example.invalid`,
    })));
    assert.equal(roles.filter((role) => role === "SUPER_ADMIN").length, 1);
    assert.equal(tenants.length, mode === "first-run" ? 1 : 2);
    assert.equal(results.filter(({ status }) => status === "fulfilled").length, mode === "first-run" ? 1 : 2);
    if (mode === "open") {
      assert.ok(roles.includes("PARTY_ADMIN"));
      assert.equal(new Set(tenants.map(({ slug }) => slug)).size, 2);
    }
  });
}

test("an invitation revoked after the initial read cannot restore membership", async () => {
  let membershipWrites = 0;
  const invitation = {
    id: "TEST-invitation", tenantId: "TEST-tenant", email: "TEST-user@example.invalid", role: "PARTY_ADMIN",
    status: "PENDING", expiresAt: new Date(Date.now() + 60_000), tenant: { nameCs: "TEST", nameEn: "TEST" },
    orgUnit: null, candidate: null,
  };
  const { acceptInvitation } = await loadSource("src/lib/workspace-db.ts", {
    "@/generated/prisma/client": enums,
    "@/lib/object-storage": { objectStorageStatus: () => ({}) },
    "@/lib/prisma": {
      prisma: {
        invitation: { findUnique: async () => invitation },
        $transaction: async (callback) => callback({
          invitation: { updateMany: async () => ({ count: 0 }), update: async () => ({}) },
          user: { upsert: async () => ({ id: "TEST-user", email: invitation.email }) },
          tenantMembership: { upsert: async () => { membershipWrites++; } },
          auditLog: { create: async () => ({}) },
        }),
      },
    },
  });
  assert.equal(await acceptInvitation("TEST-token", "TEST-user", "cs"), null);
  assert.equal(membershipWrites, 0);
});

const testToken = "TEST-invitation-token";
const tokenHash = (token) => createHash("sha256").update(token).digest("base64url");

async function invitationRace(beforeTransaction = () => {}, afterTransaction = () => {}) {
  const current = {
    id: "TEST-invitation", tenantId: "TEST-tenant", email: "TEST-user@example.invalid", role: "PARTY_ADMIN",
    tokenHash: tokenHash(testToken), status: "PENDING", expiresAt: new Date(Date.now() + 60_000),
    tenant: { nameCs: "TEST", nameEn: "TEST" }, orgUnit: null, candidate: null, emailMessages: [],
  };
  const calls = { membership: 0, audit: [], emails: 0 };
  const matches = (where) =>
    (!where.id || where.id === current.id) &&
    (!where.tokenHash || where.tokenHash === current.tokenHash) &&
    (!where.status || (typeof where.status === "string" ? where.status === current.status : where.status.not !== current.status)) &&
    (!where.expiresAt?.gt || current.expiresAt > where.expiresAt.gt);
  const tx = {
    invitation: {
      updateMany: async ({ where, data }) => {
        if (!matches(where)) return { count: 0 };
        Object.assign(current, data);
        return { count: 1 };
      },
      update: async ({ data }) => { Object.assign(current, data); return { ...current }; },
      findUniqueOrThrow: async () => ({ ...current }),
    },
    user: { upsert: async () => ({ id: "TEST-user", email: current.email }) },
    tenantMembership: { upsert: async () => { calls.membership++; } },
    auditLog: { create: async ({ data }) => { calls.audit.push(data.action); } },
  };
  const api = await loadSource("src/lib/workspace-db.ts", {
    "@/lib/email-policy": { reserveEmailQuota: async () => ({ allowed: true }), notifyEmailQuota: async () => {} },
    "@/generated/prisma/client": enums,
    "@/lib/object-storage": { objectStorageStatus: () => ({}) },
    "@/lib/instance-config": {
      publicAppUrl: () => "https://adclare.test", defaultEmailFrom: () => "TEST@example.invalid", logPendingEmailLink: () => {},
    },
    "@/lib/prisma": { prisma: {
      invitation: {
        findUnique: async ({ where }) => matches(where) ? { ...current } : null,
        findFirst: async () => ({ ...current }),
        update: tx.invitation.update,
      },
      auditLog: tx.auditLog,
      emailMessage: {
        create: async ({ data }) => { calls.emails++; return { id: "TEST-email", ...data }; },
        update: async ({ data }) => ({ id: "TEST-email", ...data }),
      },
      tenantMembership: { findFirst: async () => ({
        tenantId: current.tenantId, userId: "TEST-admin", role: "PARTY_ADMIN", user: { email: "TEST-admin@example.invalid" },
      }) },
      $transaction: async (callback) => {
        await beforeTransaction(current);
        const result = await callback(tx);
        afterTransaction(current);
        return result;
      },
    } },
  });
  return { api, current, calls };
}

test("a token rotated after the initial read cannot grant membership", async () => {
  const { api, calls } = await invitationRace((current) => { current.tokenHash = tokenHash("TEST-replacement-token"); });
  assert.equal(await api.acceptInvitation(testToken, "TEST-user", "cs"), null);
  assert.equal(calls.membership, 0);
  assert.deepEqual(calls.audit, []);
});

test("revocation cannot report success if acceptance won after the initial read", async () => {
  const { api, current, calls } = await invitationRace((invitation) => { invitation.status = "ACCEPTED"; });
  await assert.rejects(api.revokeAppInvitation("TEST-admin", current.id, "cs"), /Přijatou pozvánku už nelze zrušit/);
  assert.equal(current.status, "ACCEPTED");
  assert.deepEqual(calls.audit, []);
});

test("revoking a pending invitation still blocks subsequent acceptance", async () => {
  const { api, current, calls } = await invitationRace();
  assert.equal((await api.revokeAppInvitation("TEST-admin", current.id, "cs")).statusKey, "REVOKED");
  assert.equal(await api.acceptInvitation(testToken, "TEST-user", "cs"), null);
  assert.equal(calls.membership, 0);
  assert.deepEqual(calls.audit, ["revoke_invitation"]);
});

test("concurrent acceptance grants membership and records acceptance once", async () => {
  const { api, current, calls } = await invitationRace();
  const results = await Promise.all([1, 2].map(() => api.acceptInvitation(testToken, "TEST-user", "cs")));
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(current.status, "ACCEPTED");
  assert.equal(calls.membership, 1);
  assert.deepEqual(calls.audit, ["accept_invitation"]);
});

test("an invitation that expires after the initial read cannot grant membership", async () => {
  const { api, calls } = await invitationRace((current) => { current.expiresAt = new Date(Date.now() - 1000); });
  assert.equal(await api.acceptInvitation(testToken, "TEST-user", "cs"), null);
  assert.equal(calls.membership, 0);
  assert.deepEqual(calls.audit, []);
});

for (const status of ["ACCEPTED", "REVOKED"]) {
  test(`retry cannot rotate or email a ${status} invitation`, async () => {
    const { api, current, calls } = await invitationRace();
    current.status = status;
    await assert.rejects(api.retryAppInvitationEmail("TEST-admin", current.id, "cs"), /jen čekající pozvánku/);
    assert.equal(current.tokenHash, tokenHash(testToken));
    assert.equal(calls.emails, 0);
    assert.deepEqual(calls.audit, []);
  });
}

for (const status of ["ACCEPTED", "REVOKED"]) {
  test(`retry loses to ${status} after its initial read`, async () => {
    const { api, current, calls } = await invitationRace((invitation) => { invitation.status = status; });
    await assert.rejects(api.retryAppInvitationEmail("TEST-admin", current.id, "cs"), /jen čekající pozvánku/);
    assert.equal(current.tokenHash, tokenHash(testToken));
    assert.equal(calls.emails, 0);
    assert.deepEqual(calls.audit, []);
  });
}

test("retry of a live invitation rotates the token and queues one email", async () => {
  const { api, current, calls } = await invitationRace();
  const result = await api.retryAppInvitationEmail("TEST-admin", current.id, "cs");
  assert.notEqual(current.tokenHash, tokenHash(testToken));
  assert.equal(result.statusKey, "PENDING");
  assert.equal(calls.emails, 1);
  assert.deepEqual(calls.audit, ["retry_invitation_email"]);
});

test("retry preserves renewal of an expired pending invitation offered by the UI", async () => {
  const { api, current, calls } = await invitationRace();
  current.expiresAt = new Date(Date.now() - 1000);
  const result = await api.retryAppInvitationEmail("TEST-admin", current.id, "cs");
  assert.equal(result.statusKey, "PENDING");
  assert.ok(current.expiresAt > new Date());
  assert.equal(calls.emails, 1);
});

test("acceptance winning during retry commits membership and prevents token rotation", async () => {
  let entered = false;
  let notice;
  const { api, current, calls } = await invitationRace(async () => {
    if (entered) return;
    entered = true;
    notice = await api.acceptInvitation(testToken, "TEST-user", "cs");
  });
  await assert.rejects(api.retryAppInvitationEmail("TEST-admin", current.id, "cs"), /jen čekající pozvánku/);
  assert.equal(notice.status, "ACCEPTED");
  assert.equal(calls.membership, 1);
  assert.equal(calls.emails, 0);
  assert.equal(current.tokenHash, tokenHash(testToken));
});

test("committed acceptance does not query a potentially rotated token again", async () => {
  const { api, calls } = await invitationRace(() => {}, (invitation) => { invitation.tokenHash = tokenHash("TEST-later-token"); });
  const notice = await api.acceptInvitation(testToken, "TEST-user", "cs");
  assert.equal(notice?.status, "ACCEPTED");
  assert.equal(notice.token, testToken);
  assert.equal(calls.membership, 1);
});
