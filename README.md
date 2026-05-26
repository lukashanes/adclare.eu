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
- Database-backed admin demo at `/cs/admin` and `/en/admin` using PostgreSQL, Prisma, API routes and seeded demo records.
- Sections for workflow, modules, pricing, security and operator footer.

## Planned SaaS Stack

- Hetzner VPS for app runtime, API, workers, PostgreSQL and Redis/BullMQ.
- Hetzner Object Storage for ad assets, QR exports, PDFs, ZIPs and audit packages.
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

## Checks

```bash
npm run lint
npm run build
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

The root `docker-compose.yml` also includes Caddy for a standalone fresh server:

```bash
docker compose up -d --build
```

See [docs/deployment-hetzner.md](docs/deployment-hetzner.md) for DNS, firewall and update steps.

## Next Product Steps

1. Add real signup and Stripe checkout/request-invoice flow.
2. Add tenant onboarding: organization details, billing mode, custom naming for branches.
3. Add authenticated app shell: ads, campaigns, branches, users, approvals and QR generation.
4. Add Cloudflare Turnstile to public forms.
5. Add email templates for invites, deadlines, approvals and billing.
6. Define database schema for tenants, organization units, ads, notices, approvals, billing and audit logs.
