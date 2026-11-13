# Adclare v0.2.0-beta.5

This public beta completes the TTPA data workflow and strengthens the release gate.

## What Changed

- Advert and campaign records now cover sponsor, payer, controlling entity, funding, dissemination, election, cost methodology, targeting and reach data.
- Completeness rules adapt to online adverts, personal-data targeting and adverts republished after an infringement.
- Public transparency notices expose a versioned JSON representation for integrations and future European repository adapters.
- Visitors can report incorrect or incomplete notice data. Adclare records the reporter identity, confirms receipt, tracks the report and sends the result.
- Reports received during the final month before an election show the 48-hour response deadline.
- Audit history is loaded from PostgreSQL with role-aware filters and pagination.
- Audit packages and workspace archives include `audit-log.csv`, `audit-log.json` and a verifiable SHA-256 chain.
- Playwright E2E covers login, access scopes, workspace administration, advert creation, upload, QR packages, review, publication, public notices, reports, XLSX import and exports.
- Next.js, Prisma and the lint toolchain are updated. Production and full dependency audits pass without findings.

## Database Update

Apply migrations before starting the new application image:

```bash
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate
```

The completeness migration returns older incomplete published records to `NEEDS_DATA`. Review those records before publishing them again.

## Release Gate

The release was prepared against:

```bash
npm run ci
npm run docker:check
npm run launch:preflight
npm audit --omit=dev
```

For S3-compatible storage, also run:

```bash
npm run storage:check
```

## Compatibility Note

`pg` is pinned to 8.18.0 because current Prisma PostgreSQL adapters can execute relation queries concurrently on one client and newer `pg` versions warn that this behavior will be removed in version 9. The application test suite is clean with this supported version. Revisit the pin after the upstream Prisma issue is resolved.

## Before Production

- Configure Cloudflare Email Service and verify one login link, invitation and discrepancy report.
- Enable Turnstile for public forms.
- Verify object storage when the S3 driver is selected.
- Create a PostgreSQL backup and complete one restore test.
- Run the live smoke test after deployment.

See `docs/configuration.md` for all environment variables and deployment choices.

For hosting, installation, migration, TTPA workflow design, integrations or production support, contact `support@adclare.eu`.
