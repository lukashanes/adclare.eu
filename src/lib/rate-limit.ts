import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

type RateLimitOptions = {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
};

function bucketKey(scope: string, identifier: string) {
  return createHash("sha256").update(`${scope}:${identifier}`).digest("base64url");
}

function bucketId() {
  return `rl_${randomBytes(12).toString("base64url")}`;
}

export function requestIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export async function checkRateLimit({ scope, identifier, limit, windowMs }: RateLimitOptions): Promise<RateLimitResult> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  const key = bucketKey(scope, identifier || "unknown");
  const [bucket] = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>`
    INSERT INTO "rate_limit_buckets" ("id", "key", "scope", "identifier", "count", "resetAt", "createdAt", "updatedAt")
    VALUES (${bucketId()}, ${key}, ${scope}, ${identifier || "unknown"}, 1, ${resetAt}, ${now}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "scope" = EXCLUDED."scope",
      "identifier" = EXCLUDED."identifier",
      "count" = CASE
        WHEN "rate_limit_buckets"."resetAt" <= ${now} THEN 1
        ELSE LEAST("rate_limit_buckets"."count" + 1, ${limit + 1})
      END,
      "resetAt" = CASE
        WHEN "rate_limit_buckets"."resetAt" <= ${now} THEN ${resetAt}
        ELSE "rate_limit_buckets"."resetAt"
      END,
      "updatedAt" = ${now}
    RETURNING "count", "resetAt"
  `;
  const count = Number(bucket?.count ?? limit + 1);
  const bucketResetAt = bucket?.resetAt ?? resetAt;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: bucketResetAt,
  };
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": result.resetAt.toISOString(),
  };
}
