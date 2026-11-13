#!/usr/bin/env tsx

import "dotenv/config";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";

if (!process.env.DATABASE_URL) {
  console.log("Audit query smoke skipped: DATABASE_URL is not set.");
  process.exit(0);
}

const suffix = randomBytes(6).toString("hex");
const tenantSlug = `audit-query-smoke-${suffix}`;
const otherTenantSlug = `audit-query-other-${suffix}`;
const adminEmail = `audit-admin-${suffix}@example.test`;
const candidateEmail = `audit-candidate-${suffix}@example.test`;
const otherAdminEmail = `audit-other-${suffix}@example.test`;
const createdUserEmails = [adminEmail, candidateEmail, otherAdminEmail];

const { prisma } = await import("../src/lib/prisma");
const { MembershipStatus, UserRole } = await import("../src/generated/prisma/client");
const { serializeAppSessionCookie } = await import("../src/lib/app-auth");
const { writeSystemAuditEvent } = await import("../src/lib/audit");
const { GET: getAuditEvents } = await import("../src/app/api/app/audit/route");

function tokenHash(value: string) {
  return createHash("sha256").update(value).digest("base64url");
}

async function createSession(userId: string) {
  const token = `audit-query-${randomBytes(24).toString("base64url")}`;

  await prisma.userSession.create({
    data: {
      userId,
      tokenHash: tokenHash(token),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  return serializeAppSessionCookie(token);
}

async function auditRequest(cookie: string, query = "") {
  return getAuditEvents(
    new Request(`http://localhost:3000/api/app/audit${query ? `?${query}` : ""}`, {
      headers: {
        cookie,
      },
    }),
  );
}

async function jsonResponse<T>(response: Response) {
  return (await response.json()) as T;
}

try {
  await prisma.$queryRaw`SELECT 1`;
} catch (error) {
  console.error("Audit query smoke failed: PostgreSQL is not reachable through DATABASE_URL.");
  console.error(error instanceof Error ? error.message : String(error));
  await prisma.$disconnect();
  process.exit(1);
}

try {
  const created = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        slug: tenantSlug,
        nameCs: "Audit Query Smoke",
        nameEn: "Audit Query Smoke",
      },
    });
    const otherTenant = await tx.tenant.create({
      data: {
        slug: otherTenantSlug,
        nameCs: "Other Audit Query Smoke",
        nameEn: "Other Audit Query Smoke",
      },
    });
    const admin = await tx.user.create({
      data: {
        email: adminEmail,
        name: "Audit Admin",
      },
    });
    const candidate = await tx.user.create({
      data: {
        email: candidateEmail,
        name: "Audit Candidate",
      },
    });
    const otherAdmin = await tx.user.create({
      data: {
        email: otherAdminEmail,
        name: "Other Audit Admin",
      },
    });

    await tx.tenantMembership.createMany({
      data: [
        {
          tenantId: tenant.id,
          userId: admin.id,
          role: UserRole.PARTY_ADMIN,
          status: MembershipStatus.ACTIVE,
        },
        {
          tenantId: tenant.id,
          userId: candidate.id,
          role: UserRole.CANDIDATE,
          status: MembershipStatus.ACTIVE,
        },
        {
          tenantId: otherTenant.id,
          userId: otherAdmin.id,
          role: UserRole.PARTY_ADMIN,
          status: MembershipStatus.ACTIVE,
        },
      ],
    });

    return { tenant, otherTenant, admin, candidate, otherAdmin };
  });

  const adminCookie = await createSession(created.admin.id);
  const candidateCookie = await createSession(created.candidate.id);
  const otherAdminCookie = await createSession(created.otherAdmin.id);
  const startedAt = new Date(Date.now() - 2_000);

  const events = [
    {
      actor: "Alpha Reviewer",
      action: "create_ad",
      outcome: "success" as const,
      entityType: "ad",
      entityId: "AD-001",
      requestId: "request-a",
    },
    {
      actor: "Beta Reviewer",
      action: "approve_ad",
      outcome: "success" as const,
      entityType: "ad",
      entityId: "AD-002",
      requestId: "request-b",
    },
    {
      actor: "Alpha Reviewer",
      action: "export_workspace_archive",
      outcome: "success" as const,
      entityType: "workspace",
      entityId: created.tenant.id,
      requestId: "request-c",
    },
    {
      actor: "Beta Reviewer",
      action: "login_denied",
      outcome: "denied" as const,
      entityType: "user_session",
      entityId: created.candidate.id,
      requestId: "request-d",
    },
    {
      actor: "Gamma Operator",
      action: "update_campaign",
      outcome: "failure" as const,
      entityType: "campaign",
      entityId: "CAM-001",
      requestId: "request-e",
    },
  ];

  for (const event of events) {
    await writeSystemAuditEvent({
      tenantId: created.tenant.id,
      actor: event.actor,
      actorUserId: created.admin.id,
      actorRole: UserRole.PARTY_ADMIN,
      actorScope: "Celá strana",
      action: event.action,
      outcome: event.outcome,
      entityType: event.entityType,
      entityId: event.entityId,
      entityLabel: event.entityId,
      messageCs: `Česká zpráva ${event.action}.`,
      messageEn: `English message ${event.action}.`,
      requestContext: {
        requestId: event.requestId,
        correlationId: event.requestId,
        ipAddress: "127.0.0.1",
        userAgent: "audit-query-smoke",
      },
    });
  }

  await writeSystemAuditEvent({
    tenantId: created.otherTenant.id,
    actor: "Alpha Reviewer",
    actorUserId: created.otherAdmin.id,
    actorRole: UserRole.PARTY_ADMIN,
    actorScope: "Celá strana",
    action: "create_ad",
    entityType: "ad",
    entityId: "OTHER-001",
    entityLabel: "OTHER-001",
    messageCs: "Událost jiného tenantu.",
    messageEn: "Other tenant event.",
    requestContext: {
      requestId: "request-other-tenant",
    },
  });

  const endedAt = new Date(Date.now() + 2_000);

  const unauthorized = await getAuditEvents(new Request("http://localhost:3000/api/app/audit"));
  assert.equal(unauthorized.status, 401);
  assert.match(unauthorized.headers.get("cache-control") ?? "", /no-store/);

  const candidateScopeResponse = await auditRequest(candidateCookie);
  assert.equal(candidateScopeResponse.status, 200);
  const candidateScope = await jsonResponse<{ total: number; events: unknown[] }>(candidateScopeResponse);
  assert.equal(candidateScope.total, 0);
  assert.equal(candidateScope.events.length, 0);

  const firstPageResponse = await auditRequest(adminCookie, "page=1&limit=2");
  assert.equal(firstPageResponse.status, 200);
  assert.match(firstPageResponse.headers.get("cache-control") ?? "", /no-store/);
  const firstPage = await jsonResponse<{
    events: Array<{ requestId: string; sequence: string; actorUserId: string }>;
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }>(firstPageResponse);
  assert.equal(firstPage.total, 5);
  assert.equal(firstPage.page, 1);
  assert.equal(firstPage.limit, 2);
  assert.equal(firstPage.events.length, 2);
  assert.equal(firstPage.hasMore, true);
  assert.equal(firstPage.events.some((event) => event.requestId === "request-other-tenant"), false);
  assert.ok(firstPage.events.every((event) => event.actorUserId === created.admin.id));
  assert.ok(firstPage.events.every((event) => /^\d+$/.test(event.sequence)));

  const secondPage = await jsonResponse<{ events: unknown[]; total: number; hasMore: boolean }>(
    await auditRequest(adminCookie, "page=2&limit=2"),
  );
  assert.equal(secondPage.events.length, 2);
  assert.equal(secondPage.total, 5);
  assert.equal(secondPage.hasMore, true);

  const finalPage = await jsonResponse<{ events: unknown[]; total: number; hasMore: boolean }>(
    await auditRequest(adminCookie, "page=3&limit=2"),
  );
  assert.equal(finalPage.events.length, 1);
  assert.equal(finalPage.total, 5);
  assert.equal(finalPage.hasMore, false);

  const filteredCases = [
    ["actor=alpha", 2, "actor"],
    ["action=create_ad", 1, "action"],
    ["entityType=ad", 2, "entityType"],
    ["outcome=denied", 1, "outcome"],
    ["requestId=request-c", 1, "requestId"],
    [`dateFrom=${encodeURIComponent(startedAt.toISOString())}&dateTo=${encodeURIComponent(endedAt.toISOString())}`, 5, "date range"],
    ["dateFrom=2100-01-01", 0, "future date"],
    ["dateTo=2000-01-01", 0, "past date"],
  ] as const;

  for (const [query, expectedTotal, label] of filteredCases) {
    const response = await auditRequest(adminCookie, query);
    assert.equal(response.status, 200, `${label} filter should be accepted`);
    const payload = await jsonResponse<{ total: number; events: unknown[] }>(response);
    assert.equal(payload.total, expectedTotal, `${label} filter returned an unexpected total`);
    assert.equal(payload.events.length, expectedTotal, `${label} filter returned an unexpected page`);
  }

  const combinedResponse = await auditRequest(
    adminCookie,
    `actor=alpha&action=create_ad&entityType=ad&outcome=success&requestId=request-a&dateFrom=${encodeURIComponent(startedAt.toISOString())}&dateTo=${encodeURIComponent(endedAt.toISOString())}`,
  );
  const combined = await jsonResponse<{ total: number; events: Array<{ requestId: string }> }>(combinedResponse);
  assert.equal(combined.total, 1);
  assert.equal(combined.events[0]?.requestId, "request-a");

  const englishResponse = await auditRequest(adminCookie, "requestId=request-a&locale=en");
  const english = await jsonResponse<{ events: Array<{ message: string }> }>(englishResponse);
  assert.equal(english.events[0]?.message, "English message create_ad.");

  const otherTenant = await jsonResponse<{ total: number; events: Array<{ requestId: string }> }>(
    await auditRequest(otherAdminCookie),
  );
  assert.equal(otherTenant.total, 1);
  assert.equal(otherTenant.events[0]?.requestId, "request-other-tenant");

  for (const invalidQuery of [
    "page=0",
    "limit=101",
    "outcome=unknown",
    "dateFrom=2026-02-30",
    "dateFrom=2026-03-01&dateTo=2026-02-01",
    "actor=one&actor=two",
    "unsupported=value",
  ]) {
    const response = await auditRequest(adminCookie, invalidQuery);
    assert.equal(response.status, 400, `${invalidQuery} should be rejected`);
    const payload = await jsonResponse<{ error: string; issues: string[] }>(response);
    assert.ok(payload.error);
    assert.ok(payload.issues.length > 0);
  }

  console.log("Audit query smoke checks passed.");
} finally {
  await prisma.$executeRawUnsafe('ALTER TABLE "audit_logs" DISABLE TRIGGER audit_logs_prevent_update_delete').catch(() => undefined);

  try {
    await prisma.tenant.deleteMany({
      where: {
        slug: {
          in: [tenantSlug, otherTenantSlug],
        },
      },
    }).catch(() => undefined);
  } finally {
    await prisma.$executeRawUnsafe('ALTER TABLE "audit_logs" ENABLE TRIGGER audit_logs_prevent_update_delete').catch(() => undefined);
  }

  await prisma.user.deleteMany({
    where: {
      email: {
        in: createdUserEmails,
      },
    },
  }).catch(() => undefined);

  await prisma.$disconnect();
}
