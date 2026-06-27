import { isSameOriginRequest } from "@/lib/request-security";
import { deleteAppSession, serializeAppSessionClearCookie } from "@/lib/app-auth";
import { buildAuditContext, withAuditContext } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  await withAuditContext(buildAuditContext(request), () => deleteAppSession(request.headers.get("cookie")));

  return new Response(null, {
    status: 303,
    headers: {
      Location: "/login",
      "Set-Cookie": serializeAppSessionClearCookie(),
      "Cache-Control": "no-store",
    },
  });
}
