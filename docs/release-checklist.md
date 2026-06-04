# Release Checklist

This checklist is for maintainers preparing an official Adclare release from `lukashanes/adclare.eu`.

## Code Checks

Run:

```bash
npm run ci
```

The command covers launch smoke checks, security scan, Prisma validation, client generation, linting, type checking, dependency audit and production build.

Run Docker image checks:

```bash
npm run docker:check
```

Run the production preflight against the release environment before inviting real users:

```bash
npm run launch:preflight
```

## Fresh Self-Hosted Install

Verify a clean Docker installation before tagging a release:

1. Start an empty PostgreSQL database.
2. Run `prisma migrate deploy` through the migrator image.
3. Start the production web image.
4. Check `/api/health`.
5. Create the first workspace through `/signup`.
6. Confirm the database contains one tenant, one user, one login token and one email message.
7. Confirm `/data/uploads` is writable when local storage is used.
8. Run the production preflight with the same environment values.
9. Shut the test stack down with volumes removed.

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

## Documentation

Before publishing a tag:

- `README.md` describes the current capabilities.
- `docs/self-hosting.md` has current Docker and storage instructions.
- `docs/deployment-hetzner.md` has current Hetzner notes.
- `docs/roadmap.md` separates shipped features from planned improvements.
- `CHANGELOG.md` has the release entry.
- `docs/release-notes-v0.1.0.md` or the matching release notes file is current.

## Release

Official releases should be created from the repository owner controlled branch:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Then create the GitHub Release from the pushed tag and copy the release notes.

Commercial hosting, migration help, integrations or production support can point to `support@adclare.eu`.
