import type {
  AppBranchInput,
  AppBranchUpdateInput,
  AppMemberUpdateInput,
  AppProfileInput,
  AppTenantSettingsInput,
  EditableAdInput,
  InviteInput,
  ReviewDecisionInput,
} from "@/lib/admin-demo-types";

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

function text(value: unknown, field: string, options: { max?: number; required?: boolean } = {}) {
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

export function parseEditableAdInput(value: unknown): EditableAdInput {
  const body = record(value);
  const channel = body.channel === "online" ? "online" : "offline";
  const publicationDate = optionalDate(text(body.publicationDate, "publicationDate", { required: true, max: 20 }), "publicationDate");

  return {
    code: text(body.code, "code", { max: 80 }),
    title: text(body.title, "title", { required: true, max: 180 }),
    branch: text(body.branch, "branch", { required: true, max: 140 }),
    owner: text(body.owner, "owner", { max: 180 }),
    type: text(body.type, "type", { max: 100 }),
    channel,
    publicationDate,
    period: text(body.period, "period", { max: 180 }),
    distributionArea: text(body.distributionArea, "distributionArea", { max: 220 }),
    payer: text(body.payer, "payer", { max: 180 }),
    supplier: text(body.supplier, "supplier", { max: 180 }),
    amount: text(body.amount, "amount", { max: 80 }),
    fundingSource: text(body.fundingSource, "fundingSource", { max: 180 }),
    language: text(body.language, "language", { max: 40 }) || "cs",
    isTargeted: body.isTargeted === true,
    targeting: text(body.targeting, "targeting", { max: 260 }),
    targetAudience: text(body.targetAudience, "targetAudience", { max: 260 }),
  };
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

export function parseAppTenantSettingsInput(value: unknown): AppTenantSettingsInput {
  const body = record(value);
  const defaultLocale = text(body.defaultLocale, "defaultLocale", { max: 8 }) === "en" ? "en" : "cs";

  return {
    name: text(body.name, "name", { required: true, max: 160 }),
    slug: text(body.slug, "slug", { required: true, max: 80 }),
    contactEmail: text(body.contactEmail, "contactEmail", { max: 240 }).toLowerCase(),
    defaultLocale,
    publicRepositoryEnabled: body.publicRepositoryEnabled === true,
    retentionYears: numberValue(body.retentionYears, "retentionYears", { min: 1, max: 20 }),
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
    status: text(body.status, "status", { required: true, max: 40 }) as AppMemberUpdateInput["status"],
  };
}

export function validationErrorResponse(error: unknown) {
  if (error instanceof RequestValidationError) {
    return Response.json({ error: error.message, issues: error.issues }, { status: error.status });
  }

  return null;
}
