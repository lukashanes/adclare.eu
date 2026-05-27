import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CreditCard,
  FileArchive,
  FileText,
  Fingerprint,
  Globe2,
  Languages,
  LockKeyhole,
  Mail,
  Menu,
  QrCode,
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  UserRoundPlus,
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
    nav: ["Produkt", "Workflow", "Cena", "Bezpečnost", "Kontakt"],
    login: "Přihlášení",
    cta: "Získat přístup",
    secondaryCta: "Zobrazit workflow",
    lang: "CS",
    menu: "Menu",
    legalLinks: {
      privacy: "Ochrana osobních údajů",
      cookies: "Cookies",
      terms: "Podmínky a právní informace",
    },
    heroMarker: "Nařízení (EU) 2024/900",
    heroTitle: "Politická reklama pod kontrolou",
    heroText:
      "Adclare drží reklamy, povinné údaje, QR kódy, oznámení, schvalování i audit na jednom místě. Bez e-mailového ping-pongu je hned vidět, co je hotové a co doplnit před zveřejněním.",
    heroBullets: [
      "Jeden záznam pro reklamu, QR kód, label, oznámení i auditní stopu.",
      "Přehled chybějících údajů před vyvěšením nebo spuštěním reklamy.",
      "Jasné role pro stranu, pobočky, kandidáty, grafiky i schvalovatele.",
    ],
    dashboard: {
      title: "Hlavní přehled",
      menu: ["Přehled", "Reklamy", "Schvalování", "Pobočky", "Týmy", "Faktury", "Audit"],
      orgLabel: "Centrála strany",
      date: "1. 8. - 10. 10. 2026",
      export: "Exportovat",
      adsTitle: "Reklamy",
      tableHeads: ["Kód", "Materiál", "Tým", "Kontrola údajů", "Stav", "QR"],
      stats: [
        ["V evidenci", "128", "+12 tento týden"],
        ["Hotovo", "72", "QR a oznámení"],
        ["Doplnit", "28", "povinná data"],
        ["Po termínu", "18", "blokuje publikaci"],
        ["Kontrola", "10", "čeká na schválení"],
      ],
      rows: [
        ["PHA-014", "Citylight: dostupné bydlení", "Praha 3", "plátce, období, částky OK", "Připraveno", "green"],
        ["BRN-032", "Video: doprava v centru", "Brno-střed", "chybí cílení a archiv", "Doplnit", "orange"],
        ["OST-011", "Leták: čisté ulice", "Ostrava-Jih", "chybí částka a původ financí", "Po termínu", "red"],
        ["LBC-006", "Billboard: dostupná energie", "Liberec", "čeká na schválení plátce", "Kontrola", "orange"],
        ["PLZ-019", "Banner: školky bez čekání", "Plzeň", "oznámení a QR hotové", "Schváleno", "green"],
      ],
      queueTitle: "Fronta ke schválení",
      queueItems: ["Doplnit původ financí", "Potvrdit částku kampaně", "Zkontrolovat cílení"],
      queueTime: "před 3 h",
      billingTitle: "Fakturace",
      billingStatus: "Aktivní",
      billingRows: ["Plán", "Platba", "Sleva"],
    },
    workflowTitle: "Jednoduché workflow",
    workflowText:
      "Centrála nastaví pravidla, pozve týmy a sleduje připravenost kampaně. Pobočky a grafici vidí jen svoje úkoly, termíny a chybějící údaje. Reklama se nedá označit jako připravená, dokud nemá povinná data pro označení podle nařízení (EU) 2024/900.",
    steps: [
      ["Strana aktivuje účet", "Předplatné kartou přes Stripe, SEPA nebo faktura po schválení."],
      ["Centrála vytvoří strukturu", "Kraje, regiony a oblasti si pojmenuje vlastním jazykem."],
      ["Pozvánky rozdělí práci", "Pobočky, kandidáti a grafici dostanou přístup jen ke svým úkolům."],
      ["Tým založí reklamu", "Soubor, termín vyvěšení, plátce, náklady, lokace a případné cílení."],
      ["Semafor hlídá data", "Chybějící údaje jsou oranžové nebo červené podle termínu publikace."],
      ["QR, label a oznámení", "Po doplnění údajů se generuje veřejná stránka a tiskové výstupy."],
      ["Schválení a zámek", "Po publikaci se verze zamkne a změny jdou do historie."],
      ["Auditní export", "PDF, CSV, JSON a ZIP pro kontrolu, archiv nebo předání jinému úložišti."],
    ],
    modulesTitle: "Kde Adclare šetří práci",
    modules: [
      ["Pobočky bez čekání na centrálu", "Centrála nastaví mantinely, lokální týmy doplní vlastní kampaně, kandidáty a reklamy."],
      ["Grafici dostanou jen to, co potřebují", "Externí dodavatel nahraje podklady, stáhne QR/print balíček a nevidí zbytek organizace."],
      ["Deadline před vyvěšením", "Datum publikace určuje termín. Pokud chybí plátce, období, částky, původ financí nebo cílení, reklama zčervená."],
      ["Tagy místo chaotických složek", "Štítky pro volby, kraj, město, téma, dodavatele, médium, rozpočtovou kapitolu nebo prioritu."],
      ["Repozitář pro veřejnost i kontrolu", "Stabilní URL reklamy, vyhledávání, JSON endpoint, archiv a možnost nahlášení problému."],
      ["Billing a přístupy", "Stripe, faktura, ruční schválení, sleva z předplatného, zkušební přístup i pozastavení účtu z administrace."],
    ],
    pricingTitle: "Jednoduché ceny pro strany všech velikostí",
    pricingText:
      "Vyberte tarif podle rozsahu kampaně. Velká strana pokryje centrálu, regiony, pobočky a externí týmy bez limitu. Malá strana získá praktický proces pro jednu volební kampaň ročně.",
    pricingPlans: [
      {
        name: "Malá strana",
        description: "Pro menší subjekt nebo jednu lokální volební kampaň za rok.",
        monthly: "9 EUR",
        monthlyNote: "/ měsíc",
        yearly: "99 EUR / rok",
        badge: "Start",
        cta: "Začít",
        highlighted: false,
        features: [
          "1 volební kampaň za rok",
          "10 uživatelských přístupů",
          "Evidence reklam, QR a transparentní oznámení",
          "Základní repozitář a exporty",
        ],
      },
      {
        name: "Velká strana",
        description: "Pro centrálu, regiony, pobočky, kandidáty a externí grafiky.",
        monthly: "99 EUR",
        monthlyNote: "/ měsíc v akci",
        yearly: "999 EUR / rok v akci",
        originalMonthly: "199 EUR / měsíc",
        originalYearly: "1990 EUR / rok",
        badge: "Akce -50 %",
        cta: "Získat přístup",
        highlighted: true,
        features: [
          "Neomezeně uživatelů, kampaní a reklam",
          "Pobočky, regiony a vlastní názvosloví organizace",
          "Veřejný repozitář, přístupy a archiv po zákonně požadovanou dobu",
          "PDF, ZIP, CSV, JSON a exporty pro jiné úložiště nebo web",
          "Schvalování, auditní stopa a připomínky před vyvěšením",
        ],
      },
      {
        name: "Custom řešení",
        description: "Pro speciální hosting, integrace, SLA nebo vlastní procesy.",
        monthly: "Na míru",
        monthlyNote: "",
        yearly: "Kontaktujte nás",
        badge: "Enterprise",
        cta: "Domluvit řešení",
        highlighted: false,
        features: [
          "Vlastní onboarding a import dat",
          "Napojení na web, archiv, externí úložiště nebo agenturu",
          "Individuální fakturace, podpora a bezpečnostní požadavky",
          "Custom limity, pravidla a workflow schvalování",
        ],
      },
    ],
    savingsTitle: "Kolik administrativy to typicky ušetří",
    savingsText:
      "Nejvíc času mizí v urgencích, dohledávání poslední verze podkladu a ruční kontrole povinných údajů. Adclare přesune práci do jednoho stavu, který vidí centrála, pobočky i dodavatelé.",
    savings: [
      ["Velká strana", "300-900 h / rok", "méně ruční kontroly, dohledávání podkladů a urgencí před deadlinem"],
      ["Malá strana", "25-80 h / rok", "jedna kampaň bez ztracených QR, neúplných údajů a ručních exportů"],
      ["Koordinace kampaní", "1 společný stav", "centrála, pobočky a grafici vidí stejné termíny, stavy a schválení"],
    ],
    securityTitle: "Bezpečnost, audit a kontrola přístupů",
    securityText:
      "Politická reklama vyžaduje kontrolu nad přístupy, soubory a historií změn. Adclare odděluje data podle organizace, omezuje přístupy podle role a drží dohledatelnou stopu pro interní i externí kontrolu.",
    securityCards: [
      ["Role a omezené přístupy", "Centrála, pobočky, kandidáti, grafici a auditoři vidí jen data, ke kterým mají oprávnění."],
      ["2FA pro administrátory", "Správci, schvalovatelé a billing role mohou mít povinné dvoufaktorové ověření."],
      ["Auditní stopa změn", "Každé doplnění údajů, schválení, export a změna publikované reklamy zůstává v historii."],
      ["Archiv a exporty", "Podklady, QR, oznámení a důkazní balíčky lze exportovat a uchovat po zákonně požadovanou dobu."],
      ["Ochrana veřejných formulářů", "Veřejné formuláře a přístupy jsou chráněné proti automatizovanému zneužití a nadměrnému provozu."],
      ["Zálohy a obnova", "Data a soubory lze zálohovat, obnovit a exportovat mimo platformu podle potřeb organizace."],
    ],
    footerOperator: "Provozovatel",
    operator: "Aenze s.r.o.",
    address: "Moskevská 1842, 272 04 Kladno",
    companyIds: "IČO 28534395, DIČ CZ28534395",
    footerText:
      "Online nástroj pro evidenci, označování, schvalování a archiv politické reklamy podle nařízení (EU) 2024/900.",
    footerSecurity: "Role, 2FA, audit a ochrana formulářů",
    footerWorkflow: "Faktury, pobočky, QR, archiv a exporty",
  },
  en: {
    nav: ["Product", "Workflow", "Pricing", "Security", "Contact"],
    login: "Sign in",
    cta: "Get access",
    secondaryCta: "View workflow",
    lang: "EN",
    menu: "Menu",
    legalLinks: {
      privacy: "Privacy Policy",
      cookies: "Cookies",
      terms: "Terms and Legal Notice",
    },
    heroMarker: "Regulation (EU) 2024/900",
    heroTitle: "Political advertising under control",
    heroText:
      "Adclare keeps ads, required data, QR codes, notices, approvals and audit in one place. Without email ping-pong, everyone sees what is done and what to complete before publication.",
    heroBullets: [
      "One ad record for the QR code, label, notice and audit trail.",
      "A clear view of missing data before an ad is installed or launched.",
      "Clear roles for the party, branches, candidates, designers and reviewers.",
    ],
    dashboard: {
      title: "Main overview",
      menu: ["Overview", "Ads", "Approvals", "Branches", "Teams", "Invoices", "Audit"],
      orgLabel: "Party headquarters",
      date: "1 Aug - 10 Oct 2026",
      export: "Export",
      adsTitle: "Ads",
      tableHeads: ["Code", "Asset", "Team", "Data check", "Status", "QR"],
      stats: [
        ["In registry", "128", "+12 this week"],
        ["Ready", "72", "QR and notice"],
        ["Complete", "28", "required data"],
        ["Overdue", "18", "publication blocked"],
        ["Review", "10", "waiting approval"],
      ],
      rows: [
        ["PRG-014", "Citylight: housing access", "Prague 3", "payer, dates, costs OK", "Ready", "green"],
        ["BRN-032", "Video: city transport", "Brno-centre", "missing targeting and archive", "Complete", "orange"],
        ["OST-011", "Leaflet: cleaner streets", "Ostrava-South", "missing amount and funding source", "Overdue", "red"],
        ["LBC-006", "Billboard: energy costs", "Liberec", "waiting for payer approval", "Review", "orange"],
        ["PLZ-019", "Banner: childcare capacity", "Pilsen", "notice and QR complete", "Approved", "green"],
      ],
      queueTitle: "Approval queue",
      queueItems: ["Add funding source", "Confirm campaign amount", "Review targeting"],
      queueTime: "3 h ago",
      billingTitle: "Billing",
      billingStatus: "Active",
      billingRows: ["Plan", "Payment", "Discount"],
    },
    workflowTitle: "Simple workflow",
    workflowText:
      "Headquarters sets the rules, invites teams and tracks campaign readiness. Branches and designers only see their own tasks, deadlines and missing fields. An ad cannot be marked ready until the required data for labelling under Regulation (EU) 2024/900 is complete.",
    steps: [
      ["Party activates account", "Stripe subscription, SEPA or invoice after manual approval."],
      ["Headquarters builds structure", "Regions and units can use custom internal naming."],
      ["Invitations split the work", "Branches, candidates and designers get access only to their tasks."],
      ["Team creates an ad", "Asset, installation date, payer, costs, location and optional targeting."],
      ["Traffic light checks data", "Missing fields turn orange or red based on the publication deadline."],
      ["QR, label and notice", "A public transparency page and print-ready outputs are generated from completed data."],
      ["Approval and lock", "Published versions are locked and changes are versioned."],
      ["Audit export", "PDF, CSV, JSON and ZIP for review, archive or transfer to another storage."],
    ],
    modulesTitle: "Where Adclare saves work",
    modules: [
      ["Branches without waiting for headquarters", "Headquarters sets guardrails, local teams manage their own campaigns, candidates and ads."],
      ["Designers see only what they need", "External suppliers upload assets, download QR/print packages and do not see the rest of the organization."],
      ["Deadline before publication", "Publication date drives the deadline. Missing payer, dates, amounts, funding source or targeting turns the ad red."],
      ["Tags instead of messy folders", "Tags for election, region, city, topic, supplier, medium, budget line or internal priority."],
      ["Repository for public access and review", "Stable ad URL, search, JSON endpoint, archive and issue-report option."],
      ["Billing and access control", "Stripe, invoice approval, subscription discount, trial and account suspension from admin."],
    ],
    pricingTitle: "Simple pricing for parties of every size",
    pricingText:
      "Choose a plan by campaign scope. Large parties cover headquarters, regions, branches and external teams without limits. Smaller parties get a practical process for one election campaign per year.",
    pricingPlans: [
      {
        name: "Small party",
        description: "For a smaller subject or one local election campaign per year.",
        monthly: "9 EUR",
        monthlyNote: "/ month",
        yearly: "99 EUR / year",
        badge: "Start",
        cta: "Start",
        highlighted: false,
        features: [
          "1 election campaign per year",
          "10 user seats",
          "Ad records, QR and transparency notices",
          "Basic repository and exports",
        ],
      },
      {
        name: "Large party",
        description: "For headquarters, regions, branches, candidates and external designers.",
        monthly: "99 EUR",
        monthlyNote: "/ month launch price",
        yearly: "999 EUR / year launch price",
        originalMonthly: "199 EUR / month",
        originalYearly: "1990 EUR / year",
        badge: "Launch -50%",
        cta: "Get access",
        highlighted: true,
        features: [
          "Unlimited users, campaigns and ads",
          "Branches, regions and custom organization naming",
          "Public repository, access control and legally required archive",
          "PDF, ZIP, CSV, JSON and exports to external storage or websites",
          "Approvals, audit trail and reminders before publication",
        ],
      },
      {
        name: "Custom solution",
        description: "For dedicated hosting, integrations, SLA or custom processes.",
        monthly: "Custom",
        monthlyNote: "",
        yearly: "Contact us",
        badge: "Enterprise",
        cta: "Talk to us",
        highlighted: false,
        features: [
          "Custom onboarding and data import",
          "Website, archive, external storage or agency integrations",
          "Individual billing, support and security requirements",
          "Custom limits, rules and approval workflows",
        ],
      },
    ],
    savingsTitle: "How much admin time it can save",
    savingsText:
      "Most time is lost chasing missing data, finding the latest asset and manually checking required fields. Adclare moves the work into one status shared by headquarters, branches and suppliers.",
    savings: [
      ["Large party", "300-900 h / year", "less manual checking, asset chasing and deadline escalation"],
      ["Small party", "25-80 h / year", "one campaign without lost QR codes, incomplete data and manual exports"],
      ["Campaign coordination", "1 shared status", "headquarters, branches and designers see the same deadlines, states and approvals"],
    ],
    securityTitle: "Security, audit and access control",
    securityText:
      "Political advertising needs control over access, files and change history. Adclare separates data by organization, limits access by role and keeps a traceable record for internal and external review.",
    securityCards: [
      ["Roles and scoped access", "Headquarters, branches, candidates, designers and auditors only see the data they are allowed to access."],
      ["2FA for administrators", "Admins, reviewers and billing roles can require two-factor authentication."],
      ["Change audit trail", "Every data update, approval, export and published-ad change stays in history."],
      ["Archive and exports", "Assets, QR codes, notices and proof packages can be exported and retained for the legally required period."],
      ["Public form protection", "Public forms and access points are protected against automated abuse and excessive traffic."],
      ["Backups and recovery", "Data and files can be backed up, restored and exported outside the platform according to organization needs."],
    ],
    footerOperator: "Operator",
    operator: "Aenze s.r.o.",
    address: "Moskevská 1842, 272 04 Kladno, Czech Republic",
    companyIds: "Company ID 28534395, VAT CZ28534395",
    footerText:
      "Online tool for recording, labelling, approving and archiving political advertising under Regulation (EU) 2024/900.",
    footerSecurity: "Roles, 2FA, audit and form protection",
    footerWorkflow: "Invoices, branches, QR, archive and exports",
  },
} as const;

const statusClass = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  orange: "border-orange-200 bg-orange-50 text-orange-700",
  red: "border-red-200 bg-red-50 text-red-700",
} as const;

const moduleIcons: LucideIcon[] = [
  Building2,
  UserRoundPlus,
  CalendarClock,
  Tags,
  Globe2,
  ReceiptText,
];

const stepIcons: LucideIcon[] = [
  CreditCard,
  Building2,
  Mail,
  FileText,
  AlertTriangle,
  QrCode,
  ShieldCheck,
  FileArchive,
];

const securityIcons: LucideIcon[] = [
  LockKeyhole,
  ShieldCheck,
  Fingerprint,
  FileArchive,
  Globe2,
  CheckCircle2,
];

const savingsIcons: LucideIcon[] = [Building2, CalendarClock, Workflow];

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
      <Billing t={t} />
      <SecuritySection t={t} />
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
    ["#pricing", t.nav[2]],
    ["#security", t.nav[3]],
    ["#contact", t.nav[4]],
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
            href="#pricing"
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
                  <a
                    key={href}
                    href={href}
                    className="rounded-md px-4 py-3 transition hover:bg-orange-50 hover:text-[#d94410]"
                  >
                    {label}
                  </a>
                ))}
              </nav>
              <div className="grid gap-2 border-t border-black/10 p-3">
                <LanguageDropdown locale={locale} mobile />
                <Link
                  className="rounded-md px-4 py-3 text-sm font-semibold text-[#25282d] transition hover:bg-[#f7f7f8]"
                  href="/login"
                >
                  {t.login}
                </Link>
                <a
                  href="#pricing"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-[#f45d1f] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d94410]"
                >
                  {t.cta}
                  <ArrowRight size={16} />
                </a>
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

function LanguageDropdown({ locale, mobile = false }: { locale: Locale; mobile?: boolean }) {
  const currentLanguage = languageOptions[locale];

  if (mobile) {
    return (
      <details className="rounded-md border border-black/10 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-[#25282d] transition hover:bg-orange-50 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <Languages size={16} />
            {currentLanguage.short}
          </span>
          <ChevronDown size={14} />
        </summary>
        <div className="grid border-t border-black/10 p-2">
          {locales.map((option) => {
            const language = languageOptions[option];
            const active = option === locale;

            return (
              <Link
                key={option}
                href={`/${option}`}
                className={`flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold transition ${
                  active ? "bg-orange-50 text-[#d94410]" : "text-[#25282d] hover:bg-[#f7f7f8]"
                }`}
              >
                <span>{language.label}</span>
                {active ? <Check size={15} /> : <span className="font-mono text-xs text-[#9aa0a8]">{language.short}</span>}
              </Link>
            );
          })}
        </div>
      </details>
    );
  }

  return (
    <details className="group relative hidden sm:block">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-medium text-[#25282d] transition hover:border-black/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f45d1f]/40 [&::-webkit-details-marker]:hidden">
        <Languages size={16} />
        {currentLanguage.short}
        <ChevronDown size={14} className="transition group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 top-[calc(100%+10px)] w-44 overflow-hidden rounded-lg border border-black/10 bg-white p-1.5 shadow-2xl shadow-black/15">
        {locales.map((option) => {
          const language = languageOptions[option];
          const active = option === locale;

          return (
            <Link
              key={option}
              href={`/${option}`}
              className={`flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold transition ${
                active ? "bg-orange-50 text-[#d94410]" : "text-[#25282d] hover:bg-[#f7f7f8]"
              }`}
            >
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
          <h1 className="max-w-2xl text-4xl font-semibold leading-[1.06] text-black sm:text-6xl">
            {t.heroTitle}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#3f444b]">{t.heroText}</p>
          <ul className="mt-7 grid gap-3 text-base font-medium text-[#20242a]">
            {t.heroBullets.map((item) => (
              <li key={item} className="flex gap-3">
                <Check className="mt-1 size-5 shrink-0 text-[#f45d1f]" strokeWidth={2.6} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="#pricing"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#f45d1f] px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#d94410]"
            >
              {t.cta}
              <ArrowRight size={18} />
            </a>
            <a
              href="#workflow"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-[#f45d1f] bg-white px-5 py-3 text-base font-semibold text-[#d94410] transition hover:bg-orange-50"
            >
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
            {t.dashboard.menu.map(
              (item, index) => (
                <div
                  key={item}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 ${
                    index === 0 ? "bg-white/10 text-white" : ""
                  }`}
                >
                  <span className={index === 0 ? "h-4 w-1 rounded-sm bg-[#f45d1f]" : "h-4 w-1"} />
                  {item}
                </div>
              ),
            )}
          </div>
          <div className="mt-16 border-t border-white/10 pt-4 text-xs leading-5 text-white/60">
            {t.dashboard.orgLabel}
            <br />
            ID: 123456
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3">
              <SlidersHorizontal size={19} />
              <span className="text-sm font-semibold">{t.dashboard.title}</span>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="rounded-md border border-black/10 px-3 py-1.5 text-xs font-medium text-[#525963]">
                {t.dashboard.date}
              </span>
              <button className="rounded-md border border-black/10 px-3 py-1.5 text-xs font-semibold">
                {t.dashboard.export}
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-5">
              {t.dashboard.stats.map((stat, index) => {
                const Icon = [Building2, CheckCircle2, AlertTriangle, CircleAlert, CalendarClock][index];
                const colors = [
                  "text-blue-600 bg-blue-50",
                  "text-emerald-600 bg-emerald-50",
                  "text-orange-600 bg-orange-50",
                  "text-red-600 bg-red-50",
                  "text-sky-600 bg-sky-50",
                ];
                return (
                  <div key={stat[0]} className="flex min-h-24 gap-3 rounded-md border border-black/10 bg-white p-3">
                    <div>
                      <span className={`grid size-8 place-items-center rounded-md ${colors[index]}`}>
                        <Icon size={17} />
                      </span>
                    </div>
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
                <div className="border-b border-black/10 px-4 py-3 text-sm font-semibold">
                  {t.dashboard.adsTitle}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="bg-[#f7f7f8] text-xs text-[#68707a]">
                      <tr>
                        {t.dashboard.tableHeads.map((head) => (
                          <th key={head} className="px-4 py-3 font-semibold">
                            {head}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/8">
                      {t.dashboard.rows.map((row) => (
                        <tr key={row[0]} className="bg-white">
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-[#20242a]">
                            {row[0]}
                          </td>
                          <td className="px-4 py-3 text-[#525963]">{row[1]}</td>
                          <td className="px-4 py-3 text-[#525963]">{row[2]}</td>
                          <td className="px-4 py-3 text-[#20242a]">{row[3]}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${
                                statusClass[row[5] as keyof typeof statusClass]
                              }`}
                            >
                              {row[4]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <QrCode size={18} className="text-[#20242a]" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="hidden gap-4 2xl:grid">
                <div className="rounded-md border border-black/10 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold">{t.dashboard.queueTitle}</div>
                    <span className="rounded-md bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
                      7
                    </span>
                  </div>
                  {t.dashboard.queueItems.map((item) => (
                    <div key={item} className="border-t border-black/8 py-2 text-xs">
                      <div className="font-medium">{item}</div>
                      <div className="text-[#68707a]">{t.dashboard.queueTime}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-md border border-black/10 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold">{t.dashboard.billingTitle}</div>
                    <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                      {t.dashboard.billingStatus}
                    </span>
                  </div>
                  <div className="grid gap-2 text-xs text-[#525963]">
                    <div className="flex justify-between">
                      <span>{t.dashboard.billingRows[0]}</span>
                      <strong className="text-[#20242a]">Party</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>{t.dashboard.billingRows[1]}</span>
                      <strong className="text-[#20242a]">Stripe</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>{t.dashboard.billingRows[2]}</span>
                      <strong className="text-[#20242a]">20 %</strong>
                    </div>
                  </div>
                </div>
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
          <div>
            <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">{t.workflowTitle}</h2>
          </div>
          <p className="max-w-3xl text-lg leading-8 text-[#4c535d]">{t.workflowText}</p>
        </div>

        <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {t.steps.map((step, index) => {
            const Icon = stepIcons[index];
            return (
              <article key={step[0]} className="relative flex gap-4 rounded-lg border border-black/10 bg-white p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-md border border-[#f45d1f]/25 bg-orange-50 text-[#e04e17]">
                  <Icon size={21} />
                </span>
                <div className="min-w-0 pr-7">
                  <span className="absolute right-4 top-4 font-mono text-sm text-[#9aa0a8]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
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
              <article
                key={module[0]}
                className="flex gap-4 rounded-lg border border-black/10 p-5 transition hover:border-[#f45d1f]/50"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-md bg-[#11161c] text-white">
                  <Icon size={22} />
                </span>
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

function Billing({ t }: { t: (typeof content)[Locale] }) {
  return (
    <section id="pricing" className="border-b border-black/10 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[0.7fr_1fr] lg:items-end">
          <div>
            <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">{t.pricingTitle}</h2>
          </div>
          <p className="max-w-3xl text-lg leading-8 text-[#4c535d]">{t.pricingText}</p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {t.pricingPlans.map((plan, index) => {
            const Icon = [ReceiptText, BadgeCheck, UserRoundPlus][index];
            const isHighlighted = plan.highlighted;
            return (
              <article
                key={plan.name}
                className={`rounded-lg border p-6 ${
                  isHighlighted
                    ? "border-[#f45d1f] bg-[#11161c] text-white shadow-2xl shadow-black/15"
                    : "border-black/10 bg-white"
                }`}
              >
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-4">
                    <span
                      className={`grid size-11 shrink-0 place-items-center rounded-md ${
                        isHighlighted ? "bg-[#f45d1f] text-white" : "bg-orange-50 text-[#e04e17]"
                      }`}
                    >
                      <Icon size={22} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-2xl font-semibold leading-tight">{plan.name}</h3>
                      <p
                        className={`mt-2 text-sm leading-6 ${
                          isHighlighted ? "text-white/72" : "text-[#59616b]"
                        }`}
                      >
                        {plan.description}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                      isHighlighted
                        ? "border-white/18 bg-white/10 text-white"
                        : "border-[#f45d1f]/30 bg-orange-50 text-[#d94410]"
                    }`}
                  >
                    {plan.badge}
                  </span>
                </div>

                <div className="mt-6">
                  {"originalMonthly" in plan ? (
                    <div className="mb-1 text-sm font-medium text-white/50 line-through">{plan.originalMonthly}</div>
                  ) : null}
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-semibold tracking-tight">{plan.monthly}</span>
                    <span className={`pb-1 text-sm ${isHighlighted ? "text-white/68" : "text-[#59616b]"}`}>
                      {plan.monthlyNote}
                    </span>
                  </div>
                  <div className={`mt-2 text-sm font-semibold ${isHighlighted ? "text-orange-200" : "text-[#d94410]"}`}>
                    {"originalYearly" in plan ? (
                      <>
                        <span className="mr-2 line-through opacity-60">{plan.originalYearly}</span>
                        {plan.yearly}
                      </>
                    ) : (
                      plan.yearly
                    )}
                  </div>
                </div>

                <a
                  href="#contact"
                  className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold transition ${
                    isHighlighted
                      ? "bg-[#f45d1f] text-white hover:bg-[#d94410]"
                      : "border border-black/10 bg-white text-[#11161c] hover:border-[#f45d1f]/50 hover:bg-orange-50"
                  }`}
                >
                  {plan.cta}
                  <ArrowRight size={16} />
                </a>

                <ul className="mt-7 grid gap-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm leading-6">
                      <Check
                        className={`mt-0.5 size-4 shrink-0 ${isHighlighted ? "text-[#ff8a55]" : "text-[#f45d1f]"}`}
                        strokeWidth={2.7}
                      />
                      <span className={isHighlighted ? "text-white/80" : "text-[#3f444b]"}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        <div className="mt-10 rounded-lg border border-black/10 bg-[#f7f7f8] p-6">
          <div className="grid gap-5 lg:grid-cols-[0.55fr_1fr] lg:items-start">
            <div>
              <h3 className="text-2xl font-semibold">{t.savingsTitle}</h3>
              <p className="mt-3 text-sm leading-6 text-[#59616b]">{t.savingsText}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {t.savings.map((item, index) => {
                const Icon = savingsIcons[index];
                return (
                  <article key={item[0]} className="flex gap-3 rounded-md border border-black/10 bg-white p-4">
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-orange-50 text-[#e04e17]">
                      <Icon size={19} />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#59616b]">{item[0]}</div>
                      <div className="mt-1 text-2xl font-semibold text-[#11161c]">{item[1]}</div>
                      <p className="mt-2 text-sm leading-6 text-[#59616b]">{item[2]}</p>
                    </div>
                  </article>
                );
              })}
            </div>
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
                  <span className="grid size-10 shrink-0 place-items-center rounded-md bg-orange-50 text-[#e04e17]">
                    <Icon size={21} />
                  </span>
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

function Footer({ t, locale }: { t: (typeof content)[Locale]; locale: Locale }) {
  return (
    <footer id="contact" className="bg-[#f7f7f8]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-6 lg:grid-cols-[0.9fr_1fr_1fr] lg:px-8">
        <div>
          <Link href={`/${locale}`} className="mb-5 flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md bg-[#f45d1f] text-white">
              <ShieldCheck size={21} />
            </span>
            <span className="text-2xl font-semibold">Adclare</span>
          </Link>
          <p className="max-w-sm text-sm leading-6 text-[#59616b]">{t.footerText}</p>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-semibold text-[#20242a]">{t.footerOperator}</h3>
          <div className="grid gap-2 text-sm text-[#59616b]">
            <strong className="text-base text-[#11161c]">{t.operator}</strong>
            <span>{t.companyIds}</span>
            <span>{t.address}</span>
          </div>
        </div>
        <div className="grid gap-3 text-sm text-[#59616b]">
          <div className="flex items-center gap-3">
            <Mail size={17} className="text-[#f45d1f]" />
            <a className="font-medium text-[#25282d] hover:text-[#d94410]" href="mailto:hello@adclare.eu">
              hello@adclare.eu
            </a>
          </div>
          <div className="flex items-center gap-3">
            <LockKeyhole size={17} className="text-[#f45d1f]" />
            <span>{t.footerSecurity}</span>
          </div>
          <div className="flex items-center gap-3">
            <Workflow size={17} className="text-[#f45d1f]" />
            <span>{t.footerWorkflow}</span>
          </div>
          <div className="flex items-center gap-3">
            <Fingerprint size={17} className="text-[#f45d1f]" />
            <span>Regulation (EU) 2024/900</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-black/10 pt-4">
            <Link className="font-medium text-[#25282d] hover:text-[#d94410]" href={`/${locale}/privacy`}>
              {t.legalLinks.privacy}
            </Link>
            <Link className="font-medium text-[#25282d] hover:text-[#d94410]" href={`/${locale}/cookies`}>
              {t.legalLinks.cookies}
            </Link>
            <Link className="font-medium text-[#25282d] hover:text-[#d94410]" href={`/${locale}/terms`}>
              {t.legalLinks.terms}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
