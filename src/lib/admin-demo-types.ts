export type Locale = "cs" | "en";
export type Status = "ready" | "warning" | "blocked" | "review";
export type AdChannel = "online" | "offline";
export type AdWorkflowStatusKey = "DRAFT" | "NEEDS_DATA" | "READY_FOR_REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED";
export type AdminRoleKey =
  | "SUPER_ADMIN"
  | "PARTY_ADMIN"
  | "CENTRAL_REVIEWER"
  | "LOCAL_ADMIN"
  | "CAMPAIGN_MANAGER"
  | "CANDIDATE"
  | "DESIGNER"
  | "READONLY_AUDITOR";
export type EmailStatusKey = "PENDING_PROVIDER" | "SENT" | "FAILED";
export type MemberStatusKey = "ACTIVE" | "INVITED" | "DISABLED";

export type AdDeadlineState = "clear" | "upcoming" | "due-soon" | "overdue";

export type AdAssetRecord = {
  id: string;
  fileName: string;
  originalName: string;
  contentType: string;
  byteSize: number;
  sizeLabel: string;
  uploadedAt: string;
  downloadUrl: string;
  checksumSha256: string;
};

export type AdReviewEventRecord = {
  id: string;
  status: "REQUESTED" | "APPROVED" | "CHANGES_REQUESTED" | "REJECTED" | "PUBLISHED";
  statusLabel: string;
  actor: string;
  note: string;
  createdAt: string;
};

export type AdRecord = {
  id: string;
  publicUrl: string;
  title: string;
  tenantSlug: string;
  campaignId: string;
  campaign: string;
  campaignSlug: string;
  campaignTags: string[];
  candidateId: string;
  candidate: string;
  branch: string;
  owner: string;
  type: string;
  channel: AdChannel;
  publicationDate: string;
  publicationDateIso: string;
  period: string;
  distributionArea: string;
  payer: string;
  supplier: string;
  amount: string;
  fundingSource: string;
  language: string;
  isTargeted: boolean;
  targeting: string;
  targetAudience: string;
  missing: string[];
  status: Status;
  statusLabel: string;
  workflowStatus: AdWorkflowStatusKey;
  workflowLabel: string;
  deadlineState: AdDeadlineState;
  deadlineLabel: string;
  daysUntilPublication: number;
  responsibleName: string;
  reviewerName: string;
  statusNote: string;
  version: number;
  locked: boolean;
  reviewRequestedAt: string;
  approvedAt: string;
  publishedAt: string;
  archivedAt: string;
  updatedAt: string;
  canRequestReview: boolean;
  canApprove: boolean;
  canPublish: boolean;
  canRequestChanges: boolean;
  canDownloadQr: boolean;
  assetCount: number;
  assets: AdAssetRecord[];
  reviewEvents: AdReviewEventRecord[];
};

export type AdminAdsPayload = {
  tenant: {
    name: string;
    slug: string;
  };
  campaign: {
    name: string;
    slug: string;
  };
  campaigns: PublicRepositoryOption[];
  branches: AdminBranchOption[];
  ads: AdRecord[];
};

export type PublicRepositoryFilters = {
  q: string;
  channel: "all" | AdChannel;
  status: "all" | Status;
  type: string;
  branch: string;
  campaign: string;
};

export type PublicRepositoryOption = {
  value: string;
  label: string;
};

export type AppCampaignRecord = {
  id: string;
  name: string;
  slug: string;
  election: string;
  description: string;
  tags: string[];
  startsAt: string;
  startsAtIso: string;
  endsAt: string;
  endsAtIso: string;
  archived: boolean;
  adCount: number;
};

export type PublicRepositoryAdRecord = AdRecord & {
  campaign: string;
  campaignSlug: string;
  election: string;
  lastUpdated: string;
};

export type PublicRepositoryPayload = {
  tenant: {
    name: string;
    slug: string;
  };
  ads: PublicRepositoryAdRecord[];
  totalCount: number;
  filteredCount: number;
  filters: PublicRepositoryFilters;
  options: {
    channels: PublicRepositoryOption[];
    statuses: PublicRepositoryOption[];
    types: PublicRepositoryOption[];
    branches: PublicRepositoryOption[];
    campaigns: PublicRepositoryOption[];
  };
};

export type EditableAdInput = {
  code?: string;
  campaignId?: string;
  candidateId?: string;
  title: string;
  branch: string;
  owner: string;
  type: string;
  channel: AdChannel;
  publicationDate: string;
  period: string;
  distributionArea: string;
  payer: string;
  supplier: string;
  amount: string;
  fundingSource: string;
  language: string;
  isTargeted: boolean;
  targeting: string;
  targetAudience: string;
};

export type AdImportInputRow = {
  rowNumber: number;
  input: EditableAdInput;
  raw?: Record<string, string>;
};

export type AdImportIssue = {
  rowNumber: number;
  code: string;
  title: string;
  message: string;
};

export type AdImportResult = {
  totalRows: number;
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  created: AdRecord[];
  skipped: AdImportIssue[];
  errors: AdImportIssue[];
};

export type AdminBranchOption = {
  id: string;
  name: string;
  kind: string;
  parentId: string;
  contactEmail: string;
  description: string;
  archived: boolean;
};

export type AppBranchInput = {
  name: string;
  kind: string;
};

export type AppBranchUpdateInput = {
  name: string;
  kind: string;
  parentId?: string;
  contactEmail?: string;
  description?: string;
  archived?: boolean;
};

export type AppCampaignInput = {
  name: string;
  slug?: string;
  election: string;
  description?: string;
  tags?: string[];
  startsAt: string;
  endsAt: string;
  archived?: boolean;
};

export type AppCandidateRecord = {
  id: string;
  name: string;
  slug: string;
  branchId: string;
  branch: string;
  contactEmail: string;
  ballotNumber: string;
  description: string;
  archived: boolean;
  adCount: number;
};

export type AppCandidateInput = {
  name: string;
  slug?: string;
  branchId?: string;
  contactEmail?: string;
  ballotNumber?: string;
  description?: string;
  archived?: boolean;
};

export type ReviewDecisionInput = {
  note: string;
};

export type AdminMemberRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  roleKey: AdminRoleKey;
  branchId: string;
  candidateId: string;
  candidate: string;
  scope: string;
  status: string;
  statusKey: MemberStatusKey;
};

export type AdminInvitationRecord = {
  id: string;
  email: string;
  role: string;
  roleKey: AdminRoleKey;
  candidateId: string;
  candidate: string;
  scope: string;
  status: string;
  statusKey: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  emailStatus: string;
  emailStatusKey: EmailStatusKey;
  expiresAt: string;
  inviteUrl: string;
};

export type AdminUsersPayload = {
  members: AdminMemberRecord[];
  invitations: AdminInvitationRecord[];
  branches: AdminBranchOption[];
  candidates: AppCandidateRecord[];
  assignableRoles: PublicRepositoryOption[];
};

export type InviteInput = {
  email: string;
  role: AdminRoleKey;
  branchId?: string;
  candidateId?: string;
};

export type AppProfileInput = {
  name: string;
};

export type AppMemberUpdateInput = {
  name: string;
  role: AdminRoleKey;
  branchId?: string;
  candidateId?: string;
  status: MemberStatusKey;
};

export type AppTenantSettingsInput = {
  name: string;
  slug: string;
  contactEmail?: string;
  defaultLocale: Locale;
  publicRepositoryEnabled: boolean;
  retentionYears: number;
};

export type AppAuditRecord = {
  id: string;
  actor: string;
  action: string;
  message: string;
  createdAt: string;
};

export type AppSuperAdminTenantRecord = {
  id: string;
  name: string;
  slug: string;
  contactEmail: string;
  defaultLocale: Locale;
  publicRepositoryEnabled: boolean;
  retentionYears: number;
  createdAt: string;
  updatedAt: string;
  admins: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    roleKey: AdminRoleKey;
    status: string;
  }>;
  counts: {
    ads: number;
    campaigns: number;
    branches: number;
    users: number;
    invitations: number;
    assets: number;
    needsData: number;
    published: number;
  };
};

export type AppSuperAdminPayload = {
  tenants: AppSuperAdminTenantRecord[];
  counts: {
    tenants: number;
    ads: number;
    campaigns: number;
    branches: number;
    users: number;
    invitations: number;
    assets: number;
    needsData: number;
    published: number;
  };
};

export type InvitationNotice = {
  token: string;
  email: string;
  role: string;
  scope: string;
  tenant: string;
  status: AdminInvitationRecord["statusKey"];
  expiresAt: string;
};

export type AppWorkspacePayload = {
  user: {
    name: string;
    email: string;
  };
  tenant: {
    name: string;
    slug: string;
    contactEmail: string;
    defaultLocale: Locale;
    publicRepositoryEnabled: boolean;
    retentionYears: number;
  };
  membership: {
    role: string;
    roleKey: AdminRoleKey;
    scope: string;
    status: string;
  };
  branches: AdminBranchOption[];
  campaigns: AppCampaignRecord[];
  candidates: AppCandidateRecord[];
  permissions: {
    canCreateAds: boolean;
    canEditAds: boolean;
    canUploadAssets: boolean;
    canApproveAds: boolean;
    canPublishAds: boolean;
    canManageBranches: boolean;
    canEditOwnBranch: boolean;
    canManageCampaigns: boolean;
    canManageCandidates: boolean;
    canManageUsers: boolean;
    canManageTenantSettings: boolean;
    canViewAudit: boolean;
    canExportArchive: boolean;
    canManageAllTenants: boolean;
  };
  storage: {
    configured: boolean;
    provider: string;
    bucket: string;
    maxUploadSizeMb: number;
  };
  users: AdminUsersPayload;
  auditLogs: AppAuditRecord[];
  ads: AdRecord[];
  counts: {
    all: number;
    needsData: number;
    review: number;
    approved: number;
    published: number;
    blocked: number;
  };
  superAdmin: AppSuperAdminPayload | null;
};
