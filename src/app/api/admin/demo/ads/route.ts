import { requireAdminRequest } from "@/lib/admin-auth";
import { createDemoAd, getDemoAdsPayload, normalizeLocale } from "@/lib/admin-demo-db";
import type { EditableAdInput } from "@/lib/admin-demo-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResponse = requireAdminRequest(request);

  if (authResponse) {
    return authResponse;
  }

  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));

  try {
    const payload = await getDemoAdsPayload(locale);
    return Response.json(payload);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Demo database is not ready." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const authResponse = requireAdminRequest(request, { mutating: true });

  if (authResponse) {
    return authResponse;
  }

  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));

  try {
    const input = (await request.json()) as EditableAdInput;
    const ad = await createDemoAd(input, locale);
    return Response.json({ ad }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Demo database create failed." }, { status: 503 });
  }
}
