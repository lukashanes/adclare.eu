// Decision of 26 November 2026. These periods concern form correspondence,
// not the separately configured customer archive or active customer accounts.
export const FORM_RETENTION_DAYS = 1095;
export const SUSPICIOUS_RETENTION_DAYS = 30;
export const TECHNICAL_RETENTION_DAYS = 90;
export const RATE_LIMIT_RETENTION_DAYS = 30;
export const RETENTION_INTERVAL_MS = 60 * 60 * 1000;

export const TECHNICAL_AUDIT_ACTIONS = [
  "request_login_link", "login_magic_link", "create_workspace", "update_profile", "update_member",
  "create_invitation", "accept_invitation", "retry_invitation_email", "revoke_invitation",
];

export function retentionCutoff(now: Date, days: number) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}
