import type { MetadataRoute } from "next";

const baseUrl = "https://adclare.eu";
const lastModified = new Date("2026-05-26");

const localizedPages = ["", "/privacy", "/cookies", "/terms"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return localizedPages.flatMap((path) => [
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
}
