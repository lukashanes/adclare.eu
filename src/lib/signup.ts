import { randomBytes } from "node:crypto";
import { BillingInterval, BillingMethod, BillingPlan, BillingStatus, MembershipStatus, UserRole } from "@prisma/client";
import { requestAppLoginLink } from "@/lib/app-auth";
import { prisma } from "@/lib/prisma";

export type SignupPlan = "small" | "large";

export type SignupInput = {
  organizationName: string;
  name: string;
  email: string;
  plan: SignupPlan;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function assertEmail(value: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error("Invalid email.");
  }
}

function slugBase(value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || `strana-${randomBytes(3).toString("hex")}`;
}

async function uniqueTenantSlug(value: string) {
  const base = slugBase(value);

  for (let index = 0; index < 20; index += 1) {
    const candidate = index === 0 ? base : `${base}-${index + 1}`;
    const existing = await prisma.tenant.findUnique({
      where: {
        slug: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return candidate;
    }
  }

  return `${base}-${randomBytes(4).toString("hex")}`;
}

function planConfig(plan: SignupPlan) {
  if (plan === "small") {
    return {
      plan: BillingPlan.SMALL_PARTY,
      monthlyPriceEur: 9,
      yearlyPriceEur: 99,
      discountPercent: 0,
      noteCs: "14 dní bez platby. Malá strana: 1 kampaň ročně, 10 přístupů.",
      noteEn: "14-day trial. Small party: 1 campaign per year, 10 seats.",
    };
  }

  return {
    plan: BillingPlan.LARGE_PARTY,
    monthlyPriceEur: 99,
    yearlyPriceEur: 999,
    discountPercent: 50,
    noteCs: "14 dní bez platby. Zaváděcí cena pro velkou stranu.",
    noteEn: "14-day trial. Launch price for a large party.",
  };
}

export async function createSignupTrial(input: SignupInput) {
  const organizationName = input.organizationName.trim();
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const plan = input.plan === "small" ? "small" : "large";

  if (organizationName.length < 2) {
    throw new Error("Organization name is required.");
  }

  if (name.length < 2) {
    throw new Error("User name is required.");
  }

  assertEmail(email);

  const existingMembership = await prisma.tenantMembership.findFirst({
    where: {
      user: {
        email,
      },
      status: MembershipStatus.ACTIVE,
    },
    include: {
      tenant: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (existingMembership) {
    await requestAppLoginLink(email);
    return {
      created: false,
      tenantSlug: existingMembership.tenant.slug,
      email,
    };
  }

  const slug = await uniqueTenantSlug(organizationName);
  const config = planConfig(plan);
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const tenant = await prisma.$transaction(async (tx) => {
    const createdTenant = await tx.tenant.create({
      data: {
        slug,
        nameCs: organizationName,
        nameEn: organizationName,
      },
    });

    const user = await tx.user.upsert({
      where: {
        email,
      },
      update: {
        name,
      },
      create: {
        email,
        name,
      },
    });

    await tx.organizationUnit.create({
      data: {
        tenantId: createdTenant.id,
        slug: "centrala",
        kind: "central",
        nameCs: "Centrála",
        nameEn: "Headquarters",
      },
    });

    await tx.campaign.create({
      data: {
        tenantId: createdTenant.id,
        slug: "start-2026",
        nameCs: "První kampaň",
        nameEn: "First campaign",
        election: "Volby 2026",
        startsAt: new Date("2026-01-01T00:00:00.000Z"),
        endsAt: new Date("2026-12-31T23:59:59.000Z"),
      },
    });

    await tx.tenantMembership.create({
      data: {
        tenantId: createdTenant.id,
        userId: user.id,
        role: UserRole.PARTY_ADMIN,
        status: MembershipStatus.ACTIVE,
      },
    });

    await tx.billingAccount.create({
      data: {
        tenantId: createdTenant.id,
        plan: config.plan,
        interval: BillingInterval.YEARLY,
        method: BillingMethod.STRIPE,
        status: BillingStatus.TRIAL,
        discountPercent: config.discountPercent,
        monthlyPriceEur: config.monthlyPriceEur,
        yearlyPriceEur: config.yearlyPriceEur,
        invoiceEmail: email,
        trialEndsAt,
        noteCs: config.noteCs,
        noteEn: config.noteEn,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: createdTenant.id,
        actor: email,
        action: "create_trial_tenant",
        messageCs: `Vytvořen zkušební účet pro ${organizationName}.`,
        messageEn: `Created trial account for ${organizationName}.`,
      },
    });

    return createdTenant;
  });

  await requestAppLoginLink(email);

  return {
    created: true,
    tenantSlug: tenant.slug,
    email,
  };
}
