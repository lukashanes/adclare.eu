import { requireAdminRequest } from "@/lib/admin-auth";
import { getDemoBillingPayload, normalizeLocale, updateDemoBillingAccount } from "@/lib/admin-demo-db";
import type { EditableBillingInput } from "@/lib/admin-demo-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResponse = requireAdminRequest(request);

  if (authResponse) {
    return authResponse;
  }

  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));

  try {
    const payload = await getDemoBillingPayload(locale);
    return Response.json(payload);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Demo billing is not ready." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const authResponse = requireAdminRequest(request, { mutating: true });

  if (authResponse) {
    return authResponse;
  }

  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));

  try {
    const input = (await request.json()) as EditableBillingInput;
    const payload = await updateDemoBillingAccount(input, locale);
    return Response.json(payload);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Demo billing update failed." }, { status: 503 });
  }
}
