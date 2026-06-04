# Hetzner Deployment

This guide describes a generic Hetzner VPS deployment for a self-hosted Adclare instance.

Use your own domain, server address and paths. Do not commit real production IP addresses, private hostnames or secrets to the repository.

## Target Shape

- VPS: Ubuntu or Debian.
- Runtime: Docker Compose.
- Database: PostgreSQL in Docker with a persistent volume.
- App: Next.js standalone container from this repository.
- Reverse proxy: Caddy from `docker-compose.yml` for simple installs, or system Nginx with `docker-compose.prod.yml` for shared servers.
- Optional edge proxy: Cloudflare.

## Fresh VPS Bootstrap

```bash
sudo apt update
sudo apt install -y ca-certificates curl git ufw
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
```

Firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw --force enable
```

Log out and back in after adding the user to the Docker group.

## Simple Fresh Server

The root `docker-compose.yml` includes Caddy and is the simplest path for one Adclare instance on one server:

```bash
git clone https://github.com/lukashanes/adclare.eu.git
cd adclare.eu
cp .env.example .env
```

Edit `.env`:

```bash
APP_URL=https://adclare.example.org
NEXT_PUBLIC_APP_URL=https://adclare.example.org
POSTGRES_DB=adclare_prod
POSTGRES_USER=adclare
POSTGRES_PASSWORD=replace_with_generated_password
DATABASE_URL=postgresql://adclare:replace_with_generated_password@db:5432/adclare_prod?schema=public
SITE_ADDRESS=adclare.example.org
```

Start the instance:

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f web
```

The root Compose file runs migrations before the web container starts. To rerun migrations manually:

```bash
docker compose run --rm migrate
```

## Shared Nginx Server

Use `docker-compose.prod.yml` when another system proxy already owns ports `80` and `443`. The app listens on localhost only.

Example app path:

```bash
sudo mkdir -p /srv/apps/adclare
sudo chown "$USER":"$USER" /srv/apps/adclare
rsync -az --delete \
  --exclude '.env' \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  ./ user@server.example.org:/srv/apps/adclare/
```

Create `/srv/apps/adclare/.env` on the server:

```bash
POSTGRES_DB=adclare_prod
POSTGRES_USER=adclare
POSTGRES_PASSWORD=replace_with_generated_password
DATABASE_URL=postgresql://adclare:replace_with_generated_password@db:5432/adclare_prod?schema=public
APP_URL=https://adclare.example.org
NEXT_PUBLIC_APP_URL=https://adclare.example.org
SIGNUP_MODE=first-run
ENABLE_DEMO_ADMIN=0
NEXT_PUBLIC_SHOW_DEMO_REPO=0
```

Start and migrate:

```bash
cd /srv/apps/adclare
docker compose -f docker-compose.prod.yml up -d db
docker compose -f docker-compose.prod.yml --profile tools build migrate
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate
docker compose -f docker-compose.prod.yml up -d --build web
```

Nginx example:

```bash
sudo cp deploy/nginx/adclare.conf.example /etc/nginx/sites-available/adclare
sudo sed -i 's/adclare.example.org/your-domain.example/g' /etc/nginx/sites-available/adclare
sudo ln -sfn /etc/nginx/sites-available/adclare /etc/nginx/sites-enabled/adclare
sudo nginx -t
sudo systemctl reload nginx
```

Install a Cloudflare Origin Certificate or a publicly trusted certificate at the paths used by the Nginx file before switching Cloudflare to `Full strict`.

## Production Environment

Recommended production `.env` values:

```bash
EMAIL_FROM='Adclare <noreply@adclare.example.org>'
CLOUDFLARE_EMAIL_ACCOUNT_ID='...'
CLOUDFLARE_EMAIL_API_TOKEN='...'
TURNSTILE_SITE_KEY='...'
NEXT_PUBLIC_TURNSTILE_SITE_KEY='...'
TURNSTILE_SECRET_KEY='...'
TURNSTILE_REQUIRED='1'
TURNSTILE_ALLOWED_HOSTNAMES='adclare.example.org,www.adclare.example.org'
NEXT_PUBLIC_SHOW_DEMO_REPO='0'
ENABLE_DEMO_ADMIN='0'
SIGNUP_MODE='first-run'
ADCLARE_STORAGE_DRIVER='s3'
OBJECT_STORAGE_ENDPOINT='https://fsn1.your-objectstorage.com'
OBJECT_STORAGE_REGION='fsn1'
OBJECT_STORAGE_BUCKET='adclare-assets'
OBJECT_STORAGE_ACCESS_KEY_ID='...'
OBJECT_STORAGE_SECRET_ACCESS_KEY='...'
OBJECT_STORAGE_FORCE_PATH_STYLE='0'
OBJECT_STORAGE_PUBLIC_BASE_URL=''
MAX_AD_ASSET_UPLOAD_MB='50'
```

Behavior without optional external secrets:

- Invitation emails are stored in the `email_messages` outbox with status `PENDING_PROVIDER`.
- Outbound transactional email uses Cloudflare Email Service REST API when configured.
- Turnstile protects public forms only when site key and secret are set.
- Uploaded ad files use local file storage by default. Docker Compose persists them in the `asset_data` volume.
- Set `ADCLARE_STORAGE_DRIVER='s3'` to use Hetzner Object Storage or another S3-compatible bucket.

Object storage check:

```bash
cd /srv/apps/adclare
docker compose -f docker-compose.prod.yml --profile tools build storage-check
docker compose -f docker-compose.prod.yml --profile tools run --rm storage-check
```

The check writes, reads and deletes one `_health/` object and does not print access keys.

## Backups

Production PostgreSQL backups run through `scripts/backup-postgres.sh`.

Example cron:

```cron
17 2 * * * root APP_DIR=/srv/apps/adclare BACKUP_DIR=/srv/backups/adclare/postgres RETENTION_DAYS=30 /srv/apps/adclare/scripts/backup-postgres.sh >> /var/log/adclare-postgres-backup.log 2>&1
```

Install log rotation:

```bash
sudo cp deploy/logrotate/adclare-postgres-backup /etc/logrotate.d/adclare-postgres-backup
sudo logrotate -d /etc/logrotate.d/adclare-postgres-backup
```

Restore is guarded by `CONFIRM_RESTORE=adclare-prod`:

```bash
CONFIRM_RESTORE=adclare-prod RESTORE_FILE=/srv/backups/adclare/postgres/adclare-YYYYMMDDTHHMMSSZ.dump /srv/apps/adclare/scripts/restore-postgres.sh
```

## Updates

```bash
cd /srv/apps/adclare
git pull --ff-only
docker compose -f docker-compose.prod.yml up -d db
docker compose -f docker-compose.prod.yml --profile tools build migrate
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate
docker compose -f docker-compose.prod.yml up -d --build web
docker image prune -f
```

## Notes

- The root route redirects to `/cs`.
- The first organization is created through `/signup` when `SIGNUP_MODE=first-run`.
- Demo admin and demo public repository are disabled in production by default.
- Keep real deployment inventory, IP addresses and access notes in a private operations runbook, not in the public repository.
