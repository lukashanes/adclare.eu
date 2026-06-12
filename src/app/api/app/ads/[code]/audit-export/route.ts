import JSZip from "jszip";
import { isSameOriginRequest } from "@/lib/request-security";
import { getAppSession } from "@/lib/app-auth";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getAppAuditPackage, normalizeLocale, prepareAppAuditExport } from "@/lib/workspace-db";
import { addExportFile, buildExportManifest, type ExportManifestFile } from "@/lib/export-manifest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toCsv(rows: Array<Record<string, string>>) {
  const headers = Object.keys(rows[0] ?? { id: "", actor: "", action: "", message: "", createdAt: "" });
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;

  return [headers.map(escape).join(","), ...rows.map((row) => headers.map((header) => escape(row[header] ?? "")).join(","))].join("\n");
}

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  const session = await getAppSession(request.headers.get("cookie"));

  if (!session) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  const { code } = await context.params;
  const decodedCode = decodeURIComponent(code);
  const limit = await checkRateLimit({
    scope: "audit-export-prepare",
    identifier: `${session.userId}:${decodedCode}`,
    limit: 60,
    windowMs: 60 * 60 * 1000,
  });

  if (!limit.allowed) {
    return Response.json({ error: "Too many export requests." }, { status: 429, headers: rateLimitHeaders(limit) });
  }

  const exportReady = await prepareAppAuditExport(session.userId, decodedCode);

  if (!exportReady) {
    return Response.json({ error: "Ad not found." }, { status: 404 });
  }

  return Response.json({ exportReady });
}

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const session = await getAppSession(request.headers.get("cookie"));

  if (!session) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [{ code }, locale] = await Promise.all([
    context.params,
    Promise.resolve(normalizeLocale(new URL(request.url).searchParams.get("locale"))),
  ]);
  const decodedCode = decodeURIComponent(code);
  const limit = await checkRateLimit({
    scope: "audit-export-download",
    identifier: `${session.userId}:${decodedCode}`,
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });

  if (!limit.allowed) {
    return Response.json({ error: "Too many audit package downloads." }, { status: 429, headers: rateLimitHeaders(limit) });
  }

  const auditPackage = await getAppAuditPackage(session.userId, decodedCode, locale);

  if (!auditPackage) {
    return Response.json({ error: "Ad not found." }, { status: 404 });
  }

  const zip = new JSZip();
  const files: ExportManifestFile[] = [];
  const generatedAt = new Date().toISOString();
  const readme =
    locale === "cs"
      ? "Balíček pro kontrolu obsahuje data reklamy, veřejné oznámení, schvalování a historii změn.\n"
      : "The control package contains ad data, the public notice, approvals and change history.\n";

  addExportFile(zip, files, "README.txt", readme, "text/plain; charset=utf-8");
  addExportFile(zip, files, `${auditPackage.ad.id}-control-package.json`, JSON.stringify(auditPackage, null, 2), "application/json");
  addExportFile(zip, files, `${auditPackage.ad.id}-notice.json`, JSON.stringify(auditPackage.notice, null, 2), "application/json");
  addExportFile(zip, files, `${auditPackage.ad.id}-history.csv`, toCsv(auditPackage.auditLogs), "text/csv; charset=utf-8");
  addExportFile(zip, files, `${auditPackage.ad.id}-approvals.csv`, toCsv(auditPackage.approvals), "text/csv; charset=utf-8");
  zip.file(
    "manifest.json",
    JSON.stringify(
      buildExportManifest({
        packageType: "ad-audit-package",
        locale,
        generatedAt,
        subject: {
          tenantId: auditPackage.tenant.id,
          tenantSlug: auditPackage.tenant.slug,
          tenantName: auditPackage.tenant.name,
          campaignId: auditPackage.campaign.id,
          campaignSlug: auditPackage.campaign.slug,
          adId: auditPackage.ad.id,
          adTitle: auditPackage.ad.title,
          publicUrl: auditPackage.notice.publicUrl,
          workflowStatus: auditPackage.notice.workflowStatus,
          version: auditPackage.notice.version,
          approvals: auditPackage.approvals.length,
          auditLogs: auditPackage.auditLogs.length,
          assets: auditPackage.assets.length,
        },
        files,
      }),
      null,
      2,
    ),
  );

  const bytes = await zip.generateAsync({ type: "arraybuffer" });

  return new Response(new Blob([bytes]), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${auditPackage.ad.id.toLowerCase()}-audit-package.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
