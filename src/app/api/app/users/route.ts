import { isSameOriginRequest } from "@/lib/admin-auth";
import { getAppSession } from "@/lib/app-auth";
import { createAppInvitation, getAppWorkspacePayload, normalizeLocale } from "@/lib/admin-demo-db";
import { parseInviteInput, validationErrorResponse } from "@/lib/request-validation";

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
  const payload = await getAppWorkspacePayload(session.userId, locale);

  if (!payload) {
    return unauthorized();
  }

  return Response.json({ users: payload.users, permissions: payload.permissions });
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
  try {
    const input = parseInviteInput(await request.json());
    const invitation = await createAppInvitation(session.userId, input, locale);

    if (!invitation) {
      return Response.json({ error: "Nemáte přístup ke správě lidí." }, { status: 403 });
    }

    return Response.json({ invitation }, { status: 201 });
  } catch (error) {
    const validation = validationErrorResponse(error);

    if (validation) {
      return validation;
    }

    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Pozvánku se nepodařilo vytvořit." }, { status: 400 });
  }
}
