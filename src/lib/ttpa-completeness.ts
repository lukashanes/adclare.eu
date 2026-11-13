import type { EditableAdInput, Locale } from "@/lib/workspace-types";

export type TtpaCampaignData = {
  election: string;
  electionLevel: string;
  electionDate: string;
  officialInformationUrl: string;
  aggregatedAmount: string;
  benefitsInKind: string;
  currency: string;
  calculationMethod: string;
};

function hasValue(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export function requiresTargetingDetails(input: Pick<EditableAdInput, "isTargeted" | "targeting" | "targetAudience">) {
  const targeting = input.targeting
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  const noTargetingValues = new Set(["", "nepouzito", "not used", "ne", "no", "false", "0", "bez cileni", "netargetovano", "zadne"]);

  return input.isTargeted || !noTargetingValues.has(targeting);
}

export function ttpaMissingItems(input: EditableAdInput, campaign: TtpaCampaignData | null | undefined, locale: Locale) {
  const cs = locale === "cs";
  const missing: string[] = [];
  const required: Array<[keyof EditableAdInput, string, string]> = [
    ["title", "název materiálu", "asset title"],
    ["owner", "zadavatel", "sponsor"],
    ["ownerEmail", "e-mail zadavatele", "sponsor email"],
    ["ownerPostalAddress", "poštovní adresa zadavatele", "sponsor postal address"],
    ["ownerEntityType", "typ zadavatele", "sponsor entity type"],
    ["type", "typ reklamy", "ad type"],
    ["publicationDate", "datum zveřejnění", "publication date"],
    ["disseminationStartsAt", "začátek šíření", "dissemination start"],
    ["disseminationEndsAt", "konec šíření", "dissemination end"],
    ["distributionArea", "oblast šíření", "distribution area"],
    ["payer", "plátce", "payer"],
    ["payerEmail", "e-mail plátce", "payer email"],
    ["payerPostalAddress", "poštovní adresa plátce", "payer postal address"],
    ["payerEntityType", "typ plátce", "payer entity type"],
    ["amount", "částka za reklamu", "ad amount"],
    ["benefitsInKind", "nepeněžní plnění za reklamu", "ad in-kind benefits"],
    ["currency", "měna", "currency"],
    ["fundingSource", "popis původu financí", "funding source"],
    ["fundingOrigin", "veřejný nebo soukromý původ financí", "public or private funding origin"],
    ["fundingJurisdiction", "původ financí v EU nebo mimo EU", "EU or non-EU funding origin"],
    ["calculationMethod", "metodika výpočtu nákladů", "cost calculation method"],
    ["language", "jazyk", "language"],
  ];

  for (const [key, csLabel, enLabel] of required) {
    if (!hasValue(String(input[key] ?? ""))) {
      missing.push(cs ? csLabel : enLabel);
    }
  }

  if (input.ownerEntityType === "legal" && !hasValue(input.ownerEstablishmentAddress)) {
    missing.push(cs ? "sídlo zadavatele" : "sponsor place of establishment");
  }

  if (hasValue(input.controllerName)) {
    const controllerFields: Array<[keyof EditableAdInput, string, string]> = [
      ["controllerEmail", "e-mail ovládajícího subjektu", "controlling entity email"],
      ["controllerPostalAddress", "poštovní adresa ovládajícího subjektu", "controlling entity postal address"],
      ["controllerEntityType", "typ ovládajícího subjektu", "controlling entity type"],
    ];

    for (const [key, csLabel, enLabel] of controllerFields) {
      if (!hasValue(String(input[key] ?? ""))) {
        missing.push(cs ? csLabel : enLabel);
      }
    }

    if (input.controllerEntityType === "legal" && !hasValue(input.controllerEstablishmentAddress)) {
      missing.push(cs ? "sídlo ovládajícího subjektu" : "controlling entity place of establishment");
    }
  }

  if (input.payerEntityType === "legal" && !hasValue(input.payerEstablishmentAddress)) {
    missing.push(cs ? "sídlo plátce" : "payer place of establishment");
  }

  if (input.republishedAfterInfringement && !hasValue(input.infringementDetails)) {
    missing.push(cs ? "informace o předchozím pozastavení" : "previous suspension details");
  }

  if (requiresTargetingDetails(input)) {
    const targetingFields: Array<[keyof EditableAdInput, string, string]> = [
      ["targeting", "použité techniky cílení", "targeting techniques"],
      ["targetAudience", "cílové publikum", "target audience"],
    ];

    for (const [key, csLabel, enLabel] of targetingFields) {
      if (!hasValue(String(input[key] ?? ""))) {
        missing.push(cs ? csLabel : enLabel);
      }
    }
  }

  if (input.usesPersonalData) {
    const personalDataFields: Array<[keyof EditableAdInput, string, string]> = [
      ["targetingDataCategories", "kategorie osobních údajů", "personal data categories"],
      ["targetingLogic", "logika cílení", "targeting logic"],
      ["targetingAiUse", "informace o použití AI", "AI use information"],
      ["targetingPolicyUrl", "interní pravidla cílení", "targeting policy link"],
      ["dataController", "správce osobních údajů", "data controller"],
      ["consentWithdrawUrl", "odkaz pro odvolání souhlasu", "consent withdrawal link"],
      ["dataRightsUrl", "odkaz pro uplatnění práv", "data rights link"],
      ["privacyInformationUrl", "informace o zpracování údajů", "privacy information link"],
    ];

    for (const [key, csLabel, enLabel] of personalDataFields) {
      if (!hasValue(String(input[key] ?? ""))) {
        missing.push(cs ? csLabel : enLabel);
      }
    }
  }

  const campaignFields: Array<[keyof TtpaCampaignData, string, string]> = [
    ["election", "volby nebo politický proces", "linked election or political process"],
    ["electionLevel", "úroveň voleb nebo procesu", "election or process level"],
    ["electionDate", "datum voleb nebo procesu", "election or process date"],
    ["officialInformationUrl", "oficiální odkaz k volbám", "official election information link"],
    ["aggregatedAmount", "souhrnné náklady kampaně", "campaign aggregated amount"],
    ["benefitsInKind", "nepeněžní plnění kampaně", "campaign in-kind benefits"],
    ["currency", "měna kampaně", "campaign currency"],
    ["calculationMethod", "metodika výpočtu kampaně", "campaign calculation method"],
  ];

  for (const [key, csLabel, enLabel] of campaignFields) {
    if (!hasValue(campaign?.[key])) {
      missing.push(cs ? csLabel : enLabel);
    }
  }

  return [...new Set(missing)];
}
