import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadSource } from "./load-source.mjs";

for (const [locale, kind] of [["cs", "privacy"], ["en", "privacy"], ["cs", "security"], ["en", "security"]]) {
  test(`${locale} ${kind} renders consistent form, attachment and technical retention`, async () => {
    const { LegalPage } = await loadSource("src/app/[locale]/legal-pages.tsx", {
      "next/link": { default: ({ children, ...props }) => createElement("a", props, children) },
      "next/navigation": { notFound: () => { throw new Error("TEST-unexpected-locale"); } },
    });
    const html = renderToStaticMarkup(await LegalPage({ params: Promise.resolve({ locale }), kind }));
    if (locale === "cs") {
      assert.match(html, /včetně jejich příloh/);
      assert.match(html, /3 let od přijetí podání/);
      assert.match(html, /(?:mazány|mažou) do 90 dnů/);
      if (kind === "privacy") assert.match(html, /neobsahuje obsah podání a je smazán do 30 dnů/);
    } else {
      assert.match(html, /including their attachments/);
      assert.match(html, /3 years from receipt of the submission/);
      assert.match(html, /deleted within 90 days/);
      if (kind === "privacy") assert.match(html, /contains no submission content and is deleted within 30 days/);
    }
  });
}
