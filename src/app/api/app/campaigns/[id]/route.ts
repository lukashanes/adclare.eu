import { isSameOriginRequest } from "@/lib/request-security";
import { getAppSession } from "@/lib/app-auth";
import { buildAuditContext, withAuditContext } from "@/lib/audit";
import { normalizeLocale } from "@/lib/workspace/services/shared";
import { updateAppCampaign } from "@/lib/workspace/services/campaigns";
import { parseAppCampaignInput, validationErrorResponse } from "@/lib/request-validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAppSession(request.headers.get("cookie"));

  if (!session) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  const [{ id }, locale] = await Promise.all([
    context.params,
    Promise.resolve(normalizeLocale(new URL(request.url).searchParams.get("locale"))),
  ]);

  try {
    const input = parseAppCampaignInput(await request.json());
    const campaign = await withAuditContext(buildAuditContext(request, session), () => updateAppCampaign(session.userId, decodeURIComponent(id), input, locale));

    if (!campaign) {
      return Response.json({ error: "Kampaň nenalezena nebo ji nemůžete upravit." }, { status: 404 });
    }

    return Response.json({ campaign });
  } catch (error) {
    const validation = validationErrorResponse(error);

    if (validation) {
      return validation;
    }

    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Kampaň se nepodařilo uložit." }, { status: 400 });
  }
}
