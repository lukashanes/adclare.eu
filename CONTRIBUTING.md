# Contributing to Adclare

Adclare is open source software licensed under EUPL-1.2.

Contributions are welcome in these areas:

- TTPA workflow and compliance modelling.
- Self-hosted deployment improvements.
- Accessibility and usability.
- Translations.
- Security hardening.
- Export formats and integrations.
- Documentation.

## Development

```bash
npm install
docker compose up -d db
npm run db:migrate
npm run db:seed
npm run dev
```

Before opening a pull request:

```bash
npm run lint
npm run test
npm run build
```

## Style

- Keep user-facing language plain and practical.
- Use TTPA consistently for the EU Transparency and Targeting of Political Advertising Regulation.
- Do not add billing, trial or paywall behaviour to the open source core.
- Prefer self-hosted, vendor-neutral defaults.

For security issues, do not open a public issue. See [SECURITY.md](SECURITY.md).
