import { isSameOriginRequest } from "@/lib/request-security";
import { getAppSession } from "@/lib/app-auth";
import { buildAuditContext, withAuditContext } from "@/lib/audit";
import { normalizeLocale } from "@/lib/workspace/services/shared";
import { updateAppMember } from "@/lib/workspace/services/users";
import { parseAppMemberUpdateInput, validationErrorResponse } from "@/lib/request-validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unauthorized() {
  return Response.json({ error: "Unauthorized." }, { status: 401 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAppSession(request.headers.get("cookie"));

  if (!session) {
    return unauthorized();
  }

  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await context.params;
  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));

  try {
    const input = parseAppMemberUpdateInput(await request.json());
    const member = await withAuditContext(buildAuditContext(request, session), () => updateAppMember(session.userId, decodeURIComponent(id), input, locale));

    if (!member) {
      return Response.json({ error: "Člověka se nepodařilo najít nebo nemáte přístup ke správě lidí." }, { status: 404 });
    }

    return Response.json({ member });
  } catch (error) {
    const validation = validationErrorResponse(error);

    if (validation) {
      return validation;
    }

    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Přístup se nepodařilo uložit." }, { status: 400 });
  }
}
