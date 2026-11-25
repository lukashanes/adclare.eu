import { readLimitedJson } from "@/lib/request-limits";
import { isSameOriginRequest } from "@/lib/request-security";
import { acceptInvitation, normalizeLocale } from "@/lib/workspace-db";
import { rateLimitHeaders } from "@/lib/rate-limit";
import { checkPublicAuthRateLimit } from "@/lib/public-auth-rate-limit";
import { parseInviteAcceptInput, validationErrorResponse } from "@/lib/request-validation";
import { verifyTurnstileToken } from "@/lib/turnstile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  const { token } = await context.params;
  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));

  try {
    const body = parseInviteAcceptInput(await readLimitedJson(request));
    const decodedToken = decodeURIComponent(token);
    const limit = await checkPublicAuthRateLimit(request, {
      scope: "invite-accept",
      target: decodedToken,
      limit: 10,
    });

    if (!limit.allowed) {
      return Response.json({ error: "Too many requests." }, { status: 429, headers: rateLimitHeaders(limit) });
    }

    const verification = await verifyTurnstileToken(request, body.turnstileToken);

    if (!verification.ok) {
      return Response.json({ error: "Verification failed." }, { status: 403 });
    }

    const notice = await acceptInvitation(decodedToken, body.name, locale);

    if (!notice) {
      return Response.json({ error: "Invitation cannot be accepted." }, { status: 409 });
    }

    return Response.json({ invitation: notice });
  } catch (error) {
    const validation = validationErrorResponse(error);

    if (validation) {
      return validation;
    }

    console.error(error);
    return Response.json({ error: "Invitation accept failed." }, { status: 400 });
  }
}
