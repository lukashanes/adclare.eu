import { isSameOriginRequest } from "@/lib/admin-auth";
import { getAppSession } from "@/lib/app-auth";
import { createAppAd, getAppWorkspacePayload, normalizeLocale } from "@/lib/admin-demo-db";
import type { EditableAdInput } from "@/lib/admin-demo-types";

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
  const input = (await request.json()) as EditableAdInput;
  const ad = await createAppAd(session.userId, input, locale);

  if (!ad) {
    return Response.json({ error: "Ad could not be created for this user." }, { status: 403 });
  }

  return Response.json({ ad }, { status: 201 });
}
