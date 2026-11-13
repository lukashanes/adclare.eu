import { EmailStatus, type EmailMessage } from "@/generated/prisma/client";
import { defaultEmailFrom } from "@/lib/instance-config";
import { prisma } from "@/lib/prisma";

export const cloudflareEmailMissingConfigError =
  "CLOUDFLARE_EMAIL_ACCOUNT_ID and CLOUDFLARE_EMAIL_API_TOKEN are not configured.";

function cloudflareEmailAccountId() {
  return (process.env.CLOUDFLARE_EMAIL_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
}

function cloudflareEmailApiToken() {
  return (process.env.CLOUDFLARE_EMAIL_API_TOKEN || "").trim();
}

export function isCloudflareEmailConfigured() {
  return Boolean(cloudflareEmailAccountId() && cloudflareEmailApiToken());
}

export function escapeEmailHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function deliverEmailMessage(
  email: EmailMessage,
  content?: {
    bodyText: string;
    bodyHtml: string;
  },
) {
  if (!isCloudflareEmailConfigured()) {
    return prisma.emailMessage.update({
      where: { id: email.id },
      data: {
        provider: "cloudflare_email_service",
        status: EmailStatus.PENDING_PROVIDER,
        error: cloudflareEmailMissingConfigError,
      },
    });
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cloudflareEmailAccountId()}/email/sending/send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cloudflareEmailApiToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: defaultEmailFrom(),
          to: email.toEmail,
          subject: email.subject,
          html: content?.bodyHtml ?? email.bodyHtml,
          text: content?.bodyText ?? email.bodyText,
        }),
      },
    );
    const result = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      errors?: Array<{ code?: number; message?: string }>;
      result?: {
        delivered?: string[];
        permanent_bounces?: string[];
        queued?: string[];
      };
    };

    if (!response.ok || !result.success) {
      const message = result.errors?.map((item) => item.message || item.code).filter(Boolean).join(", ");
      throw new Error(message || `Cloudflare Email Service responded with ${response.status}.`);
    }

    if (result.result?.permanent_bounces?.includes(email.toEmail)) {
      throw new Error("Cloudflare Email Service reported a permanent bounce.");
    }

    const delivered = result.result?.delivered ?? [];
    const queued = result.result?.queued ?? [];

    return prisma.emailMessage.update({
      where: { id: email.id },
      data: {
        status: EmailStatus.SENT,
        provider: "cloudflare_email_service",
        providerMessageId: [
          ...delivered.map((item) => `delivered:${item}`),
          ...queued.map((item) => `queued:${item}`),
        ].join(","),
        error: "",
        sentAt: new Date(),
      },
    });
  } catch (error) {
    return prisma.emailMessage.update({
      where: { id: email.id },
      data: {
        status: EmailStatus.FAILED,
        provider: "cloudflare_email_service",
        error: error instanceof Error ? error.message : "Unknown email send error.",
      },
    });
  }
}
