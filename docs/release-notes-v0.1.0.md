# Adclare v0.1.0

Initial current open-source release of Adclare.

Adclare is self-hosted software for managing political advert records and workflow under the EU Transparency and Targeting of Political Advertising Regulation (TTPA), Regulation (EU) 2024/900.

## Highlights

- EUPL-1.2 licensed open-source release.
- First-run setup through `/signup`.
- Political advert records with required TTPA fields, assets, QR labels, transparency notices, approval workflow and audit exports.
- Public transparency pages and repository endpoints with unguessable advert tokens.
- Branch-scoped roles for administrators, reviewers, local teams, candidates, designers and auditors.
- Docker Compose deployment for self-hosted instances.
- Prisma 7.8 runtime with generated TypeScript client output, Postgres driver adapter and `prisma.config.ts` datasource configuration.
- Clean Prisma baseline migration and seed commands for the Prisma 7 CLI.
- GitHub Actions CI for linting, type checks, Prisma validation, audit, production build and Docker image checks.
- Dependabot for npm and GitHub Actions updates.
- Runtime-aware instance URLs for login links, invitations, QR/public links, metadata, robots and sitemap.
- Optional Cloudflare Turnstile and Cloudflare Email Service integration.
- Generic Cloudflare and Nginx self-hosting examples without instance-specific operational data.
- Public roadmap in `docs/roadmap.md`.
- Local file storage for uploaded advert assets, with optional S3-compatible storage including Hetzner Object Storage.
- PostgreSQL backup and restore scripts.

## Documentation

- Self-hosting: `docs/self-hosting.md`
- Hetzner deployment notes: `docs/deployment-hetzner.md`
- Roadmap: `docs/roadmap.md`
- Security policy: `SECURITY.md`
- License: `LICENSE`

For hosting, installation, migration, TTPA workflow design, integrations or production support, contact `support@adclare.eu`.
