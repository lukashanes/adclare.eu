import {
  adminNoStoreHeaders,
  createAdminSessionCookieValue,
  getRequestIp,
  isAdminAuthConfigured,
  isDemoAdminEnabled,
  isSameOriginRequest,
  serializeAdminSessionClearCookie,
  serializeAdminSessionCookie,
  verifyAdminPassword,
} from "@/lib/admin-auth";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const attemptWindowMs = 10 * 60 * 1000;
const maxAttempts = 8;

async function readPassword(request: Request) {
  try {
    const body = (await request.json()) as { password?: unknown };
    return typeof body.password === "string" ? body.password : "";
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  if (!isDemoAdminEnabled()) {
    return Response.json({ error: "Demo admin is disabled." }, { status: 404, headers: adminNoStoreHeaders() });
  }

  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403, headers: adminNoStoreHeaders() });
  }

  if (!isAdminAuthConfigured()) {
    return Response.json({ error: "Admin access is not configured." }, { status: 503, headers: adminNoStoreHeaders() });
  }

  const ip = getRequestIp(request);
  const attempt = await checkRateLimit({
    scope: "admin-login",
    identifier: ip,
    limit: maxAttempts,
    windowMs: attemptWindowMs,
  });

  if (!attempt.allowed) {
    return Response.json(
      { error: "Too many login attempts." },
      { status: 429, headers: { ...adminNoStoreHeaders(), ...rateLimitHeaders(attempt) } },
    );
  }

  const password = await readPassword(request);

  if (!verifyAdminPassword(password)) {
    return Response.json({ error: "Invalid password." }, { status: 401, headers: adminNoStoreHeaders() });
  }

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
  if (!isDemoAdminEnabled()) {
    return Response.json({ ok: true }, { status: 404, headers: adminNoStoreHeaders() });
  }

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
