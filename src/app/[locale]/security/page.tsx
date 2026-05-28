import { LegalPage, legalMetadata, legalStaticParams } from "../legal-pages";

export const generateStaticParams = legalStaticParams;

export function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return legalMetadata({ params, kind: "security" });
}

export default function SecurityPage({ params }: { params: Promise<{ locale: string }> }) {
  return <LegalPage params={params} kind="security" />;
}
