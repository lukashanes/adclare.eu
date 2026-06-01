import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://adclare.eu"),
  title: {
    default: "Adclare - politická reklama pod kontrolou",
    template: "%s | Adclare",
  },
  description:
    "Open source nástroj pro evidenci politické reklamy, QR kódy, transparentní oznámení, schvalování, pobočky a audit podle TTPA / EU 2024/900.",
  openGraph: {
    title: "Adclare - politická reklama pod kontrolou",
    description:
      "Pobočky a grafici doplní data, systém hlídá termíny, generuje QR a drží auditní stopu pro politickou reklamu.",
    url: "https://adclare.eu",
    siteName: "Adclare",
    locale: "cs_CZ",
    type: "website",
  },
};

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
