import { requireAdminRequest } from "@/lib/admin-auth";
import { normalizeLocale } from "@/lib/admin-demo-db";
import { createDemoCheckoutSession } from "@/lib/stripe-billing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const authResponse = requireAdminRequest(request, { mutating: true });

  if (authResponse) {
    return authResponse;
  }

  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));

  try {
    return Response.json(await createDemoCheckoutSession(locale));
  } catch (error) {
    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Stripe checkout failed." }, { status: 400 });
  }
}
