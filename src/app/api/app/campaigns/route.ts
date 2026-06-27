import { isSameOriginRequest } from "@/lib/request-security";
import { getAppSession } from "@/lib/app-auth";
import { buildAuditContext, withAuditContext } from "@/lib/audit";
import { getAppWorkspacePayload, normalizeLocale } from "@/lib/workspace/services/shared";
import { createAppCampaign } from "@/lib/workspace/services/campaigns";
import { parseAppCampaignInput, validationErrorResponse } from "@/lib/request-validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unauthorized() {
  return Response.json({ error: "Unauthorized." }, { status: 401 });
}

export async function GET(request: Request) {
  const session = await getAppSession(request.headers.get("cookie"));

  if (!session) {
    return unauthorized();
  }

  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));
  const payload = await getAppWorkspacePayload(session.userId, locale);

  if (!payload) {
    return unauthorized();
  }

  return Response.json({ campaigns: payload.campaigns, permissions: payload.permissions });
}

export async function POST(request: Request) {
  const session = await getAppSession(request.headers.get("cookie"));

  if (!session) {
    return unauthorized();
  }

  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));

  try {
    const input = parseAppCampaignInput(await request.json());
    const campaign = await withAuditContext(buildAuditContext(request, session), () => createAppCampaign(session.userId, input, locale));

    if (!campaign) {
      return Response.json({ error: "Nemáte přístup ke správě kampaní." }, { status: 403 });
    }

    return Response.json({ campaign }, { status: 201 });
  } catch (error) {
    const validation = validationErrorResponse(error);

    if (validation) {
      return validation;
    }

    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Kampaň se nepodařilo založit." }, { status: 400 });
  }
}
