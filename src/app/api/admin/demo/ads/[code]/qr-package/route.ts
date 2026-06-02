import JSZip from "jszip";
import QRCode from "qrcode";
import { requireAdminRequest } from "@/lib/admin-auth";
import { getDemoAdsPayload, normalizeLocale } from "@/lib/admin-demo-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const authResponse = requireAdminRequest(request);

  if (authResponse) {
    return authResponse;
  }

  const [{ code }, locale] = await Promise.all([
    context.params,
    Promise.resolve(normalizeLocale(new URL(request.url).searchParams.get("locale"))),
  ]);
  const payload = await getDemoAdsPayload(locale);
  const ad = payload.ads.find((item) => item.id === decodeURIComponent(code));

  if (!ad) {
    return Response.json({ error: "Ad not found." }, { status: 404 });
  }

  if (ad.missing.length > 0) {
    return Response.json({ error: "Required data is missing." }, { status: 409 });
  }

  const publicUrl = ad.publicUrl;
  const qrSvg = await QRCode.toString(publicUrl, {
    type: "svg",
    margin: 1,
    width: 640,
    errorCorrectionLevel: "M",
  });
  const qrPng = await QRCode.toBuffer(publicUrl, {
    type: "png",
    margin: 1,
    width: 1200,
    errorCorrectionLevel: "M",
  });
  const notice = {
    id: ad.id,
    title: ad.title,
    candidate: ad.candidate,
    publicUrl,
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
  };
  const label = locale === "cs" ? "Informace o politické reklamě" : "Political advertising information";
  const packageFiles = [
    `${ad.id}-qr.svg`,
    `${ad.id}-qr.png`,
    `${ad.id}-notice.json`,
    `${ad.id}-manifest.json`,
    `${ad.id}-print-label.html`,
    "README.txt",
  ];
  const zip = new JSZip();

  zip.file(`${ad.id}-qr.svg`, qrSvg);
  zip.file(`${ad.id}-qr.png`, qrPng);
  zip.file(`${ad.id}-notice.json`, JSON.stringify(notice, null, 2));
  zip.file(
    `${ad.id}-manifest.json`,
    JSON.stringify(
      {
        id: ad.id,
        title: ad.title,
        publicUrl,
        generatedAt: new Date().toISOString(),
        qrTarget: publicUrl,
        packageFiles,
        printLabel: `${ad.id}-print-label.html`,
        formats: ["svg", "png", "html", "json"],
      },
      null,
      2,
    ),
  );
  zip.file(
    `${ad.id}-print-label.html`,
    `<!doctype html><html lang="${locale}"><meta charset="utf-8"><title>${escapeHtml(ad.id)}</title><body style="font-family:Arial,sans-serif;padding:24px"><div style="display:inline-flex;gap:16px;align-items:center;border:1px solid #111;padding:16px;max-width:720px"><div style="width:180px">${qrSvg}</div><div style="font-size:16px;line-height:1.45;word-break:break-word"><strong>${escapeHtml(label)}</strong><br>${escapeHtml(ad.id)}<br>${escapeHtml(publicUrl)}</div></div></body></html>`,
  );
  zip.file(
    "README.txt",
    locale === "cs"
      ? `QR balíček pro reklamu ${ad.id}\n\nQR kód vede na:\n${publicUrl}\n\nObsah balíčku:\n- ${ad.id}-qr.svg: vektorový QR kód pro grafiku a tisk\n- ${ad.id}-qr.png: bitmapový QR kód ve vysokém rozlišení\n- ${ad.id}-print-label.html: jednoduchý tiskový štítek\n- ${ad.id}-notice.json: data transparentního oznámení\n- ${ad.id}-manifest.json: technický souhrn balíčku\n`
      : `QR package for ad ${ad.id}\n\nThe QR code points to:\n${publicUrl}\n\nPackage contents:\n- ${ad.id}-qr.svg: vector QR code for design and print\n- ${ad.id}-qr.png: high-resolution bitmap QR code\n- ${ad.id}-print-label.html: simple printable label\n- ${ad.id}-notice.json: transparency notice data\n- ${ad.id}-manifest.json: package manifest\n`,
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
