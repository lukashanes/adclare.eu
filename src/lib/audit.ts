import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { PrismaClient, type AuditLog, type Prisma } from "@/generated/prisma/client";
import { computeAuditEntryHash } from "@/lib/audit-hash";
import { prisma } from "@/lib/prisma";
import { getRequestIp } from "@/lib/request-security";

export { computeAuditEntryHash } from "@/lib/audit-hash";

type AuditDb = PrismaClient | Prisma.TransactionClient;

export type AuditRequestContext = {
  ipAddress: string;
  userAgent: string;
  requestId: string;
  correlationId: string;
};

export type AuditActorContext = {
  actor: string;
  actorUserId?: string | null;
  actorRole?: string;
  actorScope?: string;
};

export type AuditEventInput = AuditActorContext & {
  tenantId: string;
  adId?: string | null;
  entityType?: string;
  entityId?: string;
  entityLabel?: string;
  action: string;
  outcome?: "success" | "failure" | "denied";
  severity?: "debug" | "info" | "warning" | "error" | "critical";
  messageCs: string;
  messageEn: string;
  before?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | null;
  after?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | null;
  diff?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | null;
  metadata?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | null;
  requestContext?: Partial<AuditRequestContext> | null;
};

export type AuditIntegrityReport = {
  checked: number;
  verified: number;
  legacy: number;
  broken: number;
  firstSequence: string;
  lastSequence: string;
  firstHash: string;
  lastHash: string;
  complete: boolean;
};

const auditRequestContext = new AsyncLocalStorage<AuditRequestContext>();

function emptyRequestContext(): AuditRequestContext {
  return {
    ipAddress: "",
    userAgent: "",
    requestId: "",
    correlationId: "",
  };
}

export function buildAuditContext(request: Request, session?: unknown): AuditRequestContext {
  void session;

  const requestId = request.headers.get("x-request-id") || request.headers.get("cf-ray") || randomUUID();

  return {
    ipAddress: getRequestIp(request),
    userAgent: request.headers.get("user-agent") ?? "",
    requestId,
    correlationId: request.headers.get("x-correlation-id") || requestId,
  };
}

export function withAuditContext<T>(context: AuditRequestContext, run: () => T): T {
  return auditRequestContext.run(context, run);
}

export function currentAuditContext() {
  return auditRequestContext.getStore() ?? emptyRequestContext();
}

function jsonOrNull(value: AuditEventInput["metadata"]) {
  return value ?? undefined;
}

async function writeAuditEventInTransaction(db: AuditDb, input: AuditEventInput) {
  await db.$executeRaw`
    INSERT INTO "audit_chains" ("tenantId", "lastSequence", "lastHash", "updatedAt")
    VALUES (${input.tenantId}, 0, '', CURRENT_TIMESTAMP)
    ON CONFLICT ("tenantId") DO NOTHING
  `;

  const chains = await db.$queryRaw<Array<{ lastSequence: bigint; lastHash: string }>>`
    SELECT "lastSequence", "lastHash"
    FROM "audit_chains"
    WHERE "tenantId" = ${input.tenantId}
    FOR UPDATE
  `;
  const chain = chains[0] ?? { lastSequence: 0n, lastHash: "" };
  const sequence = chain.lastSequence + 1n;
  const request = { ...currentAuditContext(), ...(input.requestContext ?? {}) };
  const createdAt = new Date();
  const payload = {
    tenantId: input.tenantId,
    adId: input.adId ?? null,
    entityType: input.entityType ?? (input.adId ? "ad" : ""),
    entityId: input.entityId ?? input.adId ?? "",
    entityLabel: input.entityLabel ?? "",
    actor: input.actor,
    actorUserId: input.actorUserId ?? null,
    actorRole: input.actorRole ?? "",
    actorScope: input.actorScope ?? "",
    action: input.action,
    outcome: input.outcome ?? "success",
    severity: input.severity ?? "info",
    messageCs: input.messageCs,
    messageEn: input.messageEn,
    ipAddress: request.ipAddress ?? "",
    userAgent: request.userAgent ?? "",
    requestId: request.requestId ?? "",
    correlationId: request.correlationId ?? request.requestId ?? "",
    before: input.before ?? null,
    after: input.after ?? null,
    diff: input.diff ?? null,
    metadata: input.metadata ?? null,
    sequence,
    previousHash: chain.lastHash,
    createdAt,
  };
  const entryHash = computeAuditEntryHash(payload);

  const log = await db.auditLog.create({
    data: {
      tenantId: payload.tenantId,
      adId: payload.adId,
      entityType: payload.entityType,
      entityId: payload.entityId,
      entityLabel: payload.entityLabel,
      actor: payload.actor,
      actorUserId: payload.actorUserId,
      actorRole: payload.actorRole,
      actorScope: payload.actorScope,
      action: payload.action,
      outcome: payload.outcome,
      severity: payload.severity,
      messageCs: payload.messageCs,
      messageEn: payload.messageEn,
      ipAddress: payload.ipAddress,
      userAgent: payload.userAgent,
      requestId: payload.requestId,
      correlationId: payload.correlationId,
      before: jsonOrNull(payload.before),
      after: jsonOrNull(payload.after),
      diff: jsonOrNull(payload.diff),
      metadata: jsonOrNull(payload.metadata),
      sequence,
      previousHash: payload.previousHash,
      entryHash,
      createdAt,
    },
  });

  await db.auditChain.update({
    where: {
      tenantId: input.tenantId,
    },
    data: {
      lastSequence: sequence,
      lastHash: entryHash,
    },
  });

  return log;
}

export async function writeAuditEvent(db: AuditDb, input: AuditEventInput) {
  if (db === prisma) {
    return prisma.$transaction((tx) => writeAuditEventInTransaction(tx, input));
  }

  return writeAuditEventInTransaction(db, input);
}

export async function writeSystemAuditEvent(input: AuditEventInput) {
  return writeAuditEvent(prisma, input);
}

export function verifyAuditEntries(logs: AuditLog[], complete = true): AuditIntegrityReport {
  const sequenced = [...logs]
    .filter((log) => log.sequence > 0n && log.entryHash)
    .sort((left, right) => (left.sequence < right.sequence ? -1 : left.sequence > right.sequence ? 1 : 0));
  let verified = 0;
  let broken = 0;
  let expectedPreviousHash = sequenced[0]?.previousHash ?? "";

  for (const log of sequenced) {
    if (complete && log.previousHash !== expectedPreviousHash) {
      broken += 1;
      expectedPreviousHash = log.entryHash;
      continue;
    }

    const computed = computeAuditEntryHash({
      tenantId: log.tenantId,
      adId: log.adId,
      entityType: log.entityType,
      entityId: log.entityId,
      entityLabel: log.entityLabel,
      actor: log.actor,
      actorUserId: log.actorUserId,
      actorRole: log.actorRole,
      actorScope: log.actorScope,
      action: log.action,
      outcome: log.outcome,
      severity: log.severity,
      messageCs: log.messageCs,
      messageEn: log.messageEn,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      requestId: log.requestId,
      correlationId: log.correlationId,
      before: log.before,
      after: log.after,
      diff: log.diff,
      metadata: log.metadata,
      sequence: log.sequence,
      previousHash: log.previousHash,
      createdAt: log.createdAt,
    });

    if (computed === log.entryHash) {
      verified += 1;
    } else {
      broken += 1;
    }

    expectedPreviousHash = log.entryHash;
  }

  return {
    checked: sequenced.length,
    verified,
    legacy: logs.length - sequenced.length,
    broken,
    firstSequence: sequenced[0]?.sequence.toString() ?? "",
    lastSequence: sequenced.at(-1)?.sequence.toString() ?? "",
    firstHash: sequenced[0]?.entryHash ?? "",
    lastHash: sequenced.at(-1)?.entryHash ?? "",
    complete,
  };
}
