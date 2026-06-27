import { isSameOriginRequest } from "@/lib/request-security";
import { getAppSession } from "@/lib/app-auth";
import { buildAuditContext, withAuditContext } from "@/lib/audit";
import { normalizeLocale } from "@/lib/workspace/services/shared";
import { updateAppTenantSettings } from "@/lib/workspace/services/settings";
import { parseAppTenantSettingsInput, validationErrorResponse } from "@/lib/request-validation";

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

  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));

  try {
    const input = parseAppTenantSettingsInput(await request.json());
    const tenant = await withAuditContext(buildAuditContext(request, session), () => updateAppTenantSettings(session.userId, input));

    if (!tenant) {
      return Response.json({ error: "Nastavení strany nemůžete upravit." }, { status: 403 });
    }

    return Response.json({ tenant: { ...tenant, name: locale === "en" ? tenant.name : tenant.name } });
  } catch (error) {
    const validation = validationErrorResponse(error);

    if (validation) {
      return validation;
    }

    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Nastavení se nepodařilo uložit." }, { status: 400 });
  }
}
