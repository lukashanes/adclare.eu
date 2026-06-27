import JSZip from "jszip";
import { getAppSession } from "@/lib/app-auth";
import { buildAuditContext, withAuditContext } from "@/lib/audit";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { normalizeLocale } from "@/lib/workspace/services/shared";
import { getAppArchivePackage } from "@/lib/workspace/services/exports";
import { addExportFile, buildExportManifest, type ExportManifestFile } from "@/lib/export-manifest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toCsv(headers: string[], rows: Array<Record<string, unknown>>) {
  const cell = (value: unknown) => {
    if (value === null || value === undefined) {
      return "";
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  };
  const escape = (value: unknown) => `"${cell(value).replaceAll('"', '""')}"`;

  return [headers.map(escape).join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}

export async function GET(request: Request) {
  const session = await getAppSession(request.headers.get("cookie"));

  if (!session) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));
  const limit = await checkRateLimit({
    scope: "workspace-archive",
    identifier: session.userId,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });

  if (!limit.allowed) {
    return Response.json({ error: "Too many archive downloads." }, { status: 429, headers: rateLimitHeaders(limit) });
  }

  const archive = await withAuditContext(buildAuditContext(request, session), () => getAppArchivePackage(session.userId, locale));

  if (!archive) {
    return Response.json({ error: "Archive export is not available for this user." }, { status: 403 });
  }

  const zip = new JSZip();
  const files: ExportManifestFile[] = [];
  const generatedAt = new Date().toISOString();
  const readme =
    locale === "cs"
      ? [
          "Balíček pro kontrolu Adclare.",
          "",
          "Balík obsahuje reklamy, soubory, schválení a historii změn.",
          "Soubor archive.json obsahuje kompletní strukturovaná data. CSV soubory slouží pro rychlé otevření v tabulkovém editoru.",
        ].join("\n")
      : [
          "Adclare control package.",
          "",
          "The package contains ads, files, approvals and change history.",
          "archive.json contains the full structured data. CSV files are included for quick spreadsheet review.",
        ].join("\n");

  addExportFile(zip, files, "README.txt", readme, "text/plain; charset=utf-8");
  addExportFile(zip, files, "archive.json", JSON.stringify(archive, null, 2), "application/json");
  addExportFile(
    zip,
    files,
    "ads.csv",
    toCsv(
      ["id", "title", "campaign", "candidate", "branch", "workflowStatus", "workflowLabel", "statusLabel", "publicationDate", "period", "payer", "amount", "publicUrl", "updatedAt"],
      archive.ads.map((ad) => ({
        id: ad.id,
        title: ad.title,
        campaign: ad.campaign,
        candidate: ad.candidate,
        branch: ad.branch,
        workflowStatus: ad.workflowStatus,
        workflowLabel: ad.workflowLabel,
        statusLabel: ad.statusLabel,
        publicationDate: ad.publicationDate,
        period: ad.period,
        payer: ad.payer,
        amount: ad.amount,
        publicUrl: ad.publicUrl,
        updatedAt: ad.updatedAt,
      })),
    ),
    "text/csv; charset=utf-8",
  );
  addExportFile(
    zip,
    files,
    "campaigns.csv",
    toCsv(
      ["id", "name", "slug", "election", "tags", "startsAt", "endsAt", "archived", "adCount"],
      archive.campaigns.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        slug: campaign.slug,
        election: campaign.election,
        tags: campaign.tags.join("; "),
        startsAt: campaign.startsAt,
        endsAt: campaign.endsAt,
        archived: campaign.archived,
        adCount: campaign.adCount,
      })),
    ),
    "text/csv; charset=utf-8",
  );
  addExportFile(
    zip,
    files,
    "branches.csv",
    toCsv(
      ["id", "name", "kind", "parentId", "contactEmail", "description", "archived"],
      archive.branches.map((branch) => ({
        id: branch.id,
        name: branch.name,
        kind: branch.kind,
        parentId: branch.parentId,
        contactEmail: branch.contactEmail,
        description: branch.description,
        archived: branch.archived,
      })),
    ),
    "text/csv; charset=utf-8",
  );
  addExportFile(
    zip,
    files,
    "candidates.csv",
    toCsv(
      ["id", "name", "slug", "branch", "contactEmail", "ballotNumber", "description", "archived", "adCount"],
      archive.candidates.map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        slug: candidate.slug,
        branch: candidate.branch,
        contactEmail: candidate.contactEmail,
        ballotNumber: candidate.ballotNumber,
        description: candidate.description,
        archived: candidate.archived,
        adCount: candidate.adCount,
      })),
    ),
    "text/csv; charset=utf-8",
  );
  addExportFile(
    zip,
    files,
    "assets.csv",
    toCsv(
      ["adId", "id", "fileName", "originalName", "contentType", "byteSize", "checksumSha256", "storageProvider", "storageBucket", "storageKey", "uploadedBy", "createdAt"],
      archive.assets,
    ),
    "text/csv; charset=utf-8",
  );
  addExportFile(zip, files, "approvals.csv", toCsv(["adId", "actor", "status", "note", "createdAt"], archive.approvals), "text/csv; charset=utf-8");
  addExportFile(
    zip,
    files,
    "audit-log.csv",
    toCsv(
      [
        "id",
        "sequence",
        "actor",
        "actorRole",
        "actorScope",
        "action",
        "outcome",
        "severity",
        "entityType",
        "entityId",
        "entityLabel",
        "requestId",
        "correlationId",
        "entryHash",
        "previousHash",
        "message",
        "createdAt",
      ],
      archive.auditLogs,
    ),
    "text/csv; charset=utf-8",
  );
  addExportFile(zip, files, "audit-log.json", JSON.stringify(archive.auditLogs, null, 2), "application/json");

  if (archive.accessDirectory.included) {
    addExportFile(
      zip,
      files,
      "access-members.csv",
      toCsv(
        ["id", "name", "email", "role", "scope", "status"],
        archive.accessDirectory.members.map((member) => ({
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          scope: member.scope,
          status: member.status,
        })),
      ),
      "text/csv; charset=utf-8",
    );
    addExportFile(
      zip,
      files,
      "access-invitations.csv",
      toCsv(
        ["id", "email", "role", "scope", "status", "emailStatus", "expiresAt"],
        archive.accessDirectory.invitations.map((invitation) => ({
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          scope: invitation.scope,
          status: invitation.status,
          emailStatus: invitation.emailStatus,
          expiresAt: invitation.expiresAt,
        })),
      ),
      "text/csv; charset=utf-8",
    );
  }

  zip.file(
    "manifest.json",
    JSON.stringify(
      buildExportManifest({
        packageType: "workspace-control-archive",
        locale,
        generatedAt,
        subject: {
          tenantId: archive.tenant.id,
          tenantSlug: archive.tenant.slug,
          tenantName: archive.tenant.name,
          exportedBy: archive.exportedBy.email,
          exportedByRole: archive.exportedBy.role,
          accessScope: archive.exportedBy.scope,
          ads: archive.counts.ads,
          campaigns: archive.counts.campaigns,
          branches: archive.counts.branches,
          candidates: archive.counts.candidates,
          assets: archive.counts.assets,
          auditLogs: archive.counts.auditLogs,
          auditIntegrityChecked: archive.auditIntegrity.checked,
          auditIntegrityVerified: archive.auditIntegrity.verified,
          auditIntegrityBroken: archive.auditIntegrity.broken,
          auditIntegrityLastHash: archive.auditIntegrity.lastHash,
        },
        files,
      }),
      null,
      2,
    ),
  );

  const bytes = await zip.generateAsync({ type: "arraybuffer" });
  const filename = `${archive.tenant.slug}-control-archive.zip`;

  return new Response(new Blob([bytes]), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
