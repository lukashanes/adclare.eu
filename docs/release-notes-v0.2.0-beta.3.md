# Adclare v0.2.0-beta.3

Production configuration cleanup for the Adclare public beta.

## Highlights

- Added `production.env.example` for public self-hosted installs.
- Kept `.env.example` focused on local development.
- Updated root Docker Compose to use `DOCKER_DATABASE_URL` inside containers while local `DATABASE_URL` can point to localhost.
- Updated self-hosting, Hetzner and Cloudflare documentation to match the production preflight.
- Extended launch smoke checks to catch mismatched database templates.

## Before Updating A Public Instance

Run:

```bash
npm run launch:preflight
```

For Docker:

```bash
docker compose -f docker-compose.prod.yml --profile tools run --rm preflight
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate
```

## Installation Notes

- Use `.env.example` for local development.
- Use `production.env.example` for a public instance.
- Public instances should configure Cloudflare Email Service, enable Turnstile and verify upload storage before inviting real users.

## Documentation

- Self-hosting: `docs/self-hosting.md`
- Hetzner deployment notes: `docs/deployment-hetzner.md`
- Cloudflare setup: `docs/cloudflare-setup.md`
- Release checklist: `docs/release-checklist.md`
- Security policy: `SECURITY.md`
- License: `LICENSE`

For hosting, installation, migration, TTPA workflow design, integrations or production support, contact `support@adclare.eu`.
