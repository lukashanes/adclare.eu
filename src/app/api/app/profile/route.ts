import { isSameOriginRequest } from "@/lib/request-security";
import { getAppSession } from "@/lib/app-auth";
import { buildAuditContext, withAuditContext } from "@/lib/audit";
import { updateAppProfile } from "@/lib/workspace/services/users";
import { parseAppProfileInput, validationErrorResponse } from "@/lib/request-validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unauthorized() {
  return Response.json({ error: "Unauthorized." }, { status: 401 });
}

export async function PATCH(request: Request) {
  const session = await getAppSession(request.headers.get("cookie"));

  if (!session) {
    return unauthorized();
  }

  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const input = parseAppProfileInput(await request.json());
    const user = await withAuditContext(buildAuditContext(request, session), () => updateAppProfile(session.userId, input));

    if (!user) {
      return unauthorized();
    }

    return Response.json({ user });
  } catch (error) {
    const validation = validationErrorResponse(error);

    if (validation) {
      return validation;
    }

    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Profil se nepodařilo uložit." }, { status: 400 });
  }
}
