-- Remove the legacy paid-SaaS billing model from the open source distribution.
DROP TABLE IF EXISTS "stripe_webhook_events";
DROP TABLE IF EXISTS "billing_accounts";

DROP TYPE IF EXISTS "BillingStatus";
DROP TYPE IF EXISTS "BillingMethod";
DROP TYPE IF EXISTS "BillingInterval";
DROP TYPE IF EXISTS "BillingPlan";
