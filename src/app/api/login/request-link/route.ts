import { readLimitedJson } from "@/lib/request-limits";
import { isSameOriginRequest } from "@/lib/request-security";
import { requestAppLoginLink } from "@/lib/app-auth";
import { rateLimitHeaders } from "@/lib/rate-limit";
import { checkPublicAuthRateLimit } from "@/lib/public-auth-rate-limit";
import { parseLoginRequestInput, validationErrorResponse } from "@/lib/request-validation";
import { verifyTurnstileToken } from "@/lib/turnstile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const body = parseLoginRequestInput(await readLimitedJson(request));
    const limit = await checkPublicAuthRateLimit(request, {
      scope: "login-link",
      target: body.email,
      limit: 8,
    });

    if (!limit.allowed) {
      return Response.json({ error: "Too many requests." }, { status: 429, headers: rateLimitHeaders(limit) });
    }

    const verification = await verifyTurnstileToken(request, body.turnstileToken);

    if (!verification.ok) {
      return Response.json({ error: "Verification failed." }, { status: 403 });
    }

    await requestAppLoginLink(body.email);
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
