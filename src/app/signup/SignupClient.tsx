"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { TurnstileField, turnstileTokenFromForm } from "@/app/TurnstileField";

type SignupState = "idle" | "saving" | "done" | "error";

export function SignupClient({
  defaultPlan = "large",
  turnstileSiteKey = "",
}: {
  defaultPlan?: "large" | "small";
  turnstileSiteKey?: string;
}) {
  const [organizationName, setOrganizationName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<"large" | "small">(defaultPlan);
  const [state, setState] = useState<SignupState>("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (state === "saving") {
      return;
    }

    setState("saving");
    setError("");

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationName,
          name,
          email,
          plan,
          turnstileToken: turnstileTokenFromForm(form),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Účet se nepodařilo založit.");
      }

      setState("done");
    } catch (signupError) {
      setState("error");
      setError(signupError instanceof Error ? signupError.message : "Účet se nepodařilo založit.");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-800">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={18} />
          Účet je připravený. Přihlašovací odkaz odejde na {email}.
        </div>
        <a className="mt-4 inline-flex rounded-md bg-[#11161c] px-4 py-3 text-white" href={`/login?email=${encodeURIComponent(email)}`}>
          Pokračovat na přihlášení
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <label className="grid gap-2 text-sm font-semibold text-[#20242a]">
        Název strany nebo organizace
        <input
          required
          value={organizationName}
          onChange={(event) => setOrganizationName(event.target.value)}
          placeholder="Např. Město pro lidi"
          className="h-12 rounded-md border border-black/10 bg-white px-3 font-normal text-[#20242a] outline-none transition focus:border-[#f45d1f]"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-[#20242a]">
        Jméno administrátora
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Např. Jana Nováková"
          className="h-12 rounded-md border border-black/10 bg-white px-3 font-normal text-[#20242a] outline-none transition focus:border-[#f45d1f]"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-[#20242a]">
        Pracovní e-mail
        <input
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="jana@strana.cz"
          className="h-12 rounded-md border border-black/10 bg-white px-3 font-normal text-[#20242a] outline-none transition focus:border-[#f45d1f]"
        />
      </label>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold text-[#20242a]">Tarif po zkušebním období</legend>
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-black/10 p-3 text-sm">
          <input type="radio" checked={plan === "large"} onChange={() => setPlan("large")} className="mt-1 size-4 accent-[#f45d1f]" />
          <span>
            <span className="block font-semibold text-[#20242a]">Velká strana</span>
            <span className="text-[#59616b]">Neomezené přístupy, kampaně a reklamy. 999 EUR / rok v akci.</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-black/10 p-3 text-sm">
          <input type="radio" checked={plan === "small"} onChange={() => setPlan("small")} className="mt-1 size-4 accent-[#f45d1f]" />
          <span>
            <span className="block font-semibold text-[#20242a]">Malá strana</span>
            <span className="text-[#59616b]">Jedna volební kampaň ročně, 10 přístupů. 99 EUR / rok.</span>
          </span>
        </label>
      </fieldset>

      <TurnstileField siteKey={turnstileSiteKey} />

      <button
        type="submit"
        disabled={state === "saving" || !organizationName.trim() || !name.trim() || !email.trim()}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#f45d1f] px-4 text-sm font-semibold text-white transition hover:bg-[#d94410] disabled:cursor-not-allowed disabled:bg-[#c9cdd3]"
      >
        {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight size={16} />}
        Spustit 14 dní zdarma
      </button>

      <p className="text-xs leading-5 text-[#68707a]">
        Odesláním se založí zkušební pracovní prostor. Pokračováním potvrzujete souhlas s{" "}
        <Link className="font-semibold text-[#d94410]" href="/cs/terms">obchodními podmínkami</Link>,{" "}
        <Link className="font-semibold text-[#d94410]" href="/cs/privacy">zpracováním osobních údajů</Link> a{" "}
        <Link className="font-semibold text-[#d94410]" href="/cs/dpa">DPA</Link>.
      </p>

      {state === "error" ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}
    </form>
  );
}
