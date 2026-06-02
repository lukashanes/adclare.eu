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

## Official Repository

The official repository is `lukashanes/adclare.eu`.

Please contribute through pull requests. The protected `main` branch and `v*` release tags are used for the official downloadable version. Collaborator access can be granted for trusted contributors, but accepted changes still go through review and CI before they become part of the public release line.

See [GOVERNANCE.md](GOVERNANCE.md) for roles, contribution flow and release flow.

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
- Do not add hosted access gates or payment enforcement to the open source core.
- Prefer self-hosted, vendor-neutral defaults.

For security issues, do not open a public issue. See [SECURITY.md](SECURITY.md).
