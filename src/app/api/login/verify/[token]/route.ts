import { consumeAppLoginToken } from "@/lib/app-auth";
import { guardPublicEndpoint } from "@/lib/public-endpoint";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const limited = await guardPublicEndpoint(request);
  if (limited) return limited;
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
