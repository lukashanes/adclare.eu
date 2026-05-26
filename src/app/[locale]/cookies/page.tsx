import { LegalPage, legalMetadata, legalStaticParams } from "../legal-pages";

export const generateStaticParams = legalStaticParams;

export function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return legalMetadata({ params, kind: "cookies" });
}

export default function CookiesPage({ params }: { params: Promise<{ locale: string }> }) {
  return <LegalPage params={params} kind="cookies" />;
}
