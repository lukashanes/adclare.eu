"use client";

import { Save, X } from "lucide-react";
import { requiresTargetingDetails, ttpaMissingItems, type TtpaCampaignData } from "@/lib/ttpa-completeness";
import type { AdRecord, AppWorkspacePayload, EditableAdInput } from "@/lib/workspace-types";

type EditorMode = "create" | "edit";

type AdProcessStep = {
  key: string;
  title: string;
  text: string;
  nextAction: string;
  done: boolean;
};

function hasValue(value: string) {
  return value.trim().length > 0;
}

function campaignTtpaData(campaign: AppWorkspacePayload["campaigns"][number] | undefined): TtpaCampaignData | null {
  if (!campaign) {
    return null;
  }

  return {
    election: campaign.election,
    electionLevel: campaign.electionLevel,
    electionDate: campaign.electionDateIso,
    officialInformationUrl: campaign.officialInformationUrl,
    aggregatedAmount: campaign.aggregatedAmount,
    benefitsInKind: campaign.benefitsInKind,
    currency: campaign.currency,
    calculationMethod: campaign.calculationMethod,
  };
}

function draftMissingItems(form: EditableAdInput, campaign: AppWorkspacePayload["campaigns"][number] | undefined) {
  const missing = ttpaMissingItems(form, campaignTtpaData(campaign), "cs");

  if (!hasValue(form.campaignId ?? "")) {
    missing.unshift("kampaň");
  }

  if (!hasValue(form.branch)) {
    missing.unshift("pobočka / oblast");
  }

  return [...new Set(missing)];
}

function draftProcessSteps(form: EditableAdInput, ad: AdRecord | null, campaign: AppWorkspacePayload["campaigns"][number] | undefined): AdProcessStep[] {
  const coreReady = hasValue(form.title) && hasValue(form.branch) && hasValue(form.campaignId ?? "");
  const assetReady = (ad?.assetCount ?? 0) > 0;
  const identityReady =
    hasValue(form.owner) &&
    hasValue(form.ownerEmail) &&
    hasValue(form.ownerPostalAddress) &&
    hasValue(form.ownerEntityType) &&
    hasValue(form.payer) &&
    hasValue(form.payerEmail) &&
    hasValue(form.payerPostalAddress) &&
    hasValue(form.payerEntityType);
  const moneyReady =
    hasValue(form.amount) &&
    hasValue(form.benefitsInKind) &&
    hasValue(form.currency) &&
    hasValue(form.fundingSource) &&
    hasValue(form.fundingOrigin) &&
    hasValue(form.fundingJurisdiction) &&
    hasValue(form.calculationMethod) &&
    Boolean(campaign?.aggregatedAmount && campaign.benefitsInKind && campaign.currency && campaign.calculationMethod);
  const publicationReady =
    hasValue(form.type) &&
    hasValue(form.publicationDate) &&
    hasValue(form.disseminationStartsAt) &&
    hasValue(form.disseminationEndsAt) &&
    hasValue(form.distributionArea) &&
    Boolean(campaign?.election && campaign.electionLevel && campaign.electionDateIso && campaign.officialInformationUrl);
  const targetingNeeded = requiresTargetingDetails(form);
  const targetingReady = targetingNeeded ? hasValue(form.targeting) && hasValue(form.targetAudience) : true;
  const targetingPersonalDataReady = !form.usesPersonalData ||
    [
      form.targetingDataCategories,
      form.targetingLogic,
      form.targetingAiUse,
      form.targetingPolicyUrl,
      form.dataController,
      form.consentWithdrawUrl,
      form.dataRightsUrl,
      form.privacyInformationUrl,
    ].every(hasValue);
  const readyForReview = draftMissingItems(form, campaign).length === 0 && assetReady;
  const approved = ad?.workflowStatus === "APPROVED" || ad?.workflowStatus === "PUBLISHED";
  const published = ad?.workflowStatus === "PUBLISHED";

  return [
    {
      key: "record",
      title: "1. Záznam reklamy",
      text: coreReady ? "Název, kampaň a pobočka jsou vyplněné." : "Založte reklamu v kampani a pobočce.",
      nextAction: "Doplňte název, kampaň a pobočku.",
      done: coreReady,
    },
    {
      key: "asset",
      title: "2. Podklad",
      text: assetReady ? `${ad?.assetCount ?? 0} souborů je u reklamy.` : "Podklad nahrajete v detailu po uložení záznamu.",
      nextAction: "Uložte záznam a nahrajte podklad v detailu reklamy.",
      done: assetReady,
    },
    {
      key: "identity",
      title: "3. Zadavatel a plátce",
      text: identityReady ? "Zadavatel a plátce mají identifikační a kontaktní údaje." : "Musí být jasné, kdo reklamu zadal a kdo ji platí.",
      nextAction: "Doplňte identitu, kontakt a adresu zadavatele a plátce.",
      done: identityReady,
    },
    {
      key: "money",
      title: "4. Náklady a financování",
      text: moneyReady ? "Částky, měna, původ financí a metodika jsou vyplněné." : "Doplňte náklady reklamy i kampaně a způsob jejich výpočtu.",
      nextAction: "Doplňte částky, měnu, původ financí a metodiku.",
      done: moneyReady,
    },
    {
      key: "publication",
      title: "5. Zveřejnění",
      text: publicationReady ? "Termín, oblast a vazba na volby jsou vyplněné." : "Datum zveřejnění určuje, kdy už nesmí chybět povinné údaje.",
      nextAction: "Doplňte začátek, konec, oblast a údaje o volbách.",
      done: publicationReady,
    },
    {
      key: "targeting",
      title: "6. Cílení",
      text: targetingReady ? (targetingNeeded ? "Cílení a publikum jsou popsané." : "Reklama není vedená jako cílená.") : "U cílené reklamy chybí popis cílení nebo publikum.",
      nextAction: "Doplňte cílení a cílové publikum, nebo cílení vypněte.",
      done: targetingReady && targetingPersonalDataReady,
    },
    {
      key: "approval",
      title: "7. Kontrola",
      text: approved ? "Reklama prošla kontrolou." : readyForReview ? "Po uložení může reklama do kontroly." : "Kontrola čeká na kompletní údaje a podklad.",
      nextAction: readyForReview ? "Uložte záznam a pokračujte ke kontrole." : "Doplňte chybějící údaje a podklad.",
      done: approved,
    },
    {
      key: "ttpa",
      title: "8. Hotovo pro TTPA",
      text: published ? "Reklama má úplné oznámení, předepsané označení, QR kód a auditní balíček." : "Výsledek vznikne po doplnění všech údajů, kontrole a publikaci.",
      nextAction: "Dokončete kontrolu, označení, QR kód a balíček pro kontrolu.",
      done: published,
    },
  ];
}

export function Editor({
  ad,
  form,
  mode,
  branches,
  campaigns,
  candidates,
  saving,
  writable,
  onCancel,
  onChange,
  onSave,
}: {
  ad: AdRecord | null;
  form: EditableAdInput;
  mode: EditorMode;
  branches: AppWorkspacePayload["branches"];
  campaigns: AppWorkspacePayload["campaigns"];
  candidates: AppWorkspacePayload["candidates"];
  saving: boolean;
  writable: boolean;
  onCancel: () => void;
  onChange: (form: EditableAdInput) => void;
  onSave: () => void;
}) {
  const selectedCampaign = campaigns.find((campaign) => campaign.id === form.campaignId);
  const targetingRequired = requiresTargetingDetails(form);
  const missingItems = draftMissingItems(form, selectedCampaign);
  const draftSteps = draftProcessSteps(form, ad, selectedCampaign);
  const canSaveDraft = writable && hasValue(form.title) && hasValue(form.branch) && hasValue(form.campaignId ?? "");
  const requiredFields = new Set<keyof EditableAdInput>([
    "campaignId",
    "title",
    "branch",
    "owner",
    "ownerEmail",
    "ownerPostalAddress",
    "ownerEntityType",
    "type",
    "publicationDate",
    "disseminationStartsAt",
    "disseminationEndsAt",
    "distributionArea",
    "payer",
    "payerEmail",
    "payerPostalAddress",
    "payerEntityType",
    "amount",
    "benefitsInKind",
    "currency",
    "fundingSource",
    "fundingOrigin",
    "fundingJurisdiction",
    "calculationMethod",
    "language",
  ]);
  const fieldGroups = [
    {
      title: "Materiál",
      fields: [
        ["campaignId", "Kampaň", "campaign"],
        ["candidateId", "Kandidát", "candidate"],
        ["title", "Název reklamy", "text"],
        ["branch", "Pobočka / oblast", "branch"],
        ["type", "Typ materiálu", "text"],
        ["publicationDate", "Datum zveřejnění", "date"],
        ["disseminationStartsAt", "Začátek šíření", "date"],
        ["disseminationEndsAt", "Konec šíření", "date"],
        ["period", "Poznámka k období", "text"],
        ["language", "Jazyk", "text"],
      ],
    },
    {
      title: "Zadavatel",
      fields: [
        ["owner", "Zadavatel", "text"],
        ["ownerEntityType", "Typ zadavatele", "entityType"],
        ["ownerEmail", "E-mail zadavatele", "email"],
        ["ownerPostalAddress", "Poštovní adresa", "text"],
        ["ownerEstablishmentAddress", "Sídlo", "text"],
        ["ownerRegistrationNumber", "Registrační číslo", "text"],
        ["controllerName", "Ovládající subjekt, pokud existuje", "text"],
        ["controllerEntityType", "Typ ovládajícího subjektu", "entityType"],
        ["controllerEmail", "E-mail ovládajícího subjektu", "email"],
        ["controllerPostalAddress", "Poštovní adresa ovládajícího subjektu", "text"],
        ["controllerEstablishmentAddress", "Sídlo ovládajícího subjektu", "text"],
      ],
    },
    {
      title: "Plátce a dodavatel",
      fields: [
        ["payer", "Plátce", "text"],
        ["payerEntityType", "Typ plátce", "entityType"],
        ["payerEmail", "E-mail plátce", "email"],
        ["payerPostalAddress", "Poštovní adresa plátce", "text"],
        ["payerEstablishmentAddress", "Sídlo plátce", "text"],
        ["supplier", "Dodavatel", "text"],
      ],
    },
    {
      title: "Náklady a financování",
      fields: [
        ["amount", "Náklady / rozpočet", "text"],
        ["benefitsInKind", "Nepeněžní plnění", "text"],
        ["currency", "Měna", "text"],
        ["fundingSource", "Původ financí", "text"],
        ["fundingOrigin", "Veřejné / soukromé", "fundingOrigin"],
        ["fundingJurisdiction", "EU / mimo EU", "fundingJurisdiction"],
        ["calculationMethod", "Metodika výpočtu", "textarea"],
        ["distributionArea", "Oblast šíření", "text"],
        ["advertisementUrl", "URL zveřejněné reklamy, pokud existuje", "url"],
        ["publisherPlatform", "Platforma nebo médium", "text"],
        ["europeanRepositoryUrl", "Odkaz v evropském repozitáři, pokud existuje", "url"],
        ["infringementDetails", "Informace o předchozím pozastavení", "textarea"],
      ],
    },
    {
      title: "Cílení",
      fields: [
        ["targeting", "Popis cílení", "text"],
        ["targetAudience", "Cílové publikum", "text"],
        ["targetingDataCategories", "Kategorie osobních údajů", "textarea"],
        ["targetingLogic", "Cíle, mechanismy a logika", "textarea"],
        ["targetingAiUse", "Použití AI", "textarea"],
        ["targetingPolicyUrl", "Interní pravidla cílení", "url"],
        ["dataController", "Správce osobních údajů", "text"],
        ["consentWithdrawUrl", "Odvolání souhlasu", "url"],
        ["dataRightsUrl", "Uplatnění práv", "url"],
        ["privacyInformationUrl", "Informace o zpracování", "url"],
        ["reachViews", "Zobrazení", "number"],
        ["reachEngagements", "Interakce", "number"],
        ["reachClicks", "Kliknutí", "number"],
        ["reachLikes", "To se mi líbí", "number"],
        ["reachComments", "Komentáře", "number"],
      ],
    },
  ] as const;

  return (
    <section className="rounded-md border border-[#f45d1f]/35 bg-white">
      <div className="flex flex-col gap-3 border-b border-black/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-black">{mode === "create" ? "Nová reklama" : `Úprava reklamy ${form.code}`}</h2>
          <p className="mt-1 text-sm text-[#59616b]">Vyplňte základ, uložte rozpracovaný záznam a potom nahrajte podklad v detailu.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="inline-flex items-center gap-2 rounded-md border border-black/10 px-3 py-2 text-sm font-semibold">
            <X size={15} />
            Zavřít
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !canSaveDraft}
            className="inline-flex items-center gap-2 rounded-md bg-[#11161c] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#c9cdd3]"
          >
            <Save size={15} />
            {saving ? "Ukládám" : "Uložit rozpracované"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 gap-4">
          <label className="grid gap-1.5 text-sm font-semibold text-[#20242a] sm:max-w-xs">
            Online / offline
            <select
              value={form.channel}
              onChange={(event) => onChange({ ...form, channel: event.target.value === "online" ? "online" : "offline" })}
              className="rounded-md border border-black/10 bg-white px-3 py-2 font-normal outline-none focus:border-[#f45d1f]"
            >
              <option value="offline">Offline</option>
              <option value="online">Online</option>
            </select>
          </label>

          {fieldGroups.map((group) => (
            <div key={group.title} className="rounded-md border border-black/10 bg-[#fbfbfc] p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-semibold text-black">{group.title}</h3>
                {group.title === "Cílení" ? (
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex w-fit items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#20242a]">
                      <input
                        type="checkbox"
                        checked={form.isTargeted}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          onChange({
                            ...form,
                            isTargeted: checked,
                            usesPersonalData: checked ? form.usesPersonalData : false,
                            targeting: checked && form.targeting === "nepoužito" ? "" : checked ? form.targeting : "nepoužito",
                            targetAudience: checked ? form.targetAudience : "",
                          });
                        }}
                        className="size-4 accent-[#f45d1f]"
                      />
                      Používá cílení
                    </label>
                    <label className="inline-flex w-fit items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#20242a]">
                      <input
                        type="checkbox"
                        checked={form.usesPersonalData}
                        disabled={!form.isTargeted}
                        onChange={(event) => onChange({ ...form, usesPersonalData: event.target.checked })}
                        className="size-4 accent-[#f45d1f]"
                      />
                      Cílení používá osobní údaje
                    </label>
                  </div>
                ) : group.title === "Náklady a financování" ? (
                  <label className="inline-flex w-fit items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#20242a]">
                    <input
                      type="checkbox"
                      checked={form.republishedAfterInfringement}
                      onChange={(event) => onChange({ ...form, republishedAfterInfringement: event.target.checked })}
                      className="size-4 accent-[#f45d1f]"
                    />
                    Dříve pozastaveno kvůli TTPA
                  </label>
                ) : null}
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.fields.map(([key, label, type]) => {
                  const isTargetingField = key === "targeting" || key === "targetAudience";
                  const personalDataFields = new Set<keyof EditableAdInput>([
                    "targetingDataCategories",
                    "targetingLogic",
                    "targetingAiUse",
                    "targetingPolicyUrl",
                    "dataController",
                    "consentWithdrawUrl",
                    "dataRightsUrl",
                    "privacyInformationUrl",
                  ]);
                  const controllerFields = new Set<keyof EditableAdInput>([
                    "controllerEmail",
                    "controllerPostalAddress",
                    "controllerEntityType",
                  ]);
                  const reachFields = new Set<keyof EditableAdInput>(["reachViews", "reachEngagements", "reachClicks", "reachLikes", "reachComments"]);
                  const disabled =
                    (isTargetingField && !form.isTargeted) ||
                    (personalDataFields.has(key) && !form.usesPersonalData) ||
                    (reachFields.has(key) && form.channel !== "online") ||
                    ((key === "advertisementUrl" || key === "publisherPlatform" || key === "europeanRepositoryUrl") && form.channel !== "online") ||
                    (key === "infringementDetails" && !form.republishedAfterInfringement);
                  const required =
                    requiredFields.has(key) ||
                    (isTargetingField && targetingRequired) ||
                    (personalDataFields.has(key) && form.usesPersonalData) ||
                    (controllerFields.has(key) && hasValue(form.controllerName)) ||
                    (key === "infringementDetails" && form.republishedAfterInfringement) ||
                    (key === "ownerEstablishmentAddress" && form.ownerEntityType === "legal") ||
                    (key === "payerEstablishmentAddress" && form.payerEntityType === "legal") ||
                    (key === "controllerEstablishmentAddress" && form.controllerEntityType === "legal" && hasValue(form.controllerName));
                  const empty = required && !String(form[key] ?? "").trim();
                  const fieldClass = `rounded-md border px-3 py-2 font-normal outline-none focus:border-[#f45d1f] ${
                    empty ? "border-red-300" : "border-black/10"
                  } ${disabled ? "bg-[#f1f2f4] text-[#8b929b]" : "bg-white"}`;

                  return (
                    <label key={key} className="grid gap-1.5 text-sm font-semibold text-[#20242a]">
                      <span className="flex items-center gap-2">
                        {label}
                        {required ? <span className={empty ? "text-xs text-red-700" : "text-xs text-[#68707a]"}>povinné</span> : null}
                      </span>
                      {type === "campaign" ? (
                        <select
                          value={form.campaignId ?? ""}
                          onChange={(event) => onChange({ ...form, campaignId: event.target.value })}
                          className={fieldClass}
                        >
                          {campaigns.filter((campaign) => !campaign.archived).length === 0 ? <option value="">Nejdřív založte kampaň</option> : null}
                          {campaigns
                            .filter((campaign) => !campaign.archived || campaign.id === form.campaignId)
                            .map((campaign) => (
                              <option key={campaign.id} value={campaign.id}>
                                {campaign.name}
                              </option>
                            ))}
                        </select>
                      ) : type === "candidate" ? (
                        <select
                          value={form.candidateId ?? ""}
                          onChange={(event) => onChange({ ...form, candidateId: event.target.value })}
                          className="rounded-md border border-black/10 bg-white px-3 py-2 font-normal outline-none focus:border-[#f45d1f]"
                        >
                          <option value="">Bez kandidáta</option>
                          {candidates
                            .filter((candidate) => !candidate.archived || candidate.id === form.candidateId)
                            .map((candidate) => (
                              <option key={candidate.id} value={candidate.id}>
                                {candidate.name}
                                {candidate.ballotNumber ? ` · č. ${candidate.ballotNumber}` : ""}
                              </option>
                            ))}
                        </select>
                      ) : type === "branch" ? (
                        <select
                          value={form.branch}
                          onChange={(event) => onChange({ ...form, branch: event.target.value })}
                          className={fieldClass}
                        >
                          {branches.filter((branch) => !branch.archived).length === 0 ? <option value="">Nejdřív založte pobočku</option> : null}
                          {branches.filter((branch) => !branch.archived).map((branch) => (
                            <option key={branch.id} value={branch.name}>
                              {branch.name}
                            </option>
                          ))}
                        </select>
                      ) : type === "entityType" ? (
                        <select
                          value={String(form[key] ?? "")}
                          disabled={disabled}
                          onChange={(event) => onChange({ ...form, [key]: event.target.value })}
                          className={fieldClass}
                        >
                          <option value="">Vyberte</option>
                          <option value="legal">Právnická osoba</option>
                          <option value="natural">Fyzická osoba</option>
                          <option value="other">Jiný subjekt</option>
                        </select>
                      ) : type === "fundingOrigin" ? (
                        <select value={form.fundingOrigin} onChange={(event) => onChange({ ...form, fundingOrigin: event.target.value })} className={fieldClass}>
                          <option value="">Vyberte</option>
                          <option value="public">Veřejné</option>
                          <option value="private">Soukromé</option>
                          <option value="mixed">Kombinované</option>
                        </select>
                      ) : type === "fundingJurisdiction" ? (
                        <select value={form.fundingJurisdiction} onChange={(event) => onChange({ ...form, fundingJurisdiction: event.target.value })} className={fieldClass}>
                          <option value="">Vyberte</option>
                          <option value="eu">Z EU</option>
                          <option value="non-eu">Mimo EU</option>
                          <option value="mixed">Kombinované</option>
                        </select>
                      ) : type === "textarea" ? (
                        <textarea
                          value={String(form[key] ?? "")}
                          disabled={disabled}
                          rows={3}
                          onChange={(event) => onChange({ ...form, [key]: event.target.value })}
                          className={fieldClass}
                        />
                      ) : (
                        <input
                          type={type}
                          min={type === "number" ? 0 : undefined}
                          value={form[key] === null ? "" : String(form[key] ?? "")}
                          disabled={disabled}
                          onChange={(event) =>
                            onChange({
                              ...form,
                              [key]: type === "number" ? (event.target.value === "" ? null : Number(event.target.value)) : event.target.value,
                            })
                          }
                          className={fieldClass}
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <EditorGuidancePanel steps={draftSteps} missingItems={missingItems} canSaveDraft={canSaveDraft} />
      </div>
    </section>
  );
}

function EditorGuidancePanel({ steps, missingItems, canSaveDraft }: { steps: AdProcessStep[]; missingItems: string[]; canSaveDraft: boolean }) {
  const doneCount = steps.filter((step) => step.done).length;
  const nextStep = steps.find((step) => !step.done);
  const progress = Math.round((doneCount / steps.length) * 100);

  return (
    <aside className="grid h-fit gap-3 rounded-md border border-black/10 bg-[#11161c] p-4 text-white xl:sticky xl:top-4">
      <div>
        <div className="inline-flex rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-white/70">
          {doneCount}/8 hotovo
        </div>
        <h3 className="mt-3 text-lg font-semibold">Co chybí pro TTPA</h3>
        <p className="mt-2 text-sm leading-6 text-white/72">
          Doplňte údaje potřebné před zveřejněním.
        </p>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/12">
        <div className="h-full rounded-full bg-[#f45d1f]" style={{ width: `${progress}%` }} />
      </div>

      <div className="rounded-md border border-white/12 bg-white/8 p-3">
        <div className="text-sm font-semibold">{nextStep ? "Teď řešit" : "Připraveno k další kontrole"}</div>
        <p className="mt-1 text-sm leading-6 text-white/72">
          {nextStep?.nextAction ?? "Povinné údaje jsou vyplněné."}
        </p>
      </div>

      <div className="rounded-md border border-white/12 bg-white/8 p-3">
        <div className="text-sm font-semibold">{missingItems.length ? "Co ještě chybí" : "Údaje ve formuláři"}</div>
        {missingItems.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {missingItems.slice(0, 10).map((item) => (
              <span key={item} className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-[#b7350c]">
                {item}
              </span>
            ))}
            {missingItems.length > 10 ? <span className="rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-white/72">+{missingItems.length - 10}</span> : null}
          </div>
        ) : (
          <p className="mt-1 text-sm leading-6 text-white/72">Povinné údaje jsou vyplněné.</p>
        )}
      </div>

      {!canSaveDraft ? <p className="text-sm leading-6 text-white/64">Pro uložení rozpracovaného záznamu stačí kampaň, název a pobočka.</p> : null}

      <div className="grid gap-2">
        {steps.map((step) => (
          <div key={step.key} className="grid gap-1 rounded-md border border-white/12 bg-white/8 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">{step.title}</span>
              <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${step.done ? "bg-emerald-100 text-emerald-800" : "bg-white/12 text-white/72"}`}>
                {step.done ? "hotovo" : nextStep?.key === step.key ? "teď" : "čeká"}
              </span>
            </div>
            <p className="text-sm leading-5 text-white/64">{step.text}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}
