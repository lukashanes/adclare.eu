import { isSameOriginRequest } from "@/lib/request-security";
import { getAppSession } from "@/lib/app-auth";
import { buildAuditContext, withAuditContext } from "@/lib/audit";
import { getAppWorkspacePayload, normalizeLocale } from "@/lib/workspace/services/shared";
import { createAppAd } from "@/lib/workspace/services/ads";
import { parseEditableAdInput, validationErrorResponse } from "@/lib/request-validation";

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

  const url = new URL(request.url);
  const locale = normalizeLocale(url.searchParams.get("locale"));
  const payload = await getAppWorkspacePayload(session.userId, locale, {
    cursor: url.searchParams.get("cursor") || "",
    limit: url.searchParams.get("limit") || "",
  });

  if (!payload) {
    return unauthorized();
  }

  return Response.json(payload, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
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
    const input = parseEditableAdInput(await request.json());
    const ad = await withAuditContext(buildAuditContext(request, session), () => createAppAd(session.userId, input, locale));

    if (!ad) {
      return Response.json({ error: "Ad could not be created for this user." }, { status: 403 });
    }

    return Response.json({ ad }, { status: 201 });
  } catch (error) {
    const validation = validationErrorResponse(error);

    if (validation) {
      return validation;
    }

    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Ad create failed." }, { status: 400 });
  }
}
