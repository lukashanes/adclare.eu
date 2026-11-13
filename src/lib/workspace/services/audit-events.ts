import { MembershipStatus, Prisma, UserRole, type AuditLog } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/lib/workspace-types";

const defaultPage = 1;
const defaultLimit = 50;
const maxLimit = 100;
const maxPage = 100_000;
const auditRoles = new Set<UserRole>([
  UserRole.SUPER_ADMIN,
  UserRole.PARTY_ADMIN,
  UserRole.CENTRAL_REVIEWER,
  UserRole.LOCAL_ADMIN,
  UserRole.CAMPAIGN_MANAGER,
  UserRole.CANDIDATE,
  UserRole.DESIGNER,
  UserRole.READONLY_AUDITOR,
]);
const allowedQueryKeys = new Set([
  "actor",
  "action",
  "entityType",
  "outcome",
  "requestId",
  "dateFrom",
  "dateTo",
  "page",
  "limit",
  "locale",
]);

export type AuditEventsQuery = {
  actor: string;
  action: string;
  entityType: string;
  outcome: "" | "success" | "failure" | "denied";
  requestId: string;
  dateFrom: Date | null;
  dateTo: Date | null;
  page: number;
  limit: number;
  locale: Locale;
};

export type AuditEventRecord = {
  id: string;
  actor: string;
  actorUserId: string;
  actorRole: string;
  actorScope: string;
  action: string;
  outcome: string;
  severity: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  ipAddress: string;
  userAgent: string;
  requestId: string;
  correlationId: string;
  sequence: string;
  previousHash: string;
  entryHash: string;
  before: unknown;
  after: unknown;
  diff: unknown;
  metadata: unknown;
  message: string;
  createdAt: string;
};

export type AuditEventsPage = {
  events: AuditEventRecord[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  filters: {
    actor: string;
    action: string;
    entityType: string;
    outcome: string;
    requestId: string;
    dateFrom: string;
    dateTo: string;
  };
};

export class AuditEventsQueryValidationError extends Error {
  readonly issues: string[];

  constructor(message: string, issues: string[] = [message]) {
    super(message);
    this.name = "AuditEventsQueryValidationError";
    this.issues = issues;
  }
}

function queryText(params: URLSearchParams, field: string, maxLength: number) {
  const values = params.getAll(field);

  if (values.length > 1) {
    throw new AuditEventsQueryValidationError(`${field} must be provided only once.`);
  }

  const value = values[0]?.trim() ?? "";

  if (value.length > maxLength) {
    throw new AuditEventsQueryValidationError(`${field} is too long.`);
  }

  if ([...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  })) {
    throw new AuditEventsQueryValidationError(`${field} contains invalid characters.`);
  }

  return value;
}

function exactFilter(params: URLSearchParams, field: string) {
  const value = queryText(params, field, 80);

  if (value && !/^[a-zA-Z0-9_.:-]+$/.test(value)) {
    throw new AuditEventsQueryValidationError(`${field} has an invalid format.`);
  }

  return value.toLowerCase();
}

function positiveInteger(params: URLSearchParams, field: string, fallback: number, maximum: number) {
  const value = queryText(params, field, 12);

  if (!value) {
    return fallback;
  }

  if (!/^[1-9]\d*$/.test(value)) {
    throw new AuditEventsQueryValidationError(`${field} must be a positive integer.`);
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed > maximum) {
    throw new AuditEventsQueryValidationError(`${field} is too high.`);
  }

  return parsed;
}

function calendarDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return null;
  }

  return date;
}

function dateBoundary(params: URLSearchParams, field: "dateFrom" | "dateTo") {
  const value = queryText(params, field, 64);

  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = calendarDate(value);

    if (!parsed) {
      throw new AuditEventsQueryValidationError(`${field} must be a valid date.`);
    }

    if (field === "dateTo") {
      parsed.setUTCHours(23, 59, 59, 999);
    }

    return parsed;
  }

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new AuditEventsQueryValidationError(`${field} must be an ISO 8601 date or date-time.`);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new AuditEventsQueryValidationError(`${field} must be a valid date.`);
  }

  return parsed;
}

export function parseAuditEventsQuery(params: URLSearchParams): AuditEventsQuery {
  for (const key of params.keys()) {
    if (!allowedQueryKeys.has(key)) {
      throw new AuditEventsQueryValidationError(`Unknown query parameter: ${key}.`);
    }
  }

  const actor = queryText(params, "actor", 240);
  const action = exactFilter(params, "action");
  const entityType = exactFilter(params, "entityType");
  const outcome = exactFilter(params, "outcome");
  const requestId = queryText(params, "requestId", 180);
  const dateFrom = dateBoundary(params, "dateFrom");
  const dateTo = dateBoundary(params, "dateTo");
  const page = positiveInteger(params, "page", defaultPage, maxPage);
  const limit = positiveInteger(params, "limit", defaultLimit, maxLimit);
  const localeValue = queryText(params, "locale", 2);

  if (outcome && !["success", "failure", "denied"].includes(outcome)) {
    throw new AuditEventsQueryValidationError("outcome must be success, failure, or denied.");
  }

  if (localeValue && localeValue !== "cs" && localeValue !== "en") {
    throw new AuditEventsQueryValidationError("locale must be cs or en.");
  }

  if (dateFrom && dateTo && dateFrom.getTime() > dateTo.getTime()) {
    throw new AuditEventsQueryValidationError("dateFrom must not be after dateTo.");
  }

  return {
    actor,
    action,
    entityType,
    outcome: outcome as AuditEventsQuery["outcome"],
    requestId,
    dateFrom,
    dateTo,
    page,
    limit,
    locale: localeValue === "en" ? "en" : "cs",
  };
}

function mapAuditEvent(log: AuditLog, locale: Locale): AuditEventRecord {
  return {
    id: log.id,
    actor: log.actor,
    actorUserId: log.actorUserId ?? "",
    actorRole: log.actorRole,
    actorScope: log.actorScope,
    action: log.action,
    outcome: log.outcome,
    severity: log.severity,
    entityType: log.entityType,
    entityId: log.entityId,
    entityLabel: log.entityLabel,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    requestId: log.requestId,
    correlationId: log.correlationId,
    sequence: log.sequence.toString(),
    previousHash: log.previousHash,
    entryHash: log.entryHash,
    before: log.before,
    after: log.after,
    diff: log.diff,
    metadata: log.metadata,
    message: locale === "cs" ? log.messageCs : log.messageEn,
    createdAt: log.createdAt.toISOString(),
  };
}

type AuditMembershipScope = {
  userId: string;
  role: UserRole;
  orgUnitId: string | null;
  candidateId: string | null;
};

function tenantWideAuditRole(role: UserRole) {
  return role === UserRole.SUPER_ADMIN
    || role === UserRole.PARTY_ADMIN
    || role === UserRole.CENTRAL_REVIEWER
    || role === UserRole.READONLY_AUDITOR;
}

function auditScopeWhere(membership: AuditMembershipScope): Prisma.AuditLogWhereInput {
  if (tenantWideAuditRole(membership.role)) {
    return {};
  }

  if (membership.role === UserRole.CANDIDATE) {
    const candidateId = membership.candidateId || "__missing_candidate_scope__";

    return {
      OR: [
        { actorUserId: membership.userId },
        { ad: { is: { candidateId } } },
        { entityType: "candidate", entityId: candidateId },
      ],
    };
  }

  const orgUnitId = membership.orgUnitId || "__missing_org_scope__";

  return {
    OR: [
      { actorUserId: membership.userId },
      { ad: { is: { orgUnitId } } },
      { entityType: "organization_unit", entityId: orgUnitId },
      { entityType: "branch", entityId: orgUnitId },
    ],
  };
}

function auditWhere(tenantId: string, membership: AuditMembershipScope, query: AuditEventsQuery): Prisma.AuditLogWhereInput {
  return {
    tenantId,
    ...(query.actor ? { actor: { contains: query.actor, mode: "insensitive" } } : {}),
    ...(query.action ? { action: query.action } : {}),
    ...(query.entityType ? { entityType: query.entityType } : {}),
    ...(query.outcome ? { outcome: query.outcome } : {}),
    ...(query.requestId ? { requestId: query.requestId } : {}),
    ...(query.dateFrom || query.dateTo
      ? {
          createdAt: {
            ...(query.dateFrom ? { gte: query.dateFrom } : {}),
            ...(query.dateTo ? { lte: query.dateTo } : {}),
          },
        }
      : {}),
    ...auditScopeWhere(membership),
  };
}

export async function getAppAuditEvents(userId: string, query: AuditEventsQuery): Promise<AuditEventsPage | null> {
  const membership = await prisma.tenantMembership.findFirst({
    where: {
      userId,
      status: MembershipStatus.ACTIVE,
    },
    select: {
      tenantId: true,
      userId: true,
      role: true,
      orgUnitId: true,
      candidateId: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!membership || !auditRoles.has(membership.role)) {
    return null;
  }

  const where = auditWhere(membership.tenantId, membership, query);
  const [events, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { sequence: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    events: events.map((event) => mapAuditEvent(event, query.locale)),
    total,
    page: query.page,
    limit: query.limit,
    hasMore: query.page * query.limit < total,
    filters: {
      actor: query.actor,
      action: query.action,
      entityType: query.entityType,
      outcome: query.outcome,
      requestId: query.requestId,
      dateFrom: query.dateFrom?.toISOString() ?? "",
      dateTo: query.dateTo?.toISOString() ?? "",
    },
  };
}
