import { NextResponse } from "next/server";
import { getTransparencyNotice } from "@/lib/workspace/services/public-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    code: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { code } = await context.params;
  const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "cs";
  const notice = await getTransparencyNotice(code, locale);

  if (!notice || notice.status !== "published") {
    return NextResponse.json({ error: "Published transparency notice not found." }, { status: 404 });
  }

  return NextResponse.json(
    {
      profile: "adclare-ttpa-transparency-notice",
      profileVersion: "1.0",
      legalBasis: [
        {
          id: "EU-2024-900",
          title: "Regulation (EU) 2024/900",
          url: "https://eur-lex.europa.eu/eli/reg/2024/900/oj",
        },
        {
          id: "EU-2025-1410",
          title: "Implementing Regulation (EU) 2025/1410",
          url: "https://eur-lex.europa.eu/eli/reg_impl/2025/1410/oj",
        },
        {
          id: "EU-2026-818",
          title: "Implementing Regulation (EU) 2026/818",
          url: "https://eur-lex.europa.eu/eli/reg_impl/2026/818/oj",
        },
      ],
      identification: {
        publisherAdvertisementId: notice.ad.id,
        publicToken: code,
        transparencyNoticeUrl: notice.publicUrl,
        advertisementUrl: notice.ad.advertisementUrl || null,
        publisherPlatform: notice.ad.publisherPlatform || null,
        version: notice.ad.version,
      },
      metadataLanguage: locale,
      encoding: "UTF-8",
      generatedAt: new Date().toISOString(),
      transparencyNotice: notice,
      europeanRepositoryCompatibility: {
        status: "prepared",
        note: "The final repository adapter will follow the data artefacts published by the European repository.",
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        "Content-Language": locale,
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
