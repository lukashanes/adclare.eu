# Self-Hosting Adclare

Adclare is an open source, self-hosted application for managing political advertising records and workflow under the EU Transparency and Targeting of Political Advertising Regulation (TTPA), Regulation (EU) 2024/900.

This guide is vendor-neutral. It assumes Docker, PostgreSQL and a reverse proxy or TLS terminator.

For a full list of environment variables, see [docs/configuration.md](configuration.md).

## Requirements

- A Linux server or local machine with Docker and Docker Compose.
- A DNS name for production, for example `adclare.example.org`.
- PostgreSQL, provided by the included Compose database or by your own managed database.
- Local file storage for advert files, or optional S3-compatible object storage.
- Cloudflare Turnstile for public login, signup and invitation forms.
- Cloudflare Email Service for magic links and invitations before real users are invited.

## Quick Docker Start

```bash
git clone https://github.com/lukashanes/adclare.eu.git
cd adclare.eu
cp .env.example .env
```

For local testing, `.env.example` is enough after you set a database URL. For a public instance, start from the production template instead:

```bash
cp production.env.example .env
```

Edit `.env`:

```bash
APP_URL=https://adclare.example.org
NEXT_PUBLIC_APP_URL=https://adclare.example.org
SITE_ADDRESS=adclare.example.org
POSTGRES_DB=adclare_prod
POSTGRES_USER=adclare
POSTGRES_PASSWORD=change_this_to_a_long_random_value
DATABASE_URL=postgresql://adclare:change_this_to_a_long_random_value@db:5432/adclare_prod?schema=public
DOCKER_DATABASE_URL=postgresql://adclare:change_this_to_a_long_random_value@db:5432/adclare_prod?schema=public
SIGNUP_MODE=first-run
EMAIL_FROM='Adclare <noreply@adclare.example.org>'
CLOUDFLARE_EMAIL_ACCOUNT_ID='...'
CLOUDFLARE_EMAIL_API_TOKEN='...'
TURNSTILE_REQUIRED=1
TURNSTILE_SITE_KEY='...'
NEXT_PUBLIC_TURNSTILE_SITE_KEY='...'
TURNSTILE_SECRET_KEY='...'
TURNSTILE_ALLOWED_HOSTNAMES=adclare.example.org
```

### Option A: one server with included Caddy

Use this when Adclare is the main app on the server and Docker can bind ports `80` and `443`:

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f web
```

The root Compose file starts PostgreSQL, runs migrations, starts the app and serves HTTPS through Caddy. `SITE_ADDRESS` must contain the real domain.

### Option B: existing reverse proxy

Use this when Nginx, Caddy, Traefik or another proxy already owns ports `80` and `443`:

```bash
docker compose -f docker-compose.prod.yml up -d db
docker compose -f docker-compose.prod.yml --profile tools build migrate
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate
docker compose -f docker-compose.prod.yml up -d --build web
```

The production Compose file binds the app to `127.0.0.1:13310`. Put Nginx, Caddy, Traefik or another reverse proxy in front of it and serve HTTPS.

## First Workspace

By default, `SIGNUP_MODE=first-run`.

That means:

- `/signup` can create the first workspace when the database has no tenant.
- after the first workspace exists, `/signup` stops creating new workspaces,
- existing users should use `/login`,
- new users should be invited from inside `/app`.

Other modes:

- `SIGNUP_MODE=open`: allow public creation of additional workspaces.
- `SIGNUP_MODE=disabled`: disable workspace creation completely; use invitations only.

For public production instances, keep `first-run` or `disabled` unless you explicitly want open multi-tenant registration.

## Production Preflight

Before inviting real users, run the production preflight check with the same `.env` values used by the app:

```bash
npm run launch:preflight
```

For Docker production:

```bash
docker compose -f docker-compose.prod.yml --profile tools build preflight
docker compose -f docker-compose.prod.yml --profile tools run --rm preflight
```

The preflight checks production URLs, Cloudflare Email Service, Turnstile, upload storage, signup mode and backup scripts. It does not send test emails or write to object storage; use `storage:check` separately for the bucket test.

After deployment, run a live smoke test:

```bash
SMOKE_URL=https://adclare.example.org npm run launch:smoke
```

It checks `/api/health`, the public Czech homepage, robots, sitemap and security headers.

## Email

Production instances should have outbound email configured before real users are invited or asked to log in. The production preflight requires it for public launch.

For transactional sending, configure:

```bash
EMAIL_FROM='Adclare <noreply@adclare.example.org>'
CLOUDFLARE_EMAIL_ACCOUNT_ID='...'
CLOUDFLARE_EMAIL_API_TOKEN='...'
```

If those values are missing, Adclare still records the email in `email_messages` with status `PENDING_PROVIDER`. In local non-production runs, the server console also prints the one-time login or invitation link so a developer can finish the first setup. Set `ADCLARE_LOG_EMAIL_LINKS=0` to disable this local fallback.

Cloudflare Email Routing is inbound forwarding only. It does not send application emails.

## Turnstile

For production, keep Turnstile enabled. The production preflight requires it for public launch:

```bash
TURNSTILE_REQUIRED=1
TURNSTILE_SITE_KEY='...'
NEXT_PUBLIC_TURNSTILE_SITE_KEY='...'
TURNSTILE_SECRET_KEY='...'
TURNSTILE_ALLOWED_HOSTNAMES=adclare.example.org
```

For local development only, `TURNSTILE_REQUIRED=0` can be used.

## File Storage

Uploaded advert files work with local file storage by default:

```bash
ADCLARE_STORAGE_DRIVER=local
ADCLARE_LOCAL_STORAGE_DIR=/data/uploads
```

Docker Compose persists local uploads in the `asset_data` volume. Back up that volume together with PostgreSQL if you keep files locally.

For Hetzner Object Storage or another S3-compatible bucket, switch the driver and set credentials:

```bash
ADCLARE_STORAGE_DRIVER=s3
OBJECT_STORAGE_ENDPOINT=https://fsn1.your-objectstorage.com
OBJECT_STORAGE_REGION=fsn1
OBJECT_STORAGE_BUCKET=adclare-assets
OBJECT_STORAGE_ACCESS_KEY_ID=...
OBJECT_STORAGE_SECRET_ACCESS_KEY=...
OBJECT_STORAGE_FORCE_PATH_STYLE=0
MAX_AD_ASSET_UPLOAD_MB=50
```

Verify the S3 bucket:

```bash
docker compose -f docker-compose.prod.yml --profile tools build storage-check
docker compose -f docker-compose.prod.yml --profile tools run --rm storage-check
```

The check writes, reads and deletes one `_health/` object.

## Backups

Use the included PostgreSQL backup script:

```bash
APP_DIR=/srv/apps/adclare BACKUP_DIR=/srv/backups/adclare/postgres scripts/backup-postgres.sh
```

Recommended daily cron:

```cron
17 2 * * * root APP_DIR=/srv/apps/adclare BACKUP_DIR=/srv/backups/adclare/postgres RETENTION_DAYS=30 /srv/apps/adclare/scripts/backup-postgres.sh >> /var/log/adclare-postgres-backup.log 2>&1
```

Restore is guarded:

```bash
CONFIRM_RESTORE=adclare-prod RESTORE_FILE=/srv/backups/adclare/postgres/adclare-YYYYMMDDTHHMMSSZ.dump scripts/restore-postgres.sh
```

## Updates

```bash
git pull
docker compose -f docker-compose.prod.yml up -d db
docker compose -f docker-compose.prod.yml --profile tools build migrate
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate
docker compose -f docker-compose.prod.yml up -d --build web
docker image prune -f
```

## First Account

In a fresh installation with `SIGNUP_MODE=first-run`, the first signup creates the first workspace and receives the installation administrator role. This role can see all workspaces in that installation. Additional party, branch, reviewer, candidate and designer accounts should be invited from inside the app.

## Verify A Fresh Install

After migrations and the web container are running, check the instance before inviting real users:

```bash
curl -fsS https://adclare.example.org/api/health
```

The response should include:

```json
{"ok":true,"service":"adclare","db":"ok"}
```

Then open `/signup`, create the first workspace and check that:

- `/app` opens for the first administrator,
- a default headquarters unit and first campaign exist,
- the administrator can create an advert record,
- local uploads write to `/data/uploads`, or S3 uploads pass `storage:check`,
- a complete advert can download a QR package and audit package,
- a published advert opens through its public transparency URL.

If outbound email is not configured, production still records pending login and invitation emails in the `email_messages` table. It does not print one-time links to logs in production.

## What The App Creates

A fresh first-run workspace creates:

- the first organization,
- the first administrator account,
- a default headquarters or organization unit,
- a first campaign,
- access to `/app` where more users, branches, campaigns, candidates and adverts can be created.

From there the normal flow is:

1. Invite users from `/app`.
2. Create branches or regions.
3. Create campaigns and tags.
4. Add candidate records when the campaign needs candidate-level ownership.
5. Create adverts.
6. Complete mandatory TTPA fields.
7. Upload the advert asset.
8. Download QR labels or publish the transparency notice.
9. Approve and publish.
10. Export the audit package or workspace archive when needed.

## Security Checklist

- Use HTTPS.
- Keep `SIGNUP_MODE=first-run` or `disabled` unless public registration is intentional.
- Keep object storage private.
- Back up PostgreSQL daily and test restore.
- Limit server SSH access.
- Keep Cloudflare, reverse proxy and Docker logs available for incident review.

## Support

For hosting, installation, migration, TTPA workflow design, integrations or production support from the Adclare team, contact `support@adclare.eu`.
