import type { Metadata } from "next";
import { headers } from "next/headers";
import { publicAppUrl } from "@/lib/instance-config";
import "./globals.css";

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
      default: "Adclare: politická reklama připravená pro TTPA",
      template: "%s | Adclare",
    },
    description:
      "Otevřený nástroj pro TTPA: evidence politické reklamy, povinné údaje, QR kódy, veřejné oznámení, schválení a balíček pro kontrolu.",
    openGraph: {
      title: "Adclare: politická reklama připravená pro TTPA",
      description:
        "Strany, pobočky a grafici mají jedno místo pro reklamy, povinné údaje, QR kódy, veřejné oznámení a kontrolu podle TTPA.",
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
    <html lang="cs" data-scroll-behavior="smooth" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
