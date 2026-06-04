import { isSameOriginRequest } from "@/lib/admin-auth";
import { getAppSession } from "@/lib/app-auth";
import { attachAppAdAsset, getAppAdUploadTarget, normalizeLocale } from "@/lib/admin-demo-db";
import { isAssetStorageAvailable, uploadAdAssetObject } from "@/lib/object-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  const session = await getAppSession(request.headers.get("cookie"));

  if (!session) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  if (!isAssetStorageAvailable()) {
    return Response.json({ error: "Nahrávání souborů není pro tuto instalaci dostupné." }, { status: 503 });
  }

  const [{ code }, locale] = await Promise.all([
    context.params,
    Promise.resolve(normalizeLocale(new URL(request.url).searchParams.get("locale"))),
  ]);
  try {
    const decodedCode = decodeURIComponent(code);
    const target = await getAppAdUploadTarget(session.userId, decodedCode);

    if (!target) {
      return Response.json({ error: "Ad not found or not editable for this user." }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "Soubor chybí." }, { status: 400 });
    }

    const storedObject = await uploadAdAssetObject({
      tenantSlug: target.tenantSlug,
      adCode: target.adCode,
      file,
    });
    const ad = await attachAppAdAsset(session.userId, target.adCode, storedObject, locale);

    if (!ad) {
      return Response.json({ error: "Ad not found or not editable for this user." }, { status: 404 });
    }

    return Response.json({ ad }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Upload souboru selhal." }, { status: 400 });
  }
}
