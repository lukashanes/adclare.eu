# Adclare v0.2.0-beta.2

Security hardening release for the Adclare public beta.

## Highlights

- Signup no longer confirms whether an e-mail already has access.
- Invitation links are stored as hashes instead of plaintext tokens.
- Uploads are checked by file content and user-uploaded SVG files are no longer accepted.
- Uploads, downloads and export packages now have rate limits.
- Rate limiting uses an atomic database write.
- Logout now checks same-origin requests.
- Production CSP is tighter.
- Audit logs are protected at database level against update and delete operations.

## Migration Impact

- Pending invitation links created before this release are intentionally invalidated. Send those invitations again from the user administration.
- `audit_logs` are append-only after migration. Maintenance tasks that intentionally delete tenant data must plan for this trigger.

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

## Documentation

- Self-hosting: `docs/self-hosting.md`
- Hetzner deployment notes: `docs/deployment-hetzner.md`
- Release checklist: `docs/release-checklist.md`
- Security policy: `SECURITY.md`
- License: `LICENSE`

For hosting, installation, migration, TTPA workflow design, integrations or production support, contact `support@adclare.eu`.
