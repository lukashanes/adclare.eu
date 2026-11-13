import JSZip from "jszip";
import QRCode from "qrcode";
import { getAppSession } from "@/lib/app-auth";
import { buildAuditContext, withAuditContext } from "@/lib/audit";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { normalizeLocale } from "@/lib/workspace/services/shared";
import { getAppAdRecord } from "@/lib/workspace/services/ads";
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

  const ad = await withAuditContext(buildAuditContext(request, session), () => getAppAdRecord(session.userId, decodedCode, locale, "download_qr_package"));

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
  const label = locale === "cs" ? "POLITICKÁ REKLAMA" : "POLITICAL ADVERTISEMENT";
  const targetingLabel = ad.usesPersonalData
    ? locale === "cs"
      ? "Používá cílení nebo doručování založené na OSOBNÍCH ÚDAJÍCH"
      : "Uses targeting or ad delivery based on PERSONAL DATA"
    : "";
  const sponsorLabel = locale === "cs" ? `Zadavatel: ${ad.owner}` : `Sponsor: ${ad.owner}`;
  const controllerLabel = ad.controllerName
    ? locale === "cs"
      ? `Zadavatele ovládá: ${ad.controllerName}`
      : `The sponsor is controlled by: ${ad.controllerName}`
    : "";
  const electionLabel = locale === "cs"
    ? `Souvisí s: ${ad.campaignElection}${ad.campaignElectionDate ? `, ${ad.campaignElectionDate}` : ""}`
    : `Linked to: ${ad.campaignElection}${ad.campaignElectionDate ? `, ${ad.campaignElectionDate}` : ""}`;
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
      sponsor: {
        name: ad.owner,
        email: ad.ownerEmail,
        postalAddress: ad.ownerPostalAddress,
        establishmentAddress: ad.ownerEstablishmentAddress,
        registrationNumber: ad.ownerRegistrationNumber,
        entityType: ad.ownerEntityType,
      },
      controllingEntity: ad.controllerName
        ? {
            name: ad.controllerName,
            email: ad.controllerEmail,
            postalAddress: ad.controllerPostalAddress,
            establishmentAddress: ad.controllerEstablishmentAddress,
            entityType: ad.controllerEntityType,
          }
        : null,
      payer: ad.payer,
      payerDetails: {
        email: ad.payerEmail,
        postalAddress: ad.payerPostalAddress,
        establishmentAddress: ad.payerEstablishmentAddress,
        entityType: ad.payerEntityType,
      },
      supplier: ad.supplier,
      amount: ad.amount,
      benefitsInKind: ad.benefitsInKind,
      currency: ad.currency,
      fundingSource: ad.fundingSource,
      fundingOrigin: ad.fundingOrigin,
      fundingJurisdiction: ad.fundingJurisdiction,
      calculationMethod: ad.calculationMethod,
      dissemination: {
        startsAt: ad.disseminationStartsAt,
        endsAt: ad.disseminationEndsAt,
        period: ad.period,
      },
      distributionArea: ad.distributionArea,
      campaign: {
        name: ad.campaign,
        election: ad.campaignElection,
        electionLevel: ad.campaignElectionLevel,
        electionDate: ad.campaignElectionDate,
        officialInformationUrl: ad.campaignOfficialInformationUrl,
        aggregatedAmount: ad.campaignAggregatedAmount,
        benefitsInKind: ad.campaignBenefitsInKind,
        currency: ad.campaignCurrency,
        calculationMethod: ad.campaignCalculationMethod,
      },
      advertisementUrl: ad.advertisementUrl,
      publisherPlatform: ad.publisherPlatform,
      europeanRepositoryUrl: ad.europeanRepositoryUrl,
      republishedAfterInfringement: ad.republishedAfterInfringement,
      infringementDetails: ad.infringementDetails,
      language: ad.language,
      isTargeted: ad.isTargeted,
      usesPersonalData: ad.usesPersonalData,
      targeting: ad.targeting,
      targetAudience: ad.targetAudience,
      targetingDataCategories: ad.targetingDataCategories,
      targetingLogic: ad.targetingLogic,
      targetingAiUse: ad.targetingAiUse,
      targetingPolicyUrl: ad.targetingPolicyUrl,
      dataController: ad.dataController,
      consentWithdrawUrl: ad.consentWithdrawUrl,
      dataRightsUrl: ad.dataRightsUrl,
      privacyInformationUrl: ad.privacyInformationUrl,
      reach: {
        views: ad.reachViews,
        engagements: ad.reachEngagements,
        clicks: ad.reachClicks,
        likes: ad.reachLikes,
        comments: ad.reachComments,
      },
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
  const printLabelHtml = `<!doctype html><html lang="${locale}"><meta charset="utf-8"><title>${escapeHtml(ad.id)}</title><body style="font-family:Arial,sans-serif;padding:24px;color:#000;background:#fff"><div style="display:inline-flex;gap:18px;align-items:center;border:2px solid #000;padding:16px;max-width:820px;background:#fff"><div style="width:190px;min-width:190px">${qrSvg}</div><div style="font-size:16px;line-height:1.45;word-break:break-word"><strong style="display:block;font-size:20px">${escapeHtml(label)}</strong>${targetingLabel ? `<strong style="display:block;margin-top:6px">${escapeHtml(targetingLabel)}</strong>` : ""}<div style="margin-top:10px">• ${escapeHtml(sponsorLabel)}</div>${controllerLabel ? `<div>• ${escapeHtml(controllerLabel)}</div>` : ""}<div>• ${escapeHtml(electionLabel)}</div><div style="margin-top:10px"><strong>${locale === "cs" ? "Transparentní oznámení" : "Transparency notice"}:</strong><br>${escapeHtml(ad.publicUrl)}</div></div></div></body></html>`;
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
