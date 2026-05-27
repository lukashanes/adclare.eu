import { BillingInterval, BillingMethod, BillingPlan, BillingStatus, type BillingAccount } from "@prisma/client";
import Stripe from "stripe";
import { ensureDemoBillingAccount } from "@/lib/admin-demo-db";
import type { Locale } from "@/lib/admin-demo-types";
import { ensureTenantBillingAccount } from "@/lib/billing-access";
import { prisma } from "@/lib/prisma";

const stripeApiVersion = "2026-04-22.dahlia";

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://adclare.eu").replace(/\/$/, "");
}

function stripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() ?? "";
}

function stripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
}

export function isStripeCheckoutConfigured() {
  return Boolean(stripeSecretKey());
}

export function isStripeWebhookConfigured() {
  return Boolean(stripeWebhookSecret());
}

function stripeClient() {
  const secretKey = stripeSecretKey();

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  return new Stripe(secretKey, {
    apiVersion: stripeApiVersion,
  });
}

function billingPlanName(plan: BillingPlan, locale: Locale) {
  const labels: Record<BillingPlan, Record<Locale, string>> = {
    SMALL_PARTY: { cs: "Malá strana", en: "Small party" },
    LARGE_PARTY: { cs: "Velká strana", en: "Large party" },
    CUSTOM: { cs: "Custom řešení", en: "Custom solution" },
  };

  return labels[plan][locale];
}

function billingInterval(interval: BillingInterval) {
  return interval === BillingInterval.YEARLY ? "year" : "month";
}

function billingAmountCents(account: BillingAccount) {
  const amountEur = account.interval === BillingInterval.YEARLY ? account.yearlyPriceEur : account.monthlyPriceEur;

  return Math.max(50, Math.round(amountEur * 100));
}

function stripeId(value: string | { id: string } | null | undefined) {
  if (!value) {
    return "";
  }

  return typeof value === "string" ? value : value.id;
}

function currentPeriodEnd(subscription: Stripe.Subscription) {
  const timestamps = subscription.items.data.map((item) => item.current_period_end).filter((value): value is number => Number.isFinite(value));

  if (timestamps.length === 0) {
    return undefined;
  }

  return new Date(Math.max(...timestamps) * 1000);
}

function billingStatusFromStripe(status: Stripe.Subscription.Status) {
  if (status === "active") {
    return BillingStatus.ACTIVE;
  }

  if (status === "trialing" || status === "incomplete") {
    return BillingStatus.TRIAL;
  }

  if (status === "past_due" || status === "unpaid") {
    return BillingStatus.PAST_DUE;
  }

  if (status === "paused") {
    return BillingStatus.PAUSED;
  }

  return BillingStatus.CANCELLED;
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const subscriptionId = subscription.id;
  const customerId = stripeId(subscription.customer);
  const billingAccountId = subscription.metadata.billingAccountId;
  const tenantId = subscription.metadata.tenantId;

  const where = billingAccountId
    ? { id: billingAccountId }
    : tenantId
      ? { tenantId }
      : {
          stripeSubscriptionId: subscriptionId,
        };

  const updateResult = await prisma.billingAccount.updateMany({
    where,
    data: {
      method: BillingMethod.STRIPE,
      status: billingStatusFromStripe(subscription.status),
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      currentPeriodEndsAt: currentPeriodEnd(subscription),
    },
  });

  if (updateResult.count > 0) {
    return;
  }

  if (!customerId) {
    return;
  }

  await prisma.billingAccount.updateMany({
    where: {
      stripeCustomerId: customerId,
    },
    data: {
      method: BillingMethod.STRIPE,
      status: billingStatusFromStripe(subscription.status),
      stripeSubscriptionId: subscriptionId,
      currentPeriodEndsAt: currentPeriodEnd(subscription),
    },
  });
}

function subscriptionIdFromInvoice(invoice: Stripe.Invoice) {
  const parent = invoice.parent;

  if (parent?.type === "subscription_details") {
    return stripeId(parent.subscription_details?.subscription);
  }

  return stripeId((invoice as unknown as { subscription?: string | { id: string } | null }).subscription);
}

async function createCheckoutSessionForAccount(account: BillingAccount, locale: Locale, successPath: string, cancelPath: string, actor: string) {
  const stripe = stripeClient();

  const metadata = {
    tenantId: account.tenantId,
    billingAccountId: account.id,
    plan: account.plan,
    interval: account.interval,
  };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: account.stripeCustomerId || undefined,
    customer_email: account.stripeCustomerId ? undefined : account.invoiceEmail || undefined,
    billing_address_collection: "auto",
    allow_promotion_codes: true,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: billingAmountCents(account),
          recurring: {
            interval: billingInterval(account.interval),
          },
          product_data: {
            name: `Adclare - ${billingPlanName(account.plan, locale)}`,
            metadata,
          },
        },
      },
    ],
    metadata,
    subscription_data: {
      metadata,
    },
    success_url: `${appUrl()}${successPath}`,
    cancel_url: `${appUrl()}${cancelPath}`,
  });

  if (!session.url) {
    throw new Error("Stripe did not return a Checkout URL.");
  }

  await prisma.auditLog.create({
    data: {
      tenantId: account.tenantId,
      actor,
      action: "create_stripe_checkout",
      messageCs: "Vytvořena Stripe Checkout session pro předplatné.",
      messageEn: "Created Stripe Checkout session for subscription.",
    },
  });

  return {
    url: session.url,
  };
}

export async function createDemoCheckoutSession(locale: Locale) {
  const account = await ensureDemoBillingAccount();

  if (account.method !== BillingMethod.STRIPE) {
    throw new Error("Billing account is set to invoice mode.");
  }

  return createCheckoutSessionForAccount(account, locale, `/${locale}/admin?checkout=success`, `/${locale}/admin?checkout=cancelled`, "demo-admin");
}

export async function createTenantCheckoutSession(tenantId: string, locale: Locale, actor: string) {
  const account = await ensureTenantBillingAccount(tenantId);

  if (account.method !== BillingMethod.STRIPE) {
    await prisma.billingAccount.update({
      where: {
        id: account.id,
      },
      data: {
        method: BillingMethod.STRIPE,
      },
    });
  }

  return createCheckoutSessionForAccount(account, locale, "/app/activate?checkout=success", "/app/activate?checkout=cancelled", actor);
}

export async function createDemoPortalSession(locale: Locale) {
  const stripe = stripeClient();
  const account = await ensureDemoBillingAccount();

  if (!account.stripeCustomerId) {
    throw new Error("Stripe customer ID is missing.");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: account.stripeCustomerId,
    return_url: `${appUrl()}/${locale}/admin?portal=return`,
  });

  return {
    url: session.url,
  };
}

export async function createTenantPortalSession(tenantId: string) {
  const stripe = stripeClient();
  const account = await ensureTenantBillingAccount(tenantId);

  if (!account.stripeCustomerId) {
    throw new Error("Stripe customer ID is missing.");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: account.stripeCustomerId,
    return_url: `${appUrl()}/app/activate?portal=return`,
  });

  return {
    url: session.url,
  };
}

export async function handleStripeWebhook(rawBody: string, signature: string | null) {
  const secret = stripeWebhookSecret();

  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  }

  if (!signature) {
    throw new Error("Stripe signature is missing.");
  }

  const stripe = stripeClient();
  const event = stripe.webhooks.constructEvent(rawBody, signature, secret);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const subscriptionId = stripeId(session.subscription);
    const customerId = stripeId(session.customer);
    const billingAccountId = session.metadata?.billingAccountId;

    if (billingAccountId) {
      await prisma.billingAccount.updateMany({
        where: {
          id: billingAccountId,
        },
        data: {
          method: BillingMethod.STRIPE,
          status: BillingStatus.ACTIVE,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
        },
      });
    }

    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await syncSubscription(subscription);
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    await syncSubscription(event.data.object as Stripe.Subscription);
  }

  if (event.type === "invoice.payment_succeeded" || event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = subscriptionIdFromInvoice(invoice);

    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await syncSubscription(subscription);
    }
  }

  return {
    received: true,
    type: event.type,
  };
}
