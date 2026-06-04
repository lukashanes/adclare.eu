#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env");
const placeholderPattern = /^(replace_|change_this|your_|example|dummy|\.{3})/i;
const allowedSignupModes = new Set(["first-run", "disabled"]);
const errors = [];
const warnings = [];

function unquoteEnvValue(value) {
  const trimmed = value.trim();

  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function loadLocalEnv() {
  if (!existsSync(envPath)) {
    warnings.push(".env file not found; checking process environment only.");
    return;
  }

  const content = readFileSync(envPath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;

    if (process.env[key] === undefined) {
      process.env[key] = unquoteEnvValue(rawValue);
    }
  }
}

function env(name, fallback = "") {
  return (process.env[name] || fallback).trim();
}

function isPlaceholder(value) {
  return value.trim() === "" || placeholderPattern.test(value.trim());
}

function requireValue(name, message) {
  const value = env(name);

  if (!value || isPlaceholder(value)) {
    errors.push(message || `${name} is missing or still contains a placeholder value.`);
  }

  return value;
}

function requireHttpsUrl(name) {
  const value = requireValue(name);

  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "https:") {
      errors.push(`${name} must use https for production.`);
    }

    if (["localhost", "127.0.0.1", "::1"].includes(url.hostname) || url.hostname.endsWith(".example.org")) {
      errors.push(`${name} must point to the real production domain, not ${url.hostname}.`);
    }

    return url;
  } catch {
    errors.push(`${name} must be a valid URL.`);
    return null;
  }
}

function checkProductionUrls() {
  const appUrl = requireHttpsUrl("APP_URL");
  const publicAppUrl = requireHttpsUrl("NEXT_PUBLIC_APP_URL");

  if (appUrl && publicAppUrl && appUrl.origin !== publicAppUrl.origin) {
    errors.push("APP_URL and NEXT_PUBLIC_APP_URL should use the same origin.");
  }

  return appUrl || publicAppUrl;
}

function checkDatabase() {
  const databaseUrl = requireValue("DATABASE_URL");
  requireValue("POSTGRES_PASSWORD");

  if (databaseUrl && /localhost|127\\.0\\.0\\.1/.test(databaseUrl) && env("ADCLARE_PREFLIGHT_ALLOW_LOCAL_DB") !== "1") {
    warnings.push("DATABASE_URL points to localhost. This is fine only when the app and database run on the same production host or Docker network.");
  }
}

function checkEmail() {
  requireValue("EMAIL_FROM", "EMAIL_FROM must be set to a verified sender address.");
  requireValue("CLOUDFLARE_EMAIL_ACCOUNT_ID", "Cloudflare Email Service account id is required for production login and invitation emails.");
  requireValue("CLOUDFLARE_EMAIL_API_TOKEN", "Cloudflare Email Service API token is required for production login and invitation emails.");

  if (env("ADCLARE_LOG_EMAIL_LINKS") === "1") {
    warnings.push("ADCLARE_LOG_EMAIL_LINKS=1 has no effect in production, but set it to 0 to avoid confusion.");
  }
}

function checkTurnstile(publicUrl) {
  if (env("TURNSTILE_REQUIRED") !== "1") {
    errors.push("TURNSTILE_REQUIRED must be 1 for a public production instance.");
  }

  requireValue("TURNSTILE_SITE_KEY", "TURNSTILE_SITE_KEY is required for production form protection.");
  requireValue("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "NEXT_PUBLIC_TURNSTILE_SITE_KEY is required for production form protection.");
  requireValue("TURNSTILE_SECRET_KEY", "TURNSTILE_SECRET_KEY is required for production form protection.");

  const allowedHostnames = env("TURNSTILE_ALLOWED_HOSTNAMES");

  if (!allowedHostnames) {
    warnings.push("TURNSTILE_ALLOWED_HOSTNAMES is empty. Set it to the production hostname to reduce token replay risk.");
    return;
  }

  if (publicUrl && !allowedHostnames.split(",").map((item) => item.trim()).includes(publicUrl.hostname)) {
    errors.push(`TURNSTILE_ALLOWED_HOSTNAMES should include ${publicUrl.hostname}.`);
  }
}

function checkStorage() {
  const driver = env("ADCLARE_STORAGE_DRIVER", "local").toLowerCase();

  if (driver === "s3" || driver === "object-storage" || driver === "object_storage") {
    requireValue("OBJECT_STORAGE_ENDPOINT");
    requireValue("OBJECT_STORAGE_BUCKET");
    requireValue("OBJECT_STORAGE_ACCESS_KEY_ID");
    requireValue("OBJECT_STORAGE_SECRET_ACCESS_KEY");
    warnings.push("Run npm run storage:check, or the Docker storage-check tool, before inviting real users.");
    return;
  }

  if (driver !== "local" && driver !== "filesystem" && driver !== "fs") {
    errors.push(`Unsupported ADCLARE_STORAGE_DRIVER value: ${driver}. Use local or s3.`);
    return;
  }

  requireValue("ADCLARE_LOCAL_STORAGE_DIR", "ADCLARE_LOCAL_STORAGE_DIR must be set when local upload storage is used.");
  warnings.push("Local upload storage is enabled. Make sure this directory is included in backups together with PostgreSQL.");
}

function checkSignupAndPublicFlags() {
  const signupMode = env("SIGNUP_MODE", "first-run");

  if (!allowedSignupModes.has(signupMode)) {
    errors.push("SIGNUP_MODE should be first-run or disabled for production. Do not use open unless public workspace creation is intentional.");
  }

  if (env("NEXT_PUBLIC_SHOW_DEMO_REPO") === "1") {
    errors.push("NEXT_PUBLIC_SHOW_DEMO_REPO must be 0 for production.");
  }
}

function checkBackups() {
  if (!existsSync(resolve(process.cwd(), "scripts/backup-postgres.sh"))) {
    errors.push("PostgreSQL backup script is missing.");
  }

  if (!existsSync(resolve(process.cwd(), "scripts/restore-postgres.sh"))) {
    errors.push("PostgreSQL restore script is missing.");
  }

  warnings.push("Verify the production cron entry for scripts/backup-postgres.sh and test one restore before storing real campaign data.");
}

loadLocalEnv();
const publicUrl = checkProductionUrls();
checkDatabase();
checkEmail();
checkTurnstile(publicUrl);
checkStorage();
checkSignupAndPublicFlags();
checkBackups();

const result = {
  ok: errors.length === 0,
  checkedAt: new Date().toISOString(),
  errors,
  warnings,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

if (errors.length > 0) {
  process.exit(1);
}
