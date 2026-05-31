import { isSameOriginRequest } from "@/lib/admin-auth";
import { getAppSession } from "@/lib/app-auth";
import { normalizeLocale, retryAppInvitationEmail } from "@/lib/admin-demo-db";
import { getUserBillingAccess } from "@/lib/billing-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ invitationId: string }> }) {
  const session = await getAppSession(request.headers.get("cookie"));

  if (!session) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  const { invitationId } = await context.params;
  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));
  const billingAccess = await getUserBillingAccess(session.userId, locale);

  if (!billingAccess?.canUseApp) {
    return Response.json({ error: "Zkušební přístup skončil nebo účet není aktivní.", activationRequired: true }, { status: 402 });
  }

  const invitation = await retryAppInvitationEmail(session.userId, decodeURIComponent(invitationId), locale);

  if (!invitation) {
    return Response.json({ error: "Pozvánka nenalezena nebo nemáte přístup." }, { status: 404 });
  }

  return Response.json({ invitation });
}
