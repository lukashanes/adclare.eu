import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ExternalLink, FileText, Landmark, QrCode, ShieldCheck } from "lucide-react";
import { getTransparencyNotice } from "@/lib/workspace-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{
    code: string;
  }>;
};

type NoticeRow = [label: string, value: string];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-1 border-b border-black/8 px-4 py-3 last:border-b-0 sm:grid-cols-[190px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm font-medium text-[#68707a]">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-semibold text-[#20242a]">{value}</dd>
    </div>
  );
}

function InfoGroup({ title, rows }: { title: string; rows: NoticeRow[] }) {
  return (
    <section className="rounded-md border border-black/10 bg-white">
      <div className="border-b border-black/10 bg-[#fbfbfc] px-4 py-3">
        <h2 className="text-base font-semibold text-black">{title}</h2>
      </div>
      <dl>
        {rows.map(([label, value]) => (
          <InfoRow key={label} label={label} value={value} />
        ))}
      </dl>
    </section>
  );
}

function KeyFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-black/10 bg-white p-4">
      <div className="text-sm font-medium text-[#68707a]">{label}</div>
      <div className="mt-2 min-w-0 break-words text-lg font-semibold leading-6 text-black">{value}</div>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code: publicToken } = await params;
  const notice = await getTransparencyNotice(publicToken, "cs");

  if (!notice) {
    return {
      title: "Oznámení nenalezeno",
    };
  }

  if (notice.status === "pending") {
    return {
      title: "Oznámení zatím není publikované",
      description: "Stabilní QR odkaz je připravený, detail oznámení se zobrazí po publikaci reklamy.",
      robots: {
        index: false,
        follow: false,
        nocache: true,
      },
    };
  }

  return {
    title: `${notice.ad.id} - transparentní oznámení`,
    description: `Transparentní oznámení k politické reklamě ${notice.ad.title}.`,
  };
}

export default async function TransparencyNoticePage({ params }: PageProps) {
  const { code: publicToken } = await params;
  const notice = await getTransparencyNotice(publicToken, "cs");

  if (!notice) {
    notFound();
  }

  if (notice.status === "pending") {
    return (
      <main className="min-h-screen overflow-x-hidden bg-[#f4f6f8] px-4 py-6 text-[#11161c] sm:px-6 lg:px-8">
        <section className="mx-auto grid w-full max-w-5xl gap-4">
          <div className="overflow-hidden rounded-md border border-black/10 bg-white">
            <div className="border-b border-black/10 bg-[#11161c] p-6 text-white sm:p-8">
              <Link href="/cs" className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition hover:text-white">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Adclare
              </Link>
              <div className="mt-8 inline-flex items-center gap-2 rounded-md border border-white/12 bg-white/8 px-3 py-1.5 text-sm font-semibold text-[#ffb199]">
                <QrCode className="h-4 w-4" aria-hidden="true" />
                QR odkaz
              </div>
              <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">Oznámení zatím není publikované</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/72">
                Odkaz v QR kódu je připravený. Detail reklamy se zobrazí po doplnění povinných údajů, schválení a publikaci záznamu.
              </p>
            </div>
            <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <dl className="min-w-0 rounded-md border border-black/10 bg-[#fbfbfc]">
                <InfoRow label="Veřejný hash" value={publicToken} />
                <InfoRow label="Stav" value="čeká na publikaci" />
                <InfoRow label="Poslední změna" value={notice.lastUpdated} />
              </dl>
              <aside className="rounded-md border border-black/10 bg-white p-4">
                <div className="text-sm font-semibold text-[#68707a]">Veřejná URL</div>
                <a className="mt-2 block break-all text-sm font-semibold text-[#d94410]" href={notice.publicUrl}>
                  {notice.publicUrl}
                </a>
              </aside>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const keyFacts = [
    ["Zadavatel", notice.ad.owner],
    ["Plátce", notice.ad.payer],
    ["Částka / rozpočet", notice.ad.amount || "neuvedeno"],
    ["Zveřejnění", notice.ad.publicationDate],
  ] satisfies NoticeRow[];
  const detailGroups = [
    {
      title: "Identifikace reklamy",
      rows: [
        ["Unikátní ID reklamy", notice.ad.id],
        ["Název materiálu", notice.ad.title],
        ["Typ reklamy", notice.ad.type],
        ["Online / offline", notice.ad.channel],
        ["Kandidát", notice.ad.candidate || "neuvedeno"],
        ["Jazyk", notice.ad.language || "neuvedeno"],
      ],
    },
    {
      title: "Kampaň a šíření",
      rows: [
        ["Kampaň", notice.campaign],
        ["Období šíření", notice.ad.period],
        ["Datum zveřejnění", notice.ad.publicationDate],
        ["Oblast šíření", notice.ad.distributionArea || notice.ad.branch],
      ],
    },
    {
      title: "Financování",
      rows: [
        ["Zadavatel", notice.ad.owner],
        ["Plátce", notice.ad.payer],
        ["Dodavatel", notice.ad.supplier || "neuvedeno"],
        ["Částka / rozpočet", notice.ad.amount || "neuvedeno"],
        ["Původ financí", notice.ad.fundingSource || "neuvedeno"],
      ],
    },
    {
      title: "Cílení",
      rows: [
        ["Cílení", notice.ad.targeting || "nepoužito"],
        ["Cílové publikum", notice.ad.isTargeted ? notice.ad.targetAudience || "neuvedeno" : "nepoužito"],
      ],
    },
  ] satisfies Array<{ title: string; rows: NoticeRow[] }>;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f4f6f8] px-4 py-6 text-[#11161c] sm:px-6 lg:px-8">
      <section className="mx-auto grid w-full max-w-[1500px] gap-5">
        <header className="overflow-hidden rounded-md border border-black/10 bg-[#11161c] text-white">
          <div className="p-6 sm:p-8">
            <Link href="/cs" className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition hover:text-white">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Adclare
            </Link>
            <div className="mt-8 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-md border border-white/12 bg-white/8 px-3 py-1.5 text-sm font-semibold text-[#ffb199]">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Transparentní oznámení podle TTPA
              </span>
              <span className="inline-flex items-center gap-2 rounded-md border border-emerald-200/20 bg-emerald-400/12 px-3 py-1.5 text-sm font-semibold text-emerald-100">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {notice.ad.workflowLabel}
              </span>
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
              <div className="min-w-0">
                <h1 className="max-w-4xl text-3xl font-semibold leading-tight sm:text-4xl">{notice.ad.title}</h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-white/72">
                  Veřejný přehled k politické reklamě. Obsahuje zadavatele, plátce, náklady, kampaň, období šíření a údaje o cílení podle Nařízení EU o transparentnosti a cílení politické reklamy (TTPA).
                </p>
              </div>
              <div className="rounded-md border border-white/12 bg-white/8 p-4">
                <div className="text-sm font-semibold text-white/55">Subjekt</div>
                <div className="mt-2 break-words text-xl font-semibold text-white">{notice.tenant}</div>
                <Link
                  href={`/repo/${notice.tenantSlug}?locale=cs`}
                  className="mt-4 inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#11161c] transition hover:bg-white/90"
                >
                  Veřejný repozitář
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {keyFacts.map(([label, value]) => (
            <KeyFact key={label} label={label} value={value} />
          ))}
        </section>

        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid min-w-0 gap-4">
            {notice.ad.missing.length > 0 ? (
              <div className="rounded-md border border-orange-200 bg-orange-50 p-4 text-sm font-semibold text-orange-800">
                U tohoto záznamu chybí: {notice.ad.missing.join(", ")}.
              </div>
            ) : (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                Povinné údaje jsou v tomto záznamu vyplněné.
              </div>
            )}

            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
              {detailGroups.map((group) => (
                <InfoGroup key={group.title} title={group.title} rows={group.rows} />
              ))}
            </div>
          </div>

          <aside className="grid h-fit min-w-0 gap-4 rounded-md border border-black/10 bg-white p-5 xl:sticky xl:top-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md border border-[#f45d1f]/25 bg-[#fff4ef] px-3 py-1.5 text-sm font-semibold text-[#d94410]">
                <FileText className="h-4 w-4" aria-hidden="true" />
                Veřejný záznam
              </div>
              <dl className="mt-4 grid gap-3">
                <div>
                  <dt className="text-sm font-semibold text-[#68707a]">Veřejná URL</dt>
                  <dd>
                    <a className="mt-1 block break-all text-sm font-semibold text-[#d94410]" href={notice.publicUrl}>
                      {notice.publicUrl}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-[#68707a]">Veřejný hash</dt>
                  <dd className="mt-1 break-all font-mono text-sm font-semibold text-[#20242a]">{publicToken}</dd>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-sm font-semibold text-[#68707a]">Verze</dt>
                    <dd className="mt-1 text-sm font-semibold text-[#20242a]">v{notice.ad.version}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-[#68707a]">Aktualizace</dt>
                    <dd className="mt-1 text-sm font-semibold text-[#20242a]">{notice.lastUpdated}</dd>
                  </div>
                </div>
              </dl>
            </div>

            <div className="rounded-md border border-black/10 bg-[#fbfbfc] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#20242a]">
                <Landmark className="h-4 w-4 text-[#f45d1f]" aria-hidden="true" />
                Stav záznamu
              </div>
              <div
                className={`mt-3 inline-flex rounded-md border px-3 py-1 text-sm font-semibold ${
                  notice.ad.missing.length === 0 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-orange-200 bg-orange-50 text-orange-800"
                }`}
              >
                {notice.ad.missing.length === 0 ? `Údaje vyplněny · ${notice.ad.workflowLabel}` : "K doplnění"}
              </div>
              <p className="mt-3 text-sm leading-6 text-[#59616b]">
                {notice.ad.locked ? "Publikovaná verze je uzamčená." : "Záznam zatím není uzamčený jako publikovaná verze."}
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
