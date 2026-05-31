import { isSameOriginRequest } from "@/lib/admin-auth";
import { getAppSession } from "@/lib/app-auth";
import { getUserBillingAccess } from "@/lib/billing-access";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { createTenantCheckoutSession } from "@/lib/stripe-billing";

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
    scope: "billing-checkout",
    identifier: session.userId,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });

  if (!limit.allowed) {
    return Response.json({ error: "Too many requests." }, { status: 429, headers: rateLimitHeaders(limit) });
  }

  const billingAccess = await getUserBillingAccess(session.userId, "cs");

  if (!billingAccess) {
    return Response.json({ error: "Billing account not found." }, { status: 404 });
  }

  if (!billingAccess.canManageBilling) {
    return Response.json({ error: "Billing can be managed only by a party admin." }, { status: 403 });
  }

  try {
    return Response.json(await createTenantCheckoutSession(billingAccess.tenantId, "cs", billingAccess.userEmail));
  } catch (error) {
    console.error(error);
    const message = error instanceof Error && error.message.includes("STRIPE_SECRET_KEY") ? "Platba kartou teď není dostupná." : "Platbu kartou se nepodařilo otevřít.";
    return Response.json({ error: message }, { status: 400 });
  }
}
