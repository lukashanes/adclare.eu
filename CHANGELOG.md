# Changelog

All notable changes for Adclare are summarized here.

## Unreleased

### Upgrade notes

- Geist Sans and Geist Mono are bundled from the pinned `geist` npm package;
  builds no longer fetch fonts from Google. The lockfile retains optional
  binaries for Linux glibc and musl, with regression checks in the test suite.
- Public submissions now survive missing, invalid or unavailable Turnstile:
  unverified requests are archived and notified to SUPPORT_EMAIL with
  `[Neověřeno]`, without attachments or visitor email. A filled `adclare_guard`
  trap is archived as suspicious without email. Unverified/suspicious access
  requests remain held for review; they do not automatically change accounts.
- Daily email budgets are site-wide: 200 team emails including one limit alert,
  at most 20 unverified notifications, and 100 verified visitor emails (including
  authenticated invitation sends/retries). Reservations use a PostgreSQL lock
  and the Europe/Prague calendar day. Failed attempts consume their slot.
- PR #22 implements the form decisions of 26 November; Docker and database
  integration still require verification. See `docs/overeni-pr-22-2026-11-26.md`.
- Apply migrations `20261125120000_auth_log_retention` and
  `20261126220000_public_submissions` before starting the new
  `retention` service. With `docker-compose.prod.yml`, run the migrator tool
  explicitly before bringing up web and retention; that Compose file does not
  order them after migrations. The worker starts cleanup immediately and then
  hourly. See `docs/retence-osobnich-udaju.md` for the three-year correspondence
  policy and the separate customer archive.
- Ingress must overwrite `X-Real-IP` with a verified client address and be the
  only path to the application. Behind another proxy, restore client addresses
  only from trusted proxy ranges; see `docs/self-hosting.md`. All public API
  routes share 20 requests per 10 seconds per IP, including invalid requests
  and public GET routes. Missing/invalid IPs share an `unknown` bucket.
  The existing login email
  recipient limit and cooldown remain in place.
- Turnstile validates the response hostname against `TURNSTILE_ALLOWED_HOSTNAMES`
  or the hostname from `APP_URL` (falling back to `NEXT_PUBLIC_APP_URL`). Set the
  public URL correctly and list any additional www/apex or staging hostnames.
  Invalid configuration archives submissions as unverified. Run
  `npm run launch:preflight`; the offline check cannot inspect ingress headers.
- XLSX imports reject more than 500 data rows with an explicit error instead of
  silently importing a prefix. Empty formatted rows do not consume the limit.

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
