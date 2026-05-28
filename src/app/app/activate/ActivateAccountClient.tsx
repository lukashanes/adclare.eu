"use client";

import { useState } from "react";
import { ArrowRight, CreditCard, FileText, Loader2 } from "lucide-react";
import type { BillingStatusKey } from "@/lib/admin-demo-types";

type BillingAccessView = {
  tenantName: string;
  status: BillingStatusKey;
  statusLabel: string;
  effectivePrice: string;
  trialEndsAt: string;
  trialDaysLeft: number;
  canUseApp: boolean;
  invoicePending: boolean;
  stripeCheckoutConfigured: boolean;
  stripePortalAvailable: boolean;
  canManageBilling: boolean;
};

export function ActivateAccountClient({ billing }: { billing: BillingAccessView }) {
  const [loading, setLoading] = useState<"" | "stripe" | "invoice" | "portal">("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function startCheckout() {
    setLoading("stripe");
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/app/billing/checkout", {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Stripe checkout se nepodařilo otevřít.");
      }

      window.location.href = payload.url;
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Stripe checkout se nepodařilo otevřít.");
      setLoading("");
    }
  }

  async function requestInvoice() {
    setLoading("invoice");
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/app/billing/request-invoice", {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Žádost o fakturu se nepodařilo odeslat.");
      }

      setMessage("Žádost o fakturu je odeslaná. Přístup běží do konce zkušebního období; po schválení faktury se účet aktivuje.");
    } catch (invoiceError) {
      setError(invoiceError instanceof Error ? invoiceError.message : "Žádost o fakturu se nepodařilo odeslat.");
    } finally {
      setLoading("");
    }
  }

  async function openPortal() {
    setLoading("portal");
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/app/billing/portal", {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Správu platby se nepodařilo otevřít.");
      }

      window.location.href = payload.url;
    } catch (portalError) {
      setError(portalError instanceof Error ? portalError.message : "Správu platby se nepodařilo otevřít.");
      setLoading("");
    }
  }

  return (
    <div className="grid gap-3">
      {billing.status !== "ACTIVE" ? (
        <>
          <button
            type="button"
            onClick={startCheckout}
            disabled={loading !== "" || !billing.stripeCheckoutConfigured}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#f45d1f] px-4 text-sm font-semibold text-white transition hover:bg-[#d94410] disabled:cursor-not-allowed disabled:bg-[#c9cdd3]"
          >
            {loading === "stripe" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight size={16} />}
            Zaplatit kartou
          </button>

          <button
            type="button"
            onClick={requestInvoice}
            disabled={loading !== ""}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-4 text-sm font-semibold text-[#25282d] transition hover:border-[#f45d1f]"
          >
            {loading === "invoice" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText size={16} />}
            Požádat o platbu na fakturu
          </button>
        </>
      ) : null}

      {billing.stripePortalAvailable ? (
        <button
          type="button"
          onClick={openPortal}
          disabled={loading !== ""}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-4 text-sm font-semibold text-[#25282d] transition hover:border-[#f45d1f]"
        >
          {loading === "portal" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard size={16} />}
          Spravovat platbu
        </button>
      ) : null}

      {billing.status !== "ACTIVE" && !billing.stripeCheckoutConfigured ? (
        <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm font-semibold text-orange-800">
          Platba kartou teď není dostupná. Zvolte platbu na fakturu nebo kontaktujte podporu.
        </div>
      ) : null}

      {billing.invoicePending ? (
        <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm font-semibold text-sky-800">
          Fakturace čeká na ruční schválení.
        </div>
      ) : null}

      {message ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</div> : null}
      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div> : null}
    </div>
  );
}
