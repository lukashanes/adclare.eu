import { deleteAppSession, serializeAppSessionClearCookie } from "@/lib/app-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  await deleteAppSession(request.headers.get("cookie"));

  return new Response(null, {
    status: 303,
    headers: {
      Location: "/login",
      "Set-Cookie": serializeAppSessionClearCookie(),
      "Cache-Control": "no-store",
    },
  });
}
