import JSZip from "jszip";
import QRCode from "qrcode";
import { getAppSession } from "@/lib/app-auth";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getAppAdRecord, normalizeLocale } from "@/lib/workspace-db";
import { addExportFile, buildExportManifest, type ExportManifestFile } from "@/lib/export-manifest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
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
    scope: "qr-package",
    identifier: `${session.userId}:${decodedCode}`,
    limit: 60,
    windowMs: 60 * 60 * 1000,
  });

  if (!limit.allowed) {
    return Response.json({ error: "Too many QR package downloads." }, { status: 429, headers: rateLimitHeaders(limit) });
  }

  const ad = await getAppAdRecord(session.userId, decodedCode, locale);

  if (!ad) {
    return Response.json({ error: "Ad not found." }, { status: 404 });
  }

  if (ad.missing.length > 0) {
    return Response.json({ error: "Required data is missing." }, { status: 409 });
  }

  const qrSvg = await QRCode.toString(ad.publicUrl, {
    type: "svg",
    margin: 1,
    width: 640,
    errorCorrectionLevel: "M",
  });
  const qrPng = await QRCode.toBuffer(ad.publicUrl, {
    type: "png",
    margin: 1,
    width: 1200,
    errorCorrectionLevel: "M",
  });
  const label = locale === "cs" ? "Informace o politické reklamě" : "Political advertising information";
  const zip = new JSZip();
  const files: ExportManifestFile[] = [];
  const generatedAt = new Date().toISOString();
  const noticeJson = JSON.stringify(
    {
      id: ad.id,
      title: ad.title,
      candidate: ad.candidate,
      publicUrl: ad.publicUrl,
      version: ad.version,
      workflowStatus: ad.workflowStatus,
      workflowLabel: ad.workflowLabel,
      locked: ad.locked,
      channel: ad.channel,
      payer: ad.payer,
      supplier: ad.supplier,
      amount: ad.amount,
      fundingSource: ad.fundingSource,
      period: ad.period,
      distributionArea: ad.distributionArea,
      language: ad.language,
      isTargeted: ad.isTargeted,
      targeting: ad.targeting,
      targetAudience: ad.targetAudience,
      assets: ad.assets.map((asset) => ({
        id: asset.id,
        fileName: asset.fileName,
        originalName: asset.originalName,
        contentType: asset.contentType,
        byteSize: asset.byteSize,
        checksumSha256: asset.checksumSha256,
        uploadedAt: asset.uploadedAt,
      })),
    },
    null,
    2,
  );
  const printLabelHtml = `<!doctype html><html lang="${locale}"><meta charset="utf-8"><title>${escapeHtml(ad.id)}</title><body style="font-family:Arial,sans-serif;padding:24px"><div style="display:inline-flex;gap:16px;align-items:center;border:1px solid #111;padding:16px;max-width:720px"><div style="width:180px">${qrSvg}</div><div style="font-size:16px;line-height:1.45;word-break:break-word"><strong>${escapeHtml(label)}</strong><br>${escapeHtml(ad.id)}<br>${escapeHtml(ad.publicUrl)}</div></div></body></html>`;
  const readme =
    locale === "cs"
      ? `QR podklady pro reklamu ${ad.id}\n\nQR kód vede na:\n${ad.publicUrl}\n\nObsah balíčku:\n- ${ad.id}-qr.svg: vektorový QR kód pro grafiku a tisk\n- ${ad.id}-qr.png: bitmapový QR kód ve vysokém rozlišení\n- ${ad.id}-print-label.html: jednoduchý tiskový štítek\n- ${ad.id}-notice.json: data veřejného oznámení\n- ${ad.id}-manifest.json: kontrolní manifest balíčku se SHA-256 otisky\n`
      : `QR files for ad ${ad.id}\n\nThe QR code points to:\n${ad.publicUrl}\n\nPackage contents:\n- ${ad.id}-qr.svg: vector QR code for design and print\n- ${ad.id}-qr.png: high-resolution bitmap QR code\n- ${ad.id}-print-label.html: simple printable label\n- ${ad.id}-notice.json: public notice data\n- ${ad.id}-manifest.json: package manifest with SHA-256 hashes\n`;

  addExportFile(zip, files, `${ad.id}-qr.svg`, qrSvg, "image/svg+xml");
  addExportFile(zip, files, `${ad.id}-qr.png`, qrPng, "image/png");
  addExportFile(zip, files, `${ad.id}-notice.json`, noticeJson, "application/json");
  addExportFile(zip, files, `${ad.id}-print-label.html`, printLabelHtml, "text/html; charset=utf-8");
  addExportFile(zip, files, "README.txt", readme, "text/plain; charset=utf-8");
  zip.file(
    `${ad.id}-manifest.json`,
    JSON.stringify(
      buildExportManifest({
        packageType: "qr-package",
        locale,
        generatedAt,
        subject: {
          adId: ad.id,
          adTitle: ad.title,
          publicUrl: ad.publicUrl,
          qrTarget: ad.publicUrl,
          workflowStatus: ad.workflowStatus,
          version: ad.version,
          printLabel: `${ad.id}-print-label.html`,
          formats: "svg,png,html,json",
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
      "Content-Disposition": `attachment; filename="${ad.id.toLowerCase()}-qr-package.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
