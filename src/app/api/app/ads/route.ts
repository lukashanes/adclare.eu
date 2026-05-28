import { isSameOriginRequest } from "@/lib/admin-auth";
import { getAppSession } from "@/lib/app-auth";
import { getUserBillingAccess } from "@/lib/billing-access";
import { createAppAd, getAppWorkspacePayload, normalizeLocale } from "@/lib/admin-demo-db";
import { parseEditableAdInput, validationErrorResponse } from "@/lib/request-validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unauthorized() {
  return Response.json({ error: "Unauthorized." }, { status: 401 });
}

export async function GET(request: Request) {
  const session = await getAppSession(request.headers.get("cookie"));

  if (!session) {
    return unauthorized();
  }

  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));
  const billingAccess = await getUserBillingAccess(session.userId, locale);

  if (!billingAccess?.canUseApp) {
    return Response.json({ error: "Zkušební přístup skončil nebo účet není aktivní.", activationRequired: true }, { status: 402 });
  }

  const payload = await getAppWorkspacePayload(session.userId, locale);

  if (!payload) {
    return unauthorized();
  }

  return Response.json(payload, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}

export async function POST(request: Request) {
  const session = await getAppSession(request.headers.get("cookie"));

  if (!session) {
    return unauthorized();
  }

  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));
  const billingAccess = await getUserBillingAccess(session.userId, locale);

  if (!billingAccess?.canUseApp) {
    return Response.json({ error: "Zkušební přístup skončil nebo účet není aktivní.", activationRequired: true }, { status: 402 });
  }

  try {
    const input = parseEditableAdInput(await request.json());
    const ad = await createAppAd(session.userId, input, locale);

    if (!ad) {
      return Response.json({ error: "Ad could not be created for this user." }, { status: 403 });
    }

    return Response.json({ ad }, { status: 201 });
  } catch (error) {
    const validation = validationErrorResponse(error);

    if (validation) {
      return validation;
    }

    console.error(error);
    return Response.json({ error: "Ad create failed." }, { status: 400 });
  }
}
