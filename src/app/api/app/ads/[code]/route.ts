import { isSameOriginRequest } from "@/lib/admin-auth";
import { getAppSession } from "@/lib/app-auth";
import { normalizeLocale, updateAppAd } from "@/lib/admin-demo-db";
import type { EditableAdInput } from "@/lib/admin-demo-types";

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
  const input = (await request.json()) as EditableAdInput;
  const ad = await updateAppAd(session.userId, decodeURIComponent(code), input, locale);

  if (!ad) {
    return Response.json({ error: "Ad not found or not editable for this user." }, { status: 404 });
  }

  return Response.json({ ad });
}
