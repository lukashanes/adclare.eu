"use client";

import { useMemo } from "react";
import { CalendarDays, Plus, Save, Tags } from "lucide-react";
import type { AdRecord, AppBranchUpdateInput, AppCampaignInput, AppCandidateInput, AppTenantSettingsInput, AppWorkspacePayload } from "@/lib/workspace-types";

type AdStats = {
  adCount: number;
  missingCount: number;
  reviewCount: number;
  publishedCount: number;
};

function blankAdStats(): AdStats {
  return {
    adCount: 0,
    missingCount: 0,
    reviewCount: 0,
    publishedCount: 0,
  };
}

function addAdStats(stats: AdStats, ad: AdRecord) {
  stats.adCount += 1;

  if (ad.workflowStatus === "NEEDS_DATA" || ad.missing.length > 0) {
    stats.missingCount += 1;
  }

  if (ad.workflowStatus === "READY_FOR_REVIEW" || ad.workflowStatus === "APPROVED") {
    stats.reviewCount += 1;
  }

  if (ad.workflowStatus === "PUBLISHED") {
    stats.publishedCount += 1;
  }
}

function adStatsBy(ads: AdRecord[], keyForAd: (ad: AdRecord) => string) {
  const statsByKey = new Map<string, AdStats>();

  for (const ad of ads) {
    const key = keyForAd(ad);
    const stats = statsByKey.get(key) ?? blankAdStats();
    addAdStats(stats, ad);
    statsByKey.set(key, stats);
  }

  return statsByKey;
}

function adStatsFor(statsByKey: Map<string, AdStats>, key: string): AdStats {
  return statsByKey.get(key) ?? blankAdStats();
}

function activeCandidateCountsByBranch(candidates: AppWorkspacePayload["candidates"]) {
  const counts = new Map<string, number>();

  for (const candidate of candidates) {
    if (!candidate.archived) {
      counts.set(candidate.branchId, (counts.get(candidate.branchId) ?? 0) + 1);
    }
  }

  return counts;
}

export function SettingsPanel({
  tenant,
  saving,
  message,
  onSave,
}: {
  tenant: AppWorkspacePayload["tenant"];
  saving: boolean;
  message: string;
  onSave: (input: AppTenantSettingsInput) => void;
}) {
  return (
    <section id="settings" className="scroll-mt-6 rounded-md border border-black/10 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-black">Nastavení strany</h2>
          <p className="mt-1 text-sm text-[#59616b]">Název, archiv a veřejný repozitář.</p>
        </div>
        {message ? <span className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">{message}</span> : null}
      </div>

      <form
        className="mt-4 grid gap-3 lg:grid-cols-[minmax(180px,1.2fr)_180px_minmax(180px,1fr)_150px_150px_150px]"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          onSave({
            name: String(formData.get("name") ?? ""),
            slug: String(formData.get("slug") ?? ""),
            contactEmail: String(formData.get("contactEmail") ?? ""),
            defaultLocale: String(formData.get("defaultLocale") ?? "cs") === "en" ? "en" : "cs",
            publicRepositoryEnabled: formData.get("publicRepositoryEnabled") === "on",
            retentionYears: Number(formData.get("retentionYears") ?? tenant.retentionYears),
          });
        }}
      >
        <label className="grid gap-1 text-xs font-semibold text-[#68707a]">
          Název
          <input name="name" defaultValue={tenant.name} className="h-10 rounded-md border border-black/10 px-3 text-sm font-semibold text-black outline-none focus:border-[#f45d1f]" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[#68707a]">
          Slug
          <input name="slug" defaultValue={tenant.slug} className="h-10 rounded-md border border-black/10 px-3 text-sm font-semibold text-black outline-none focus:border-[#f45d1f]" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[#68707a]">
          Kontaktní e-mail
          <input name="contactEmail" defaultValue={tenant.contactEmail} type="email" className="h-10 rounded-md border border-black/10 px-3 text-sm text-black outline-none focus:border-[#f45d1f]" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[#68707a]">
          Jazyk
          <select name="defaultLocale" defaultValue={tenant.defaultLocale} className="h-10 rounded-md border border-black/10 px-3 text-sm font-semibold text-black outline-none focus:border-[#f45d1f]">
            <option value="cs">Čeština</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[#68707a]">
          Archiv roky
          <input name="retentionYears" defaultValue={tenant.retentionYears} type="number" min={1} max={20} className="h-10 rounded-md border border-black/10 px-3 text-sm font-semibold text-black outline-none focus:border-[#f45d1f]" />
        </label>
        <div className="grid gap-2">
          <label className="flex h-10 items-center gap-2 rounded-md border border-black/10 px-3 text-sm font-semibold text-[#20242a]">
            <input name="publicRepositoryEnabled" type="checkbox" defaultChecked={tenant.publicRepositoryEnabled} className="size-4 accent-[#f45d1f]" />
            Veřejný repo
          </label>
          <button type="submit" disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#11161c] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#c9cdd3]">
            <Save size={15} />
            {saving ? "Ukládám" : "Uložit"}
          </button>
        </div>
      </form>
    </section>
  );
}

export function BranchesPanel({
  branches,
  ads,
  candidates,
  canCreate,
  canArchive,
  branchName,
  branchKind,
  branchSaving,
  branchSavingId,
  onBranchKindChange,
  onBranchNameChange,
  onCreate,
  onUpdate,
}: {
  branches: AppWorkspacePayload["branches"];
  ads: AdRecord[];
  candidates: AppWorkspacePayload["candidates"];
  canCreate: boolean;
  canArchive: boolean;
  branchName: string;
  branchKind: string;
  branchSaving: boolean;
  branchSavingId: string;
  onBranchKindChange: (value: string) => void;
  onBranchNameChange: (value: string) => void;
  onCreate: () => void;
  onUpdate: (branchId: string, input: AppBranchUpdateInput) => void;
}) {
  const branchStatsByName = useMemo(() => adStatsBy(ads, (ad) => ad.branch), [ads]);
  const candidateCounts = useMemo(() => activeCandidateCountsByBranch(candidates), [candidates]);
  const branchCards = useMemo(
    () =>
      branches
        .map((branch) => {
          const stats = adStatsFor(branchStatsByName, branch.name);

          return {
            ...branch,
            adCount: stats.adCount,
            missingCount: stats.missingCount,
            publishedCount: stats.publishedCount,
            candidateCount: candidateCounts.get(branch.id) ?? 0,
          };
        })
        .sort((a, b) => Number(a.archived) - Number(b.archived) || b.adCount - a.adCount || a.name.localeCompare(b.name, "cs")),
    [branchStatsByName, branches, candidateCounts],
  );
  const activeCount = useMemo(() => branches.reduce((count, branch) => count + (branch.archived ? 0 : 1), 0), [branches]);
  const branchAdCount = branchCards.reduce((sum, branch) => sum + branch.adCount, 0);
  const branchesNeedingData = branchCards.filter((branch) => branch.missingCount > 0).length;

  return (
    <section id="branches" className="scroll-mt-6 rounded-md border border-black/10 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-black">Pobočky a oblasti</h2>
          <p className="mt-1 text-sm text-[#59616b]">Regiony, oblasti a kontakty.</p>
        </div>
        {canCreate ? (
          <div className="grid gap-2 sm:grid-cols-[150px_minmax(180px,1fr)_auto]">
            <select value={branchKind} onChange={(event) => onBranchKindChange(event.target.value)} className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm font-semibold outline-none focus:border-[#f45d1f]">
              <option value="centrala">Centrála</option>
              <option value="kraj">Kraj</option>
              <option value="oblast">Oblast</option>
              <option value="pobočka">Pobočka</option>
            </select>
            <input value={branchName} onChange={(event) => onBranchNameChange(event.target.value)} placeholder="Název pobočky" className="h-10 rounded-md border border-black/10 px-3 text-sm outline-none focus:border-[#f45d1f]" />
            <button type="button" onClick={onCreate} disabled={branchSaving || !branchName.trim()} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#11161c] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#c9cdd3]">
              <Plus size={15} />
              {branchSaving ? "Ukládám" : "Přidat"}
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {[
          ["Aktivní pobočky", activeCount],
          ["Reklamy v pobočkách", branchAdCount],
          ["Pobočky k doplnění", branchesNeedingData],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-black/10 bg-[#fbfbfc] p-3">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#68707a]">{label}</div>
            <div className="mt-2 text-2xl font-semibold text-black">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-2 xl:grid-cols-3">
        {branchCards.slice(0, 6).map((branch) => (
          <article key={branch.id} className={`rounded-md border p-3 ${branch.archived ? "border-neutral-200 bg-neutral-50" : "border-black/10 bg-white"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#68707a]">{branch.kind}</div>
                <h3 className="mt-1 truncate text-sm font-semibold text-black">{branch.name}</h3>
              </div>
              <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-semibold ${branch.archived ? "border-neutral-200 bg-white text-neutral-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
                {branch.archived ? "archiv" : "aktivní"}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-md bg-[#f1f2f4] px-2 py-1 text-xs font-semibold text-[#59616b]">{branch.adCount} reklam</span>
              <span className={`rounded-md px-2 py-1 text-xs font-semibold ${branch.missingCount ? "bg-orange-50 text-orange-800" : "bg-emerald-50 text-emerald-800"}`}>
                {branch.missingCount} k doplnění
              </span>
              <span className="rounded-md bg-[#f1f2f4] px-2 py-1 text-xs font-semibold text-[#59616b]">{branch.publishedCount} publikováno</span>
              <span className="rounded-md bg-[#f1f2f4] px-2 py-1 text-xs font-semibold text-[#59616b]">{branch.candidateCount} kandidátů</span>
            </div>
            {branch.contactEmail ? <div className="mt-3 truncate text-xs font-medium text-[#59616b]">{branch.contactEmail}</div> : null}
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-2">
        {branches.map((branch) => (
          <form
            key={branch.id}
            className={`grid min-w-0 gap-2 rounded-md border p-3 xl:grid-cols-[minmax(160px,1fr)_150px_minmax(160px,1fr)_minmax(180px,1fr)_140px_130px] xl:items-end ${
              branch.archived ? "border-neutral-200 bg-neutral-50 opacity-80" : "border-black/10 bg-[#fbfbfc]"
            }`}
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              onUpdate(branch.id, {
                name: String(formData.get("name") ?? ""),
                kind: String(formData.get("kind") ?? branch.kind),
                parentId: String(formData.get("parentId") ?? ""),
                contactEmail: String(formData.get("contactEmail") ?? ""),
                description: String(formData.get("description") ?? ""),
                archived: formData.get("archived") === "on",
              });
            }}
          >
            <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#68707a]">
              Název
              <input name="name" defaultValue={branch.name} className="min-w-0 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black outline-none focus:border-[#f45d1f]" />
            </label>
            <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#68707a]">
              Typ
              <select name="kind" defaultValue={branch.kind} className="min-w-0 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#20242a] outline-none focus:border-[#f45d1f]">
                <option value="centrala">Centrála</option>
                <option value="kraj">Kraj</option>
                <option value="oblast">Oblast</option>
                <option value="pobočka">Pobočka</option>
              </select>
            </label>
            <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#68707a]">
              Nadřazená
              <select name="parentId" defaultValue={branch.parentId} disabled={!canCreate} className="min-w-0 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#20242a] outline-none focus:border-[#f45d1f] disabled:bg-[#f1f2f4]">
                <option value="">Bez nadřazené</option>
                {branches.filter((item) => item.id !== branch.id && !item.archived).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#68707a]">
              Kontakt
              <input name="contactEmail" defaultValue={branch.contactEmail} type="email" className="min-w-0 rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-[#f45d1f]" />
            </label>
            <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#68707a]">
              Poznámka
              <input name="description" defaultValue={branch.description} className="min-w-0 rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-[#f45d1f]" />
            </label>
            <div className="grid gap-2">
              {canArchive ? (
                <label className="flex h-10 items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-xs font-semibold text-[#20242a]">
                  <input name="archived" type="checkbox" defaultChecked={branch.archived} className="size-4 accent-[#f45d1f]" />
                  Archiv
                </label>
              ) : null}
              <button type="submit" disabled={Boolean(branchSavingId)} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#11161c] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#c9cdd3]">
                <Save size={15} />
                {branchSavingId === branch.id ? "Ukládám" : "Uložit"}
              </button>
            </div>
          </form>
        ))}
      </div>
    </section>
  );
}

export function CampaignsPanel({
  campaigns,
  ads,
  candidates,
  campaignName,
  campaignElection,
  campaignStartsAt,
  campaignEndsAt,
  campaignTags,
  campaignSaving,
  campaignSavingId,
  onCampaignNameChange,
  onCampaignElectionChange,
  onCampaignStartsAtChange,
  onCampaignEndsAtChange,
  onCampaignTagsChange,
  onCreate,
  onUpdate,
}: {
  campaigns: AppWorkspacePayload["campaigns"];
  ads: AdRecord[];
  candidates: AppWorkspacePayload["candidates"];
  campaignName: string;
  campaignElection: string;
  campaignStartsAt: string;
  campaignEndsAt: string;
  campaignTags: string;
  campaignSaving: boolean;
  campaignSavingId: string;
  onCampaignNameChange: (value: string) => void;
  onCampaignElectionChange: (value: string) => void;
  onCampaignStartsAtChange: (value: string) => void;
  onCampaignEndsAtChange: (value: string) => void;
  onCampaignTagsChange: (value: string) => void;
  onCreate: () => void;
  onUpdate: (campaignId: string, input: AppCampaignInput) => void;
}) {
  const campaignStatsById = useMemo(() => adStatsBy(ads, (ad) => ad.campaignId), [ads]);
  const activeCampaigns = useMemo(() => campaigns.filter((campaign) => !campaign.archived), [campaigns]);
  const campaignCards = useMemo(
    () =>
      campaigns
        .map((campaign) => {
          const stats = adStatsFor(campaignStatsById, campaign.id);

          return {
            ...campaign,
            adCount: stats.adCount,
            missingCount: stats.missingCount,
            reviewCount: stats.reviewCount,
            publishedCount: stats.publishedCount,
          };
        })
        .sort((a, b) => Number(a.archived) - Number(b.archived) || b.adCount - a.adCount || a.name.localeCompare(b.name, "cs")),
    [campaignStatsById, campaigns],
  );
  const totalCampaignAds = campaignCards.reduce((sum, campaign) => sum + campaign.adCount, 0);
  const topCampaign = campaignCards.find((campaign) => !campaign.archived) ?? campaignCards[0] ?? null;
  const tagList = useMemo(() => Array.from(new Set(campaigns.flatMap((campaign) => campaign.tags))).slice(0, 10), [campaigns]);
  const activeCandidates = useMemo(() => candidates.reduce((count, candidate) => count + (candidate.archived ? 0 : 1), 0), [candidates]);

  return (
    <section id="campaigns" className="scroll-mt-6 rounded-md border border-black/10 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-black">Kampaně a tagy</h2>
          <p className="mt-1 text-sm text-[#59616b]">Období, volby a štítky pro třídění reklam.</p>
        </div>
        <div className="grid gap-2 lg:min-w-[620px] lg:grid-cols-[minmax(180px,1fr)_150px_135px_135px]">
          <input value={campaignName} onChange={(event) => onCampaignNameChange(event.target.value)} placeholder="Název kampaně" className="h-10 rounded-md border border-black/10 px-3 text-sm outline-none focus:border-[#f45d1f]" />
          <input value={campaignElection} onChange={(event) => onCampaignElectionChange(event.target.value)} placeholder="Volby" className="h-10 rounded-md border border-black/10 px-3 text-sm outline-none focus:border-[#f45d1f]" />
          <input value={campaignStartsAt} onChange={(event) => onCampaignStartsAtChange(event.target.value)} type="date" className="h-10 rounded-md border border-black/10 px-3 text-sm outline-none focus:border-[#f45d1f]" />
          <input value={campaignEndsAt} onChange={(event) => onCampaignEndsAtChange(event.target.value)} type="date" className="h-10 rounded-md border border-black/10 px-3 text-sm outline-none focus:border-[#f45d1f]" />
          <input value={campaignTags} onChange={(event) => onCampaignTagsChange(event.target.value)} placeholder="Tagy oddělené čárkou" className="h-10 rounded-md border border-black/10 px-3 text-sm outline-none focus:border-[#f45d1f] lg:col-span-3" />
          <button type="button" onClick={onCreate} disabled={campaignSaving || !campaignName.trim()} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#11161c] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#c9cdd3]">
            <Plus size={15} />
            {campaignSaving ? "Ukládám" : "Přidat"}
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-black/10 bg-[#fbfbfc] p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-black">Přehled kampaní</h3>
            <p className="mt-1 text-sm leading-6 text-[#59616b]">
              Stav reklam podle kampaní.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-4 lg:min-w-[520px]">
            {[
              ["Aktivní", activeCampaigns.length],
              ["Reklamy", totalCampaignAds],
              ["Kandidáti", activeCandidates],
              ["Tagy", tagList.length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-black/10 bg-white p-2">
                <div className="text-xs font-semibold text-[#68707a]">{label}</div>
                <div className="mt-1 text-lg font-semibold text-black">{value}</div>
              </div>
            ))}
          </div>
        </div>
        {topCampaign ? (
          <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-md border border-black/10 bg-white p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#68707a]">Největší kampaň</div>
              <div className="mt-1 text-sm font-semibold text-black">{topCampaign.name}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-md bg-[#f1f2f4] px-2 py-1 text-xs font-semibold text-[#59616b]">{topCampaign.adCount} reklam</span>
                <span className="rounded-md bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-800">{topCampaign.missingCount} k doplnění</span>
                <span className="rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800">{topCampaign.reviewCount} ke kontrole</span>
                <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">{topCampaign.publishedCount} publikováno</span>
              </div>
            </div>
            <div className="rounded-md border border-black/10 bg-white p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#68707a]">Tagy pro třídění</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tagList.length ? tagList.map((tag) => (
                  <span key={tag} className="rounded-md bg-[#f1f2f4] px-2 py-1 text-xs font-semibold text-[#59616b]">{tag}</span>
                )) : <span className="text-sm text-[#59616b]">Zatím bez tagů.</span>}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2">
        {campaigns.map((campaign) => (
          <form
            key={campaign.id}
            className={`grid min-w-0 gap-2 rounded-md border p-3 2xl:grid-cols-[minmax(180px,1fr)_145px_135px_135px_minmax(180px,1fr)_150px_130px] 2xl:items-end ${
              campaign.archived ? "border-neutral-200 bg-neutral-50 opacity-80" : "border-black/10 bg-[#fbfbfc]"
            }`}
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              onUpdate(campaign.id, {
                name: String(formData.get("name") ?? ""),
                slug: String(formData.get("slug") ?? ""),
                election: String(formData.get("election") ?? ""),
                description: String(formData.get("description") ?? ""),
                tags: String(formData.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
                startsAt: String(formData.get("startsAt") ?? ""),
                endsAt: String(formData.get("endsAt") ?? ""),
                archived: formData.get("archived") === "on",
              });
            }}
          >
            <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#68707a]">
              Název
              <input name="name" defaultValue={campaign.name} className="min-w-0 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black outline-none focus:border-[#f45d1f]" />
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[#59616b]">
                <CalendarDays size={13} />
                {campaign.adCount} reklam
              </span>
            </label>
            <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#68707a]">
              Volby
              <input name="election" defaultValue={campaign.election} className="min-w-0 rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-[#f45d1f]" />
            </label>
            <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#68707a]">
              Od
              <input name="startsAt" defaultValue={campaign.startsAtIso} type="date" className="min-w-0 rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-[#f45d1f]" />
            </label>
            <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#68707a]">
              Do
              <input name="endsAt" defaultValue={campaign.endsAtIso} type="date" className="min-w-0 rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-[#f45d1f]" />
            </label>
            <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#68707a]">
              Tagy
              <input name="tags" defaultValue={campaign.tags.join(", ")} className="min-w-0 rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-[#f45d1f]" />
              <span className="inline-flex min-w-0 items-center gap-1 text-xs font-medium text-[#59616b]">
                <Tags size={13} />
                <span className="truncate">{campaign.tags.length ? campaign.tags.join(", ") : "bez tagů"}</span>
              </span>
            </label>
            <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#68707a]">
              Popis
              <input name="description" defaultValue={campaign.description} className="min-w-0 rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-[#f45d1f]" />
              <input name="slug" type="hidden" defaultValue={campaign.slug} />
            </label>
            <div className="grid gap-2">
              <label className="flex h-10 items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-xs font-semibold text-[#20242a]">
                <input name="archived" type="checkbox" defaultChecked={campaign.archived} className="size-4 accent-[#f45d1f]" />
                Archiv
              </label>
              <button type="submit" disabled={Boolean(campaignSavingId)} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#11161c] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#c9cdd3]">
                <Save size={15} />
                {campaignSavingId === campaign.id ? "Ukládám" : "Uložit"}
              </button>
            </div>
          </form>
        ))}
        {campaigns.length === 0 ? <div className="rounded-md border border-black/10 p-3 text-sm text-[#59616b]">Zatím není založená žádná kampaň.</div> : null}
      </div>
    </section>
  );
}

export function CandidatesPanel({
  candidates,
  branches,
  ads,
  candidateName,
  candidateBranchId,
  candidateBallotNumber,
  candidateSaving,
  candidateSavingId,
  onCandidateNameChange,
  onCandidateBranchChange,
  onCandidateBallotNumberChange,
  onCreate,
  onUpdate,
}: {
  candidates: AppWorkspacePayload["candidates"];
  branches: AppWorkspacePayload["branches"];
  ads: AdRecord[];
  candidateName: string;
  candidateBranchId: string;
  candidateBallotNumber: string;
  candidateSaving: boolean;
  candidateSavingId: string;
  onCandidateNameChange: (value: string) => void;
  onCandidateBranchChange: (value: string) => void;
  onCandidateBallotNumberChange: (value: string) => void;
  onCreate: () => void;
  onUpdate: (candidateId: string, input: AppCandidateInput) => void;
}) {
  const candidateStatsById = useMemo(() => adStatsBy(ads, (ad) => ad.candidateId), [ads]);
  const activeBranches = useMemo(() => branches.filter((branch) => !branch.archived), [branches]);
  const activeCount = useMemo(() => candidates.reduce((count, candidate) => count + (candidate.archived ? 0 : 1), 0), [candidates]);
  const candidateCards = useMemo(
    () =>
      candidates.map((candidate) => {
        const stats = adStatsFor(candidateStatsById, candidate.id);

        return {
          ...candidate,
          adCount: stats.adCount,
          missingCount: stats.missingCount,
          reviewCount: stats.reviewCount,
          publishedCount: stats.publishedCount,
        };
      }),
    [candidateStatsById, candidates],
  );
  const candidatesWithAds = candidateCards.filter((candidate) => !candidate.archived && candidate.adCount > 0).length;
  const branchlessCandidates = candidateCards.filter((candidate) => !candidate.archived && !candidate.branchId).length;
  const candidateAdCount = candidateCards.reduce((sum, candidate) => sum + candidate.adCount, 0);

  return (
    <section id="candidates" className="scroll-mt-6 rounded-md border border-black/10 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-black">Kandidáti</h2>
          <p className="mt-1 text-sm text-[#59616b]">Seznam pro přiřazení reklam.</p>
        </div>
        <span className="inline-flex w-fit rounded-md border border-black/10 bg-[#fbfbfc] px-3 py-1.5 text-sm font-semibold text-[#25282d]">
          {activeCount} aktivních
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        {[
          ["Aktivní kandidáti", activeCount],
          ["S reklamami", candidatesWithAds],
          ["Bez pobočky", branchlessCandidates],
          ["Reklamy kandidátů", candidateAdCount],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-black/10 bg-[#fbfbfc] p-3">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#68707a]">{label}</div>
            <div className="mt-2 text-2xl font-semibold text-black">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2 lg:grid-cols-[minmax(220px,1fr)_minmax(180px,260px)_120px_auto]">
        <input
          value={candidateName}
          onChange={(event) => onCandidateNameChange(event.target.value)}
          placeholder="Jméno kandidáta"
          className="h-10 rounded-md border border-black/10 px-3 text-sm outline-none focus:border-[#f45d1f]"
        />
        <select
          value={candidateBranchId}
          onChange={(event) => onCandidateBranchChange(event.target.value)}
          className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm font-semibold outline-none focus:border-[#f45d1f]"
        >
          <option value="">Vše</option>
          {activeBranches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
        <input
          value={candidateBallotNumber}
          onChange={(event) => onCandidateBallotNumberChange(event.target.value)}
          placeholder="Číslo"
          className="h-10 rounded-md border border-black/10 px-3 text-sm outline-none focus:border-[#f45d1f]"
        />
        <button
          type="button"
          onClick={onCreate}
          disabled={candidateSaving || !candidateName.trim()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#11161c] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#c9cdd3]"
        >
          <Plus size={15} />
          {candidateSaving ? "Ukládám" : "Přidat"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {candidateCards.map((candidate) => (
          <form
            key={candidate.id}
            className={`grid min-w-0 gap-3 rounded-md border p-3 ${candidate.archived ? "border-neutral-200 bg-neutral-50 opacity-80" : "border-black/10 bg-[#fbfbfc]"}`}
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              onUpdate(candidate.id, {
                name: String(formData.get("name") ?? ""),
                slug: String(formData.get("slug") ?? ""),
                branchId: String(formData.get("branchId") ?? ""),
                contactEmail: String(formData.get("contactEmail") ?? ""),
                ballotNumber: String(formData.get("ballotNumber") ?? ""),
                description: String(formData.get("description") ?? ""),
                archived: formData.get("archived") === "on",
              });
            }}
          >
            <div className="grid gap-2 md:grid-cols-[minmax(180px,1fr)_minmax(160px,220px)_100px]">
              <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#68707a]">
                Jméno
                <input name="name" defaultValue={candidate.name} className="min-w-0 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black outline-none focus:border-[#f45d1f]" />
                <span className="flex flex-wrap gap-1 text-xs font-medium text-[#59616b]">
                  <span>{candidate.adCount} reklam</span>
                  <span>{candidate.missingCount} k doplnění</span>
                  <span>{candidate.reviewCount} ke kontrole</span>
                  <span>{candidate.publishedCount} publikováno</span>
                </span>
              </label>
              <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#68707a]">
                Pobočka / oblast
                <select name="branchId" defaultValue={candidate.branchId} className="min-w-0 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#20242a] outline-none focus:border-[#f45d1f]">
                  <option value="">Celý prostor</option>
                  {activeBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#68707a]">
                Číslo
                <input name="ballotNumber" defaultValue={candidate.ballotNumber} className="min-w-0 rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-[#f45d1f]" />
              </label>
            </div>
            <div className="grid gap-2 md:grid-cols-[minmax(180px,240px)_minmax(220px,1fr)_120px] md:items-end">
              <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#68707a]">
                E-mail
                <input name="contactEmail" defaultValue={candidate.contactEmail} type="email" className="min-w-0 rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-[#f45d1f]" />
              </label>
              <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#68707a]">
                Poznámka
                <input name="description" defaultValue={candidate.description} className="min-w-0 rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-[#f45d1f]" />
                <input name="slug" type="hidden" defaultValue={candidate.slug} />
              </label>
              <div className="grid gap-2">
                <label className="flex h-10 items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-xs font-semibold text-[#20242a]">
                  <input name="archived" type="checkbox" defaultChecked={candidate.archived} className="size-4 accent-[#f45d1f]" />
                  Archiv
                </label>
                <button type="submit" disabled={Boolean(candidateSavingId)} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#11161c] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#c9cdd3]">
                  <Save size={15} />
                  {candidateSavingId === candidate.id ? "Ukládám" : "Uložit"}
                </button>
              </div>
            </div>
          </form>
        ))}
        {candidates.length === 0 ? <div className="rounded-md border border-black/10 p-3 text-sm text-[#59616b]">Zatím není přidaný žádný kandidát.</div> : null}
      </div>
    </section>
  );
}
