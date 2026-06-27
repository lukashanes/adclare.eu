import { normalizeLocale } from "@/lib/workspace/services/shared";
import { getPublicRepositoryPayload } from "@/lib/workspace/services/public-repository";
import type { PublicRepositoryFilters } from "@/lib/workspace-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function filtersFromSearchParams(searchParams: URLSearchParams): Partial<PublicRepositoryFilters> {
  return {
    q: searchParams.get("q") || "",
    channel: searchParams.get("channel") || "all",
    status: searchParams.get("status") || "all",
    type: searchParams.get("type") || "all",
    branch: searchParams.get("branch") || "all",
    campaign: searchParams.get("campaign") || "all",
  } as Partial<PublicRepositoryFilters>;
}

function paginationFromSearchParams(searchParams: URLSearchParams) {
  return {
    cursor: searchParams.get("cursor") || "",
    limit: searchParams.get("limit") || "",
  };
}

export async function GET(request: Request, context: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await context.params;
  const url = new URL(request.url);
  const locale = normalizeLocale(url.searchParams.get("locale"));
  const payload = await getPublicRepositoryPayload(
    decodeURIComponent(tenant),
    locale,
    filtersFromSearchParams(url.searchParams),
    paginationFromSearchParams(url.searchParams),
  );

  if (!payload) {
    return Response.json({ error: "Archive not found." }, { status: 404 });
  }

  return Response.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
