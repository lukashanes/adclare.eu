export type Locale = "cs" | "en";
export type Status = "ready" | "warning" | "blocked" | "review";
export type AdChannel = "online" | "offline";
export type AdminRoleKey =
  | "SUPER_ADMIN"
  | "PARTY_ADMIN"
  | "CENTRAL_REVIEWER"
  | "LOCAL_ADMIN"
  | "CAMPAIGN_MANAGER"
  | "CANDIDATE"
  | "DESIGNER"
  | "READONLY_AUDITOR";
export type BillingPlanKey = "SMALL_PARTY" | "LARGE_PARTY" | "CUSTOM";
export type BillingIntervalKey = "MONTHLY" | "YEARLY";
export type BillingMethodKey = "STRIPE" | "INVOICE";
export type BillingStatusKey = "TRIAL" | "ACTIVE" | "PENDING_INVOICE_APPROVAL" | "PAST_DUE" | "PAUSED" | "CANCELLED";
export type EmailStatusKey = "PENDING_PROVIDER" | "SENT" | "FAILED";

export type AdRecord = {
  id: string;
  publicUrl: string;
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
  missing: string[];
  status: Status;
  statusLabel: string;
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

export type AdminBranchOption = {
  id: string;
  name: string;
};

export type AdminMemberRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  roleKey: AdminRoleKey;
  scope: string;
  status: string;
};

export type AdminInvitationRecord = {
  id: string;
  email: string;
  role: string;
  roleKey: AdminRoleKey;
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
};

export type InviteInput = {
  email: string;
  role: AdminRoleKey;
  branchId?: string;
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

export type AdminBillingPayload = {
  tenant: {
    name: string;
    slug: string;
  };
  billing: {
    plan: BillingPlanKey;
    planLabel: string;
    interval: BillingIntervalKey;
    intervalLabel: string;
    method: BillingMethodKey;
    methodLabel: string;
    status: BillingStatusKey;
    statusLabel: string;
    discountPercent: number;
    monthlyPriceEur: number;
    yearlyPriceEur: number;
    effectivePrice: string;
    invoiceEmail: string;
    invoiceApprovedAt: string;
    currentPeriodEndsAt: string;
    trialEndsAt: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    stripeConfigured: boolean;
    note: string;
  };
};

export type EditableBillingInput = {
  plan: BillingPlanKey;
  interval: BillingIntervalKey;
  method: BillingMethodKey;
  status: BillingStatusKey;
  discountPercent: number;
  monthlyPriceEur: number;
  yearlyPriceEur: number;
  invoiceEmail: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  note: string;
};
