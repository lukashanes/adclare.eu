import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowUpRight, CheckCircle2, CircleDot, FileArchive, LogOut, ShieldCheck } from "lucide-react";
import { getAppSession } from "@/lib/app-auth";
import { getAppWorkspacePayload } from "@/lib/admin-demo-db";
import type { AdRecord } from "@/lib/admin-demo-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Adclare aplikace",
  description: "Pracovní plocha pro správu politické reklamy v Adclare.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

function workflowClass(status: AdRecord["workflowStatus"]) {
  const classes: Record<AdRecord["workflowStatus"], string> = {
    DRAFT: "border-slate-200 bg-slate-50 text-slate-700",
    NEEDS_DATA: "border-orange-200 bg-orange-50 text-orange-800",
    READY_FOR_REVIEW: "border-sky-200 bg-sky-50 text-sky-800",
    APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-800",
    PUBLISHED: "border-[#b9e0d2] bg-[#ecf8f2] text-[#0f6b45]",
    ARCHIVED: "border-neutral-200 bg-neutral-50 text-neutral-700",
  };

  return classes[status];
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

function noticeHref(publicUrl: string) {
  try {
    return new URL(publicUrl).pathname;
  } catch {
    return publicUrl;
  }
}

export default async function AppPage() {
  const headerStore = await headers();
  const session = await getAppSession(headerStore.get("cookie"));

  if (!session) {
    redirect("/login");
  }

  const workspace = await getAppWorkspacePayload(session.userId, "cs");

  if (!workspace) {
    redirect("/login?error=session");
  }

  const countCards = [
    ["V evidenci", workspace.counts.all],
    ["K doplnění", workspace.counts.needsData],
    ["Ke kontrole", workspace.counts.review],
    ["Schváleno", workspace.counts.approved],
    ["Publikováno", workspace.counts.published],
  ] as const;

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[#11161c]">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-[#f45d1f] text-white">
              <ShieldCheck size={21} />
            </span>
            <div>
              <div className="text-xl font-semibold text-black">Adclare</div>
              <div className="text-sm text-[#59616b]">{workspace.tenant.name}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link
              href={`/repo/${workspace.tenant.slug}?locale=cs`}
              className="inline-flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 font-semibold text-[#25282d] hover:border-[#f45d1f]"
            >
              Veřejný repozitář
              <ArrowUpRight size={15} />
            </Link>
            <form action="/api/logout" method="post">
              <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-[#11161c] px-3 py-2 font-semibold text-white">
                <LogOut size={15} />
                Odhlásit
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <article className="rounded-md border border-black/10 bg-white p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#d94410]">Pracovní plocha</p>
            <h1 className="mt-2 text-3xl font-semibold text-black">Reklamy, které jsou ve vašem rozsahu</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#59616b]">
              Přihlášený uživatel vidí jen data podle své role a pobočky. Červené a oranžové záznamy ukazují, kde chybí povinné údaje před zveřejněním.
            </p>
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
          {countCards.map(([label, value]) => (
            <div key={label} className="rounded-md border border-black/10 bg-white p-4">
              <div className="text-sm font-medium text-[#68707a]">{label}</div>
              <div className="mt-2 text-3xl font-semibold leading-none text-black">{value}</div>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-md border border-black/10 bg-white">
          <div className="flex flex-col gap-2 border-b border-black/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-black">Databáze reklam</h2>
              <p className="mt-1 text-sm text-[#59616b]">
                Tarif: {workspace.billing?.effectivePrice ?? "-"} · Platba: {workspace.billing?.methodLabel ?? "-"}
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-md border border-black/10 bg-[#fbfbfc] px-3 py-2 text-sm font-semibold text-[#25282d]">
              <FileArchive size={15} />
              Audit a QR jsou vázané na každý záznam
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-[#f7f7f8] text-xs text-[#68707a]">
                <tr>
                  {["Kód", "Materiál", "Pobočka", "Kampaň", "Termín", "Chybí", "Workflow", "Oznámení"].map((head) => (
                    <th key={head} className="px-4 py-3 font-semibold">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/8">
                {workspace.ads.map((ad) => (
                  <tr key={ad.id} className="bg-white">
                    <td className="whitespace-nowrap px-4 py-4 font-mono text-xs font-semibold text-[#20242a]">{ad.id}</td>
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
                      <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${workflowClass(ad.workflowStatus)}`}>
                        {ad.workflowLabel}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <a className="inline-flex items-center gap-1.5 font-semibold text-[#d94410] hover:text-[#a92f09]" href={noticeHref(ad.publicUrl)}>
                        otevřít
                        <ArrowUpRight size={14} />
                      </a>
                    </td>
                  </tr>
                ))}
                {workspace.ads.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-[#59616b]" colSpan={8}>
                      V tomto rozsahu zatím nejsou žádné reklamy.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
