"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CreditCard,
  Database,
  Download,
  FileArchive,
  FileText,
  History,
  Mail,
  Menu,
  PencilLine,
  Plus,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  X,
} from "lucide-react";
import type { AdRecord, AdminAdsPayload, EditableAdInput, Locale, Status } from "@/lib/admin-demo-types";

type AdminSection = "ads" | "branches" | "users" | "billing" | "audit";
type DetailPanel = "data" | "qr" | "approval" | "audit";
type EditorMode = "create" | "edit";

const statusClass: Record<Status, string> = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-orange-200 bg-orange-50 text-orange-700",
  blocked: "border-red-200 bg-red-50 text-red-700",
  review: "border-sky-200 bg-sky-50 text-sky-700",
};

function blankForm(locale: Locale): EditableAdInput {
  return {
    code: "",
    title: locale === "cs" ? "Plakát: bezpečné okolí škol" : "Poster: safer school areas",
    branch: locale === "cs" ? "Nová pobočka" : "New branch",
    owner: locale === "cs" ? "Lokální tým" : "Local team",
    type: locale === "cs" ? "plakát" : "poster",
    publicationDate: "2026-09-25",
    period: locale === "cs" ? "25. 9. - 8. 10. 2026" : "25 Sep - 8 Oct 2026",
    payer: locale === "cs" ? "Demo strana" : "Demo party",
    amount: "",
    fundingSource: "",
    targeting: locale === "cs" ? "nepoužito" : "not used",
  };
}

function formFromAd(ad: AdRecord): EditableAdInput {
  return {
    code: ad.id,
    title: ad.title,
    branch: ad.branch,
    owner: ad.owner,
    type: ad.type,
    publicationDate: toInputDate(ad.publicationDate),
    period: ad.period,
    payer: ad.payer,
    amount: ad.amount,
    fundingSource: ad.fundingSource,
    targeting: ad.targeting,
  };
}

function toInputDate(value: string) {
  const parts = value.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);

  if (!parts) {
    return "2026-09-25";
  }

  return `${parts[3]}-${parts[2].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
}

const content = {
  cs: {
    back: "Zpět na web",
    tenant: "Demo strana",
    layer: "Vrstva: centrála strany",
    campaign: "Komunální volby 2026",
    demo: "Demo adminu napojené na Postgres. Tabulka, doplnění dat a auditní export čtou a zapisují přes API.",
    search: "Hledat kód, materiál, pobočku",
    nav: ["Reklamy", "Pobočky", "Uživatelé", "Fakturace", "Audit"],
    tabs: {
      all: "Vše",
      blocked: "Po termínu",
      warning: "K doplnění",
      review: "Kontrola",
      ready: "Hotovo",
    },
    stats: {
      all: "V evidenci",
      ready: "Připraveno",
      warning: "K doplnění",
      blocked: "Po termínu",
      review: "Kontrola",
    },
    tableTitle: "Databáze reklam pro stranu",
    tableHeads: ["Kód", "Materiál", "Pobočka", "Typ", "Publikace", "Chybí", "Stav"],
    selected: "Vybraný záznam",
    panels: {
      data: "Data",
      qr: "QR / oznámení",
      approval: "Schválení",
      audit: "Audit",
    },
    actions: {
      complete: "Doplnit chybějící data",
      export: "Připravit auditní ZIP",
      invite: "Pozvat uživatele",
      download: "Stáhnout QR balíček",
      add: "Přidat reklamu",
      edit: "Upravit záznam",
      save: "Uložit do databáze",
      cancel: "Zrušit",
    },
    fields: {
      advertiser: "Zadavatel",
      payer: "Plátce",
      amount: "Částka za sdělení",
      funding: "Původ částek",
      period: "Období šíření",
      targeting: "Cílení",
    },
    states: {
      complete: "vyplněno",
      missing: "chybí",
      notUsed: "nepoužito",
      blocked: "blokováno",
      ready: "připraveno",
      saving: "ukládám",
    },
    qrRows: ["Veřejná URL", "QR výstupy", "Tiskový label", "Repozitář"],
    approvalRows: ["Lokální tým", "Grafik", "Kontrolor", "Publikace"],
    auditRows: ["Změny záznamu", "Soubory", "QR a oznámení", "Export"],
    empty: "Žádné reklamy neodpovídají filtrům.",
    inviteTitle: "Pozvánky",
    billingTitle: "Fakturace",
    auditTitle: "Auditní stav",
    branchesTitle: "Pobočky",
    sections: {
      ads: "Reklamy",
      branches: "Pobočky a oblasti",
      users: "Uživatelé a pozvánky",
      billing: "Fakturace",
      audit: "Audit",
    },
    sectionIntro: {
      branches: "Přehled jednotek podle reálných dat z reklam. Centrála hned vidí, kde chybí údaje.",
      users: "Pozvánky pro pobočky, kandidáty a externí grafiky. Každý dostane jen svou část práce.",
      billing: "Stav předplatného, fakturace a limity pro placený účet strany.",
      audit: "Kontrolní pohled nad chybějícími údaji, QR výstupy a auditními exporty.",
    },
    sectionLabels: {
      records: "záznamů",
      missing: "s mezerou",
      role: "role",
      access: "přístup",
      amount: "částka",
      status: "stav",
      period: "období",
    },
    loading: "Načítám databázi reklam...",
    dbError: "Databázi se nepodařilo načíst. Zkontroluj DATABASE_URL, migrace a seed.",
    saveError: "Zápis do databáze selhal. Zkontroluj připojení a migrace.",
    editorTitle: {
      create: "Nová reklama",
      edit: "Úprava reklamy",
    },
    editNote: "Změny se ukládají do databáze a přepočítají stav povinných údajů.",
    formFields: {
      code: "Kód",
      title: "Název materiálu",
      branch: "Pobočka / oblast",
      owner: "Zadavatel",
      type: "Typ",
      publicationDate: "Datum zveřejnění",
      period: "Období šíření",
      payer: "Plátce",
      amount: "Částka",
      fundingSource: "Původ financí",
      targeting: "Cílení",
    },
    completeNote: "Po doplnění se změna uloží do databáze, reklama přejde do kontroly a QR výstupy se odblokují.",
  },
  en: {
    back: "Back to website",
    tenant: "Demo party",
    layer: "Layer: party headquarters",
    campaign: "Municipal election 2026",
    demo: "Admin demo connected to Postgres. The table, data completion and audit export read and write through API routes.",
    search: "Search code, asset, branch",
    nav: ["Ads", "Branches", "Users", "Billing", "Audit"],
    tabs: {
      all: "All",
      blocked: "Overdue",
      warning: "To complete",
      review: "Review",
      ready: "Ready",
    },
    stats: {
      all: "In registry",
      ready: "Ready",
      warning: "To complete",
      blocked: "Overdue",
      review: "Review",
    },
    tableTitle: "Party ad database",
    tableHeads: ["Code", "Asset", "Branch", "Type", "Publication", "Missing", "Status"],
    selected: "Selected record",
    panels: {
      data: "Data",
      qr: "QR / notice",
      approval: "Approval",
      audit: "Audit",
    },
    actions: {
      complete: "Complete missing data",
      export: "Prepare audit ZIP",
      invite: "Invite user",
      download: "Download QR package",
      add: "Add ad",
      edit: "Edit record",
      save: "Save to database",
      cancel: "Cancel",
    },
    fields: {
      advertiser: "Advertiser",
      payer: "Payer",
      amount: "Ad amount",
      funding: "Funding source",
      period: "Distribution period",
      targeting: "Targeting",
    },
    states: {
      complete: "complete",
      missing: "missing",
      notUsed: "not used",
      blocked: "blocked",
      ready: "ready",
      saving: "saving",
    },
    qrRows: ["Public URL", "QR outputs", "Print label", "Repository"],
    approvalRows: ["Local team", "Designer", "Reviewer", "Publication"],
    auditRows: ["Record changes", "Files", "QR and notice", "Export"],
    empty: "No ads match the filters.",
    inviteTitle: "Invites",
    billingTitle: "Billing",
    auditTitle: "Audit status",
    branchesTitle: "Branches",
    sections: {
      ads: "Ads",
      branches: "Branches and areas",
      users: "Users and invites",
      billing: "Billing",
      audit: "Audit",
    },
    sectionIntro: {
      branches: "Unit overview based on the ad database. Headquarters immediately sees where data is missing.",
      users: "Invites for branches, candidates and external designers. Each person gets only their part of the work.",
      billing: "Subscription, invoicing and limit state for the paid party account.",
      audit: "Control view for missing data, QR outputs and audit exports.",
    },
    sectionLabels: {
      records: "records",
      missing: "with gap",
      role: "role",
      access: "access",
      amount: "amount",
      status: "status",
      period: "period",
    },
    loading: "Loading ad database...",
    dbError: "The database could not be loaded. Check DATABASE_URL, migrations and seed.",
    saveError: "Database write failed. Check the connection and migrations.",
    editorTitle: {
      create: "New ad",
      edit: "Edit ad",
    },
    editNote: "Changes are saved to the database and required-data status is recalculated.",
    formFields: {
      code: "Code",
      title: "Asset title",
      branch: "Branch / area",
      owner: "Advertiser",
      type: "Type",
      publicationDate: "Publication date",
      period: "Distribution period",
      payer: "Payer",
      amount: "Amount",
      fundingSource: "Funding source",
      targeting: "Targeting",
    },
    completeNote: "After completion, the change is saved to the database, the ad moves to review and QR outputs unlock.",
  },
} as const;

export function AdminDemoClient({ locale }: { locale: Locale }) {
  const t = content[locale];
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [activeSection, setActiveSection] = useState<AdminSection>("ads");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [panel, setPanel] = useState<DetailPanel>("data");
  const [ads, setAds] = useState<AdRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [exportReady, setExportReady] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode | null>(null);
  const [form, setForm] = useState<EditableAdInput>(() => blankForm(locale));

  const selectedAd = ads.find((ad) => ad.id === selectedId) ?? ads[0];
  const headerTitle = activeSection === "ads" ? t.tableTitle : t.sections[activeSection];
  const navItems = [
    { key: "ads", icon: Database, label: t.nav[0] },
    { key: "branches", icon: UsersRound, label: t.nav[1] },
    { key: "users", icon: Mail, label: t.nav[2] },
    { key: "billing", icon: CreditCard, label: t.nav[3] },
    { key: "audit", icon: History, label: t.nav[4] },
  ] as const;

  function openSection(section: AdminSection) {
    setActiveSection(section);
    setMobileNavOpen(false);
  }

  function openCreateEditor() {
    setForm(blankForm(locale));
    setEditorMode("create");
    setActiveSection("ads");
  }

  function openEditEditor(ad: AdRecord) {
    setForm(formFromAd(ad));
    setEditorMode("edit");
    setActiveSection("ads");
  }

  function closeEditor() {
    setEditorMode(null);
    setError("");
  }

  useEffect(() => {
    let cancelled = false;

    async function loadAds() {
    setLoading(true);
    setError("");

      try {
        const response = await fetch(`/api/admin/demo/ads?locale=${locale}`, { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`Admin API failed with ${response.status}`);
        }

        const payload = (await response.json()) as AdminAdsPayload;

        if (cancelled) {
          return;
        }

        setAds(payload.ads);
        setSelectedId((current) => (payload.ads.some((ad) => ad.id === current) ? current : payload.ads[0]?.id ?? ""));
      } catch {
        if (!cancelled) {
          setError(t.dbError);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAds();

    return () => {
      cancelled = true;
    };
  }, [locale, t.dbError]);

  const visibleAds = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return ads.filter((ad) => {
      const matchesStatus = statusFilter === "all" || ad.status === statusFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [ad.id, ad.title, ad.branch, ad.owner, ad.type].some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesStatus && matchesQuery;
    });
  }, [ads, query, statusFilter]);

  const counts = useMemo(
    () => ({
      all: ads.length,
      ready: ads.filter((ad) => ad.status === "ready").length,
      warning: ads.filter((ad) => ad.status === "warning").length,
      blocked: ads.filter((ad) => ad.status === "blocked").length,
      review: ads.filter((ad) => ad.status === "review").length,
    }),
    [ads],
  );

  async function completeSelectedAd() {
    if (!selectedAd || saving) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/demo/ads/${encodeURIComponent(selectedAd.id)}/complete?locale=${locale}`, {
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error(`Admin update failed with ${response.status}`);
      }

      const payload = (await response.json()) as { ad: AdRecord };
      setAds((current) => current.map((ad) => (ad.id === payload.ad.id ? payload.ad : ad)));
      setSelectedId(payload.ad.id);
      setPanel("approval");
    } catch {
      setError(t.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function prepareAuditExport() {
    if (!selectedAd || saving) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/demo/ads/${encodeURIComponent(selectedAd.id)}/audit-export`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Audit export failed with ${response.status}`);
      }

      setPanel("audit");
      setActiveSection("ads");
      setExportReady(true);
    } catch {
      setError(t.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function saveAd() {
    setSaving(true);
    setError("");

    try {
      const isEdit = editorMode === "edit" && form.code;
      const response = await fetch(
        isEdit
          ? `/api/admin/demo/ads/${encodeURIComponent(form.code ?? "")}?locale=${locale}`
          : `/api/admin/demo/ads?locale=${locale}`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        },
      );

      if (!response.ok) {
        throw new Error(`Save failed with ${response.status}`);
      }

      const payload = (await response.json()) as { ad: AdRecord };
      setAds((current) => {
        const exists = current.some((ad) => ad.id === payload.ad.id);
        return exists ? current.map((ad) => (ad.id === payload.ad.id ? payload.ad : ad)) : [payload.ad, ...current];
      });
      setSelectedId(payload.ad.id);
      setPanel("data");
      setEditorMode(null);
    } catch {
      setError(t.saveError);
    } finally {
      setSaving(false);
    }
  }

  const sidebar = (
    <>
      <div className="flex h-18 items-center justify-between gap-3 px-6">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-md bg-[#f45d1f] text-white">
            <ShieldCheck size={21} />
          </span>
          <span className="text-2xl font-semibold">Adclare</span>
        </div>
        <button
          type="button"
          className="grid size-9 place-items-center rounded-md border border-white/10 text-white/80 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-label={locale === "cs" ? "Zavřít menu" : "Close menu"}
        >
          <X size={18} />
        </button>
      </div>

      <nav className="mt-4 grid gap-1 px-3 text-sm text-white/74">
        {navItems.map(({ key, icon: NavIcon, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => openSection(key)}
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-left transition hover:bg-white/10 hover:text-white ${
              activeSection === key ? "bg-white/10 text-white" : ""
            }`}
          >
            <NavIcon size={17} />
            {label}
          </button>
        ))}
      </nav>

      <div className="mx-6 mt-auto border-t border-white/10 py-5 text-sm leading-6 text-white/62">
        <div className="font-semibold text-white">{t.tenant}</div>
        <div>{t.layer}</div>
        <div>{t.campaign}</div>
      </div>
    </>
  );

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[#11161c]">
      <div className="grid min-h-screen lg:grid-cols-[248px_1fr]">
        <aside className="hidden border-r border-white/10 bg-[#11161c] text-white lg:flex lg:flex-col">
          {sidebar}
        </aside>

        {mobileNavOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/45"
              onClick={() => setMobileNavOpen(false)}
              aria-label={locale === "cs" ? "Zavřít menu" : "Close menu"}
            />
            <aside className="relative flex h-full w-[280px] max-w-[82vw] flex-col bg-[#11161c] text-white shadow-2xl">
              {sidebar}
            </aside>
          </div>
        ) : null}

        <section className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-black/10 bg-white/94 backdrop-blur-xl">
            <div className="flex h-18 items-center justify-between gap-3 px-4 sm:px-5 lg:px-8">
              <div className="min-w-0">
                <Link
                  href={`/${locale}`}
                  className="mb-1 inline-flex items-center gap-2 text-sm font-semibold text-[#59616b] transition hover:text-[#d94410]"
                >
                  <ArrowLeft size={16} />
                  {t.back}
                </Link>
                <div className="flex min-w-0 items-center gap-2">
                  <h1 className="truncate text-xl font-semibold text-black">{headerTitle}</h1>
                  <span className="hidden rounded-md bg-orange-50 px-2 py-1 text-xs font-semibold text-[#d94410] xl:inline-flex">
                    {t.layer}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="grid size-10 place-items-center rounded-md border border-black/10 bg-white text-[#25282d] lg:hidden"
                  onClick={() => setMobileNavOpen(true)}
                  aria-label={locale === "cs" ? "Otevřít menu" : "Open menu"}
                >
                  <Menu size={18} />
                </button>
                <button
                  type="button"
                  className="grid size-10 place-items-center rounded-md border border-black/10 bg-white text-[#25282d]"
                  onClick={() => {
                    openSection("ads");
                    setPanel("approval");
                  }}
                >
                  <Bell size={17} />
                </button>
                <button
                  type="button"
                  className="hidden items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#25282d] sm:inline-flex"
                  disabled={!selectedAd || saving}
                  onClick={prepareAuditExport}
                >
                  <FileArchive size={16} />
                  {t.actions.export}
                </button>
                <button
                  type="button"
                  className="hidden items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#25282d] md:inline-flex"
                  onClick={openCreateEditor}
                >
                  <Plus size={16} />
                  {t.actions.add}
                </button>
                <button
                  type="button"
                  className="inline-flex size-10 items-center justify-center gap-2 rounded-md bg-[#f45d1f] text-sm font-semibold text-white shadow-sm sm:size-auto sm:px-3 sm:py-2"
                  onClick={() => openSection("users")}
                >
                  <Mail size={16} />
                  <span className="hidden sm:inline">{t.actions.invite}</span>
                </button>
              </div>
            </div>
          </header>

          <div className="grid gap-4 px-4 py-5 sm:px-5 lg:px-8">
            <section className="rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm leading-6 text-[#8a3a13]">
              {t.demo}
            </section>

            {loading ? (
              <section className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800">
                {t.loading}
              </section>
            ) : null}

            {error ? (
              <section className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </section>
            ) : null}

            {activeSection === "ads" ? (
              <>
                <div className="flex justify-end md:hidden">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-md bg-[#11161c] px-3 py-2 text-sm font-semibold text-white"
                    onClick={openCreateEditor}
                  >
                    <Plus size={16} />
                    {t.actions.add}
                  </button>
                </div>

                {editorMode ? (
                  <AdEditor
                    form={form}
                    mode={editorMode}
                    saving={saving}
                    locale={locale}
                    onCancel={closeEditor}
                    onChange={setForm}
                    onSave={saveAd}
                    t={t}
                  />
                ) : null}

                <section className="grid gap-3 md:grid-cols-5">
                  {(["all", "blocked", "warning", "review", "ready"] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStatusFilter(key)}
                      className={`rounded-md border p-4 text-left transition ${
                        statusFilter === key ? "border-[#f45d1f] bg-white shadow-sm" : "border-black/10 bg-white"
                      }`}
                    >
                      <div className="text-sm font-medium text-[#59616b]">{t.stats[key]}</div>
                      <div className="mt-2 text-3xl font-semibold leading-none text-black">{counts[key]}</div>
                    </button>
                  ))}
                </section>

                <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
                  <article className="min-w-0 overflow-hidden rounded-md border border-black/10 bg-white">
                <div className="flex flex-col gap-3 border-b border-black/10 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-black">{t.tableTitle}</h2>
                    <p className="mt-1 text-sm text-[#59616b]">
                      {t.tenant} · {t.campaign}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <label className="flex min-w-0 items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-[#59616b] sm:w-72">
                      <Search size={16} />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={t.search}
                        className="min-w-0 flex-1 bg-transparent text-[#20242a] outline-none placeholder:text-[#8b929b]"
                      />
                    </label>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-black/10 px-3 py-2 text-sm font-semibold text-[#25282d]"
                    >
                      <SlidersHorizontal size={16} />
                      <span>{t.tabs[statusFilter]}</span>
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="bg-[#f7f7f8] text-xs text-[#68707a]">
                      <tr>
                        {t.tableHeads.map((head) => (
                          <th key={head} className="px-4 py-3 font-semibold">
                            {head}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/8">
                      {visibleAds.map((ad) => (
                        <tr
                          key={ad.id}
                          className={`cursor-pointer bg-white transition hover:bg-orange-50/55 ${
                            selectedAd?.id === ad.id ? "bg-orange-50/70" : ""
                          }`}
                          onClick={() => {
                            setSelectedId(ad.id);
                            setPanel("data");
                            setExportReady(false);
                          }}
                        >
                          <td className="whitespace-nowrap px-4 py-4 font-mono text-xs font-semibold text-[#20242a]">
                            {ad.id}
                          </td>
                          <td className="px-4 py-4 font-medium text-[#20242a]">{ad.title}</td>
                          <td className="px-4 py-4 text-[#59616b]">{ad.branch}</td>
                          <td className="px-4 py-4 text-[#59616b]">{ad.type}</td>
                          <td className="whitespace-nowrap px-4 py-4 text-[#20242a]">{ad.publicationDate}</td>
                          <td className="px-4 py-4 text-[#59616b]">{ad.missing.length ? ad.missing.join(", ") : "-"}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${statusClass[ad.status]}`}>
                              {ad.statusLabel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {visibleAds.length === 0 ? (
                  <div className="border-t border-black/10 p-8 text-center text-sm text-[#59616b]">{t.empty}</div>
                ) : null}
              </article>

              <aside className="rounded-md border border-black/10 bg-white">
                {selectedAd ? (
                  <>
                    <div className="border-b border-black/10 p-5">
                      <div className="text-sm font-semibold text-[#59616b]">{t.selected}</div>
                      <div className="mt-2 flex items-start justify-between gap-4">
                        <div>
                          <h2 className="text-2xl font-semibold text-black">{selectedAd.id}</h2>
                          <p className="mt-1 text-sm font-medium text-[#20242a]">{selectedAd.title}</p>
                          <p className="mt-1 text-sm leading-6 text-[#59616b]">
                            {selectedAd.branch} · {selectedAd.type} · {selectedAd.publicationDate}
                          </p>
                        </div>
                        <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${statusClass[selectedAd.status]}`}>
                          {selectedAd.statusLabel}
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-4 gap-2">
                        {(["data", "qr", "approval", "audit"] as const).map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setPanel(item)}
                            className={`rounded-md px-2 py-2 text-xs font-semibold transition ${
                              panel === item ? "bg-[#11161c] text-white" : "bg-[#f7f7f8] text-[#59616b] hover:bg-orange-50 hover:text-[#d94410]"
                            }`}
                          >
                            {t.panels[item]}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => openEditEditor(selectedAd)}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#25282d]"
                      >
                        <PencilLine size={16} />
                        {t.actions.edit}
                      </button>
                    </div>

                    <div className="p-5">
                      {panel === "data" ? (
                        <DataPanel ad={selectedAd} locale={locale} onComplete={completeSelectedAd} saving={saving} t={t} />
                      ) : null}
                      {panel === "qr" ? <QrPanel ad={selectedAd} locale={locale} t={t} /> : null}
                      {panel === "approval" ? <ApprovalPanel ad={selectedAd} t={t} /> : null}
                      {panel === "audit" ? (
                        <AuditPanel ad={selectedAd} exportReady={exportReady} onExport={prepareAuditExport} t={t} />
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="p-6 text-sm font-medium text-[#59616b]">{loading ? t.loading : t.empty}</div>
                )}
                  </aside>
                </section>
              </>
            ) : (
              <AdminSectionPanel activeSection={activeSection} ads={ads} counts={counts} locale={locale} t={t} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function AdminSectionPanel({
  activeSection,
  ads,
  counts,
  locale,
  t,
}: {
  activeSection: Exclude<AdminSection, "ads">;
  ads: AdRecord[];
  counts: Record<Status | "all", number>;
  locale: Locale;
  t: (typeof content)[Locale];
}) {
  const branchRows = Array.from(
    ads.reduce((map, ad) => {
      const current = map.get(ad.branch) ?? { name: ad.branch, records: 0, missing: 0 };
      current.records += 1;
      current.missing += ad.missing.length > 0 ? 1 : 0;
      map.set(ad.branch, current);
      return map;
    }, new Map<string, { name: string; records: number; missing: number }>()),
  ).map(([, value]) => value);

  const userRows =
    locale === "cs"
      ? [
          ["Centrála", "party_admin", "plný přístup", "aktivní"],
          ["Ostrava-Jih", "local_admin", "vlastní pobočka", "pozvánka odeslána"],
          ["Externí grafik", "designer", "QR a podklady", "omezený přístup"],
        ]
      : [
          ["Headquarters", "party_admin", "full access", "active"],
          ["Ostrava-South", "local_admin", "own branch", "invite sent"],
          ["External designer", "designer", "QR and assets", "limited access"],
        ];

  const billingRows =
    locale === "cs"
      ? [
          ["Velká strana", "99 EUR / měsíc", "aktivní"],
          ["Uživatelé", "neomezeně", "bez limitu"],
          ["Archiv", "zákonná doba + export", "zapnuto"],
        ]
      : [
          ["Large party", "EUR 99 / month", "active"],
          ["Users", "unlimited", "no limit"],
          ["Archive", "legal period + export", "enabled"],
        ];

  const auditRows =
    locale === "cs"
      ? [
          ["Reklamy v evidenci", String(counts.all), "databáze"],
          ["K doplnění nebo po termínu", String(counts.warning + counts.blocked), "kontrola"],
          ["V kontrole", String(counts.review), "schvalování"],
          ["Připravené QR / archiv", String(counts.ready), "výstup"],
        ]
      : [
          ["Ads in registry", String(counts.all), "database"],
          ["To complete or overdue", String(counts.warning + counts.blocked), "review"],
          ["In review", String(counts.review), "approval"],
          ["Ready QR / archive", String(counts.ready), "output"],
        ];

  const rows =
    activeSection === "branches"
      ? branchRows.map((row) => [row.name, `${row.records} ${t.sectionLabels.records}`, `${row.missing} ${t.sectionLabels.missing}`])
      : activeSection === "users"
        ? userRows
        : activeSection === "billing"
          ? billingRows
          : auditRows;

  return (
    <section className="rounded-md border border-black/10 bg-white">
      <div className="border-b border-black/10 p-5">
        <h2 className="text-xl font-semibold text-black">{t.sections[activeSection]}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#59616b]">{t.sectionIntro[activeSection]}</p>
      </div>

      <div className="grid gap-3 p-5 md:grid-cols-3">
        {rows.map((row) => (
          <div key={row[0]} className="rounded-md border border-black/10 bg-[#fbfbfc] p-4">
            <div className="text-sm font-semibold text-black">{row[0]}</div>
            <div className="mt-3 grid gap-2 text-sm text-[#59616b]">
              <div className="flex items-center justify-between gap-3">
                <span>{activeSection === "billing" ? t.sectionLabels.amount : t.sectionLabels.role}</span>
                <span className="text-right font-semibold text-[#20242a]">{row[1]}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>{activeSection === "audit" ? t.sectionLabels.status : t.sectionLabels.access}</span>
                <span className="text-right font-semibold text-[#20242a]">{row[2]}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AdEditor({
  form,
  mode,
  saving,
  locale,
  onCancel,
  onChange,
  onSave,
  t,
}: {
  form: EditableAdInput;
  mode: EditorMode;
  saving: boolean;
  locale: Locale;
  onCancel: () => void;
  onChange: (form: EditableAdInput) => void;
  onSave: () => void | Promise<void>;
  t: (typeof content)[Locale];
}) {
  const fields = [
    ["code", t.formFields.code, "text"],
    ["title", t.formFields.title, "text"],
    ["branch", t.formFields.branch, "text"],
    ["owner", t.formFields.owner, "text"],
    ["type", t.formFields.type, "text"],
    ["publicationDate", t.formFields.publicationDate, "date"],
    ["period", t.formFields.period, "text"],
    ["payer", t.formFields.payer, "text"],
    ["amount", t.formFields.amount, "text"],
    ["fundingSource", t.formFields.fundingSource, "text"],
    ["targeting", t.formFields.targeting, "text"],
  ] as const;

  return (
    <section className="rounded-md border border-[#f45d1f]/35 bg-white">
      <div className="flex flex-col gap-3 border-b border-black/10 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black">{t.editorTitle[mode]}</h2>
          <p className="mt-1 text-sm leading-6 text-[#59616b]">{t.editNote}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-md border border-black/10 px-3 py-2 text-sm font-semibold text-[#25282d]"
          >
            {t.actions.cancel}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !form.title.trim() || !form.branch.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#11161c] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#c9cdd3]"
          >
            <Save size={16} />
            {saving ? t.states.saving : t.actions.save}
          </button>
        </div>
      </div>

      <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
        {fields.map(([key, label, type]) => (
          <label key={key} className="grid gap-1.5 text-sm font-semibold text-[#20242a]">
            {label}
            <input
              type={type}
              value={form[key]}
              disabled={mode === "edit" && key === "code"}
              onChange={(event) => onChange({ ...form, [key]: event.target.value })}
              className="rounded-md border border-black/10 bg-white px-3 py-2 font-normal text-[#20242a] outline-none transition focus:border-[#f45d1f] disabled:bg-[#f4f6f8] disabled:text-[#8b929b]"
            />
          </label>
        ))}
      </div>

      {locale === "cs" ? (
        <p className="px-5 pb-5 text-xs leading-5 text-[#68707a]">
          Pokud chybí částka nebo původ financí, záznam zůstane ve stavu k doplnění a QR balíček nepůjde stáhnout.
        </p>
      ) : (
        <p className="px-5 pb-5 text-xs leading-5 text-[#68707a]">
          If amount or funding source is missing, the record stays incomplete and the QR package remains blocked.
        </p>
      )}
    </section>
  );
}

function DataPanel({
  ad,
  locale,
  onComplete,
  saving,
  t,
}: {
  ad: AdRecord;
  locale: Locale;
  onComplete: () => void;
  saving: boolean;
  t: (typeof content)[Locale];
}) {
  const rows = [
    [t.fields.advertiser, ad.owner, "ok"],
    [t.fields.payer, ad.payer, "ok"],
    [t.fields.amount, ad.amount || t.states.missing, ad.amount ? "ok" : "bad"],
    [t.fields.funding, ad.fundingSource || t.states.missing, ad.fundingSource ? "ok" : "bad"],
    [t.fields.period, ad.period, "ok"],
    [t.fields.targeting, ad.targeting || t.states.notUsed, "ok"],
  ] as const;

  return (
    <div>
      <div className="grid gap-3 text-sm">
        {rows.map((row) => (
          <div key={row[0]} className="flex items-center justify-between gap-4 rounded-md border border-black/10 p-3">
            <span className="text-[#59616b]">{row[0]}</span>
            <span className={`text-right font-semibold ${row[2] === "ok" ? "text-emerald-700" : "text-red-700"}`}>
              {row[1]}
            </span>
          </div>
        ))}
      </div>

      {ad.missing.length ? (
        <button
          type="button"
          onClick={onComplete}
          disabled={saving}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#f45d1f] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#c9cdd3]"
        >
          <Check size={16} />
          {saving ? t.states.saving : t.actions.complete}
        </button>
      ) : (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
          {locale === "cs" ? "Povinná data jsou kompletní." : "Required data is complete."}
        </div>
      )}
      <p className="mt-3 text-xs leading-5 text-[#68707a]">{t.completeNote}</p>
    </div>
  );
}

function QrPanel({ ad, locale, t }: { ad: AdRecord; locale: Locale; t: (typeof content)[Locale] }) {
  const isReady = ad.missing.length === 0;
  const rows = [
    [t.qrRows[0], ad.publicUrl, isReady],
    [t.qrRows[1], "SVG, PNG, PDF", isReady],
    [t.qrRows[2], "30 mm / 40 mm / A4", isReady],
    [t.qrRows[3], isReady ? t.states.ready : t.states.blocked, isReady],
  ] as const;

  return (
    <div>
      <div className="grid gap-3 text-sm">
        {rows.map((row) => (
          <div key={row[0]} className="flex items-center justify-between gap-4 rounded-md border border-black/10 p-3">
            <span className="text-[#59616b]">{row[0]}</span>
            <span className={`text-right font-semibold ${row[2] ? "text-[#20242a]" : "text-red-700"}`}>{row[1]}</span>
          </div>
        ))}
      </div>
      <button
        type="button"
        disabled={!isReady}
        onClick={() => {
          window.location.href = `/api/admin/demo/ads/${encodeURIComponent(ad.id)}/qr-package?locale=${locale}`;
        }}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#11161c] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#c9cdd3]"
      >
        <Download size={16} />
        {t.actions.download}
      </button>
    </div>
  );
}

function ApprovalPanel({ ad, t }: { ad: AdRecord; t: (typeof content)[Locale] }) {
  const rows = [
    [t.approvalRows[0], ad.missing.length ? t.states.missing : t.states.complete, ad.missing.length === 0],
    [t.approvalRows[1], ad.missing.length ? t.states.blocked : t.states.ready, ad.missing.length === 0],
    [t.approvalRows[2], ad.status === "review" ? t.states.ready : t.states.blocked, ad.status === "review"],
    [t.approvalRows[3], ad.status === "ready" ? t.states.ready : t.states.blocked, ad.status === "ready"],
  ] as const;

  return (
    <div className="grid gap-3 text-sm">
      {rows.map((row) => (
        <div key={row[0]} className="flex items-center justify-between gap-4 rounded-md border border-black/10 p-3">
          <span className="text-[#59616b]">{row[0]}</span>
          <span className={`inline-flex items-center gap-1.5 font-semibold ${row[2] ? "text-emerald-700" : "text-red-700"}`}>
            {row[2] ? <CheckCircle2 size={15} /> : <CircleAlert size={15} />}
            {row[1]}
          </span>
        </div>
      ))}
    </div>
  );
}

function AuditPanel({
  ad,
  exportReady,
  onExport,
  t,
}: {
  ad: AdRecord;
  exportReady: boolean;
  onExport: () => void | Promise<void>;
  t: (typeof content)[Locale];
}) {
  const rows = [
    [t.auditRows[0], ad.missing.length ? "3" : "5"],
    [t.auditRows[1], "2"],
    [t.auditRows[2], ad.missing.length ? t.states.blocked : t.states.ready],
    [t.auditRows[3], exportReady ? t.states.ready : "ZIP"],
  ] as const;

  return (
    <div>
      <div className="grid gap-3 text-sm">
        {rows.map((row) => (
          <div key={row[0]} className="flex items-center justify-between gap-4 rounded-md border border-black/10 p-3">
            <span className="text-[#59616b]">{row[0]}</span>
            <span className="text-right font-semibold text-[#20242a]">{row[1]}</span>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onExport}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-[#25282d]"
      >
        <FileText size={16} />
        {t.actions.export}
      </button>
    </div>
  );
}
