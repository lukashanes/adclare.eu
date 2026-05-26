import { normalizeLocale, updateDemoAd } from "@/lib/admin-demo-db";
import type { EditableAdInput } from "@/lib/admin-demo-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ code: string }> }) {
  const [{ code }, locale] = await Promise.all([
    context.params,
    Promise.resolve(normalizeLocale(new URL(request.url).searchParams.get("locale"))),
  ]);

  try {
    const input = (await request.json()) as EditableAdInput;
    const ad = await updateDemoAd(decodeURIComponent(code), input, locale);

    if (!ad) {
      return Response.json({ error: "Ad not found." }, { status: 404 });
    }

    return Response.json({ ad });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Demo database update failed." }, { status: 503 });
  }
}
