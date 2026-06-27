#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env");
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
    return;
  }

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = unquoteEnvValue(match[2]);
    }
  }
}

function env(name, fallback = "") {
  return (process.env[name] || fallback).trim();
}

function publicUrl() {
  const value = env("SMOKE_URL") || env("APP_URL") || env("NEXT_PUBLIC_APP_URL");

  if (!value) {
    errors.push("SMOKE_URL, APP_URL or NEXT_PUBLIC_APP_URL must be set.");
    return null;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "https:" && env("ADCLARE_SMOKE_ALLOW_HTTP") !== "1") {
      errors.push("Production smoke URL must use HTTPS. Set ADCLARE_SMOKE_ALLOW_HTTP=1 only for local smoke checks.");
    }

    return url;
  } catch {
    errors.push("Smoke URL must be a valid URL.");
    return null;
  }
}

async function fetchText(base, path) {
  const response = await fetch(new URL(path, base), {
    redirect: "manual",
    headers: {
      "User-Agent": "Adclare production smoke",
    },
  });
  const text = await response.text().catch(() => "");

  return { response, text };
}

function header(response, name) {
  return response.headers.get(name) || "";
}

function requireHeader(response, name, expected) {
  const value = header(response, name);

  if (!value || (expected && !value.includes(expected))) {
    errors.push(`${name} header is missing or invalid.`);
  }
}

loadLocalEnv();
const base = publicUrl();

if (base) {
  try {
    const health = await fetchText(base, "/api/health");

    if (!health.response.ok) {
      errors.push(`/api/health returned ${health.response.status}.`);
    } else {
      const payload = JSON.parse(health.text);

      if (payload.ok !== true || payload.db !== "ok") {
        errors.push("/api/health did not report ok service and database status.");
      }
    }
  } catch (error) {
    errors.push(`/api/health failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const home = await fetchText(base, "/cs");

    if (!home.response.ok) {
      errors.push(`/cs returned ${home.response.status}.`);
    }

    requireHeader(home.response, "x-frame-options", "DENY");
    requireHeader(home.response, "content-security-policy", "frame-ancestors 'none'");
    requireHeader(home.response, "strict-transport-security", "max-age");

    if (!home.text.includes("TTPA") || !home.text.includes("support@adclare.eu")) {
      errors.push("Public homepage is missing TTPA or support contact copy.");
    }

    if (/demo admin|admin demo|Hetzner VPS|Next\.js/i.test(home.text)) {
      errors.push("Public homepage appears to expose internal/demo wording.");
    }

    if (env("TURNSTILE_REQUIRED") === "1" && !env("TURNSTILE_SITE_KEY")) {
      warnings.push("TURNSTILE_REQUIRED=1 but TURNSTILE_SITE_KEY is not visible in this smoke environment.");
    }
  } catch (error) {
    errors.push(`/cs failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  for (const path of ["/robots.txt", "/sitemap.xml"]) {
    try {
      const result = await fetchText(base, path);

      if (!result.response.ok) {
        errors.push(`${path} returned ${result.response.status}.`);
      }
    } catch (error) {
      errors.push(`${path} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

const result = {
  ok: errors.length === 0,
  checkedAt: new Date().toISOString(),
  target: base?.origin ?? "",
  errors,
  warnings,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

if (errors.length > 0) {
  process.exit(1);
}
