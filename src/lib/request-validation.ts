import type {
  AppBranchInput,
  AppBranchUpdateInput,
  AppCampaignInput,
  AppCandidateInput,
  AppMemberUpdateInput,
  AppProfileInput,
  AppTenantSettingsInput,
  EditableAdInput,
  InviteInput,
  ReviewDecisionInput,
} from "@/lib/workspace-types";

export class RequestValidationError extends Error {
  readonly status = 400;
  readonly issues: string[];

  constructor(message: string, issues: string[] = [message]) {
    super(message);
    this.name = "RequestValidationError";
    this.issues = issues;
  }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RequestValidationError("Invalid request body.");
  }

  return value as Record<string, unknown>;
}

function text(value: unknown, field: string, options: { min?: number; max?: number; required?: boolean } = {}) {
  if (typeof value !== "string") {
    if (options.required) {
      throw new RequestValidationError(`${field} is required.`);
    }

    return "";
  }

  const normalized = value.trim();

  if (options.required && normalized.length === 0) {
    throw new RequestValidationError(`${field} is required.`);
  }

  if (options.min && normalized.length > 0 && normalized.length < options.min) {
    throw new RequestValidationError(`${field} is too short.`);
  }

  if (options.max && normalized.length > options.max) {
    throw new RequestValidationError(`${field} is too long.`);
  }

  return normalized;
}

function optionalDate(value: string, field: string) {
  if (!value) {
    return value;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime())) {
    throw new RequestValidationError(`${field} must be a valid date.`);
  }

  return value;
}

function numberValue(value: unknown, field: string, options: { min?: number; max?: number } = {}) {
  const numeric = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;

  if (!Number.isFinite(numeric)) {
    throw new RequestValidationError(`${field} must be a number.`);
  }

  const rounded = Math.trunc(numeric);

  if (options.min !== undefined && rounded < options.min) {
    throw new RequestValidationError(`${field} is too low.`);
  }

  if (options.max !== undefined && rounded > options.max) {
    throw new RequestValidationError(`${field} is too high.`);
  }

  return rounded;
}

function optionalNumberValue(value: unknown, field: string, options: { min?: number; max?: number } = {}) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return numberValue(value, field, options);
}

function optionalUrl(value: unknown, field: string) {
  const normalized = text(value, field, { max: 2048 });

  if (!normalized) {
    return "";
  }

  try {
    const url = new URL(normalized);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("unsupported protocol");
    }
  } catch {
    throw new RequestValidationError(`${field} must be a valid http(s) URL.`);
  }

  return normalized;
}

function optionalEmail(value: unknown, field: string) {
  const normalized = text(value, field, { max: 240 }).toLowerCase();

  if (normalized && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new RequestValidationError(`${field} must be a valid email address.`);
  }

  return normalized;
}

function choice(value: unknown, field: string, allowed: readonly string[]) {
  const normalized = text(value, field, { max: 40 });

  if (normalized && !allowed.includes(normalized)) {
    throw new RequestValidationError(`${field} has an unsupported value.`);
  }

  return normalized;
}

function textArray(value: unknown, field: string, options: { maxItems?: number; maxItemLength?: number } = {}) {
  const rawItems = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const maxItems = options.maxItems ?? 20;
  const maxItemLength = options.maxItemLength ?? 60;
  const seen = new Set<string>();
  const items: string[] = [];

  for (const rawItem of rawItems) {
    if (typeof rawItem !== "string") {
      throw new RequestValidationError(`${field} contains an invalid value.`);
    }

    const item = rawItem.trim().replace(/\s+/g, " ");

    if (!item) {
      continue;
    }

    if (item.length > maxItemLength) {
      throw new RequestValidationError(`${field} contains a value that is too long.`);
    }

    const key = item.toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      items.push(item);
    }
  }

  return items.slice(0, maxItems);
}

export function parseEditableAdInput(value: unknown): EditableAdInput {
  const body = record(value);
  const channel = body.channel === "online" ? "online" : "offline";
  const publicationDate = optionalDate(text(body.publicationDate, "publicationDate", { required: true, max: 20 }), "publicationDate");
  const disseminationStartsAt = optionalDate(text(body.disseminationStartsAt, "disseminationStartsAt", { max: 20 }), "disseminationStartsAt");
  const disseminationEndsAt = optionalDate(text(body.disseminationEndsAt, "disseminationEndsAt", { max: 20 }), "disseminationEndsAt");

  const input: EditableAdInput = {
    code: text(body.code, "code", { max: 80 }),
    campaignId: text(body.campaignId, "campaignId", { max: 120 }),
    candidateId: text(body.candidateId, "candidateId", { max: 120 }),
    title: text(body.title, "title", { required: true, max: 180 }),
    branch: text(body.branch, "branch", { required: true, max: 140 }),
    owner: text(body.owner, "owner", { max: 180 }),
    ownerEmail: optionalEmail(body.ownerEmail, "ownerEmail"),
    ownerPostalAddress: text(body.ownerPostalAddress, "ownerPostalAddress", { max: 300 }),
    ownerEstablishmentAddress: text(body.ownerEstablishmentAddress, "ownerEstablishmentAddress", { max: 300 }),
    ownerRegistrationNumber: text(body.ownerRegistrationNumber, "ownerRegistrationNumber", { max: 120 }),
    ownerEntityType: choice(body.ownerEntityType, "ownerEntityType", ["legal", "natural", "other"]),
    controllerName: text(body.controllerName, "controllerName", { max: 180 }),
    controllerEmail: optionalEmail(body.controllerEmail, "controllerEmail"),
    controllerPostalAddress: text(body.controllerPostalAddress, "controllerPostalAddress", { max: 300 }),
    controllerEstablishmentAddress: text(body.controllerEstablishmentAddress, "controllerEstablishmentAddress", { max: 300 }),
    controllerEntityType: choice(body.controllerEntityType, "controllerEntityType", ["legal", "natural", "other"]),
    type: text(body.type, "type", { max: 100 }),
    channel,
    publicationDate,
    disseminationStartsAt,
    disseminationEndsAt,
    period: text(body.period, "period", { max: 180 }),
    distributionArea: text(body.distributionArea, "distributionArea", { max: 220 }),
    payer: text(body.payer, "payer", { max: 180 }),
    payerEmail: optionalEmail(body.payerEmail, "payerEmail"),
    payerPostalAddress: text(body.payerPostalAddress, "payerPostalAddress", { max: 300 }),
    payerEstablishmentAddress: text(body.payerEstablishmentAddress, "payerEstablishmentAddress", { max: 300 }),
    payerEntityType: choice(body.payerEntityType, "payerEntityType", ["legal", "natural", "other"]),
    supplier: text(body.supplier, "supplier", { max: 180 }),
    amount: text(body.amount, "amount", { max: 80 }),
    benefitsInKind: text(body.benefitsInKind, "benefitsInKind", { max: 80 }),
    currency: text(body.currency, "currency", { max: 8 }).toUpperCase(),
    fundingSource: text(body.fundingSource, "fundingSource", { max: 180 }),
    fundingOrigin: choice(body.fundingOrigin, "fundingOrigin", ["public", "private", "mixed"]),
    fundingJurisdiction: choice(body.fundingJurisdiction, "fundingJurisdiction", ["eu", "non-eu", "mixed"]),
    calculationMethod: text(body.calculationMethod, "calculationMethod", { max: 700 }),
    advertisementUrl: optionalUrl(body.advertisementUrl, "advertisementUrl"),
    publisherPlatform: text(body.publisherPlatform, "publisherPlatform", { max: 160 }),
    europeanRepositoryUrl: optionalUrl(body.europeanRepositoryUrl, "europeanRepositoryUrl"),
    republishedAfterInfringement: body.republishedAfterInfringement === true,
    infringementDetails: text(body.infringementDetails, "infringementDetails", { max: 700 }),
    language: text(body.language, "language", { max: 40 }) || "cs",
    isTargeted: body.isTargeted === true,
    usesPersonalData: body.usesPersonalData === true,
    targeting: text(body.targeting, "targeting", { max: 260 }),
    targetAudience: text(body.targetAudience, "targetAudience", { max: 260 }),
    targetingDataCategories: text(body.targetingDataCategories, "targetingDataCategories", { max: 700 }),
    targetingLogic: text(body.targetingLogic, "targetingLogic", { max: 1000 }),
    targetingAiUse: text(body.targetingAiUse, "targetingAiUse", { max: 700 }),
    targetingPolicyUrl: optionalUrl(body.targetingPolicyUrl, "targetingPolicyUrl"),
    dataController: text(body.dataController, "dataController", { max: 500 }),
    consentWithdrawUrl: optionalUrl(body.consentWithdrawUrl, "consentWithdrawUrl"),
    dataRightsUrl: optionalUrl(body.dataRightsUrl, "dataRightsUrl"),
    privacyInformationUrl: optionalUrl(body.privacyInformationUrl, "privacyInformationUrl"),
    reachViews: optionalNumberValue(body.reachViews, "reachViews", { min: 0, max: 2_000_000_000 }),
    reachEngagements: optionalNumberValue(body.reachEngagements, "reachEngagements", { min: 0, max: 2_000_000_000 }),
    reachClicks: optionalNumberValue(body.reachClicks, "reachClicks", { min: 0, max: 2_000_000_000 }),
    reachLikes: optionalNumberValue(body.reachLikes, "reachLikes", { min: 0, max: 2_000_000_000 }),
    reachComments: optionalNumberValue(body.reachComments, "reachComments", { min: 0, max: 2_000_000_000 }),
  };

  if (input.disseminationStartsAt && input.disseminationEndsAt && input.disseminationStartsAt > input.disseminationEndsAt) {
    throw new RequestValidationError("disseminationEndsAt must not be before disseminationStartsAt.");
  }

  if (input.usesPersonalData && !input.isTargeted) {
    throw new RequestValidationError("usesPersonalData requires isTargeted.");
  }

  return input;
}

export function parseSignupInput(value: unknown) {
  const body = record(value);

  return {
    organizationName: text(body.organizationName, "organizationName", { required: true, max: 160 }),
    name: text(body.name, "name", { required: true, max: 120 }),
    email: text(body.email, "email", { required: true, max: 240 }).toLowerCase(),
    turnstileToken: text(body.turnstileToken, "turnstileToken", { max: 2048 }),
  };
}

export function parseLoginRequestInput(value: unknown) {
  const body = record(value);

  return {
    email: text(body.email, "email", { required: true, max: 240 }).toLowerCase(),
    turnstileToken: text(body.turnstileToken, "turnstileToken", { max: 2048 }),
  };
}

export function parseComplianceReportInput(value: unknown) {
  const body = record(value);
  const reporterEmail = optionalEmail(body.reporterEmail, "reporterEmail");
  const reason = choice(body.reason, "reason", [
    "incorrect-sponsor",
    "incorrect-cost",
    "incorrect-targeting",
    "missing-information",
    "other",
  ]);

  if (!reason) {
    throw new RequestValidationError("reason is required.");
  }

  if (!reporterEmail) {
    throw new RequestValidationError("reporterEmail is required.");
  }

  return {
    reporterName: text(body.reporterName, "reporterName", { required: true, max: 160 }),
    reporterEmail,
    reason,
    details: text(body.details, "details", { required: true, min: 20, max: 3000 }),
    turnstileToken: text(body.turnstileToken, "turnstileToken", { max: 2048 }),
  };
}

export function parseInviteAcceptInput(value: unknown) {
  const body = record(value);

  return {
    name: text(body.name, "name", { max: 120 }),
    turnstileToken: text(body.turnstileToken, "turnstileToken", { max: 2048 }),
  };
}

export function parseAppBranchInput(value: unknown): AppBranchInput {
  const body = record(value);

  return {
    name: text(body.name, "name", { required: true, max: 140 }),
    kind: text(body.kind, "kind", { max: 80 }) || "oblast",
  };
}

export function parseAppBranchUpdateInput(value: unknown): AppBranchUpdateInput {
  const body = record(value);

  return {
    name: text(body.name, "name", { required: true, max: 140 }),
    kind: text(body.kind, "kind", { max: 80 }) || "oblast",
    parentId: text(body.parentId, "parentId", { max: 120 }),
    contactEmail: text(body.contactEmail, "contactEmail", { max: 240 }).toLowerCase(),
    description: text(body.description, "description", { max: 500 }),
    archived: body.archived === true,
  };
}

export function parseAppCampaignInput(value: unknown): AppCampaignInput {
  const body = record(value);
  const startsAt = optionalDate(text(body.startsAt, "startsAt", { required: true, max: 20 }), "startsAt");
  const endsAt = optionalDate(text(body.endsAt, "endsAt", { required: true, max: 20 }), "endsAt");
  const electionDate = optionalDate(text(body.electionDate, "electionDate", { max: 20 }), "electionDate");

  return {
    name: text(body.name, "name", { required: true, max: 160 }),
    slug: text(body.slug, "slug", { max: 100 }),
    election: text(body.election, "election", { required: true, max: 140 }),
    electionLevel: text(body.electionLevel, "electionLevel", { max: 100 }),
    electionDate,
    officialInformationUrl: optionalUrl(body.officialInformationUrl, "officialInformationUrl"),
    aggregatedAmount: text(body.aggregatedAmount, "aggregatedAmount", { max: 80 }),
    benefitsInKind: text(body.benefitsInKind, "benefitsInKind", { max: 80 }),
    currency: text(body.currency, "currency", { max: 8 }).toUpperCase(),
    calculationMethod: text(body.calculationMethod, "calculationMethod", { max: 700 }),
    description: text(body.description, "description", { max: 700 }),
    tags: textArray(body.tags, "tags", { maxItems: 16, maxItemLength: 48 }),
    startsAt,
    endsAt,
    archived: body.archived === true,
  };
}

export function parseAppCandidateInput(value: unknown): AppCandidateInput {
  const body = record(value);

  return {
    name: text(body.name, "name", { required: true, max: 160 }),
    slug: text(body.slug, "slug", { max: 100 }),
    branchId: text(body.branchId, "branchId", { max: 120 }),
    contactEmail: text(body.contactEmail, "contactEmail", { max: 240 }).toLowerCase(),
    ballotNumber: text(body.ballotNumber, "ballotNumber", { max: 40 }),
    description: text(body.description, "description", { max: 700 }),
    archived: body.archived === true,
  };
}

export function parseAppTenantSettingsInput(value: unknown): AppTenantSettingsInput {
  const body = record(value);
  const defaultLocale = text(body.defaultLocale, "defaultLocale", { max: 8 }) === "en" ? "en" : "cs";

  return {
    name: text(body.name, "name", { required: true, max: 160 }),
    slug: text(body.slug, "slug", { required: true, max: 80 }),
    contactEmail: optionalEmail(body.contactEmail, "contactEmail"),
    complianceEmail: optionalEmail(body.complianceEmail, "complianceEmail"),
    defaultLocale,
    publicRepositoryEnabled: body.publicRepositoryEnabled === true,
    retentionYears: numberValue(body.retentionYears, "retentionYears", { min: 7, max: 20 }),
  };
}

export function parseReviewDecisionInput(value: unknown): ReviewDecisionInput {
  const body = record(value);

  return {
    note: text(body.note, "note", { required: true, max: 800 }),
  };
}

export function parseInviteInput(value: unknown): InviteInput {
  const body = record(value);

  return {
    email: text(body.email, "email", { required: true, max: 240 }).toLowerCase(),
    role: text(body.role, "role", { max: 80 }) as InviteInput["role"],
    branchId: text(body.branchId, "branchId", { max: 120 }),
    candidateId: text(body.candidateId, "candidateId", { max: 120 }),
  };
}

export function parseAppProfileInput(value: unknown): AppProfileInput {
  const body = record(value);

  return {
    name: text(body.name, "name", { required: true, max: 120 }),
  };
}

export function parseAppMemberUpdateInput(value: unknown): AppMemberUpdateInput {
  const body = record(value);

  return {
    name: text(body.name, "name", { required: true, max: 120 }),
    role: text(body.role, "role", { required: true, max: 80 }) as AppMemberUpdateInput["role"],
    branchId: text(body.branchId, "branchId", { max: 120 }),
    candidateId: text(body.candidateId, "candidateId", { max: 120 }),
    status: text(body.status, "status", { required: true, max: 40 }) as AppMemberUpdateInput["status"],
  };
}

export function validationErrorResponse(error: unknown) {
  if (error instanceof RequestValidationError) {
    return Response.json({ error: error.message, issues: error.issues }, { status: error.status });
  }

  return null;
}
