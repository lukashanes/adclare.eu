import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { loadSource } from "./load-source.mjs";

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
      const workspaceImport = source.match(/import \{([^}]+)\} from "@\/lib\/workspace-db"/);
      if (workspaceImport) {
        mocks["@/lib/workspace-db"] = Object.fromEntries(workspaceImport[1].split(",").map((name) => {
          name = name.trim();
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
