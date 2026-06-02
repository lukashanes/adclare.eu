import JSZip from "jszip";
import { getAppSession } from "@/lib/app-auth";
import { getAppArchivePackage, normalizeLocale } from "@/lib/admin-demo-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toCsv(headers: string[], rows: Array<Record<string, string | number | boolean | null | undefined>>) {
  const escape = (value: string | number | boolean | null | undefined) => `"${String(value ?? "").replaceAll('"', '""')}"`;

  return [headers.map(escape).join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}

export async function GET(request: Request) {
  const session = await getAppSession(request.headers.get("cookie"));

  if (!session) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));
  const archive = await getAppArchivePackage(session.userId, locale);

  if (!archive) {
    return Response.json({ error: "Archive export is not available for this user." }, { status: 403 });
  }

  const zip = new JSZip();
  const readme =
    locale === "cs"
      ? [
          "Kontrolní archiv Adclare.",
          "",
          "Balík obsahuje evidenci reklam, kampaně, pobočky, kandidáty, podklady, schvalování a auditní stopu podle rozsahu přihlášeného uživatele.",
          "Soubor archive.json obsahuje kompletní strukturovaná data. CSV soubory slouží pro rychlé otevření v tabulkovém editoru.",
        ].join("\n")
      : [
          "Adclare control archive.",
          "",
          "The package contains ads, campaigns, branches, candidates, assets, approvals and audit trail according to the signed-in user's access scope.",
          "archive.json contains the full structured data. CSV files are included for quick spreadsheet review.",
        ].join("\n");

  zip.file("README.txt", readme);
  zip.file("archive.json", JSON.stringify(archive, null, 2));
  zip.file(
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
  );
  zip.file(
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
  );
  zip.file(
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
  );
  zip.file(
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
  );
  zip.file(
    "assets.csv",
    toCsv(
      ["adId", "id", "fileName", "originalName", "contentType", "byteSize", "checksumSha256", "storageProvider", "storageBucket", "storageKey", "uploadedBy", "createdAt"],
      archive.assets,
    ),
  );
  zip.file("approvals.csv", toCsv(["adId", "actor", "status", "note", "createdAt"], archive.approvals));
  zip.file("audit-log.csv", toCsv(["id", "actor", "action", "message", "createdAt"], archive.auditLogs));

  if (archive.accessDirectory.included) {
    zip.file(
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
    );
    zip.file(
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
    );
  }

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
