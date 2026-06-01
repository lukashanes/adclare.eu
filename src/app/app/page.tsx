import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowUpRight, LogOut, ShieldCheck } from "lucide-react";
import { getAppSession } from "@/lib/app-auth";
import { getAppWorkspacePayload } from "@/lib/admin-demo-db";
import { AppWorkspaceClient } from "./AppWorkspaceClient";

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

      <AppWorkspaceClient initialWorkspace={workspace} />
    </main>
  );
}
