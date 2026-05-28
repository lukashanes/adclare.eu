import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { publicTurnstileSiteKey } from "@/lib/turnstile";
import { SignupClient } from "./SignupClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Začít 14 dní zdarma | Adclare",
  description: "Založení pracovního účtu Adclare se zkušebním přístupem na 14 dní zdarma.",
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const defaultPlan = firstValue(query.plan) === "small" ? "small" : "large";

  return (
    <main className="min-h-screen bg-[#f4f6f8] px-4 py-8 text-[#11161c] sm:px-6 lg:px-8">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_460px]">
        <div className="max-w-2xl">
          <Link href="/cs" className="inline-flex items-center gap-2 text-sm font-semibold text-[#59616b] transition hover:text-[#d94410]">
            <span className="grid size-8 place-items-center rounded-md bg-[#f45d1f] text-white">
              <ShieldCheck size={18} />
            </span>
            Adclare
          </Link>
          <p className="mt-10 text-sm font-semibold uppercase tracking-[0.08em] text-[#d94410]">14 dní zdarma</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight text-black sm:text-5xl">Založte pracovní prostor pro politickou reklamu</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[#4c535d]">
            Vytvoří se účet strany, první administrátor, výchozí centrála a kampaň. Hned potom můžete přidat pobočky, pozvat týmy a začít doplňovat reklamy před zveřejněním.
          </p>
          <Link href="/cs#pricing" className="mt-7 inline-flex items-center gap-2 rounded-md border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-[#25282d]">
            <ArrowLeft size={16} />
            Zpět na ceny
          </Link>
        </div>

        <aside className="rounded-md border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-black">Spustit přístup</h2>
          <p className="mt-2 text-sm leading-6 text-[#59616b]">
            Bez platby na začátku. Po 14 dnech účet pokračuje přes Stripe nebo platbu na fakturu po schválení.
          </p>
          <div className="mt-6">
            <SignupClient defaultPlan={defaultPlan} turnstileSiteKey={publicTurnstileSiteKey()} />
          </div>
        </aside>
      </section>
    </main>
  );
}
