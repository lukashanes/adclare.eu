import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "adclare_admin_session";

const sessionVersion = "v1";
const sessionTtlSeconds = 12 * 60 * 60;
const minSecretLength = 32;
const placeholderValues = new Set(["", "replace_with_generated_password", "replace_with_admin_password", "replace_with_admin_session_secret"]);

export function isDemoAdminEnabled() {
  const configured = process.env.ENABLE_DEMO_ADMIN?.trim();

  if (configured === "1" || configured === "true") {
    return true;
  }

  if (configured === "0" || configured === "false") {
    return false;
  }

  return process.env.NODE_ENV !== "production";
}

function getAdminPassword() {
  return process.env.ADMIN_ACCESS_PASSWORD?.trim() ?? "";
}

function getSessionSecret() {
  return (process.env.ADMIN_SESSION_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "").trim();
}

export function isAdminAuthConfigured() {
  const password = getAdminPassword();
  const secret = getSessionSecret();

  return !placeholderValues.has(password) && !placeholderValues.has(secret) && secret.length >= minSecretLength;
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    const length = Math.max(leftBuffer.length, rightBuffer.length);
    timingSafeEqual(Buffer.alloc(length), Buffer.alloc(length));
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function signSessionPayload(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

export function verifyAdminPassword(password: string) {
  if (!isAdminAuthConfigured()) {
    return false;
  }

  return safeEqual(password, getAdminPassword());
}

export function createAdminSessionCookieValue(now = Date.now()) {
  if (!isAdminAuthConfigured()) {
    throw new Error("Admin authentication is not configured.");
  }

  const expiresAt = Math.floor(now / 1000) + sessionTtlSeconds;
  const nonce = randomBytes(18).toString("base64url");
  const payload = `${sessionVersion}.${expiresAt}.${nonce}`;

  return `${payload}.${signSessionPayload(payload)}`;
}

export function isValidAdminSessionCookie(value: string | undefined, now = Date.now()) {
  if (!value || !isAdminAuthConfigured()) {
    return false;
  }

  const parts = value.split(".");

  if (parts.length !== 4 || parts[0] !== sessionVersion) {
    return false;
  }

  const expiresAt = Number(parts[1]);

  if (!Number.isSafeInteger(expiresAt) || expiresAt * 1000 < now) {
    return false;
  }

  const payload = parts.slice(0, 3).join(".");
  const signature = parts[3];

  return safeEqual(signature, signSessionPayload(payload));
}

export function readCookieFromHeader(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return undefined;
  }

  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");

    if (rawKey === name) {
      const value = rawValue.join("=");

      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }

  return undefined;
}

function serializeCookie(name: string, value: string, attributes: Record<string, string | number | boolean>) {
  const segments = [`${name}=${encodeURIComponent(value)}`];

  for (const [key, attributeValue] of Object.entries(attributes)) {
    if (attributeValue === true) {
      segments.push(key);
    } else if (attributeValue !== false) {
      segments.push(`${key}=${attributeValue}`);
    }
  }

  return segments.join("; ");
}

export function serializeAdminSessionCookie(value: string, now = Date.now()) {
  return serializeCookie(ADMIN_SESSION_COOKIE, value, {
    Path: "/",
    HttpOnly: true,
    "SameSite": "Strict",
    Secure: process.env.NODE_ENV === "production",
    "Max-Age": sessionTtlSeconds,
    Expires: new Date(now + sessionTtlSeconds * 1000).toUTCString(),
  });
}

export function serializeAdminSessionClearCookie() {
  return serializeCookie(ADMIN_SESSION_COOKIE, "", {
    Path: "/",
    HttpOnly: true,
    "SameSite": "Strict",
    Secure: process.env.NODE_ENV === "production",
    "Max-Age": 0,
    Expires: new Date(0).toUTCString(),
  });
}

export function isAdminRequestAuthenticated(request: Request) {
  return isValidAdminSessionCookie(readCookieFromHeader(request.headers.get("cookie"), ADMIN_SESSION_COOKIE));
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");

  if (!host) {
    return false;
  }

  return origin === `${proto}://${host}`;
}

export function adminNoStoreHeaders() {
  return {
    "Cache-Control": "private, no-store, max-age=0",
  };
}

export function requireAdminRequest(request: Request, options: { mutating?: boolean } = {}) {
  if (!isDemoAdminEnabled()) {
    return Response.json({ error: "Demo admin is disabled." }, { status: 404, headers: adminNoStoreHeaders() });
  }

  if (!isAdminRequestAuthenticated(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401, headers: adminNoStoreHeaders() });
  }

  if (options.mutating && !isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403, headers: adminNoStoreHeaders() });
  }

  return null;
}

export function getRequestIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
