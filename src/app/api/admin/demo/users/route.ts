import { requireAdminRequest } from "@/lib/admin-auth";
import { createDemoInvitation, getDemoUsersPayload, normalizeLocale } from "@/lib/admin-demo-db";
import type { InviteInput } from "@/lib/admin-demo-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResponse = requireAdminRequest(request);

  if (authResponse) {
    return authResponse;
  }

  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));

  try {
    return Response.json(await getDemoUsersPayload(locale));
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Demo users database is not ready." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const authResponse = requireAdminRequest(request, { mutating: true });

  if (authResponse) {
    return authResponse;
  }

  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));

  try {
    const input = (await request.json()) as InviteInput;
    const invitation = await createDemoInvitation(input, locale);
    return Response.json({ invitation }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Invitation create failed." }, { status: 400 });
  }
}
