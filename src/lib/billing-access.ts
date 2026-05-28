import { BillingInterval, BillingMethod, BillingPlan, BillingStatus, EmailStatus, MembershipStatus, UserRole } from "@prisma/client";
import type { Locale } from "@/lib/admin-demo-types";
import { prisma } from "@/lib/prisma";

const trialDays = 14;
const dayMs = 24 * 60 * 60 * 1000;

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://adclare.eu").replace(/\/$/, "");
}

function cloudflareEmailAccountId() {
  return (process.env.CLOUDFLARE_EMAIL_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
}

function cloudflareEmailApiToken() {
  return (process.env.CLOUDFLARE_EMAIL_API_TOKEN || "").trim();
}

function emailFrom() {
  return process.env.EMAIL_FROM || "Adclare <noreply@adclare.eu>";
}

function billingNotificationEmail() {
  return (process.env.BILLING_NOTIFICATION_EMAIL || process.env.CONTACT_EMAIL || "lh@aenze.com").trim();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isCloudflareEmailConfigured() {
  return Boolean(cloudflareEmailAccountId() && cloudflareEmailApiToken());
}

function addTrialDays(now = new Date()) {
  return new Date(now.getTime() + trialDays * dayMs);
}

function daysLeft(date: Date | null, now = new Date()) {
  if (!date) {
    return 0;
  }

  return Math.max(0, Math.ceil((date.getTime() - now.getTime()) / dayMs));
}

function formatDate(date: Date | null, locale: Locale) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(locale === "cs" ? "cs-CZ" : "en-GB", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(date);
}

function billingStatusLabel(status: BillingStatus, locale: Locale) {
  const labels: Record<BillingStatus, Record<Locale, string>> = {
    TRIAL: { cs: "zkušební přístup", en: "trial" },
    ACTIVE: { cs: "aktivní", en: "active" },
    PENDING_INVOICE_APPROVAL: { cs: "čeká na schválení faktury", en: "pending invoice approval" },
    TRIAL_EXPIRED: { cs: "zkušební přístup skončil", en: "trial expired" },
    PAST_DUE: { cs: "po splatnosti", en: "past due" },
    PAUSED: { cs: "pozastaveno", en: "paused" },
    CANCELLED: { cs: "zrušeno", en: "cancelled" },
  };

  return labels[status][locale];
}

function billingMethodLabel(method: BillingMethod, locale: Locale) {
  const labels: Record<BillingMethod, Record<Locale, string>> = {
    STRIPE: { cs: "Stripe", en: "Stripe" },
    INVOICE: { cs: "faktura", en: "invoice" },
  };

  return labels[method][locale];
}

function effectiveBillingPrice(account: { interval: BillingInterval; yearlyPriceEur: number; monthlyPriceEur: number }, locale: Locale) {
  const amount = account.interval === BillingInterval.YEARLY ? account.yearlyPriceEur : account.monthlyPriceEur;
  const suffix = account.interval === BillingInterval.YEARLY ? (locale === "cs" ? " / rok" : " / year") : (locale === "cs" ? " / měsíc" : " / month");

  return `${amount} EUR${suffix}`;
}

function canManageBillingRole(role: UserRole) {
  return role === UserRole.SUPER_ADMIN || role === UserRole.PARTY_ADMIN;
}

export async function ensureTenantBillingAccount(tenantId: string) {
  const existing = await prisma.billingAccount.findUnique({
    where: {
      tenantId,
    },
    include: {
      tenant: true,
    },
  });

  if (!existing) {
    return prisma.billingAccount.create({
      data: {
        tenantId,
        plan: BillingPlan.LARGE_PARTY,
        interval: BillingInterval.YEARLY,
        method: BillingMethod.STRIPE,
        status: BillingStatus.TRIAL,
        discountPercent: 50,
        monthlyPriceEur: 99,
        yearlyPriceEur: 999,
        trialEndsAt: addTrialDays(),
        invoiceEmail: "",
        noteCs: "14 dní bez platby.",
        noteEn: "14-day trial without payment.",
      },
      include: {
        tenant: true,
      },
    });
  }

  if (existing.status === BillingStatus.TRIAL && !existing.trialEndsAt) {
    return prisma.billingAccount.update({
      where: {
        id: existing.id,
      },
      data: {
        trialEndsAt: addTrialDays(),
      },
      include: {
        tenant: true,
      },
    });
  }

  if (existing.status === BillingStatus.TRIAL && existing.trialEndsAt && existing.trialEndsAt.getTime() <= Date.now()) {
    return prisma.billingAccount.update({
      where: {
        id: existing.id,
      },
      data: {
        status: BillingStatus.TRIAL_EXPIRED,
      },
      include: {
        tenant: true,
      },
    });
  }

  return existing;
}

export function canUseBillingAccount(account: { status: BillingStatus; trialEndsAt: Date | null }) {
  if (account.status === BillingStatus.ACTIVE) {
    return true;
  }

  if (account.status === BillingStatus.TRIAL) {
    return Boolean(account.trialEndsAt && account.trialEndsAt.getTime() > Date.now());
  }

  if (account.status === BillingStatus.PENDING_INVOICE_APPROVAL) {
    return Boolean(account.trialEndsAt && account.trialEndsAt.getTime() > Date.now());
  }

  return false;
}

export async function getTenantBillingAccess(tenantId: string, locale: Locale) {
  const account = await ensureTenantBillingAccount(tenantId);
  const trialDaysLeft = daysLeft(account.trialEndsAt);
  const canUseApp = canUseBillingAccount(account);

  return {
    tenantId,
    tenantName: locale === "cs" ? account.tenant.nameCs : account.tenant.nameEn,
    tenantSlug: account.tenant.slug,
    billingAccountId: account.id,
    plan: account.plan,
    interval: account.interval,
    method: account.method,
    methodLabel: billingMethodLabel(account.method, locale),
    status: account.status,
    statusLabel: billingStatusLabel(account.status, locale),
    effectivePrice: effectiveBillingPrice(account, locale),
    trialEndsAt: formatDate(account.trialEndsAt, locale),
    trialEndsAtIso: account.trialEndsAt?.toISOString() ?? "",
    trialDaysLeft,
    canUseApp,
    activationRequired: !canUseApp,
    invoicePending: account.status === BillingStatus.PENDING_INVOICE_APPROVAL,
    stripeCheckoutConfigured: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    stripePortalAvailable: Boolean(account.stripeCustomerId),
  };
}

export async function getUserBillingAccess(userId: string, locale: Locale) {
  const membership = await prisma.tenantMembership.findFirst({
    where: {
      userId,
      status: MembershipStatus.ACTIVE,
    },
    include: {
      user: true,
      tenant: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!membership) {
    return null;
  }

  const access = await getTenantBillingAccess(membership.tenantId, locale);

  return {
    ...access,
    userEmail: membership.user.email,
    userName: membership.user.name,
    roleKey: membership.role,
    canManageBilling: canManageBillingRole(membership.role),
  };
}

async function deliverBillingNotification(tenantId: string, toEmail: string, subject: string, bodyText: string, bodyHtml: string) {
  const email = await prisma.emailMessage.create({
    data: {
      tenantId,
      toEmail,
      subject,
      bodyText,
      bodyHtml,
      provider: "cloudflare_email_service",
      status: isCloudflareEmailConfigured() ? EmailStatus.PENDING_PROVIDER : EmailStatus.FAILED,
      error: isCloudflareEmailConfigured() ? "" : "CLOUDFLARE_EMAIL_ACCOUNT_ID and CLOUDFLARE_EMAIL_API_TOKEN are not configured.",
    },
  });

  if (!isCloudflareEmailConfigured()) {
    return email;
  }

  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cloudflareEmailAccountId()}/email/sending/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cloudflareEmailApiToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom(),
        to: toEmail,
        subject,
        html: bodyHtml,
        text: bodyText,
      }),
    });
    const result = (await response.json().catch(() => ({}))) as { success?: boolean; errors?: { message?: string }[] };

    if (!response.ok || !result.success) {
      throw new Error(result.errors?.map((item) => item.message).filter(Boolean).join(", ") || `Cloudflare Email Service responded with ${response.status}.`);
    }

    return prisma.emailMessage.update({
      where: {
        id: email.id,
      },
      data: {
        status: EmailStatus.SENT,
        sentAt: new Date(),
        error: "",
      },
    });
  } catch (error) {
    return prisma.emailMessage.update({
      where: {
        id: email.id,
      },
      data: {
        status: EmailStatus.FAILED,
        error: error instanceof Error ? error.message : "Unknown email send error.",
      },
    });
  }
}

export async function requestInvoiceActivation(userId: string, locale: Locale) {
  const access = await getUserBillingAccess(userId, locale);

  if (!access) {
    return null;
  }

  if (!access.canManageBilling) {
    throw new Error("Billing can be managed only by a party admin.");
  }

  const account = await prisma.billingAccount.update({
    where: {
      id: access.billingAccountId,
    },
    data: {
      method: BillingMethod.INVOICE,
      status: BillingStatus.PENDING_INVOICE_APPROVAL,
      invoiceEmail: access.userEmail,
    },
    include: {
      tenant: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: access.tenantId,
      actor: access.userEmail,
      action: "request_invoice_activation",
      messageCs: `Uživatel ${access.userEmail} požádal o aktivaci účtu na fakturu.`,
      messageEn: `User ${access.userEmail} requested invoice activation.`,
    },
  });

  const subject = `Adclare: žádost o fakturaci - ${access.tenantName}`;
  const safeTenantName = escapeHtml(access.tenantName);
  const safeUserName = escapeHtml(access.userName);
  const safeUserEmail = escapeHtml(access.userEmail);
  const safePrice = escapeHtml(effectiveBillingPrice(account, locale));
  const safeAdminUrl = `${appUrl()}/cs/admin`;
  const bodyText = [
    "Nová žádost o aktivaci účtu na fakturu.",
    "",
    `Organizace: ${access.tenantName}`,
    `Uživatel: ${access.userName} <${access.userEmail}>`,
    `Tarif: ${effectiveBillingPrice(account, locale)}`,
    `Admin: ${appUrl()}/cs/admin`,
  ].join("\n");
  const bodyHtml = `
    <p>Nová žádost o aktivaci účtu na fakturu.</p>
    <ul>
      <li><strong>Organizace:</strong> ${safeTenantName}</li>
      <li><strong>Uživatel:</strong> ${safeUserName} &lt;${safeUserEmail}&gt;</li>
      <li><strong>Tarif:</strong> ${safePrice}</li>
    </ul>
    <p><a href="${safeAdminUrl}">Otevřít administraci</a></p>
  `;

  await deliverBillingNotification(access.tenantId, billingNotificationEmail(), subject, bodyText, bodyHtml);

  return getTenantBillingAccess(access.tenantId, locale);
}
