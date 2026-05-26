export type Locale = "cs" | "en";
export type Status = "ready" | "warning" | "blocked" | "review";
export type AdminRoleKey =
  | "SUPER_ADMIN"
  | "PARTY_ADMIN"
  | "CENTRAL_REVIEWER"
  | "LOCAL_ADMIN"
  | "CAMPAIGN_MANAGER"
  | "CANDIDATE"
  | "DESIGNER"
  | "READONLY_AUDITOR";

export type AdRecord = {
  id: string;
  publicUrl: string;
  title: string;
  branch: string;
  owner: string;
  type: string;
  publicationDate: string;
  period: string;
  payer: string;
  amount: string;
  fundingSource: string;
  targeting: string;
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

export type EditableAdInput = {
  code?: string;
  title: string;
  branch: string;
  owner: string;
  type: string;
  publicationDate: string;
  period: string;
  payer: string;
  amount: string;
  fundingSource: string;
  targeting: string;
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
