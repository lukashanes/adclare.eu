"use client";

import Script from "next/script";

const placeholderSiteKeys = new Set(["", "replace_with_cloudflare_turnstile_site_key", "replace_with_turnstile_site_key"]);

export function turnstileTokenFromForm(form: HTMLFormElement) {
  const token = new FormData(form).get("cf-turnstile-response");
  return typeof token === "string" ? token : "";
}

export function TurnstileField({ siteKey = "" }: { siteKey?: string }) {
  if (!siteKey || placeholderSiteKeys.has(siteKey)) {
    return null;
  }

  return (
    <div className="min-h-[65px]">
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
      <div className="cf-turnstile" data-sitekey={siteKey} data-theme="light" />
    </div>
  );
}
