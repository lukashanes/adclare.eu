import { requireAdminRequest } from "@/lib/admin-auth";
import { getDemoBillingPayload, normalizeLocale, updateDemoBillingAccount } from "@/lib/admin-demo-db";
import { parseBillingInput, validationErrorResponse } from "@/lib/request-validation";

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
    const input = parseBillingInput(await request.json());
    const payload = await updateDemoBillingAccount(input, locale);
    return Response.json(payload);
  } catch (error) {
    const validation = validationErrorResponse(error);

    if (validation) {
      return validation;
    }

    console.error(error);
    return Response.json({ error: "Demo billing update failed." }, { status: 503 });
  }
}
