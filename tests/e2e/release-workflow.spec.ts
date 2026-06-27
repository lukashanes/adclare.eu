import { expect, test } from "@playwright/test";
import {
  buildImportWorkbook,
  closeDb,
  createKnownInvitation,
  createRoleUser,
  expectNoHorizontalOverflow,
  loginAs,
  queryAll,
  queryOne,
  randomSuffix,
  workspace,
  zipEntries,
} from "./helpers";

test.afterAll(async () => {
  await closeDb();
});

test.describe.serial("public release application pass-through", () => {
  const suffix = randomSuffix();
  const completeAdCode = `E2E-${suffix}`.toUpperCase();
  const changesAdCode = `CHG-${suffix}`.toUpperCase();
  const missingAdCode = `MISS-${suffix}`.toUpperCase();
  let campaignId = "";
  let branchName = "Praha 3";
  let createdPublicUrl = "";

  test("login request creates an email record and workspace opens for seed admin", async ({ page }) => {
    await queryAll(`DELETE FROM "rate_limit_buckets" WHERE "scope" = $1 AND "identifier" LIKE $2`, ["login-link", "%:admin@demo-strana.cz"]);
    await page.goto("/login?email=admin@demo-strana.cz");
    const emailInput = page.getByLabel("Pracovní e-mail");
    const loginButton = page.getByRole("button", { name: /Poslat přihlašovací odkaz/ });
    await expect(emailInput).toBeEditable();
    await emailInput.fill("admin@demo-strana.cz");
    await expect(emailInput).toHaveValue("admin@demo-strana.cz");
    await expect(loginButton).toBeEnabled();
    await loginButton.click();
    await expect(page.getByText(/Pokud k e-mailu existuje aktivní přístup/)).toBeVisible();

    const email = await queryOne<{ id: string; status: string }>(
      `SELECT "id", "status" FROM "email_messages" WHERE "toEmail" = $1 AND "subject" = $2 ORDER BY "createdAt" DESC LIMIT 1`,
      ["admin@demo-strana.cz", "Přihlášení do Adclare"],
    );
    expect(email?.id).toBeTruthy();

    await loginAs(page, "admin@demo-strana.cz");
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: /Adclare/i })).toBeVisible();
    await expect(page.getByText("Proces pro každou reklamu")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const data = await workspace(page.request);
    campaignId = data.campaigns.find((campaign) => !campaign.archived)?.id ?? "";
    branchName = data.branches.find((branch) => branch.name === "Praha 3")?.name ?? data.branches[0]?.name ?? branchName;
    expect(campaignId).toBeTruthy();
  });

  test("admin can manage branches, campaigns, candidates and invitations", async ({ page }) => {
    await loginAs(page, "admin@demo-strana.cz");
    await page.goto("/app#branches");

    const branchSection = page.locator("#branches");
    branchName = `E2E oblast ${suffix}`;
    await branchSection.getByPlaceholder("Název pobočky").fill(branchName);
    await branchSection.getByRole("button", { name: "Přidat" }).click();
    await expect.poll(async () => (await workspace(page.request)).branches.some((item) => item.name === branchName)).toBeTruthy();

    let data = await workspace(page.request);
    const branch = data.branches.find((item) => item.name === branchName);
    expect(branch?.id).toBeTruthy();

    await page.goto("/app#campaigns");
    const campaignsSection = page.locator("#campaigns");
    await campaignsSection.getByPlaceholder("Název kampaně").fill(`E2E kampaň ${suffix}`);
    await campaignsSection.getByPlaceholder("Tagy oddělené čárkou").fill("e2e, ttpa");
    await campaignsSection.getByRole("button", { name: "Přidat" }).click();
    await expect.poll(async () => (await workspace(page.request)).campaigns.some((campaign) => campaign.name === `E2E kampaň ${suffix}`)).toBeTruthy();

    data = await workspace(page.request);
    campaignId = data.campaigns.find((campaign) => campaign.name === `E2E kampaň ${suffix}`)?.id ?? "";
    expect(campaignId).toBeTruthy();

    const candidatesSection = page.locator("#candidates");
    await candidatesSection.getByPlaceholder("Jméno kandidáta").fill(`E2E Kandidát ${suffix}`);
    await candidatesSection.locator("select").first().selectOption({ label: branchName });
    await candidatesSection.getByPlaceholder("Číslo").first().fill("88");
    await candidatesSection.getByRole("button", { name: "Přidat" }).click();
    await expect.poll(async () => (await workspace(page.request)).candidates.some((candidate) => candidate.name === `E2E Kandidát ${suffix}`)).toBeTruthy();

    const inviteResponse = await page.request.post("/api/app/users?locale=cs", {
      data: { email: `designer-${suffix}@example.test`, role: "DESIGNER", branchId: branch?.id },
    });
    expect(inviteResponse.status()).toBe(201);
    const invitation = (await inviteResponse.json()).invitation as { id: string };
    const retry = await page.request.post(`/api/app/users/${encodeURIComponent(invitation.id)}/retry-email?locale=cs`);
    expect(retry.ok()).toBeTruthy();
    const revoke = await page.request.post(`/api/app/users/${encodeURIComponent(invitation.id)}/revoke-invitation?locale=cs`);
    expect(revoke.ok()).toBeTruthy();

    const knownToken = await createKnownInvitation({ email: `accepted-${suffix}@example.test`, role: "DESIGNER", orgUnitId: branch?.id });
    await page.context().clearCookies();
    await page.goto(`/invite/${encodeURIComponent(knownToken)}`);
    await expect(page.getByText("Přijmout pozvánku")).toBeVisible();
    await page.getByLabel("Jméno uživatele").fill("E2E Přijatý Grafik");
    await page.getByRole("button", { name: "Přijmout pozvánku" }).click();
    await expect(page.getByText(/Pozvánka je přijatá/)).toBeVisible();
  });

  test("advert workflow covers missing data, upload, QR, review, publish and versioning", async ({ page }) => {
    await loginAs(page, "admin@demo-strana.cz");
    const initial = await workspace(page.request);
    campaignId ||= initial.campaigns[0]?.id ?? "";

    const missingResponse = await page.request.post("/api/app/ads?locale=cs", {
      data: {
        code: missingAdCode,
        campaignId,
        title: `E2E nekompletní reklama ${suffix}`,
        branch: branchName,
        owner: "",
        type: "",
        channel: "offline",
        publicationDate: "2026-09-10",
        period: "",
        distributionArea: "",
        payer: "",
        supplier: "",
        amount: "",
        fundingSource: "",
        language: "cs",
        isTargeted: false,
        targeting: "nepoužito",
        targetAudience: "",
      },
    });
    expect(missingResponse.status()).toBe(201);
    const missingAd = (await missingResponse.json()).ad as { id: string; workflowStatus: string; missing: string[]; publicUrl: string };
    expect(missingAd.workflowStatus).toBe("NEEDS_DATA");
    expect(missingAd.missing.length).toBeGreaterThan(0);
    const missingApprove = await page.request.post(`/api/app/ads/${encodeURIComponent(missingAd.id)}/approve?locale=cs`);
    expect(missingApprove.status()).toBe(409);

    const createResponse = await page.request.post("/api/app/ads?locale=cs", {
      data: {
        code: completeAdCode,
        campaignId,
        title: `E2E hotová reklama ${suffix}`,
        branch: branchName,
        owner: "E2E tým",
        type: "plakát",
        channel: "offline",
        publicationDate: "2026-09-12",
        period: "12. 9. - 30. 9. 2026",
        distributionArea: "Praha 3",
        payer: "Demo strana",
        supplier: "E2E Studio",
        amount: "9 900 Kč",
        fundingSource: "volební účet",
        language: "cs",
        isTargeted: false,
        targeting: "nepoužito",
        targetAudience: "",
      },
    });
    expect(createResponse.status()).toBe(201);
    const createdAd = (await createResponse.json()).ad as { id: string; publicUrl: string; workflowStatus: string };
    createdPublicUrl = createdAd.publicUrl;
    expect(createdAd.workflowStatus).toBe("READY_FOR_REVIEW");
    const approveWithoutAsset = await page.request.post(`/api/app/ads/${encodeURIComponent(createdAd.id)}/approve?locale=cs`);
    expect(approveWithoutAsset.status()).toBe(409);

    const pdfBytes = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n");
    const uploadResponse = await page.request.post(`/api/app/ads/${encodeURIComponent(createdAd.id)}/assets?locale=cs`, {
      multipart: {
        file: {
          name: "e2e-ad.pdf",
          mimeType: "application/pdf",
          buffer: pdfBytes,
        },
      },
    });
    expect(uploadResponse.status()).toBe(201);

    const qrResponse = await page.request.get(`/api/app/ads/${encodeURIComponent(createdAd.id)}/qr-package?locale=cs`);
    const qrEntries = await zipEntries(qrResponse);
    expect(qrEntries).toEqual(expect.arrayContaining([`${createdAd.id}-qr.svg`, `${createdAd.id}-qr.png`, `${createdAd.id}-manifest.json`, "README.txt"]));

    const approve = await page.request.post(`/api/app/ads/${encodeURIComponent(createdAd.id)}/approve?locale=cs`);
    expect(approve.ok()).toBeTruthy();

    const changesResponse = await page.request.post("/api/app/ads?locale=cs", {
      data: {
        code: changesAdCode,
        campaignId,
        title: `E2E reklama k doplnění ${suffix}`,
        branch: branchName,
        owner: "E2E tým",
        type: "leták",
        channel: "offline",
        publicationDate: "2026-09-13",
        period: "13. 9. - 30. 9. 2026",
        distributionArea: "Praha 3",
        payer: "Demo strana",
        supplier: "E2E Studio",
        amount: "4 900 Kč",
        fundingSource: "volební účet",
        language: "cs",
        isTargeted: false,
        targeting: "nepoužito",
        targetAudience: "",
      },
    });
    expect(changesResponse.status()).toBe(201);
    const changesAd = (await changesResponse.json()).ad as { id: string };

    const requestChanges = await page.request.post(`/api/app/ads/${encodeURIComponent(changesAd.id)}/request-changes?locale=cs`, {
      data: { note: `E2E připomínka ${suffix}` },
    });
    expect(requestChanges.ok()).toBeTruthy();

    const publish = await page.request.post(`/api/app/ads/${encodeURIComponent(createdAd.id)}/publish?locale=cs`);
    expect(publish.ok()).toBeTruthy();
    const published = (await publish.json()).ad as { locked: boolean; workflowStatus: string; version: number };
    expect(published.locked).toBe(true);
    expect(published.workflowStatus).toBe("PUBLISHED");

    expect(published.version).toBeGreaterThanOrEqual(1);
  });

  test("public transparency, repository, import, archive and audit exports work", async ({ page }) => {
    await loginAs(page, "admin@demo-strana.cz");
    const data = await workspace(page.request);
    const publishedAd = data.ads.find((ad) => ad.id === completeAdCode || ad.publicUrl === createdPublicUrl) ?? data.ads.find((ad) => ad.workflowStatus === "PUBLISHED");
    expect(publishedAd?.publicUrl).toBeTruthy();

    await page.goto(new URL(publishedAd?.publicUrl ?? createdPublicUrl).pathname);
    await expect(page.getByText("Veřejné oznámení podle TTPA")).toBeVisible();
    await expect(page.locator("body")).toContainText(/Financování|Cílení|Identifikace reklamy/);

    const pending = data.ads.find((ad) => ad.id === missingAdCode);
    if (pending?.publicUrl) {
      await page.goto(new URL(pending.publicUrl).pathname);
      await expect(page.locator("body")).toContainText(/čeká|není zveřejněná|Pending/i);
      await expect(page.locator("body")).not.toContainText(`E2E nekompletní reklama ${suffix}`);
    }

    await page.goto("/repo/demo-party?q=E2E");
    await expect(page.locator("body")).toContainText(/Veřejný repozitář|E2E/i);
    const repoJson = await page.request.get(`/api/repo/demo-party/ads?q=${encodeURIComponent(completeAdCode)}`);
    expect(repoJson.ok()).toBeTruthy();
    expect(await repoJson.text()).toContain(completeAdCode);

    const workbook = await buildImportWorkbook([
      ["kod", "nazev reklamy", "kandidat", "pobocka", "zadavatel", "typ reklamy", "kanal", "datum zverejneni", "obdobi", "oblast sireni", "platce", "dodavatel", "naklady", "puvod financ", "jazyk", "cileni", "cilove publikum"],
      [`XLS-${suffix}`, `E2E import ${suffix}`, "", branchName, "E2E tým", "leták", "offline", "2026-09-16", "září 2026", "Praha 3", "Demo strana", "E2E tisk", "2 500 Kč", "volební účet", "cs", "nepoužito", ""],
      [`BAD-${suffix}`, `E2E import chyba ${suffix}`, "Neexistující Kandidát", branchName, "E2E tým", "leták", "offline", "2026-09-16", "září 2026", "Praha 3", "Demo strana", "E2E tisk", "2 500 Kč", "volební účet", "cs", "nepoužito", ""],
    ]);
    const importResponse = await page.request.post("/api/app/ads/import?locale=cs", {
      multipart: {
        campaignId,
        file: {
          name: "e2e-import.xlsx",
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          buffer: workbook,
        },
      },
    });
    expect(importResponse.ok()).toBeTruthy();
    const importPayload = await importResponse.json();
    expect(importPayload.result.createdCount).toBeGreaterThanOrEqual(1);
    expect(importPayload.result.failedCount).toBeGreaterThanOrEqual(1);

    const auditPackage = await page.request.get(`/api/app/ads/${encodeURIComponent(completeAdCode)}/audit-export?locale=cs`);
    const auditEntries = await zipEntries(auditPackage);
    expect(auditEntries).toEqual(expect.arrayContaining([`${completeAdCode}-audit-log.csv`, `${completeAdCode}-audit-log.json`, `${completeAdCode}-approvals.csv`, "manifest.json"]));

    const archive = await page.request.get("/api/app/exports/archive?locale=cs");
    const archiveEntries = await zipEntries(archive);
    expect(archiveEntries).toEqual(expect.arrayContaining(["audit-log.csv", "audit-log.json", "manifest.json"]));

    await page.goto("/app#archive");
    await expect(page.getByRole("heading", { name: "Historie změn" })).toBeVisible();
    await page.getByPlaceholder("aktér, akce, objekt, request id").fill("download_qr_package");
    await expect(page.getByRole("heading", { name: "Stažení QR balíčku" })).toBeVisible();

    const auditRows = await queryAll<{ action: string; entryHash: string; sequence: string; outcome: string }>(
      `SELECT "action", "entryHash", "sequence"::text, "outcome"
       FROM "audit_logs" al
       JOIN "tenants" t ON t."id" = al."tenantId"
       WHERE t."slug" = 'demo-party' AND al."sequence" > 0
       ORDER BY al."sequence" ASC`,
    );
    expect(auditRows.length).toBeGreaterThan(8);
    expect(auditRows.some((row) => row.action === "download_qr_package")).toBe(true);
    expect(auditRows.every((row) => /^[a-f0-9]{64}$/.test(row.entryHash) && row.outcome === "success")).toBe(true);
    for (let index = 1; index < auditRows.length; index += 1) {
      expect(Number(auditRows[index].sequence)).toBeGreaterThan(Number(auditRows[index - 1].sequence));
    }

    const versionResponse = await page.request.patch(`/api/app/ads/${encodeURIComponent(completeAdCode)}?locale=cs`, {
      data: {
        code: completeAdCode,
        campaignId,
        title: `E2E hotová reklama ${suffix} upravena`,
        branch: branchName,
        owner: "E2E tým",
        type: "plakát",
        channel: "offline",
        publicationDate: "2026-09-12",
        period: "12. 9. - 30. 9. 2026",
        distributionArea: "Praha 3",
        payer: "Demo strana",
        supplier: "E2E Studio",
        amount: "9 900 Kč",
        fundingSource: "volební účet",
        language: "cs",
        isTargeted: false,
        targeting: "nepoužito",
        targetAudience: "",
      },
    });
    expect(versionResponse.ok()).toBeTruthy();
    const versioned = (await versionResponse.json()).ad as { locked: boolean; workflowStatus: string; version: number };
    expect(versioned.locked).toBe(false);
    expect(versioned.workflowStatus).toBe("READY_FOR_REVIEW");
    expect(versioned.version).toBeGreaterThan(1);
  });

  test("role and scope restrictions are enforced", async ({ page }) => {
    const seedData = await workspace(page.request).catch(() => null);
    const orgUnit = await queryOne<{ id: string }>('SELECT "id" FROM "organization_units" WHERE "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = $1) ORDER BY "nameCs" ASC LIMIT 1', ["demo-party"]);
    expect(orgUnit?.id).toBeTruthy();
    await createRoleUser({ email: `reviewer-${suffix}@example.test`, name: "E2E Reviewer", role: "CENTRAL_REVIEWER" });
    await createRoleUser({ email: `designer-role-${suffix}@example.test`, name: "E2E Designer", role: "DESIGNER", orgUnitId: orgUnit?.id });
    await createRoleUser({ email: `auditor-${suffix}@example.test`, name: "E2E Auditor", role: "READONLY_AUDITOR" });
    await createRoleUser({ email: `local-${suffix}@example.test`, name: "E2E Local Admin", role: "LOCAL_ADMIN", orgUnitId: orgUnit?.id });

    await loginAs(page, "kandidat@demo-strana.cz");
    let scoped = await workspace(page.request);
    expect(scoped.membership.role).toBe("kandidát");
    expect(scoped.ads.length).toBeGreaterThan(0);
    expect(scoped.ads.every((ad) => ad.candidate === "Jan Novák")).toBe(true);

    await page.context().clearCookies();
    await loginAs(page, `reviewer-${suffix}@example.test`);
    scoped = await workspace(page.request);
    expect(scoped.permissions.canApproveAds).toBe(true);
    expect(scoped.permissions.canPublishAds).toBe(true);
    expect(scoped.permissions.canManageTenantSettings).toBe(false);
    const settingsDenied = await page.request.patch("/api/app/settings", {
      data: { name: "Nesmí projít", slug: "demo-party", contactEmail: "demo@example.test", defaultLocale: "cs", publicRepositoryEnabled: true, retentionYears: 7 },
    });
    expect(settingsDenied.status()).toBe(403);

    await page.context().clearCookies();
    await loginAs(page, `designer-role-${suffix}@example.test`);
    scoped = await workspace(page.request);
    expect(scoped.permissions.canUploadAssets).toBe(true);
    expect(scoped.permissions.canPublishAds).toBe(false);

    await page.context().clearCookies();
    await loginAs(page, `auditor-${suffix}@example.test`);
    scoped = await workspace(page.request);
    expect(scoped.permissions.canViewAudit).toBe(true);
    expect(scoped.permissions.canCreateAds).toBe(false);

    await page.context().clearCookies();
    await loginAs(page, `local-${suffix}@example.test`);
    scoped = await workspace(page.request);
    expect(scoped.membership.role).toBe("admin pobočky");
    expect(scoped.ads.every((ad) => ad.branch === scoped.membership.scope)).toBe(true);
    expect(seedData || scoped).toBeTruthy();
  });
});
