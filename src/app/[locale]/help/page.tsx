import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, CheckCircle2, Database, Mail, Server, ShieldCheck, Workflow } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { notFound } from "next/navigation";

const locales = ["cs", "en"] as const;
type Locale = (typeof locales)[number];

const content = {
  cs: {
    title: "Jak začít s Adclare",
    description: "Jak spustit Adclare, nastavit provoz a připravit první reklamy podle TTPA.",
    back: "Zpět na web",
    eyebrow: "Open source nástroj pro TTPA",
    intro:
      "Adclare pomáhá politickým stranám, kandidátům a agenturám vést reklamy na jednom místě: údaje podle TTPA, soubory, QR kódy, schvalování, veřejné oznámení a auditní export.",
    sections: [
      {
        icon: Server,
        title: "1. Spusťte instalaci",
        text: "Lokálně stačí PostgreSQL z Dockeru a npm. Pro veřejný provoz použijte produkční env šablonu, doménu a HTTPS.",
      },
      {
        icon: Database,
        title: "2. Nastavte provoz",
        text: "Vyplňte databázi, e-mail pro přihlašovací odkazy, Turnstile a úložiště souborů. Před ostrým použitím spusťte preflight.",
      },
      {
        icon: Workflow,
        title: "3. Založte první organizaci",
        text: "V režimu first-run vytvoří první návštěva /signup organizaci a správce. Další lidé se zvou z aplikace.",
      },
      {
        icon: ShieldCheck,
        title: "4. Veďte reklamy přes workflow",
        text: "Každá reklama má povinná pole, soubor, kontrolu chybějících údajů, QR výstupy, schválení, publikaci a auditní stopu.",
      },
      {
        icon: Mail,
        title: "5. Zálohujte a kontrolujte",
        text: "Zálohujte PostgreSQL i nahrané soubory. Auditní exporty obsahují CSV, JSON, manifest a ověření hash řetězce.",
      },
    ],
    commandsTitle: "Rychlý start",
    commandGroups: [
      {
        title: "Lokální vývoj",
        commands: [
          "git clone https://github.com/lukashanes/adclare.eu.git",
          "cd adclare.eu",
          "cp .env.example .env",
          "npm ci",
          "docker compose up -d db",
          "npm run db:migrate",
          "npm run dev",
        ],
      },
      {
        title: "Veřejná instalace",
        commands: [
          "cp production.env.example .env",
          "docker compose up -d --build",
          "npm run launch:preflight",
          "SMOKE_URL=https://vase-domena.example npm run launch:smoke",
        ],
      },
    ],
    docs: "Podrobný setup, proměnné prostředí a kontroly jsou v GitHub dokumentaci.",
    links: [
      { label: "GitHub repository", href: "https://github.com/lukashanes/adclare.eu" },
      { label: "Configuration reference", href: "https://github.com/lukashanes/adclare.eu/blob/main/docs/configuration.md" },
      { label: "Self-hosting guide", href: "https://github.com/lukashanes/adclare.eu/blob/main/docs/self-hosting.md" },
      { label: "Cloudflare setup", href: "https://github.com/lukashanes/adclare.eu/blob/main/docs/cloudflare-setup.md" },
    ],
  },
  en: {
    title: "How to start with Adclare",
    description: "How to run Adclare, configure an instance and prepare the first ads for TTPA.",
    back: "Back to website",
    eyebrow: "Open source TTPA tool",
    intro:
      "Adclare helps political parties, candidates and agencies manage ads in one place: TTPA data, files, QR codes, approvals, public notices and audit exports.",
    sections: [
      {
        icon: Server,
        title: "1. Run the instance",
        text: "For local work, use PostgreSQL from Docker and npm. For a public instance, start with the production env template, a domain and HTTPS.",
      },
      {
        icon: Database,
        title: "2. Configure operations",
        text: "Set database, email for login links, Turnstile and file storage. Run preflight before real use.",
      },
      {
        icon: Workflow,
        title: "3. Create the first organization",
        text: "In first-run mode, the first /signup creates the organization and administrator. More users are invited from the app.",
      },
      {
        icon: ShieldCheck,
        title: "4. Move ads through workflow",
        text: "Each ad has required fields, a file, missing-data checks, QR outputs, approval, publication and audit trail.",
      },
      {
        icon: Mail,
        title: "5. Back up and verify",
        text: "Back up PostgreSQL and uploaded files. Audit exports include CSV, JSON, manifest and hash-chain verification.",
      },
    ],
    commandsTitle: "Quick Start",
    commandGroups: [
      {
        title: "Local development",
        commands: [
          "git clone https://github.com/lukashanes/adclare.eu.git",
          "cd adclare.eu",
          "cp .env.example .env",
          "npm ci",
          "docker compose up -d db",
          "npm run db:migrate",
          "npm run dev",
        ],
      },
      {
        title: "Public instance",
        commands: [
          "cp production.env.example .env",
          "docker compose up -d --build",
          "npm run launch:preflight",
          "SMOKE_URL=https://your-domain.example npm run launch:smoke",
        ],
      },
    ],
    docs: "Detailed setup, environment variables and checks are in the GitHub documentation.",
    links: [
      { label: "GitHub repository", href: "https://github.com/lukashanes/adclare.eu" },
      { label: "Configuration reference", href: "https://github.com/lukashanes/adclare.eu/blob/main/docs/configuration.md" },
      { label: "Self-hosting guide", href: "https://github.com/lukashanes/adclare.eu/blob/main/docs/self-hosting.md" },
      { label: "Cloudflare setup", href: "https://github.com/lukashanes/adclare.eu/blob/main/docs/cloudflare-setup.md" },
    ],
  },
} satisfies Record<Locale, {
  title: string;
  description: string;
  back: string;
  eyebrow: string;
  intro: string;
  sections: Array<{ icon: LucideIcon; title: string; text: string }>;
  commandsTitle: string;
  commandGroups: Array<{ title: string; commands: string[] }>;
  docs: string;
  links: Array<{ label: string; href: string }>;
}>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) {
    return {};
  }
  const t = content[locale as Locale];
  return {
    title: `${t.title} | Adclare`,
    description: t.description,
  };
}

export default async function HelpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) {
    notFound();
  }
  const t = content[locale as Locale];

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[#11161c]">
      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-6 lg:py-14">
        <Link href={`/${locale}`} className="inline-flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#25282d]">
          <ArrowLeft size={15} />
          {t.back}
        </Link>
        <div className="mt-10 rounded-md border border-black/10 bg-white p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-md bg-orange-50 px-3 py-1.5 text-sm font-semibold text-[#d94410]">
            <BookOpen size={15} />
            {t.eyebrow}
          </div>
          <h1 className="mt-5 text-4xl font-semibold leading-tight text-black sm:text-5xl">{t.title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#4c535d]">{t.intro}</p>
        </div>

        <section className="mt-5 grid gap-4">
          {t.sections.map((section) => {
            const Icon = section.icon;
            return (
              <article key={section.title} className="grid gap-4 rounded-md border border-black/10 bg-white p-5 sm:grid-cols-[44px_1fr]">
                <span className="grid size-11 place-items-center rounded-md bg-[#11161c] text-white">
                  <Icon size={20} />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-black">{section.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#59616b]">{section.text}</p>
                </div>
              </article>
            );
          })}
        </section>

        <section className="mt-5 rounded-md border border-black/10 bg-[#11161c] p-5 text-white">
          <div className="flex items-center gap-2 text-sm font-semibold text-orange-200">
            <Server size={15} />
            {t.commandsTitle}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {t.commandGroups.map((group) => (
              <div key={group.title}>
                <h2 className="text-sm font-semibold text-white">{group.title}</h2>
                <pre className="mt-2 overflow-x-auto rounded-md bg-black/35 p-4 text-sm leading-7 text-white">{group.commands.join("\n")}</pre>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-white/75">
            <CheckCircle2 size={16} />
            {t.docs}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {t.links.map((link) => (
              <a key={link.href} href={link.href} className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-white transition hover:border-orange-200 hover:text-orange-100">
                {link.label}
              </a>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
