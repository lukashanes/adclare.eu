import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ExternalLink, FileText, Landmark, QrCode, ShieldCheck } from "lucide-react";
import { getTransparencyNotice } from "@/lib/workspace/services/public-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{
    code: string;
  }>;
};

type NoticeRow = [label: string, value: string];

function InfoRow({ label, value }: { label: string; value: string }) {
  const href = /^https?:\/\//i.test(value) ? value : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? `mailto:${value}` : "";

  return (
    <div className="grid min-w-0 gap-1 border-b border-black/8 px-4 py-3 last:border-b-0 sm:grid-cols-[190px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm font-medium text-[#68707a]">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-semibold text-[#20242a]">
        {href ? (
          <a href={href} className="text-[#d94410] underline decoration-[#d94410]/30 underline-offset-2">
            {value}
          </a>
        ) : value}
      </dd>
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
    title: `${notice.ad.id} - veřejné oznámení`,
    description: `Veřejné oznámení k politické reklamě ${notice.ad.title}.`,
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
              <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">Veřejné oznámení zatím není publikované</h1>
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
    ["Náklady reklamy", `${notice.ad.amount} ${notice.ad.currency}`.trim()],
    ["Šíření", `${notice.ad.disseminationStartsAt} až ${notice.ad.disseminationEndsAt}`],
  ] satisfies NoticeRow[];
  const detailGroups = [
    {
      title: "1. Zadavatel",
      rows: [
        ["Název", notice.ad.owner],
        ["Typ subjektu", notice.ad.ownerEntityType === "legal" ? "právnická osoba" : notice.ad.ownerEntityType === "natural" ? "fyzická osoba" : notice.ad.ownerEntityType],
        ["E-mail", notice.ad.ownerEmail],
        ["Poštovní adresa", notice.ad.ownerPostalAddress],
        ["Sídlo", notice.ad.ownerEstablishmentAddress || "nepoužije se"],
        ["Registrační číslo", notice.ad.ownerRegistrationNumber || "neuvedeno"],
      ],
    },
    {
      title: "2. Ovládající subjekt",
      rows: [
        ["Název", notice.ad.controllerName || "nepoužije se"],
        ["Typ subjektu", notice.ad.controllerEntityType || "nepoužije se"],
        ["E-mail", notice.ad.controllerEmail || "nepoužije se"],
        ["Poštovní adresa", notice.ad.controllerPostalAddress || "nepoužije se"],
        ["Sídlo", notice.ad.controllerEstablishmentAddress || "nepoužije se"],
      ],
    },
    {
      title: "3. Plátce",
      rows: [
        ["Název", notice.ad.payer],
        ["Typ subjektu", notice.ad.payerEntityType === "legal" ? "právnická osoba" : notice.ad.payerEntityType === "natural" ? "fyzická osoba" : notice.ad.payerEntityType],
        ["E-mail", notice.ad.payerEmail],
        ["Poštovní adresa", notice.ad.payerPostalAddress],
        ["Sídlo", notice.ad.payerEstablishmentAddress || "nepoužije se"],
        ["Dodavatel", notice.ad.supplier || "neuvedeno"],
      ],
    },
    {
      title: "4. Šíření a financování",
      rows: [
        ["Začátek šíření", notice.ad.disseminationStartsAt],
        ["Konec šíření", notice.ad.disseminationEndsAt],
        ["Oblast šíření", notice.ad.distributionArea || notice.ad.branch],
        ["Náklady reklamy", `${notice.ad.amount} ${notice.ad.currency}`.trim()],
        ["Nepeněžní plnění reklamy", `${notice.ad.benefitsInKind} ${notice.ad.currency}`.trim()],
        ["Náklady kampaně", `${notice.campaignDetails.aggregatedAmount} ${notice.campaignDetails.currency}`.trim()],
        ["Nepeněžní plnění kampaně", `${notice.campaignDetails.benefitsInKind} ${notice.campaignDetails.currency}`.trim()],
        ["Původ financí", notice.ad.fundingSource],
        ["Veřejné / soukromé", notice.ad.fundingOrigin],
        ["EU / mimo EU", notice.ad.fundingJurisdiction],
        ["Metodika výpočtu reklamy", notice.ad.calculationMethod],
        ["Metodika výpočtu kampaně", notice.campaignDetails.calculationMethod],
      ],
    },
    {
      title: "5. Volby a veřejné odkazy",
      rows: [
        ["Kampaň", notice.campaign],
        ["Volby nebo proces", notice.campaignDetails.election],
        ["Úroveň", notice.campaignDetails.electionLevel],
        ["Datum", notice.campaignDetails.electionDate],
        ["Oficiální informace", notice.campaignDetails.officialInformationUrl],
        ["URL zveřejněné reklamy", notice.ad.advertisementUrl || "není k dispozici"],
        ["Platforma nebo médium", notice.ad.publisherPlatform || "neuvedeno"],
        ["Evropský repozitář", notice.ad.europeanRepositoryUrl || "nepoužije se"],
        ["Předchozí pozastavení", notice.ad.republishedAfterInfringement ? notice.ad.infringementDetails : "ne"],
      ],
    },
    {
      title: "6. Cílení a dosah",
      rows: [
        ["Používá cílení", notice.ad.isTargeted ? "ano" : "ne"],
        ["Používá osobní údaje", notice.ad.usesPersonalData ? "ano" : "ne"],
        ["Techniky cílení", notice.ad.targeting || "nepoužito"],
        ["Cílové publikum", notice.ad.targetAudience || "nepoužito"],
        ["Kategorie osobních údajů", notice.ad.targetingDataCategories || "nepoužito"],
        ["Cíle, mechanismy a logika", notice.ad.targetingLogic || "nepoužito"],
        ["Použití AI", notice.ad.targetingAiUse || "nepoužito"],
        ["Interní pravidla cílení", notice.ad.targetingPolicyUrl || "nepoužito"],
        ["Správce údajů", notice.ad.dataController || "nepoužito"],
        ["Odvolání souhlasu", notice.ad.consentWithdrawUrl || "nepoužito"],
        ["Uplatnění práv", notice.ad.dataRightsUrl || "nepoužito"],
        ["Informace o zpracování", notice.ad.privacyInformationUrl || "nepoužito"],
        ["Zobrazení", notice.ad.reachViews?.toLocaleString("cs-CZ") ?? "údaj není technicky dostupný"],
        ["Interakce", notice.ad.reachEngagements?.toLocaleString("cs-CZ") ?? "údaj není technicky dostupný"],
        ["Kliknutí", notice.ad.reachClicks?.toLocaleString("cs-CZ") ?? "údaj není technicky dostupný"],
        ["To se mi líbí", notice.ad.reachLikes?.toLocaleString("cs-CZ") ?? "údaj není technicky dostupný"],
        ["Komentáře", notice.ad.reachComments?.toLocaleString("cs-CZ") ?? "údaj není technicky dostupný"],
      ],
    },
    {
      title: "7. Identifikace záznamu",
      rows: [
        ["Unikátní ID reklamy", notice.ad.id],
        ["Název materiálu", notice.ad.title],
        ["Typ reklamy", notice.ad.type],
        ["Online / offline", notice.ad.channel],
        ["Kandidát", notice.ad.candidate || "neuvedeno"],
        ["Jazyk", notice.ad.language],
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
                Veřejné oznámení podle TTPA
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
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/repo/${notice.tenantSlug}?locale=cs`}
                    className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#11161c] transition hover:bg-white/90"
                  >
                    Veřejný archiv
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <a
                    href={`/api/public/ads/${encodeURIComponent(publicToken)}?locale=cs`}
                    className="inline-flex items-center gap-2 rounded-md border border-white/20 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Data JSON
                    <FileText className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
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
                  <dt className="text-sm font-semibold text-[#68707a]">Nesrovnalost v oznámení</dt>
                  <dd>
                    <Link
                      href={notice.reportUrl}
                      className="mt-2 inline-flex rounded-md border border-black/10 px-3 py-2 text-sm font-semibold text-[#20242a] transition hover:border-[#f45d1f]/40 hover:text-[#d94410]"
                    >
                      Nahlásit nesrovnalost
                    </Link>
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
