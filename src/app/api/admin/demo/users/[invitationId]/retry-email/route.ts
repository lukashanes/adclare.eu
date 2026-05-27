import { requireAdminRequest } from "@/lib/admin-auth";
import { normalizeLocale, retryDemoInvitationEmail } from "@/lib/admin-demo-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext<"/api/admin/demo/users/[invitationId]/retry-email">) {
  const authResponse = requireAdminRequest(request, { mutating: true });

  if (authResponse) {
    return authResponse;
  }

  const { invitationId } = await context.params;
  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));

  try {
    const invitation = await retryDemoInvitationEmail(decodeURIComponent(invitationId), locale);
    return Response.json({ invitation });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Invitation email retry failed." }, { status: 400 });
  }
}
