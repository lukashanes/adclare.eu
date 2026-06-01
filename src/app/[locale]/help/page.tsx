import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, CheckCircle2, Database, Mail, Server, ShieldCheck, Workflow } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { notFound } from "next/navigation";

const locales = ["cs", "en"] as const;
type Locale = (typeof locales)[number];

const content = {
  cs: {
    title: "Nápověda k nasazení Adclare",
    description: "Jak stáhnout, spustit a nastavit open source Adclare pro evidenci politické reklamy podle TTPA.",
    back: "Zpět na web",
    eyebrow: "Self-hosted open source",
    intro:
      "Adclare je software pod licencí EUPL-1.2 pro evidenci politických reklam, QR označení, transparentní oznámení, schvalování a auditní exporty podle Nařízení EU o transparentnosti a cílení politické reklamy (TTPA), Regulation (EU) 2024/900.",
    sections: [
      {
        icon: Server,
        title: "1. Stažení a spuštění",
        text: "Repozitář naklonujte z GitHubu, vyplňte proměnné prostředí a spusťte aplikaci přes Docker Compose. Lokálně stačí PostgreSQL, Node.js a objektové úložiště kompatibilní se S3 pro soubory reklam.",
      },
      {
        icon: Database,
        title: "2. První organizace",
        text: "Po spuštění založte pracovní prostor strany nebo organizace. Vytvoří se první administrátor, centrála a výchozí kampaň, od které lze navázat vlastní pobočky, regiony a týmy.",
      },
      {
        icon: Workflow,
        title: "3. Workflow reklam",
        text: "Každá reklama prochází evidencí, validací povinných údajů, vytvořením transparentního oznámení, QR balíčkem, kontrolou, publikací a auditním exportem.",
      },
      {
        icon: ShieldCheck,
        title: "4. Bezpečnost",
        text: "Přístupy se řídí rolemi a členstvím v organizaci. Produkční instalaci provozujte za HTTPS, se zálohami databáze, zabezpečeným úložištěm souborů a oddělenými tajnými klíči.",
      },
      {
        icon: Mail,
        title: "5. Podpora",
        text: "Pokud chcete hosting, implementaci, úpravy na míru nebo provozní podporu od týmu Adclare, napište na support@adclare.eu.",
      },
    ],
    commandsTitle: "Rychlý start",
    commands: ["git clone https://github.com/lukashanes/adclare.eu.git", "cp .env.example .env", "docker compose up --build"],
    docs: "Více detailů je v README a složce docs v repozitáři.",
  },
  en: {
    title: "Adclare Deployment Help",
    description: "How to download, run and configure open source Adclare for TTPA political advertising records.",
    back: "Back to website",
    eyebrow: "Self-hosted open source",
    intro:
      "Adclare is EUPL-1.2 licensed software for political ad records, QR labels, transparency notices, approvals and audit exports under the EU Regulation on transparency and targeting of political advertising (TTPA), Regulation (EU) 2024/900.",
    sections: [
      {
        icon: Server,
        title: "1. Download and run",
        text: "Clone the GitHub repository, fill environment variables and run the application with Docker Compose. Local development needs PostgreSQL, Node.js and S3-compatible object storage for ad files.",
      },
      {
        icon: Database,
        title: "2. First organization",
        text: "Create the party or organization workspace after launch. Adclare creates the first administrator, headquarters and initial campaign, then you can add branches, regions and teams.",
      },
      {
        icon: Workflow,
        title: "3. Ad workflow",
        text: "Each ad moves through records, required data validation, transparency notice creation, QR package, review, publication and audit export.",
      },
      {
        icon: ShieldCheck,
        title: "4. Security",
        text: "Access is controlled by roles and organization membership. Run production behind HTTPS, with database backups, secured file storage and separated secrets.",
      },
      {
        icon: Mail,
        title: "5. Support",
        text: "For hosting, implementation, custom changes or operational support from the Adclare team, contact support@adclare.eu.",
      },
    ],
    commandsTitle: "Quick Start",
    commands: ["git clone https://github.com/lukashanes/adclare.eu.git", "cp .env.example .env", "docker compose up --build"],
    docs: "More details are in README and the docs folder in the repository.",
  },
} satisfies Record<Locale, {
  title: string;
  description: string;
  back: string;
  eyebrow: string;
  intro: string;
  sections: Array<{ icon: LucideIcon; title: string; text: string }>;
  commandsTitle: string;
  commands: string[];
  docs: string;
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
          <pre className="mt-4 overflow-x-auto rounded-md bg-black/35 p-4 text-sm leading-7 text-white">{t.commands.join("\n")}</pre>
          <p className="mt-4 flex items-center gap-2 text-sm text-white/75">
            <CheckCircle2 size={16} />
            {t.docs}
          </p>
        </section>
      </section>
    </main>
  );
}
