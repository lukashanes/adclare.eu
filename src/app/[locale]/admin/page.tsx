import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminDemoClient } from "./AdminDemoClient";

const locales = ["cs", "en"] as const;
type Locale = (typeof locales)[number];

const metadata = {
  cs: {
    title: "Admin demo",
    description: "Interaktivní demo adminu Adclare pro evidenci reklam, QR, schvalování a audit.",
  },
  en: {
    title: "Admin demo",
    description: "Interactive Adclare admin demo for ad records, QR, approvals and audit.",
  },
} as const;

function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale = isLocale(locale) ? locale : "cs";

  return {
    title: metadata[safeLocale].title,
    description: metadata[safeLocale].description,
    robots: {
      index: false,
      follow: false,
      nocache: true,
    },
  };
}

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  return <AdminDemoClient locale={locale} />;
}
