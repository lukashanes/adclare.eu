"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { AppAuditRecord } from "@/lib/workspace-types";

type AuditPage = {
  events: AppAuditRecord[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

type AuditFilters = {
  actor: string;
  action: string;
  entityType: string;
  outcome: string;
  requestId: string;
  dateFrom: string;
  dateTo: string;
};

const emptyFilters: AuditFilters = {
  actor: "",
  action: "",
  entityType: "",
  outcome: "",
  requestId: "",
  dateFrom: "",
  dateTo: "",
};

function auditActionLabel(action: string) {
  const labels: Record<string, string> = {
    approve_ad: "Schválení reklamy",
    create_new_version: "Nová verze reklamy",
    create_ad: "Nová reklama",
    create_branch: "Nová pobočka",
    create_campaign: "Nová kampaň",
    create_candidate: "Nový kandidát",
    create_compliance_report: "Nové hlášení",
    confirm_compliance_report: "Potvrzení hlášení",
    create_invitation: "Pozvánka",
    download_ad_asset: "Stažení souboru",
    download_audit_package: "Stažení auditního balíčku",
    download_qr_package: "Stažení QR balíčku",
    export_workspace_archive: "Stažení archivu",
    import_ad: "Import reklamy",
    import_ads_batch: "Import agendy",
    login_magic_link: "Přihlášení",
    notify_compliance_report: "Upozornění na hlášení",
    notify_compliance_report_resolution: "Odeslání výsledku hlášení",
    logout: "Odhlášení",
    prepare_audit_export: "Příprava auditu",
    publish_ad: "Publikace reklamy",
    request_ad_changes: "Vrácení k doplnění",
    resolve_compliance_report: "Vyřízení hlášení",
    retry_invitation_email: "Opětovné odeslání pozvánky",
    revoke_invitation: "Zrušení pozvánky",
    update_ad: "Úprava reklamy",
    update_branch: "Úprava pobočky",
    update_campaign: "Úprava kampaně",
    update_candidate: "Úprava kandidáta",
    update_member: "Úprava přístupu",
    update_profile: "Úprava profilu",
    update_tenant_settings: "Nastavení",
    upload_ad_asset: "Nahrání podkladu",
  };

  return labels[action.toLowerCase()] ?? action.split("_").filter(Boolean).join(" ");
}

function formattedJson(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object" && Object.keys(value as Record<string, unknown>).length === 0) {
    return "";
  }

  return JSON.stringify(value, null, 2);
}

function queryFor(filters: AuditFilters, page: number) {
  const query = new URLSearchParams({
    locale: "cs",
    page: String(page),
    limit: "50",
  });

  for (const [key, value] of Object.entries(filters)) {
    if (value.trim()) {
      query.set(key, value.trim());
    }
  }

  return query;
}

export function AuditPanel() {
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AuditPage>({ events: [], total: 0, page: 1, limit: 50, hasMore: false });
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/app/audit?${queryFor(filters, page)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as AuditPage & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "Historii se nepodařilo načíst.");
        }

        setResult(payload);
        setSelectedId((current) => payload.events.some((event) => event.id === current) ? current : (payload.events[0]?.id ?? ""));
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Historii se nepodařilo načíst.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [filters, page]);

  const selected = useMemo(
    () => result.events.find((event) => event.id === selectedId) ?? result.events[0] ?? null,
    [result.events, selectedId],
  );
  const pageCount = Math.max(1, Math.ceil(result.total / result.limit));

  function updateFilter(key: keyof AuditFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  return (
    <section id="audit" className="scroll-mt-6 rounded-md border border-black/10 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-black">Historie změn</h2>
          <p className="mt-1 text-sm text-[#59616b]">Kdo, kdy a co změnil, schválil, zveřejnil nebo stáhl.</p>
        </div>
        <span className="inline-flex w-fit rounded-md border border-black/10 bg-[#fbfbfc] px-3 py-1.5 text-sm font-semibold text-[#25282d]">
          {result.total} záznamů
        </span>
      </div>

      <div className="mt-4 grid gap-2 rounded-md border border-black/10 bg-[#fbfbfc] p-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1 text-xs font-semibold text-[#68707a]">
          Kdo
          <input value={filters.actor} onChange={(event) => updateFilter("actor", event.target.value)} placeholder="Jméno nebo e-mail" className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm text-black outline-none focus:border-[#f45d1f]" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[#68707a]">
          Akce
          <input value={filters.action} onChange={(event) => updateFilter("action", event.target.value)} placeholder="např. update_ad" className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm text-black outline-none focus:border-[#f45d1f]" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[#68707a]">
          Objekt
          <input value={filters.entityType} onChange={(event) => updateFilter("entityType", event.target.value)} placeholder="např. ad" className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm text-black outline-none focus:border-[#f45d1f]" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[#68707a]">
          Výsledek
          <select value={filters.outcome} onChange={(event) => updateFilter("outcome", event.target.value)} className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm text-black outline-none focus:border-[#f45d1f]">
            <option value="">Všechny</option>
            <option value="success">Úspěch</option>
            <option value="failure">Chyba</option>
            <option value="denied">Zamítnuto</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[#68707a]">
          Od
          <input value={filters.dateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} type="date" className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm text-black outline-none focus:border-[#f45d1f]" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[#68707a]">
          Do
          <input value={filters.dateTo} onChange={(event) => updateFilter("dateTo", event.target.value)} type="date" className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm text-black outline-none focus:border-[#f45d1f]" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[#68707a] md:col-span-2">
          Request ID
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-3 text-[#8b929b]" />
            <input value={filters.requestId} onChange={(event) => updateFilter("requestId", event.target.value)} placeholder="Dohledat jeden požadavek" className="h-10 w-full rounded-md border border-black/10 bg-white pl-9 pr-3 text-sm text-black outline-none focus:border-[#f45d1f]" />
          </div>
        </label>
      </div>

      {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div> : null}

      <div className="mt-4 grid gap-2">
        {result.events.map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => setSelectedId(event.id)}
            className={`grid min-w-0 gap-2 rounded-md border p-3 text-left md:grid-cols-[170px_minmax(140px,220px)_minmax(0,1fr)] ${
              selected?.id === event.id ? "border-[#f45d1f] bg-orange-50/55" : "border-black/10 bg-[#fbfbfc]"
            }`}
          >
            <span className="text-xs font-semibold text-[#68707a]">{new Date(event.createdAt).toLocaleString("cs-CZ")}</span>
            <span className="min-w-0 truncate text-sm font-semibold text-[#20242a]">{event.actor}</span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-[#d94410]">{auditActionLabel(event.action)}</span>
              <span className="mt-1 block text-sm leading-6 text-[#59616b]">{event.message}</span>
            </span>
          </button>
        ))}
        {!loading && result.events.length === 0 ? <div className="rounded-md border border-black/10 p-3 text-sm text-[#59616b]">Filtru neodpovídá žádný záznam.</div> : null}
        {loading ? <div className="rounded-md border border-black/10 p-3 text-sm text-[#59616b]">Načítám historii...</div> : null}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading} aria-label="Předchozí stránka" className="inline-flex size-10 items-center justify-center rounded-md border border-black/10 bg-white disabled:opacity-40">
          <ChevronLeft size={17} />
        </button>
        <span className="text-sm font-semibold text-[#59616b]">Strana {result.page} z {pageCount}</span>
        <button type="button" onClick={() => setPage((current) => current + 1)} disabled={!result.hasMore || loading} aria-label="Další stránka" className="inline-flex size-10 items-center justify-center rounded-md border border-black/10 bg-white disabled:opacity-40">
          <ChevronRight size={17} />
        </button>
      </div>

      {selected ? (
        <div className="mt-4 rounded-md border border-black/10 bg-[#11161c] p-4 text-white">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-white/60">Detail záznamu</div>
              <h3 className="mt-2 text-lg font-semibold">{auditActionLabel(selected.action)}</h3>
              <p className="mt-1 text-sm leading-6 text-white/72">{selected.message}</p>
            </div>
            <span className={`w-fit rounded-md px-2.5 py-1 text-xs font-semibold ${selected.outcome === "success" ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"}`}>
              {selected.outcome}
            </span>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Aktér", selected.actor],
              ["Role", selected.actorRole || "-"],
              ["Oblast", selected.actorScope || "-"],
              ["Objekt", [selected.entityType, selected.entityLabel || selected.entityId].filter(Boolean).join(": ") || "-"],
              ["Request ID", selected.requestId || "-"],
              ["Correlation ID", selected.correlationId || "-"],
              ["Sekvence", selected.sequence || "-"],
              ["Hash", selected.entryHash || "-"],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-md border border-white/15 bg-white/8 p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-white/56">{label}</div>
                <div className="mt-1 break-all text-sm font-semibold text-white">{value}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-3">
            {[
              ["Před změnou", selected.before],
              ["Po změně", selected.after],
              ["Metadata", selected.metadata],
            ].map(([label, value]) => {
              const text = formattedJson(value);

              return (
                <div key={String(label)} className="min-w-0 rounded-md border border-white/15 bg-white/8 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-white/56">{String(label)}</div>
                  {text ? <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-white/78">{text}</pre> : <p className="mt-2 text-sm text-white/56">Bez dat.</p>}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
