"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { formGuardFromForm, resetTurnstileForm, TurnstileField, turnstileTokenFromForm } from "@/app/TurnstileField";

export function LoginClient({ defaultEmail = "", turnstileSiteKey = "" }: { defaultEmail?: string; turnstileSiteKey?: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "held" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (state === "sending" || !email.trim()) {
      return;
    }

    setState("sending");
    setError("");

    try {
      const response = await fetch("/api/login/request-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          turnstileToken: turnstileTokenFromForm(form),
          adclare_guard: formGuardFromForm(form),
        }),
      });

      if (!response.ok) {
        setError(response.status === 429 ? "Příliš mnoho požadavků. Zkuste to prosím později." : "Odkaz se nepodařilo odeslat. Zkus to znovu nebo požádej administrátora strany.");
        setState("error");
        resetTurnstileForm(form);
        return;
      }
      const payload = await response.json().catch(() => ({})) as { held?: boolean };
      setState(payload.held ? "held" : "sent");
    } catch {
      setState("error");
      setError("Odkaz se nepodařilo odeslat. Zkus to znovu nebo požádej administrátora strany.");
      resetTurnstileForm(form);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <label className="grid gap-2 text-sm font-semibold text-[#20242a]">
        Pracovní e-mail
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="např. jana@strana.cz"
          className="h-12 rounded-md border border-black/10 bg-white px-3 font-normal text-[#20242a] outline-none transition focus:border-[#f45d1f]"
        />
      </label>

      <TurnstileField siteKey={turnstileSiteKey} />

      <button
        type="submit"
        disabled={state === "sending" || !email.trim()}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#f45d1f] px-4 text-sm font-semibold text-white transition hover:bg-[#d94410] disabled:cursor-not-allowed disabled:bg-[#c9cdd3]"
      >
        <Mail size={16} />
        {state === "sending" ? "Odesílám odkaz" : "Poslat přihlašovací odkaz"}
        <ArrowRight size={16} />
      </button>

      {state === "sent" ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          Požadavek jsme přijali. Pokud k e-mailu existuje aktivní přístup a odeslání je dostupné, dorazí přihlašovací odkaz. Platí 15 minut.
        </div>
      ) : null}

      {state === "held" ? <p role="status" className="text-sm text-[#59616b]">Podání jsme uložili ke kontrole. Přihlašovací odkaz zatím nebyl odeslán.</p> : null}

      {state === "error" ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}
    </form>
  );
}
