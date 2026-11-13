import { getAppSession } from "@/lib/app-auth";
import { listComplianceReports } from "@/lib/workspace/services/compliance-reports";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getAppSession(request.headers.get("cookie"));

  if (!session) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const page = Number(params.get("page") || 1);
  const limit = Number(params.get("limit") || 25);
  const result = await listComplianceReports(session.userId, page, limit);

  if (!result) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
}

