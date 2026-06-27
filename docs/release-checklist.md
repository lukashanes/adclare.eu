# Release Checklist

This checklist is for maintainers preparing an official Adclare release from `lukashanes/adclare.eu`.

## Code Checks

Run:

```bash
npm run ci
```

The command covers launch smoke checks, audit-chain smoke checks, logged-in workflow checks, Playwright browser E2E, security scan, Prisma validation, client generation, linting, type checking, dependency audit and production build.

For local release rehearsal, make sure PostgreSQL is running, migrations are applied and seed data exists before `npm run ci`:

```bash
npm run db:generate
npx prisma migrate deploy
npm run db:seed
```

Run Docker image checks:

```bash
npm run docker:check
```

Run the production preflight against the release environment before inviting real users:

```bash
npm run launch:preflight
```

After deployment, run a live smoke check against the public URL:

```bash
npm run launch:smoke
```

## Fresh Self-Hosted Install

Verify a clean Docker installation before tagging a release:

1. Start an empty PostgreSQL database.
2. Run `prisma migrate deploy` through the migrator image.
3. Start the production web image.
4. Check `/api/health`.
5. Run `npm run launch:smoke` against the public URL.
6. Create the first workspace through `/signup`.
7. Confirm the database contains one tenant, one user, one login token and one email message.
8. Confirm `/data/uploads` is writable when local storage is used.
9. Run the production preflight with the same environment values.
10. Shut the test stack down with volumes removed.

## Core Product Workflow

Before a public release, check the application workflow with a real browser session:

1. Create or open a workspace.
2. Create a branch or region.
3. Create or select a campaign.
4. Create an advert record with all TTPA fields.
5. Upload an advert file.
6. Download the QR package.
7. Approve the advert.
8. Publish the advert.
9. Open the public transparency URL.
10. Download the audit package.
11. Import at least one advert from Excel.
12. Download the workspace archive.
13. Check audit filters and verify the archive contains `audit-log.csv`, `audit-log.json` and manifest integrity fields.
14. Check candidate, designer, reviewer, local admin and auditor role scopes.

## Documentation

Before publishing a tag:

- `README.md` describes the current capabilities.
- `docs/configuration.md` describes all supported environment variables and launch checks.
- `docs/self-hosting.md` has current Docker and storage instructions.
- `docs/deployment-hetzner.md` has current Hetzner notes.
- `docs/cloudflare-setup.md` has current DNS, Turnstile and email notes.
- `docs/roadmap.md` separates shipped features from planned improvements.
- `CHANGELOG.md` has the release entry.
- the matching release notes file in `docs/` is current.
- Playwright E2E scenarios match the current public release workflow.

## Release

Official releases should be created from the repository owner controlled branch:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

Then create the GitHub Release from the pushed tag and copy the release notes.

Commercial hosting, migration help, integrations or production support can point to `support@adclare.eu`.
