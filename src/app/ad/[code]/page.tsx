import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDemoTransparencyNotice } from "@/lib/admin-demo-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{
    code: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code: publicToken } = await params;
  const notice = await getDemoTransparencyNotice(publicToken, "cs");

  if (!notice) {
    return {
      title: "Oznámení nenalezeno",
    };
  }

  return {
    title: `${notice.ad.id} - transparentní oznámení`,
    description: `Transparentní oznámení k politické reklamě ${notice.ad.title}.`,
  };
}

export default async function TransparencyNoticePage({ params }: PageProps) {
  const { code: publicToken } = await params;
  const notice = await getDemoTransparencyNotice(publicToken, "cs");

  if (!notice) {
    notFound();
  }

  const rows = [
    ["Unikátní ID reklamy", notice.ad.id],
    ["Název materiálu", notice.ad.title],
    ["Typ reklamy", notice.ad.type],
    ["Online / offline", notice.ad.channel],
    ["Zadavatel", notice.ad.owner],
    ["Plátce", notice.ad.payer],
    ["Dodavatel", notice.ad.supplier || "neuvedeno"],
    ["Částka / rozpočet", notice.ad.amount || "neuvedeno"],
    ["Původ financí", notice.ad.fundingSource || "neuvedeno"],
    ["Kampaň", notice.campaign],
    ["Období šíření", notice.ad.period],
    ["Datum zveřejnění", notice.ad.publicationDate],
    ["Oblast šíření", notice.ad.distributionArea || notice.ad.branch],
    ["Jazyk", notice.ad.language || "neuvedeno"],
    ["Cílení", notice.ad.targeting || "nepoužito"],
    ["Cílové publikum", notice.ad.isTargeted ? notice.ad.targetAudience || "neuvedeno" : "nepoužito"],
    ["Poslední aktualizace", notice.lastUpdated],
  ];

  return (
    <main className="min-h-screen bg-[#f4f6f8] px-4 py-8 text-[#11161c] sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl overflow-hidden rounded-md border border-black/10 bg-white">
        <div className="border-b border-black/10 bg-[#11161c] p-6 text-white sm:p-8">
          <Link href="/cs" className="text-sm font-semibold text-white/70 transition hover:text-white">
            Adclare
          </Link>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.08em] text-[#ffb199]">Transparentní oznámení</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">{notice.ad.title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/72">
            Informace k politické reklamě podle nařízení Evropského parlamentu a Rady (EU) 2024/900.
          </p>
        </div>

        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_260px]">
          <div>
            <div className="grid divide-y divide-black/8 rounded-md border border-black/10">
              {rows.map(([label, value]) => (
                <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[190px_1fr] sm:gap-4">
                  <dt className="text-sm font-medium text-[#68707a]">{label}</dt>
                  <dd className="text-sm font-semibold text-[#20242a]">{value}</dd>
                </div>
              ))}
            </div>

            {notice.ad.missing.length > 0 ? (
              <div className="mt-5 rounded-md border border-orange-200 bg-orange-50 p-4 text-sm font-semibold text-orange-800">
                U tohoto záznamu chybí: {notice.ad.missing.join(", ")}.
              </div>
            ) : (
              <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                Povinné údaje jsou v tomto záznamu vyplněné.
              </div>
            )}
          </div>

          <aside className="rounded-md border border-black/10 bg-[#fbfbfc] p-5">
            <div className="text-sm font-semibold text-[#68707a]">Veřejná URL</div>
            <a className="mt-2 block break-all text-sm font-semibold text-[#d94410]" href={notice.publicUrl}>
              {notice.publicUrl}
            </a>
            <div className="mt-6 text-sm font-semibold text-[#68707a]">Subjekt</div>
            <div className="mt-2 text-lg font-semibold text-black">{notice.tenant}</div>
            <div className="mt-6 text-sm font-semibold text-[#68707a]">Stav</div>
            <div className="mt-2 inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">
              {notice.ad.missing.length === 0 ? "Údaje vyplněny" : "K doplnění"}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
