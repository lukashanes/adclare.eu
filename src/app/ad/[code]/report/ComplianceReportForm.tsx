"use client";

import { useState } from "react";
import { TurnstileField, turnstileTokenFromForm } from "@/app/TurnstileField";

export function ComplianceReportForm({ publicToken, turnstileSiteKey }: { publicToken: string; turnstileSiteKey: string }) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (sending) {
      return;
    }

    const form = event.currentTarget;
    const data = new FormData(form);
    setSending(true);
    setMessage("");

    try {
      const response = await fetch(`/api/public/ads/${encodeURIComponent(publicToken)}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporterName: String(data.get("reporterName") ?? ""),
          reporterEmail: String(data.get("reporterEmail") ?? ""),
          reason: String(data.get("reason") ?? ""),
          details: String(data.get("details") ?? ""),
          turnstileToken: turnstileTokenFromForm(form),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Hlášení se nepodařilo odeslat.");
      }

      setSent(true);
      setMessage("Hlášení bylo přijato a je dohledatelné v auditu této reklamy.");
      form.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Hlášení se nepodařilo odeslat.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <label className="grid gap-1.5 text-sm font-semibold text-[#20242a]">
        Důvod
        <select name="reason" required className="rounded-md border border-black/10 bg-white px-3 py-2.5 font-normal outline-none focus:border-[#f45d1f]">
          <option value="">Vyberte důvod</option>
          <option value="incorrect-sponsor">Nesprávný zadavatel nebo plátce</option>
          <option value="incorrect-cost">Nesprávné náklady nebo financování</option>
          <option value="incorrect-targeting">Nesprávné údaje o cílení</option>
          <option value="missing-information">Chybějící informace</option>
          <option value="other">Jiný problém</option>
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-[#20242a]">
        Popis
        <textarea name="details" required minLength={20} maxLength={3000} rows={7} className="rounded-md border border-black/10 bg-white px-3 py-2.5 font-normal outline-none focus:border-[#f45d1f]" />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-[#20242a]">
        Jméno
        <input name="reporterName" required autoComplete="name" className="rounded-md border border-black/10 bg-white px-3 py-2.5 font-normal outline-none focus:border-[#f45d1f]" />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-[#20242a]">
        E-mail
        <input name="reporterEmail" required type="email" autoComplete="email" className="rounded-md border border-black/10 bg-white px-3 py-2.5 font-normal outline-none focus:border-[#f45d1f]" />
      </label>
      <TurnstileField siteKey={turnstileSiteKey} />
      <p className="text-xs leading-5 text-[#68707a]">
        E-mail použijeme pro potvrzení přijetí a informaci o vyřízení. Pokud s vyřízením nesouhlasíte, můžete se obrátit na příslušný dozorový orgán nebo využít jiný dostupný prostředek nápravy.
      </p>
      {message ? (
        <p role="status" className={`rounded-md border p-3 text-sm font-semibold ${sent ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          {message}
        </p>
      ) : null}
      <button type="submit" disabled={sending} className="rounded-md bg-[#11161c] px-4 py-3 text-sm font-semibold text-white disabled:bg-[#aeb4bc]">
        {sending ? "Odesílám" : "Odeslat hlášení"}
      </button>
    </form>
  );
}
