import { isSameOriginRequest } from "@/lib/admin-auth";
import { getAppSession } from "@/lib/app-auth";
import { requestInvoiceActivation } from "@/lib/billing-access";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

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

  const limit = await checkRateLimit({
    scope: "billing-invoice-request",
    identifier: session.userId,
    limit: 3,
    windowMs: 24 * 60 * 60 * 1000,
  });

  if (!limit.allowed) {
    return Response.json({ error: "Too many requests." }, { status: 429, headers: rateLimitHeaders(limit) });
  }

  try {
    const billing = await requestInvoiceActivation(session.userId, "cs");

    if (!billing) {
      return Response.json({ error: "Billing account not found." }, { status: 404 });
    }

    return Response.json({ billing });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message.includes("party admin")) {
      return Response.json({ error: "Billing can be managed only by a party admin." }, { status: 403 });
    }

    return Response.json({ error: "Invoice request failed." }, { status: 400 });
  }
}
