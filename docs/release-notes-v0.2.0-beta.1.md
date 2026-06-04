# Adclare v0.2.0-beta.1

Public beta release of Adclare.

Adclare is open source software for political advert records, QR labels, transparency notices, approval workflows and audit exports under the EU Transparency and Targeting of Political Advertising Regulation (TTPA), Regulation (EU) 2024/900.

## Highlights

- Public beta website copy for the open source TTPA workflow.
- Removed the old demo admin UI/API from the production codebase.
- Renamed the shared application data layer from `admin-demo-*` to `workspace-*`.
- Added `npm run launch:preflight` for production launch checks.
- Added a Docker Compose `preflight` tool for own installations.
- Docker checks now build the migrator, storage-check, preflight and web images.
- Updated installation and Hetzner docs with preflight steps.
- Updated legal copy for open source operation.
- Kept the core workflow: signup, invitations, ads, required TTPA fields, uploads, QR package, approval, publication, public notice, public repository, audit package, Excel import and workspace archive.

## Before Running A Public Instance

Run:

```bash
npm run launch:preflight
```

For Docker:

```bash
docker compose -f docker-compose.prod.yml --profile tools build preflight
docker compose -f docker-compose.prod.yml --profile tools run --rm preflight
```

Also verify object storage when S3-compatible storage is used:

```bash
npm run storage:check
```

## Remaining Work For Each Instance

- Configure Cloudflare Email Service for login links and invitations.
- Configure Cloudflare Turnstile for public forms.
- Configure local upload backups or S3-compatible object storage.
- Configure daily PostgreSQL backups.
- Test one restore before storing real campaign data.
- Create the first workspace through `/signup`, then switch `SIGNUP_MODE` to `disabled` if public workspace creation should stay closed.

## Documentation

- Self-hosting: `docs/self-hosting.md`
- Hetzner deployment notes: `docs/deployment-hetzner.md`
- Roadmap: `docs/roadmap.md`
- Release checklist: `docs/release-checklist.md`
- Security policy: `SECURITY.md`
- License: `LICENSE`

For hosting, installation, migration, TTPA workflow design, integrations or production support, contact `support@adclare.eu`.
