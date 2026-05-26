import { acceptInvitation, normalizeLocale } from "@/lib/admin-demo-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));

  try {
    const body = (await request.json()) as { name?: unknown };
    const notice = await acceptInvitation(decodeURIComponent(token), typeof body.name === "string" ? body.name : "", locale);

    if (!notice) {
      return Response.json({ error: "Invitation cannot be accepted." }, { status: 409 });
    }

    return Response.json({ invitation: notice });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Invitation accept failed." }, { status: 400 });
  }
}
