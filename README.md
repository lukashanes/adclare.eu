# Adclare

Adclare is an open source, self-hosted application for managing the full workflow of political advertising records under the EU Transparency and Targeting of Political Advertising Regulation (TTPA), Regulation (EU) 2024/900.

It helps political parties, candidates, agencies and compliance teams keep one controlled record for each advert: required data, files, QR labels, transparency notices, approvals, public repository entries and audit exports.

Adclare is licensed under the European Union Public Licence v1.2 (EUPL-1.2).

## What Adclare Solves

Political advertising work often happens across email threads, spreadsheets, graphics folders and last-minute approval messages. TTPA adds a clear need to know who paid for an advert, who ordered it, when and where it is published, what it cost, and whether targeting was used.

Adclare gives teams one place to:

- record every political advert,
- track mandatory TTPA fields before publication,
- invite branches, candidates, designers and reviewers,
- upload advert files and supporting assets,
- generate QR codes and public transparency notices,
- approve, publish and lock advert versions,
- expose a public repository of published adverts,
- export audit packages for internal or external review.

## Current Capabilities

- Next.js App Router with TypeScript.
- PostgreSQL and Prisma data model.
- Multi-organization and branch-scoped access.
- Magic-link authentication and invitation flow.
- Role-based workspace for party admins, reviewers, local teams, candidates, designers and auditors.
- Advert records with online/offline channel, publication date, payer, supplier, cost, funding source, distribution area, language and targeting data.
- Missing-data workflow before publication.
- Review, approval, return-to-changes, publish and archive states.
- Public QR/transparency URLs with stable unguessable tokens.
- Public repository for published/archived adverts with JSON endpoint.
- Ad asset upload to S3-compatible object storage.
- QR package and audit package downloads.
- Append-only audit log.
- Turnstile validation for public forms when configured.
- Production health endpoint at `/api/health`.
- Backup and restore scripts for PostgreSQL.

## Quick Start

```bash
git clone https://github.com/lukashanes/adclare.eu.git
cd adclare.eu
cp .env.example .env
npm install
docker compose up -d db
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

The current development seed creates a demo organization and demo users so the app can be explored immediately. The planned self-hosted first-run flow will replace this with a `/setup` screen that creates the first organization and administrator.

## Docker

Local development:

```bash
docker compose up -d db
npm run db:migrate
npm run dev
```

Standalone Docker deployment:

```bash
cp .env.example .env
docker compose up -d --build
```

Production deployment behind an existing reverse proxy can use:

```bash
docker compose -f docker-compose.prod.yml up -d db
docker compose -f docker-compose.prod.yml --profile tools build migrate
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate
docker compose -f docker-compose.prod.yml up -d --build web
```

See [docs/deployment-hetzner.md](docs/deployment-hetzner.md) for the current Hetzner deployment notes. A vendor-neutral self-hosting guide is being split out into `docs/self-hosting.md`.

## Configuration

Important environment variables:

- `DATABASE_URL`: PostgreSQL connection string.
- `NEXT_PUBLIC_APP_URL`: public URL of the instance.
- `EMAIL_FROM`: sender identity for transactional email.
- `CLOUDFLARE_EMAIL_ACCOUNT_ID` and `CLOUDFLARE_EMAIL_API_TOKEN`: optional Cloudflare Email Service credentials.
- `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`: optional Cloudflare Turnstile protection.
- `OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_ACCESS_KEY_ID`, `OBJECT_STORAGE_SECRET_ACCESS_KEY`: optional S3-compatible asset storage.
- `MAX_AD_ASSET_UPLOAD_MB`: maximum uploaded advert asset size.

Stripe, subscriptions, invoice approval and trial lock are not part of the default open source product.

## Object Storage Check

After setting object storage credentials:

```bash
npm run storage:check
```

On production through Docker:

```bash
docker compose -f docker-compose.prod.yml --profile tools build storage-check
docker compose -f docker-compose.prod.yml --profile tools run --rm storage-check
```

## Backups

Create a PostgreSQL backup:

```bash
APP_DIR=/srv/apps/adclare BACKUP_DIR=/srv/backups/adclare/postgres scripts/backup-postgres.sh
```

Restore is intentionally guarded:

```bash
CONFIRM_RESTORE=adclare-prod RESTORE_FILE=/srv/backups/adclare/postgres/adclare-YYYYMMDDTHHMMSSZ.dump scripts/restore-postgres.sh
```

## Development Checks

```bash
npm run lint
npm run build
npm run test
```

## Support

Adclare is open source software. If you need help with hosting, installation, migration, TTPA workflow design, integrations or production support, contact:

`support@adclare.eu`

## License

Adclare is licensed under the European Union Public Licence v1.2 (EUPL-1.2). See [LICENSE](LICENSE).
