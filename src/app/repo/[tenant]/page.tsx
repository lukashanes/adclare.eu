import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileJson, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { getPublicRepositoryPayload, normalizeLocale } from "@/lib/admin-demo-db";
import type { AdChannel, Locale, PublicRepositoryFilters, Status } from "@/lib/admin-demo-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{
    tenant: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const copy = {
  cs: {
    back: "Adclare",
    title: "Veřejný repozitář politické reklamy",
    description:
      "Vyhledatelné záznamy reklam, transparentních oznámení a povinných údajů podle nařízení Evropského parlamentu a Rady (EU) 2024/900.",
    regulation: "Nařízení (EU) 2024/900",
    total: "Celkem v archivu",
    shown: "Zobrazeno",
    json: "JSON endpoint",
    filters: "Filtry",
    search: "Hledat",
    searchPlaceholder: "Název, kód, pobočka, dodavatel...",
    channel: "Kanál",
    status: "Stav",
    type: "Typ",
    branch: "Pobočka",
    campaign: "Kampaň",
    submit: "Filtrovat",
    reset: "Zrušit filtry",
    table: {
      code: "Kód",
      ad: "Reklama",
      branch: "Pobočka",
      type: "Typ",
      date: "Zveřejnění",
      status: "Stav",
      notice: "Oznámení",
    },
    online: "online",
    offline: "offline",
    missing: "Chybí",
    notice: "Otevřít",
    empty: "Pro vybrané filtry nejsou v repozitáři žádné reklamy.",
    complete: "Povinné údaje vyplněny",
    lastUpdated: "Aktualizace",
    language: "Jazyk",
    candidate: "Kandidát",
  },
  en: {
    back: "Adclare",
    title: "Public political ad repository",
    description:
      "Searchable ad records, transparency notices and required data under Regulation (EU) 2024/900 of the European Parliament and of the Council.",
    regulation: "Regulation (EU) 2024/900",
    total: "Total in archive",
    shown: "Shown",
    json: "JSON endpoint",
    filters: "Filters",
    search: "Search",
    searchPlaceholder: "Title, code, branch, supplier...",
    channel: "Channel",
    status: "Status",
    type: "Type",
    branch: "Branch",
    campaign: "Campaign",
    submit: "Apply filters",
    reset: "Reset filters",
    table: {
      code: "Code",
      ad: "Ad",
      branch: "Branch",
      type: "Type",
      date: "Publication",
      status: "Status",
      notice: "Notice",
    },
    online: "online",
    offline: "offline",
    missing: "Missing",
    notice: "Open",
    empty: "No ads match the selected filters.",
    complete: "Required data complete",
    lastUpdated: "Updated",
    language: "Language",
    candidate: "Candidate",
  },
} as const;

function firstSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function filtersFromSearchParams(searchParams: Record<string, string | string[] | undefined>): Partial<PublicRepositoryFilters> {
  return {
    q: firstSearchValue(searchParams.q),
    channel: firstSearchValue(searchParams.channel) as "all" | AdChannel,
    status: firstSearchValue(searchParams.status) as "all" | Status,
    type: firstSearchValue(searchParams.type),
    branch: firstSearchValue(searchParams.branch),
    campaign: firstSearchValue(searchParams.campaign),
  };
}

function jsonHref(tenant: string, locale: Locale, filters: PublicRepositoryFilters) {
  const params = new URLSearchParams({ locale });

  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== "all") {
      params.set(key, value);
    }
  });

  return `/api/repo/${encodeURIComponent(tenant)}/ads?${params.toString()}`;
}

function statusClass(status: Status) {
  const classes: Record<Status, string> = {
    ready: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-orange-200 bg-orange-50 text-orange-800",
    blocked: "border-red-200 bg-red-50 text-red-800",
    review: "border-sky-200 bg-sky-50 text-sky-800",
  };

  return classes[status];
}

function noticeHref(publicUrl: string) {
  try {
    return new URL(publicUrl).pathname;
  } catch {
    return publicUrl;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tenant } = await params;
  const payload = await getPublicRepositoryPayload(decodeURIComponent(tenant), "cs");

  if (!payload) {
    return {
      title: "Repozitář nenalezen",
    };
  }

  return {
    title: `Repozitář reklam - ${payload.tenant.name}`,
    description: `Veřejný repozitář politické reklamy pro ${payload.tenant.name}.`,
  };
}

export default async function PublicRepositoryPage({ params, searchParams }: PageProps) {
  const [{ tenant }, query] = await Promise.all([params, searchParams]);
  const locale = normalizeLocale(firstSearchValue(query.locale));
  const texts = copy[locale];
  const tenantSlug = decodeURIComponent(tenant);
  const payload = await getPublicRepositoryPayload(tenantSlug, locale, filtersFromSearchParams(query));

  if (!payload) {
    notFound();
  }

  const repositoryJsonHref = jsonHref(payload.tenant.slug, locale, payload.filters);

  return (
    <main className="min-h-screen bg-[#f4f6f8] px-4 py-6 text-[#11161c] sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-md border border-black/10 bg-white">
          <header className="border-b border-black/10 bg-[#11161c] p-5 text-white sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-4xl">
                <Link href={`/${locale}`} className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition hover:text-white">
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  {texts.back}
                </Link>
                <div className="mt-7 inline-flex items-center gap-2 rounded-md border border-white/12 bg-white/8 px-3 py-1.5 text-sm font-semibold text-[#ffb199]">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  {texts.regulation}
                </div>
                <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">{texts.title}</h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-white/72">{texts.description}</p>
                <p className="mt-5 text-lg font-semibold text-white">{payload.tenant.name}</p>
              </div>

              <div className="grid min-w-full grid-cols-2 gap-3 text-sm sm:min-w-[340px]">
                <div className="rounded-md border border-white/12 bg-white/8 p-4">
                  <div className="text-white/55">{texts.total}</div>
                  <div className="mt-2 text-3xl font-semibold">{payload.totalCount}</div>
                </div>
                <div className="rounded-md border border-white/12 bg-white/8 p-4">
                  <div className="text-white/55">{texts.shown}</div>
                  <div className="mt-2 text-3xl font-semibold">{payload.filteredCount}</div>
                </div>
                <a
                  href={repositoryJsonHref}
                  className="col-span-2 inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-3 font-semibold text-[#11161c] transition hover:bg-white/90"
                >
                  <FileJson className="h-4 w-4" aria-hidden="true" />
                  {texts.json}
                </a>
              </div>
            </div>
          </header>

          <form className="border-b border-black/10 bg-[#fbfbfc] p-4 sm:p-5" action={`/repo/${payload.tenant.slug}`}>
            <input type="hidden" name="locale" value={locale} />
            <div className="flex items-center gap-2 text-sm font-semibold text-[#68707a]">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              {texts.filters}
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(220px,1.3fr)_repeat(5,minmax(130px,1fr))]">
              <label className="block" htmlFor="repo-filter-q">
                <span className="text-xs font-semibold uppercase text-[#68707a]">{texts.search}</span>
                <div className="mt-1 flex h-11 items-center gap-2 rounded-md border border-black/10 bg-white px-3">
                  <Search className="h-4 w-4 text-[#8a919b]" aria-hidden="true" />
                  <input
                    id="repo-filter-q"
                    name="q"
                    aria-label={texts.search}
                    defaultValue={payload.filters.q}
                    placeholder={texts.searchPlaceholder}
                    className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-[#9aa1aa]"
                  />
                </div>
              </label>

              <FilterSelect label={texts.channel} name="channel" value={payload.filters.channel} options={payload.options.channels} />
              <FilterSelect label={texts.status} name="status" value={payload.filters.status} options={payload.options.statuses} />
              <FilterSelect label={texts.type} name="type" value={payload.filters.type} options={payload.options.types} />
              <FilterSelect label={texts.branch} name="branch" value={payload.filters.branch} options={payload.options.branches} />
              <FilterSelect label={texts.campaign} name="campaign" value={payload.filters.campaign} options={payload.options.campaigns} />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="submit" className="rounded-md bg-[#11161c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black">
                {texts.submit}
              </button>
              <Link
                href={`/repo/${payload.tenant.slug}?locale=${locale}`}
                className="rounded-md border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#20242a] transition hover:border-black/20"
              >
                {texts.reset}
              </Link>
            </div>
          </form>

          {payload.ads.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left">
                <thead className="border-b border-black/10 bg-white text-xs font-semibold uppercase text-[#68707a]">
                  <tr>
                    <th className="px-5 py-3">{texts.table.code}</th>
                    <th className="px-5 py-3">{texts.table.ad}</th>
                    <th className="px-5 py-3">{texts.table.branch}</th>
                    <th className="px-5 py-3">{texts.table.type}</th>
                    <th className="px-5 py-3">{texts.table.date}</th>
                    <th className="px-5 py-3">{texts.table.status}</th>
                    <th className="px-5 py-3">{texts.table.notice}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/8 bg-white">
                  {payload.ads.map((ad) => (
                    <tr key={ad.id} className="align-top">
                      <td className="px-5 py-4 font-mono text-sm font-semibold text-[#20242a]">{ad.id}</td>
                      <td className="max-w-[340px] px-5 py-4">
                        <div className="text-sm font-semibold text-[#11161c]">{ad.title}</div>
                        {ad.candidate ? <div className="mt-1 text-xs font-semibold text-[#20242a]">{texts.candidate}: {ad.candidate}</div> : null}
                        <div className="mt-1 text-xs leading-5 text-[#68707a]">
                          {ad.campaign} · {texts.language}: {ad.language} · {texts.lastUpdated}: {ad.lastUpdated}
                        </div>
                        <div className="mt-2 text-xs leading-5 text-[#68707a]">
                          {ad.missing.length > 0 ? `${texts.missing}: ${ad.missing.join(", ")}` : texts.complete}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-[#20242a]">{ad.branch}</td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-[#20242a]">{ad.type}</div>
                        <div className="mt-1 text-xs font-medium text-[#68707a]">{ad.channel === "online" ? texts.online : texts.offline}</div>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-[#20242a]">{ad.publicationDate}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${statusClass(ad.status)}`}>
                          {ad.statusLabel}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <a
                          href={noticeHref(ad.publicUrl)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-black/10 px-3 py-2 text-sm font-semibold text-[#d94410] transition hover:border-[#f45d1f]"
                        >
                          {texts.notice}
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white p-10 text-center text-sm font-semibold text-[#68707a]">{texts.empty}</div>
          )}
        </div>
      </section>
    </main>
  );
}

function FilterSelect({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  const id = `repo-filter-${name}`;

  return (
    <label className="block" htmlFor={id}>
      <span className="text-xs font-semibold uppercase text-[#68707a]">{label}</span>
      <select
        id={id}
        name={name}
        aria-label={label}
        defaultValue={value}
        className="mt-1 h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm font-semibold text-[#20242a] outline-none transition focus:border-[#f45d1f]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
