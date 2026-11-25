-- Authentication diagnostics expire after 90 days. Business audit events
-- remain append-only. Updates and early deletion stay forbidden.
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE'
    AND OLD.action IN (
      'request_login_link', 'login_magic_link', 'create_workspace', 'update_profile', 'update_member',
      'create_invitation', 'accept_invitation', 'retry_invitation_email', 'revoke_invitation'
    )
    AND OLD."createdAt" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - INTERVAL '90 days'
  THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'audit_logs are append-only';
END;
$$ LANGUAGE plpgsql;
