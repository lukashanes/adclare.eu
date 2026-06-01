import { LegalPage, legalMetadata, legalStaticParams } from "../legal-pages";

export const generateStaticParams = legalStaticParams;

export function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return legalMetadata({ params, kind: "privacy" });
}

export default function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  return <LegalPage params={params} kind="privacy" />;
}
