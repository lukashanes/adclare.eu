import { isSameOriginRequest } from "@/lib/request-security";
import { getAppSession } from "@/lib/app-auth";
import { buildAuditContext, withAuditContext } from "@/lib/audit";
import { normalizeLocale } from "@/lib/workspace/services/shared";
import { importAppAds } from "@/lib/workspace/services/ads";
import { parseXlsxAdImport } from "@/lib/xlsx-ad-import";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const maxImportBytes = 8 * 1024 * 1024;

function unauthorized() {
  return Response.json({ error: "Unauthorized." }, { status: 401 });
}

export async function POST(request: Request) {
  const session = await getAppSession(request.headers.get("cookie"));

  if (!session) {
    return unauthorized();
  }

  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "Nahrajte Excel soubor." }, { status: 400 });
    }

    if (file.size > maxImportBytes) {
      return Response.json({ error: "Excel je příliš velký. Maximum je 8 MB." }, { status: 413 });
    }

    const campaignId = typeof formData.get("campaignId") === "string" ? String(formData.get("campaignId")) : "";
    const parsed = await parseXlsxAdImport(Buffer.from(await file.arrayBuffer()));
    const rows = parsed.rows.map((row) => ({
      ...row,
      input: {
        ...row.input,
        campaignId,
      },
    }));
    const result = await withAuditContext(buildAuditContext(request, session), () => importAppAds(session.userId, rows, locale));

    if (!result) {
      return Response.json({ error: "Nemáte oprávnění importovat reklamy." }, { status: 403 });
    }

    return Response.json({
      result: {
        ...result,
        source: {
          fileName: file.name,
          sheetName: parsed.sheetName,
          headerRow: parsed.headerRow,
        },
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Import se nepodařilo zpracovat." }, { status: 400 });
  }
}
