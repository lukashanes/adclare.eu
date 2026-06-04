# Changelog

All notable changes for Adclare are summarized here.

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
