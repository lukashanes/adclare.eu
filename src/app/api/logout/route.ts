import { discardLimitedBody } from "@/lib/request-limits";
import { validationErrorResponse } from "@/lib/request-validation";
import { isSameOriginRequest } from "@/lib/request-security";
import { deleteAppSession, serializeAppSessionClearCookie } from "@/lib/app-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    await discardLimitedBody(request);
  } catch (error) {
    const validation = validationErrorResponse(error);
    if (validation) return validation;
    throw error;
  }

  await deleteAppSession(request.headers.get("cookie"));

  return new Response(null, {
    status: 303,
    headers: {
      Location: "/login",
      "Set-Cookie": serializeAppSessionClearCookie(),
      "Cache-Control": "no-store",
    },
  });
}
