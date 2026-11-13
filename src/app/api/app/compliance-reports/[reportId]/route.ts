import { ComplianceReportStatus } from "@/generated/prisma/client";
import { getAppSession } from "@/lib/app-auth";
import { buildAuditContext, withAuditContext } from "@/lib/audit";
import { isSameOriginRequest } from "@/lib/request-security";
import { resolveComplianceReport } from "@/lib/workspace/services/compliance-reports";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ reportId: string }> }) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  const session = await getAppSession(request.headers.get("cookie"));

  if (!session) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { status?: string; resolution?: string };
  const allowed = new Set<ComplianceReportStatus>([
    ComplianceReportStatus.OPEN,
    ComplianceReportStatus.REVIEWING,
    ComplianceReportStatus.RESOLVED,
    ComplianceReportStatus.REJECTED,
  ]);
  const status = body.status as ComplianceReportStatus;
  const resolution = typeof body.resolution === "string" ? body.resolution.trim().slice(0, 2000) : "";

  if (!allowed.has(status)) {
    return Response.json({ error: "Invalid status." }, { status: 400 });
  }

  if ((status === ComplianceReportStatus.RESOLVED || status === ComplianceReportStatus.REJECTED) && !resolution) {
    return Response.json({ error: "Doplňte způsob vyřízení." }, { status: 400 });
  }

  const { reportId } = await context.params;
  const result = await withAuditContext(buildAuditContext(request, session), () =>
    resolveComplianceReport(session.userId, reportId, status, resolution),
  );

  if (!result) {
    return Response.json({ error: "Report not found or forbidden." }, { status: 404 });
  }

  return Response.json({ report: result }, { headers: { "Cache-Control": "private, no-store" } });
}
