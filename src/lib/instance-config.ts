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
