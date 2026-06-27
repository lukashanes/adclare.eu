#!/usr/bin/env tsx

import assert from "node:assert/strict";
import { computeAuditEntryHash, type AuditEntryHashInput } from "../src/lib/audit-hash";

function eventPayload(overrides: Partial<AuditEntryHashInput> = {}): AuditEntryHashInput {
  return {
    tenantId: "tenant-audit-smoke",
    adId: "ad-audit-smoke",
    entityType: "ad",
    entityId: "ad-audit-smoke",
    entityLabel: "AD-001",
    actor: "auditor@example.test",
    actorUserId: "user-audit-smoke",
    actorRole: "PARTY_ADMIN",
    actorScope: "Celá strana",
    action: "create_ad",
    outcome: "success",
    severity: "info",
    messageCs: "Založena reklama AD-001.",
    messageEn: "Ad AD-001 created.",
    ipAddress: "127.0.0.1",
    userAgent: "audit-chain-smoke",
    requestId: "request-audit-smoke",
    correlationId: "request-audit-smoke",
    before: null,
    after: { title: "AD-001" },
    diff: { title: { from: null, to: "AD-001" } },
    metadata: { source: "smoke" },
    sequence: 1n,
    previousHash: "",
    createdAt: new Date("2026-06-21T12:00:00.000Z"),
    ...overrides,
  };
}

const first = eventPayload();
const firstHash = computeAuditEntryHash(first);
assert.match(firstHash, /^[a-f0-9]{64}$/);
assert.equal(first.previousHash, "");

const second = eventPayload({
  action: "approve_ad",
  messageCs: "Reklama AD-001 schválena.",
  messageEn: "Ad AD-001 approved.",
  sequence: 2n,
  previousHash: firstHash,
  createdAt: new Date("2026-06-21T12:01:00.000Z"),
});
const secondHash = computeAuditEntryHash(second);
assert.match(secondHash, /^[a-f0-9]{64}$/);
assert.equal(second.previousHash, firstHash);
assert.notEqual(secondHash, firstHash);

const tamperedSecondHash = computeAuditEntryHash({
  ...second,
  metadata: { source: "smoke", tampered: true },
});
assert.notEqual(tamperedSecondHash, secondHash);

console.log("Audit chain smoke checks passed.");
