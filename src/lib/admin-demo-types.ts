export type Locale = "cs" | "en";
export type Status = "ready" | "warning" | "blocked" | "review";

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
