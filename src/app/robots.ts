import type { MetadataRoute } from "next";

const baseUrl = "https://adclare.eu";

export default function robots(): MetadataRoute.Robots {
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
