import JSZip from "jszip";
import { isSameOriginRequest } from "@/lib/admin-auth";
import { getAppSession } from "@/lib/app-auth";
import { getAppAuditPackage, normalizeLocale, prepareAppAuditExport } from "@/lib/admin-demo-db";

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
  const exportReady = await prepareAppAuditExport(session.userId, decodeURIComponent(code));

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
  const auditPackage = await getAppAuditPackage(session.userId, decodeURIComponent(code), locale);

  if (!auditPackage) {
    return Response.json({ error: "Ad not found." }, { status: 404 });
  }

  const zip = new JSZip();
  const readme =
    locale === "cs"
      ? "Auditní balíček obsahuje data reklamy, transparentní oznámení, schvalování a historii auditních událostí.\n"
      : "The audit package contains ad data, the transparency notice, approvals and audit event history.\n";

  zip.file("README.txt", readme);
  zip.file(`${auditPackage.ad.id}-audit-package.json`, JSON.stringify(auditPackage, null, 2));
  zip.file(`${auditPackage.ad.id}-notice.json`, JSON.stringify(auditPackage.notice, null, 2));
  zip.file(`${auditPackage.ad.id}-history.csv`, toCsv(auditPackage.auditLogs));
  zip.file(`${auditPackage.ad.id}-approvals.csv`, toCsv(auditPackage.approvals));

  const bytes = await zip.generateAsync({ type: "arraybuffer" });

  return new Response(new Blob([bytes]), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${auditPackage.ad.id.toLowerCase()}-audit-package.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
