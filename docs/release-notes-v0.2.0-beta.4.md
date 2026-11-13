# Adclare v0.2.0-beta.4

Release readiness, audit integrity and browser E2E gate for the Adclare public beta.

## Highlights

- Audit history is now a general event stream with actor, object, result, request context and before/after metadata.
- Audit events are chained per tenant with SHA-256 hashes so exports can verify continuity.
- Ad audit packages and workspace archives include `audit-log.csv`, `audit-log.json` and manifest integrity fields.
- GitHub Actions now starts PostgreSQL, applies migrations, seeds demo data and runs Playwright E2E before release checks.
- Browser E2E covers the public web, login, workspace workflow, invitations, advert publication, public transparency pages, repository, import/export, audit and role scopes.
- The release dependency audit gate passes with patched transitive `hono`, `esbuild` and `js-yaml` versions.
- A live production smoke command checks `/api/health`, public pages, security headers, robots and sitemap after deployment.
- GitHub documentation now includes a full configuration reference for local development, public Docker installs, Cloudflare, storage, backup and release checks.
- Advert and campaign records now collect the complete sponsor, payer, controlling entity, funding, dissemination, election, cost methodology, targeting and reach data used in the TTPA notice.
- Public notices include a discrepancy form. Reports are stored, audited and routed to the configured compliance contact.
- Audit history is loaded from the database with role-aware filters and pagination instead of a fixed in-memory subset.

## Release Hygiene Update

- Next.js is updated to 16.2.11.
- Prisma runtime and tooling are updated to 7.9.0.
- Patched transitive versions of PostCSS, Sharp, Fast URI, Find My Way,
  Valibot and JS YAML remove current production dependency findings.
- Demo audit events use a timeline relative to the seed start time and are
  always written in the past.
- Adclare owns browser policy headers. The HTTPS terminator owns HSTS. Proxy
  configuration must not add a second, conflicting browser policy set.
- ESLint now uses a maintained flat configuration with the Next.js plugin,
  TypeScript rules and React Hooks rules. Both `npm audit` and
  `npm audit --omit=dev` are clean.

## Before Updating A Public Instance

Run:

```bash
npm run ci
npm run docker:check
npm run launch:preflight
npm run launch:smoke
npm audit --omit=dev
```

For Docker:

```bash
docker compose -f docker-compose.prod.yml --profile tools run --rm preflight
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate
```

If S3-compatible storage is enabled, verify it too:

```bash
npm run storage:check
```

## Production Notes

- Use `production.env.example` for public instances.
- Configure Cloudflare Email Service before inviting real users.
- Keep Turnstile enabled on public login, signup and invitation forms.
- Test one PostgreSQL restore before storing real campaign data.
- Inspect the final HTTPS response and confirm that security headers are not duplicated by the reverse proxy or CDN.
- After the first workspace is created, set `SIGNUP_MODE=disabled` if public workspace creation should remain closed.
- Set the compliance contact in workspace settings. Public discrepancy reports remain stored and auditable even when email delivery is temporarily unavailable.
- The TTPA completeness migration returns older incomplete published records to `NEEDS_DATA`; review them before publishing them again.

## Documentation

- Configuration reference: `docs/configuration.md`
- Self-hosting: `docs/self-hosting.md`
- Hetzner deployment notes: `docs/deployment-hetzner.md`
- Cloudflare setup: `docs/cloudflare-setup.md`
- Release checklist: `docs/release-checklist.md`
- Security policy: `SECURITY.md`
- License: `LICENSE`

For hosting, installation, migration, TTPA workflow design, integrations or production support, contact `support@adclare.eu`.
