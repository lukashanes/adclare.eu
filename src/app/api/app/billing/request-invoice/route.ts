import { isSameOriginRequest } from "@/lib/admin-auth";
import { getAppSession } from "@/lib/app-auth";
import { requestInvoiceActivation } from "@/lib/billing-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getAppSession(request.headers.get("cookie"));

  if (!session) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const billing = await requestInvoiceActivation(session.userId, "cs");

    if (!billing) {
      return Response.json({ error: "Billing account not found." }, { status: 404 });
    }

    return Response.json({ billing });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Invoice request failed." }, { status: 400 });
  }
}
