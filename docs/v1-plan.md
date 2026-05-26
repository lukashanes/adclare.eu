# Adclare V1 Plan

## Core Promise

Adclare gives political parties one place to control political advertising compliance under Regulation (EU) 2024/900. Headquarters buys access, creates branches and invites local teams. Branches and external designers do the daily work themselves. The system checks required data against the planned publication date and keeps the audit trail.

## Primary Users

- Super admin: manages SaaS customers, plans, discounts, invoice approvals and tenant status.
- Party admin: owns a paying party tenant, billing, branding, rules and organization structure.
- Central reviewer: approves templates, ads and missing-data exceptions.
- Local admin: manages one branch/region/area and its campaigns.
- Campaign manager: creates ads, uploads assets and prepares publication.
- Candidate: sees and updates their own materials.
- External designer: uploads files and downloads QR/print packages for assigned campaigns.
- Auditor/legal: reviews history and exports proof packages.

## Required Workflows

1. Tenant signup
   - User chooses Stripe subscription or invoice request.
   - Stripe payment activates tenant automatically.
   - Invoice request creates `pending_manual_approval`.
   - Super admin can set plan, limits, discount and activation date.

2. Branch onboarding
   - Party admin defines organization unit names: regions, branches, areas, local teams.
   - Party admin imports or creates units.
   - Each unit receives an email invite and manages only its own scope.

3. Ad preparation
   - Local user creates ad and sets planned publication date.
   - Required fields depend on medium: online/offline, targeting/no targeting, print/video/social/outdoor.
   - Missing fields show orange while there is time and red near or after deadline.
   - Red ads cannot be marked ready or published.

4. QR and notice generation
   - Complete ad data generates public transparency notice.
   - System creates short URL, QR SVG/PNG/PDF, A4 sheet, print label and ZIP export.
   - External designer can download only the assigned QR and assets.

5. Approval and locking
   - Party rules decide whether central review is required.
   - Reviewer approves, returns to branch or rejects.
   - Published versions are locked.
   - Later changes create a new version and audit entry.

6. Repository and audit
   - Public repository exposes published transparency pages and optional JSON.
   - Complaint/report form is protected by Turnstile.
   - Audit export includes ad files, hashes, notice versions, approvals, costs, QR outputs and history.

## V1 Modules

- Auth: magic link, 2FA for admins, invitation flow.
- Tenancy: tenant isolation, organization tree, custom labels.
- Billing: Stripe subscriptions, invoice approval, coupons/discounts, manual activation.
- Ads: records, assets, required field matrix, deadline status.
- Notices: EU 2024/900 transparency notice versions.
- QR: SVG-first generation, PNG/PDF exports.
- Approvals: configurable workflow, comments, locks.
- Email: invite outbox is implemented; reminders, red-status alerts, approvals and billing templates follow.
- Audit: append-only log with actor, diff, timestamp and reason.
- Public repo: search, filters, ad details, JSON endpoint.

## Pricing

- Small party: 9 EUR/month or 99 EUR/year, 1 election campaign per year, 10 user seats.
- Large party: regular 199 EUR/month or 1990 EUR/year, launch offer 99 EUR/month or 999 EUR/year, unlimited users, campaigns and adverts.
- Custom: contact-based pricing for custom hosting, integrations, SLA, imports and special billing.

Large-party plan includes repository access, archive for the legally required period and exports to external storage, websites or internal systems.

## Infrastructure

- Hetzner VPS runs Next.js, API, background workers, PostgreSQL and Redis.
- Hetzner Object Storage stores uploaded and generated files.
- Cloudflare handles DNS, proxy, TLS, WAF, cache, Turnstile and email.
- Stripe handles subscriptions, invoices, hosted invoice pages, customer portal and discounts.

## Data Entities

- tenants
- billing_accounts
- email_messages
- subscriptions
- invoices
- discounts
- users
- roles
- organization_units
- organization_unit_types
- campaigns
- candidates
- tags
- ads
- ad_assets
- transparency_notices
- notice_versions
- qr_codes
- approvals
- audit_logs
- email_templates
- email_events
- public_repository_settings
- exports
