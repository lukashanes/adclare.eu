import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getInvitationNotice } from "@/lib/workspace-db";
import { publicTurnstileSiteKey } from "@/lib/turnstile";
import { InviteAcceptClient } from "./InviteAcceptClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{
    token: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const invitation = await getInvitationNotice(token, "cs");

  if (!invitation) {
    return {
      title: "Pozvánka nenalezena",
    };
  }

  return {
    title: `Pozvánka do ${invitation.tenant}`,
    description: `Pozvánka k přístupu do Adclare pro ${invitation.email}.`,
    robots: {
      index: false,
      follow: false,
      nocache: true,
    },
  };
}

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;
  const invitation = await getInvitationNotice(token, "cs");

  if (!invitation) {
    notFound();
  }

  const rows = [
    ["Organizace", invitation.tenant],
    ["E-mail", invitation.email],
    ["Role", invitation.role],
    ["Rozsah", invitation.scope],
    ["Platnost do", invitation.expiresAt],
  ];

  return (
    <main className="min-h-screen bg-[#f4f6f8] px-4 py-8 text-[#11161c] sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl overflow-hidden rounded-md border border-black/10 bg-white">
        <div className="border-b border-black/10 bg-[#11161c] p-6 text-white sm:p-8">
          <Link href="/cs" className="text-sm font-semibold text-white/70 transition hover:text-white">
            Adclare
          </Link>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.08em] text-[#ffb199]">Pozvánka do administrace</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">Přístup pro {invitation.email}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/72">
            Přijetím pozvánky se uživatel přidá do organizace s uvedenou rolí a rozsahem.
          </p>
        </div>

        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_300px]">
          <div className="grid divide-y divide-black/8 rounded-md border border-black/10">
            {rows.map(([label, value]) => (
              <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[130px_1fr] sm:gap-4">
                <dt className="text-sm font-medium text-[#68707a]">{label}</dt>
                <dd className="break-words text-sm font-semibold text-[#20242a]">{value}</dd>
              </div>
            ))}
          </div>

          <aside className="rounded-md border border-black/10 bg-[#fbfbfc] p-5">
            <div className="mb-4 text-sm font-semibold text-[#68707a]">Přijetí pozvánky</div>
            <InviteAcceptClient invitation={invitation} turnstileSiteKey={publicTurnstileSiteKey()} />
          </aside>
        </div>
      </section>
    </main>
  );
}
