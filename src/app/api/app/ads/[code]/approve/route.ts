import { isSameOriginRequest } from "@/lib/admin-auth";
import { getAppSession } from "@/lib/app-auth";
import { approveAppAd, normalizeLocale } from "@/lib/admin-demo-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
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
    const ad = await approveAppAd(session.userId, decodeURIComponent(code), locale);

    if (!ad) {
      return Response.json({ error: "Ad not found or not reviewable for this user." }, { status: 404 });
    }

    return Response.json({ ad });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Ad approval failed." }, { status: 409 });
  }
}
