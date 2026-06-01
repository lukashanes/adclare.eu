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
    description: "Jak spustit Adclare a připravit první reklamy podle TTPA.",
    back: "Zpět na web",
    eyebrow: "Open source",
    intro:
      "Adclare pomůže dát politické reklamy, QR kódy, schvalování a podklady pro kontrolu na jedno místo. Cílem je méně ruční práce a jasný proces podle TTPA.",
    sections: [
      {
        icon: Server,
        title: "1. Spusťte aplikaci",
        text: "Stáhněte kód z GitHubu, vyplňte nastavení podle README a spusťte aplikaci. Technické detaily jsou v dokumentaci v repozitáři.",
      },
      {
        icon: Database,
        title: "2. První organizace",
        text: "Založte pracovní prostor strany nebo organizace. Vytvoří se první administrátor, centrála a výchozí kampaň.",
      },
      {
        icon: Workflow,
        title: "3. Proces reklam",
        text: "Každá reklama projde evidencí, kontrolou povinných údajů, QR kódem, veřejným oznámením, schválením a exportem pro audit.",
      },
      {
        icon: ShieldCheck,
        title: "4. Bezpečnost",
        text: "Přístupy se řídí rolemi a členstvím v organizaci. V provozu používejte HTTPS, zálohy databáze a zabezpečené úložiště souborů.",
      },
      {
        icon: Mail,
        title: "5. Podpora",
        text: "Pokud chcete rychlejší start, migraci dat, školení nebo úpravy pro vlastní tým, napište na support@adclare.eu.",
      },
    ],
    commandsTitle: "Rychlý start",
    commands: ["git clone https://github.com/lukashanes/adclare.eu.git", "cp .env.example .env", "docker compose up --build"],
    docs: "Technické detaily jsou v README a složce docs v repozitáři.",
  },
  en: {
    title: "How to start with Adclare",
    description: "How to run Adclare and prepare the first ads for TTPA.",
    back: "Back to website",
    eyebrow: "Open source",
    intro:
      "Adclare brings political ad records, QR codes, approvals and audit files into one place. The goal is less manual work and a clear process for TTPA.",
    sections: [
      {
        icon: Server,
        title: "1. Run the app",
        text: "Download the code from GitHub, fill the settings from README and start the application. Technical details live in the repository docs.",
      },
      {
        icon: Database,
        title: "2. First organization",
        text: "Create the party or organization workspace. Adclare creates the first administrator, headquarters and initial campaign.",
      },
      {
        icon: Workflow,
        title: "3. Ad process",
        text: "Each ad moves through records, required data checks, QR code, public notice, approval and audit export.",
      },
      {
        icon: ShieldCheck,
        title: "4. Security",
        text: "Access is controlled by roles and organization membership. In production, use HTTPS, database backups and secure file storage.",
      },
      {
        icon: Mail,
        title: "5. Support",
        text: "For a faster start, data migration, training or changes for your team, contact support@adclare.eu.",
      },
    ],
    commandsTitle: "Quick Start",
    commands: ["git clone https://github.com/lukashanes/adclare.eu.git", "cp .env.example .env", "docker compose up --build"],
    docs: "Technical details are in README and the docs folder in the repository.",
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
