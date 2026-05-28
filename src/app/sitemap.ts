import type { MetadataRoute } from "next";

const baseUrl = "https://adclare.eu";
const lastModified = new Date("2026-05-27");

const localizedPages = ["", "/privacy", "/cookies", "/terms", "/dpa", "/subprocessors", "/security"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const marketingPages: MetadataRoute.Sitemap = localizedPages.flatMap((path) => [
    {
      url: `${baseUrl}/cs${path}`,
      lastModified,
      changeFrequency: path === "" ? "weekly" : "monthly",
      priority: path === "" ? 1 : 0.5,
      alternates: {
        languages: {
          cs: `${baseUrl}/cs${path}`,
          en: `${baseUrl}/en${path}`,
        },
      },
    },
    {
      url: `${baseUrl}/en${path}`,
      lastModified,
      changeFrequency: path === "" ? "weekly" : "monthly",
      priority: path === "" ? 0.9 : 0.5,
      alternates: {
        languages: {
          cs: `${baseUrl}/cs${path}`,
          en: `${baseUrl}/en${path}`,
        },
      },
    },
  ]);

  const pages: MetadataRoute.Sitemap = [
    ...marketingPages,
    {
      url: `${baseUrl}/signup`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  if (process.env.NEXT_PUBLIC_SHOW_DEMO_REPO === "1") {
    pages.push({
      url: `${baseUrl}/repo/demo-party`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.7,
    });
  }

  return pages;
}
