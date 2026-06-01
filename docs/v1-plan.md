# Adclare Open Source Plan

## Core Promise

Adclare is open source software for managing the full political advertising workflow required by the EU Transparency and Targeting of Political Advertising Regulation (TTPA), Regulation (EU) 2024/900.

The application should be installable by a political party, candidate team, agency, civic technology supplier or compliance provider on its own infrastructure. It should not require a paid Adclare account, checkout, trial activation or central hosted-service approval.

## Product Principles

- Self-hosted first.
- Licensed under EUPL-1.2.
- No paywall, subscription or trial lock.
- Clear TTPA language in the product and docs.
- One controlled workflow from advert draft to public transparency notice.
- Strong audit trail and exportability.
- Vendor-neutral deployment, with Hetzner and Docker guides as practical examples.
- Optional commercial support by contacting `support@adclare.eu`.

## Primary Users

- Instance admin: owns and configures the self-hosted installation.
- Organization admin: manages one party, campaign organization or agency workspace.
- Central reviewer: checks advert data and approves publication.
- Local admin: manages one branch, region, area or team.
- Campaign manager: creates advert records and prepares publication.
- Candidate: works with assigned campaign materials.
- External designer: uploads assets and downloads QR/print packages.
- Auditor/legal: reviews history and exports proof packages.

## Required Workflows

1. First-run setup
   - Admin deploys the app with Docker or a VPS.
   - Admin opens `/setup`.
   - Admin creates the first organization and first administrator.
   - Setup locks itself after initialization.

2. Organization structure
   - Organization admin defines branches, regions, areas or local teams.
   - Naming is customizable because parties and agencies use different structures.
   - Users are invited by email and receive only the scope they need.

3. Advert preparation
   - User creates an advert and sets planned publication date.
   - Required TTPA fields are tracked: advertiser, payer, cost, period, distribution area, funding source and targeting information when applicable.
   - Missing data is visible before publication.
   - Advert cannot be published until required data is complete.

4. QR and transparency notice
   - Complete advert data creates a public transparency notice.
   - System generates stable public URL and QR outputs.
   - Designer can download QR/print packages without seeing unrelated organization data.

5. Approval and version lock
   - Reviewer approves, returns to changes or publishes.
   - Published versions are locked.
   - Later changes create a new version and audit entry.

6. Repository and audit
   - Public repository exposes published and archived adverts.
   - JSON endpoint supports reuse on public websites or external archives.
   - Audit export includes metadata, notice data, approval history, files and hashes.

## V1 Modules

- Auth: magic link login and invitation flow.
- Setup: first-run organization and admin creation.
- Tenancy: organization isolation and scoped branch access.
- Ads: records, assets, required TTPA field matrix and publication workflow.
- Notices: public TTPA transparency notice pages.
- QR: SVG/PNG/PDF generation and ZIP packages.
- Approvals: review, comments, return-to-changes, publish and lock.
- Email: invitation outbox and provider integration.
- Audit: append-only log with actor, timestamp, request metadata and event details.
- Public repository: search, filters, ad detail and JSON endpoint.
- Help: self-hosted documentation and TTPA workflow guidance.

## Data Entities

- instance_settings
- tenants
- organization_units
- users
- user_sessions
- login_tokens
- tenant_memberships
- invitations
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
- email_messages
- rate_limit_buckets
- public_repository_settings
- exports

## Removed From Open Source Core

- Paid checkout.
- Trial expiry.
- Invoice approval as access control.
- Paid plans and discounts.
- Central hosted-service customer lifecycle.
- Hosted account activation.

Commercial hosting, custom integrations, migration or support can exist outside the software itself and should point to `support@adclare.eu`.

## Release Goal

The first clean open source release should let someone run:

```bash
git clone https://github.com/lukashanes/adclare.eu.git
cd adclare.eu
cp .env.example .env
docker compose up -d --build
```

Then open `/setup`, create the first organization and use the product without any paid activation step.
