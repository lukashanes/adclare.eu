# Roadmap

Adclare is open source software for the advert evidence, approval, QR notice and audit workflow required by the EU Transparency and Targeting of Political Advertising Regulation (TTPA), Regulation (EU) 2024/900.

The project is self-hosted first. Political parties, candidate teams, agencies, civic technology suppliers and compliance providers should be able to install it on their own infrastructure, adapt it and run it without central Adclare approval.

## Product Principles

- Self-hosted first.
- Licensed under EUPL-1.2.
- No hosted access gate in the open source core.
- Clear TTPA language in the product and documentation.
- One controlled workflow from advert draft to public transparency notice.
- Strong audit trail and exportability.
- Vendor-neutral deployment, with Docker and Hetzner guides as practical examples.
- Optional commercial support through `support@adclare.eu`.

## Current Baseline

- First-run setup through `/signup`.
- Multi-organization workspace model.
- Custom organization units for branches, regions, areas or local teams.
- Magic-link login and email invitation flow.
- Scoped roles for administrators, reviewers, campaign teams, candidates, designers and auditors.
- Advert records with TTPA-required data checks before publication.
- Uploads for advert files and supporting assets.
- Excel import for existing spreadsheet advert registers.
- Public transparency notice URLs with unguessable tokens.
- QR package download and audit package download.
- Export manifests with SHA-256 file hashes for QR packages, ad audit packages and workspace control archives.
- Approval, publish, archive and version lock workflow.
- Public repository for published and archived adverts.
- Append-only audit log with tenant hash chain verification.
- Local file storage by default, with S3-compatible object storage integration when configured.
- Cloudflare Turnstile and Cloudflare Email Service integrations when configured.
- Docker Compose deployment and PostgreSQL backup/restore scripts.
- Full configuration reference for local development, production Docker, Cloudflare, storage and launch checks.
- Automated browser workflow tests for the release-critical flow.

## Primary Users

- Instance administrator: installs and configures a self-hosted instance.
- Organization administrator: manages one party, campaign organization or agency workspace.
- Central reviewer: checks advert data and approves publication.
- Local administrator: manages one branch, region, area or team.
- Campaign manager: creates advert records and prepares publication.
- Candidate: works with assigned campaign materials.
- External designer: uploads assets and downloads QR/print packages.
- Auditor or legal reviewer: reviews history and exports proof packages.

## Next Improvements

- Richer public repository filters and export formats.
- More configurable TTPA field presets for different election contexts.
- Better object storage lifecycle documentation.
- Optional outbound email queue worker for high-volume installations.
- More granular permission editor for large organizations.
- Import mapping presets for organization-specific spreadsheet templates.
- Upgrade guide for installations that move from the baseline migration to later versions.

## Current Data Model

The current schema contains these Prisma models:

- `Tenant`
- `Campaign`
- `OrganizationUnit`
- `User`
- `LoginToken`
- `UserSession`
- `TenantMembership`
- `Invitation`
- `Ad`
- `AdVersion`
- `Approval`
- `AdAsset`
- `AuditLog`
- `AuditChain`
- `EmailMessage`
- `RateLimitBucket`

Future schema changes should be added through normal Prisma migrations and documented in release notes.

## Outside The Open Source Core

These services can exist around the software, but should not be required by the open source core:

- Managed hosting.
- Custom migrations.
- Tailored integrations.
- Service-level agreements.
- Organization-specific training.
- Managed infrastructure support.

Commercial hosting, migration help, integrations or production support can point to `support@adclare.eu`.
