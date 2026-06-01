import { LegalPage, legalMetadata, legalStaticParams } from "../legal-pages";

export const generateStaticParams = legalStaticParams;

export function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return legalMetadata({ params, kind: "terms" });
}

export default function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  return <LegalPage params={params} kind="terms" />;
}
