# Adclare

Adclare is an open source, self-hosted application for managing the full workflow of political advertising records under the EU Transparency and Targeting of Political Advertising Regulation (TTPA), Regulation (EU) 2024/900.

It helps political parties, candidates, agencies and compliance teams keep one controlled record for each advert: required data, files, QR labels, transparency notices, approvals, public repository entries and audit exports.

Adclare is licensed under the European Union Public Licence v1.2 (EUPL-1.2).

## Official Repository and Releases

The official Adclare source is:

https://github.com/lukashanes/adclare.eu

Collaborators and contributors can work through branches, forks and pull requests. The main downloadable version is always the version released from `lukashanes/adclare.eu` by the repository owner or maintainers explicitly authorized by the owner.

Official releases are published as `v*` tags and GitHub Releases in this repository. Forks may publish their own builds, but they are not official Adclare releases unless explicitly marked by the repository owner.

See [GOVERNANCE.md](GOVERNANCE.md) for the contribution and release model.

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
- Ad asset upload to local disk or S3-compatible object storage.
- Excel import for existing advert registers.
- QR package and audit package downloads.
- Export manifests with SHA-256 hashes for QR packages, ad audit packages and workspace archives.
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
npm ci
docker compose up -d db
npm run db:migrate
npm run db:generate
npm run dev
```

Open `http://localhost:3000`.

The `/signup` screen creates the first organization and installation administrator when `SIGNUP_MODE=first-run` and the database has no workspace yet. Additional users should normally be invited from inside the app.

When Cloudflare Email Service is not configured, local non-production runs print magic login links and invitation links to the server console. Production runs do not print those links; configure outbound email before using a public instance.

Optional demo data for development:

```bash
npm run db:seed
```

Run the seed only when you want sample campaigns, users and adverts. It creates a demo workspace, so `/signup` is no longer the first workspace flow on that database.

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

Before inviting real users on a public instance, run:

```bash
npm run launch:preflight
```

Or through Docker:

```bash
docker compose -f docker-compose.prod.yml --profile tools build preflight
docker compose -f docker-compose.prod.yml --profile tools run --rm preflight
```

See [docs/self-hosting.md](docs/self-hosting.md) for the vendor-neutral Docker guide, [docs/deployment-hetzner.md](docs/deployment-hetzner.md) for Hetzner deployment notes, [docs/release-checklist.md](docs/release-checklist.md) for release verification and [docs/roadmap.md](docs/roadmap.md) for the current product roadmap.

## Configuration

Important environment variables:

- `DATABASE_URL`: PostgreSQL connection string.
- `APP_URL` and `NEXT_PUBLIC_APP_URL`: public URL of the instance. `APP_URL` is used at runtime by server-side links, feeds and metadata.
- `EMAIL_FROM`: sender identity for transactional email.
- `CLOUDFLARE_EMAIL_ACCOUNT_ID` and `CLOUDFLARE_EMAIL_API_TOKEN`: optional Cloudflare Email Service credentials.
- `ADCLARE_LOG_EMAIL_LINKS`: local development fallback for magic links; set to `0` to disable console output.
- `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`: optional Cloudflare Turnstile protection.
- `ADCLARE_STORAGE_DRIVER`: `local` by default; set to `s3` for Hetzner Object Storage or another S3-compatible bucket.
- `ADCLARE_LOCAL_STORAGE_DIR`: local uploaded asset directory; defaults to `.data/uploads` in local development and `/data/uploads` in Docker.
- `OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_ACCESS_KEY_ID`, `OBJECT_STORAGE_SECRET_ACCESS_KEY`: optional S3-compatible asset storage.
- `MAX_AD_ASSET_UPLOAD_MB`: maximum uploaded advert asset size.
- `SIGNUP_MODE`: `first-run` by default; use `open` only when public workspace creation is intentional, or `disabled` for invite-only operation.
- `npm run launch:preflight`: validates the production launch configuration before real users are invited.

## File Storage

Local file storage works without external secrets. In Docker Compose, uploaded assets are persisted in the `asset_data` volume mounted at `/data/uploads`.

For Hetzner Object Storage or another S3-compatible bucket, set:

```bash
ADCLARE_STORAGE_DRIVER=s3
OBJECT_STORAGE_ENDPOINT=https://fsn1.your-objectstorage.com
OBJECT_STORAGE_REGION=fsn1
OBJECT_STORAGE_BUCKET=adclare-assets
OBJECT_STORAGE_ACCESS_KEY_ID=...
OBJECT_STORAGE_SECRET_ACCESS_KEY=...
```

Then verify the bucket:

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

The current public beta release is `v0.2.0-beta.2`.

See [CHANGELOG.md](CHANGELOG.md) and [docs/release-notes-v0.2.0-beta.2.md](docs/release-notes-v0.2.0-beta.2.md).

## Support

Adclare is open source software. If you need help with hosting, installation, migration, TTPA workflow design, integrations or production support, contact:

`support@adclare.eu`

## License

Adclare is licensed under the European Union Public Licence v1.2 (EUPL-1.2). See [LICENSE](LICENSE).
