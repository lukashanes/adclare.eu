import { getAppSession } from "@/lib/app-auth";
import { getAppAdAssetDownload } from "@/lib/workspace-db";
import { downloadAdAssetObject } from "@/lib/object-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ code: string; assetId: string }> }) {
  const session = await getAppSession(request.headers.get("cookie"));

  if (!session) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { code, assetId } = await context.params;

  const asset = await getAppAdAssetDownload(session.userId, decodeURIComponent(code), decodeURIComponent(assetId));

  if (!asset) {
    return Response.json({ error: "Asset not found." }, { status: 404 });
  }

  try {
    const object = await downloadAdAssetObject(asset.storageProvider, asset.storageBucket, asset.storageKey);
    const body = object.bytes.buffer.slice(object.bytes.byteOffset, object.bytes.byteOffset + object.bytes.byteLength) as ArrayBuffer;

    return new Response(body, {
      headers: {
        "Content-Type": asset.contentType || object.contentType,
        "Content-Length": String(object.byteSize),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(asset.originalName || asset.fileName)}"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Soubor se nepodařilo stáhnout." }, { status: 404 });
  }
}
