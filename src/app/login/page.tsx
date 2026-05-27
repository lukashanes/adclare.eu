import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { LoginClient } from "./LoginClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Přihlášení do Adclare",
  description: "Přihlášení uživatele do pracovní aplikace Adclare.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const error = firstValue(query.error);
  const email = firstValue(query.email);

  return (
    <main className="min-h-screen bg-[#f4f6f8] px-4 py-8 text-[#11161c] sm:px-6 lg:px-8">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_420px]">
        <div className="max-w-2xl">
          <Link href="/cs" className="inline-flex items-center gap-2 text-sm font-semibold text-[#59616b] transition hover:text-[#d94410]">
            <span className="grid size-8 place-items-center rounded-md bg-[#f45d1f] text-white">
              <ShieldCheck size={18} />
            </span>
            Adclare
          </Link>
          <p className="mt-10 text-sm font-semibold uppercase tracking-[0.08em] text-[#d94410]">Pracovní přístup</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight text-black sm:text-5xl">Přihlášení pro strany, pobočky a externí týmy</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[#4c535d]">
            Přístup se posílá na e-mail pozvaného uživatele. Každý po přihlášení vidí jen organizaci, pobočku a reklamy, které má řešit.
          </p>
        </div>

        <aside className="rounded-md border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-black">Přihlásit se</h2>
          <p className="mt-2 text-sm leading-6 text-[#59616b]">Zadejte e-mail, na který vám přišla pozvánka do Adclare.</p>
          <div className="mt-6">
            <LoginClient defaultEmail={email} />
          </div>
          {error === "invalid" ? (
            <div className="mt-4 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm font-semibold text-orange-800">
              Přihlašovací odkaz je neplatný nebo expiroval. Vyžádejte si nový.
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
