# Hetzner Deployment

Production target for `adclare.eu`:

- VPS public IPv4: `46.224.66.79`
- Domain: `adclare.eu`
- Runtime: Docker Compose
- Reverse proxy: system Nginx
- Public TLS: Cloudflare proxy in front of the Nginx origin

Do not publish the server IP on the public website. It is operational documentation only.

## Cloudflare DNS

Create these records:

| Type | Name | Value | Proxy |
| --- | --- | --- | --- |
| A | `@` | `46.224.66.79` | Proxied |
| A | `www` | `46.224.66.79` | Proxied |

Recommended Cloudflare settings:

- SSL/TLS mode: Full currently; switch to Full strict after installing a Cloudflare Origin Certificate or publicly trusted certificate on Nginx.
- Always Use HTTPS: enabled.
- WAF/managed rules: enabled.
- Turnstile: use later for public forms and signup.

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
rsync -az --delete --exclude '.env' --exclude 'node_modules' --exclude '.next' ./ root@46.224.66.79:/srv/apps/adclare/
ssh root@46.224.66.79 'cd /srv/apps/adclare && test -f .env || {
  PASS=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 32)
  printf "POSTGRES_DB=adclare_prod\nPOSTGRES_USER=adclare\nPOSTGRES_PASSWORD=%s\nDATABASE_URL=postgresql://adclare:%s@db:5432/adclare_prod?schema=public\nNEXT_PUBLIC_APP_URL=https://adclare.eu\nNEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAADWL1GxcsZgXYZe1\n" "$PASS" "$PASS" > .env
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

For Cloudflare SSL mode `Full`, a local origin certificate can be self-signed.
Switch Cloudflare to `Full strict` only after installing a Cloudflare Origin Certificate or a publicly trusted certificate for `adclare.eu`.

Current production status:

- App directory: `/srv/apps/adclare`
- Compose file: `/srv/apps/adclare/docker-compose.prod.yml`
- Container: `adclare-web`
- Database container: `adclare-db`
- Database volume: `adclare_postgres_data`
- Local app port: `127.0.0.1:13310`
- Nginx vhost: `/etc/nginx/sites-enabled/adclare.eu`
- Public URLs: `https://adclare.eu/cs`, `https://adclare.eu/en`
- `www.adclare.eu` redirects to `https://adclare.eu/`
- Docker healthcheck is enabled and checks `/cs`.

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
