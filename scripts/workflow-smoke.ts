#!/usr/bin/env tsx

import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import JSZip from "jszip";

if (!process.env.DATABASE_URL) {
  console.log("Workflow smoke skipped: DATABASE_URL is not set.");
  process.exit(0);
}

const suffix = randomBytes(6).toString("hex");
const tenantSlug = `workflow-smoke-${suffix}`;
const userEmail = `workflow-smoke-${suffix}@example.test`;
let userId = "";

const { prisma } = await import("../src/lib/prisma");
const { MembershipStatus, UserRole } = await import("../src/generated/prisma/client");
const { serializeAppSessionCookie } = await import("../src/lib/app-auth");
const {
  approveAppAd,
  attachAppAdAsset,
  createAppAd,
  getAppAdRecord,
  publishAppAd,
} = await import("../src/lib/workspace/services/ads");
const { getAppAuditPackage, prepareAppAuditExport } = await import("../src/lib/workspace/services/exports");
const { getAppWorkspacePayload } = await import("../src/lib/workspace/services/shared");
const { getPublicRepositoryPayload, getTransparencyNotice } = await import("../src/lib/workspace/services/public-repository");
const { verifyAuditEntries } = await import("../src/lib/audit");
const { GET: getQrPackage } = await import("../src/app/api/app/ads/[code]/qr-package/route");
const { GET: getAuditPackageRoute, POST: prepareAuditPackageRoute } = await import("../src/app/api/app/ads/[code]/audit-export/route");
const { GET: getArchivePackageRoute } = await import("../src/app/api/app/exports/archive/route");

function tokenHash(value: string) {
  return createHash("sha256").update(value).digest("base64url");
}

async function zipEntries(response: Response) {
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /application\/zip/);

  const bytes = await response.arrayBuffer();
  assert.ok(bytes.byteLength > 500);

  const zip = await JSZip.loadAsync(bytes);
  return Object.keys(zip.files);
}

try {
  await prisma.$queryRaw`SELECT 1`;
} catch (error) {
  console.error("Workflow smoke failed: PostgreSQL is not reachable through DATABASE_URL.");
  console.error(error instanceof Error ? error.message : String(error));
  await prisma.$disconnect();
  process.exit(1);
}

try {
  const now = new Date();
  const future = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);
  const created = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        slug: tenantSlug,
        nameCs: "Workflow Smoke Party",
        nameEn: "Workflow Smoke Party",
        contactEmail: userEmail,
        defaultLocale: "cs",
        publicRepositoryEnabled: true,
      },
    });
    const branch = await tx.organizationUnit.create({
      data: {
        tenantId: tenant.id,
        slug: "praha-1",
        kind: "oblast",
        nameCs: "Praha 1",
        nameEn: "Prague 1",
        contactEmail: userEmail,
      },
    });
    const campaign = await tx.campaign.create({
      data: {
        tenantId: tenant.id,
        slug: "komunalni-2026",
        nameCs: "Komunální kampaň 2026",
        nameEn: "Municipal campaign 2026",
        election: "Komunální volby 2026",
        tags: ["workflow-smoke", "ttpa"],
        startsAt: now,
        endsAt: future,
      },
    });
    const user = await tx.user.create({
      data: {
        email: userEmail,
        name: "Workflow Smoke Admin",
      },
    });
    await tx.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        role: UserRole.PARTY_ADMIN,
        status: MembershipStatus.ACTIVE,
      },
    });

    return { tenant, branch, campaign, user };
  });

  userId = created.user.id;

  const sessionToken = `workflow-smoke-${suffix}-${randomBytes(12).toString("base64url")}`;
  await prisma.userSession.create({
    data: {
      userId,
      tokenHash: tokenHash(sessionToken),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    },
  });
  const cookie = serializeAppSessionCookie(sessionToken);

  const createdAd = await createAppAd(
    userId,
    {
      code: `WF-${suffix.toUpperCase()}`,
      campaignId: created.campaign.id,
      candidateId: "",
      title: "Transparentní plakát pro workflow test",
      branch: created.branch.nameCs,
      owner: created.tenant.nameCs,
      type: "plakát",
      channel: "offline",
      publicationDate: future.toISOString().slice(0, 10),
      period: "červenec až srpen 2026",
      distributionArea: "Praha 1",
      payer: created.tenant.nameCs,
      supplier: "Studio Workflow",
      amount: "12 500 Kč",
      fundingSource: "volební účet",
      language: "cs",
      isTargeted: false,
      targeting: "nepoužito",
      targetAudience: "",
    },
    "cs",
  );

  assert.ok(createdAd);
  assert.equal(createdAd.workflowStatus, "READY_FOR_REVIEW");
  assert.equal(createdAd.missing.length, 0);

  const withAsset = await attachAppAdAsset(
    userId,
    createdAd.id,
    {
      provider: "local",
      bucket: "workflow-smoke",
      key: `workflow-smoke/${createdAd.id}.pdf`,
      publicUrl: "",
      fileName: `${createdAd.id}.pdf`,
      originalName: "workflow-smoke-ad.pdf",
      contentType: "application/pdf",
      byteSize: 128,
      checksumSha256: createHash("sha256").update(`workflow-smoke-${suffix}`).digest("hex"),
    },
    "cs",
  );

  assert.ok(withAsset);
  assert.equal(withAsset.assetCount, 1);
  assert.equal(withAsset.canApprove, true);

  const approved = await approveAppAd(userId, createdAd.id, "cs");
  assert.ok(approved);
  assert.equal(approved.workflowStatus, "APPROVED");

  const published = await publishAppAd(userId, createdAd.id, "cs");
  assert.ok(published);
  assert.equal(published.workflowStatus, "PUBLISHED");
  assert.equal(published.locked, true);

  const record = await getAppAdRecord(userId, createdAd.id, "cs");
  assert.ok(record);
  assert.equal(record.publicUrl, published.publicUrl);

  const publicToken = new URL(published.publicUrl).pathname.split("/").filter(Boolean).at(-1);
  assert.ok(publicToken);

  const notice = await getTransparencyNotice(publicToken, "cs");
  assert.ok(notice);
  assert.equal(notice.status, "published");

  const repoPayload = await getPublicRepositoryPayload(tenantSlug, "cs", { q: published.id }, { limit: 25 });
  assert.ok(repoPayload);
  assert.equal(repoPayload.ads.some((ad) => ad.id === published.id), true);

  const firstWorkspacePage = await getAppWorkspacePayload(userId, "cs", { limit: 25 });
  assert.ok(firstWorkspacePage);
  assert.equal(firstWorkspacePage.adPageInfo.total, 1);
  assert.equal(firstWorkspacePage.ads.length, 1);

  const qrEntries = await zipEntries(
    await getQrPackage(new Request(`http://localhost:3000/api/app/ads/${encodeURIComponent(published.id)}/qr-package?locale=cs`, {
      headers: { cookie },
    }), {
      params: Promise.resolve({ code: published.id }),
    }),
  );
  assert.ok(qrEntries.includes(`${published.id}-qr.svg`));
  assert.ok(qrEntries.includes(`${published.id}-qr.png`));
  assert.ok(qrEntries.includes(`${published.id}-manifest.json`));

  const prepared = await prepareAppAuditExport(userId, published.id);
  assert.equal(prepared, true);
  const serviceAuditPackage = await getAppAuditPackage(userId, published.id, "cs");
  assert.ok(serviceAuditPackage);
  assert.equal(serviceAuditPackage.ad.id, published.id);
  assert.ok(serviceAuditPackage.approvals.length >= 2);
  assert.ok(serviceAuditPackage.assets.length >= 1);

  const prepareResponse = await prepareAuditPackageRoute(
    new Request(`http://localhost:3000/api/app/ads/${encodeURIComponent(published.id)}/audit-export`, {
      method: "POST",
      headers: {
        cookie,
        host: "localhost:3000",
        origin: "http://localhost:3000",
      },
    }),
    { params: Promise.resolve({ code: published.id }) },
  );
  assert.equal(prepareResponse.status, 200);

  const auditEntries = await zipEntries(
    await getAuditPackageRoute(new Request(`http://localhost:3000/api/app/ads/${encodeURIComponent(published.id)}/audit-export?locale=cs`, {
      headers: { cookie },
    }), {
      params: Promise.resolve({ code: published.id }),
    }),
  );
  assert.ok(auditEntries.includes("manifest.json"));
  assert.ok(auditEntries.includes(`${published.id}-control-package.json`));
  assert.ok(auditEntries.includes(`${published.id}-audit-log.json`));
  assert.ok(auditEntries.includes(`${published.id}-audit-log.csv`));
  assert.ok(auditEntries.includes(`${published.id}-history.csv`));
  assert.ok(auditEntries.includes(`${published.id}-approvals.csv`));

  const archiveEntries = await zipEntries(
    await getArchivePackageRoute(new Request("http://localhost:3000/api/app/exports/archive?locale=cs", {
      headers: { cookie },
    })),
  );
  assert.ok(archiveEntries.includes("manifest.json"));
  assert.ok(archiveEntries.includes("audit-log.csv"));
  assert.ok(archiveEntries.includes("audit-log.json"));

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      tenantId: created.tenant.id,
    },
    orderBy: {
      sequence: "asc",
    },
  });
  const auditReport = verifyAuditEntries(auditLogs, true);
  assert.equal(auditReport.broken, 0);
  assert.equal(auditReport.checked, auditReport.verified);
  assert.ok(auditReport.verified >= 8);

  const actions = new Set(auditLogs.map((log) => log.action));
  for (const action of [
    "create_ad",
    "upload_ad_asset",
    "approve_ad",
    "publish_ad",
    "download_qr_package",
    "prepare_audit_export",
    "download_audit_package",
    "export_workspace_archive",
  ]) {
    assert.equal(actions.has(action), true, `Missing audit action: ${action}`);
  }

  for (const log of auditLogs) {
    assert.ok(log.sequence > 0n);
    assert.match(log.entryHash, /^[a-f0-9]{64}$/);
    assert.ok(log.entityType);
    assert.equal(log.outcome, "success");
    assert.equal(log.actorUserId, userId);
  }

  const routeAuditLog = auditLogs.find((log) => log.action === "download_qr_package");
  assert.ok(routeAuditLog?.requestId);
  assert.equal(routeAuditLog?.entityType, "ad");
  assert.ok(routeAuditLog?.entityId);
  assert.equal(routeAuditLog?.entityLabel, published.id);

  console.log("Workflow smoke checks passed.");
} finally {
  await prisma.rateLimitBucket.deleteMany({
    where: {
      identifier: {
        contains: userId || suffix,
      },
    },
  }).catch(() => undefined);

  await prisma.$executeRawUnsafe('ALTER TABLE "audit_logs" DISABLE TRIGGER audit_logs_prevent_update_delete').catch(() => undefined);

  try {
    await prisma.tenant.deleteMany({
      where: {
        slug: {
          startsWith: "workflow-smoke-",
        },
      },
    }).catch(() => undefined);
  } finally {
    await prisma.$executeRawUnsafe('ALTER TABLE "audit_logs" ENABLE TRIGGER audit_logs_prevent_update_delete').catch(() => undefined);
  }

  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: "workflow-smoke-",
      },
    },
  }).catch(() => undefined);

  await prisma.$disconnect();
}
