"use client";

import { Plus, RefreshCw, Search } from "lucide-react";
import type { AdRecord } from "@/lib/workspace-types";
import { deadlineIcon, noticeHref, workflowClass } from "./workspace-ad-ui";

export function AdListPanel({
  ads,
  selectedId,
  query,
  refreshing,
  loadingMore,
  loadedCount,
  totalCount,
  hasMore,
  writable,
  canCreate,
  onQueryChange,
  onRefresh,
  onLoadMore,
  onCreate,
  onSelect,
  onEdit,
}: {
  ads: AdRecord[];
  selectedId: string;
  query: string;
  refreshing: boolean;
  loadingMore: boolean;
  loadedCount: number;
  totalCount: number;
  hasMore: boolean;
  writable: boolean;
  canCreate: boolean;
  onQueryChange: (value: string) => void;
  onRefresh: () => void;
  onLoadMore: () => void;
  onCreate: () => void;
  onSelect: (id: string) => void;
  onEdit: (ad: AdRecord) => void;
}) {
  return (
    <aside className="min-w-0 rounded-md border border-black/10 bg-white">
      <div className="border-b border-black/10 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-black">Reklamy</h2>
            <p className="mt-1 text-sm leading-5 text-[#59616b]">Vyberte reklamu a pracujte s jejím detailem.</p>
          </div>
          <span className="rounded-md border border-black/10 bg-[#fbfbfc] px-2.5 py-1 text-sm font-semibold text-[#25282d]">
            {loadedCount}/{totalCount}
          </span>
        </div>
        <div className="mt-3 grid gap-2">
          <label className="flex h-10 min-w-0 items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-sm text-[#59616b]">
            <Search size={15} />
            <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Hledat reklamu" className="min-w-0 flex-1 outline-none" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-3 text-sm font-semibold text-[#25282d]"
            >
              <RefreshCw size={15} />
              Obnovit
            </button>
            <button
              type="button"
              onClick={onCreate}
              disabled={!canCreate}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#f45d1f] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#c9cdd3]"
            >
              <Plus size={15} />
              Přidat
            </button>
          </div>
        </div>
      </div>

      <div className="grid max-h-[620px] gap-2 overflow-y-auto p-3 xl:max-h-[calc(100vh-220px)]">
        {ads.map((ad) => (
          <article key={ad.id} className={`rounded-md border p-3 ${selectedId === ad.id ? "border-[#f45d1f] bg-orange-50/55" : "border-black/10 bg-white"}`}>
            <button type="button" onClick={() => onSelect(ad.id)} className="block w-full text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-xs font-semibold text-[#68707a]">{ad.id}</div>
                  <h3 className="mt-1 text-base font-semibold leading-6 text-black">{ad.title}</h3>
                  <p className="mt-1 text-sm text-[#59616b]">
                    {ad.branch} · {ad.campaign}
                    {ad.candidate ? ` · ${ad.candidate}` : ""}
                  </p>
                </div>
                <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-semibold ${workflowClass[ad.workflowStatus]}`}>{ad.workflowLabel}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-[#59616b]">
                {deadlineIcon(ad)}
                <span>
                  {ad.publicationDate} · {ad.deadlineLabel}
                </span>
              </div>
              {ad.missing.length ? (
                <p className="mt-2 text-sm font-semibold text-red-700">
                  Chybí: {ad.missing.slice(0, 3).join(", ")}
                  {ad.missing.length > 3 ? ` +${ad.missing.length - 3}` : ""}
                </p>
              ) : null}
            </button>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onEdit(ad)}
                disabled={!writable}
                className="inline-flex justify-center rounded-md bg-[#11161c] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#c9cdd3]"
              >
                Upravit
              </button>
              <a className="inline-flex justify-center rounded-md border border-black/10 px-3 py-2 text-sm font-semibold text-[#d94410]" href={noticeHref(ad.publicUrl)}>
                Otevřít
              </a>
            </div>
          </article>
        ))}
        {ads.length === 0 ? <div className="rounded-md border border-black/10 bg-white p-5 text-center text-sm text-[#59616b]">Zatím tu nejsou žádné reklamy.</div> : null}
        {hasMore ? (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#25282d] disabled:cursor-not-allowed disabled:bg-[#f1f2f4]"
          >
            {loadingMore ? "Načítám další" : `Načíst další reklamy (${loadedCount}/${totalCount})`}
          </button>
        ) : null}
      </div>
    </aside>
  );
}
