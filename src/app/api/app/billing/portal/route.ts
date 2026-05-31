import { isSameOriginRequest } from "@/lib/admin-auth";
import { getAppSession } from "@/lib/app-auth";
import { getUserBillingAccess } from "@/lib/billing-access";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { createTenantPortalSession } from "@/lib/stripe-billing";

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
    scope: "billing-portal",
    identifier: session.userId,
    limit: 10,
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

  if (!billingAccess.stripePortalAvailable) {
    return Response.json({ error: "Stripe customer portal is not available for this account." }, { status: 400 });
  }

  try {
    return Response.json(await createTenantPortalSession(billingAccess.tenantId));
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Správu platby se nepodařilo otevřít." }, { status: 400 });
  }
}
