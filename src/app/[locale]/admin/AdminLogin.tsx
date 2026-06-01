"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import type { Locale } from "@/lib/admin-demo-types";

const content = {
  cs: {
    back: "Zpět na web",
    eyebrow: "Chráněný přístup",
    title: "Admin Adclare",
    intro: "Přístup je uzamčený. Po přihlášení lze spravovat reklamy, QR balíčky, schvalování a auditní podklady.",
    password: "Heslo administrátora",
    submit: "Přihlásit",
    submitting: "Ověřuji",
    invalid: "Heslo není správné.",
    locked: "Příliš mnoho pokusů. Zkus to za chvíli znovu.",
    missing: "Admin přístup není nastavený v produkční konfiguraci.",
    generic: "Přihlášení se nepodařilo. Zkus to znovu.",
  },
  en: {
    back: "Back to website",
    eyebrow: "Protected access",
    title: "Adclare Admin",
    intro: "Access is locked. After login, ads, QR packages, approvals and audit evidence can be managed here.",
    password: "Admin password",
    submit: "Sign in",
    submitting: "Checking",
    invalid: "The password is not correct.",
    locked: "Too many attempts. Try again in a moment.",
    missing: "Admin access is not configured in production.",
    generic: "Sign in failed. Try again.",
  },
} as const;

export function AdminLogin({ locale, configured }: { locale: Locale; configured: boolean }) {
  const t = content[locale];
  const [password, setPassword] = useState("");
  const [error, setError] = useState(configured ? "" : t.missing);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!password || submitting || !configured) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        window.location.reload();
        return;
      }

      if (response.status === 401) {
        setError(t.invalid);
      } else if (response.status === 429) {
        setError(t.locked);
      } else if (response.status === 503) {
        setError(t.missing);
      } else {
        setError(t.generic);
      }
    } catch {
      setError(t.generic);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[#11161c]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid w-full overflow-hidden rounded-md border border-black/10 bg-white shadow-sm lg:grid-cols-[0.95fr_1.05fr]">
          <div className="bg-[#11161c] p-7 text-white sm:p-10">
            <Link href={`/${locale}`} className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition hover:text-white">
              <ArrowLeft size={16} />
              {t.back}
            </Link>
            <div className="mt-16 max-w-md">
              <span className="grid size-11 place-items-center rounded-md bg-[#f45d1f] text-white">
                <ShieldCheck size={23} />
              </span>
              <div className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-white/55">{t.eyebrow}</div>
              <h1 className="mt-3 text-4xl font-semibold tracking-normal text-white sm:text-5xl">{t.title}</h1>
              <p className="mt-5 text-base leading-7 text-white/68">{t.intro}</p>
            </div>
          </div>

          <form onSubmit={submit} className="grid content-center gap-5 p-7 sm:p-10">
            <label className="grid gap-2 text-sm font-semibold text-[#20242a]">
              {t.password}
              <span className="flex items-center gap-3 rounded-md border border-black/10 bg-white px-3 py-3 focus-within:border-[#f45d1f]">
                <LockKeyhole size={18} className="text-[#68707a]" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  disabled={!configured}
                  className="min-w-0 flex-1 bg-transparent text-base font-normal text-[#11161c] outline-none disabled:text-[#8b929b]"
                />
              </span>
            </label>

            {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}

            <button
              type="submit"
              disabled={!password || submitting || !configured}
              className="inline-flex items-center justify-center rounded-md bg-[#f45d1f] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#d94410] disabled:cursor-not-allowed disabled:bg-[#c9cdd3]"
            >
              {submitting ? t.submitting : t.submit}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
