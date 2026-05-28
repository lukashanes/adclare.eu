# Adclare

Adclare is a SaaS product for managing political advertising compliance under Regulation (EU) 2024/900.

The first version in this repository is a Next.js SaaS product website and UI direction for `adclare.eu`. It presents the campaign administration problem, the workflow Adclare provides, and the outcome for headquarters, branches, candidates and external designers.

## Product Direction

Adclare gives a paying political party or organization one workflow to:

- buy access by Stripe subscription or request invoice-based approval,
- create its own branch/region/area structure with custom naming,
- invite local branches, candidates and external designers by email,
- let local teams manage their own ads and QR/label outputs,
- require all mandatory data before the planned publication date,
- show orange/red status when a deadline is close or required data is missing,
- generate transparent notices, QR codes, print-ready exports and audit packages,
- lock published ad versions and keep an append-only audit trail.

## Current Scope

- Next.js App Router with TypeScript.
- Tailwind CSS v4.
- Czech and English routes: `/cs`, `/en`.
- Cloudflare-inspired visual direction: clear typography, white surface, dark product UI, orange accent.
- Product dashboard preview with compliance statuses, deadlines, approval queue and billing state.
- Public signup at `/signup` creates a 14-day trial tenant, first party admin, default headquarters and first campaign.
- Password-protected database-backed admin preview at `/cs/admin` and `/en/admin` using PostgreSQL, Prisma, API routes and seeded demo records.
- Database-backed members and invitation flow with secure invite links and public invite acceptance pages.
- Invitation e-mail outbox with Cloudflare Email Service REST API send path when Cloudflare e-mail credentials are configured.
- Database-backed billing account state for plan, interval, Stripe/invoice mode, status and admin discount.
- Expanded ad records with online/offline channel, supplier, distribution area, language, targeting flag, target audience and deadline-based missing-data status.
- Authenticated workspace at `/app` for scoped users to add/edit ads, download QR packages, approve/publish ads when their role allows it and activate/manage billing.
- Public repository at `/repo/demo-party` with filters and JSON endpoint at `/api/repo/demo-party/ads`.
- Public QR/transparency URLs keep a stable pending page until the ad is published; public repository output is limited to published/archived ads.
- Cloudflare Turnstile server validation on public login and invitation forms when Turnstile secrets are configured.
- Health endpoint at `/api/health` for production container checks.
- Sections for workflow, modules, pricing, security and operator footer.

## Planned SaaS Stack

- Hetzner VPS for app runtime, API, workers, PostgreSQL and Redis/BullMQ.
- Hetzner Object Storage for uploaded ad assets, QR exports, PDFs, ZIPs and audit packages.
- Cloudflare DNS, proxy, WAF, Turnstile and email sending.
- Stripe Billing for recurring subscriptions, hosted invoices, coupons, discounts and customer portal.
- Manual invoice workflow for larger parties and enterprise customers.

## Pricing Direction

- Small party: 1 election campaign per year, 10 user seats, 9 EUR/month or 99 EUR/year.
- Large party: unlimited users, campaigns and adverts, repository access, legally required archive and exports to external storage or websites. Regular price 199 EUR/month or 1990 EUR/year; launch price 99 EUR/month or 999 EUR/year.
- Custom solution: dedicated onboarding, integrations, hosting, SLA or custom billing.

Expected administrative savings:

- Large party: roughly 300-900 hours per year depending on branch and ad volume.
- Small party: roughly 25-80 hours per year during one campaign cycle.
- Coordination gain: headquarters, branches and designers work from one shared campaign status instead of email threads, spreadsheets and chat messages.

## Operator

Operator: Aenze s.r.o.  
Company ID: 28534395  
VAT ID: CZ28534395  
Address: Moskevská 1842, 272 04 Kladno

These details should be re-checked against official registry data before production launch and legal documents.

## Development

```bash
npm install
docker compose up -d db
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. The root route redirects to `/cs`.

The local database listens on `127.0.0.1:5433`. Use `npm run db:seed` to restore the demo admin records.

For the temporary protected admin preview, set `ADMIN_ACCESS_PASSWORD` and a random `ADMIN_SESSION_SECRET` with at least 32 characters.

For invite e-mail sending, set `EMAIL_FROM`, `CLOUDFLARE_EMAIL_ACCOUNT_ID` and `CLOUDFLARE_EMAIL_API_TOKEN`. Without those Cloudflare Email Service credentials, invitations are still created and stored in the outbox with status `PENDING_PROVIDER`.

For billing, set `STRIPE_SECRET_KEY` to enable hosted Stripe Checkout and Customer Portal redirects from the admin. Set `STRIPE_WEBHOOK_SECRET` for `/api/stripe/webhook` so completed payments and subscription changes sync back into Postgres.

For uploaded ad files, set `OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_ACCESS_KEY_ID` and `OBJECT_STORAGE_SECRET_ACCESS_KEY`. Hetzner Object Storage uses an S3-compatible endpoint such as `https://fsn1.your-objectstorage.com`.

After setting storage credentials, verify the bucket before asking users to upload production files:

```bash
npm run storage:check
```

On production, use the Docker tool service so the host does not need local `node_modules`:

```bash
docker compose -f docker-compose.prod.yml --profile tools build storage-check
docker compose -f docker-compose.prod.yml --profile tools run --rm storage-check
```

## Checks

```bash
npm run lint
npm run build
npm run test
```

## Deployment

Production target: Hetzner VPS `46.224.66.79`.

Current production uses `docker-compose.prod.yml` behind the existing Nginx reverse proxy:

```bash
docker compose -f docker-compose.prod.yml up -d db
docker compose -f docker-compose.prod.yml --profile tools build migrate
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate
docker compose -f docker-compose.prod.yml up -d --build web
```

Demo seed data is intentionally not part of the production migrator. Run `npm run db:seed` only in local development or when you explicitly want to restore demo records.

PostgreSQL backups can be created with:

```bash
APP_DIR=/srv/apps/adclare BACKUP_DIR=/srv/backups/adclare/postgres scripts/backup-postgres.sh
```

Production restore is intentionally guarded:

```bash
CONFIRM_RESTORE=adclare-prod RESTORE_FILE=/srv/backups/adclare/postgres/adclare-YYYYMMDDTHHMMSSZ.dump scripts/restore-postgres.sh
```

The root `docker-compose.yml` also includes Caddy for a standalone fresh server:

```bash
docker compose up -d --build
```

See [docs/deployment-hetzner.md](docs/deployment-hetzner.md) for DNS, firewall and update steps.

## Next Product Steps

1. Replace the temporary admin password with tenant admin login, passwordless access and optional 2FA.
2. Add real signup and tenant onboarding outside the demo tenant.
3. Add tenant onboarding: organization details, billing mode and custom naming for branches.
4. Replace demo admin scope with tenant-aware authenticated app shell.
5. Add deadline, approval and billing e-mail templates on top of the existing outbox.
6. Add real file uploads to object storage for ad assets and generated exports.
7. Replace the demo tenant shortcuts with full tenant provisioning from checkout/invoice approval.
