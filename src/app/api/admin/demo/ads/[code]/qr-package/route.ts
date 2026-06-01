import JSZip from "jszip";
import QRCode from "qrcode";
import { requireAdminRequest } from "@/lib/admin-auth";
import { getDemoAdsPayload, normalizeLocale } from "@/lib/admin-demo-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  const notice = {
    id: ad.id,
    title: ad.title,
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
  const zip = new JSZip();

  zip.file(`${ad.id}-qr.svg`, qrSvg);
  zip.file(`${ad.id}-notice.json`, JSON.stringify(notice, null, 2));
  zip.file(
    `${ad.id}-print-label.html`,
    `<!doctype html><html lang="${locale}"><meta charset="utf-8"><title>${ad.id}</title><body style="font-family:Arial,sans-serif;padding:24px"><div style="display:inline-flex;gap:16px;align-items:center;border:1px solid #111;padding:16px"><div>${qrSvg}</div><div><strong>${label}</strong><br>${ad.id}<br>${publicUrl}</div></div></body></html>`,
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
