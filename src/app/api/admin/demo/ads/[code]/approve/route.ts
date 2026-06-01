import { requireAdminRequest } from "@/lib/admin-auth";
import { approveDemoAd, normalizeLocale } from "@/lib/admin-demo-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ code: string }> }) {
  const authResponse = requireAdminRequest(request, { mutating: true });

  if (authResponse) {
    return authResponse;
  }

  const [{ code }, locale] = await Promise.all([
    context.params,
    Promise.resolve(normalizeLocale(new URL(request.url).searchParams.get("locale"))),
  ]);

  try {
    const ad = await approveDemoAd(decodeURIComponent(code), locale);

    if (!ad) {
      return Response.json({ error: "Ad not found." }, { status: 404 });
    }

    return Response.json({ ad });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Approval failed." }, { status: 409 });
  }
}
