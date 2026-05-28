import { requireAdminRequest } from "@/lib/admin-auth";
import { normalizeLocale, updateDemoAd } from "@/lib/admin-demo-db";
import { parseEditableAdInput, validationErrorResponse } from "@/lib/request-validation";

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
    const input = parseEditableAdInput(await request.json());
    const ad = await updateDemoAd(decodeURIComponent(code), input, locale);

    if (!ad) {
      return Response.json({ error: "Ad not found." }, { status: 404 });
    }

    return Response.json({ ad });
  } catch (error) {
    const validation = validationErrorResponse(error);

    if (validation) {
      return validation;
    }

    console.error(error);
    return Response.json({ error: "Demo database update failed." }, { status: 503 });
  }
}
