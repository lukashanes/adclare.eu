import { buildAuditContext } from "@/lib/audit";
import { createComplianceReport } from "@/lib/compliance-reports";
import { checkRateLimit, rateLimitHeaders, requestIp } from "@/lib/rate-limit";
import { parseComplianceReportInput, validationErrorResponse } from "@/lib/request-validation";
import { verifyTurnstileToken } from "@/lib/turnstile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const publicToken = decodeURIComponent(code);
    const limit = await checkRateLimit({
      scope: "public-compliance-report",
      identifier: `${requestIp(request)}:${publicToken}`,
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });

    if (!limit.allowed) {
      return Response.json({ error: "Too many reports." }, { status: 429, headers: rateLimitHeaders(limit) });
    }

    const input = parseComplianceReportInput(await request.json());
    const verification = await verifyTurnstileToken(request, input.turnstileToken);

    if (!verification.ok) {
      return Response.json({ error: "Ověření formuláře se nezdařilo." }, { status: 400 });
    }

    const report = await createComplianceReport(
      publicToken,
      {
        reporterName: input.reporterName,
        reporterEmail: input.reporterEmail,
        reason: input.reason,
        details: input.details,
      },
      buildAuditContext(request),
    );

    if (!report) {
      return Response.json({ error: "Veřejné oznámení nebylo nalezeno." }, { status: 404 });
    }

    return Response.json({ report }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const validation = validationErrorResponse(error);

    if (validation) {
      return validation;
    }

    console.error(error);
    return Response.json({ error: "Hlášení se nepodařilo uložit." }, { status: 500 });
  }
}
