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
const objectStorage = read("src/lib/object-storage.ts");
const appWorkspace = read("src/app/app/AppWorkspaceClient.tsx");
const adminAuth = read("src/lib/admin-auth.ts");
const adminPage = read("src/app/[locale]/admin/page.tsx");

check(!dockerfile.includes("db:seed"), "Production migrator must not run demo seed automatically.");
check(composeProd.includes("/api/health"), "Production Docker healthcheck should use /api/health.");
check(composeProd.includes("storage-check:"), "Production compose should include an object storage check tool.");
check(dockerfile.includes("AS storage-check"), "Dockerfile should include an object storage check target.");
check(existsSync(resolve(root, "src/app/api/health/route.ts")), "Health route is missing.");
check(adminDb.includes("publicWorkflowStatuses"), "Public workflow status allowlist is missing.");
check(adminDb.includes("in: publicWorkflowStatuses"), "Public repository should only query public workflow statuses.");
check(adminDb.includes('status: "pending" as const'), "Transparency notice should return a pending state for unpublished QR links.");
check(transparencyPage.includes('notice.status === "pending"'), "Transparency page should handle unpublished QR links without exposing ad details.");
check(loginRoute.includes("verifyTurnstileToken"), "Login link route should verify Turnstile when configured.");
check(inviteRoute.includes("verifyTurnstileToken"), "Invite acceptance route should verify Turnstile when configured.");
check(signupRoute.includes("createSignupTrial") && signupRoute.includes("verifyTurnstileToken"), "Signup route should create trials and verify Turnstile when configured.");
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
check(existsSync(resolve(root, "src/app/signup/page.tsx")), "Signup page is missing.");
check(existsSync(resolve(root, "src/app/api/app/ads/[code]/approve/route.ts")), "App approval route is missing.");
check(existsSync(resolve(root, "src/app/api/app/ads/[code]/publish/route.ts")), "App publish route is missing.");
check(existsSync(resolve(root, "src/app/api/app/billing/portal/route.ts")), "App billing portal route is missing.");
check(workspaceClient.includes("runWorkflowAction") && workspaceClient.includes("Publikovat"), "Workspace should expose approve/publish actions.");
check(!marketingPage.includes("2FA"), "Marketing page should not claim 2FA before it is implemented.");
check(adminAuth.includes("isDemoAdminEnabled"), "Demo admin feature flag is missing.");
check(adminAuth.includes('process.env.NODE_ENV !== "production"'), "Demo admin should default to disabled in production.");
check(adminPage.includes("isDemoAdminEnabled") && adminPage.includes("notFound()"), "Demo admin page should 404 when disabled.");
check(composeProd.includes("ENABLE_DEMO_ADMIN: ${ENABLE_DEMO_ADMIN:-0}"), "Production compose should disable demo admin by default.");

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
