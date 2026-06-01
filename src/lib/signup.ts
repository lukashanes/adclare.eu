import { randomBytes } from "node:crypto";
import { MembershipStatus, UserRole } from "@prisma/client";
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

export async function createSignupWorkspace(input: SignupInput) {
  const organizationName = input.organizationName.trim();
  const name = input.name.trim();
  const email = normalizeEmail(input.email);

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

    await tx.auditLog.create({
      data: {
        tenantId: createdTenant.id,
        actor: email,
        action: "create_workspace",
        messageCs: `Vytvořen pracovní prostor pro ${organizationName}.`,
        messageEn: `Created workspace for ${organizationName}.`,
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
