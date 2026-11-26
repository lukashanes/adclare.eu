import { checkRateLimit, rateLimitHeaders, requestIp } from "@/lib/rate-limit";
import { discardLimitedBody, RequestBodyError } from "@/lib/request-limits";

// One shared budget for all public API routes, including invalid requests.
export async function guardPublicEndpoint(request: Request) {
  const limit = await checkRateLimit({
    scope: "public-api", identifier: requestIp(request), limit: 20, windowMs: 10_000,
  });
  if (!limit.allowed) {
    void request.body?.cancel().catch(() => {});
    return Response.json({ error: "Too many requests." }, {
      status: 429, headers: { ...rateLimitHeaders(limit), "Cache-Control": "no-store" },
    });
  }
  if (request.method === "GET" || request.method === "HEAD") {
    try {
      await discardLimitedBody(request);
    } catch (error) {
      if (error instanceof RequestBodyError) return Response.json({ error: error.message }, { status: error.status });
      throw error;
    }
  }
  return null;
}
