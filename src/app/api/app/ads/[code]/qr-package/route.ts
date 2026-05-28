import JSZip from "jszip";
import QRCode from "qrcode";
import { getAppSession } from "@/lib/app-auth";
import { getUserBillingAccess } from "@/lib/billing-access";
import { getAppAdRecord, normalizeLocale } from "@/lib/admin-demo-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const session = await getAppSession(request.headers.get("cookie"));

  if (!session) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [{ code }, locale] = await Promise.all([
    context.params,
    Promise.resolve(normalizeLocale(new URL(request.url).searchParams.get("locale"))),
  ]);
  const billingAccess = await getUserBillingAccess(session.userId, locale);

  if (!billingAccess?.canUseApp) {
    return Response.json({ error: "Zkušební přístup skončil nebo účet není aktivní.", activationRequired: true }, { status: 402 });
  }

  const ad = await getAppAdRecord(session.userId, decodeURIComponent(code), locale);

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
  const label = locale === "cs" ? "Informace o politické reklamě" : "Political advertising information";
  const zip = new JSZip();

  zip.file(`${ad.id}-qr.svg`, qrSvg);
  zip.file(
    `${ad.id}-notice.json`,
    JSON.stringify(
      {
        id: ad.id,
        title: ad.title,
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
    ),
  );
  zip.file(
    `${ad.id}-print-label.html`,
    `<!doctype html><html lang="${locale}"><meta charset="utf-8"><title>${ad.id}</title><body style="font-family:Arial,sans-serif;padding:24px"><div style="display:inline-flex;gap:16px;align-items:center;border:1px solid #111;padding:16px"><div>${qrSvg}</div><div><strong>${label}</strong><br>${ad.id}<br>${ad.publicUrl}</div></div></body></html>`,
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
