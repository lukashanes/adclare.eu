import { createHash } from "node:crypto";

export type AuditEntryHashInput = {
  tenantId: string;
  adId: string | null;
  entityType: string;
  entityId: string;
  entityLabel: string;
  actor: string;
  actorUserId: string | null;
  actorRole: string;
  actorScope: string;
  action: string;
  outcome: string;
  severity: string;
  messageCs: string;
  messageEn: string;
  ipAddress: string;
  userAgent: string;
  requestId: string;
  correlationId: string;
  before: unknown;
  after: unknown;
  diff: unknown;
  metadata: unknown;
  sequence: bigint | number | string;
  previousHash: string;
  createdAt: Date | string;
};

function normalizeJson(value: unknown): unknown {
  if (value === undefined) {
    return null;
  }

  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeJson(item));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, normalizeJson(item)]),
    );
  }

  return String(value);
}

function stableStringify(value: unknown) {
  return JSON.stringify(normalizeJson(value));
}

function auditHashPayload(input: AuditEntryHashInput) {
  return {
    tenantId: input.tenantId,
    adId: input.adId,
    entityType: input.entityType,
    entityId: input.entityId,
    entityLabel: input.entityLabel,
    actor: input.actor,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    actorScope: input.actorScope,
    action: input.action,
    outcome: input.outcome,
    severity: input.severity,
    messageCs: input.messageCs,
    messageEn: input.messageEn,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    requestId: input.requestId,
    correlationId: input.correlationId,
    before: input.before ?? null,
    after: input.after ?? null,
    diff: input.diff ?? null,
    metadata: input.metadata ?? null,
    sequence: input.sequence.toString(),
    previousHash: input.previousHash,
    createdAt: input.createdAt instanceof Date ? input.createdAt.toISOString() : input.createdAt,
  };
}

export function computeAuditEntryHash(input: AuditEntryHashInput) {
  return createHash("sha256").update(stableStringify(auditHashPayload(input))).digest("hex");
}
