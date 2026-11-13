"use client";

import { useEffect, useState } from "react";

type Report = {
  id: string;
  adCode: string;
  adTitle: string;
  branch: string;
  reporterName: string;
  reporterEmail: string;
  reason: string;
  details: string;
  status: "OPEN" | "REVIEWING" | "RESOLVED" | "REJECTED";
  resolution: string;
  createdAt: string;
  resolvedAt: string;
  responseDueAt: string;
  responseOverdue: boolean;
};

type Payload = {
  reports: Report[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  canResolve: boolean;
};

const statusLabels: Record<Report["status"], string> = {
  OPEN: "Nové",
  REVIEWING: "Prověřuje se",
  RESOLVED: "Vyřešeno",
  REJECTED: "Zamítnuto",
};

export function ComplianceReportsPanel() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");

  useEffect(() => {
    let active = true;

    fetch(`/api/app/compliance-reports?page=${page}&limit=25`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(response.status === 403 ? "K hlášením nemáte přístup." : "Hlášení se nepodařilo načíst.");
        }

        return (await response.json()) as Payload;
      })
      .then((next) => {
        if (active) {
          setPayload(next);
          setError("");
        }
      })
      .catch((reason) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Hlášení se nepodařilo načíst.");
        }
      });

    return () => {
      active = false;
    };
  }, [page]);

  async function updateReport(report: Report, form: HTMLFormElement) {
    const data = new FormData(form);
    setSavingId(report.id);
    setError("");

    try {
      const response = await fetch(`/api/app/compliance-reports/${encodeURIComponent(report.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: String(data.get("status") ?? report.status),
          resolution: String(data.get("resolution") ?? ""),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; report?: Partial<Report> };

      if (!response.ok || !result.report) {
        throw new Error(result.error || "Hlášení se nepodařilo uložit.");
      }

      setPayload((current) =>
        current
          ? {
              ...current,
              reports: current.reports.map((item) => (item.id === report.id ? { ...item, ...result.report } : item)),
            }
          : current,
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Hlášení se nepodařilo uložit.");
    } finally {
      setSavingId("");
    }
  }

  if (error && !payload) {
    return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div>;
  }

  return (
    <section className="rounded-md border border-black/10 bg-white p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-black">Hlášení k veřejným oznámením</h2>
          <p className="mt-1 text-sm text-[#59616b]">Podněty veřejnosti jsou uložené u konkrétní reklamy a v auditní stopě.</p>
        </div>
        <span className="rounded-md bg-[#f1f2f4] px-2.5 py-1 text-sm font-semibold text-[#59616b]">{payload?.total ?? 0}</span>
      </div>

      {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {!payload ? <p className="mt-4 text-sm text-[#68707a]">Načítám hlášení…</p> : null}
      {payload && payload.reports.length === 0 ? <p className="mt-4 text-sm text-[#68707a]">Zatím nepřišlo žádné hlášení.</p> : null}

      <div className="mt-4 grid gap-3">
        {payload?.reports.map((report) => (
          <form
            key={report.id}
            onSubmit={(event) => {
              event.preventDefault();
              void updateReport(report, event.currentTarget);
            }}
            className="grid gap-3 rounded-md border border-black/10 bg-[#fbfbfc] p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-black">{report.adCode} · {report.adTitle}</div>
                <div className="mt-1 text-xs text-[#68707a]">{report.branch} · {new Date(report.createdAt).toLocaleString("cs-CZ")}</div>
                {report.responseDueAt && report.status !== "RESOLVED" && report.status !== "REJECTED" ? (
                  <div className={`mt-1 text-xs font-semibold ${report.responseOverdue ? "text-red-700" : "text-[#9a3d12]"}`}>
                    {report.responseOverdue ? "Lhůta pro odpověď uplynula" : "Odpovědět do"}{" "}
                    {new Date(report.responseDueAt).toLocaleString("cs-CZ")}
                  </div>
                ) : null}
              </div>
              <span className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs font-semibold">{statusLabels[report.status]}</span>
            </div>
            <p className="text-sm leading-6 text-[#20242a]">{report.details}</p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-[#20242a]">{report.reporterName || "Neuvedené jméno"}</span>
              {report.reporterEmail ? <a href={`mailto:${report.reporterEmail}`} className="font-semibold text-[#d94410]">{report.reporterEmail}</a> : null}
            </div>
            {payload.canResolve ? (
              <div className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)_auto]">
                <select name="status" defaultValue={report.status} className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm">
                  <option value="OPEN">Nové</option>
                  <option value="REVIEWING">Prověřuje se</option>
                  <option value="RESOLVED">Vyřešeno</option>
                  <option value="REJECTED">Zamítnuto</option>
                </select>
                <input name="resolution" defaultValue={report.resolution} placeholder="Způsob vyřízení" className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm" />
                <button type="submit" disabled={savingId === report.id} className="rounded-md bg-[#11161c] px-3 py-2 text-sm font-semibold text-white disabled:bg-[#aeb4bc]">
                  Uložit
                </button>
              </div>
            ) : null}
          </form>
        ))}
      </div>

      {payload && payload.total > payload.limit ? (
        <div className="mt-4 flex justify-between gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-md border border-black/10 px-3 py-2 text-sm font-semibold disabled:opacity-40">
            Předchozí
          </button>
          <span className="self-center text-sm text-[#68707a]">Strana {page}</span>
          <button type="button" disabled={!payload.hasMore} onClick={() => setPage((value) => value + 1)} className="rounded-md border border-black/10 px-3 py-2 text-sm font-semibold disabled:opacity-40">
            Další
          </button>
        </div>
      ) : null}
    </section>
  );
}
