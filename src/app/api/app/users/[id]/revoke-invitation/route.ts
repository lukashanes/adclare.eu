import { isSameOriginRequest } from "@/lib/request-security";
import { getAppSession } from "@/lib/app-auth";
import { buildAuditContext, withAuditContext } from "@/lib/audit";
import { normalizeLocale } from "@/lib/workspace/services/shared";
import { revokeAppInvitation } from "@/lib/workspace/services/users";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAppSession(request.headers.get("cookie"));

  if (!session) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await context.params;
  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));

  try {
    const invitation = await withAuditContext(buildAuditContext(request, session), () => revokeAppInvitation(session.userId, decodeURIComponent(id), locale));

    if (!invitation) {
      return Response.json({ error: "Pozvánka nenalezena nebo nemáte přístup." }, { status: 404 });
    }

    return Response.json({ invitation });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Pozvánku se nepodařilo zrušit." }, { status: 400 });
  }
}
