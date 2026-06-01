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
- PostgreSQL and Prisma 7 data model.
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

Local development requires Node.js 20.19 or newer.

```bash
git clone https://github.com/lukashanes/adclare.eu.git
cd adclare.eu
cp .env.example .env
npm install
docker compose up -d db
npm run db:migrate -- --name init
npm run db:generate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

The `/signup` screen creates the first organization and administrator when `SIGNUP_MODE=first-run` and the database has no workspace yet. Additional users should normally be invited from inside the app.

## Docker

Local development:

```bash
docker compose up -d db
npm run db:migrate
npm run db:generate
npm run dev
```

Standalone Docker deployment:

```bash
cp .env.example .env
printf "SITE_ADDRESS=adclare.example.org\nAPP_URL=https://adclare.example.org\nNEXT_PUBLIC_APP_URL=https://adclare.example.org\n" >> .env
docker compose up -d --build
```

The root Compose file starts PostgreSQL, runs database migrations, starts the app and serves it through Caddy. Set `SITE_ADDRESS`, `APP_URL` and `NEXT_PUBLIC_APP_URL` to your real domain before using it outside local testing.
The example environment keeps Turnstile optional so the first local run works; enable `TURNSTILE_REQUIRED=1` with real Cloudflare keys before public production use.

Production deployment behind an existing reverse proxy can use:

```bash
docker compose -f docker-compose.prod.yml up -d db
docker compose -f docker-compose.prod.yml --profile tools build migrate
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate
docker compose -f docker-compose.prod.yml up -d --build web
```

See [docs/self-hosting.md](docs/self-hosting.md) for the vendor-neutral Docker guide and [docs/deployment-hetzner.md](docs/deployment-hetzner.md) for the current Hetzner deployment notes.

## Configuration

Important environment variables:

- `DATABASE_URL`: PostgreSQL connection string.
- `APP_URL` and `NEXT_PUBLIC_APP_URL`: public URL of the instance. `APP_URL` is used at runtime by server-side links, feeds and metadata.
- `EMAIL_FROM`: sender identity for transactional email.
- `CLOUDFLARE_EMAIL_ACCOUNT_ID` and `CLOUDFLARE_EMAIL_API_TOKEN`: optional Cloudflare Email Service credentials.
- `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`: optional Cloudflare Turnstile protection.
- `OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_ACCESS_KEY_ID`, `OBJECT_STORAGE_SECRET_ACCESS_KEY`: optional S3-compatible asset storage.
- `MAX_AD_ASSET_UPLOAD_MB`: maximum uploaded advert asset size.
- `SIGNUP_MODE`: `first-run` by default; use `open` only when public workspace creation is intentional, or `disabled` for invite-only operation.

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
npm run ci
npm run lint
npm run typecheck
npm run build
npm run test
```

GitHub Actions runs the same app checks plus Docker build checks for pushes, tags and pull requests. Dependabot is enabled for npm dependencies and GitHub Actions updates.

## Current Release

The current release baseline is `v0.1.0`.

See [CHANGELOG.md](CHANGELOG.md) and [docs/release-notes-v0.1.0.md](docs/release-notes-v0.1.0.md).

## Support

Adclare is open source software. If you need help with hosting, installation, migration, TTPA workflow design, integrations or production support, contact:

`support@adclare.eu`

## License

Adclare is licensed under the European Union Public Licence v1.2 (EUPL-1.2). See [LICENSE](LICENSE).
