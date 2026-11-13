import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { EmailStatus, MembershipStatus } from "@/generated/prisma/client";
import { writeAuditEvent, writeSystemAuditEvent } from "@/lib/audit";
import {
  cloudflareEmailMissingConfigError,
  deliverEmailMessage,
  escapeEmailHtml,
  isCloudflareEmailConfigured,
} from "@/lib/cloudflare-email";
import { readCookieFromHeader } from "@/lib/request-security";
import { logPendingEmailLink, publicAppUrl } from "@/lib/instance-config";
import { prisma } from "@/lib/prisma";

export const APP_SESSION_COOKIE = "adclare_user_session";

const loginTokenTtlMs = 15 * 60 * 1000;
const loginRequestCooldownMs = 2 * 60 * 1000;
const loginRequestLimitWindowMs = 60 * 60 * 1000;
const maxLoginRequestsPerWindow = 5;
const sessionTtlSeconds = 30 * 24 * 60 * 60;
const sessionTouchIntervalMs = 5 * 60 * 1000;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function hashToken(value: string) {
  return createHash("sha256").update(value).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    const length = Math.max(leftBuffer.length, rightBuffer.length);
    timingSafeEqual(Buffer.alloc(length), Buffer.alloc(length));
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function serializeCookie(name: string, value: string, attributes: Record<string, string | number | boolean>) {
  const segments = [`${name}=${encodeURIComponent(value)}`];

  for (const [key, attributeValue] of Object.entries(attributes)) {
    if (attributeValue === true) {
      segments.push(key);
    } else if (attributeValue !== false) {
      segments.push(`${key}=${attributeValue}`);
    }
  }

  return segments.join("; ");
}

export function serializeAppSessionCookie(value: string, now = Date.now()) {
  return serializeCookie(APP_SESSION_COOKIE, value, {
    Path: "/",
    HttpOnly: true,
    "SameSite": "Strict",
    Secure: process.env.NODE_ENV === "production",
    "Max-Age": sessionTtlSeconds,
    Expires: new Date(now + sessionTtlSeconds * 1000).toUTCString(),
  });
}

export function serializeAppSessionClearCookie() {
  return serializeCookie(APP_SESSION_COOKIE, "", {
    Path: "/",
    HttpOnly: true,
    "SameSite": "Strict",
    Secure: process.env.NODE_ENV === "production",
    "Max-Age": 0,
    Expires: new Date(0).toUTCString(),
  });
}

async function deliverLoginEmail(tenantId: string, toEmail: string, loginUrl: string) {
  const safeLoginUrl = escapeEmailHtml(loginUrl);
  const subject = "Přihlášení do Adclare";
  const bodyText = [
    "Dobrý den,",
    "",
    "pro přihlášení do Adclare použijte tento odkaz:",
    loginUrl,
    "",
    "Odkaz je platný 15 minut. Pokud jste si přihlášení nevyžádali, e-mail ignorujte.",
  ].join("\n");
  const bodyHtml = `
    <p>Dobrý den,</p>
    <p>Pro přihlášení do <strong>Adclare</strong> použijte tento odkaz:</p>
    <p><a href="${safeLoginUrl}">Přihlásit se do Adclare</a></p>
    <p>Odkaz je platný 15 minut. Pokud jste si přihlášení nevyžádali, e-mail ignorujte.</p>
  `;
  const storedBodyText = bodyText.replace(loginUrl, "[one-time login link redacted]");
  const storedBodyHtml = bodyHtml.replace(safeLoginUrl, "#");

  const email = await prisma.emailMessage.create({
    data: {
      tenantId,
      toEmail,
      subject,
      bodyText: storedBodyText,
      bodyHtml: storedBodyHtml,
      provider: "cloudflare_email_service",
      status: EmailStatus.PENDING_PROVIDER,
      error: isCloudflareEmailConfigured() ? "" : cloudflareEmailMissingConfigError,
    },
  });

  if (!isCloudflareEmailConfigured()) {
    logPendingEmailLink("Login", toEmail, loginUrl);
  }

  return deliverEmailMessage(email, { bodyText, bodyHtml });
}

export async function requestAppLoginLink(rawEmail: string) {
  const email = normalizeEmail(rawEmail);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: true };
  }

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      memberships: {
        where: {
          status: MembershipStatus.ACTIVE,
        },
        include: {
          tenant: true,
        },
        take: 1,
      },
    },
  });

  if (!user || user.memberships.length === 0) {
    return { ok: true };
  }

  const now = Date.now();
  const cooldownSince = new Date(now - loginRequestCooldownMs);
  const limitWindowSince = new Date(now - loginRequestLimitWindowMs);
  const recentRequests = await prisma.loginToken.findMany({
    where: {
      email,
      createdAt: {
        gte: limitWindowSince,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      createdAt: true,
    },
    take: maxLoginRequestsPerWindow,
  });

  if (
    recentRequests.length >= maxLoginRequestsPerWindow ||
    (recentRequests[0] && recentRequests[0].createdAt.getTime() >= cooldownSince.getTime())
  ) {
    return { ok: true };
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(now + loginTokenTtlMs);
  const tenantId = user.memberships[0].tenantId;

  await prisma.loginToken.create({
    data: {
      email,
      tokenHash,
      expiresAt,
    },
  });

  await deliverLoginEmail(tenantId, email, `${publicAppUrl()}/api/login/verify/${token}`);

  await writeSystemAuditEvent({
    tenantId,
    actor: email,
    entityType: "user",
    entityId: user.id,
    entityLabel: email,
    action: "request_login_link",
    messageCs: `Vyžádán přihlašovací odkaz pro ${email}.`,
    messageEn: `Requested login link for ${email}.`,
  });

  return { ok: true };
}

export async function consumeAppLoginToken(token: string) {
  const tokenHash = hashToken(token);
  const now = new Date();
  const loginToken = await prisma.loginToken.findUnique({
    where: {
      tokenHash,
    },
  });

  if (!loginToken || loginToken.usedAt || loginToken.expiresAt.getTime() < now.getTime()) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      email: loginToken.email,
    },
    include: {
      memberships: {
        where: {
          status: MembershipStatus.ACTIVE,
        },
        take: 1,
      },
    },
  });

  if (!user || user.memberships.length === 0) {
    return null;
  }

  const sessionToken = randomBytes(32).toString("base64url");
  const sessionTokenHash = hashToken(sessionToken);
  const expiresAt = new Date(Date.now() + sessionTtlSeconds * 1000);

  const consumed = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.loginToken.updateMany({
      where: {
        id: loginToken.id,
        usedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      data: {
        usedAt: now,
      },
    });

    if (updated.count !== 1) {
      return false;
    }

    await transaction.userSession.create({
      data: {
        userId: user.id,
        tokenHash: sessionTokenHash,
        expiresAt,
      },
    });

    await writeAuditEvent(transaction, {
      tenantId: user.memberships[0].tenantId,
      actor: user.email,
      actorUserId: user.id,
      actorRole: user.memberships[0].role,
      entityType: "user",
      entityId: user.id,
      entityLabel: user.email,
      action: "login_magic_link",
      messageCs: `Uživatel ${user.email} se přihlásil přes e-mailový odkaz.`,
      messageEn: `User ${user.email} signed in via email link.`,
    });

    return true;
  });

  if (!consumed) {
    return null;
  }

  return {
    user,
    cookie: serializeAppSessionCookie(sessionToken),
  };
}

export async function getAppSession(cookieHeader: string | null) {
  const rawToken = readCookieFromHeader(cookieHeader, APP_SESSION_COOKIE);

  if (!rawToken) {
    return null;
  }

  const tokenHash = hashToken(rawToken);
  const session = await prisma.userSession.findUnique({
    where: {
      tokenHash,
    },
    include: {
      user: {
        include: {
          memberships: {
            where: {
              status: MembershipStatus.ACTIVE,
            },
            include: {
              tenant: true,
              orgUnit: true,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      },
    },
  });

  if (!session || session.expiresAt.getTime() < Date.now() || session.user.memberships.length === 0 || !safeEqual(session.tokenHash, tokenHash)) {
    return null;
  }

  if (Date.now() - session.lastSeenAt.getTime() > sessionTouchIntervalMs) {
    await prisma.userSession.update({
      where: {
        id: session.id,
      },
      data: {
        lastSeenAt: new Date(),
      },
    });
  }

  return session;
}

export async function deleteAppSession(cookieHeader: string | null) {
  const rawToken = readCookieFromHeader(cookieHeader, APP_SESSION_COOKIE);

  if (!rawToken) {
    return;
  }

  const tokenHash = hashToken(rawToken);
  const session = await prisma.userSession.findUnique({
    where: {
      tokenHash,
    },
    include: {
      user: {
        include: {
          memberships: {
            where: {
              status: MembershipStatus.ACTIVE,
            },
            take: 1,
          },
        },
      },
    },
  });

  await prisma.userSession.deleteMany({
    where: {
      tokenHash,
    },
  });

  const membership = session?.user.memberships[0];
  if (session && membership) {
    await writeSystemAuditEvent({
      tenantId: membership.tenantId,
      actor: session.user.email,
      actorUserId: session.user.id,
      actorRole: membership.role,
      entityType: "user_session",
      entityId: session.id,
      entityLabel: session.user.email,
      action: "logout",
      messageCs: `Uživatel ${session.user.email} se odhlásil.`,
      messageEn: `User ${session.user.email} signed out.`,
    });
  }
}
