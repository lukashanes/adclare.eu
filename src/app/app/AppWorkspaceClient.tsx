"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowUpRight, Building2, CalendarDays, CheckCircle2, CircleDot, Download, Edit3, FileArchive, FileSpreadsheet, FolderKanban, Paperclip, Plus, RefreshCw, Save, Search, ShieldCheck, Tags, Upload, Users, X } from "lucide-react";
import type { AdImportResult, AdRecord, AppBranchUpdateInput, AppCampaignInput, AppCandidateInput, AppMemberUpdateInput, AppTenantSettingsInput, AppWorkspacePayload, EditableAdInput, InviteInput } from "@/lib/admin-demo-types";

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

function roleNeedsBranch(role: InviteInput["role"]) {
  return role !== "PARTY_ADMIN" && role !== "CENTRAL_REVIEWER" && role !== "READONLY_AUDITOR" && role !== "SUPER_ADMIN" && role !== "CANDIDATE";
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

  return {
    ...workspace,
    candidates,
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
      text: hasReviewFlow ? "Reklamy už běží kontrolou, schválením nebo publikací." : "Po doplnění údajů přijde kontrola, QR kód a transparentní oznámení.",
      done: hasReviewFlow,
      href: workspace.counts.review > 0 ? "#review" : "#ads",
      action: workspace.counts.review > 0 ? "Otevřít kontrolu" : "Pokračovat",
      visible: true,
    },
    {
      key: "ttpa",
      title: "8. V souladu s TTPA",
      text: hasReadyOutput ? "Výsledek: označení, QR, oznámení a auditní balíček jsou připravené." : "Cíl: reklama má podklady pro soulad s Nařízením EU o transparentnosti a cílení politické reklamy.",
      done: hasPublishedAds || hasReadyOutput,
      href: workspace.counts.needsData > 0 ? "#missing-data" : "#ads",
      action: hasReadyOutput ? "Stáhnout výstupy" : "Doplnit mezery",
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

  const selectedAd = workspace.ads.find((ad) => ad.id === selectedId) ?? workspace.ads[0] ?? null;
  const writable = canManageAds(workspace);
  const reviewable = canReviewAds(workspace);
  const progress = setupProgress(workspace);
  const filteredAds = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return workspace.ads;
    }

    return workspace.ads.filter((ad) =>
      [ad.id, ad.title, ad.branch, ad.campaign, ad.candidate, ad.campaignTags.join(" "), ad.owner, ad.supplier, ad.distributionArea].some((value) =>
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
      setSelectedId((current) => (payload.ads.some((ad) => ad.id === current) ? current : initialSelectedAdId(payload)));
    } catch {
      setError("Data se nepodařilo načíst. Zkuste obnovit stránku.");
    } finally {
      setRefreshing(false);
    }
  }

  async function createBranch() {
    if (!workspace.permissions.canManageBranches || !branchName.trim()) {
      return;
    }

    setBranchSaving(true);
    setError("");

    try {
      const response = await fetch("/api/app/branches?locale=cs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: branchName,
          kind: branchKind,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || `Branch create failed with ${response.status}`);
      }

      setBranchName("");
      await refreshWorkspace();
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
      const response = await fetch("/api/app/settings?locale=cs", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
      const payload = (await response.json().catch(() => ({}))) as { tenant?: AppWorkspacePayload["tenant"]; error?: string };

      if (!response.ok || !payload.tenant) {
        throw new Error(payload.error || `Settings update failed with ${response.status}`);
      }

      setWorkspace((current) => ({
        ...current,
        tenant: payload.tenant as AppWorkspacePayload["tenant"],
      }));
      setSettingsMessage("Nastavení je uložené.");
      await refreshWorkspace();
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
      const response = await fetch(`/api/app/branches/${encodeURIComponent(branchId)}?locale=cs`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
      const payload = (await response.json().catch(() => ({}))) as { branch?: AppWorkspacePayload["branches"][number]; error?: string };

      if (!response.ok || !payload.branch) {
        throw new Error(payload.error || `Branch update failed with ${response.status}`);
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
      const response = await fetch("/api/app/campaigns?locale=cs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: campaignName,
          election: campaignElection,
          startsAt: campaignStartsAt,
          endsAt: campaignEndsAt,
          tags: campaignTags.split(",").map((tag) => tag.trim()).filter(Boolean),
        } satisfies AppCampaignInput),
      });
      const payload = (await response.json().catch(() => ({}))) as { campaign?: AppWorkspacePayload["campaigns"][number]; error?: string };

      if (!response.ok || !payload.campaign) {
        throw new Error(payload.error || `Campaign create failed with ${response.status}`);
      }

      setWorkspace((current) => workspaceWithCampaign(current, payload.campaign as AppWorkspacePayload["campaigns"][number]));
      setCampaignName("");
      setCampaignTags("");
      setImportCampaignId((current) => current || payload.campaign?.id || "");
      await refreshWorkspace();
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
      const response = await fetch(`/api/app/campaigns/${encodeURIComponent(campaignId)}?locale=cs`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
      const payload = (await response.json().catch(() => ({}))) as { campaign?: AppWorkspacePayload["campaigns"][number]; error?: string };

      if (!response.ok || !payload.campaign) {
        throw new Error(payload.error || `Campaign update failed with ${response.status}`);
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
      const response = await fetch("/api/app/candidates?locale=cs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: candidateName,
          branchId: candidateBranchId,
          ballotNumber: candidateBallotNumber,
        } satisfies AppCandidateInput),
      });
      const payload = (await response.json().catch(() => ({}))) as { candidate?: AppWorkspacePayload["candidates"][number]; error?: string };

      if (!response.ok || !payload.candidate) {
        throw new Error(payload.error || `Candidate create failed with ${response.status}`);
      }

      setWorkspace((current) => workspaceWithCandidate(current, payload.candidate as AppWorkspacePayload["candidates"][number]));
      setCandidateName("");
      setCandidateBallotNumber("");
      await refreshWorkspace();
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
      const response = await fetch(`/api/app/candidates/${encodeURIComponent(candidateId)}?locale=cs`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
      const payload = (await response.json().catch(() => ({}))) as { candidate?: AppWorkspacePayload["candidates"][number]; error?: string };

      if (!response.ok || !payload.candidate) {
        throw new Error(payload.error || `Candidate update failed with ${response.status}`);
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
      const response = await fetch("/api/app/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanName,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { user?: AppWorkspacePayload["user"]; error?: string };

      if (!response.ok || !payload.user) {
        throw new Error(payload.error || `Profile update failed with ${response.status}`);
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
      const response = await fetch(`/api/app/users/${encodeURIComponent(memberId)}?locale=cs`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
      const payload = (await response.json().catch(() => ({}))) as { member?: AppWorkspacePayload["users"]["members"][number]; error?: string };

      if (!response.ok || !payload.member) {
        throw new Error(payload.error || `Member update failed with ${response.status}`);
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
      const response = await fetch("/api/app/users?locale=cs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(inviteForm),
      });
      const payload = (await response.json().catch(() => ({}))) as { invitation?: AppWorkspacePayload["users"]["invitations"][number]; error?: string };

      if (!response.ok || !payload.invitation) {
        throw new Error(payload.error || `Invite failed with ${response.status}`);
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
      const response = await fetch(`/api/app/users/${encodeURIComponent(invitationId)}/retry-email?locale=cs`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as { invitation?: AppWorkspacePayload["users"]["invitations"][number]; error?: string };

      if (!response.ok || !payload.invitation) {
        throw new Error(payload.error || `Invite email retry failed with ${response.status}`);
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
      const response = await fetch(`/api/app/users/${encodeURIComponent(invitationId)}/revoke-invitation?locale=cs`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as { invitation?: AppWorkspacePayload["users"]["invitations"][number]; error?: string };

      if (!response.ok || !payload.invitation) {
        throw new Error(payload.error || `Invite revoke failed with ${response.status}`);
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
    if (!writable || saving || !form.title.trim() || !form.branch.trim() || !form.campaignId?.trim()) {
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
      const response = await fetch(`/api/app/ads/${encodeURIComponent(ad.id)}/${action}?locale=cs`, {
        method: "POST",
        ...(action === "request-changes"
          ? {
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                note: reviewNote,
              }),
            }
          : {}),
      });
      const payload = (await response.json().catch(() => ({}))) as { ad?: AdRecord; error?: string };

      if (!response.ok || !payload.ad) {
        throw new Error(payload.error || `Workflow action failed with ${response.status}`);
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

      const response = await fetch(`/api/app/ads/${encodeURIComponent(ad.id)}/assets?locale=cs`, {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => ({}))) as { ad?: AdRecord; error?: string };

      if (!response.ok || !payload.ad) {
        throw new Error(payload.error || `Upload failed with ${response.status}`);
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

      const response = await fetch("/api/app/ads/import?locale=cs", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => ({}))) as { result?: AdImportResult; error?: string };

      if (!response.ok || !payload.result) {
        throw new Error(payload.error || `Import failed with ${response.status}`);
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
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#d94410]">Správa reklam</p>
          <h1 className="mt-2 text-3xl font-semibold text-black">Všechny reklamy na jednom místě</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#59616b]">
            Nahrajte materiál, doplňte údaje, pošlete reklamu ke kontrole a stáhněte QR balíček. Pokud něco chybí, reklama se označí a nejde omylem pustit dál.
          </p>
          {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div> : null}
        </article>

        <aside className="min-w-0 rounded-md border border-black/10 bg-white p-5">
          <div className="text-sm font-semibold text-[#68707a]">Přihlášený uživatel</div>
          <label className="mt-2 grid gap-1.5 text-sm font-semibold text-[#20242a]">
            Jméno
            <input
              key={workspace.user.name}
              ref={profileInputRef}
              name="name"
              defaultValue={workspace.user.name}
              onChange={() => setProfileMessage("")}
              className="rounded-md border border-black/10 bg-white px-3 py-2 text-base font-semibold text-black outline-none focus:border-[#f45d1f]"
            />
          </label>
          <div className="break-all text-sm text-[#59616b]">{workspace.user.email}</div>
          <button
            type="button"
            onClick={() => saveProfile(profileInputRef.current?.value ?? "")}
            disabled={profileSaving}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#11161c] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#c9cdd3]"
          >
            <Save size={15} />
            {profileSaving ? "Ukládám" : "Uložit profil"}
          </button>
          {profileMessage ? <div className="mt-2 text-xs font-semibold text-emerald-700">{profileMessage}</div> : null}
          <div className="mt-4 grid gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-[#68707a]">Role</span>
              <span className="font-semibold text-[#20242a]">{workspace.membership.role}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#68707a]">Vidí reklamy pro</span>
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

      {workspace.permissions.canManageAllTenants && workspace.superAdmin ? <SuperAdminPanel data={workspace.superAdmin} /> : null}

      <OnboardingPanel progress={progress} onCreateAd={openCreate} />

      {workspace.permissions.canCreateAds ? (
        <ImportPanel
          campaigns={workspace.campaigns}
          campaignId={importCampaignId}
          importing={importing}
          result={importResult}
          onCampaignChange={setImportCampaignId}
          onImport={importAds}
        />
      ) : null}

      {mode ? (
        <Editor
          mode={mode}
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

      {workspace.permissions.canManageTenantSettings ? (
        <SettingsPanel
          tenant={workspace.tenant}
          saving={settingsSaving}
          message={settingsMessage}
          onSave={saveTenantSettings}
        />
      ) : null}

      {workspace.permissions.canManageBranches || workspace.permissions.canEditOwnBranch ? (
        <BranchesPanel
          branches={workspace.branches}
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

      {workspace.permissions.canManageCampaigns ? (
        <CampaignsPanel
          campaigns={workspace.campaigns}
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

      {workspace.permissions.canManageCandidates ? (
        <CandidatesPanel
          candidates={workspace.candidates}
          branches={workspace.branches}
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

      {workspace.permissions.canManageUsers ? (
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

      {workspace.permissions.canViewAudit ? <AuditPanel logs={workspace.auditLogs} /> : null}

      <MissingDataQueue ads={workspace.ads} selectedId={selectedAd?.id ?? ""} writable={writable} onSelect={setSelectedId} onEdit={openEdit} />

      {reviewable ? <ReviewInbox ads={workspace.ads} selectedId={selectedAd?.id ?? ""} onSelect={setSelectedId} /> : null}

      <section id="ads" className="grid scroll-mt-6 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 overflow-hidden rounded-md border border-black/10 bg-white">
          <div className="flex flex-col gap-3 border-b border-black/10 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-black">Seznam reklam</h2>
              <p className="mt-1 text-sm text-[#59616b]">
                Evidence, kontrola údajů, schvalování a exporty k reklamám v jednom pracovním prostoru.
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
                disabled={!workspace.permissions.canCreateAds}
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
                  {["Kód", "Materiál", "Pobočka", "Kampaň", "Termín", "Chybí", "Stav", "Akce"].map((head) => (
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
                    <td className="px-4 py-4">
                      <div className="font-medium text-[#20242a]">{ad.title}</div>
                      {ad.candidate ? <div className="mt-1 text-xs font-semibold text-[#68707a]">{ad.candidate}</div> : null}
                    </td>
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
                      Zatím tu nejsou žádné reklamy.
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
    </section>
  );
}

function Editor({
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
  const requiredFields = new Set<keyof EditableAdInput>([
    "campaignId",
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
        ["campaignId", "Kampaň", "campaign"],
        ["candidateId", "Kandidát", "candidate"],
        ["title", "Název reklamy", "text"],
        ["branch", "Pobočka / oblast", "branch"],
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
          <p className="mt-1 text-sm text-[#59616b]">Po uložení hned uvidíte, co ještě chybí a jestli už jde stáhnout QR balíček.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="inline-flex items-center gap-2 rounded-md border border-black/10 px-3 py-2 text-sm font-semibold">
            <X size={15} />
            Zavřít
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !writable || !form.title.trim() || !form.branch.trim() || !form.campaignId?.trim()}
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
                    {type === "campaign" ? (
                      <select
                        value={form.campaignId ?? ""}
                        onChange={(event) => onChange({ ...form, campaignId: event.target.value })}
                        className={`rounded-md border bg-white px-3 py-2 font-normal outline-none focus:border-[#f45d1f] ${
                          empty ? "border-red-300" : "border-black/10"
                        }`}
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
                        className={`rounded-md border bg-white px-3 py-2 font-normal outline-none focus:border-[#f45d1f] ${
                          empty ? "border-red-300" : "border-black/10"
                        }`}
                      >
                        {branches.filter((branch) => !branch.archived).length === 0 ? <option value="">Nejdřív založte pobočku</option> : null}
                        {branches.filter((branch) => !branch.archived).map((branch) => (
                          <option key={branch.id} value={branch.name}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={type}
                        value={form[key]}
                        onChange={(event) => onChange({ ...form, [key]: event.target.value })}
                        className={`rounded-md border bg-white px-3 py-2 font-normal outline-none focus:border-[#f45d1f] ${
                          empty ? "border-red-300" : "border-black/10"
                        }`}
                      />
                    )}
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
                <p className="mt-1 text-sm text-[#59616b]">
                  {ad.branch} · {ad.campaign}
                  {ad.candidate ? ` · ${ad.candidate}` : ""}
                </p>
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
      {ads.length === 0 ? <div className="rounded-md border border-black/10 bg-white p-5 text-center text-sm text-[#59616b]">Zatím tu nejsou žádné reklamy.</div> : null}
    </div>
  );
}

function formatSuperAdminDate(value: string) {
  return new Date(value).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

function SuperAdminPanel({ data }: { data: NonNullable<AppWorkspacePayload["superAdmin"]> }) {
  const stats = [
    { label: "Pracovní prostory", value: data.counts.tenants, icon: Building2 },
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
          <h2 className="mt-3 text-2xl font-semibold">Správa celé instalace</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/72">
            Přehled všech pracovních prostorů, přístupů a stavů reklam. Provozovatel rychle vidí, kde se doplňují údaje, kde už běží veřejný archiv a kdo je za daný prostor odpovědný.
          </p>
        </div>
        <a
          href="#people"
          className="inline-flex w-fit items-center gap-2 rounded-md border border-white/15 bg-white px-3 py-2 text-sm font-semibold text-[#11161c]"
        >
          Správa lidí
          <ArrowUpRight size={14} />
        </a>
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
            Osm jasných kroků od založení reklamy po výsledek: označení, QR kód, transparentní oznámení a auditní balíček pro soulad s TTPA.
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
}: {
  campaigns: AppWorkspacePayload["campaigns"];
  campaignId: string;
  importing: boolean;
  result: AdImportResult | null;
  onCampaignChange: (campaignId: string) => void;
  onImport: (file: File | null) => void;
}) {
  const activeCampaigns = campaigns.filter((campaign) => !campaign.archived);

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
            Nahrajte tabulku se stávající agendou. Adclare založí reklamy, dopočítá stav podle povinných údajů a vypíše řádky, které se nepodařilo uložit.
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
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-[#11161c] px-4 py-3 text-sm font-semibold text-white transition hover:bg-black">
            <Upload size={16} />
            {importing ? "Importuji" : "Importovat Excel"}
            <input
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="sr-only"
              disabled={importing || activeCampaigns.length === 0}
              onChange={(event) => {
                onImport(event.target.files?.[0] ?? null);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {result ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-[260px_1fr]">
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <div className="font-semibold">Import dokončen</div>
            <div className="mt-2 grid gap-1">
              <div>Založeno: {result.createdCount}</div>
              <div>Přeskočeno: {result.skippedCount}</div>
              <div>Chyby: {result.failedCount}</div>
            </div>
          </div>
          <div className="grid gap-2">
            {[...result.skipped, ...result.errors].slice(0, 6).map((issue) => (
              <div key={`${issue.rowNumber}:${issue.code}:${issue.message}`} className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-900">
                <span className="font-semibold">Řádek {issue.rowNumber}</span>
                {issue.code ? ` · ${issue.code}` : ""}
                {issue.title ? ` · ${issue.title}` : ""}
                <span className="block text-orange-800">{issue.message}</span>
              </div>
            ))}
            {result.skippedCount + result.failedCount > 6 ? (
              <div className="rounded-md border border-black/10 bg-[#fbfbfc] px-3 py-2 text-sm font-semibold text-[#59616b]">
                Další řádky jsou v odpovědi importu. Opravte zdrojovou tabulku a nahrajte ji znovu.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SettingsPanel({
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
          <p className="mt-1 text-sm text-[#59616b]">Název, veřejný repozitář a základní pravidla pro archivaci jsou společná pro celý pracovní prostor.</p>
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

function BranchesPanel({
  branches,
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
  return (
    <section id="branches" className="scroll-mt-6 rounded-md border border-black/10 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-black">Pobočky a oblasti</h2>
          <p className="mt-1 text-sm text-[#59616b]">Pobočka má vlastní název, typ, kontakt a stav. Archivované pobočky zůstávají v historii, ale nepoužívají se pro nové reklamy.</p>
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

function CampaignsPanel({
  campaigns,
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
  return (
    <section id="campaigns" className="scroll-mt-6 rounded-md border border-black/10 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-black">Kampaně a tagy</h2>
          <p className="mt-1 text-sm text-[#59616b]">Kampaň drží období, volby a štítky, podle kterých se reklamy třídí v interní práci i exportech.</p>
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

function CandidatesPanel({
  candidates,
  branches,
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
  const activeBranches = branches.filter((branch) => !branch.archived);
  const activeCount = candidates.filter((candidate) => !candidate.archived).length;

  return (
    <section id="candidates" className="scroll-mt-6 rounded-md border border-black/10 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-black">Kandidáti</h2>
          <p className="mt-1 text-sm text-[#59616b]">Udržujte kandidáty jako samostatný seznam a přiřazujte k nim reklamy bez opisování jmen do každého materiálu.</p>
        </div>
        <span className="inline-flex w-fit rounded-md border border-black/10 bg-[#fbfbfc] px-3 py-1.5 text-sm font-semibold text-[#25282d]">
          {activeCount} aktivních
        </span>
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
          <option value="">Celý pracovní prostor</option>
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
        {candidates.map((candidate) => (
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
                <span className="text-xs font-medium text-[#59616b]">{candidate.adCount} reklam</span>
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

function AuditPanel({ logs }: { logs: AppWorkspacePayload["auditLogs"] }) {
  return (
    <section id="audit" className="scroll-mt-6 rounded-md border border-black/10 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-black">Audit</h2>
          <p className="mt-1 text-sm text-[#59616b]">Poslední změny v pracovním prostoru. Slouží pro rychlou kontrolu, kdo co upravil.</p>
        </div>
        <span className="inline-flex w-fit rounded-md border border-black/10 bg-[#fbfbfc] px-3 py-1.5 text-sm font-semibold text-[#25282d]">{logs.length} záznamů</span>
      </div>
      <div className="mt-4 grid gap-2">
        {logs.slice(0, 12).map((log) => (
          <article key={log.id} className="grid gap-2 rounded-md border border-black/10 bg-[#fbfbfc] p-3 lg:grid-cols-[180px_180px_minmax(0,1fr)]">
            <div className="text-xs font-semibold text-[#68707a]">{new Date(log.createdAt).toLocaleString("cs-CZ")}</div>
            <div className="break-all text-sm font-semibold text-[#20242a]">{log.actor}</div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#d94410]">{log.action}</div>
              <p className="mt-1 text-sm leading-6 text-[#59616b]">{log.message}</p>
            </div>
          </article>
        ))}
        {logs.length === 0 ? <div className="rounded-md border border-black/10 p-3 text-sm text-[#59616b]">Zatím tu nejsou žádné auditní záznamy.</div> : null}
      </div>
    </section>
  );
}

function PeoplePanel({
  users,
  form,
  saving,
  retryingInviteId,
  invitationActionId,
  memberSavingId,
  message,
  onChange,
  onCreate,
  onRetryEmail,
  onRevokeInvitation,
  onUpdateMember,
}: {
  users: AppWorkspacePayload["users"];
  form: InviteInput;
  saving: boolean;
  retryingInviteId: string;
  invitationActionId: string;
  memberSavingId: string;
  message: string;
  onChange: (form: InviteInput) => void;
  onCreate: () => void;
  onRetryEmail: (invitationId: string) => void;
  onRevokeInvitation: (invitationId: string) => void;
  onUpdateMember: (memberId: string, input: AppMemberUpdateInput) => void;
}) {
  const inviteRoleNeedsBranch = roleNeedsBranch(form.role);
  const inviteRoleNeedsCandidate = roleNeedsCandidate(form.role);
  const activeCandidates = users.candidates.filter((candidate) => !candidate.archived);
  const inviteCandidate = users.candidates.find((candidate) => candidate.id === form.candidateId) ?? activeCandidates[0] ?? null;
  const activeCount = users.members.filter((member) => member.statusKey === "ACTIVE").length;
  const inviteCandidateMissing = inviteRoleNeedsCandidate && !form.candidateId;

  function updateInviteRole(role: InviteInput["role"]) {
    const nextCandidate = roleNeedsCandidate(role) ? inviteCandidate : null;
    onChange({
      ...form,
      role,
      candidateId: nextCandidate?.id ?? "",
      branchId: roleNeedsCandidate(role) ? nextCandidate?.branchId ?? "" : form.branchId,
    });
  }

  function updateInviteCandidate(candidateId: string) {
    const candidate = users.candidates.find((item) => item.id === candidateId);
    onChange({
      ...form,
      candidateId,
      branchId: candidate?.branchId ?? form.branchId,
    });
  }

  return (
    <section id="people" className="grid min-w-0 scroll-mt-6 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <article className="min-w-0 rounded-md border border-black/10 bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-black">Správa lidí</h2>
            <p className="mt-1 text-sm text-[#59616b]">Nastavte, kdo vidí celou stranu, konkrétní pobočku nebo jen reklamy vybraného kandidáta.</p>
          </div>
          <span className="inline-flex w-fit rounded-md border border-black/10 bg-[#fbfbfc] px-3 py-1.5 text-sm font-semibold text-[#25282d]">
            {activeCount} aktivních
          </span>
        </div>

        <div className="mt-4 grid gap-4 2xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[#68707a]">Členové týmu</h3>
            <div className="mt-2 grid gap-2">
              {users.members.map((member) => (
                <form
                  key={member.id}
                  className="grid min-w-0 gap-2 rounded-md border border-black/10 bg-[#fbfbfc] p-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[minmax(160px,1.1fr)_minmax(150px,190px)_minmax(150px,190px)_minmax(150px,190px)_130px_120px] 2xl:items-end"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    onUpdateMember(member.id, {
                      name: String(formData.get("name") ?? ""),
                      role: String(formData.get("role") ?? member.roleKey) as AppMemberUpdateInput["role"],
                      branchId: String(formData.get("branchId") ?? ""),
                      candidateId: String(formData.get("candidateId") ?? ""),
                      status: String(formData.get("status") ?? member.statusKey) as AppMemberUpdateInput["status"],
                    });
                  }}
                >
                  <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#68707a]">
                    Jméno
                    <input
                      name="name"
                      defaultValue={member.name}
                      className="min-w-0 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black outline-none focus:border-[#f45d1f]"
                    />
                    <span className="break-all text-xs font-medium text-[#59616b]">{member.email}</span>
                  </label>
                  <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#68707a]">
                    Role
                    <select
                      name="role"
                      defaultValue={member.roleKey}
                      className="min-w-0 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#20242a] outline-none focus:border-[#f45d1f]"
                    >
                      {users.assignableRoles.some((role) => role.value === member.roleKey) ? null : (
                        <option value={member.roleKey}>{member.role}</option>
                      )}
                      {users.assignableRoles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#68707a]">
                    Pobočka
                    <select
                      name="branchId"
                      defaultValue={member.branchId}
                      className="min-w-0 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#20242a] outline-none focus:border-[#f45d1f]"
                    >
                      <option value="">Celá strana</option>
                      {users.branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#68707a]">
                    Kandidát
                    <select
                      name="candidateId"
                      defaultValue={member.candidateId}
                      className="min-w-0 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#20242a] outline-none focus:border-[#f45d1f]"
                    >
                      <option value="">Bez kandidáta</option>
                      {users.candidates.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#68707a]">
                    Stav
                    <select
                      name="status"
                      defaultValue={member.statusKey}
                      className="min-w-0 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#20242a] outline-none focus:border-[#f45d1f]"
                    >
                      <option value="ACTIVE">Aktivní</option>
                      <option value="DISABLED">Pozastavený</option>
                    </select>
                  </label>
                  <button
                    type="submit"
                    disabled={Boolean(memberSavingId)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#11161c] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#c9cdd3]"
                  >
                    <Save size={15} />
                    {memberSavingId === member.id ? "Ukládám" : "Uložit"}
                  </button>
                </form>
              ))}
              {users.members.length === 0 ? <div className="rounded-md border border-black/10 p-3 text-sm text-[#59616b]">Zatím není přidaný žádný člověk.</div> : null}
            </div>
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[#68707a]">Poslední pozvánky</h3>
            <div className="mt-2 grid gap-2">
              {users.invitations.slice(0, 6).map((invitation) => (
                <div key={invitation.id} className="rounded-md border border-black/10 bg-[#fbfbfc] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="break-all font-semibold text-black">{invitation.email}</div>
                      <div className="mt-1 text-sm text-[#59616b]">{invitation.role} · {invitation.scope}</div>
                    </div>
                    <span className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs font-semibold text-[#25282d]">{invitation.status}</span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-[#68707a]">{invitation.emailStatus} · do {invitation.expiresAt}</div>
                  <a className="mt-2 block break-all text-xs font-semibold text-[#d94410]" href={invitation.inviteUrl}>
                    {invitation.inviteUrl}
                  </a>
                  {invitation.emailStatusKey !== "SENT" ? (
                    <button
                      type="button"
                      onClick={() => onRetryEmail(invitation.id)}
                      disabled={Boolean(retryingInviteId) || invitation.statusKey === "REVOKED" || invitation.statusKey === "ACCEPTED"}
                      className="mt-2 inline-flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-800 disabled:cursor-not-allowed disabled:text-[#9aa0a8]"
                    >
                      <RefreshCw size={15} />
                      {retryingInviteId === invitation.id ? "Odesílám" : "Zkusit odeslat znovu"}
                    </button>
                  ) : null}
                  {invitation.statusKey !== "ACCEPTED" && invitation.statusKey !== "REVOKED" ? (
                    <button
                      type="button"
                      onClick={() => onRevokeInvitation(invitation.id)}
                      disabled={Boolean(invitationActionId)}
                      className="mt-2 inline-flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#25282d] disabled:cursor-not-allowed disabled:text-[#9aa0a8]"
                    >
                      <X size={15} />
                      {invitationActionId === invitation.id ? "Ruším" : "Zrušit pozvánku"}
                    </button>
                  ) : null}
                </div>
              ))}
              {users.invitations.length === 0 ? <div className="rounded-md border border-black/10 p-3 text-sm text-[#59616b]">Zatím nebyla odeslaná žádná pozvánka.</div> : null}
            </div>
          </div>
        </div>
      </article>

      <aside className="min-w-0 rounded-md border border-black/10 bg-white p-4">
        <h2 className="text-lg font-semibold text-black">Pozvat člověka</h2>
        <div className="mt-3 grid gap-3">
          <label className="grid gap-1.5 text-sm font-semibold text-[#20242a]">
            E-mail
            <input
              type="email"
              value={form.email}
              onChange={(event) => onChange({ ...form, email: event.target.value })}
              placeholder="napr. grafik@example.cz"
              className="rounded-md border border-black/10 bg-white px-3 py-2 font-normal outline-none focus:border-[#f45d1f]"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold text-[#20242a]">
            Role
            <select
              value={form.role}
              onChange={(event) => updateInviteRole(event.target.value as InviteInput["role"])}
              className="rounded-md border border-black/10 bg-white px-3 py-2 font-normal outline-none focus:border-[#f45d1f]"
            >
              {users.assignableRoles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>

          {inviteRoleNeedsCandidate ? (
            <label className="grid gap-1.5 text-sm font-semibold text-[#20242a]">
              Kandidát
              <select
                value={form.candidateId ?? ""}
                onChange={(event) => updateInviteCandidate(event.target.value)}
                className="rounded-md border border-black/10 bg-white px-3 py-2 font-normal outline-none focus:border-[#f45d1f]"
              >
                <option value="">Vyberte kandidáta</option>
                {activeCandidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="grid gap-1.5 text-sm font-semibold text-[#20242a]">
            Pobočka nebo oblast
            <select
              value={form.branchId ?? ""}
              onChange={(event) => onChange({ ...form, branchId: event.target.value })}
              disabled={!inviteRoleNeedsBranch}
              className="rounded-md border border-black/10 bg-white px-3 py-2 font-normal outline-none focus:border-[#f45d1f] disabled:bg-[#f1f2f4]"
            >
              <option value="">{inviteRoleNeedsBranch ? "Vyberte pobočku" : "Celá strana"}</option>
              {users.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={onCreate}
            disabled={saving || !form.email.trim() || (inviteRoleNeedsBranch && !form.branchId) || inviteCandidateMissing}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#11161c] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#c9cdd3]"
          >
            <Plus size={15} />
            {saving ? "Posílám" : "Poslat pozvánku"}
          </button>

          {message ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
              Pozvánka je připravená.
              <a className="mt-1 block break-all text-[#166534]" href={message}>
                {message}
              </a>
            </div>
          ) : null}
        </div>
      </aside>
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
  const missingAds = ads.filter((ad) => ad.workflowStatus === "NEEDS_DATA" || ad.missing.length > 0);

  if (missingAds.length === 0) {
    return null;
  }

  return (
    <section id="missing-data" className="scroll-mt-6 rounded-md border border-orange-200 bg-orange-50/55 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-black">Co je potřeba doplnit</h2>
          <p className="mt-1 text-sm text-[#59616b]">Tyto reklamy nejdou posunout dál, dokud se nedoplní chybějící údaje nebo připomínky z kontroly.</p>
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
  const reviewAds = ads.filter((ad) => ad.workflowStatus === "READY_FOR_REVIEW");

  return (
    <section id="review" className="scroll-mt-6 rounded-md border border-sky-200 bg-sky-50/55 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-black">Ke kontrole</h2>
          <p className="mt-1 text-sm text-[#59616b]">Tyto reklamy už mají vyplněné údaje. Můžete je schválit, nebo je s komentářem vrátit k doplnění.</p>
        </div>
        <span className="inline-flex w-fit rounded-md border border-sky-200 bg-white px-3 py-1.5 text-sm font-semibold text-sky-800">
          {reviewAds.length} ke kontrole
        </span>
      </div>
      {reviewAds.length ? (
        <div className="mt-3 grid gap-2 lg:grid-cols-3">
          {reviewAds.map((ad) => (
            <button
              key={ad.id}
              type="button"
              onClick={() => onSelect(ad.id)}
              className={`rounded-md border p-3 text-left ${
                selectedId === ad.id ? "border-[#f45d1f] bg-white shadow-sm" : "border-sky-200 bg-white/75 hover:bg-white"
              }`}
            >
              <div className="font-mono text-xs font-semibold text-[#68707a]">{ad.id}</div>
              <div className="mt-1 line-clamp-2 text-sm font-semibold text-black">{ad.title}</div>
              <div className="mt-2 text-xs text-[#59616b]">{ad.branch} · {ad.publicationDate}</div>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-md border border-sky-200 bg-white p-3 text-sm font-semibold text-[#59616b]">
          Žádná reklama teď nečeká na kontrolu.
        </div>
      )}
    </section>
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
  if (!ad) {
    return (
      <aside className="min-w-0 rounded-md border border-black/10 bg-white p-5 text-sm text-[#59616b]">
        Vyberte nebo přidejte reklamu.
      </aside>
    );
  }

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
    <aside className="min-w-0 rounded-md border border-black/10 bg-white">
      <div className="border-b border-black/10 p-4">
        <div className="text-sm font-semibold text-[#68707a]">Detail reklamy</div>
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
          <div key={label} className="grid min-w-0 gap-1 rounded-md border border-black/10 p-3">
            <span className="min-w-0 text-xs font-semibold uppercase text-[#68707a]">{label}</span>
            <span className={`min-w-0 break-all ${value === "chybí" || value === "chybí publikum" ? "font-semibold text-red-700" : "font-semibold text-[#20242a]"}`}>{value}</span>
          </div>
        ))}
      </div>
      {ad.missing.length ? (
        <div className="mx-4 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm font-semibold text-orange-800">
          <div>Ještě doplnit:</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ad.missing.map((item) => (
              <span key={item} className="rounded-md border border-orange-200 bg-white px-2 py-1 text-xs font-semibold text-orange-800">
                {item}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="mx-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          Reklama má vyplněné povinné údaje.
        </div>
      )}
      <div className="mx-4 mt-3 rounded-md border border-black/10 bg-[#fbfbfc] p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-black">Soubory materiálu</div>
            <div className="mt-1 text-xs leading-5 text-[#68707a]">
              {storage.configured ? `Ukládá se do ${storage.provider}. Limit ${storage.maxUploadSizeMb} MB.` : "Úložiště čeká na nastavení Hetzner Object Storage."}
            </div>
          </div>
          <label
            className={`inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
              uploadable && storage.configured && !uploading ? "cursor-pointer bg-[#11161c] text-white" : "cursor-not-allowed bg-[#c9cdd3] text-white"
            }`}
          >
            <Upload size={15} />
            {uploading === ad.id ? "Nahrávám" : "Nahrát"}
            <input
              type="file"
              className="sr-only"
              disabled={!uploadable || !storage.configured || Boolean(uploading)}
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,application/pdf,video/mp4,video/quicktime"
              onChange={(event) => {
                onUpload(ad, event.target.files?.[0] ?? null);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
        {ad.assets.length ? (
          <div className="mt-3 grid gap-2">
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
        ) : null}
      </div>
      {ad.reviewEvents.length ? (
        <div className="mx-4 mt-3 rounded-md border border-black/10 bg-white p-3">
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
        {ad.canRequestChanges ? (
          <div className="grid gap-2 rounded-md border border-black/10 bg-[#fbfbfc] p-3">
            <label className="grid gap-1.5 text-sm font-semibold text-[#20242a]">
              Komentář pro doplnění
              <textarea
                value={reviewNote}
                onChange={(event) => onReviewNoteChange(event.target.value)}
                disabled={!reviewable || Boolean(actioning)}
                rows={3}
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
        <button
          type="button"
          onClick={() => {
            window.location.href = `/api/app/ads/${encodeURIComponent(ad.id)}/audit-export?locale=cs`;
          }}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-black/10 px-4 py-3 text-sm font-semibold text-[#25282d]"
        >
          <FileArchive size={15} />
          Stáhnout auditní balíček
        </button>
        <a className="inline-flex items-center justify-center gap-2 rounded-md border border-black/10 px-4 py-3 text-sm font-semibold text-[#d94410]" href={noticeHref(ad.publicUrl)}>
          Otevřít oznámení
          <ArrowUpRight size={15} />
        </a>
      </div>
    </aside>
  );
}
