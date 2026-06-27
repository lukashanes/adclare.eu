# Adclare Configuration Reference

This page describes the environment variables and setup choices for Adclare `v0.2.0-beta.4`.

Use this together with:

- [README.md](../README.md) for the project overview.
- [docs/self-hosting.md](self-hosting.md) for Docker setup.
- [docs/deployment-hetzner.md](deployment-hetzner.md) for a Hetzner VPS example.
- [docs/cloudflare-setup.md](cloudflare-setup.md) for Cloudflare DNS, Turnstile and email notes.
- [docs/release-checklist.md](release-checklist.md) for release and launch checks.

## Which Env File To Use

Use `.env.example` for local development.

Use `production.env.example` for a public instance.

Do not commit a filled `.env` file. It contains database passwords, email tokens, Turnstile secrets and object storage keys.

## Required For Local Development

Minimum local setup:

```bash
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=postgresql://adclare:adclare_dev_password@localhost:5433/adclare_dev?schema=public
DOCKER_DATABASE_URL=postgresql://adclare:adclare_dev_password@db:5432/adclare_dev?schema=public
POSTGRES_DB=adclare_dev
POSTGRES_USER=adclare
POSTGRES_PASSWORD=adclare_dev_password
SIGNUP_MODE=first-run
TURNSTILE_REQUIRED=0
ADCLARE_STORAGE_DRIVER=local
ADCLARE_LOCAL_STORAGE_DIR=.data/uploads
ADCLARE_LOG_EMAIL_LINKS=1
```

Local login and invitation links can be printed to the server console when Cloudflare Email Service is not configured. This only works outside production.

## Required For Public Production

Before inviting real users, a public instance should have:

```bash
APP_URL=https://adclare.example.org
NEXT_PUBLIC_APP_URL=https://adclare.example.org
POSTGRES_PASSWORD=replace_with_generated_database_password
DATABASE_URL=postgresql://adclare:replace_with_generated_database_password@db:5432/adclare_prod?schema=public
EMAIL_FROM=Adclare <noreply@adclare.example.org>
CLOUDFLARE_EMAIL_ACCOUNT_ID=replace_with_cloudflare_account_id
CLOUDFLARE_EMAIL_API_TOKEN=replace_with_cloudflare_email_service_token
TURNSTILE_REQUIRED=1
TURNSTILE_SITE_KEY=replace_with_cloudflare_turnstile_site_key
NEXT_PUBLIC_TURNSTILE_SITE_KEY=replace_with_cloudflare_turnstile_site_key
TURNSTILE_SECRET_KEY=replace_with_cloudflare_turnstile_secret
TURNSTILE_ALLOWED_HOSTNAMES=adclare.example.org,www.adclare.example.org
SIGNUP_MODE=first-run
NEXT_PUBLIC_SHOW_DEMO_REPO=0
```

Run:

```bash
npm run launch:preflight
```

The preflight must be green before the instance is used for real campaign data.

## URLs

| Variable | Required | Description |
| --- | --- | --- |
| `APP_URL` | Production yes | Public origin used by server-side links, emails, robots, sitemap and metadata. |
| `NEXT_PUBLIC_APP_URL` | Production yes | Public origin exposed to client code. Use the same origin as `APP_URL`. |
| `SITE_ADDRESS` | Root Docker Compose | Domain used by Caddy in `docker-compose.yml`. |
| `NEXT_PUBLIC_SHOW_DEMO_REPO` | Recommended | Keep `0` in production. |
| `SUPPORT_EMAIL` | Optional | Public support contact shown by the website. Defaults to `support@adclare.eu` where used. |

Production URLs must use HTTPS and the real domain.

## Database

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by the app and Prisma. |
| `DOCKER_DATABASE_URL` | Root Compose | PostgreSQL connection string from containers to the Compose `db` service. |
| `POSTGRES_DB` | Compose | Database name for the included PostgreSQL service. |
| `POSTGRES_USER` | Compose | Database user for the included PostgreSQL service. |
| `POSTGRES_PASSWORD` | Production yes | Long random database password. Required by preflight. |

For local npm commands, `DATABASE_URL` usually points to `localhost:5433`.

For Docker services, the connection usually points to `db:5432`.

## Signup And Access

| Variable | Values | Description |
| --- | --- | --- |
| `SIGNUP_MODE` | `first-run`, `open`, `disabled` | Controls workspace creation through `/signup`. |

Recommended production values:

- `first-run`: first workspace can be created from `/signup`; later users are invited from `/app`.
- `disabled`: no public workspace creation; invite-only operation.

Use `open` only when public creation of additional workspaces is intentional.

## Email

Adclare uses magic links for login and invitations.

| Variable | Required | Description |
| --- | --- | --- |
| `EMAIL_FROM` | Production yes | Verified sender address, for example `Adclare <noreply@example.org>`. |
| `CLOUDFLARE_EMAIL_ACCOUNT_ID` | Production yes | Cloudflare account id for Email Service. |
| `CLOUDFLARE_EMAIL_API_TOKEN` | Production yes | Token allowed to send through Cloudflare Email Service. |
| `ADCLARE_LOG_EMAIL_LINKS` | Local only | Set `1` to print links in local development when email is not configured. |

Cloudflare Email Routing forwards inbound mail. It does not send application login or invitation emails.

If Cloudflare Email Service is not configured, emails are stored in the `email_messages` table with status `PENDING_PROVIDER`. Production does not print login links to logs.

## Turnstile

| Variable | Required | Description |
| --- | --- | --- |
| `TURNSTILE_REQUIRED` | Production yes | Use `1` for public production. Use `0` only in local development. |
| `TURNSTILE_SITE_KEY` | Production yes | Server-visible site key. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Production yes | Client-visible site key. |
| `TURNSTILE_SECRET_KEY` | Production yes | Secret key used for verification. Never commit it. |
| `TURNSTILE_ALLOWED_HOSTNAMES` | Recommended | Comma-separated hostnames accepted for Turnstile tokens. |

The preflight checks that Turnstile is enabled and configured for production.

## File Storage

Adclare stores uploaded advert assets either on disk or in S3-compatible object storage.

### Local Storage

```bash
ADCLARE_STORAGE_DRIVER=local
ADCLARE_LOCAL_STORAGE_DIR=/data/uploads
MAX_AD_ASSET_UPLOAD_MB=50
```

The root Docker Compose and production Compose files mount `/data/uploads` as the `asset_data` volume. If you use local storage, back up this volume together with PostgreSQL.

### S3-Compatible Object Storage

```bash
ADCLARE_STORAGE_DRIVER=s3
OBJECT_STORAGE_ENDPOINT=https://fsn1.your-objectstorage.com
OBJECT_STORAGE_REGION=fsn1
OBJECT_STORAGE_BUCKET=adclare-assets
OBJECT_STORAGE_ACCESS_KEY_ID=replace_with_access_key
OBJECT_STORAGE_SECRET_ACCESS_KEY=replace_with_secret_key
OBJECT_STORAGE_FORCE_PATH_STYLE=0
OBJECT_STORAGE_PUBLIC_BASE_URL=
MAX_AD_ASSET_UPLOAD_MB=50
```

Hetzner Object Storage and other S3-compatible providers can be used.

Verify the bucket:

```bash
npm run storage:check
```

Or with Docker:

```bash
docker compose -f docker-compose.prod.yml --profile tools build storage-check
docker compose -f docker-compose.prod.yml --profile tools run --rm storage-check
```

The check writes, reads and deletes one `_health/` object.

## Cloudflare Setup Automation

These variables are only used by `npm run cf:setup`:

| Variable | Description |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Temporary Cloudflare setup token. Revoke it after setup. |
| `CF_ZONE_NAME` | Cloudflare zone to configure. |
| `ORIGIN_IPV4` | Server IPv4 for DNS records. |
| `CF_SSL_MODE` | Usually `strict`. |
| `SETUP_EMAIL_ROUTING` | Set `1` to configure inbound Email Routing aliases. |
| `EMAIL_DESTINATION` | Verified destination inbox for Email Routing. |
| `EMAIL_ALIASES` | Comma-separated aliases, for example `hello,support,security`. |
| `CREATE_TURNSTILE` | Set `1` to create or update a Turnstile widget. |
| `TURNSTILE_WIDGET_NAME` | Turnstile widget name. |

Keep Cloudflare tokens out of GitHub issues, commits, logs and screenshots.

## Checks And Scripts

| Command | What it checks |
| --- | --- |
| `npm run ci` | Smoke tests, audit chain test, workflow smoke, Playwright E2E, security scan, Prisma validate, lint, typecheck, audit and production build. |
| `npm run test` | Launch smoke, audit hash chain smoke and logged-in workflow smoke. |
| `npm run test:e2e` | Browser E2E against the production build. |
| `npm run security:scan` | Common secret patterns in tracked and untracked source files. |
| `npm audit` | Full dependency audit. |
| `npm audit --omit=dev` | Production dependency audit used by CI. |
| `npm run docker:check` | Docker builds for migrator, storage check, preflight and web image. |
| `npm run launch:preflight` | Production configuration readiness. |
| `npm run launch:smoke` | Live public URL smoke test. Use `SMOKE_URL=https://your-domain`. |
| `npm run storage:check` | S3-compatible bucket write/read/delete check. |

## Backup Configuration

PostgreSQL backup:

```bash
APP_DIR=/srv/apps/adclare BACKUP_DIR=/srv/backups/adclare/postgres scripts/backup-postgres.sh
```

Restore:

```bash
CONFIRM_RESTORE=adclare-prod RESTORE_FILE=/srv/backups/adclare/postgres/adclare-YYYYMMDDTHHMMSSZ.dump scripts/restore-postgres.sh
```

For production, schedule backups and test at least one restore before storing real campaign data.
