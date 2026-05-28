import { randomUUID } from "node:crypto";

const placeholderValues = new Set(["", "replace_with_cloudflare_turnstile_secret", "replace_with_turnstile_secret"]);
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
  const configured = (process.env.TURNSTILE_ALLOWED_HOSTNAMES || "").split(",").map((item) => item.trim()).filter(Boolean);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (configured.length > 0) {
    return configured;
  }

  if (!appUrl) {
    return [];
  }

  try {
    return [new URL(appUrl).hostname];
  } catch {
    return [];
  }
}

function requestIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    ""
  );
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

  try {
    const body = new URLSearchParams({
      secret: turnstileSecret(),
      response: token,
      idempotency_key: randomUUID(),
    });
    const ip = requestIp(request);

    if (ip) {
      body.set("remoteip", ip);
    }

    const response = await fetch(siteverifyUrl, {
      method: "POST",
      body,
    });
    const result = (await response.json().catch(() => ({}))) as TurnstileSiteverifyResponse;

    const allowedHostnames = expectedHostnames();
    const hostnameAllowed =
      allowedHostnames.length === 0 || !result.hostname || allowedHostnames.includes(result.hostname);

    return {
      ok: response.ok && result.success === true && hostnameAllowed,
      skipped: false,
      errorCodes: hostnameAllowed ? (result["error-codes"] ?? []) : ["invalid-hostname"],
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
