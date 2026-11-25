import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

function preflight(overrides = {}) {
  const result = spawnSync(process.execPath, ["scripts/production-preflight.mjs"], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP,
      APP_URL: "https://adclare.test", NEXT_PUBLIC_APP_URL: "https://adclare.test",
      DATABASE_URL: "postgresql://TEST:TEST@db.invalid/TEST", POSTGRES_PASSWORD: "TEST-not-real",
      EMAIL_FROM: "TEST@example.invalid", CLOUDFLARE_EMAIL_ACCOUNT_ID: "TEST", CLOUDFLARE_EMAIL_API_TOKEN: "TEST",
      TURNSTILE_REQUIRED: "1", TURNSTILE_SITE_KEY: "TEST", NEXT_PUBLIC_TURNSTILE_SITE_KEY: "TEST", TURNSTILE_SECRET_KEY: "TEST",
      ADCLARE_LOCAL_STORAGE_DIR: "TEST-uploads", SIGNUP_MODE: "disabled", ...overrides,
    },
  });
  assert.ifError(result.error);
  return { status: result.status, ...JSON.parse(result.stdout) };
}

test("offline preflight explains hostname fallback and the required ingress check", () => {
  const result = preflight({ TURNSTILE_ALLOWED_HOSTNAMES: ", ," });
  assert.equal(result.status, 0);
  assert.ok(result.warnings.some((warning) => /APP_URL.*adclare.test/.test(warning)));
  assert.ok(result.warnings.some((warning) => /X-Real-IP/.test(warning)));
});

test("preflight compares hostnames case-insensitively and rejects a missing fallback", () => {
  assert.equal(preflight({ TURNSTILE_ALLOWED_HOSTNAMES: "ADCLARE.TEST" }).status, 0);
  const invalid = preflight({ APP_URL: "invalid-url", NEXT_PUBLIC_APP_URL: "invalid-url" });
  assert.equal(invalid.status, 1);
  assert.ok(invalid.errors.some((error) => /TURNSTILE_ALLOWED_HOSTNAMES.*APP_URL/.test(error)));
});
