import { isSameOriginRequest } from "@/lib/admin-auth";
import { checkRateLimit, rateLimitHeaders, requestIp } from "@/lib/rate-limit";
import { parseSignupInput, validationErrorResponse } from "@/lib/request-validation";
import { createSignupWorkspace } from "@/lib/signup";
import { verifyTurnstileToken } from "@/lib/turnstile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const body = parseSignupInput(await request.json());
    const limit = await checkRateLimit({
      scope: "signup",
      identifier: `${requestIp(request)}:${body.email}`,
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });

    if (!limit.allowed) {
      return Response.json({ error: "Too many requests." }, { status: 429, headers: rateLimitHeaders(limit) });
    }

    const verification = await verifyTurnstileToken(request, body.turnstileToken);

    if (!verification.ok) {
      return Response.json({ error: "Verification failed." }, { status: 403 });
    }

    const signup = await createSignupWorkspace({
      organizationName: body.organizationName,
      name: body.name,
      email: body.email,
    });

    return Response.json(signup, { status: signup.created ? 201 : 200 });
  } catch (error) {
    const validation = validationErrorResponse(error);

    if (validation) {
      return validation;
    }

    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Signup failed." }, { status: 400 });
  }
}
