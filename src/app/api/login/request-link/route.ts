import { isSameOriginRequest } from "@/lib/request-security";
import { requestAppLoginLink } from "@/lib/app-auth";
import { buildAuditContext, withAuditContext } from "@/lib/audit";
import { checkRateLimit, rateLimitHeaders, requestIp } from "@/lib/rate-limit";
import { parseLoginRequestInput, validationErrorResponse } from "@/lib/request-validation";
import { verifyTurnstileToken } from "@/lib/turnstile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const body = parseLoginRequestInput(await request.json());
    const limit = await checkRateLimit({
      scope: "login-link",
      identifier: `${requestIp(request)}:${body.email}`,
      limit: 8,
      windowMs: 60 * 60 * 1000,
    });

    if (!limit.allowed) {
      return Response.json({ error: "Too many requests." }, { status: 429, headers: rateLimitHeaders(limit) });
    }

    const verification = await verifyTurnstileToken(request, body.turnstileToken);

    if (!verification.ok) {
      return Response.json({ error: "Verification failed." }, { status: 403 });
    }

    await withAuditContext(buildAuditContext(request), () => requestAppLoginLink(body.email));
    return Response.json({ ok: true });
  } catch (error) {
    const validation = validationErrorResponse(error);

    if (validation) {
      return validation;
    }

    console.error(error);
    return Response.json({ error: "Login link request failed." }, { status: 500 });
  }
}
