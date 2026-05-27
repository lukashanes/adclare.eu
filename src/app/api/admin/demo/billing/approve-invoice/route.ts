import { requireAdminRequest } from "@/lib/admin-auth";
import { approveDemoInvoiceBilling, normalizeLocale } from "@/lib/admin-demo-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const authResponse = requireAdminRequest(request, { mutating: true });

  if (authResponse) {
    return authResponse;
  }

  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));

  try {
    return Response.json(await approveDemoInvoiceBilling(locale));
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Invoice approval failed." }, { status: 400 });
  }
}
