import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { publicAppUrl } from "@/lib/instance-config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function requestOrigin(requestHeaders: Headers) {
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");

  if (!host) {
    return publicAppUrl();
  }

  const proto = requestHeaders.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`.replace(/\/$/, "");
}

export async function generateMetadata(): Promise<Metadata> {
  const configuredUrl = publicAppUrl();
  const baseUrl = configuredUrl === "http://localhost:3000" ? requestOrigin(await headers()) : configuredUrl;

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: "Adclare: politická reklama pod kontrolou",
      template: "%s | Adclare",
    },
    description:
      "Nástroj pro evidenci politické reklamy, QR kódy, transparentní oznámení, schvalování, pobočky a audit podle TTPA.",
    openGraph: {
      title: "Adclare: politická reklama pod kontrolou",
      description:
        "Pobočky a grafici doplní data, systém hlídá termíny, generuje QR a drží auditní stopu pro politickou reklamu.",
      url: baseUrl,
      siteName: "Adclare",
      locale: "cs_CZ",
      type: "website",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" data-scroll-behavior="smooth" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
