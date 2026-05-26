import {
  adminNoStoreHeaders,
  createAdminSessionCookieValue,
  getRequestIp,
  isAdminAuthConfigured,
  isSameOriginRequest,
  serializeAdminSessionClearCookie,
  serializeAdminSessionCookie,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type LoginAttempt = {
  count: number;
  resetAt: number;
};

const attemptWindowMs = 10 * 60 * 1000;
const maxAttempts = 8;
const globalForAttempts = globalThis as typeof globalThis & {
  __adclareAdminLoginAttempts?: Map<string, LoginAttempt>;
};
const attempts = globalForAttempts.__adclareAdminLoginAttempts ?? new Map<string, LoginAttempt>();
globalForAttempts.__adclareAdminLoginAttempts = attempts;

function getAttempt(ip: string, now = Date.now()) {
  const attempt = attempts.get(ip);

  if (!attempt || attempt.resetAt < now) {
    const next = { count: 0, resetAt: now + attemptWindowMs };
    attempts.set(ip, next);
    return next;
  }

  return attempt;
}

function recordFailedAttempt(ip: string) {
  const attempt = getAttempt(ip);
  attempt.count += 1;
}

async function readPassword(request: Request) {
  try {
    const body = (await request.json()) as { password?: unknown };
    return typeof body.password === "string" ? body.password : "";
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403, headers: adminNoStoreHeaders() });
  }

  if (!isAdminAuthConfigured()) {
    return Response.json({ error: "Admin access is not configured." }, { status: 503, headers: adminNoStoreHeaders() });
  }

  const ip = getRequestIp(request);
  const attempt = getAttempt(ip);

  if (attempt.count >= maxAttempts) {
    return Response.json({ error: "Too many login attempts." }, { status: 429, headers: adminNoStoreHeaders() });
  }

  const password = await readPassword(request);

  if (!verifyAdminPassword(password)) {
    recordFailedAttempt(ip);
    return Response.json({ error: "Invalid password." }, { status: 401, headers: adminNoStoreHeaders() });
  }

  attempts.delete(ip);

  return Response.json(
    { ok: true },
    {
      headers: {
        ...adminNoStoreHeaders(),
        "Set-Cookie": serializeAdminSessionCookie(createAdminSessionCookieValue()),
      },
    },
  );
}

export async function DELETE() {
  return Response.json(
    { ok: true },
    {
      headers: {
        ...adminNoStoreHeaders(),
        "Set-Cookie": serializeAdminSessionClearCookie(),
      },
    },
  );
}
