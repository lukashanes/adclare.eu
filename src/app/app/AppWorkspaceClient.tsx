"use client";

import { type RefObject, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowUpRight, Building2, CheckCircle2, CircleDot, Copy, Download, Edit3, FileArchive, FileSpreadsheet, FolderKanban, Paperclip, Plus, QrCode, Save, ShieldCheck, Upload, Users } from "lucide-react";
import type { AdImportResult, AdRecord, AppBranchUpdateInput, AppCampaignInput, AppCandidateInput, AppMemberUpdateInput, AppTenantSettingsInput, AppWorkspacePayload, EditableAdInput, InviteInput } from "@/lib/workspace-types";
import { AdListPanel } from "./workspace-ad-list";
import { noticeHref, workflowClass } from "./workspace-ad-ui";
import { BranchesPanel, CampaignsPanel, CandidatesPanel, SettingsPanel } from "./workspace-admin-panels";
import { apiError, fetchApiJson, jsonRequest } from "./workspace-api";
import { Editor } from "./workspace-editor";
import { PeoplePanel } from "./workspace-people-panel";

type EditorMode = "create" | "edit";
type WorkspaceSection = "ads" | "review" | "campaigns" | "branches" | "people" | "archive" | "settings";

const workspaceSectionIds = ["ads", "review", "campaigns", "branches", "people", "archive", "settings"] as const;

function sectionFromHash(hash: string): WorkspaceSection | null {
  const value = hash.replace(/^#/, "");

  return workspaceSectionIds.includes(value as WorkspaceSection) ? (value as WorkspaceSection) : null;
}

function accessSentence(workspace: AppWorkspacePayload) {
  if (workspace.membership.scope === "celá strana") {
    return "Zobrazují se všechna data.";
  }

  return `Zobrazují se data pro ${workspace.membership.scope}.`;
}

function canManageAds(workspace: AppWorkspacePayload) {
  return workspace.permissions.canEditAds;
}

function canReviewAds(workspace: AppWorkspacePayload) {
  return workspace.permissions.canApproveAds || workspace.permissions.canPublishAds;
}

function initialSelectedAdId(workspace: AppWorkspacePayload) {
  if (canReviewAds(workspace)) {
    const reviewAd = workspace.ads.find((ad) => ad.workflowStatus === "READY_FOR_REVIEW");

    if (reviewAd) {
      return reviewAd.id;
    }
  }

  return workspace.ads[0]?.id ?? "";
}

function countFlagsForAd(ad: AdRecord): AppWorkspacePayload["counts"] {
  return {
    all: 1,
    needsData: ad.workflowStatus === "NEEDS_DATA" ? 1 : 0,
    review: ad.workflowStatus === "READY_FOR_REVIEW" ? 1 : 0,
    approved: ad.workflowStatus === "APPROVED" ? 1 : 0,
    published: ad.workflowStatus === "PUBLISHED" ? 1 : 0,
    blocked: ad.status === "blocked" ? 1 : 0,
  };
}

function countsWithAdChange(current: AppWorkspacePayload["counts"], previousAd: AdRecord | null, nextAd: AdRecord) {
  const previous = previousAd ? countFlagsForAd(previousAd) : { all: 0, needsData: 0, review: 0, approved: 0, published: 0, blocked: 0 };
  const next = countFlagsForAd(nextAd);

  return {
    all: current.all - previous.all + next.all,
    needsData: current.needsData - previous.needsData + next.needsData,
    review: current.review - previous.review + next.review,
    approved: current.approved - previous.approved + next.approved,
    published: current.published - previous.published + next.published,
    blocked: current.blocked - previous.blocked + next.blocked,
  };
}

function workspaceWithAd(workspace: AppWorkspacePayload, nextAd: AdRecord) {
  const previousAd = workspace.ads.find((ad) => ad.id === nextAd.id) ?? null;
  const ads = previousAd ? workspace.ads.map((ad) => (ad.id === nextAd.id ? nextAd : ad)) : [nextAd, ...workspace.ads];

  return {
    ...workspace,
    ads,
    adPageInfo: {
      ...workspace.adPageInfo,
      total: workspace.adPageInfo.total + (previousAd ? 0 : 1),
    },
    counts: countsWithAdChange(workspace.counts, previousAd, nextAd),
  };
}

function roleNeedsCandidate(role: InviteInput["role"]) {
  return role === "CANDIDATE";
}

function workspaceWithBranch(workspace: AppWorkspacePayload, branch: AppWorkspacePayload["branches"][number]) {
  const branches = workspace.branches.some((item) => item.id === branch.id)
    ? workspace.branches.map((item) => (item.id === branch.id ? branch : item))
    : [...workspace.branches, branch];

  const activeBranches = branches.filter((item) => !item.archived);

  return {
    ...workspace,
    branches,
    users: {
      ...workspace.users,
      branches: activeBranches,
    },
  };
}

function workspaceWithCampaign(workspace: AppWorkspacePayload, campaign: AppWorkspacePayload["campaigns"][number]) {
  const campaigns = workspace.campaigns.some((item) => item.id === campaign.id)
    ? workspace.campaigns.map((item) => (item.id === campaign.id ? campaign : item))
    : [campaign, ...workspace.campaigns];

  return {
    ...workspace,
    campaigns,
  };
}

function workspaceWithCandidate(workspace: AppWorkspacePayload, candidate: AppWorkspacePayload["candidates"][number]) {
  const candidates = workspace.candidates.some((item) => item.id === candidate.id)
    ? workspace.candidates.map((item) => (item.id === candidate.id ? candidate : item))
    : [candidate, ...workspace.candidates];
  const activeCandidates = candidates.filter((item) => !item.archived);

  return {
    ...workspace,
    candidates,
    users: {
      ...workspace.users,
      candidates: activeCandidates,
    },
  };
}

function defaultCampaign(workspace: AppWorkspacePayload) {
  return workspace.campaigns.find((campaign) => !campaign.archived) ?? workspace.campaigns[0] ?? null;
}

function blankInviteForm(workspace: AppWorkspacePayload): InviteInput {
  const role = (workspace.users.assignableRoles[0]?.value as InviteInput["role"] | undefined) ?? "CAMPAIGN_MANAGER";
  const branch = workspace.users.branches.find((item) => !item.archived) ?? workspace.users.branches[0] ?? workspace.branches.find((item) => !item.archived);
  const candidate = workspace.users.candidates.find((item) => !item.archived) ?? workspace.users.candidates[0] ?? workspace.candidates.find((item) => !item.archived);

  return {
    email: "",
    role,
    branchId: roleNeedsCandidate(role) ? candidate?.branchId ?? "" : branch?.id ?? "",
    candidateId: roleNeedsCandidate(role) ? candidate?.id ?? "" : "",
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
  const defaultBranch = workspace.branches.find((branch) => !branch.archived)?.name || (workspace.membership.scope === "celá strana" ? "" : workspace.membership.scope);
  const campaign = defaultCampaign(workspace);

  return {
    code: "",
    campaignId: campaign?.id ?? "",
    candidateId: "",
    title: "",
    branch: defaultBranch,
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
    campaignId: ad.campaignId,
    candidateId: ad.candidateId,
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

function qrPackageHref(adId: string) {
  return `/api/app/ads/${encodeURIComponent(adId)}/qr-package?locale=cs`;
}

function auditPackageHref(adId: string) {
  return `/api/app/ads/${encodeURIComponent(adId)}/audit-export?locale=cs`;
}

function hasValue(value: string) {
  return value.trim().length > 0;
}

type AdProcessStep = {
  key: string;
  title: string;
  text: string;
  nextAction: string;
  done: boolean;
};

function adProcessSteps(ad: AdRecord): AdProcessStep[] {
  const coreReady = hasValue(ad.title) && hasValue(ad.branch) && hasValue(ad.campaign);
  const assetReady = ad.assetCount > 0;
  const identityReady = hasValue(ad.owner) && hasValue(ad.payer);
  const moneyReady = hasValue(ad.amount) && hasValue(ad.fundingSource);
  const publicationReady = hasValue(ad.type) && hasValue(ad.publicationDateIso) && hasValue(ad.period) && hasValue(ad.distributionArea);
  const targetingReady = ad.isTargeted ? hasValue(ad.targeting) && hasValue(ad.targetAudience) : true;
  const approved = ad.workflowStatus === "APPROVED" || ad.workflowStatus === "PUBLISHED";
  const published = ad.workflowStatus === "PUBLISHED";

  return [
    {
      key: "record",
      title: "1. Založit reklamu",
      text: coreReady ? "Reklama je založená v kampani a pobočce." : "Záznam potřebuje název, kampaň a pobočku.",
      nextAction: "Doplňte název, kampaň a pobočku.",
      done: coreReady,
    },
    {
      key: "asset",
      title: "2. Nahrát podklad",
      text: assetReady ? `${ad.assetCount} souborů je u reklamy.` : "Přidejte návrh, PDF, banner, video nebo tiskový soubor.",
      nextAction: "Nahrajte podklad reklamy.",
      done: assetReady,
    },
    {
      key: "identity",
      title: "3. Zadavatel a plátce",
      text: identityReady ? "Zadavatel a plátce jsou vyplnění." : "Musí být jasné, kdo reklamu zadal a kdo ji platí.",
      nextAction: "Doplňte zadavatele a plátce.",
      done: identityReady,
    },
    {
      key: "money",
      title: "4. Náklady a původ financí",
      text: moneyReady ? "Náklady a původ financí jsou v záznamu." : "Doplňte částku, rozpočet nebo náklady a původ financí.",
      nextAction: "Doplňte náklady a původ financí.",
      done: moneyReady,
    },
    {
      key: "publication",
      title: "5. Zveřejnění a šíření",
      text: publicationReady ? "Typ, termín, období a oblast šíření jsou vyplněné." : "Datum zveřejnění určuje deadline pro doplnění údajů.",
      nextAction: "Doplňte typ, datum, období a oblast šíření.",
      done: publicationReady,
    },
    {
      key: "targeting",
      title: "6. Cílení",
      text: targetingReady ? (ad.isTargeted ? "Cílení a cílové publikum jsou popsané." : "Reklama není vedená jako cílená.") : "U cílené reklamy chybí popis cílení nebo publikum.",
      nextAction: "Doplňte cílení a cílové publikum, nebo cílení vypněte.",
      done: targetingReady,
    },
    {
      key: "approval",
      title: "7. Schválení a označení",
      text: approved ? "Reklama prošla kontrolou." : "Po doplnění údajů ji schvalovatel potvrdí nebo vrátí k úpravě.",
      nextAction: ad.missing.length
        ? "Nejdřív doplňte chybějící údaje."
        : ad.canApprove
          ? "Schvalte reklamu, nebo ji vraťte k doplnění."
          : "Pošlete reklamu ke kontrole a schválení.",
      done: approved,
    },
    {
      key: "ttpa",
      title: "8. Hotovo pro TTPA",
      text: published
        ? "Reklama má označení, QR kód, veřejné oznámení a balíček pro kontrolu."
        : "Cíl: mít hotové údaje a výstupy, které TTPA u politické reklamy vyžaduje.",
      nextAction: approved ? "Publikujte reklamu a stáhněte balíček pro kontrolu." : "Dokončete kontrolu, QR kód a veřejné oznámení.",
      done: published,
    },
  ];
}

function reviewEventClass(status: AdRecord["reviewEvents"][number]["status"]) {
  if (status === "APPROVED" || status === "PUBLISHED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "CHANGES_REQUESTED" || status === "REJECTED") {
    return "border-orange-200 bg-orange-50 text-orange-800";
  }

  return "border-sky-200 bg-sky-50 text-sky-800";
}

function setupProgress(workspace: AppWorkspacePayload) {
  const hasAds = workspace.ads.length > 0;
  const hasCompleteAds = workspace.ads.some((ad) => ad.missing.length === 0);
  const hasReviewFlow = workspace.counts.review + workspace.counts.approved + workspace.counts.published > 0;
  const hasReadyOutput = workspace.counts.approved + workspace.counts.published > 0;
  const hasPublishedAds = workspace.counts.published > 0;
  const items = [
    {
      key: "create",
      title: "1. Založit reklamu",
      text: hasAds ? `${workspace.ads.length} reklam je v evidenci.` : "Začněte názvem, pobočkou a termínem zveřejnění.",
      done: hasAds,
      href: "#ads",
      action: "Přidat reklamu",
      visible: workspace.permissions.canCreateAds,
    },
    {
      key: "asset",
      title: "2. Nahrát podklad",
      text: "Přidejte návrh, PDF, banner, video nebo finální tiskový soubor.",
      done: workspace.ads.some((ad) => ad.assetCount > 0),
      href: "#ads",
      action: "Otevřít reklamy",
      visible: true,
    },
    {
      key: "identity",
      title: "3. Doplnit zadavatele",
      text: "U reklamy musí být jasné, kdo ji zadal a kdo ji platí.",
      done: hasAds && workspace.ads.some((ad) => ad.owner.trim() && ad.payer.trim()),
      href: workspace.counts.needsData > 0 ? "#missing-data" : "#ads",
      action: "Doplnit údaje",
      visible: true,
    },
    {
      key: "money",
      title: "4. Doplnit peníze",
      text: "Částka, rozpočet nebo náklady a původ financí jsou v jednom záznamu.",
      done: hasAds && workspace.ads.some((ad) => ad.amount.trim() && ad.fundingSource.trim()),
      href: workspace.counts.needsData > 0 ? "#missing-data" : "#ads",
      action: "Zkontrolovat údaje",
      visible: true,
    },
    {
      key: "publication",
      title: "5. Nastavit zveřejnění",
      text: "Datum, období, oblast šíření a kanál určují, kdy musí být vše hotové.",
      done: hasAds && workspace.ads.some((ad) => ad.publicationDateIso && ad.period.trim() && ad.distributionArea.trim()),
      href: workspace.counts.needsData > 0 ? "#missing-data" : "#ads",
      action: "Otevřít termíny",
      visible: true,
    },
    {
      key: "targeting",
      title: "6. Vyřešit cílení",
      text: "Pokud reklama používá cílení, doplňte techniku a cílové publikum.",
      done: hasCompleteAds || (hasAds && workspace.ads.some((ad) => !ad.missing.includes("cílové publikum") && !ad.missing.includes("target audience"))),
      href: workspace.counts.needsData > 0 ? "#missing-data" : "#ads",
      action: "Zkontrolovat cílení",
      visible: true,
    },
    {
      key: "review",
      title: "7. Schválit a označit",
      text: hasReviewFlow ? "Reklamy už běží kontrolou, schválením nebo zveřejněním." : "Po doplnění údajů přijde kontrola, QR kód a veřejné oznámení.",
      done: hasReviewFlow,
      href: workspace.counts.review > 0 ? "#review" : "#ads",
      action: workspace.counts.review > 0 ? "Otevřít kontrolu" : "Pokračovat",
      visible: true,
    },
    {
      key: "ttpa",
      title: "8. Hotovo pro TTPA",
      text: hasReadyOutput ? "QR kód, veřejné oznámení a balíček pro kontrolu jsou připravené." : "Cíl: reklama má údaje a výstupy, které TTPA vyžaduje.",
      done: hasPublishedAds || hasReadyOutput,
      href: workspace.counts.needsData > 0 ? "#missing-data" : "#ads",
      action: hasReadyOutput ? "Stáhnout výstupy" : "Doplnit, co chybí",
      visible: true,
    },
  ].filter((item) => item.visible);

  return {
    items,
    done: items.filter((item) => item.done).length,
  };
}

export function AppWorkspaceClient({ initialWorkspace }: { initialWorkspace: AppWorkspacePayload }) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(initialSelectedAdId(initialWorkspace));
  const [mode, setMode] = useState<EditorMode | null>(null);
  const [form, setForm] = useState<EditableAdInput>(() => blankForm(initialWorkspace));
  const [saving, setSaving] = useState(false);
  const [actioning, setActioning] = useState("");
  const [uploading, setUploading] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMoreAds, setLoadingMoreAds] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchKind, setBranchKind] = useState("oblast");
  const [branchSaving, setBranchSaving] = useState(false);
  const [branchSavingId, setBranchSavingId] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [campaignElection, setCampaignElection] = useState("Volby 2026");
  const [campaignStartsAt, setCampaignStartsAt] = useState("2026-01-01");
  const [campaignEndsAt, setCampaignEndsAt] = useState("2026-12-31");
  const [campaignTags, setCampaignTags] = useState("");
  const [campaignSaving, setCampaignSaving] = useState(false);
  const [campaignSavingId, setCampaignSavingId] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [candidateBranchId, setCandidateBranchId] = useState("");
  const [candidateBallotNumber, setCandidateBallotNumber] = useState("");
  const [candidateSaving, setCandidateSaving] = useState(false);
  const [candidateSavingId, setCandidateSavingId] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const profileInputRef = useRef<HTMLInputElement>(null);
  const [inviteForm, setInviteForm] = useState<InviteInput>(() => blankInviteForm(initialWorkspace));
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [retryingInviteId, setRetryingInviteId] = useState("");
  const [invitationActionId, setInvitationActionId] = useState("");
  const [memberSavingId, setMemberSavingId] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [importCampaignId, setImportCampaignId] = useState(defaultCampaign(initialWorkspace)?.id ?? "");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<AdImportResult | null>(null);
  const [error, setError] = useState("");
  const [activeSectionId, setActiveSectionId] = useState<WorkspaceSection>(() => {
    if (typeof window === "undefined") {
      return "ads";
    }

    return sectionFromHash(window.location.hash) ?? "ads";
  });

  const selectedAd = workspace.ads.find((ad) => ad.id === selectedId) ?? workspace.ads[0] ?? null;
  const writable = canManageAds(workspace);
  const reviewable = canReviewAds(workspace);
  const progress = setupProgress(workspace);
  const deferredQuery = useDeferredValue(query);
  const sections = useMemo(() => {
    const missingCount = workspace.counts.needsData;
    const reviewCount = workspace.counts.review + workspace.counts.approved;

    return [
      {
        id: "ads" as const,
        label: "Reklamy",
        description: "Založit reklamu, doplnit údaje a stáhnout QR.",
        count: workspace.counts.all,
        visible: true,
      },
      {
        id: "review" as const,
        label: "Ke kontrole",
        description: "Co chybí, co schválit a co zveřejnit.",
        count: reviewCount + missingCount,
        visible: reviewable || reviewCount > 0 || missingCount > 0,
      },
      {
        id: "campaigns" as const,
        label: "Kampaně",
        description: "Volby, období a tagy kampaní.",
        count: workspace.campaigns.length,
        visible: workspace.permissions.canManageCampaigns,
      },
      {
        id: "branches" as const,
        label: "Pobočky",
        description: "Regiony, oblasti a lokální týmy.",
        count: workspace.branches.length,
        visible: workspace.permissions.canManageBranches || workspace.permissions.canEditOwnBranch,
      },
      {
        id: "people" as const,
        label: "Lidé",
        description: "Role, pozvánky a přístupy.",
        count: workspace.users.members.length,
        visible: workspace.permissions.canManageUsers,
      },
      {
        id: "archive" as const,
        label: "Kontrola",
        description: "Balíčky pro kontrolu a historie změn.",
        count: workspace.permissions.canViewAudit ? workspace.auditLogs.length : undefined,
        visible: workspace.permissions.canExportArchive || workspace.permissions.canViewAudit,
      },
      {
        id: "settings" as const,
        label: "Nastavení",
        description: "Profil, organizace a instalace.",
        visible: true,
      },
    ].filter((section) => section.visible);
  }, [reviewable, workspace]);
  const activeSection = sections.some((section) => section.id === activeSectionId) ? activeSectionId : "ads";
  const filteredAds = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();

    if (!normalized) {
      return workspace.ads;
    }

    return workspace.ads.filter((ad) =>
      [ad.id, ad.title, ad.branch, ad.campaign, ad.candidate, ad.campaignTags.join(" "), ad.owner, ad.supplier, ad.distributionArea].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }, [deferredQuery, workspace.ads]);

  useEffect(() => {
    function syncSectionFromHash() {
      const section = sectionFromHash(window.location.hash);

      if (section) {
        setActiveSectionId(section);
      }
    }

    syncSectionFromHash();
    window.addEventListener("hashchange", syncSectionFromHash);
    window.addEventListener("popstate", syncSectionFromHash);

    return () => {
      window.removeEventListener("hashchange", syncSectionFromHash);
      window.removeEventListener("popstate", syncSectionFromHash);
    };
  }, []);

  async function refreshWorkspace() {
    setRefreshing(true);
    setError("");

    try {
      const { response, payload } = await fetchApiJson<AppWorkspacePayload>("/api/app/ads?locale=cs", { cache: "no-store" });

      if (!response.ok) {
        throw apiError(payload, response, "Refresh failed");
      }

      setWorkspace(payload);
      setSelectedId((current) => (payload.ads.some((ad) => ad.id === current) ? current : initialSelectedAdId(payload)));
    } catch {
      setError("Data se nepodařilo načíst. Zkuste obnovit stránku.");
    } finally {
      setRefreshing(false);
    }
  }

  async function loadMoreAds() {
    if (!workspace.adPageInfo.hasMore || !workspace.adPageInfo.nextCursor || loadingMoreAds) {
      return;
    }

    setLoadingMoreAds(true);
    setError("");

    try {
      const params = new URLSearchParams({
        locale: "cs",
        cursor: workspace.adPageInfo.nextCursor,
        limit: String(workspace.adPageInfo.limit),
      });
      const { response, payload } = await fetchApiJson<AppWorkspacePayload>(`/api/app/ads?${params.toString()}`, { cache: "no-store" });

      if (!response.ok) {
        throw apiError(payload, response, "Load more failed");
      }

      setWorkspace((current) => {
        const knownIds = new Set(current.ads.map((ad) => ad.id));
        const nextAds = [...current.ads, ...payload.ads.filter((ad) => !knownIds.has(ad.id))];

        return {
          ...payload,
          ads: nextAds,
        };
      });
      setSelectedId((current) => current || payload.ads[0]?.id || "");
    } catch {
      setError("Další reklamy se nepodařilo načíst.");
    } finally {
      setLoadingMoreAds(false);
    }
  }

  async function createBranch() {
    if (!workspace.permissions.canManageBranches || !branchName.trim()) {
      return;
    }

    setBranchSaving(true);
    setError("");

    try {
      const { response, payload } = await fetchApiJson<{ branch?: AppWorkspacePayload["branches"][number]; error?: string }>(
        "/api/app/branches?locale=cs",
        jsonRequest("POST", {
          name: branchName,
          kind: branchKind,
        }),
      );

      if (!response.ok || !payload.branch) {
        throw apiError(payload, response, "Branch create failed");
      }

      setWorkspace((current) => workspaceWithBranch(current, payload.branch as AppWorkspacePayload["branches"][number]));
      setBranchName("");
    } catch (branchError) {
      setError(branchError instanceof Error ? branchError.message : "Pobočku se nepodařilo založit.");
    } finally {
      setBranchSaving(false);
    }
  }

  async function saveTenantSettings(input: AppTenantSettingsInput) {
    if (!workspace.permissions.canManageTenantSettings || settingsSaving) {
      return;
    }

    setSettingsSaving(true);
    setSettingsMessage("");
    setError("");

    try {
      const { response, payload } = await fetchApiJson<{ tenant?: AppWorkspacePayload["tenant"]; error?: string }>(
        "/api/app/settings?locale=cs",
        jsonRequest("PATCH", input),
      );

      if (!response.ok || !payload.tenant) {
        throw apiError(payload, response, "Settings update failed");
      }

      setWorkspace((current) => ({
        ...current,
        tenant: payload.tenant as AppWorkspacePayload["tenant"],
      }));
      setSettingsMessage("Nastavení je uložené.");
    } catch (settingsError) {
      setError(settingsError instanceof Error ? settingsError.message : "Nastavení se nepodařilo uložit.");
    } finally {
      setSettingsSaving(false);
    }
  }

  async function updateBranch(branchId: string, input: AppBranchUpdateInput) {
    if ((!workspace.permissions.canManageBranches && !workspace.permissions.canEditOwnBranch) || branchSavingId) {
      return;
    }

    setBranchSavingId(branchId);
    setError("");

    try {
      const { response, payload } = await fetchApiJson<{ branch?: AppWorkspacePayload["branches"][number]; error?: string }>(
        `/api/app/branches/${encodeURIComponent(branchId)}?locale=cs`,
        jsonRequest("PATCH", input),
      );

      if (!response.ok || !payload.branch) {
        throw apiError(payload, response, "Branch update failed");
      }

      setWorkspace((current) => workspaceWithBranch(current, payload.branch as AppWorkspacePayload["branches"][number]));
      await refreshWorkspace();
    } catch (branchError) {
      setError(branchError instanceof Error ? branchError.message : "Pobočku se nepodařilo uložit.");
    } finally {
      setBranchSavingId("");
    }
  }

  async function createCampaign() {
    if (!workspace.permissions.canManageCampaigns || !campaignName.trim() || campaignSaving) {
      return;
    }

    setCampaignSaving(true);
    setError("");

    try {
      const { response, payload } = await fetchApiJson<{ campaign?: AppWorkspacePayload["campaigns"][number]; error?: string }>(
        "/api/app/campaigns?locale=cs",
        jsonRequest("POST", {
          name: campaignName,
          election: campaignElection,
          startsAt: campaignStartsAt,
          endsAt: campaignEndsAt,
          tags: campaignTags.split(",").map((tag) => tag.trim()).filter(Boolean),
        } satisfies AppCampaignInput),
      );

      if (!response.ok || !payload.campaign) {
        throw apiError(payload, response, "Campaign create failed");
      }

      setWorkspace((current) => workspaceWithCampaign(current, payload.campaign as AppWorkspacePayload["campaigns"][number]));
      setCampaignName("");
      setCampaignTags("");
      setImportCampaignId((current) => current || payload.campaign?.id || "");
    } catch (campaignError) {
      setError(campaignError instanceof Error ? campaignError.message : "Kampaň se nepodařilo založit.");
    } finally {
      setCampaignSaving(false);
    }
  }

  async function updateCampaign(campaignId: string, input: AppCampaignInput) {
    if (!workspace.permissions.canManageCampaigns || campaignSavingId) {
      return;
    }

    setCampaignSavingId(campaignId);
    setError("");

    try {
      const { response, payload } = await fetchApiJson<{ campaign?: AppWorkspacePayload["campaigns"][number]; error?: string }>(
        `/api/app/campaigns/${encodeURIComponent(campaignId)}?locale=cs`,
        jsonRequest("PATCH", input),
      );

      if (!response.ok || !payload.campaign) {
        throw apiError(payload, response, "Campaign update failed");
      }

      setWorkspace((current) => workspaceWithCampaign(current, payload.campaign as AppWorkspacePayload["campaigns"][number]));
      await refreshWorkspace();
    } catch (campaignError) {
      setError(campaignError instanceof Error ? campaignError.message : "Kampaň se nepodařilo uložit.");
    } finally {
      setCampaignSavingId("");
    }
  }

  async function createCandidate() {
    if (!workspace.permissions.canManageCandidates || !candidateName.trim() || candidateSaving) {
      return;
    }

    setCandidateSaving(true);
    setError("");

    try {
      const { response, payload } = await fetchApiJson<{ candidate?: AppWorkspacePayload["candidates"][number]; error?: string }>(
        "/api/app/candidates?locale=cs",
        jsonRequest("POST", {
          name: candidateName,
          branchId: candidateBranchId,
          ballotNumber: candidateBallotNumber,
        } satisfies AppCandidateInput),
      );

      if (!response.ok || !payload.candidate) {
        throw apiError(payload, response, "Candidate create failed");
      }

      setWorkspace((current) => workspaceWithCandidate(current, payload.candidate as AppWorkspacePayload["candidates"][number]));
      setCandidateName("");
      setCandidateBallotNumber("");
    } catch (candidateError) {
      setError(candidateError instanceof Error ? candidateError.message : "Kandidáta se nepodařilo založit.");
    } finally {
      setCandidateSaving(false);
    }
  }

  async function updateCandidate(candidateId: string, input: AppCandidateInput) {
    if (!workspace.permissions.canManageCandidates || candidateSavingId) {
      return;
    }

    setCandidateSavingId(candidateId);
    setError("");

    try {
      const { response, payload } = await fetchApiJson<{ candidate?: AppWorkspacePayload["candidates"][number]; error?: string }>(
        `/api/app/candidates/${encodeURIComponent(candidateId)}?locale=cs`,
        jsonRequest("PATCH", input),
      );

      if (!response.ok || !payload.candidate) {
        throw apiError(payload, response, "Candidate update failed");
      }

      setWorkspace((current) => workspaceWithCandidate(current, payload.candidate as AppWorkspacePayload["candidates"][number]));
      await refreshWorkspace();
    } catch (candidateError) {
      setError(candidateError instanceof Error ? candidateError.message : "Kandidáta se nepodařilo uložit.");
    } finally {
      setCandidateSavingId("");
    }
  }

  async function saveProfile(name: string) {
    const cleanName = name.trim();

    if (profileSaving) {
      return;
    }

    setProfileSaving(true);
    setProfileMessage("");
    setError("");

    if (!cleanName) {
      setError("Doplňte jméno profilu.");
      setProfileSaving(false);
      return;
    }

    try {
      const { response, payload } = await fetchApiJson<{ user?: AppWorkspacePayload["user"]; error?: string }>(
        "/api/app/profile",
        jsonRequest("PATCH", {
          name: cleanName,
        }),
      );

      if (!response.ok || !payload.user) {
        throw apiError(payload, response, "Profile update failed");
      }

      setWorkspace((current) => ({
        ...current,
        user: payload.user as AppWorkspacePayload["user"],
        users: {
          ...current.users,
          members: current.users.members.map((member) =>
            member.email === payload.user?.email ? { ...member, name: payload.user.name } : member,
          ),
        },
      }));
      setProfileMessage("Jméno je uložené.");
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : "Profil se nepodařilo uložit.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function updateMember(memberId: string, input: AppMemberUpdateInput) {
    if (!workspace.permissions.canManageUsers || memberSavingId) {
      return;
    }

    setMemberSavingId(memberId);
    setError("");

    try {
      const { response, payload } = await fetchApiJson<{ member?: AppWorkspacePayload["users"]["members"][number]; error?: string }>(
        `/api/app/users/${encodeURIComponent(memberId)}?locale=cs`,
        jsonRequest("PATCH", input),
      );

      if (!response.ok || !payload.member) {
        throw apiError(payload, response, "Member update failed");
      }

      setWorkspace((current) => ({
        ...current,
        user: payload.member?.email === current.user.email ? { ...current.user, name: payload.member.name } : current.user,
        users: {
          ...current.users,
          members: current.users.members.map((member) => (member.id === payload.member?.id ? (payload.member as AppWorkspacePayload["users"]["members"][number]) : member)),
        },
      }));

    } catch (memberError) {
      setError(memberError instanceof Error ? memberError.message : "Přístup se nepodařilo uložit.");
    } finally {
      setMemberSavingId("");
    }
  }

  async function createInvitation() {
    if (!workspace.permissions.canManageUsers || inviteSaving || !inviteForm.email.trim()) {
      return;
    }

    setInviteSaving(true);
    setError("");
    setInviteMessage("");

    try {
      const { response, payload } = await fetchApiJson<{ invitation?: AppWorkspacePayload["users"]["invitations"][number]; error?: string }>(
        "/api/app/users?locale=cs",
        jsonRequest("POST", inviteForm),
      );

      if (!response.ok || !payload.invitation) {
        throw apiError(payload, response, "Invite failed");
      }

      setWorkspace((current) => ({
        ...current,
        users: {
          ...current.users,
          invitations: [payload.invitation as AppWorkspacePayload["users"]["invitations"][number], ...current.users.invitations.filter((item) => item.id !== payload.invitation?.id)],
        },
      }));
      setInviteForm((current) => {
        const next = blankInviteForm(workspace);

        return {
          ...next,
          role: current.role,
          branchId: roleNeedsCandidate(current.role) ? current.branchId : next.branchId,
          candidateId: roleNeedsCandidate(current.role) ? current.candidateId : "",
        };
      });
      setInviteMessage(payload.invitation.inviteUrl);
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Pozvánku se nepodařilo vytvořit.");
    } finally {
      setInviteSaving(false);
    }
  }

  async function retryInvitationEmail(invitationId: string) {
    if (!workspace.permissions.canManageUsers || retryingInviteId) {
      return;
    }

    setRetryingInviteId(invitationId);
    setError("");

    try {
      const { response, payload } = await fetchApiJson<{ invitation?: AppWorkspacePayload["users"]["invitations"][number]; error?: string }>(
        `/api/app/users/${encodeURIComponent(invitationId)}/retry-email?locale=cs`,
        { method: "POST" },
      );

      if (!response.ok || !payload.invitation) {
        throw apiError(payload, response, "Invite email retry failed");
      }

      setWorkspace((current) => ({
        ...current,
        users: {
          ...current.users,
          invitations: current.users.invitations.map((item) => (item.id === payload.invitation?.id ? payload.invitation : item)),
        },
      }));
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Pozvánku se nepodařilo znovu odeslat.");
    } finally {
      setRetryingInviteId("");
    }
  }

  async function revokeInvitation(invitationId: string) {
    if (!workspace.permissions.canManageUsers || invitationActionId) {
      return;
    }

    setInvitationActionId(invitationId);
    setError("");

    try {
      const { response, payload } = await fetchApiJson<{ invitation?: AppWorkspacePayload["users"]["invitations"][number]; error?: string }>(
        `/api/app/users/${encodeURIComponent(invitationId)}/revoke-invitation?locale=cs`,
        { method: "POST" },
      );

      if (!response.ok || !payload.invitation) {
        throw apiError(payload, response, "Invite revoke failed");
      }

      setWorkspace((current) => ({
        ...current,
        users: {
          ...current.users,
          invitations: current.users.invitations.map((item) => (item.id === payload.invitation?.id ? payload.invitation : item)),
        },
      }));
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Pozvánku se nepodařilo zrušit.");
    } finally {
      setInvitationActionId("");
    }
  }

  function openSection(section: WorkspaceSection) {
    setActiveSectionId(section);

    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${section}`);
    }
  }

  function selectAd(adId: string) {
    setSelectedId(adId);
    setMode(null);

    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      window.setTimeout(() => document.getElementById("ad-detail")?.scrollIntoView({ block: "start" }), 50);
    }
  }

  function openCreate() {
    openSection("ads");
    setForm(blankForm(workspace));
    setMode("create");
    setError("");
  }

  function openEdit(ad: AdRecord) {
    openSection("ads");
    setSelectedId(ad.id);
    setForm(formFromAd(ad));
    setMode("edit");
    setError("");
  }

  async function saveAd() {
    if (!writable || saving || !form.title.trim() || !form.branch.trim() || !form.campaignId?.trim()) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const isEdit = mode === "edit" && form.code;
      const { response, payload } = await fetchApiJson<{ ad?: AdRecord; error?: string }>(
        isEdit ? `/api/app/ads/${encodeURIComponent(form.code ?? "")}?locale=cs` : "/api/app/ads?locale=cs",
        jsonRequest(isEdit ? "PATCH" : "POST", form),
      );

      if (!response.ok || !payload.ad) {
        throw apiError(payload, response, "Save failed");
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

  async function runWorkflowAction(ad: AdRecord, action: "approve" | "publish" | "request-changes") {
    if (!reviewable || actioning) {
      return;
    }

    if (action === "publish" && !window.confirm("Publikovat a uzamknout tuto verzi reklamy? Další úpravy vytvoří novou verzi.")) {
      return;
    }

    if (action === "request-changes" && !reviewNote.trim()) {
      setError("Pro vrácení k doplnění napište krátký komentář.");
      return;
    }

    setActioning(`${action}:${ad.id}`);
    setError("");

    try {
      const { response, payload } = await fetchApiJson<{ ad?: AdRecord; error?: string }>(
        `/api/app/ads/${encodeURIComponent(ad.id)}/${action}?locale=cs`,
        action === "request-changes" ? jsonRequest("POST", { note: reviewNote }) : { method: "POST" },
      );

      if (!response.ok || !payload.ad) {
        throw apiError(payload, response, "Workflow action failed");
      }

      const nextAd = payload.ad;
      setWorkspace((current) => workspaceWithAd(current, nextAd));
      setSelectedId(nextAd.id);
      if (action === "request-changes") {
        setReviewNote("");
      }
    } catch (workflowError) {
      setError(
        workflowError instanceof Error
          ? workflowError.message
          : action === "approve"
            ? "Reklamu se nepodařilo schválit. Zkontrolujte povinné údaje a svůj přístup."
            : action === "publish"
              ? "Reklamu se nepodařilo publikovat. Zkontrolujte povinné údaje a svůj přístup."
              : "Reklamu se nepodařilo vrátit k doplnění. Doplňte komentář a zkontrolujte svůj přístup.",
      );
    } finally {
      setActioning("");
    }
  }

  async function uploadAsset(ad: AdRecord, file: File | null) {
    if (!file || !writable || uploading) {
      return;
    }

    setUploading(ad.id);
    setError("");

    try {
      const formData = new FormData();
      formData.set("file", file);

      const { response, payload } = await fetchApiJson<{ ad?: AdRecord; error?: string }>(
        `/api/app/ads/${encodeURIComponent(ad.id)}/assets?locale=cs`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok || !payload.ad) {
        throw apiError(payload, response, "Upload failed");
      }

      setWorkspace((current) => workspaceWithAd(current, payload.ad as AdRecord));
      setSelectedId(payload.ad.id);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Soubor se nepodařilo nahrát.");
    } finally {
      setUploading("");
    }
  }

  async function importAds(file: File | null) {
    if (!file || !workspace.permissions.canCreateAds || importing) {
      return;
    }

    setImporting(true);
    setImportResult(null);
    setError("");

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("campaignId", importCampaignId || defaultCampaign(workspace)?.id || "");

      const { response, payload } = await fetchApiJson<{ result?: AdImportResult; error?: string }>("/api/app/ads/import?locale=cs", {
        method: "POST",
        body: formData,
      });

      if (!response.ok || !payload.result) {
        throw apiError(payload, response, "Import failed");
      }

      setImportResult(payload.result);
      await refreshWorkspace();

      if (payload.result.created[0]) {
        setSelectedId(payload.result.created[0].id);
      }
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import se nepodařilo spustit.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-[1800px] min-w-0 gap-5 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <article className="rounded-md border border-black/10 bg-white p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#d94410]">Přehled</p>
          <h1 className="mt-2 text-3xl font-semibold text-black">Adclare pro {workspace.tenant.name}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#59616b]">
            Připravte reklamy pro TTPA: údaje, soubory, schválení, QR kódy a exporty. {accessSentence(workspace)}
          </p>
          {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div> : null}
        </article>

        <aside className="min-w-0 rounded-md border border-black/10 bg-white p-5">
          <div className="text-sm font-semibold text-[#68707a]">Přihlášený uživatel</div>
          <div className="mt-2 text-lg font-semibold text-black">{workspace.user.name}</div>
          <div className="break-all text-sm text-[#59616b]">{workspace.user.email}</div>
          <div className="mt-4 grid gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-[#68707a]">Role</span>
              <span className="font-semibold text-[#20242a]">{workspace.membership.role}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#68707a]">Oblast</span>
              <span className="text-right font-semibold text-[#20242a]">{workspace.membership.scope}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#68707a]">Přístup</span>
              <span className="text-right font-semibold text-[#20242a]">aktivní</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {([
              ["údaje", workspace.permissions.canEditAds],
              ["soubory", workspace.permissions.canUploadAssets],
              ["kontrola", workspace.permissions.canApproveAds],
              ["zveřejnění", workspace.permissions.canPublishAds],
            ] satisfies Array<[string, boolean]>).map(([label, enabled]) => (
              <span
                key={label}
                className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                  enabled ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-black/10 bg-[#fbfbfc] text-[#8b929b]"
                }`}
              >
                {label}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => openSection("settings")}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#25282d]"
          >
            Nastavení profilu
            <ArrowUpRight size={14} />
          </button>
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

      <nav aria-label="Pracovní části aplikace" className="rounded-md border border-black/10 bg-white p-2">
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => openSection(section.id)}
              className={`min-w-0 rounded-md border px-3 py-2 text-left transition ${
                activeSection === section.id
                  ? "border-[#f45d1f]/30 bg-[#fff4ef] text-[#d94410]"
                  : "border-transparent bg-white text-[#20242a] hover:border-black/10 hover:bg-[#fbfbfc]"
              }`}
              aria-current={activeSection === section.id ? "page" : undefined}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                {section.label}
                {typeof section.count === "number" ? (
                  <span className={`rounded-md px-1.5 py-0.5 text-xs ${activeSection === section.id ? "bg-white text-[#d94410]" : "bg-[#f1f2f4] text-[#68707a]"}`}>
                    {section.count}
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 block max-w-[220px] text-xs leading-5 text-[#68707a]">{section.description}</span>
            </button>
          ))}
        </div>
      </nav>

      {activeSection === "settings" && workspace.permissions.canManageAllTenants && workspace.superAdmin ? (
        <SuperAdminPanel data={workspace.superAdmin} onOpenPeople={() => openSection("people")} />
      ) : null}

      {activeSection === "ads" ? <OnboardingPanel progress={progress} onCreateAd={openCreate} /> : null}

      {activeSection === "ads" && workspace.permissions.canCreateAds ? (
        <ImportPanel
          campaigns={workspace.campaigns}
          campaignId={importCampaignId}
          importing={importing}
          result={importResult}
          onCampaignChange={setImportCampaignId}
          onImport={importAds}
          onSelect={(adId) => {
            setSelectedId(adId);
            window.setTimeout(() => document.getElementById("ad-detail")?.scrollIntoView({ block: "start" }), 50);
          }}
        />
      ) : null}

      {activeSection === "ads" && mode ? (
        <Editor
          mode={mode}
          ad={mode === "edit" ? (workspace.ads.find((ad) => ad.id === form.code) ?? null) : null}
          form={form}
          branches={workspace.branches}
          campaigns={workspace.campaigns}
          candidates={workspace.candidates}
          saving={saving}
          writable={writable}
          onCancel={() => setMode(null)}
          onChange={setForm}
          onSave={saveAd}
        />
      ) : null}

      {activeSection === "settings" ? (
        <ProfilePanel
          user={workspace.user}
          membership={workspace.membership}
          inputRef={profileInputRef}
          saving={profileSaving}
          message={profileMessage}
          onChange={() => setProfileMessage("")}
          onSave={saveProfile}
        />
      ) : null}

      {activeSection === "settings" && workspace.permissions.canManageTenantSettings ? (
        <SettingsPanel
          tenant={workspace.tenant}
          saving={settingsSaving}
          message={settingsMessage}
          onSave={saveTenantSettings}
        />
      ) : null}

      {activeSection === "branches" && (workspace.permissions.canManageBranches || workspace.permissions.canEditOwnBranch) ? (
        <BranchesPanel
          branches={workspace.branches}
          ads={workspace.ads}
          candidates={workspace.candidates}
          canCreate={workspace.permissions.canManageBranches}
          canArchive={workspace.permissions.canManageBranches}
          branchName={branchName}
          branchKind={branchKind}
          branchSaving={branchSaving}
          branchSavingId={branchSavingId}
          onBranchKindChange={setBranchKind}
          onBranchNameChange={setBranchName}
          onCreate={createBranch}
          onUpdate={updateBranch}
        />
      ) : null}

      {activeSection === "campaigns" && workspace.permissions.canManageCampaigns ? (
        <CampaignsPanel
          campaigns={workspace.campaigns}
          ads={workspace.ads}
          candidates={workspace.candidates}
          campaignName={campaignName}
          campaignElection={campaignElection}
          campaignStartsAt={campaignStartsAt}
          campaignEndsAt={campaignEndsAt}
          campaignTags={campaignTags}
          campaignSaving={campaignSaving}
          campaignSavingId={campaignSavingId}
          onCampaignNameChange={setCampaignName}
          onCampaignElectionChange={setCampaignElection}
          onCampaignStartsAtChange={setCampaignStartsAt}
          onCampaignEndsAtChange={setCampaignEndsAt}
          onCampaignTagsChange={setCampaignTags}
          onCreate={createCampaign}
          onUpdate={updateCampaign}
        />
      ) : null}

      {activeSection === "campaigns" && workspace.permissions.canManageCandidates ? (
        <CandidatesPanel
          candidates={workspace.candidates}
          branches={workspace.branches}
          ads={workspace.ads}
          candidateName={candidateName}
          candidateBranchId={candidateBranchId}
          candidateBallotNumber={candidateBallotNumber}
          candidateSaving={candidateSaving}
          candidateSavingId={candidateSavingId}
          onCandidateNameChange={setCandidateName}
          onCandidateBranchChange={setCandidateBranchId}
          onCandidateBallotNumberChange={setCandidateBallotNumber}
          onCreate={createCandidate}
          onUpdate={updateCandidate}
        />
      ) : null}

      {activeSection === "people" && workspace.permissions.canManageUsers ? (
        <PeoplePanel
          users={workspace.users}
          form={inviteForm}
          saving={inviteSaving}
          retryingInviteId={retryingInviteId}
          invitationActionId={invitationActionId}
          memberSavingId={memberSavingId}
          message={inviteMessage}
          onChange={setInviteForm}
          onCreate={createInvitation}
          onRetryEmail={retryInvitationEmail}
          onRevokeInvitation={revokeInvitation}
          onUpdateMember={updateMember}
        />
      ) : null}

      {activeSection === "archive" && workspace.permissions.canExportArchive ? <ArchiveExportPanel workspace={workspace} /> : null}

      {activeSection === "archive" && workspace.permissions.canViewAudit ? <AuditPanel logs={workspace.auditLogs} /> : null}

      {activeSection === "ads" ? <MissingDataQueue ads={workspace.ads} selectedId={selectedAd?.id ?? ""} writable={writable} onSelect={selectAd} onEdit={openEdit} /> : null}

      {activeSection === "review" && reviewable ? <ReviewInbox ads={workspace.ads} selectedId={selectedAd?.id ?? ""} onSelect={selectAd} /> : null}

      {activeSection === "review" ? (
        <section className="grid scroll-mt-6 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <MissingDataQueue ads={workspace.ads} selectedId={selectedAd?.id ?? ""} writable={writable} onSelect={selectAd} onEdit={openEdit} />
          <DetailPanel
            ad={selectedAd}
            writable={writable}
            reviewable={reviewable}
            uploadable={workspace.permissions.canUploadAssets}
            actioning={actioning}
            uploading={uploading}
            storage={workspace.storage}
            reviewNote={reviewNote}
            onEdit={openEdit}
            onUpload={uploadAsset}
            onApprove={(ad) => runWorkflowAction(ad, "approve")}
            onPublish={(ad) => runWorkflowAction(ad, "publish")}
            onRequestChanges={(ad) => runWorkflowAction(ad, "request-changes")}
            onReviewNoteChange={setReviewNote}
          />
        </section>
      ) : null}

      {activeSection === "ads" ? (
        <section id="ads" className="grid scroll-mt-6 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <AdListPanel
            ads={filteredAds}
            selectedId={selectedAd?.id ?? ""}
            query={query}
            refreshing={refreshing}
            loadingMore={loadingMoreAds}
            loadedCount={workspace.ads.length}
            totalCount={workspace.adPageInfo.total}
            hasMore={workspace.adPageInfo.hasMore}
            writable={writable}
            canCreate={workspace.permissions.canCreateAds}
            onQueryChange={setQuery}
            onRefresh={refreshWorkspace}
            onLoadMore={loadMoreAds}
            onCreate={openCreate}
            onSelect={selectAd}
            onEdit={openEdit}
          />

          <DetailPanel
            ad={selectedAd}
            writable={writable}
            reviewable={reviewable}
            uploadable={workspace.permissions.canUploadAssets}
            actioning={actioning}
            uploading={uploading}
            storage={workspace.storage}
            reviewNote={reviewNote}
            onEdit={openEdit}
            onUpload={uploadAsset}
            onApprove={(ad) => runWorkflowAction(ad, "approve")}
            onPublish={(ad) => runWorkflowAction(ad, "publish")}
            onRequestChanges={(ad) => runWorkflowAction(ad, "request-changes")}
            onReviewNoteChange={setReviewNote}
          />
        </section>
      ) : null}
    </section>
  );
}

function formatSuperAdminDate(value: string) {
  return new Date(value).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

function SuperAdminPanel({ data, onOpenPeople }: { data: NonNullable<AppWorkspacePayload["superAdmin"]>; onOpenPeople: () => void }) {
  const stats = [
    { label: "Organizace", value: data.counts.tenants, icon: Building2 },
    { label: "Reklamy", value: data.counts.ads, icon: FileArchive },
    { label: "Kampaně", value: data.counts.campaigns, icon: FolderKanban },
    { label: "Přístupy", value: data.counts.users, icon: Users },
    { label: "K doplnění", value: data.counts.needsData, icon: AlertTriangle },
    { label: "Publikováno", value: data.counts.published, icon: CheckCircle2 },
  ];

  return (
    <section id="super-admin" className="scroll-mt-6 rounded-md border border-black/10 bg-[#11161c] p-4 text-white">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/8 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-white/80">
            <ShieldCheck size={14} />
            Instalace
          </div>
          <h2 className="mt-3 text-2xl font-semibold">Správa instalace</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/72">
            Přehled organizací, přístupů a stavů reklam.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenPeople}
          className="inline-flex w-fit items-center gap-2 rounded-md border border-white/15 bg-white px-3 py-2 text-sm font-semibold text-[#11161c]"
        >
          Správa lidí
          <ArrowUpRight size={14} />
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div key={stat.label} className="rounded-md border border-white/12 bg-white/8 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-white/68">
                <Icon size={15} />
                {stat.label}
              </div>
              <div className="mt-2 text-3xl font-semibold leading-none">{stat.value}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {data.tenants.map((tenant) => (
          <article key={tenant.id} className="min-w-0 rounded-md border border-white/12 bg-white p-4 text-[#20242a]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold text-black">{tenant.name}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#59616b]">
                  <span className="font-mono text-xs font-semibold">/{tenant.slug}</span>
                  <span>{tenant.contactEmail || "bez kontaktního e-mailu"}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${tenant.publicRepositoryEnabled ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-neutral-200 bg-neutral-50 text-neutral-700"}`}>
                  {tenant.publicRepositoryEnabled ? "veřejný archiv zapnutý" : "veřejný archiv vypnutý"}
                </span>
                <span className="rounded-md border border-black/10 bg-[#fbfbfc] px-2.5 py-1 text-xs font-semibold text-[#59616b]">
                  archiv {tenant.retentionYears} let
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              {[
                ["Reklamy", tenant.counts.ads],
                ["Kampaně", tenant.counts.campaigns],
                ["Pobočky", tenant.counts.branches],
                ["K doplnění", tenant.counts.needsData],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-black/10 bg-[#fbfbfc] px-3 py-2">
                  <div className="text-xs font-semibold text-[#68707a]">{label}</div>
                  <div className="mt-1 text-xl font-semibold leading-none text-black">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#d94410]">Správci prostoru</div>
                <div className="mt-2 grid gap-1.5">
                  {tenant.admins.length ? (
                    tenant.admins.map((admin) => (
                      <div key={admin.id} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                        <span className="font-semibold text-black">{admin.name}</span>
                        <span className="break-all text-[#59616b]">{admin.email}</span>
                        <span className="rounded-md border border-black/10 bg-white px-2 py-0.5 text-xs font-semibold text-[#59616b]">{admin.role}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-[#59616b]">Zatím není uveden aktivní správce.</div>
                  )}
                </div>
                <div className="mt-2 text-xs font-semibold text-[#8b929b]">Poslední změna {formatSuperAdminDate(tenant.updatedAt)}</div>
              </div>
              <a
                href={`/repo/${tenant.slug}?locale=cs`}
                className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-3 text-sm font-semibold text-[#25282d]"
              >
                Veřejný archiv
                <ArrowUpRight size={14} />
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function OnboardingPanel({
  progress,
  onCreateAd,
}: {
  progress: ReturnType<typeof setupProgress>;
  onCreateAd: () => void;
}) {
  const percent = Math.round((progress.done / Math.max(1, progress.items.length)) * 100);

  return (
    <section className="rounded-md border border-black/10 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-black">Proces pro každou reklamu</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#59616b]">
            Osm kroků od záznamu po TTPA export.
          </p>
        </div>
        <div className="rounded-md border border-black/10 bg-[#fbfbfc] px-3 py-2 text-sm font-semibold text-[#25282d]">
          {progress.done}/{progress.items.length} hotovo
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eceff3]">
        <div className="h-full rounded-full bg-[#f45d1f]" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {progress.items.map((item) => (
          <article key={item.key} className={`rounded-md border p-3 ${item.done ? "border-emerald-200 bg-emerald-50" : "border-black/10 bg-white"}`}>
            <div className="flex items-start gap-2">
              {item.done ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /> : <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-orange-700" />}
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-black">{item.title}</h3>
                <p className="mt-1 text-xs leading-5 text-[#59616b]">{item.text}</p>
              </div>
            </div>
            {item.key === "create" && !item.done ? (
              <button
                type="button"
                onClick={onCreateAd}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#11161c] px-3 py-2 text-sm font-semibold text-white"
              >
                <Plus size={15} />
                {item.action}
              </button>
            ) : (
              <a
                href={item.href}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#25282d]"
              >
                {item.action}
                <ArrowUpRight size={14} />
              </a>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function ImportPanel({
  campaigns,
  campaignId,
  importing,
  result,
  onCampaignChange,
  onImport,
  onSelect,
}: {
  campaigns: AppWorkspacePayload["campaigns"];
  campaignId: string;
  importing: boolean;
  result: AdImportResult | null;
  onCampaignChange: (campaignId: string) => void;
  onImport: (file: File | null) => void;
  onSelect: (adId: string) => void;
}) {
  const activeCampaigns = campaigns.filter((campaign) => !campaign.archived);
  const canImport = !importing && activeCampaigns.length > 0;
  const issueRows = result ? [...result.skipped, ...result.errors] : [];
  const shownIssues = issueRows.slice(0, 8);
  const shownCreated = result?.created.slice(0, 6) ?? [];
  const unresolvedCount = result ? result.skippedCount + result.failedCount : 0;
  const cleanImport = Boolean(result && unresolvedCount === 0);

  return (
    <section className="rounded-md border border-black/10 bg-white p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-[#d94410]">
            <FileSpreadsheet size={16} />
            Import agendy
          </div>
          <h2 className="mt-2 text-lg font-semibold text-black">Načíst existující reklamy z Excelu</h2>
          <p className="mt-1 text-sm leading-6 text-[#59616b]">
            Nahrajte tabulku. Adclare založí reklamy a ukáže řádky k opravě.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-semibold text-[#59616b]">
            {["Kód", "Zadavatel", "Plátce", "Období", "Částka", "Původ financí", "Cílení"].map((label) => (
              <span key={label} className="rounded-md border border-black/10 bg-[#fbfbfc] px-2 py-1">
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-2 sm:min-w-[280px]">
          <label className="grid gap-1 text-xs font-semibold text-[#68707a]">
            Kampaň pro import
            <select
              value={campaignId}
              onChange={(event) => onCampaignChange(event.target.value)}
              className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm font-semibold text-[#20242a] outline-none focus:border-[#f45d1f]"
            >
              {activeCampaigns.length === 0 ? <option value="">Nejdřív založte kampaň</option> : null}
              {activeCampaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </label>
          <label className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold text-white transition ${canImport ? "cursor-pointer bg-[#11161c] hover:bg-black" : "cursor-not-allowed bg-[#c9cdd3]"}`}>
            <Upload size={16} />
            {importing ? "Importuji" : "Importovat Excel"}
            <input
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="sr-only"
              disabled={!canImport}
              onChange={(event) => {
                onImport(event.target.files?.[0] ?? null);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {result ? (
        <div className="mt-4 grid gap-3">
          <div className={`rounded-md border p-3 text-sm ${cleanImport ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-orange-200 bg-orange-50 text-orange-950"}`}>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="font-semibold">{cleanImport ? "Import dokončen bez řádků k opravě" : "Import dokončen, část řádků chce opravu"}</div>
                <p className="mt-1 leading-5">
                  {result.source
                    ? `${result.source.fileName} · list ${result.source.sheetName} · hlavička na řádku ${result.source.headerRow}`
                    : `Zpracováno ${result.totalRows} řádků.`}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold sm:grid-cols-4">
                {[
                  ["Řádků", result.totalRows],
                  ["Založeno", result.createdCount],
                  ["Přeskočeno", result.skippedCount],
                  ["Chyby", result.failedCount],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-black/10 bg-white/80 px-3 py-2">
                    <div className="text-[#68707a]">{label}</div>
                    <div className="mt-1 text-base text-black">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {shownCreated.length ? (
            <div className="rounded-md border border-black/10 bg-[#fbfbfc] p-3">
              <div className="text-sm font-semibold text-black">Založené reklamy</div>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {shownCreated.map((ad) => (
                  <button key={ad.id} type="button" onClick={() => onSelect(ad.id)} className="rounded-md border border-black/10 bg-white px-3 py-2 text-left text-sm text-[#20242a]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">{ad.id}</span>
                      <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${workflowClass[ad.workflowStatus]}`}>{ad.workflowLabel}</span>
                    </div>
                    <div className="mt-1 font-semibold">{ad.title}</div>
                    <div className="mt-1 text-xs text-[#68707a]">{ad.statusLabel}</div>
                  </button>
                ))}
              </div>
              {result.createdCount > shownCreated.length ? <div className="mt-2 text-xs font-semibold text-[#68707a]">Další založené reklamy jsou v seznamu reklam.</div> : null}
            </div>
          ) : null}

          <div className="rounded-md border border-black/10 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-black">Řádky k opravě</div>
              <div className={`rounded-md border px-2 py-1 text-xs font-semibold ${cleanImport ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-orange-200 bg-orange-50 text-orange-800"}`}>
                {cleanImport ? "Bez chyb" : `${unresolvedCount} řádků`}
              </div>
            </div>
            {shownIssues.length ? (
              <div className="mt-2 grid gap-2">
                {shownIssues.map((issue) => (
                  <div key={`${issue.rowNumber}:${issue.code}:${issue.message}`} className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-900">
                    <span className="font-semibold">Řádek {issue.rowNumber}</span>
                    {issue.code ? ` · ${issue.code}` : ""}
                    {issue.title ? ` · ${issue.title}` : ""}
                    <span className="block text-orange-800">{issue.message}</span>
                  </div>
                ))}
                {unresolvedCount > shownIssues.length ? (
                  <div className="rounded-md border border-black/10 bg-[#fbfbfc] px-3 py-2 text-sm font-semibold text-[#59616b]">
                    Další řádky opravte ve zdrojové tabulce a nahrajte import znovu.
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-sm leading-6 text-[#59616b]">Všechny řádky jsou založené. Doplňte soubory před schválením.</p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ProfilePanel({
  user,
  membership,
  inputRef,
  saving,
  message,
  onChange,
  onSave,
}: {
  user: AppWorkspacePayload["user"];
  membership: AppWorkspacePayload["membership"];
  inputRef: RefObject<HTMLInputElement | null>;
  saving: boolean;
  message: string;
  onChange: () => void;
  onSave: (name: string) => void;
}) {
  return (
    <section id="profile" className="rounded-md border border-black/10 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-black">Můj profil</h2>
          <p className="mt-1 text-sm text-[#59616b]">Jméno se ukazuje v historii a schvalování.</p>
        </div>
        {message ? <span className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">{message}</span> : null}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_160px] lg:items-end">
        <label className="grid gap-1 text-xs font-semibold text-[#68707a]">
          Jméno
          <input
            key={user.name}
            ref={inputRef}
            defaultValue={user.name}
            onChange={onChange}
            className="h-10 rounded-md border border-black/10 px-3 text-sm font-semibold text-black outline-none focus:border-[#f45d1f]"
          />
        </label>
        <div className="grid gap-1 text-xs font-semibold text-[#68707a]">
          E-mail a přístup
          <div className="min-w-0 rounded-md border border-black/10 bg-[#fbfbfc] px-3 py-2 text-sm">
            <div className="break-all font-semibold text-[#20242a]">{user.email}</div>
            <div className="mt-1 text-xs font-semibold text-[#68707a]">
              {membership.role} · {membership.scope}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onSave(inputRef.current?.value ?? "")}
          disabled={saving}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#11161c] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#c9cdd3]"
        >
          <Save size={15} />
          {saving ? "Ukládám" : "Uložit profil"}
        </button>
      </div>
    </section>
  );
}

function ArchiveExportPanel({ workspace }: { workspace: AppWorkspacePayload }) {
  const assetCount = workspace.ads.reduce((sum, ad) => sum + ad.assetCount, 0);
  const reviewCount = workspace.counts.review + workspace.counts.approved;
  const archiveStats = [
    ["Reklamy v balíku", workspace.counts.all],
    ["K doplnění", workspace.counts.needsData],
    ["Ke kontrole", reviewCount],
    ["Publikováno", workspace.counts.published],
  ];
  const archiveContents = [
    ["README.txt", "stručný popis exportu"],
    ["manifest.json", "kontrolní seznam souborů a SHA-256 otisků"],
    ["archive.json", "kompletní strukturovaná data"],
    ["ads.csv", "reklamy a veřejné odkazy"],
    ["campaigns.csv, branches.csv, candidates.csv", "kampaně, pobočky a kandidáti"],
    ["assets.csv, approvals.csv, audit-log.csv", "podklady, schválení a historie změn"],
    ["access-members.csv, access-invitations.csv", "přístupy, pokud je máte ve svém oprávnění"],
  ];
  const lastAuditLog = [...workspace.auditLogs].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] ?? null;

  return (
    <section id="archive" className="grid min-w-0 scroll-mt-6 gap-4 rounded-md border border-black/10 bg-white p-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-md border border-[#f45d1f]/20 bg-[#fff4ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#d94410]">
              <FileArchive size={14} />
              Balíčky pro kontrolu
            </div>
            <h2 className="mt-3 text-lg font-semibold text-black">Jeden balík pro kontrolu i vlastní archiv</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#59616b]">
              ZIP obsahuje reklamy, soubory, schválení a historii změn.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/api/app/exports/archive?locale=cs";
            }}
            className="inline-flex w-fit items-center justify-center gap-2 rounded-md bg-[#11161c] px-4 py-3 text-sm font-semibold text-white"
          >
            <Download size={15} />
            Stáhnout archiv
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          {archiveStats.map(([label, value]) => (
            <div key={label} className="rounded-md border border-black/10 bg-[#fbfbfc] p-3">
              <div className="text-xs font-semibold text-[#68707a]">{label}</div>
              <div className="mt-1 text-xl font-semibold text-black">{value}</div>
            </div>
          ))}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {[
            ["Kampaně", workspace.campaigns.length],
            ["Pobočky", workspace.branches.length],
            ["Kandidáti", workspace.candidates.length],
            ["Soubory", assetCount],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-black/10 bg-white p-3">
              <div className="text-xs font-semibold text-[#68707a]">{label}</div>
              <div className="mt-1 text-lg font-semibold text-black">{value}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-md border border-black/10 bg-[#fbfbfc] p-3">
          <h3 className="text-sm font-semibold text-black">Co archiv obsahuje</h3>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {archiveContents.map(([file, description]) => (
              <div key={file} className="rounded-md border border-black/10 bg-white p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-black">
                  <FileSpreadsheet size={15} />
                  {file}
                </div>
                <p className="mt-1 text-sm leading-6 text-[#59616b]">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside className="grid h-fit gap-3 rounded-md border border-black/10 bg-[#11161c] p-4 text-white xl:sticky xl:top-4">
        <div>
          <div className="inline-flex rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-white/70">
            historie
          </div>
          <h3 className="mt-3 text-lg font-semibold">Poslední změna</h3>
          <p className="mt-2 text-sm leading-6 text-white/72">
            {lastAuditLog ? `${lastAuditLog.actor}: ${lastAuditLog.message}` : "Zatím tu není žádná změna."}
          </p>
        </div>
        <div className="rounded-md border border-white/12 bg-white/8 p-3">
          <div className="text-sm font-semibold">Archivní období</div>
          <p className="mt-1 text-sm leading-6 text-white/72">
            Data se drží {workspace.tenant.retentionYears} let.
          </p>
        </div>
        <div className="rounded-md border border-white/12 bg-white/8 p-3">
          <div className="text-sm font-semibold">Záznamů změn</div>
          <p className="mt-1 text-2xl font-semibold">{workspace.auditLogs.length}</p>
        </div>
      </aside>
    </section>
  );
}

function AuditPanel({ logs }: { logs: AppWorkspacePayload["auditLogs"] }) {
  function auditActionLabel(action: string) {
    const labels: Record<string, string> = {
      approve_ad: "Schválení reklamy",
      create_new_version: "Nová verze reklamy",
      create_ad: "Nová reklama",
      create_branch: "Nová pobočka",
      create_campaign: "Nová kampaň",
      create_candidate: "Nový kandidát",
      create_invitation: "Pozvánka",
      download_ad_asset: "Stažení souboru",
      download_audit_package: "Stažení auditního balíčku",
      download_qr_package: "Stažení QR balíčku",
      export_workspace_archive: "Stažení balíčku pro kontrolu",
      import_ad: "Import reklamy",
      import_ads_batch: "Import agendy",
      login_magic_link: "Přihlášení e-mailem",
      logout: "Odhlášení",
      prepare_audit_export: "Příprava auditního balíčku",
      publish_ad: "Publikace reklamy",
      request_ad_changes: "Vrácení k doplnění",
      retry_invitation_email: "Opětovné odeslání pozvánky",
      revoke_invitation: "Zrušení pozvánky",
      update_ad: "Úprava reklamy",
      update_branch: "Úprava pobočky",
      update_campaign: "Úprava kampaně",
      update_candidate: "Úprava kandidáta",
      update_member: "Úprava přístupu",
      update_profile: "Úprava profilu",
      update_tenant_settings: "Nastavení pracovního prostoru",
      upload_ad_asset: "Nahrání podkladu",
    };
    const key = action.toLowerCase();

    return labels[key] ?? key.split("_").filter(Boolean).join(" ");
  }

  function formatAuditJson(value: unknown) {
    if (!value || (typeof value === "object" && Object.keys(value as Record<string, unknown>).length === 0)) {
      return "";
    }

    return JSON.stringify(value, null, 2);
  }

  const [filters, setFilters] = useState({
    q: "",
    actor: "all",
    action: "all",
    entityType: "all",
    outcome: "all",
  });
  const [selectedAuditId, setSelectedAuditId] = useState("");
  const sortedLogs = [...logs].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  const actorOptions = [...new Set(sortedLogs.map((log) => log.actor).filter(Boolean))].sort((a, b) => a.localeCompare(b, "cs"));
  const actionOptions = [...new Set(sortedLogs.map((log) => log.action).filter(Boolean))].sort((a, b) => auditActionLabel(a).localeCompare(auditActionLabel(b), "cs"));
  const entityOptions = [...new Set(sortedLogs.map((log) => log.entityType).filter(Boolean))].sort((a, b) => a.localeCompare(b, "cs"));
  const filteredLogs = sortedLogs.filter((log) => {
    const query = filters.q.trim().toLowerCase();
    const haystack = [log.actor, log.action, log.message, log.entityType, log.entityId, log.entityLabel, log.requestId, log.entryHash].join(" ").toLowerCase();

    return (
      (!query || haystack.includes(query)) &&
      (filters.actor === "all" || log.actor === filters.actor) &&
      (filters.action === "all" || log.action === filters.action) &&
      (filters.entityType === "all" || log.entityType === filters.entityType) &&
      (filters.outcome === "all" || log.outcome === filters.outcome)
    );
  });
  const selectedLog = filteredLogs.find((log) => log.id === selectedAuditId) ?? filteredLogs[0] ?? null;
  const actorCount = new Set(logs.map((log) => log.actor)).size;
  const actionCounts = Array.from(logs.reduce((counts, log) => {
    const label = auditActionLabel(log.action);

    return counts.set(label, (counts.get(label) ?? 0) + 1);
  }, new Map<string, number>())).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "cs"),
  );
  const latestLog = sortedLogs[0] ?? null;
  const verifiedCount = logs.filter((log) => log.entryHash && log.sequence !== "0").length;

  return (
    <section id="audit" className="scroll-mt-6 rounded-md border border-black/10 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-black">Historie změn</h2>
          <p className="mt-1 text-sm text-[#59616b]">Rychlý přehled, kdo co upravil, schválil, zveřejnil nebo stáhl.</p>
        </div>
        <span className="inline-flex w-fit rounded-md border border-black/10 bg-[#fbfbfc] px-3 py-1.5 text-sm font-semibold text-[#25282d]">
          {filteredLogs.length}/{logs.length} záznamů
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        {[
          ["Záznamy", logs.length],
          ["Lidé v historii", actorCount],
          ["Typy změn", actionCounts.length],
          ["Ověřitelné hashem", verifiedCount],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-black/10 bg-[#fbfbfc] p-3">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#68707a]">{label}</div>
            <div className="mt-2 text-lg font-semibold text-black">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-md border border-black/10 bg-[#fbfbfc] p-3">
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#68707a]">Nejčastější změny</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {actionCounts.length ? actionCounts.slice(0, 8).map(([action, count]) => (
              <span key={action} className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-[#59616b]">
                {action}: {count}
              </span>
            )) : <span className="text-sm text-[#59616b]">Zatím bez změn.</span>}
          </div>
        </div>
        <div className="rounded-md border border-black/10 bg-[#fbfbfc] p-3">
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#68707a]">Poslední aktivita</div>
          <p className="mt-2 text-sm leading-6 text-[#59616b]">
            {latestLog ? `${latestLog.actor} upravil záznam ${new Date(latestLog.createdAt).toLocaleString("cs-CZ")}.` : "Zatím tu není žádná aktivita."}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 rounded-md border border-black/10 bg-[#fbfbfc] p-3 lg:grid-cols-6">
        <label className="grid gap-1 text-xs font-semibold text-[#68707a] lg:col-span-2">
          Hledat
          <input
            value={filters.q}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
            placeholder="aktér, akce, objekt, request id"
            className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm font-medium text-black outline-none focus:border-[#f45d1f]"
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[#68707a]">
          Aktér
          <select
            value={filters.actor}
            onChange={(event) => setFilters((current) => ({ ...current, actor: event.target.value }))}
            className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm font-medium text-black outline-none focus:border-[#f45d1f]"
          >
            <option value="all">Všichni</option>
            {actorOptions.map((actor) => (
              <option key={actor} value={actor}>
                {actor}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[#68707a]">
          Akce
          <select
            value={filters.action}
            onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))}
            className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm font-medium text-black outline-none focus:border-[#f45d1f]"
          >
            <option value="all">Všechny</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {auditActionLabel(action)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[#68707a]">
          Objekt
          <select
            value={filters.entityType}
            onChange={(event) => setFilters((current) => ({ ...current, entityType: event.target.value }))}
            className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm font-medium text-black outline-none focus:border-[#f45d1f]"
          >
            <option value="all">Všechny</option>
            {entityOptions.map((entityType) => (
              <option key={entityType} value={entityType}>
                {entityType}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[#68707a]">
          Výsledek
          <select
            value={filters.outcome}
            onChange={(event) => setFilters((current) => ({ ...current, outcome: event.target.value }))}
            className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm font-medium text-black outline-none focus:border-[#f45d1f]"
          >
            <option value="all">Všechny</option>
            <option value="success">Úspěch</option>
            <option value="failure">Chyba</option>
            <option value="denied">Zamítnuto</option>
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-2">
        {filteredLogs.slice(0, 30).map((log) => (
          <button
            key={log.id}
            type="button"
            onClick={() => setSelectedAuditId(log.id)}
            className={`grid gap-2 rounded-md border p-3 text-left lg:grid-cols-[180px_190px_150px_minmax(0,1fr)] ${
              selectedLog?.id === log.id ? "border-[#f45d1f] bg-orange-50/55" : "border-black/10 bg-[#fbfbfc]"
            }`}
          >
            <div className="text-xs font-semibold text-[#68707a]">{new Date(log.createdAt).toLocaleString("cs-CZ")}</div>
            <div className="break-all text-sm font-semibold text-[#20242a]">{log.actor}</div>
            <div className="text-xs font-semibold text-[#68707a]">
              {log.entityType || "event"}
              {log.sequence && log.sequence !== "0" ? ` #${log.sequence}` : ""}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#d94410]">{auditActionLabel(log.action)}</div>
              <p className="mt-1 text-sm leading-6 text-[#59616b]">{log.message}</p>
            </div>
          </button>
        ))}
        {logs.length === 0 ? <div className="rounded-md border border-black/10 p-3 text-sm text-[#59616b]">Zatím tu nejsou žádné změny.</div> : null}
        {logs.length > 0 && filteredLogs.length === 0 ? <div className="rounded-md border border-black/10 p-3 text-sm text-[#59616b]">Filtr neodpovídá žádnému záznamu.</div> : null}
      </div>

      {selectedLog ? (
        <div className="mt-4 rounded-md border border-black/10 bg-[#11161c] p-4 text-white">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-white/64">Detail auditního záznamu</div>
              <h3 className="mt-2 text-lg font-semibold">{auditActionLabel(selectedLog.action)}</h3>
              <p className="mt-1 text-sm leading-6 text-white/72">{selectedLog.message}</p>
            </div>
            <span className={`w-fit rounded-md px-2.5 py-1 text-xs font-semibold ${selectedLog.outcome === "success" ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"}`}>
              {selectedLog.outcome || "success"}
            </span>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Aktér", selectedLog.actor],
              ["Role", selectedLog.actorRole || "-"],
              ["Oblast", selectedLog.actorScope || "-"],
              ["Objekt", [selectedLog.entityType, selectedLog.entityLabel || selectedLog.entityId].filter(Boolean).join(": ") || "-"],
              ["Request ID", selectedLog.requestId || "-"],
              ["Correlation ID", selectedLog.correlationId || "-"],
              ["Sequence", selectedLog.sequence || "-"],
              ["Hash", selectedLog.entryHash ? `${selectedLog.entryHash.slice(0, 16)}...` : "-"],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-md border border-white/12 bg-white/8 p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-white/56">{label}</div>
                <div className="mt-1 break-all text-sm font-semibold text-white">{value}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-3">
            {[
              ["Před změnou", selectedLog.before],
              ["Po změně", selectedLog.after],
              ["Metadata", selectedLog.metadata],
            ].map(([label, value]) => {
              const text = formatAuditJson(value);

              return (
                <div key={String(label)} className="min-w-0 rounded-md border border-white/12 bg-white/8 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-white/56">{String(label)}</div>
                  {text ? <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-white/78">{text}</pre> : <p className="mt-2 text-sm text-white/56">Bez dat.</p>}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MissingDataQueue({
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
  const missingAds = useMemo(() => ads.filter((ad) => ad.workflowStatus === "NEEDS_DATA" || ad.missing.length > 0), [ads]);

  if (missingAds.length === 0) {
    return null;
  }

  return (
    <section id="missing-data" className="scroll-mt-6 rounded-md border border-orange-200 bg-orange-50/55 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-black">Co je potřeba doplnit</h2>
          <p className="mt-1 text-sm text-[#59616b]">Doplňte chybějící údaje nebo připomínky.</p>
        </div>
        <span className="inline-flex w-fit rounded-md border border-orange-200 bg-white px-3 py-1.5 text-sm font-semibold text-orange-800">
          {missingAds.length} k doplnění
        </span>
      </div>
      <div className="mt-3 grid gap-2 lg:grid-cols-3">
        {missingAds.slice(0, 6).map((ad) => (
          <article key={ad.id} className={`rounded-md border bg-white p-3 ${selectedId === ad.id ? "border-[#f45d1f] shadow-sm" : "border-orange-200"}`}>
            <button type="button" onClick={() => onSelect(ad.id)} className="block w-full text-left">
              <div className="font-mono text-xs font-semibold text-[#68707a]">{ad.id}</div>
              <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-black">{ad.title}</h3>
              <div className="mt-2 text-xs text-[#59616b]">{ad.branch} · {ad.publicationDate}</div>
              {ad.missing.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ad.missing.slice(0, 4).map((item) => (
                    <span key={item} className="rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-800">
                      {item}
                    </span>
                  ))}
                  {ad.missing.length > 4 ? (
                    <span className="rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-800">
                      +{ad.missing.length - 4}
                    </span>
                  ) : null}
                </div>
              ) : ad.statusNote ? (
                <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-orange-800">{ad.statusNote}</p>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => onEdit(ad)}
              disabled={!writable}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#11161c] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#c9cdd3]"
            >
              <Edit3 size={15} />
              Doplnit údaje
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReviewInbox({
  ads,
  selectedId,
  onSelect,
}: {
  ads: AdRecord[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { reviewAds, waitingForApproval, waitingForPublication } = useMemo(() => {
    const nextReviewAds: AdRecord[] = [];
    let approvalCount = 0;
    let publicationCount = 0;

    for (const ad of ads) {
      if (ad.workflowStatus === "READY_FOR_REVIEW") {
        nextReviewAds.push(ad);
        approvalCount += 1;
      } else if (ad.workflowStatus === "APPROVED") {
        nextReviewAds.push(ad);
        publicationCount += 1;
      }
    }

    return {
      reviewAds: nextReviewAds,
      waitingForApproval: approvalCount,
      waitingForPublication: publicationCount,
    };
  }, [ads]);

  return (
    <section id="review" className="scroll-mt-6 rounded-md border border-sky-200 bg-sky-50/55 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-black">Ke kontrole a publikaci</h2>
          <p className="mt-1 text-sm text-[#59616b]">
            Reklamy připravené pro kontrolu, schválení nebo publikaci. Schvalovatel hned vidí, kde chybí podklad a co má udělat dál.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex w-fit rounded-md border border-sky-200 bg-white px-3 py-1.5 text-sm font-semibold text-sky-800">
            {waitingForApproval} ke schválení
          </span>
          <span className="inline-flex w-fit rounded-md border border-emerald-200 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-800">
            {waitingForPublication} k publikaci
          </span>
        </div>
      </div>
      {reviewAds.length ? (
        <div className="mt-3 grid gap-2 lg:grid-cols-3">
          {reviewAds.map((ad) => {
            const assetReady = ad.assetCount > 0;
            const actionText =
              ad.workflowStatus === "APPROVED"
                ? "Další krok: publikovat"
                : assetReady
                  ? "Další krok: schválit nebo vrátit"
                  : "Další krok: nahrát podklad";

            return (
              <button
                key={ad.id}
                type="button"
                onClick={() => onSelect(ad.id)}
                className={`rounded-md border p-3 text-left ${
                  selectedId === ad.id ? "border-[#f45d1f] bg-white shadow-sm" : "border-sky-200 bg-white/75 hover:bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-semibold text-[#68707a]">{ad.id}</div>
                    <div className="mt-1 line-clamp-2 text-sm font-semibold text-black">{ad.title}</div>
                    <div className="mt-2 text-xs text-[#59616b]">{ad.branch} · {ad.publicationDate}</div>
                  </div>
                  <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-semibold ${workflowClass[ad.workflowStatus]}`}>
                    {ad.workflowLabel}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className={`rounded-md px-2 py-1 text-xs font-semibold ${assetReady ? "bg-emerald-50 text-emerald-800" : "bg-orange-50 text-orange-800"}`}>
                    {assetReady ? `${ad.assetCount} podkladů` : "chybí podklad"}
                  </span>
                  <span className="rounded-md bg-[#f1f2f4] px-2 py-1 text-xs font-semibold text-[#59616b]">{ad.channel}</span>
                  {ad.candidate ? <span className="rounded-md bg-[#f1f2f4] px-2 py-1 text-xs font-semibold text-[#59616b]">{ad.candidate}</span> : null}
                </div>
                <div className={`mt-3 rounded-md border px-3 py-2 text-xs font-semibold ${assetReady ? "border-sky-200 bg-sky-50 text-sky-800" : "border-orange-200 bg-orange-50 text-orange-800"}`}>
                  {actionText}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 rounded-md border border-sky-200 bg-white p-3 text-sm font-semibold text-[#59616b]">
          Žádná reklama teď nečeká na kontrolu.
        </div>
      )}
    </section>
  );
}

function AdComplianceProcess({ ad }: { ad: AdRecord }) {
  const steps = adProcessSteps(ad);
  const doneCount = steps.filter((step) => step.done).length;
  const nextStep = steps.find((step) => !step.done);
  const percent = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="rounded-md border border-black/10 bg-white p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-black">Kontrolní proces reklamy</h3>
          <p className="mt-1 text-sm leading-6 text-[#59616b]">
            Osm bodů od záznamu po TTPA výstupy.
          </p>
        </div>
        <div className="shrink-0 rounded-md border border-black/10 bg-[#fbfbfc] px-3 py-2 text-sm font-semibold text-[#25282d]">
          {doneCount}/8 hotovo
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eceff3]">
        <div className="h-full rounded-full bg-[#f45d1f]" style={{ width: `${percent}%` }} />
      </div>
      {nextStep ? (
        <div className="mt-3 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-800">
          Teď řešit: {nextStep.nextAction}
        </div>
      ) : (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
          Proces reklamy je uzavřený.
        </div>
      )}
      <div className="mt-3 grid gap-2 md:grid-cols-2 2xl:grid-cols-4">
        {steps.map((step) => {
          const active = nextStep?.key === step.key;
          const statusClass = step.done
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : active
              ? "border-orange-200 bg-orange-50 text-orange-800"
              : "border-black/10 bg-[#fbfbfc] text-[#68707a]";
          const Icon = step.done ? CheckCircle2 : active ? AlertTriangle : CircleDot;

          return (
            <article key={step.key} className={`rounded-md border p-3 ${statusClass}`}>
              <div className="flex items-start gap-2">
                <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-black">{step.title}</h4>
                  <p className="mt-1 text-xs leading-5 text-current">{step.text}</p>
                  <div className="mt-2 text-xs font-semibold uppercase tracking-[0.08em]">
                    {step.done ? "hotovo" : active ? "teď řešit" : "čeká"}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function DetailPanel({
  ad,
  writable,
  reviewable,
  uploadable,
  actioning,
  uploading,
  storage,
  reviewNote,
  onEdit,
  onUpload,
  onApprove,
  onPublish,
  onRequestChanges,
  onReviewNoteChange,
}: {
  ad: AdRecord | null;
  writable: boolean;
  reviewable: boolean;
  uploadable: boolean;
  actioning: string;
  uploading: string;
  storage: AppWorkspacePayload["storage"];
  reviewNote: string;
  onEdit: (ad: AdRecord) => void;
  onUpload: (ad: AdRecord, file: File | null) => void;
  onApprove: (ad: AdRecord) => void;
  onPublish: (ad: AdRecord) => void;
  onRequestChanges: (ad: AdRecord) => void;
  onReviewNoteChange: (value: string) => void;
}) {
  const [copiedUrlFor, setCopiedUrlFor] = useState("");

  if (!ad) {
    return (
      <aside id="ad-detail" className="min-w-0 scroll-mt-4 rounded-md border border-black/10 bg-white p-5 text-sm text-[#59616b]">
        Vyberte nebo přidejte reklamu.
      </aside>
    );
  }

  const steps = adProcessSteps(ad);
  const nextStep = steps.find((step) => !step.done);
  const copiedPublicUrl = copiedUrlFor === ad.id;
  const fileUploadEnabled = uploadable && storage.configured && !uploading;
  const outputItems = [
    {
      label: "Oznámení",
      value: ad.missing.length === 0 ? "Veřejný link je připravený." : "Po doplnění údajů se link zobrazí veřejně.",
      ready: ad.missing.length === 0,
    },
    {
      label: "QR kód",
      value: ad.canDownloadQr ? "SVG, PNG, tiskový štítek, manifest a data oznámení." : "Po doplnění povinných údajů půjde stáhnout.",
      ready: ad.canDownloadQr,
    },
    {
      label: "Balíček pro kontrolu",
      value: "JSON, CSV historie, veřejné oznámení a schvalování.",
      ready: true,
    },
  ];
  const rows = [
    ["Veřejná URL", ad.publicUrl],
    ["Kampaň", ad.campaign],
    ["Tagy kampaně", ad.campaignTags.length ? ad.campaignTags.join(", ") : "bez tagů"],
    ["Kandidát", ad.candidate || "nepřiřazen"],
    ["Plátce", ad.payer || "chybí"],
    ["Dodavatel", ad.supplier || "chybí"],
    ["Částka", ad.amount || "chybí"],
    ["Původ financí", ad.fundingSource || "chybí"],
    ["Období", ad.period || "chybí"],
    ["Oblast", ad.distributionArea || "chybí"],
    ["Cílení", ad.isTargeted ? ad.targetAudience || "chybí publikum" : "nepoužito"],
    ["Soubory", ad.assetCount ? `${ad.assetCount} nahráno` : "zatím žádný"],
    ["Verze", `v${ad.version}${ad.locked ? " · zamčeno" : ""}`],
    ...(ad.statusNote ? ([["Poznámka", ad.statusNote]] as const) : []),
  ];

  return (
    <section id="ad-detail" className="min-w-0 scroll-mt-4 rounded-md border border-black/10 bg-white">
      <div className="border-b border-black/10 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[#68707a]">Pracovní detail reklamy</div>
            <h2 className="mt-1 text-2xl font-semibold leading-tight text-black">{ad.title}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${workflowClass[ad.workflowStatus]}`}>{ad.workflowLabel}</span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-black/10 bg-[#fbfbfc] px-2.5 py-1 text-xs font-semibold text-[#25282d]">
                <FileArchive size={13} />
                {ad.id}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-black/10 bg-[#fbfbfc] px-2.5 py-1 text-xs font-semibold text-[#25282d]">
                v{ad.version}
                {ad.locked ? " · zamčeno" : ""}
              </span>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[360px]">
            <button
              type="button"
              onClick={() => onEdit(ad)}
              disabled={!writable}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#11161c] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#c9cdd3]"
            >
              <Edit3 size={15} />
              Upravit údaje
            </button>
            <a className="inline-flex items-center justify-center gap-2 rounded-md border border-black/10 px-4 py-3 text-sm font-semibold text-[#d94410]" href={noticeHref(ad.publicUrl)}>
              Veřejné oznámení
              <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4">
        {ad.missing.length ? (
          <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm font-semibold text-orange-800">
            <div>Ještě doplnit před dalším krokem:</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ad.missing.map((item) => (
                <span key={item} className="rounded-md border border-orange-200 bg-white px-2 py-1 text-xs font-semibold text-orange-800">
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
            Reklama má vyplněné povinné údaje.
          </div>
        )}

        <div className="rounded-md border border-black/10 bg-[#fbfbfc] p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-md border border-[#f45d1f]/25 bg-[#fff4ef] px-2.5 py-1 text-xs font-semibold text-[#d94410]">
                <QrCode size={14} />
                Výstupy
              </div>
              <h3 className="mt-3 text-lg font-semibold text-black">QR, veřejné oznámení a kontrola</h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[#59616b]">
                Zkontrolujte odkaz, QR podklady a kontrolní balíček.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={ad.canDownloadQr ? qrPackageHref(ad.id) : undefined}
                aria-disabled={!ad.canDownloadQr}
                className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
                  ad.canDownloadQr ? "border border-black/10 bg-white text-[#25282d]" : "cursor-not-allowed border border-black/10 bg-white text-[#9aa0a8]"
                }`}
              >
                <Download size={15} />
                Stáhnout QR kód
              </a>
              <a
                href={auditPackageHref(ad.id)}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#25282d]"
              >
                <FileArchive size={15} />
                Stáhnout balíček pro kontrolu
              </a>
            </div>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0 rounded-md border border-black/10 bg-white p-3">
              <div className="text-xs font-semibold uppercase text-[#68707a]">Veřejná URL v QR kódu</div>
              <a className="mt-1 block break-all text-sm font-semibold text-[#d94410]" href={noticeHref(ad.publicUrl)}>
                {ad.publicUrl}
              </a>
            </div>
            <button
              type="button"
              onClick={async () => {
                const copyWithFallback = () => {
                  const textarea = document.createElement("textarea");
                  textarea.value = ad.publicUrl;
                  textarea.setAttribute("readonly", "true");
                  textarea.style.position = "fixed";
                  textarea.style.left = "-9999px";
                  document.body.appendChild(textarea);
                  textarea.select();
                  document.execCommand("copy");
                  textarea.remove();
                };

                try {
                  if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(ad.publicUrl);
                  } else {
                    copyWithFallback();
                  }
                } catch {
                  copyWithFallback();
                }

                setCopiedUrlFor(ad.id);
                window.setTimeout(() => setCopiedUrlFor((current) => (current === ad.id ? "" : current)), 1800);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#25282d]"
            >
              <Copy size={15} />
              {copiedPublicUrl ? "Zkopírováno" : "Kopírovat URL"}
            </button>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {outputItems.map((item) => (
              <div key={item.label} className="rounded-md border border-black/10 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-semibold text-black">{item.label}</div>
                  <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${item.ready ? "bg-emerald-50 text-emerald-800" : "bg-orange-50 text-orange-800"}`}>
                    {item.ready ? "připraveno" : "čeká"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-5 text-[#59616b]">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
          <div className="grid gap-3">
            <AdComplianceProcess ad={ad} />

            <div className="rounded-md border border-black/10 bg-[#fbfbfc] p-3">
              <h3 className="text-sm font-semibold text-black">Veřejné oznámení</h3>
              <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                {rows.map(([label, value]) => (
                  <div key={label} className="grid min-w-0 gap-1 rounded-md border border-black/10 bg-white p-3">
                    <span className="min-w-0 text-xs font-semibold uppercase text-[#68707a]">{label}</span>
                    <span className={`min-w-0 break-all ${value === "chybí" || value === "chybí publikum" ? "font-semibold text-red-700" : "font-semibold text-[#20242a]"}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-black/10 bg-[#fbfbfc] p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-black">Soubory materiálu</h3>
                  <div className="mt-1 text-xs leading-5 text-[#68707a]">
                    {storage.configured ? `Přidejte podklad reklamy, tiskové PDF, banner nebo video. Limit ${storage.maxUploadSizeMb} MB.` : "Nahrávání souborů není v této instalaci zapnuté."}
                  </div>
                </div>
                <label
                  className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
                    fileUploadEnabled ? "cursor-pointer bg-[#11161c] text-white" : "cursor-not-allowed bg-[#c9cdd3] text-white"
                  }`}
                >
                  <Upload size={15} />
                  {uploading === ad.id ? "Nahrávám" : "Nahrát soubor"}
                  <input
                    type="file"
                    className="sr-only"
                    disabled={!fileUploadEnabled}
                    accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,video/mp4,video/quicktime"
                    onChange={(event) => {
                      onUpload(ad, event.target.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
              {ad.assets.length ? (
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {ad.assets.map((asset) => (
                    <a
                      key={asset.id}
                      href={asset.downloadUrl}
                      className="flex items-center justify-between gap-3 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#20242a]"
                    >
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <Paperclip size={15} className="shrink-0 text-[#68707a]" />
                        <span className="truncate">{asset.originalName}</span>
                      </span>
                      <span className="shrink-0 text-xs text-[#68707a]">{asset.sizeLabel}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-md border border-black/10 bg-white p-3 text-sm text-[#59616b]">Zatím není nahraný žádný soubor.</div>
              )}
            </div>
          </div>

          <div className="grid content-start gap-3">
            <div className="rounded-md border border-black/10 bg-white p-3">
              <h3 className="text-sm font-semibold text-black">Další krok</h3>
              <p className="mt-1 text-sm leading-6 text-[#59616b]">
                {nextStep
                  ? nextStep.nextAction
                  : ad.canApprove
                    ? "Reklama čeká na kontrolu. Můžete ji schválit, nebo ji vrátit k doplnění."
                    : ad.canPublish
                      ? "Reklama je schválená a připravená k publikaci."
                      : "Záznam je připravený pro veřejné oznámení a exporty."}
              </p>
              <div className="mt-3 grid gap-2">
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
              </div>
            </div>

            {ad.canRequestChanges ? (
              <div className="grid gap-2 rounded-md border border-black/10 bg-[#fbfbfc] p-3">
                <label className="grid gap-1.5 text-sm font-semibold text-[#20242a]">
                  Komentář pro doplnění
                  <textarea
                    value={reviewNote}
                    onChange={(event) => onReviewNoteChange(event.target.value)}
                    disabled={!reviewable || Boolean(actioning)}
                    rows={4}
                    maxLength={800}
                    placeholder="Například: Doplňte plátce a přesné období šíření."
                    className="resize-none rounded-md border border-black/10 bg-white px-3 py-2 font-normal outline-none focus:border-[#f45d1f] disabled:bg-[#f1f2f4]"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => onRequestChanges(ad)}
                  disabled={!reviewable || !reviewNote.trim() || actioning === `request-changes:${ad.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-800 disabled:cursor-not-allowed disabled:text-[#9aa0a8]"
                >
                  <AlertTriangle size={15} />
                  {actioning === `request-changes:${ad.id}` ? "Vracím" : "Vrátit k doplnění"}
                </button>
              </div>
            ) : null}

            {ad.reviewEvents.length ? (
              <div className="rounded-md border border-black/10 bg-white p-3">
                <div className="text-sm font-semibold text-black">Historie kontroly</div>
                <div className="mt-3 grid gap-2">
                  {ad.reviewEvents.map((event) => (
                    <div key={event.id} className="rounded-md border border-black/10 bg-[#fbfbfc] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${reviewEventClass(event.status)}`}>{event.statusLabel}</span>
                        <span className="text-xs font-semibold text-[#68707a]">{event.createdAt}</span>
                      </div>
                      <div className="mt-2 text-xs text-[#68707a]">{event.actor}</div>
                      {event.note ? <p className="mt-1 text-sm font-semibold leading-5 text-[#20242a]">{event.note}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
