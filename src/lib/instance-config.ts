function configuredAppUrl() {
  return (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
}

export function publicAppUrl() {
  return configuredAppUrl() || "http://localhost:3000";
}

export function defaultEmailFrom() {
  const configured = (process.env.EMAIL_FROM || "").trim();

  if (configured) {
    return configured;
  }

  try {
    const hostname = new URL(publicAppUrl()).hostname;
    return `Adclare <noreply@${hostname}>`;
  } catch {
    return "Adclare <noreply@localhost>";
  }
}

export function logPendingEmailLink(kind: "Login" | "Invitation", toEmail: string, url: string) {
  if (process.env.NODE_ENV === "production" || process.env.ADCLARE_LOG_EMAIL_LINKS === "0") {
    return;
  }

  console.info(`[adclare] ${kind} link for ${toEmail}: ${url}`);
}
