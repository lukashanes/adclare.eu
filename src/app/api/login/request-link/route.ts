import { isSameOriginRequest } from "@/lib/admin-auth";
import { requestAppLoginLink } from "@/lib/app-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { email?: unknown };
    await requestAppLoginLink(typeof body.email === "string" ? body.email : "");
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Login link request failed." }, { status: 500 });
  }
}
