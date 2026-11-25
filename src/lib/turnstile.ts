import { randomUUID } from "node:crypto";
import { publicAppUrl } from "@/lib/instance-config";
import { requestIp } from "@/lib/request-ip";

const placeholderValues = new Set(["", "replace_with_cloudflare_turnstile_secret", "replace_with_turnstile_secret"]);
const placeholderSiteKeys = new Set(["", "replace_with_cloudflare_turnstile_site_key", "replace_with_turnstile_site_key"]);
const siteverifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileSiteverifyResponse = {
  success?: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
};

function turnstileSecret() {
  return (process.env.TURNSTILE_SECRET_KEY || "").trim();
}

export function publicTurnstileSiteKey() {
  const siteKey = (process.env.TURNSTILE_SITE_KEY || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "").trim();
  return placeholderSiteKeys.has(siteKey) ? "" : siteKey;
}

export function isTurnstileConfigured() {
  return !placeholderValues.has(turnstileSecret());
}

function shouldRequireTurnstile() {
  if (process.env.TURNSTILE_REQUIRED === "0") {
    return false;
  }

  return process.env.NODE_ENV === "production" || process.env.TURNSTILE_REQUIRED === "1";
}

function expectedHostnames() {
  const configured = (process.env.TURNSTILE_ALLOWED_HOSTNAMES || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);

  if (configured.length > 0) {
    return configured;
  }

  try {
    const hostname = new URL(publicAppUrl()).hostname.toLowerCase();
    return hostname ? [hostname] : [];
  } catch {
    return [];
  }
}

export async function verifyTurnstileToken(request: Request, token: string | undefined) {
  if (!isTurnstileConfigured()) {
    if (shouldRequireTurnstile()) {
      return {
        ok: false,
        skipped: false,
        errorCodes: ["turnstile-not-configured"],
      };
    }

    return {
      ok: true,
      skipped: true,
      errorCodes: [] as string[],
    };
  }

  if (!token || token.length > 2048) {
    return {
      ok: false,
      skipped: false,
      errorCodes: ["missing-input-response"],
    };
  }

  const allowedHostnames = expectedHostnames();
  if (allowedHostnames.length === 0) {
    if (process.env.NODE_ENV === "production") {
      console.error("[adclare] Turnstile hostname configuration is invalid. Set TURNSTILE_ALLOWED_HOSTNAMES or a valid APP_URL.");
    }
    return { ok: false, skipped: false, errorCodes: ["turnstile-hostname-not-configured"] };
  }

  try {
    const body = new URLSearchParams({
      secret: turnstileSecret(),
      response: token,
      idempotency_key: randomUUID(),
    });
    const ip = requestIp(request);

    if (ip !== "unknown") {
      body.set("remoteip", ip);
    }

    const response = await fetch(siteverifyUrl, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(10_000),
    });
    const result = (await response.json().catch(() => ({}))) as TurnstileSiteverifyResponse;

    const hostnameAllowed =
      typeof result.hostname === "string" && allowedHostnames.includes(result.hostname.toLowerCase());

    if (result.success === true && !hostnameAllowed && process.env.NODE_ENV === "production") {
      console.error("[adclare] Turnstile hostname does not match TURNSTILE_ALLOWED_HOSTNAMES or APP_URL. Check the public domain and www/apex variants.");
    }

    return {
      ok: response.ok && result.success === true && hostnameAllowed,
      skipped: false,
      errorCodes: result.success === true && !hostnameAllowed ? ["invalid-hostname"] : (result["error-codes"] ?? []),
      hostname: result.hostname,
      challengeTs: result.challenge_ts,
    };
  } catch {
    return {
      ok: false,
      skipped: false,
      errorCodes: ["internal-error"],
    };
  }
}
