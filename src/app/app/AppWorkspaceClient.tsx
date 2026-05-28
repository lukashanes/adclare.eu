"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, CheckCircle2, CircleDot, CreditCard, Download, Edit3, FileArchive, Plus, RefreshCw, Save, Search, X } from "lucide-react";
import type { AdRecord, AppWorkspacePayload, EditableAdInput } from "@/lib/admin-demo-types";

type EditorMode = "create" | "edit";

const workflowClass: Record<AdRecord["workflowStatus"], string> = {
  DRAFT: "border-slate-200 bg-slate-50 text-slate-700",
  NEEDS_DATA: "border-orange-200 bg-orange-50 text-orange-800",
  READY_FOR_REVIEW: "border-sky-200 bg-sky-50 text-sky-800",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  PUBLISHED: "border-[#b9e0d2] bg-[#ecf8f2] text-[#0f6b45]",
  ARCHIVED: "border-neutral-200 bg-neutral-50 text-neutral-700",
};

function canManageAds(workspace: AppWorkspacePayload) {
  return workspace.membership.roleKey !== "READONLY_AUDITOR" && workspace.membership.roleKey !== "CENTRAL_REVIEWER";
}

function canReviewAds(workspace: AppWorkspacePayload) {
  const role = workspace.membership.roleKey;
  return role === "SUPER_ADMIN" || role === "PARTY_ADMIN" || role === "CENTRAL_REVIEWER" || role === "LOCAL_ADMIN";
}

function countsForAds(ads: AdRecord[]): AppWorkspacePayload["counts"] {
  return {
    all: ads.length,
    needsData: ads.filter((ad) => ad.workflowStatus === "NEEDS_DATA").length,
    review: ads.filter((ad) => ad.workflowStatus === "READY_FOR_REVIEW").length,
    approved: ads.filter((ad) => ad.workflowStatus === "APPROVED").length,
    published: ads.filter((ad) => ad.workflowStatus === "PUBLISHED").length,
    blocked: ads.filter((ad) => ad.status === "blocked").length,
  };
}

function workspaceWithAd(workspace: AppWorkspacePayload, nextAd: AdRecord) {
  const exists = workspace.ads.some((ad) => ad.id === nextAd.id);
  const ads = exists ? workspace.ads.map((ad) => (ad.id === nextAd.id ? nextAd : ad)) : [nextAd, ...workspace.ads];

  return {
    ...workspace,
    ads,
    counts: countsForAds(ads),
  };
}

function toInputDate(value: string) {
  const parts = value.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);

  if (!parts) {
    return "2026-09-25";
  }

  return `${parts[3]}-${parts[2].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
}

function blankForm(workspace: AppWorkspacePayload): EditableAdInput {
  return {
    code: "",
    title: "",
    branch: workspace.membership.scope === "celá strana" ? "" : workspace.membership.scope,
    owner: workspace.tenant.name,
    type: "plakát",
    channel: "offline",
    publicationDate: new Date().toISOString().slice(0, 10),
    period: "",
    distributionArea: "",
    payer: workspace.tenant.name,
    supplier: "",
    amount: "",
    fundingSource: "",
    language: "cs",
    isTargeted: false,
    targeting: "nepoužito",
    targetAudience: "",
  };
}

function formFromAd(ad: AdRecord): EditableAdInput {
  return {
    code: ad.id,
    title: ad.title,
    branch: ad.branch,
    owner: ad.owner,
    type: ad.type,
    channel: ad.channel,
    publicationDate: ad.publicationDateIso || toInputDate(ad.publicationDate),
    period: ad.period,
    distributionArea: ad.distributionArea,
    payer: ad.payer,
    supplier: ad.supplier,
    amount: ad.amount,
    fundingSource: ad.fundingSource,
    language: ad.language,
    isTargeted: ad.isTargeted,
    targeting: ad.targeting,
    targetAudience: ad.targetAudience,
  };
}

function noticeHref(publicUrl: string) {
  try {
    return new URL(publicUrl).pathname;
  } catch {
    return publicUrl;
  }
}

function deadlineIcon(ad: AdRecord) {
  if (ad.deadlineState === "overdue") {
    return <AlertTriangle className="h-4 w-4 text-red-700" aria-hidden="true" />;
  }

  if (ad.missing.length === 0) {
    return <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />;
  }

  return <CircleDot className="h-4 w-4 text-orange-700" aria-hidden="true" />;
}

export function AppWorkspaceClient({ initialWorkspace }: { initialWorkspace: AppWorkspacePayload }) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(initialWorkspace.ads[0]?.id ?? "");
  const [mode, setMode] = useState<EditorMode | null>(null);
  const [form, setForm] = useState<EditableAdInput>(() => blankForm(initialWorkspace));
  const [saving, setSaving] = useState(false);
  const [actioning, setActioning] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const selectedAd = workspace.ads.find((ad) => ad.id === selectedId) ?? workspace.ads[0] ?? null;
  const writable = canManageAds(workspace);
  const reviewable = canReviewAds(workspace);
  const billing = workspace.billing;
  const filteredAds = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return workspace.ads;
    }

    return workspace.ads.filter((ad) =>
      [ad.id, ad.title, ad.branch, ad.campaign, ad.owner, ad.supplier, ad.distributionArea].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }, [query, workspace.ads]);

  async function refreshWorkspace() {
    setRefreshing(true);
    setError("");

    try {
      const response = await fetch("/api/app/ads?locale=cs", { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Refresh failed with ${response.status}`);
      }

      const payload = (await response.json()) as AppWorkspacePayload;
      setWorkspace(payload);
      setSelectedId((current) => (payload.ads.some((ad) => ad.id === current) ? current : payload.ads[0]?.id ?? ""));
    } catch {
      setError("Data se nepodařilo načíst. Zkuste obnovit stránku.");
    } finally {
      setRefreshing(false);
    }
  }

  function openCreate() {
    setForm(blankForm(workspace));
    setMode("create");
    setError("");
  }

  function openEdit(ad: AdRecord) {
    setForm(formFromAd(ad));
    setMode("edit");
    setError("");
  }

  async function saveAd() {
    if (!writable || saving || !form.title.trim() || !form.branch.trim()) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const isEdit = mode === "edit" && form.code;
      const response = await fetch(isEdit ? `/api/app/ads/${encodeURIComponent(form.code ?? "")}?locale=cs` : "/api/app/ads?locale=cs", {
        method: isEdit ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const payload = (await response.json().catch(() => ({}))) as { ad?: AdRecord; error?: string };

      if (!response.ok || !payload.ad) {
        throw new Error(payload.error || `Save failed with ${response.status}`);
      }

      const savedAd = payload.ad;
      setWorkspace((current) => workspaceWithAd(current, savedAd));
      setSelectedId(savedAd.id);
      setMode(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Záznam se nepodařilo uložit. Zkontrolujte povinná pole a zkuste to znovu.");
    } finally {
      setSaving(false);
    }
  }

  async function runWorkflowAction(ad: AdRecord, action: "approve" | "publish") {
    if (!reviewable || actioning) {
      return;
    }

    if (action === "publish" && !window.confirm("Publikovat a uzamknout tuto verzi reklamy? Další úpravy vytvoří novou verzi.")) {
      return;
    }

    setActioning(`${action}:${ad.id}`);
    setError("");

    try {
      const response = await fetch(`/api/app/ads/${encodeURIComponent(ad.id)}/${action}?locale=cs`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as { ad?: AdRecord; error?: string };

      if (!response.ok || !payload.ad) {
        throw new Error(payload.error || `Workflow action failed with ${response.status}`);
      }

      const nextAd = payload.ad;
      setWorkspace((current) => workspaceWithAd(current, nextAd));
      setSelectedId(nextAd.id);
    } catch (workflowError) {
      setError(
        workflowError instanceof Error
          ? workflowError.message
          : action === "approve"
            ? "Reklamu se nepodařilo schválit. Zkontrolujte povinné údaje a oprávnění."
            : "Reklamu se nepodařilo publikovat. Zkontrolujte povinné údaje a oprávnění.",
      );
    } finally {
      setActioning("");
    }
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
      {billing?.status === "TRIAL" || billing?.invoicePending ? (
        <div className="flex flex-col gap-3 rounded-md border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="font-semibold">
            {billing.invoicePending
              ? "Fakturace čeká na ruční schválení."
              : `Zkušební přístup běží ještě ${billing.trialDaysLeft} ${billing.trialDaysLeft === 1 ? "den" : billing.trialDaysLeft < 5 ? "dny" : "dní"}.`}
            <span className="ml-1 font-normal">Po skončení se pracovní přístupy uzamknou, dokud účet nebude aktivní.</span>
          </div>
          {billing.canManageBilling ? (
            <Link href="/app/activate" className="inline-flex items-center justify-center gap-2 rounded-md bg-[#11161c] px-3 py-2 font-semibold text-white">
              <CreditCard size={15} />
              Aktivovat účet
            </Link>
          ) : (
            <span className="inline-flex items-center justify-center rounded-md border border-orange-200 bg-white px-3 py-2 font-semibold">
              Aktivaci řeší admin strany
            </span>
          )}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <article className="rounded-md border border-black/10 bg-white p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#d94410]">Pracovní plocha</p>
          <h1 className="mt-2 text-3xl font-semibold text-black">Reklamy, které jsou ve vašem rozsahu</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#59616b]">
            Přidávejte a upravujte záznamy na jednom místě. Pokud chybí povinné údaje, stav se propíše do semaforu a QR balíček zůstane zablokovaný.
          </p>
          {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div> : null}
        </article>

        <aside className="rounded-md border border-black/10 bg-white p-5">
          <div className="text-sm font-semibold text-[#68707a]">Přihlášený uživatel</div>
          <div className="mt-2 text-lg font-semibold text-black">{workspace.user.name}</div>
          <div className="break-all text-sm text-[#59616b]">{workspace.user.email}</div>
          <div className="mt-4 grid gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-[#68707a]">Role</span>
              <span className="font-semibold text-[#20242a]">{workspace.membership.role}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#68707a]">Rozsah</span>
              <span className="text-right font-semibold text-[#20242a]">{workspace.membership.scope}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#68707a]">Účet</span>
              <span className="text-right font-semibold text-[#20242a]">{workspace.billing?.statusLabel ?? "nenastaveno"}</span>
            </div>
          </div>
        </aside>
      </div>

      <section className="grid gap-3 md:grid-cols-5">
        {[
          ["V evidenci", workspace.counts.all],
          ["K doplnění", workspace.counts.needsData],
          ["Ke kontrole", workspace.counts.review],
          ["Schváleno", workspace.counts.approved],
          ["Publikováno", workspace.counts.published],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-black/10 bg-white p-4">
            <div className="text-sm font-medium text-[#68707a]">{label}</div>
            <div className="mt-2 text-3xl font-semibold leading-none text-black">{value}</div>
          </div>
        ))}
      </section>

      {mode ? (
        <Editor mode={mode} form={form} saving={saving} writable={writable} onCancel={() => setMode(null)} onChange={setForm} onSave={saveAd} />
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="overflow-hidden rounded-md border border-black/10 bg-white">
          <div className="flex flex-col gap-3 border-b border-black/10 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-black">Databáze reklam</h2>
              <p className="mt-1 text-sm text-[#59616b]">
                Tarif: {workspace.billing?.effectivePrice ?? "-"} · Platba: {workspace.billing?.methodLabel ?? "-"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="flex h-10 min-w-[240px] items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-sm text-[#59616b]">
                <Search size={15} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Hledat reklamu" className="min-w-0 flex-1 outline-none" />
              </label>
              <button
                type="button"
                onClick={refreshWorkspace}
                disabled={refreshing}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-sm font-semibold text-[#25282d]"
              >
                <RefreshCw size={15} />
                Obnovit
              </button>
              <button
                type="button"
                onClick={openCreate}
                disabled={!writable}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-[#f45d1f] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#c9cdd3]"
              >
                <Plus size={15} />
                Přidat
              </button>
            </div>
          </div>

          <MobileAdCards ads={filteredAds} selectedId={selectedAd?.id ?? ""} writable={writable} onSelect={setSelectedId} onEdit={openEdit} />

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-[#f7f7f8] text-xs text-[#68707a]">
                <tr>
                  {["Kód", "Materiál", "Pobočka", "Kampaň", "Termín", "Chybí", "Workflow", "Akce"].map((head) => (
                    <th key={head} className="px-4 py-3 font-semibold">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/8">
                {filteredAds.map((ad) => (
                  <tr key={ad.id} className={selectedAd?.id === ad.id ? "bg-orange-50/55" : "bg-white"}>
                    <td className="whitespace-nowrap px-4 py-4 font-mono text-xs font-semibold text-[#20242a]">
                      <button type="button" onClick={() => setSelectedId(ad.id)} className="underline-offset-2 hover:underline">
                        {ad.id}
                      </button>
                    </td>
                    <td className="px-4 py-4 font-medium text-[#20242a]">{ad.title}</td>
                    <td className="px-4 py-4 text-[#59616b]">{ad.branch}</td>
                    <td className="px-4 py-4 text-[#59616b]">{ad.campaign}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {deadlineIcon(ad)}
                        <div>
                          <div className="font-semibold text-[#20242a]">{ad.publicationDate}</div>
                          <div className="text-xs text-[#68707a]">{ad.deadlineLabel}</div>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[220px] px-4 py-4 text-[#59616b]">{ad.missing.length ? ad.missing.join(", ") : "-"}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${workflowClass[ad.workflowStatus]}`}>
                        {ad.workflowLabel}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => openEdit(ad)} disabled={!writable} className="font-semibold text-[#d94410] disabled:text-[#9aa0a8]">
                          upravit
                        </button>
                        <a className="font-semibold text-[#25282d]" href={noticeHref(ad.publicUrl)}>
                          otevřít
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredAds.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-[#59616b]" colSpan={8}>
                      V tomto rozsahu zatím nejsou žádné reklamy.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <DetailPanel
          ad={selectedAd}
          writable={writable}
          reviewable={reviewable}
          actioning={actioning}
          onEdit={openEdit}
          onApprove={(ad) => runWorkflowAction(ad, "approve")}
          onPublish={(ad) => runWorkflowAction(ad, "publish")}
        />
      </section>
    </section>
  );
}

function Editor({
  form,
  mode,
  saving,
  writable,
  onCancel,
  onChange,
  onSave,
}: {
  form: EditableAdInput;
  mode: EditorMode;
  saving: boolean;
  writable: boolean;
  onCancel: () => void;
  onChange: (form: EditableAdInput) => void;
  onSave: () => void;
}) {
  const requiredFields = new Set<keyof EditableAdInput>([
    "title",
    "branch",
    "owner",
    "type",
    "publicationDate",
    "period",
    "distributionArea",
    "payer",
    "supplier",
    "amount",
    "fundingSource",
    "language",
  ]);
  const fieldGroups = [
    {
      title: "Materiál",
      fields: [
        ["title", "Název reklamy", "text"],
        ["branch", "Pobočka / oblast", "text"],
        ["type", "Typ materiálu", "text"],
        ["publicationDate", "Datum zveřejnění", "date"],
        ["period", "Období šíření", "text"],
        ["language", "Jazyk", "text"],
      ],
    },
    {
      title: "Povinné údaje oznámení",
      fields: [
        ["owner", "Zadavatel", "text"],
        ["payer", "Plátce", "text"],
        ["supplier", "Dodavatel", "text"],
        ["amount", "Náklady / rozpočet", "text"],
        ["fundingSource", "Původ financí", "text"],
        ["distributionArea", "Oblast šíření", "text"],
      ],
    },
    {
      title: "Cílení",
      fields: [
        ["targeting", "Popis cílení", "text"],
        ["targetAudience", "Cílové publikum", "text"],
      ],
    },
  ] as const;

  return (
    <section className="rounded-md border border-[#f45d1f]/35 bg-white">
      <div className="flex flex-col gap-3 border-b border-black/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-black">{mode === "create" ? "Nová reklama" : `Úprava reklamy ${form.code}`}</h2>
          <p className="mt-1 text-sm text-[#59616b]">Uložení ihned přepočítá chybějící údaje, workflow stav a dostupnost QR balíčku.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="inline-flex items-center gap-2 rounded-md border border-black/10 px-3 py-2 text-sm font-semibold">
            <X size={15} />
            Zavřít
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !writable || !form.title.trim() || !form.branch.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-[#11161c] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#c9cdd3]"
          >
            <Save size={15} />
            {saving ? "Ukládám" : "Uložit"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 p-4">
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
            <h3 className="text-sm font-semibold text-black">{group.title}</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {group.fields.map(([key, label, type]) => {
                const required = requiredFields.has(key);
                const empty = required && !String(form[key] ?? "").trim();

                return (
                  <label key={key} className="grid gap-1.5 text-sm font-semibold text-[#20242a]">
                    <span className="flex items-center gap-2">
                      {label}
                      {required ? <span className={empty ? "text-xs text-red-700" : "text-xs text-[#68707a]"}>povinné</span> : null}
                    </span>
                    <input
                      type={type}
                      value={form[key]}
                      onChange={(event) => onChange({ ...form, [key]: event.target.value })}
                      className={`rounded-md border bg-white px-3 py-2 font-normal outline-none focus:border-[#f45d1f] ${
                        empty ? "border-red-300" : "border-black/10"
                      }`}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        <label className="flex items-center gap-3 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#20242a] sm:max-w-sm">
          <input
            type="checkbox"
            checked={form.isTargeted}
            onChange={(event) => onChange({ ...form, isTargeted: event.target.checked })}
            className="size-4 accent-[#f45d1f]"
          />
          Používá cílení
        </label>
      </div>
    </section>
  );
}

function MobileAdCards({
  ads,
  selectedId,
  writable,
  onSelect,
  onEdit,
}: {
  ads: AdRecord[];
  selectedId: string;
  writable: boolean;
  onSelect: (id: string) => void;
  onEdit: (ad: AdRecord) => void;
}) {
  return (
    <div className="grid gap-3 p-3 md:hidden">
      {ads.map((ad) => (
        <article key={ad.id} className={`rounded-md border p-3 ${selectedId === ad.id ? "border-[#f45d1f] bg-orange-50/55" : "border-black/10 bg-white"}`}>
          <button type="button" onClick={() => onSelect(ad.id)} className="block w-full text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono text-xs font-semibold text-[#68707a]">{ad.id}</div>
                <h3 className="mt-1 text-base font-semibold leading-6 text-black">{ad.title}</h3>
                <p className="mt-1 text-sm text-[#59616b]">{ad.branch} · {ad.campaign}</p>
              </div>
              <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-semibold ${workflowClass[ad.workflowStatus]}`}>{ad.workflowLabel}</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm text-[#59616b]">
              {deadlineIcon(ad)}
              <span>{ad.publicationDate} · {ad.deadlineLabel}</span>
            </div>
            {ad.missing.length ? <p className="mt-2 text-sm font-semibold text-red-700">Chybí: {ad.missing.join(", ")}</p> : null}
          </button>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => onEdit(ad)}
              disabled={!writable}
              className="inline-flex flex-1 justify-center rounded-md bg-[#11161c] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#c9cdd3]"
            >
              Upravit
            </button>
            <a className="inline-flex flex-1 justify-center rounded-md border border-black/10 px-3 py-2 text-sm font-semibold text-[#d94410]" href={noticeHref(ad.publicUrl)}>
              Otevřít
            </a>
          </div>
        </article>
      ))}
      {ads.length === 0 ? <div className="rounded-md border border-black/10 bg-white p-5 text-center text-sm text-[#59616b]">V tomto rozsahu zatím nejsou žádné reklamy.</div> : null}
    </div>
  );
}

function DetailPanel({
  ad,
  writable,
  reviewable,
  actioning,
  onEdit,
  onApprove,
  onPublish,
}: {
  ad: AdRecord | null;
  writable: boolean;
  reviewable: boolean;
  actioning: string;
  onEdit: (ad: AdRecord) => void;
  onApprove: (ad: AdRecord) => void;
  onPublish: (ad: AdRecord) => void;
}) {
  if (!ad) {
    return (
      <aside className="rounded-md border border-black/10 bg-white p-5 text-sm text-[#59616b]">
        Vyberte nebo přidejte reklamu.
      </aside>
    );
  }

  const rows = [
    ["Veřejná URL", ad.publicUrl],
    ["Plátce", ad.payer || "chybí"],
    ["Dodavatel", ad.supplier || "chybí"],
    ["Částka", ad.amount || "chybí"],
    ["Původ financí", ad.fundingSource || "chybí"],
    ["Období", ad.period || "chybí"],
    ["Oblast", ad.distributionArea || "chybí"],
    ["Cílení", ad.isTargeted ? ad.targetAudience || "chybí publikum" : "nepoužito"],
    ["Verze", `v${ad.version}${ad.locked ? " · zamčeno" : ""}`],
  ];

  return (
    <aside className="rounded-md border border-black/10 bg-white">
      <div className="border-b border-black/10 p-4">
        <div className="text-sm font-semibold text-[#68707a]">Vybraný záznam</div>
        <h2 className="mt-1 text-xl font-semibold text-black">{ad.title}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${workflowClass[ad.workflowStatus]}`}>{ad.workflowLabel}</span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-black/10 bg-[#fbfbfc] px-2.5 py-1 text-xs font-semibold text-[#25282d]">
            <FileArchive size={13} />
            {ad.id}
          </span>
        </div>
      </div>
      <div className="grid gap-2 p-4 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 rounded-md border border-black/10 p-3">
            <span className="text-xs font-semibold uppercase text-[#68707a]">{label}</span>
            <span className={value === "chybí" || value === "chybí publikum" ? "font-semibold text-red-700" : "font-semibold text-[#20242a]"}>{value}</span>
          </div>
        ))}
      </div>
      {ad.missing.length ? (
        <div className="mx-4 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm font-semibold text-orange-800">
          Chybí: {ad.missing.join(", ")}
        </div>
      ) : (
        <div className="mx-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          Povinné údaje jsou kompletní.
        </div>
      )}
      <div className="grid gap-2 p-4">
        <button
          type="button"
          onClick={() => onEdit(ad)}
          disabled={!writable}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#11161c] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#c9cdd3]"
        >
          <Edit3 size={15} />
          Upravit údaje
        </button>
        {ad.canApprove ? (
          <button
            type="button"
            onClick={() => onApprove(ad)}
            disabled={!reviewable || actioning === `approve:${ad.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 disabled:cursor-not-allowed disabled:text-[#9aa0a8]"
          >
            <CheckCircle2 size={15} />
            {actioning === `approve:${ad.id}` ? "Schvaluji" : "Schválit"}
          </button>
        ) : null}
        {ad.canPublish ? (
          <button
            type="button"
            onClick={() => onPublish(ad)}
            disabled={!reviewable || actioning === `publish:${ad.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-[#f45d1f]/30 bg-[#fff4ef] px-4 py-3 text-sm font-semibold text-[#d94410] disabled:cursor-not-allowed disabled:text-[#9aa0a8]"
          >
            <ArrowUpRight size={15} />
            {actioning === `publish:${ad.id}` ? "Publikuji" : "Publikovat"}
          </button>
        ) : null}
        <button
          type="button"
          disabled={!ad.canDownloadQr}
          onClick={() => {
            window.location.href = `/api/app/ads/${encodeURIComponent(ad.id)}/qr-package?locale=cs`;
          }}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-black/10 px-4 py-3 text-sm font-semibold text-[#25282d] disabled:cursor-not-allowed disabled:text-[#9aa0a8]"
        >
          <Download size={15} />
          Stáhnout QR balíček
        </button>
        <a className="inline-flex items-center justify-center gap-2 rounded-md border border-black/10 px-4 py-3 text-sm font-semibold text-[#d94410]" href={noticeHref(ad.publicUrl)}>
          Otevřít oznámení
          <ArrowUpRight size={15} />
        </a>
      </div>
    </aside>
  );
}
