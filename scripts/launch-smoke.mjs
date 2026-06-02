#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const failures = [];

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function check(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

const dockerfile = read("Dockerfile");
const ciWorkflow = read(".github/workflows/ci.yml");
const dependabotConfig = read(".github/dependabot.yml");
const composeProd = read("docker-compose.prod.yml");
const adminDb = read("src/lib/admin-demo-db.ts");
const transparencyPage = read("src/app/ad/[code]/page.tsx");
const loginRoute = read("src/app/api/login/request-link/route.ts");
const inviteRoute = read("src/app/api/invite/[token]/accept/route.ts");
const workspaceClient = read("src/app/app/AppWorkspaceClient.tsx");
const signupRoute = read("src/app/api/signup/route.ts");
const marketingPage = read("src/app/[locale]/page.tsx");
const turnstileField = read("src/app/TurnstileField.tsx");
const turnstileLib = read("src/lib/turnstile.ts");
const schema = read("prisma/schema.prisma");
const prismaConfig = read("prisma.config.ts");
const objectStorage = read("src/lib/object-storage.ts");
const appWorkspace = read("src/app/app/AppWorkspaceClient.tsx");
const xlsxImport = read("src/lib/xlsx-ad-import.ts");
const publicRepoPage = read("src/app/repo/[tenant]/page.tsx");
const adminAuth = read("src/lib/admin-auth.ts");
const adminPage = read("src/app/[locale]/admin/page.tsx");
const appAuth = read("src/lib/app-auth.ts");
const turnstile = read("src/lib/turnstile.ts");
const license = read("LICENSE");
const changelog = read("CHANGELOG.md");
const seed = read("prisma/seed.ts");
const packageJson = JSON.parse(read("package.json"));

check(!dockerfile.includes("db:seed"), "Production migrator must not run demo seed automatically.");
check(!Object.hasOwn(packageJson, "prisma"), "Prisma configuration should live in prisma.config.ts, not package.json#prisma.");
check(packageJson.type === "module", "Prisma 7 requires the package to use ESM module mode.");
check(prismaConfig.includes('schema: "prisma/schema.prisma"'), "Prisma config should point at prisma/schema.prisma.");
check(prismaConfig.includes('seed: "tsx prisma/seed.ts"'), "Prisma config should keep the database seed command.");
check(prismaConfig.includes('import "dotenv/config"'), "Prisma config should explicitly load .env values.");
check(prismaConfig.includes('url: env("DATABASE_URL")'), "Prisma config should own the datasource URL for Prisma 7.");
check(schema.includes('provider = "prisma-client"'), "Prisma schema should use the Prisma 7 client generator.");
check(schema.includes('output   = "../src/generated/prisma"'), "Prisma schema should generate the client to an explicit output path.");
check(!schema.includes('url      = env("DATABASE_URL")'), "Prisma 7 datasource URL should not live in schema.prisma.");
check(read("src/lib/prisma.ts").includes("@prisma/adapter-pg"), "Runtime Prisma client should use the Postgres driver adapter.");
check(dockerfile.includes("COPY prisma.config.ts ./"), "Production migrator image should include prisma.config.ts.");
check(dockerfile.includes("DATABASE_URL=\"postgresql://adclare:adclare@localhost:5432/adclare?schema=public\" npm run db:generate"), "Docker build should provide a dummy DATABASE_URL for Prisma client generation.");
check(dockerfile.includes("DATABASE_URL=\"postgresql://adclare:adclare@localhost:5432/adclare?schema=public\" npm run build"), "Docker web build should provide a dummy DATABASE_URL for Prisma client generation.");
check(read("eslint.config.mjs").includes("src/generated/prisma/**"), "Generated Prisma client should be excluded from linting.");
check(ciWorkflow.includes("npm run ci"), "GitHub Actions should run the full app CI script.");
check(ciWorkflow.includes("npm run docker:check"), "GitHub Actions should verify Docker builds.");
check(ciWorkflow.includes("actions/checkout@v6"), "GitHub Actions should use checkout with Node 24 runtime support.");
check(ciWorkflow.includes("actions/setup-node@v6"), "GitHub Actions should use setup-node with Node 24 runtime support.");
check(ciWorkflow.includes("docker/setup-buildx-action@v4"), "GitHub Actions should use Buildx with Node 24 runtime support.");
check(ciWorkflow.includes("node-version: \"22\""), "GitHub Actions should run on Node.js 22.");
check(dependabotConfig.includes("package-ecosystem: npm"), "Dependabot should watch npm dependencies.");
check(dependabotConfig.includes("package-ecosystem: github-actions"), "Dependabot should watch GitHub Actions.");
check(license.includes("EUROPEAN UNION PUBLIC LICENCE v. 1.2") && license.includes("15. Applicable Law"), "LICENSE should contain the full EUPL-1.2 text.");
check(changelog.includes("## v0.1.0 - 2026-06-01") && !changelog.includes("## v0.0"), "Changelog should contain one current v0.1.0 release baseline.");
check(composeProd.includes("/api/health"), "Production Docker healthcheck should use /api/health.");
check(composeProd.includes("storage-check:"), "Production compose should include an object storage check tool.");
check(composeProd.includes("NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL:?set NEXT_PUBLIC_APP_URL}"), "Production compose should require a self-hosted NEXT_PUBLIC_APP_URL.");
check(composeProd.includes("APP_URL: ${APP_URL:-${NEXT_PUBLIC_APP_URL}}"), "Production compose should pass runtime APP_URL for self-hosted links.");
check(composeProd.includes("EMAIL_FROM: ${EMAIL_FROM:-}"), "Production compose should not default outbound email to adclare.eu for self-hosted installs.");
check(dockerfile.includes("AS storage-check"), "Dockerfile should include an object storage check target.");
const rootCompose = read("docker-compose.yml");
check(rootCompose.includes("migrate:"), "Root Docker compose should run database migrations for one-command self-hosting.");
check(rootCompose.includes("service_completed_successfully"), "Root Docker compose web service should wait for migrations.");
check(rootCompose.includes("TURNSTILE_REQUIRED: ${TURNSTILE_REQUIRED:-0}"), "Root Docker compose should allow first local run before Turnstile is configured.");
check(rootCompose.includes("OBJECT_STORAGE_ENDPOINT: ${OBJECT_STORAGE_ENDPOINT:-}"), "Root Docker compose should pass object storage configuration.");
check(read("deploy/caddy/Caddyfile").includes("{$SITE_ADDRESS:localhost}"), "Caddy should use SITE_ADDRESS instead of a hard-coded adclare.eu domain.");
check(appAuth.includes("publicAppUrl()") && !appAuth.includes("https://adclare.eu"), "Login links should use instance URL configuration, not adclare.eu fallback.");
check(adminDb.includes("publicAppUrl()") && !adminDb.includes("https://adclare.eu"), "Invite, QR and public URLs should use instance URL configuration, not adclare.eu fallback.");
check(turnstile.includes("publicAppUrl()") && !turnstile.includes("process.env.NEXT_PUBLIC_APP_URL"), "Turnstile hostname fallback should use runtime APP_URL.");
check(read("src/app/sitemap.ts").includes('dynamic = "force-dynamic"') && read("src/app/sitemap.ts").includes("publicAppUrl()"), "Sitemap should use runtime instance URL.");
check(read("src/app/robots.ts").includes('dynamic = "force-dynamic"') && read("src/app/robots.ts").includes("publicAppUrl()"), "Robots should use runtime instance URL.");
check(existsSync(resolve(root, "src/app/api/health/route.ts")), "Health route is missing.");
check(adminDb.includes("publicWorkflowStatuses"), "Public workflow status allowlist is missing.");
check(adminDb.includes("in: publicWorkflowStatuses"), "Public repository should only query public workflow statuses.");
check(adminDb.includes('status: "pending" as const'), "Transparency notice should return a pending state for unpublished QR links.");
check(transparencyPage.includes('notice.status === "pending"'), "Transparency page should handle unpublished QR links without exposing ad details.");
check(transparencyPage.includes("Transparentní oznámení podle TTPA") && transparencyPage.includes("Veřejný záznam"), "Transparency page should present public TTPA notice structure.");
check(transparencyPage.includes("Identifikace reklamy") && transparencyPage.includes("Financování") && transparencyPage.includes("Cílení"), "Transparency page should group public notice data for readers.");
check(loginRoute.includes("verifyTurnstileToken"), "Login link route should verify Turnstile when configured.");
check(inviteRoute.includes("verifyTurnstileToken"), "Invite acceptance route should verify Turnstile when configured.");
check(signupRoute.includes("createSignupWorkspace") && signupRoute.includes("verifyTurnstileToken"), "Signup route should create a workspace and verify Turnstile when configured.");
check(!turnstileField.includes("process.env"), "Turnstile client component must receive the site key as a prop.");
check(turnstileLib.includes("TURNSTILE_SITE_KEY"), "Turnstile site key should be readable from a server runtime variable.");
check(schema.includes("model AdAsset"), "Ad asset storage model is missing.");
check(objectStorage.includes("@aws-sdk/client-s3") && objectStorage.includes("uploadAdAssetObject"), "S3 object storage upload helper is missing.");
check(existsSync(resolve(root, "scripts/check-object-storage.mjs")), "Object storage validation script is missing.");
check(existsSync(resolve(root, "src/app/api/app/ads/[code]/assets/route.ts")), "App ad asset upload route is missing.");
check(existsSync(resolve(root, "src/app/api/app/ads/[code]/assets/[assetId]/route.ts")), "App ad asset download route is missing.");
check(appWorkspace.includes("Soubory materiálu") && appWorkspace.includes("onUpload"), "Workspace should expose ad asset upload controls.");
check(schema.includes("DESIGNER") && adminDb.includes("canUploadAppAssets"), "Designer upload permission should be explicit.");
check(adminDb.includes("canApproveAppAds") && adminDb.includes("canPublishAppAds"), "Approval and publishing permissions should be explicit.");
check(appWorkspace.includes("workspace.permissions.canCreateAds"), "Workspace should use API permissions for create actions.");
check(adminDb.includes("createAppBranch") && existsSync(resolve(root, "src/app/api/app/branches/route.ts")), "App branch management route is missing.");
check(existsSync(resolve(root, "src/app/api/app/branches/[id]/route.ts")), "App branch update route is missing.");
check(existsSync(resolve(root, "src/app/api/app/settings/route.ts")), "App tenant settings route is missing.");
check(appWorkspace.includes("Nastavení strany") && appWorkspace.includes("Pobočky a oblasti") && appWorkspace.includes('type === "branch"'), "Workspace should expose tenant and branch management.");
check(existsSync(resolve(root, "src/app/api/app/campaigns/route.ts")), "App campaign management route is missing.");
check(existsSync(resolve(root, "src/app/api/app/campaigns/[id]/route.ts")), "App campaign update route is missing.");
check(schema.includes("tags          String[]") && schema.includes("archivedAt    DateTime?"), "Campaign schema should include tags and archival state.");
check(appWorkspace.includes("Kampaně a tagy") && appWorkspace.includes('type === "campaign"') && adminDb.includes("createAppCampaign") && adminDb.includes("update_campaign"), "Workspace should expose campaign and tag management.");
check(appWorkspace.includes("Kampaň pro import") && read("src/app/api/app/ads/import/route.ts").includes("campaignId"), "Excel import should let users choose the campaign.");
check(schema.includes("model Candidate") && schema.includes("candidateId        String?"), "Candidate schema and ad relation are missing.");
check(existsSync(resolve(root, "src/app/api/app/candidates/route.ts")), "App candidate management route is missing.");
check(existsSync(resolve(root, "src/app/api/app/candidates/[id]/route.ts")), "App candidate update route is missing.");
check(adminDb.includes("createAppCandidate") && adminDb.includes("update_candidate") && adminDb.includes("canManageAppCandidates"), "App candidate management handlers are missing.");
check(appWorkspace.includes("Kandidáti") && appWorkspace.includes('type === "candidate"') && appWorkspace.includes("Bez kandidáta"), "Workspace should expose candidate management and ad assignment.");
check(xlsxImport.includes("candidateId") && adminDb.includes("getAppCandidateForInput"), "Excel import should map candidate names to stored candidates.");
check(schema.includes("memberships TenantMembership[]") && schema.includes("invitations Invitation[]"), "Candidate schema should expose membership and invitation relations.");
check(adminDb.includes("roleNeedsCandidate") && adminDb.includes("candidateForAccessInput") && adminDb.includes("canAccessAppAd"), "Candidate-scoped access helpers are missing.");
check(adminDb.includes("candidateId: invitation.candidateId") && adminDb.includes("role === UserRole.CANDIDATE"), "Accepted invitations and ad scopes should persist candidate access.");
check(appWorkspace.includes("roleNeedsCandidate") && appWorkspace.includes('name="candidateId"') && appWorkspace.includes("inviteCandidateMissing"), "People management should expose candidate-scoped invitations and members.");
check(seed.includes("kandidat@demo-strana.cz") && seed.includes("candidateId: janCandidate.id"), "Seed data should include a candidate-scoped demo user.");
check(transparencyPage.includes('["Kandidát"') && adminDb.includes("candidate: true"), "Transparency notice should include assigned candidate data.");
check(publicRepoPage.includes("texts.candidate") && publicRepoPage.includes("ad.candidate"), "Public repository should display assigned candidate data.");
check(publicRepoPage.includes("grid gap-3 bg-white p-4") && !publicRepoPage.includes("min-w-[980px]"), "Public repository should use responsive cards instead of a horizontally scrolling table.");
check(read("src/app/api/app/ads/[code]/qr-package/route.ts").includes("candidate: ad.candidate"), "App QR package notice should include assigned candidate data.");
check(read("src/app/api/admin/demo/ads/[code]/qr-package/route.ts").includes("candidate: ad.candidate"), "Demo QR package notice should include assigned candidate data.");
check(read("src/app/api/app/ads/[code]/qr-package/route.ts").includes("-qr.png") && read("src/app/api/app/ads/[code]/qr-package/route.ts").includes("manifest.json") && read("src/app/api/app/ads/[code]/qr-package/route.ts").includes("README.txt"), "App QR package should include PNG, manifest and README outputs.");
check(read("src/app/api/admin/demo/ads/[code]/qr-package/route.ts").includes("-qr.png") && read("src/app/api/admin/demo/ads/[code]/qr-package/route.ts").includes("manifest.json") && read("src/app/api/admin/demo/ads/[code]/qr-package/route.ts").includes("README.txt"), "Demo QR package should include PNG, manifest and README outputs.");
check(existsSync(resolve(root, "src/app/api/app/users/route.ts")), "App user invitation route is missing.");
check(existsSync(resolve(root, "src/app/api/app/profile/route.ts")), "App profile update route is missing.");
check(existsSync(resolve(root, "src/app/api/app/users/[id]/route.ts")), "App member update route is missing.");
check(existsSync(resolve(root, "src/app/api/app/users/[id]/retry-email/route.ts")), "App invitation retry route is missing.");
check(existsSync(resolve(root, "src/app/api/app/users/[id]/revoke-invitation/route.ts")), "App invitation revoke route is missing.");
check(appWorkspace.includes("Správa lidí") && appWorkspace.includes("Uložit profil") && appWorkspace.includes("Poslat pozvánku") && appWorkspace.includes("Zrušit pozvánku"), "Workspace should expose profile, people and invitation management.");
check(appWorkspace.includes("Audit") && adminDb.includes("update_tenant_settings") && adminDb.includes("update_branch"), "Workspace should expose audit and log admin changes.");
check(adminDb.includes("getAppSuperAdminPayload") && adminDb.includes("canManageAllTenants"), "Super admin payload and permission are missing.");
check(appWorkspace.includes("Správa celé instalace") && appWorkspace.includes("workspace.permissions.canManageAllTenants"), "Workspace should expose the super admin installation overview.");
check(appWorkspace.includes("Co je potřeba doplnit") && appWorkspace.includes("Doplnit údaje"), "Workspace should expose a missing data action queue.");
check(appWorkspace.includes("Proces pro každou reklamu") && appWorkspace.includes("8. V souladu s TTPA") && appWorkspace.includes("setupProgress"), "Workspace should expose the eight-step ad process.");
check(appWorkspace.includes("Kontrolní proces reklamy") && appWorkspace.includes("Nařízení EU o transparentnosti a cílení politické reklamy") && appWorkspace.includes("Teď řešit"), "Workspace should expose a per-ad TTPA checklist.");
check(adminDb.includes("hasAdAsset") && adminDb.includes("Nahrajte podklad reklamy před schválením.") && adminDb.includes("Nahrajte podklad reklamy před publikací."), "Approval and publication should require an uploaded ad asset.");
check(appWorkspace.includes("Doplnění pro TTPA") && appWorkspace.includes("draftProcessSteps") && appWorkspace.includes("Uložit rozpracované"), "Ad editor should expose draft TTPA guidance.");
check(appWorkspace.includes("setSelectedId(ad.id)") && appWorkspace.includes("setForm(formFromAd(ad))"), "Editing an ad should select the same ad in the detail panel.");
check(appWorkspace.includes("QR, oznámení a audit") && appWorkspace.includes("Kopírovat URL") && appWorkspace.includes("Stáhnout QR balíček"), "Ad detail should expose a clear outputs panel with copy and download actions.");
check(existsSync(resolve(root, "src/app/signup/page.tsx")), "Signup page is missing.");
check(existsSync(resolve(root, "src/app/api/app/ads/[code]/approve/route.ts")), "App approval route is missing.");
check(existsSync(resolve(root, "src/app/api/app/ads/[code]/publish/route.ts")), "App publish route is missing.");
check(existsSync(resolve(root, "src/app/api/app/ads/[code]/request-changes/route.ts")), "App request changes route is missing.");
check(existsSync(resolve(root, "src/app/api/app/ads/[code]/audit-export/route.ts")), "App audit export route is missing.");
check(existsSync(resolve(root, "src/app/api/app/exports/archive/route.ts")), "App workspace archive export route is missing.");
check(existsSync(resolve(root, "src/app/api/app/ads/import/route.ts")), "App Excel import route is missing.");
check(xlsxImport.includes("parseXlsxAdImport") && xlsxImport.includes("JSZip"), "XLSX ad import parser is missing.");
check(adminDb.includes("importAppAds") && adminDb.includes("import_ads_batch"), "Database ad import handler or audit log is missing.");
check(appWorkspace.includes("Import agendy") && appWorkspace.includes("Importovat Excel"), "Workspace should expose Excel agenda import.");
check(!existsSync(resolve(root, "src/app/app/activate/page.tsx")), "Open source app should not include hosted activation pages.");
check(workspaceClient.includes("runWorkflowAction") && workspaceClient.includes("Publikovat"), "Workspace should expose approve/publish actions.");
check(adminDb.includes("requestAppAdChanges"), "Review change request handler is missing.");
check(appWorkspace.includes("Ke kontrole") && appWorkspace.includes("Vrátit k doplnění"), "Workspace should expose review inbox and change requests.");
check(appWorkspace.includes("Historie kontroly") && adminDb.includes("mapReviewEvent"), "Workspace should expose review decision history.");
check(appWorkspace.includes("Stáhnout auditní balíček") && adminDb.includes("getAppAuditPackage"), "Workspace should expose app audit packages.");
check(appWorkspace.includes("Kontrolní archiv") && appWorkspace.includes("Stáhnout archiv") && adminDb.includes("getAppArchivePackage"), "Workspace should expose whole-workspace archive exports.");
check(!marketingPage.includes("2FA"), "Marketing page should not claim 2FA before it is implemented.");
check(adminAuth.includes("isDemoAdminEnabled"), "Demo admin feature flag is missing.");
check(adminAuth.includes('process.env.NODE_ENV !== "production"'), "Demo admin should default to disabled in production.");
check(adminPage.includes("isDemoAdminEnabled") && adminPage.includes("notFound()"), "Demo admin page should 404 when disabled.");
check(composeProd.includes("ENABLE_DEMO_ADMIN: ${ENABLE_DEMO_ADMIN:-0}"), "Production compose should disable demo admin by default.");
check(composeProd.includes("ADMIN_ACCESS_PASSWORD: ${ADMIN_ACCESS_PASSWORD:-}"), "Production compose should not require demo admin password when demo admin is disabled.");
check(composeProd.includes("ADMIN_SESSION_SECRET: ${ADMIN_SESSION_SECRET:-}"), "Production compose should not require demo admin secret when demo admin is disabled.");
check(adminDb.includes("publicRepositoryEnabled"), "Public repository should be controlled by tenant settings.");

for (const path of [
  "src/app/[locale]/privacy/page.tsx",
  "src/app/[locale]/terms/page.tsx",
  "src/app/[locale]/cookies/page.tsx",
  "src/app/[locale]/dpa/page.tsx",
  "src/app/[locale]/security/page.tsx",
  "src/app/[locale]/subprocessors/page.tsx",
]) {
  check(existsSync(resolve(root, path)), `Legal route missing: ${path}`);
}

if (failures.length > 0) {
  console.error("Launch smoke checks failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Launch smoke checks passed.");
