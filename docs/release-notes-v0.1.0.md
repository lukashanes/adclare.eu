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
- Seed and migration commands updated for the Prisma 7 CLI.
- Runtime-aware instance URLs for login links, invitations, QR/public links, metadata, robots and sitemap.
- Optional Cloudflare Turnstile and Cloudflare Email Service integration.
- S3-compatible object storage support, including Hetzner Object Storage.
- PostgreSQL backup and restore scripts.

## Removed From The Open Source Core

- Paid plans, trial lock, subscription billing and Stripe routes.
- Hosted-service activation gate.
- Hard-coded production domain assumptions in self-hosted runtime links.

## Documentation

- Self-hosting: `docs/self-hosting.md`
- Hetzner deployment notes: `docs/deployment-hetzner.md`
- Security policy: `SECURITY.md`
- License: `LICENSE`

For hosting, installation, migration, TTPA workflow design, integrations or production support, contact `support@adclare.eu`.
