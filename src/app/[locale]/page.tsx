import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Database,
  FileArchive,
  FileText,
  GitBranch,
  Globe2,
  Languages,
  LockKeyhole,
  Mail,
  Menu,
  QrCode,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  UsersRound,
  Workflow,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { notFound } from "next/navigation";

const locales = ["cs", "en"] as const;
type Locale = (typeof locales)[number];

const languageOptions = {
  cs: { short: "CS", label: "Čeština" },
  en: { short: "EN", label: "English" },
} as const;

const content = {
  cs: {
    nav: ["Produkt", "Workflow", "Nasazení", "Bezpečnost", "Nápověda", "Kontakt"],
    login: "Přihlášení",
    cta: "GitHub",
    secondaryCta: "Jak to funguje",
    menu: "Menu",
    legalLinks: {
      privacy: "Ochrana osobních údajů",
      cookies: "Cookies",
      terms: "Podmínky a právní informace",
      dpa: "Zpracování osobních údajů",
      subprocessors: "Subdodavatelé",
      security: "Bezpečnost",
    },
    heroMarker: "Open source podle EUPL-1.2",
    heroTitle: "Evidence a celé workflow politických reklam podle TTPA",
    heroText:
      "Adclare je self-hosted nástroj pro politické strany, kandidáty, agentury a compliance týmy. Pomáhá držet reklamy, povinné údaje, QR kódy, transparentní oznámení, schvalování a auditní exporty na jednom místě podle Nařízení EU o transparentnosti a cílení politické reklamy (TTPA), Regulation (EU) 2024/900.",
    heroBullets: [
      "Každá reklama má jeden záznam, vlastní QR odkaz, veřejné oznámení a historii změn.",
      "Pobočky, kandidáti, grafici a schvalovatelé pracují ve stejném workflow bez e-mailového ping-pongu.",
      "Software si můžete stáhnout, nasadit přes Docker a upravit pro vlastní organizační strukturu.",
    ],
    dashboard: {
      title: "Přehled kampaně",
      menu: ["Reklamy", "Pobočky", "Kontrola", "QR", "Repozitář", "Audit"],
      orgLabel: "Self-hosted instance",
      date: "Volby 2026",
      export: "Audit export",
      adsTitle: "Reklamy podle TTPA",
      tableHeads: ["Kód", "Materiál", "Tým", "Kontrola údajů", "Stav", "QR"],
      stats: [
        ["V evidenci", "128", "všechny materiály"],
        ["Hotovo", "72", "QR a oznámení"],
        ["Doplnit", "28", "povinná data"],
        ["Po termínu", "18", "nelze publikovat"],
        ["Kontrola", "10", "čeká na review"],
      ],
      rows: [
        ["PHA-014", "Citylight: dostupné bydlení", "Praha 3", "plátce, období, částky OK", "Připraveno", "green"],
        ["BRN-032", "Video: doprava v centru", "Brno-střed", "chybí cílení a archiv", "Doplnit", "orange"],
        ["OST-011", "Leták: čisté ulice", "Ostrava-Jih", "chybí částka a původ financí", "Po termínu", "red"],
        ["LBC-006", "Billboard: dostupná energie", "Liberec", "čeká na schválení plátce", "Kontrola", "orange"],
        ["PLZ-019", "Banner: školky bez čekání", "Plzeň", "oznámení a QR hotové", "Schváleno", "green"],
      ],
      queueTitle: "Co se řeší",
      queueItems: ["Doplnit původ financí", "Potvrdit částku kampaně", "Zkontrolovat cílení"],
      queueTime: "před 3 h",
    },
    workflowTitle: "Jedno workflow od podkladu po audit",
    workflowText:
      "Adclare pokrývá praktickou práci kolem reklam: zadání materiálu, kontrolu povinných údajů, QR/label, veřejné oznámení, schválení, publikaci, uzamčení verze a auditní balíček.",
    steps: [
      ["Nasadíte vlastní instanci", "Docker, PostgreSQL a vlastní doména na vašem VPS nebo hostingu."],
      ["Vytvoříte organizaci", "Centrála, kraje, oblasti, pobočky nebo agenturní týmy podle vaší struktury."],
      ["Pozvete lidi", "Pobočky, kandidáti, grafici a kontroloři vidí jen práci, kterou mají řešit."],
      ["Založíte reklamu", "Soubor, termín zveřejnění, plátce, náklady, lokace a případné cílení."],
      ["Doplníte TTPA údaje", "Systém ukáže, co chybí před zveřejněním nebo vyvěšením."],
      ["Vygenerujete QR", "Veřejná stránka transparentního oznámení a tiskové výstupy."],
      ["Schválíte a publikujete", "Publikovaná verze se zamkne a další změny jdou do historie."],
      ["Exportujete audit", "ZIP/JSON/CSV/PDF podklady pro kontrolu, archiv nebo vlastní web."],
    ],
    modulesTitle: "Co aplikace obsahuje",
    modules: [
      ["Evidence reklam", "Jeden záznam pro každou online i offline politickou reklamu, včetně termínu a odpovědnosti."],
      ["Povinné údaje podle TTPA", "Plátce, zadavatel, náklady, období, oblast šíření, financování a cílení, pokud se používá."],
      ["QR a transparentní oznámení", "Stabilní veřejná URL, QR kódy a oznámení pro tisk, outdoor, web i sociální reklamu."],
      ["Role a pobočky", "Centrála, lokální týmy, kandidáti, grafici, kontroloři a auditoři s omezeným rozsahem přístupu."],
      ["Veřejný repozitář", "Publikované reklamy lze vystavit ve vyhledatelném archivu a přes JSON endpoint."],
      ["Auditní exporty", "Historie změn, schválení, soubory, hash podkladů a exportní balíčky pro kontrolu."],
    ],
    hostingTitle: "Self-hosted nasazení",
    hostingText:
      "Adclare je určený k vlastnímu provozu. Můžete ho spustit lokálně, v Dockeru, na vlastním VPS nebo na Hetzneru. Data, soubory i doména zůstávají pod vaší kontrolou.",
    hostingCards: [
      ["Docker Compose", "PostgreSQL, aplikace a volitelný reverse proxy v jednom reprodukovatelném setupu."],
      ["Vlastní infrastruktura", "Použijte Hetzner, jiný VPS, interní server nebo hosting, který odpovídá vašim pravidlům."],
      ["Konfigurace bez vendor lock-in", "E-mail, Turnstile, S3 kompatibilní storage a veřejná URL jsou nastavitelné přes env proměnné."],
    ],
    securityTitle: "Bezpečnost, audit a kontrola",
    securityText:
      "Politická reklama vyžaduje jasné role, dohledatelné změny a kontrolu nad soubory. Adclare odděluje přístupy podle organizace a pobočky a drží historii kroků důležitých pro TTPA.",
    securityCards: [
      ["Role a rozsah", "Každý uživatel vidí jen organizaci, pobočku a materiály, ke kterým má oprávnění."],
      ["Magic link přihlášení", "Přístup běží přes časově omezené odkazy a chráněné relace."],
      ["Auditní stopa", "Změny, schválení, publikace a exporty zůstávají v dohledatelné historii."],
      ["Soukromé soubory", "Materiály se ukládají do S3 kompatibilního úložiště a stahují přes oprávněné endpointy."],
      ["Veřejný repozitář", "Veřejně se ukazují jen publikované nebo archivované záznamy."],
      ["Backup a restore", "Součástí repa jsou skripty a dokumentace pro zálohování a obnovu PostgreSQL."],
    ],
    supportTitle: "Potřebujete pomoc s nasazením?",
    supportText:
      "Adclare je open source. Pokud chcete konzultaci, instalaci, migraci dat, hosting, školení nebo úpravu workflow pro vlastní organizaci, napište na support@adclare.eu.",
    footerText:
      "Open source nástroj pro evidenci, označování, schvalování a archiv politické reklamy podle TTPA, Regulation (EU) 2024/900.",
    footerSecurity: "EUPL-1.2, self-hosted, audit a exporty",
    footerWorkflow: "Evidence, QR, oznámení, schvalování a veřejný repozitář",
  },
  en: {
    nav: ["Product", "Workflow", "Self-hosting", "Security", "Help", "Contact"],
    login: "Sign in",
    cta: "GitHub",
    secondaryCta: "How it works",
    menu: "Menu",
    legalLinks: {
      privacy: "Privacy Policy",
      cookies: "Cookies",
      terms: "Terms and Legal Notice",
      dpa: "Data Processing",
      subprocessors: "Subprocessors",
      security: "Security",
    },
    heroMarker: "Open source under EUPL-1.2",
    heroTitle: "Political ad records and workflow for TTPA compliance",
    heroText:
      "Adclare is a self-hosted tool for political parties, candidates, agencies and compliance teams. It keeps adverts, required data, QR codes, transparency notices, approvals and audit exports in one place under the EU Transparency and Targeting of Political Advertising Regulation (TTPA), Regulation (EU) 2024/900.",
    heroBullets: [
      "Each advert has one record, QR link, public notice and change history.",
      "Branches, candidates, designers and reviewers work in one workflow instead of email threads.",
      "Download it, run it with Docker and adapt it to your own organization structure.",
    ],
    dashboard: {
      title: "Campaign overview",
      menu: ["Ads", "Branches", "Review", "QR", "Repository", "Audit"],
      orgLabel: "Self-hosted instance",
      date: "Election 2026",
      export: "Audit export",
      adsTitle: "TTPA advert records",
      tableHeads: ["Code", "Asset", "Team", "Data check", "Status", "QR"],
      stats: [
        ["In registry", "128", "all materials"],
        ["Ready", "72", "QR and notice"],
        ["Complete", "28", "required data"],
        ["Overdue", "18", "cannot publish"],
        ["Review", "10", "waiting review"],
      ],
      rows: [
        ["PRG-014", "Citylight: housing access", "Prague 3", "payer, dates, costs OK", "Ready", "green"],
        ["BRN-032", "Video: city transport", "Brno-centre", "missing targeting and archive", "Complete", "orange"],
        ["OST-011", "Leaflet: cleaner streets", "Ostrava-South", "missing amount and funding source", "Overdue", "red"],
        ["LBC-006", "Billboard: energy costs", "Liberec", "waiting for payer approval", "Review", "orange"],
        ["PLZ-019", "Banner: childcare capacity", "Pilsen", "notice and QR complete", "Approved", "green"],
      ],
      queueTitle: "Action queue",
      queueItems: ["Add funding source", "Confirm campaign amount", "Review targeting"],
      queueTime: "3 h ago",
    },
    workflowTitle: "One workflow from asset to audit",
    workflowText:
      "Adclare covers the practical work around political adverts: asset intake, required data checks, QR labels, public notices, approval, publication, version lock and audit packages.",
    steps: [
      ["Run your own instance", "Docker, PostgreSQL and your own domain on a VPS or internal hosting."],
      ["Create organization", "Headquarters, regions, branches or agency teams using your own structure."],
      ["Invite people", "Branches, candidates, designers and reviewers only see their assigned work."],
      ["Create an advert", "Asset, publication date, payer, cost, location and optional targeting."],
      ["Complete TTPA data", "The system shows what is missing before publication or display."],
      ["Generate QR", "Public transparency notice page and print-ready outputs."],
      ["Approve and publish", "Published versions are locked and later changes are versioned."],
      ["Export audit", "ZIP/JSON/CSV/PDF packages for review, archiving or your own website."],
    ],
    modulesTitle: "What the application includes",
    modules: [
      ["Advert registry", "One record for each online and offline political advert, including deadlines and responsibility."],
      ["Required TTPA data", "Payer, sponsor, costs, period, distribution area, funding source and targeting when used."],
      ["QR and transparency notice", "Stable public URL, QR codes and notices for print, outdoor, web and social advertising."],
      ["Roles and branches", "Headquarters, local teams, candidates, designers, reviewers and auditors with scoped access."],
      ["Public repository", "Published adverts can be exposed in a searchable archive and JSON endpoint."],
      ["Audit exports", "Change history, approvals, files, asset hashes and export packages for review."],
    ],
    hostingTitle: "Self-hosted deployment",
    hostingText:
      "Adclare is built to be operated by you. Run it locally, with Docker, on your VPS or on Hetzner. Your data, files and domain stay under your control.",
    hostingCards: [
      ["Docker Compose", "PostgreSQL, the app and optional reverse proxy in one reproducible setup."],
      ["Your infrastructure", "Use Hetzner, another VPS, an internal server or hosting that fits your rules."],
      ["Config without lock-in", "Email, Turnstile, S3-compatible storage and public URL are configured through environment variables."],
    ],
    securityTitle: "Security, audit and control",
    securityText:
      "Political advertising requires clear roles, traceable changes and control over files. Adclare scopes access by organization and branch and keeps history for TTPA-relevant actions.",
    securityCards: [
      ["Roles and scope", "Each user sees only the organization, branch and materials they are allowed to access."],
      ["Magic link login", "Access uses time-limited links and protected sessions."],
      ["Audit trail", "Changes, approvals, publication and exports remain in traceable history."],
      ["Private files", "Assets are stored in S3-compatible storage and downloaded through authorized endpoints."],
      ["Public repository", "Only published or archived records are shown publicly."],
      ["Backup and restore", "The repository includes scripts and docs for PostgreSQL backup and recovery."],
    ],
    supportTitle: "Need help with deployment?",
    supportText:
      "Adclare is open source. If you need consulting, installation, data migration, hosting, training or custom workflow changes, contact support@adclare.eu.",
    footerText:
      "Open source tool for recording, labelling, approving and archiving political advertising under TTPA, Regulation (EU) 2024/900.",
    footerSecurity: "EUPL-1.2, self-hosted, audit and exports",
    footerWorkflow: "Records, QR, notices, approvals and public repository",
  },
} as const;

const statusClass = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  orange: "border-orange-200 bg-orange-50 text-orange-700",
  red: "border-red-200 bg-red-50 text-red-700",
} as const;

const moduleIcons: LucideIcon[] = [Database, CheckCircle2, QrCode, UsersRound, Globe2, FileArchive];
const stepIcons: LucideIcon[] = [Server, GitBranch, Mail, FileText, CheckCircle2, QrCode, ShieldCheck, FileArchive];
const hostingIcons: LucideIcon[] = [Server, Database, SlidersHorizontal];
const securityIcons: LucideIcon[] = [LockKeyhole, Mail, FileArchive, Upload, Globe2, Database];

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
  const t = content[safeLocale];

  return {
    title: t.heroTitle,
    description: t.heroText,
    alternates: {
      canonical: `/${safeLocale}`,
      languages: {
        cs: "/cs",
        en: "/en",
      },
    },
  };
}

export default async function LocalePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const t = content[locale];

  return (
    <main className="min-h-screen bg-white text-[#0b0b0c]">
      <Header t={t} locale={locale} />
      <Hero t={t} />
      <WorkflowSection t={t} />
      <Modules t={t} />
      <HostingSection t={t} />
      <SecuritySection t={t} />
      <SupportSection t={t} />
      <Footer t={t} locale={locale} />
    </main>
  );
}

function Header({
  t,
  locale,
}: {
  t: (typeof content)[Locale];
  locale: Locale;
}) {
  const navItems = [
    ["#product", t.nav[0]],
    ["#workflow", t.nav[1]],
    ["#hosting", t.nav[2]],
    ["#security", t.nav[3]],
    [`/${locale}/help`, t.nav[4]],
    ["#contact", t.nav[5]],
  ] as const;

  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-white/92 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <Link href={`/${locale}`} className="flex items-center gap-3" aria-label="Adclare">
          <span className="grid size-9 place-items-center rounded-md bg-[#f45d1f] text-white shadow-sm">
            <ShieldCheck size={21} strokeWidth={2.4} />
          </span>
          <span className="text-2xl font-semibold">Adclare</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-[#25282d] lg:flex">
          {navItems.map(([href, label]) => (
            <a key={href} href={href} className="transition hover:text-[#e04e17]">
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageDropdown locale={locale} />
          <Link className="hidden px-3 py-2 text-sm font-medium text-[#25282d] sm:inline-flex" href="/login">
            {t.login}
          </Link>
          <a
            href="https://github.com/lukashanes/adclare.eu"
            className="hidden rounded-md bg-[#f45d1f] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d94410] sm:inline-flex"
          >
            {t.cta}
          </a>
          <details className="group relative lg:hidden">
            <summary
              aria-label={t.menu}
              role="button"
              className="flex size-11 cursor-pointer list-none items-center justify-center rounded-md border border-black/10 bg-white text-[#11161c] shadow-sm transition hover:border-[#f45d1f]/50 hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f45d1f]/40 [&::-webkit-details-marker]:hidden"
            >
              <Menu className="size-5 group-open:hidden" />
              <X className="hidden size-5 group-open:block" />
              <span className="sr-only">{t.menu}</span>
            </summary>
            <div className="absolute right-0 top-[calc(100%+12px)] w-[min(calc(100vw-2rem),24rem)] overflow-hidden rounded-lg border border-black/10 bg-white shadow-2xl shadow-black/15">
              <nav className="grid p-2 text-base font-semibold text-[#11161c]">
                {navItems.map(([href, label]) => (
                  <a key={href} href={href} className="rounded-md px-4 py-3 transition hover:bg-orange-50 hover:text-[#d94410]">
                    {label}
                  </a>
                ))}
                <a href="https://github.com/lukashanes/adclare.eu" className="rounded-md px-4 py-3 transition hover:bg-orange-50 hover:text-[#d94410]">
                  {t.cta}
                </a>
                <Link href="/login" className="rounded-md px-4 py-3 transition hover:bg-orange-50 hover:text-[#d94410]">
                  {t.login}
                </Link>
              </nav>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

function LanguageDropdown({ locale }: { locale: Locale }) {
  return (
    <details className="group relative">
      <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-sm font-semibold text-[#25282d] shadow-sm transition hover:border-[#f45d1f]/50 hover:bg-orange-50 [&::-webkit-details-marker]:hidden">
        <Languages size={16} />
        <span>{languageOptions[locale].short}</span>
        <ChevronDown className="size-4 transition group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-40 overflow-hidden rounded-md border border-black/10 bg-white p-1 shadow-xl shadow-black/10">
        {locales.map((option) => {
          const language = languageOptions[option];
          const active = option === locale;
          return (
            <Link key={option} href={`/${option}`} className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold text-[#25282d] transition hover:bg-orange-50">
              <span>{language.label}</span>
              {active ? <Check size={15} /> : <span className="font-mono text-xs text-[#9aa0a8]">{language.short}</span>}
            </Link>
          );
        })}
      </div>
    </details>
  );
}

function Hero({ t }: { t: (typeof content)[Locale] }) {
  return (
    <section id="product" className="noise-grid border-b border-black/10">
      <div className="mx-auto grid max-w-[1500px] gap-10 px-5 py-10 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8 lg:py-16">
        <div className="flex flex-col justify-center">
          <div className="mb-5 w-fit rounded-md border border-[#f45d1f] bg-white px-3 py-1.5 text-sm font-semibold text-[#e04e17]">
            {t.heroMarker}
          </div>
          <h1 className="max-w-2xl text-4xl font-semibold leading-[1.06] text-black sm:text-6xl">{t.heroTitle}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#3f444b]">{t.heroText}</p>
          <ul className="mt-7 grid gap-3 text-base font-medium text-[#20242a]">
            {t.heroBullets.map((item) => (
              <li key={item} className="flex gap-3">
                <Check className="mt-1 size-5 shrink-0 text-[#f45d1f]" strokeWidth={2.6} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href="https://github.com/lukashanes/adclare.eu" className="inline-flex items-center justify-center gap-2 rounded-md bg-[#f45d1f] px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#d94410]">
              {t.cta}
              <ArrowRight size={18} />
            </a>
            <a href="#workflow" className="inline-flex items-center justify-center gap-2 rounded-md border border-[#f45d1f] bg-white px-5 py-3 text-base font-semibold text-[#d94410] transition hover:bg-orange-50">
              {t.secondaryCta}
            </a>
          </div>
        </div>

        <div className="hidden lg:block">
          <DashboardPreview t={t} />
        </div>
      </div>
    </section>
  );
}

function DashboardPreview({ t }: { t: (typeof content)[Locale] }) {
  return (
    <div className="rounded-lg border border-[#14161a] bg-[#11161c] p-2 shadow-2xl shadow-black/15">
      <div className="grid overflow-hidden rounded-md border border-white/10 bg-white lg:grid-cols-[160px_1fr]">
        <aside className="hidden bg-[#11161c] p-4 text-white lg:block">
          <div className="mb-8 text-xl font-semibold">Adclare</div>
          <div className="grid gap-1 text-sm text-white/78">
            {t.dashboard.menu.map((item, index) => (
              <div key={item} className={`flex items-center gap-2 rounded-md px-3 py-2 ${index === 0 ? "bg-white/10 text-white" : ""}`}>
                <span className={index === 0 ? "h-4 w-1 rounded-sm bg-[#f45d1f]" : "h-4 w-1"} />
                {item}
              </div>
            ))}
          </div>
          <div className="mt-16 border-t border-white/10 pt-4 text-xs leading-5 text-white/60">
            {t.dashboard.orgLabel}
            <br />
            TTPA
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3">
              <SlidersHorizontal size={19} />
              <span className="text-sm font-semibold">{t.dashboard.title}</span>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="rounded-md border border-black/10 px-3 py-1.5 text-xs font-medium text-[#525963]">{t.dashboard.date}</span>
              <button className="rounded-md border border-black/10 px-3 py-1.5 text-xs font-semibold">{t.dashboard.export}</button>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-5">
              {t.dashboard.stats.map((stat, index) => {
                const Icon = [Database, CheckCircle2, CheckCircle2, LockKeyhole, Workflow][index];
                const colors = ["text-blue-600 bg-blue-50", "text-emerald-600 bg-emerald-50", "text-orange-600 bg-orange-50", "text-red-600 bg-red-50", "text-sky-600 bg-sky-50"];
                return (
                  <div key={stat[0]} className="flex min-h-24 gap-3 rounded-md border border-black/10 bg-white p-3">
                    <span className={`grid size-8 place-items-center rounded-md ${colors[index]}`}>
                      <Icon size={17} />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-medium leading-4 text-[#68707a]">{stat[0]}</div>
                      <div className="mt-1 text-2xl font-semibold leading-none">{stat[1]}</div>
                      <div className="mt-1 text-xs text-[#68707a]">{stat[2]}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 grid gap-4 2xl:grid-cols-[1fr_235px]">
              <div className="overflow-hidden rounded-md border border-black/10">
                <div className="border-b border-black/10 px-4 py-3 text-sm font-semibold">{t.dashboard.adsTitle}</div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="bg-[#f7f7f8] text-xs text-[#68707a]">
                      <tr>
                        {t.dashboard.tableHeads.map((head) => (
                          <th key={head} className="px-4 py-3 font-semibold">{head}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/8">
                      {t.dashboard.rows.map((row) => (
                        <tr key={row[0]} className="bg-white">
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-[#20242a]">{row[0]}</td>
                          <td className="px-4 py-3 text-[#525963]">{row[1]}</td>
                          <td className="px-4 py-3 text-[#525963]">{row[2]}</td>
                          <td className="px-4 py-3 text-[#20242a]">{row[3]}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${statusClass[row[5] as keyof typeof statusClass]}`}>
                              {row[4]}
                            </span>
                          </td>
                          <td className="px-4 py-3"><QrCode size={18} className="text-[#20242a]" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="hidden rounded-md border border-black/10 p-4 2xl:block">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold">{t.dashboard.queueTitle}</div>
                  <span className="rounded-md bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">7</span>
                </div>
                {t.dashboard.queueItems.map((item) => (
                  <div key={item} className="border-t border-black/8 py-2 text-xs">
                    <div className="font-medium">{item}</div>
                    <div className="text-[#68707a]">{t.dashboard.queueTime}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowSection({ t }: { t: (typeof content)[Locale] }) {
  return (
    <section id="workflow" className="border-b border-black/10 bg-[#f7f7f8]">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[0.62fr_1fr] lg:items-end">
          <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">{t.workflowTitle}</h2>
          <p className="max-w-3xl text-lg leading-8 text-[#4c535d]">{t.workflowText}</p>
        </div>
        <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {t.steps.map((step, index) => {
            const Icon = stepIcons[index];
            return (
              <article key={step[0]} className="relative flex gap-4 rounded-lg border border-black/10 bg-white p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-md border border-[#f45d1f]/25 bg-orange-50 text-[#e04e17]"><Icon size={21} /></span>
                <div className="min-w-0 pr-7">
                  <span className="absolute right-4 top-4 font-mono text-sm text-[#9aa0a8]">{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="text-base font-semibold leading-6">{step[0]}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#59616b]">{step[1]}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Modules({ t }: { t: (typeof content)[Locale] }) {
  return (
    <section className="border-b border-black/10 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <h2 className="max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">{t.modulesTitle}</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {t.modules.map((module, index) => {
            const Icon = moduleIcons[index];
            return (
              <article key={module[0]} className="flex gap-4 rounded-lg border border-black/10 p-5 transition hover:border-[#f45d1f]/50">
                <span className="grid size-11 shrink-0 place-items-center rounded-md bg-[#11161c] text-white"><Icon size={22} /></span>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold leading-6">{module[0]}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#525963]">{module[1]}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HostingSection({ t }: { t: (typeof content)[Locale] }) {
  return (
    <section id="hosting" className="border-b border-black/10 bg-[#11161c] text-white">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.7fr_1fr]">
          <div>
            <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">{t.hostingTitle}</h2>
            <p className="mt-5 text-lg leading-8 text-white/72">{t.hostingText}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {t.hostingCards.map((card, index) => {
              const Icon = hostingIcons[index];
              return (
                <article key={card[0]} className="rounded-lg border border-white/12 bg-white/8 p-5">
                  <span className="grid size-10 place-items-center rounded-md bg-[#f45d1f] text-white"><Icon size={21} /></span>
                  <h3 className="mt-4 text-base font-semibold leading-6">{card[0]}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/68">{card[1]}</p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function SecuritySection({ t }: { t: (typeof content)[Locale] }) {
  return (
    <section id="security" className="border-b border-black/10 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.7fr_1fr]">
          <div>
            <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">{t.securityTitle}</h2>
            <p className="mt-5 text-lg leading-8 text-[#4c535d]">{t.securityText}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {t.securityCards.map((card, index) => {
              const Icon = securityIcons[index];
              return (
                <article key={card[0]} className="flex gap-4 rounded-lg border border-black/10 p-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-md bg-orange-50 text-[#e04e17]"><Icon size={21} /></span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold leading-6">{card[0]}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#59616b]">{card[1]}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function SupportSection({ t }: { t: (typeof content)[Locale] }) {
  return (
    <section className="border-b border-black/10 bg-[#f7f7f8]">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-6 rounded-lg border border-black/10 bg-white p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="text-2xl font-semibold">{t.supportTitle}</h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[#4c535d]">{t.supportText}</p>
          </div>
          <a href="mailto:support@adclare.eu" className="inline-flex items-center justify-center gap-2 rounded-md bg-[#11161c] px-5 py-3 text-sm font-semibold text-white">
            support@adclare.eu
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer({ t, locale }: { t: (typeof content)[Locale]; locale: Locale }) {
  return (
    <footer id="contact" className="bg-[#f7f7f8]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-6 lg:grid-cols-[0.9fr_1fr_1fr] lg:px-8">
        <div>
          <Link href={`/${locale}`} className="mb-5 flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md bg-[#f45d1f] text-white"><ShieldCheck size={21} /></span>
            <span className="text-2xl font-semibold">Adclare</span>
          </Link>
          <p className="max-w-sm text-sm leading-6 text-[#59616b]">{t.footerText}</p>
        </div>
        <div className="grid gap-3 text-sm text-[#59616b]">
          <div className="flex items-center gap-3"><BookOpen size={17} className="text-[#f45d1f]" /><span>{t.footerSecurity}</span></div>
          <div className="flex items-center gap-3"><Workflow size={17} className="text-[#f45d1f]" /><span>{t.footerWorkflow}</span></div>
          <div className="flex items-center gap-3"><ShieldCheck size={17} className="text-[#f45d1f]" /><span>TTPA / Regulation (EU) 2024/900</span></div>
        </div>
        <div className="grid gap-3 text-sm text-[#59616b]">
          <div className="flex items-center gap-3">
            <Mail size={17} className="text-[#f45d1f]" />
            <a className="font-medium text-[#25282d] hover:text-[#d94410]" href="mailto:support@adclare.eu">support@adclare.eu</a>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-black/10 pt-4">
            <Link className="font-medium text-[#25282d] hover:text-[#d94410]" href={`/${locale}/privacy`}>{t.legalLinks.privacy}</Link>
            <Link className="font-medium text-[#25282d] hover:text-[#d94410]" href={`/${locale}/cookies`}>{t.legalLinks.cookies}</Link>
            <Link className="font-medium text-[#25282d] hover:text-[#d94410]" href={`/${locale}/terms`}>{t.legalLinks.terms}</Link>
            <Link className="font-medium text-[#25282d] hover:text-[#d94410]" href={`/${locale}/dpa`}>{t.legalLinks.dpa}</Link>
            <Link className="font-medium text-[#25282d] hover:text-[#d94410]" href={`/${locale}/subprocessors`}>{t.legalLinks.subprocessors}</Link>
            <Link className="font-medium text-[#25282d] hover:text-[#d94410]" href={`/${locale}/security`}>{t.legalLinks.security}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
