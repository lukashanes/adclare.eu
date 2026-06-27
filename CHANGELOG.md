# Changelog

All notable changes for Adclare are summarized here.

## v0.2.0-beta.4 - 2026-06-25

Release readiness, audit integrity and browser E2E gate for public beta.

### Included

- Extended the audit log into a general event stream with actor, entity, request context, before/after data and per-tenant hash chain integrity.
- Added audit JSON/CSV exports and manifest integrity data to ad audit packages and workspace archives.
- Added Playwright browser E2E coverage for public pages, login, workspace workflow, invitations, advert publication, repository, imports, exports, audit and role scopes.
- Updated GitHub Actions with PostgreSQL service, database migration, seed data and Playwright Chromium installation before release checks.
- Fixed the release dependency audit gate by overriding vulnerable transitive `hono`, `esbuild` and `js-yaml` versions to patched versions.
- Updated release documentation for the public beta pass-through, production smoke requirements and full environment configuration.

### Notes

- CI now requires a seeded PostgreSQL database for workflow and browser E2E tests.
- Public production launch still requires real environment values for domain, Cloudflare Email Service, Turnstile, storage and backup/restore operations.
- For hosting, installation, migration, TTPA workflow design, integrations or production support, contact `support@adclare.eu`.

## v0.2.0-beta.3 - 2026-06-05

Production configuration cleanup for the public beta.

### Included

- Added `production.env.example` for public self-hosted installs.
- Kept `.env.example` focused on local development so first-run Docker and local npm workflows stay aligned.
- Updated root Docker Compose to use `DOCKER_DATABASE_URL` inside containers while local `DATABASE_URL` can still point to localhost.
- Updated README, self-hosting, Hetzner and Cloudflare documentation to match production preflight requirements.
- Extended launch smoke checks to catch mismatched local and production database templates.

### Notes

- Public instances should use `production.env.example`, configure outbound email, enable Turnstile and run the launch preflight before inviting real users.
- For hosting, installation, migration, TTPA workflow design, integrations or production support, contact `support@adclare.eu`.

## v0.2.0-beta.2 - 2026-06-05

Security hardening release for the public beta.

### Included

- Signup responses no longer expose whether an e-mail already has access or which workspace it belongs to.
- Invitation links are now stored as hashes instead of plaintext tokens.
- Existing pending invitation links are invalidated by the migration and should be sent again.
- Uploads now verify file type from the file content and no longer allow user-uploaded SVG assets.
- Upload, asset download, QR package, audit export and workspace archive endpoints now have rate limits.
- Rate limiting now uses an atomic PostgreSQL upsert to avoid concurrent request bypasses.
- Logout now checks same-origin requests.
- Production CSP no longer allows `unsafe-eval` or local development websocket endpoints.
- Audit logs are protected at database level against update and delete operations.

### Notes

- The audit log trigger makes `audit_logs` append-only. Maintenance tasks that intentionally delete tenant data must plan for that trigger.
- For hosting, installation, migration, TTPA workflow design, integrations or production support, contact `support@adclare.eu`.

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
