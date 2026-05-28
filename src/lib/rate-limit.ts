import { createHash } from "node:crypto";
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
  const existing = await prisma.rateLimitBucket.findUnique({
    where: {
      key,
    },
  });

  if (!existing || existing.resetAt.getTime() <= now.getTime()) {
    const bucket = await prisma.rateLimitBucket.upsert({
      where: {
        key,
      },
      update: {
        scope,
        identifier,
        count: 1,
        resetAt,
      },
      create: {
        key,
        scope,
        identifier,
        count: 1,
        resetAt,
      },
    });

    return {
      allowed: true,
      remaining: Math.max(0, limit - bucket.count),
      resetAt: bucket.resetAt,
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  const bucket = await prisma.rateLimitBucket.update({
    where: {
      key,
    },
    data: {
      count: {
        increment: 1,
      },
    },
  });

  return {
    allowed: true,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": result.resetAt.toISOString(),
  };
}
