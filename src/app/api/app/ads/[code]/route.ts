import { isSameOriginRequest } from "@/lib/request-security";
import { getAppSession } from "@/lib/app-auth";
import { normalizeLocale, updateAppAd } from "@/lib/workspace-db";
import { parseEditableAdInput, validationErrorResponse } from "@/lib/request-validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ code: string }> }) {
  const session = await getAppSession(request.headers.get("cookie"));

  if (!session) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  const [{ code }, locale] = await Promise.all([
    context.params,
    Promise.resolve(normalizeLocale(new URL(request.url).searchParams.get("locale"))),
  ]);
  try {
    const input = parseEditableAdInput(await request.json());
    const ad = await updateAppAd(session.userId, decodeURIComponent(code), input, locale);

    if (!ad) {
      return Response.json({ error: "Ad not found or not editable for this user." }, { status: 404 });
    }

    return Response.json({ ad });
  } catch (error) {
    const validation = validationErrorResponse(error);

    if (validation) {
      return validation;
    }

    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Ad update failed." }, { status: 400 });
  }
}
