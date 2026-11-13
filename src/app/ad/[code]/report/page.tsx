import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { publicTurnstileSiteKey } from "@/lib/turnstile";
import { getTransparencyNotice } from "@/lib/workspace/services/public-repository";
import { ComplianceReportForm } from "./ComplianceReportForm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ComplianceReportPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const notice = await getTransparencyNotice(code, "cs");

  if (!notice || notice.status !== "published") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f4f6f8] px-4 py-6 text-[#11161c] sm:px-6">
      <section className="mx-auto grid w-full max-w-2xl gap-4">
        <Link href={notice.publicUrl} className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#59616b] hover:text-black">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Zpět na oznámení
        </Link>
        <div className="rounded-md border border-black/10 bg-white p-5 sm:p-7">
          <h1 className="text-2xl font-semibold text-black">Nahlásit nesrovnalost</h1>
          <p className="mt-2 text-sm leading-6 text-[#59616b]">
            Hlášení se uloží k reklamě {notice.ad.id}. Uveďte konkrétní údaj, který podle vás není správný nebo chybí.
          </p>
          <div className="mt-6">
            <ComplianceReportForm publicToken={code} turnstileSiteKey={publicTurnstileSiteKey()} />
          </div>
        </div>
      </section>
    </main>
  );
}

