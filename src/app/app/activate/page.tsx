import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { getAppSession } from "@/lib/app-auth";
import { getUserBillingAccess } from "@/lib/billing-access";
import { ActivateAccountClient } from "./ActivateAccountClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Aktivace účtu | Adclare",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function ActivateAccountPage() {
  const headerStore = await headers();
  const session = await getAppSession(headerStore.get("cookie"));

  if (!session) {
    redirect("/login");
  }

  const billing = await getUserBillingAccess(session.userId, "cs");

  if (!billing) {
    redirect("/login?error=session");
  }

  const trialText =
    billing.trialDaysLeft > 0
      ? `Zkušební přístup běží ještě ${billing.trialDaysLeft} ${billing.trialDaysLeft === 1 ? "den" : billing.trialDaysLeft < 5 ? "dny" : "dní"}.`
      : "Zkušební přístup skončil. Pro pokračování je potřeba aktivovat účet.";

  return (
    <main className="min-h-screen bg-[#f4f6f8] px-4 py-8 text-[#11161c] sm:px-6 lg:px-8">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_420px]">
        <div className="max-w-2xl">
          <Link href="/app" className="inline-flex items-center gap-2 text-sm font-semibold text-[#59616b] transition hover:text-[#d94410]">
            <span className="grid size-8 place-items-center rounded-md bg-[#f45d1f] text-white">
              <ShieldCheck size={18} />
            </span>
            Adclare
          </Link>
          <p className="mt-10 text-sm font-semibold uppercase tracking-[0.08em] text-[#d94410]">Aktivace účtu</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight text-black sm:text-5xl">Pokračujte po 14 dnech zdarma</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[#4c535d]">
            {billing.tenantName} může aplikaci používat 14 dní bez platby. Po skončení zkušebního přístupu zůstanou data uložená, ale pracovní přístupy se uzamknou do aktivace účtu.
          </p>
          {billing.canUseApp ? (
            <Link href="/app" className="mt-7 inline-flex items-center gap-2 rounded-md border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-[#25282d]">
              <ArrowLeft size={16} />
              Zpět do aplikace
            </Link>
          ) : null}
        </div>

        <aside className="rounded-md border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-black">{billing.tenantName}</h2>
          <div className="mt-4 grid gap-2 text-sm">
            <div className="flex justify-between gap-4 rounded-md border border-black/10 p-3">
              <span className="text-[#68707a]">Stav</span>
              <span className="font-semibold text-[#20242a]">{billing.statusLabel}</span>
            </div>
            <div className="flex justify-between gap-4 rounded-md border border-black/10 p-3">
              <span className="text-[#68707a]">Zdarma do</span>
              <span className="font-semibold text-[#20242a]">{billing.trialEndsAt || "-"}</span>
            </div>
            <div className="flex justify-between gap-4 rounded-md border border-black/10 p-3">
              <span className="text-[#68707a]">Cena</span>
              <span className="font-semibold text-[#20242a]">{billing.effectivePrice}</span>
            </div>
          </div>

          <div className={`mt-4 rounded-md border p-3 text-sm font-semibold ${billing.canUseApp ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-orange-200 bg-orange-50 text-orange-800"}`}>
            {trialText}
          </div>

          <div className="mt-5">
            <ActivateAccountClient billing={billing} />
          </div>
        </aside>
      </section>
    </main>
  );
}
