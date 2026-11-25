import assert from "node:assert/strict";
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
        create: async ({ data }) => { const tenant = { id: `TEST-${tenants.length}`, ...data }; tenants.push(tenant); return tenant; },
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
      organizationName: `TEST-organization-${id}`, name: `TEST-user-${id}`, email: `TEST-${id}@example.invalid`,
    })));
    assert.equal(roles.filter((role) => role === "SUPER_ADMIN").length, 1);
    assert.equal(tenants.length, mode === "first-run" ? 1 : 2);
    assert.equal(results.filter(({ status }) => status === "fulfilled").length, mode === "first-run" ? 1 : 2);
    if (mode === "open") assert.ok(roles.includes("PARTY_ADMIN"));
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
