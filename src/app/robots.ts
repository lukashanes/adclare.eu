import type { MetadataRoute } from "next";
import { publicAppUrl } from "@/lib/instance-config";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = publicAppUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app", "/app/", "/login", "/signup", "/invite/", "/api/admin/", "/api/app/", "/api/login/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
