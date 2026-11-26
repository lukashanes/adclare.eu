"use client";

import Script from "next/script";

const placeholderSiteKeys = new Set(["", "replace_with_cloudflare_turnstile_site_key", "replace_with_turnstile_site_key"]);

export function turnstileTokenFromForm(form: HTMLFormElement) {
  const token = new FormData(form).get("cf-turnstile-response");
  return typeof token === "string" ? token : "";
}

export function formGuardFromForm(form: HTMLFormElement) {
  const value = new FormData(form).get("adclare_guard");
  return typeof value === "string" ? value : "";
}

export function resetTurnstileForm(form: HTMLFormElement) {
  const widget = form.querySelector<HTMLElement>(".cf-turnstile");
  const api = (window as Window & { turnstile?: { reset: (container: HTMLElement) => void } }).turnstile;
  if (!widget || !api) return;
  try {
    api.reset(widget);
  } catch {
    // The asynchronous script may not have initialized this widget yet.
  }
}

export function TurnstileField({ siteKey = "" }: { siteKey?: string }) {
  return (
    <>
      <div hidden aria-hidden="true">
        <label>Kontrolní pole<input type="text" name="adclare_guard" autoComplete="off" tabIndex={-1} /></label>
      </div>
      {siteKey && !placeholderSiteKeys.has(siteKey) ? (
        <div className="min-h-[65px]">
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
          <div className="cf-turnstile" data-sitekey={siteKey} data-theme="light" />
        </div>
      ) : null}
    </>
  );
}
