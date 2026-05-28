# Hetzner Deployment

Production target for `adclare.eu`:

- VPS public IPv4: `46.224.66.79`
- Domain: `adclare.eu`
- Runtime: Docker Compose
- Reverse proxy: system Nginx
- Public TLS: Cloudflare proxy in front of the Nginx origin, with Full strict SSL once the origin certificate is installed

Do not publish the server IP on the public website. It is operational documentation only.

## Cloudflare DNS

Create these records:

| Type | Name | Value | Proxy |
| --- | --- | --- | --- |
| A | `@` | `46.224.66.79` | Proxied |
| A | `www` | `46.224.66.79` | Proxied |

Recommended Cloudflare settings:

- SSL/TLS mode: Full strict. Install a Cloudflare Origin Certificate or a publicly trusted certificate on Nginx before switching traffic.
- Always Use HTTPS: enabled.
- WAF/managed rules: enabled.
- Turnstile: add site key and secret to production `.env` to protect login and invitation forms.

See `docs/cloudflare-setup.md` for the temporary API token permissions and the Cloudflare setup checklist.

## Server Bootstrap

On a fresh Ubuntu/Debian VPS:

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

## Optional Fresh VPS Compose

```bash
git clone https://github.com/lukashanes/adclare.eu.git
cd adclare.eu
docker compose up -d --build
```

Check status:

```bash
docker compose ps
docker compose logs -f web
docker compose logs -f caddy
```

The root `docker-compose.yml` includes Caddy for a standalone fresh server. Current production uses the shared Nginx setup below.

## Deploy On A Shared Nginx VPS

The current Hetzner VPS already has a system Nginx on ports `80` and `443`.
Use the production compose file so the app listens only on localhost:

```bash
mkdir -p /srv/apps/adclare
rsync -az --delete --exclude '.env' --exclude '.admin-access' --exclude 'node_modules' --exclude '.next' ./ root@46.224.66.79:/srv/apps/adclare/
ssh root@46.224.66.79 'cd /srv/apps/adclare && test -f .env || {
  PASS=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 32)
  printf "POSTGRES_DB=adclare_prod\nPOSTGRES_USER=adclare\nPOSTGRES_PASSWORD=%s\nDATABASE_URL=postgresql://adclare:%s@db:5432/adclare_prod?schema=public\nNEXT_PUBLIC_APP_URL=https://adclare.eu\n" "$PASS" "$PASS" > .env
}'
ssh root@46.224.66.79 'cd /srv/apps/adclare && docker compose -f docker-compose.prod.yml up -d db'
ssh root@46.224.66.79 'cd /srv/apps/adclare && docker compose -f docker-compose.prod.yml --profile tools build migrate'
ssh root@46.224.66.79 'cd /srv/apps/adclare && docker compose -f docker-compose.prod.yml --profile tools run --rm migrate'
ssh root@46.224.66.79 'cd /srv/apps/adclare && docker compose -f docker-compose.prod.yml up -d --build web'
```

Nginx vhost:

```bash
cp deploy/nginx/adclare.eu.conf /etc/nginx/sites-available/adclare.eu
ln -sfn /etc/nginx/sites-available/adclare.eu /etc/nginx/sites-enabled/adclare.eu
nginx -t
systemctl reload nginx
```

For Cloudflare SSL mode `Full strict`, install a Cloudflare Origin Certificate or a publicly trusted certificate for `adclare.eu` on Nginx. Avoid `Full` in production because it does not verify the origin certificate.

Current production status:

- App directory: `/srv/apps/adclare`
- Compose file: `/srv/apps/adclare/docker-compose.prod.yml`
- Container: `adclare-web`
- Database container: `adclare-db`
- Database volume: `adclare_postgres_data`
- Local app port: `127.0.0.1:13310`
- Nginx vhost: `/etc/nginx/sites-enabled/adclare.eu`
- Public URLs: `https://adclare.eu/cs`, `https://adclare.eu/en`
- Public demo repository: `https://adclare.eu/repo/demo-party`
- Public demo repository JSON: `https://adclare.eu/api/repo/demo-party/ads?locale=cs`
- `www.adclare.eu` redirects to `https://adclare.eu/`
- Docker healthcheck is enabled and checks `/api/health`.

## Production Secrets Still Needed

Add these to `/srv/apps/adclare/.env` when the external services are ready:

```bash
EMAIL_FROM='Adclare <noreply@adclare.eu>'
CLOUDFLARE_EMAIL_ACCOUNT_ID='...'
CLOUDFLARE_EMAIL_API_TOKEN='...'
TURNSTILE_SITE_KEY='...'
NEXT_PUBLIC_TURNSTILE_SITE_KEY='...'
TURNSTILE_SECRET_KEY='...'
TURNSTILE_REQUIRED='1'
TURNSTILE_ALLOWED_HOSTNAMES='adclare.eu,www.adclare.eu'
NEXT_PUBLIC_SHOW_DEMO_REPO='0'
OBJECT_STORAGE_ENDPOINT='https://fsn1.your-objectstorage.com'
OBJECT_STORAGE_REGION='fsn1'
OBJECT_STORAGE_BUCKET='adclare-assets'
OBJECT_STORAGE_ACCESS_KEY_ID='...'
OBJECT_STORAGE_SECRET_ACCESS_KEY='...'
OBJECT_STORAGE_FORCE_PATH_STYLE='0'
OBJECT_STORAGE_PUBLIC_BASE_URL=''
MAX_AD_ASSET_UPLOAD_MB='50'
STRIPE_SECRET_KEY='sk_live_...'
STRIPE_WEBHOOK_SECRET='whsec_...'
```

Current behavior without those secrets:

- Invitation e-mails are stored in the `email_messages` outbox with status `PENDING_PROVIDER`.
- Outbound transactional e-mail uses Cloudflare Email Service REST API, not Email Routing aliases. Email Routing remains useful for inbound aliases such as `hello@`, `billing@`, `support@` and `security@`.
- Turnstile is required in production by default. Set `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` together and keep `TURNSTILE_ALLOWED_HOSTNAMES` limited to production hostnames. `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is kept only for backwards compatibility with older builds. A temporary `TURNSTILE_REQUIRED=0` override exists only to avoid locking login/signup before the secret is available.
- Uploaded ad files use Hetzner Object Storage through the S3 API. Keep the bucket private unless a customer explicitly needs public asset URLs; authenticated downloads are served through `/api/app/ads/[code]/assets/[assetId]`.
- Billing plan, discount, Stripe/invoice mode and invoice approval state are stored in `billing_accounts`.
- Stripe Checkout and Customer Portal actions are disabled until `STRIPE_SECRET_KEY` is present. Subscription state sync is disabled until `STRIPE_WEBHOOK_SECRET` is present and the Stripe webhook points to `https://adclare.eu/api/stripe/webhook`. Webhook event IDs are stored in `stripe_webhook_events` so repeated Stripe deliveries are idempotent.

## Update

```bash
cd /srv/apps/adclare
docker compose -f docker-compose.prod.yml up -d db
docker compose -f docker-compose.prod.yml --profile tools build migrate
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate
docker compose -f docker-compose.prod.yml up -d --build web
docker image prune -f
```

## Current App Notes

- The root route permanently redirects to `/cs`.
- Czech page: `https://adclare.eu/cs`
- English page: `https://adclare.eu/en`
- Admin demo: `https://adclare.eu/cs/admin`
- Admin demo reads and writes PostgreSQL through API routes. The production database stays inside Docker on a persistent volume.
