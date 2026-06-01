import { consumeAppLoginToken } from "@/lib/app-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const result = await consumeAppLoginToken(decodeURIComponent(token));

  if (!result) {
    return Response.redirect(new URL("/login?error=invalid", request.url), 303);
  }

  return new Response(null, {
    status: 303,
    headers: {
      Location: "/app",
      "Set-Cookie": result.cookie,
      "Cache-Control": "no-store",
    },
  });
}
