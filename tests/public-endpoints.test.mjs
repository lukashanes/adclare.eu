import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { loadSource, valueImports } from "./load-source.mjs";

function request(body, headers = {}) {
  return new Request("https://adclare.test/api/login/request-link", {
    method: "POST",
    headers: { host: "adclare.test", origin: "https://adclare.test", ...headers },
    body,
    duplex: "half",
  });
}

function services() {
  const calls = { rate: [], verification: 0, email: 0 };
  return {
    calls,
    mocks: {
      "@/lib/app-auth": { requestAppLoginLink: async () => { calls.email++; } },
      "@/lib/rate-limit": {
        requestIp: () => "192.0.2.1",
        rateLimitHeaders: () => ({}),
        checkRateLimit: async (options) => {
          calls.rate.push(options);
          return { allowed: true };
        },
      },
      "@/lib/turnstile": { verifyTurnstileToken: async () => { calls.verification++; return { ok: true }; } },
    },
  };
}

test("public JSON stops a stream without Content-Length before any side effect", async () => {
  const { calls, mocks } = services();
  const { POST } = await loadSource("src/app/api/login/request-link/route.ts", mocks);
  let cancelled = false;
  let reads = 0;
  const stream = new ReadableStream({
    pull(controller) {
      reads++;
      controller.enqueue(new TextEncoder().encode(reads === 1 ? '{"email":"TEST-' : "x".repeat(16 * 1024)));
      if (reads === 20) controller.close();
    },
    cancel() { cancelled = true; },
  }, { highWaterMark: 0 });
  const response = await POST(request(stream));
  assert.equal(response.status, 413);
  assert.equal(cancelled, true);
  assert.ok(reads < 20);
  assert.deepEqual(calls, { rate: [], verification: 0, email: 0 });
});

test("malformed public JSON returns 400 before any service call", async () => {
  const { calls, mocks } = services();
  const { POST } = await loadSource("src/app/api/login/request-link/route.ts", mocks);
  assert.equal((await POST(request('{"email":'))).status, 400);
  assert.deepEqual(calls, { rate: [], verification: 0, email: 0 });
});

test("changing email does not create a new IP rate-limit identity", async () => {
  const { calls, mocks } = services();
  const { POST } = await loadSource("src/app/api/login/request-link/route.ts", mocks);
  for (const email of ["TEST-one@example.invalid", "TEST-two@example.invalid"]) {
    assert.equal((await POST(request(JSON.stringify({ email })))).status, 200);
  }
  const ipLimits = calls.rate.filter(({ identifier }) => identifier === "192.0.2.1");
  assert.equal(ipLimits.length, 2);
  assert.equal(ipLimits[0].scope, ipLimits[1].scope);
});

test("a failed antispam check sends no login email", async () => {
  const { calls, mocks } = services();
  mocks["@/lib/turnstile"].verifyTurnstileToken = async () => ({ ok: false });
  const { POST } = await loadSource("src/app/api/login/request-link/route.ts", mocks);
  assert.equal((await POST(request(JSON.stringify({ email: "TEST-user@example.invalid" })))).status, 403);
  assert.equal(calls.email, 0);
});

async function routes(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await routes(path));
    else if (entry.name === "route.ts") result.push(path);
  }
  return result;
}

for (const path of await routes("src/app/api")) {
  const source = await readFile(path, "utf8");
  const methods = [...source.matchAll(/export async function (POST|PATCH)\(/g)].map((match) => match[1]);
  for (const method of methods) {
    test(`${method} ${path} rejects oversized input before business operations`, async () => {
      const { mocks } = services();
      let writes = 0;
      mocks["@/lib/app-auth"] = {
        getAppSession: async () => ({ userId: "TEST-user" }),
        requestAppLoginLink: async () => { writes++; },
        deleteAppSession: async () => { writes++; },
        serializeAppSessionClearCookie: () => "TEST-clear",
      };
      const workspaceImports = valueImports(source, "@/lib/workspace-db");
      if (workspaceImports.length) {
        mocks["@/lib/workspace-db"] = Object.fromEntries(workspaceImports.map((name) => {
          return [name, name === "normalizeLocale" ? () => "cs" : name === "getAppAdUploadTarget"
            ? async () => ({ tenantSlug: "TEST-tenant", adCode: "TEST-ad" })
            : async () => { writes++; return {}; }];
        }));
      }
      mocks["@/lib/signup"] = { createSignupWorkspace: async () => { writes++; } };
      mocks["@/lib/object-storage"] = {
        isAssetStorageAvailable: () => true, maxUploadBytes: () => 1024,
        uploadAdAssetObject: async () => { writes++; },
      };
      const route = await loadSource(path, mocks);
      const totalBytes = path.includes("import") ? 9 * 1024 * 1024 : 200 * 1024;
      const response = await route[method](request("x".repeat(totalBytes)), {
        params: Promise.resolve({ token: "TEST-token", code: "TEST-ad", id: "TEST-id" }),
      });
      assert.equal(response.status, 413);
      assert.equal(writes, 0);
    });
  }
}

test("route mocks handle multiline imports, trailing commas and inline types", () => {
  assert.deepEqual(valueImports('import {\n normalizeLocale,\n type Locale,\n approveAppAd as approve,\n} from "@/lib/workspace-db";', "@/lib/workspace-db"), ["normalizeLocale", "approveAppAd"]);
  assert.deepEqual(valueImports('import type { Locale } from "@/lib/workspace-db";', "@/lib/workspace-db"), []);
});

for (const [path, operation] of [
  ["logout", "deleteAppSession"],
  ["app/ads/[code]/approve", "approveAppAd"],
  ["app/ads/[code]/publish", "publishAppAd"],
  ["app/ads/[code]/audit-export", "prepareAppAuditExport"],
  ["app/users/[id]/retry-email", "retryAppInvitationEmail"],
  ["app/users/[id]/revoke-invitation", "revokeAppInvitation"],
]) {
  for (const body of [undefined, new FormData()]) {
    test(`${path} accepts ${body === undefined ? "no body" : "an empty form"}`, async () => {
      const { mocks } = services();
      let writes = 0;
      const action = async () => { writes++; return { id: "TEST-result" }; };
      mocks["@/lib/app-auth"] = {
        getAppSession: async () => ({ userId: "TEST-user" }),
        deleteAppSession: action, serializeAppSessionClearCookie: () => "TEST-clear",
      };
      mocks["@/lib/workspace-db"] = {
        normalizeLocale: () => "cs", [operation]: action, getAppAuditPackage: async () => null,
      };
      const { POST } = await loadSource(`src/app/api/${path}/route.ts`, mocks);
      const response = await POST(request(body), { params: Promise.resolve({ code: "TEST-ad", id: "TEST-id" }) });
      assert.equal(response.status, path === "logout" ? 303 : 200);
      assert.equal(writes, 1);
    });
  }
}

for (const kind of ["assets", "import"]) {
  for (const overLimit of [false, true]) {
    test(`${kind} multipart ${overLimit ? "rejects a file just over" : "accepts a file at"} the file limit`, async () => {
      const { mocks } = services();
      let writes = 0;
      const limit = kind === "assets" ? 1024 : 8 * 1024 * 1024;
      mocks["@/lib/app-auth"] = { getAppSession: async () => ({ userId: "TEST-user" }) };
      mocks["@/lib/workspace-db"] = {
        normalizeLocale: () => "cs", getAppAdUploadTarget: async () => ({ tenantSlug: "TEST-tenant", adCode: "TEST-ad" }),
        attachAppAdAsset: async () => ({ id: "TEST-ad" }),
        importAppAds: async () => { writes++; return { imported: 1 }; },
      };
      mocks["@/lib/object-storage"] = {
        isAssetStorageAvailable: () => true, maxUploadBytes: () => limit,
        uploadAdAssetObject: async ({ file }) => {
          assert.ok(file.size <= limit, "oversized files must be rejected before storage");
          writes++; return { key: "TEST-key" };
        },
      };
      mocks["@/lib/xlsx-ad-import"] = { parseXlsxAdImport: async () => ({ rows: [], sheetName: "TEST", headerRow: 1 }) };
      const path = kind === "assets" ? "src/app/api/app/ads/[code]/assets/route.ts" : "src/app/api/app/ads/import/route.ts";
      const { POST } = await loadSource(path, mocks);
      const data = new FormData();
      data.set("file", new File([new Uint8Array(limit + Number(overLimit))], "TEST-file"));
      const response = await POST(request(data), { params: Promise.resolve({ code: "TEST-ad" }) });
      assert.equal(response.status, overLimit ? 413 : kind === "assets" ? 201 : 200);
      assert.equal(writes, overLimit ? 0 : 1);
    });
  }
}
