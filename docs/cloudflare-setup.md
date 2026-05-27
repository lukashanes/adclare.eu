# Cloudflare Setup

This document describes the recommended temporary Cloudflare access for configuring `adclare.eu`.

## Can Codex Configure It?

Yes, if one of these is true:

- You log in yourself in the in-app browser and browser-control tools are available in the session.
- You create a temporary API token and expose it only as a local environment variable for this workspace.

Do not paste Cloudflare passwords, 2FA codes, recovery codes, Global API keys or long-lived tokens into chat.

## Recommended Temporary API Token

Create a custom API token in Cloudflare:

`My Profile -> API Tokens -> Create Token -> Custom token`

Name:

```text
adclare-temp-setup
```

Set a short expiration, ideally same day or max 24 hours.

If using the API from this machine, restrict the token by client IP to the current public IP as `/32`.

### Permissions

Zone permissions, scoped only to `adclare.eu`:

- `Zone:Zone:Read`
- `Zone:DNS:Edit`
- `Zone:Zone Settings:Edit`
- `Zone:SSL and Certificates:Edit`
- `Zone:Zone WAF:Edit`
- `Zone:Email Routing Rules:Edit`

Account permissions, scoped only to the Cloudflare account that owns `adclare.eu`:

- `Account:Email Routing Addresses:Edit`
- `Account:Turnstile:Edit`

Optional if we later automate more security settings:

- `Account:Account Rulesets:Edit`
- `Zone:Cache Rules:Edit`

Do not grant:

- `User:API Tokens:Edit`, unless the goal is explicitly to create more tokens.
- Global API Key access.
- Permissions for all zones when only `adclare.eu` is needed.

## Planned Configuration

DNS:

- Done: `A @ -> 46.224.66.79`, proxied.
- Done: `A www -> 46.224.66.79`, proxied.

SSL/TLS:

- Done: SSL/TLS mode is `Full`.
- Later: switch to `Full strict` after the origin certificate path is confirmed.
- Done: Always Use HTTPS is enabled.
- Done: Automatic HTTPS Rewrites is enabled.
- Done: Minimum TLS version is `TLS 1.2`.
- Done: TLS 1.3 is enabled.

Security:

- Done: Cloudflare automatic DDoS protection is active.
- Free plan note: Cloudflare Managed WAF rules require Pro for this zone.
- Later: add one rate limiting rule for login, signup and public contact/demo forms once endpoint paths exist.
- Done: Turnstile widget `Adclare production`.
- Done: Turnstile hostnames are `adclare.eu` and `www.adclare.eu`.
- Done: Turnstile mode is `Managed`.

Turnstile environment variables:

```bash
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAADWL1GxcsZgXYZe1
TURNSTILE_SECRET_KEY=replace_with_cloudflare_turnstile_secret
```

Do not commit the real `TURNSTILE_SECRET_KEY`.

Email Routing:

- Done: Email Routing is enabled for `adclare.eu`.
- Done: required MX/TXT records are configured.
- Done: destination address `lh@aenze.com` is verified in Cloudflare.
- Done: incoming aliases are active:
  - `hello@adclare.eu`
  - `billing@adclare.eu`
  - `support@adclare.eu`
  - `security@adclare.eu`

Catch-all is disabled and drops unmatched addresses.
Cloudflare dashboard may show `Syncing` briefly after DNS changes; external DNS already returns the Cloudflare MX/SPF/DKIM records.

Recommended DMARC record:

| Type | Name | Content |
| --- | --- | --- |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:security@adclare.eu; adkim=s; aspf=s` |

Start with `p=none` to monitor legitimate mail flow. Move to `quarantine` or `reject` only after outbound sending is configured and verified.

Outbound Email:

Cloudflare Email Routing is for inbound forwarding. Transactional sending for magic links, invites and billing emails uses Cloudflare Email Service REST API from the Hetzner app.

Needed in production `.env` after Email Sending is onboarded in Cloudflare:

```bash
EMAIL_FROM='Adclare <noreply@adclare.eu>'
CLOUDFLARE_EMAIL_ACCOUNT_ID='...'
CLOUDFLARE_EMAIL_API_TOKEN='...'
```

Cloudflare Email Service requires Cloudflare DNS and a token with permission to send emails. Until these values are present, invitations are stored in the `email_messages` outbox with status `PENDING_PROVIDER`.

## How To Provide The Token Locally

Preferred local-only approach:

```bash
export CLOUDFLARE_API_TOKEN="..."
```

Then keep the terminal/session local and revoke the token after setup.

Verification:

```bash
curl "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  --header "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
```

## Run The Setup Script

Basic DNS and HTTPS settings:

```bash
npm run cf:setup
```

With Email Routing aliases:

```bash
export EMAIL_DESTINATION="your-real-inbox@example.com"
SETUP_EMAIL_ROUTING=1 npm run cf:setup
```

Default aliases:

- `hello@adclare.eu`
- `billing@adclare.eu`
- `support@adclare.eu`
- `security@adclare.eu`

Override aliases:

```bash
EMAIL_ALIASES="hello,billing,support,security,info" SETUP_EMAIL_ROUTING=1 npm run cf:setup
```

With Turnstile widget creation:

```bash
CREATE_TURNSTILE=1 npm run cf:setup
```

## After Setup

1. Revoke the temporary token.
2. Keep a separate long-lived token only for CI/CD if needed, with narrower permissions.
3. Store production secrets outside Git.
4. Document final DNS, email routing and Turnstile settings.
