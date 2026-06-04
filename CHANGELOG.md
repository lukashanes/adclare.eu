# Changelog

All notable changes for Adclare are summarized here.

## v0.2.0-beta.1 - 2026-06-04

Public beta release for teams running Adclare on their own infrastructure.

### Included

- Removed the old demo admin UI/API from the production codebase.
- Renamed the shared application data layer from `admin-demo-*` to `workspace-*`.
- Added `npm run launch:preflight` for production launch readiness checks.
- Added a Docker Compose `preflight` tool for own deployments.
- Extended Docker checks to build the migrator, storage-check, preflight and web images.
- Updated installation and Hetzner documentation with preflight steps before inviting real users.
- Updated legal copy for open source operation, including clearer responsibility boundaries for instances not operated by Aenze s.r.o.
- Updated the public website copy to mark Adclare as a public beta open source tool for TTPA workflows.

### Notes

- This beta is ready for own infrastructure. It does not include a paywall or paid subscription flow.
- Real production launch still requires secrets and operations for the selected instance: Cloudflare Email Service, Turnstile, storage credentials, backup cron and a tested restore.
- For hosting, installation, migration, TTPA workflow design, integrations or production support, contact `support@adclare.eu`.

## v0.1.0 - 2026-06-01

Initial current open-source release of Adclare.

### Included

- Open source self-hosted Adclare under EUPL-1.2.
- TTPA workflow for political advert records, required data, QR labels, transparency notices, approval and audit export.
- First-run workspace creation through `/signup`, with later users invited from inside the app.
- Multi-organization and branch-scoped roles for administrators, reviewers, local teams, candidates, designers and auditors.
- Public transparency pages and public repository endpoints using unguessable advert tokens.
- S3-compatible advert asset upload, including Hetzner Object Storage support.
- Local file storage for uploaded advert assets without mandatory S3 configuration.
- Excel import for existing advert registers.
- QR package and audit package downloads.
- Workspace archive export with verifiable manifests.
- Docker and Docker Compose setup for self-hosted deployment.
- Prisma 7.8 runtime with the generated TypeScript client, explicit client output, Postgres driver adapter and `prisma.config.ts` datasource configuration.
- Clean Prisma baseline migration and seed workflow for the Prisma 7 CLI.
- GitHub Actions CI for app checks, dependency audit and Docker image builds.
- Dependabot configuration for npm and GitHub Actions updates.
- Runtime-aware `APP_URL` / `NEXT_PUBLIC_APP_URL` handling for links, metadata, robots and sitemap.
- Cloudflare Turnstile support for public forms when configured.
- Cloudflare Email Service integration for login links and invitations when configured.
- Generic Cloudflare and Nginx self-hosting examples without instance-specific operational data.
- Public roadmap documenting the current baseline and next improvements.
- PostgreSQL backup and restore scripts.
- Post-transaction relation loading in advert workflows to avoid PostgreSQL client concurrency warnings.
- Legal, privacy, DPA, subprocessors and security pages for the public website.

### Notes

- This is the single current release baseline for the repository.
- For hosting, installation, migration, TTPA workflow design, integrations or production support, contact `support@adclare.eu`.
