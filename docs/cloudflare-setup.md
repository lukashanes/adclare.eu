# Cloudflare Setup

This guide describes optional Cloudflare configuration for a self-hosted Adclare instance.

Cloudflare is not required to run Adclare, but it is a practical option for DNS, TLS proxying, basic edge security, Turnstile and inbound email aliases.

## Inputs

Choose these values before running the setup:

| Variable | Example | Purpose |
| --- | --- | --- |
| `CF_ZONE_NAME` | `adclare.example.org` | Cloudflare zone/domain to configure. |
| `ORIGIN_IPV4` | `203.0.113.10` | Public IPv4 address of the server. |
| `CF_SSL_MODE` | `strict` | Cloudflare API value for SSL/TLS mode `Full strict`. |
| `EMAIL_DESTINATION` | `admin@example.org` | Verified inbox for Email Routing aliases. |

Use your own domain and server address. Do not reuse the example values in production.

## API Token

Create a custom Cloudflare API token:

`My Profile -> API Tokens -> Create Token -> Custom token`

Recommended token rules:

- Set a short expiration for setup work.
- Scope the token only to the target zone.
- Restrict by client IP if practical.
- Revoke the token after setup.

Do not paste Cloudflare passwords, 2FA codes, recovery codes, Global API keys or long-lived tokens into chat, issues or documentation.

### Permissions

Zone permissions:

- `Zone:Zone:Read`
- `Zone:DNS:Edit`
- `Zone:Zone Settings:Edit`
- `Zone:SSL and Certificates:Edit`
- `Zone:Zone WAF:Edit`
- `Zone:Email Routing Rules:Edit`

Account permissions:

- `Account:Email Routing Addresses:Edit`
- `Account:Turnstile:Edit`

Optional if you manage more edge rules through automation:

- `Account:Account Rulesets:Edit`
- `Zone:Cache Rules:Edit`

Do not grant:

- Global API Key access.
- Permissions for all zones when one zone is enough.
- `User:API Tokens:Edit`, unless you are intentionally automating token management.

## DNS And TLS

Create proxied A records:

| Type | Name | Value | Proxy |
| --- | --- | --- | --- |
| A | `@` | `ORIGIN_IPV4` | Proxied |
| A | `www` | `ORIGIN_IPV4` | Proxied |

Recommended Cloudflare settings:

- SSL/TLS mode: `Full strict`.
- Always Use HTTPS: enabled.
- Automatic HTTPS Rewrites: enabled.
- Minimum TLS version: `TLS 1.2`.
- TLS 1.3: enabled.

`Full strict` requires a valid certificate on the origin server. Use a Cloudflare Origin Certificate or a publicly trusted certificate.

## Turnstile

Create a Turnstile widget for:

- your root domain,
- optional `www` hostname.

Add these values to the production `.env`:

```bash
TURNSTILE_SITE_KEY=...
NEXT_PUBLIC_TURNSTILE_SITE_KEY=...
TURNSTILE_SECRET_KEY=...
TURNSTILE_REQUIRED=1
TURNSTILE_ALLOWED_HOSTNAMES=adclare.example.org,www.adclare.example.org
```

Do not commit the real `TURNSTILE_SECRET_KEY`.

## Email Routing

Cloudflare Email Routing can forward inbound aliases such as:

- `hello@your-domain`
- `support@your-domain`
- `security@your-domain`

Recommended DMARC record:

| Type | Name | Content |
| --- | --- | --- |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:security@your-domain; adkim=s; aspf=s` |

Start with `p=none` to monitor legitimate mail flow. Move to `quarantine` or `reject` only after outbound sending is configured and verified.

Cloudflare Email Routing is for inbound forwarding. Transactional login and invitation email uses Cloudflare Email Service REST API from the app.

Production `.env` values for outbound email:

```bash
EMAIL_FROM='Adclare <noreply@adclare.example.org>'
CLOUDFLARE_EMAIL_ACCOUNT_ID='...'
CLOUDFLARE_EMAIL_API_TOKEN='...'
```

Until those values are present, invitations are stored in the `email_messages` outbox with status `PENDING_PROVIDER`.

## Run The Setup Script

Export a temporary API token:

```bash
export CLOUDFLARE_API_TOKEN="..."
export CF_ZONE_NAME="adclare.example.org"
export ORIGIN_IPV4="203.0.113.10"
export CF_SSL_MODE="strict"
```

Verify the token:

```bash
curl "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  --header "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
```

Configure DNS and HTTPS settings:

```bash
npm run cf:setup
```

Configure Email Routing aliases:

```bash
export EMAIL_DESTINATION="admin@example.org"
SETUP_EMAIL_ROUTING=1 npm run cf:setup
```

Override aliases:

```bash
EMAIL_ALIASES="hello,support,security,info" SETUP_EMAIL_ROUTING=1 npm run cf:setup
```

Create or update a Turnstile widget:

```bash
CREATE_TURNSTILE=1 TURNSTILE_WIDGET_NAME="Adclare self-hosted" npm run cf:setup
```

## Object Storage

Ad files are uploaded through the application server into a private S3-compatible bucket. Hetzner Object Storage works through the S3 API:

```bash
OBJECT_STORAGE_ENDPOINT=https://fsn1.your-objectstorage.com
OBJECT_STORAGE_REGION=fsn1
OBJECT_STORAGE_BUCKET=adclare-assets
OBJECT_STORAGE_ACCESS_KEY_ID=...
OBJECT_STORAGE_SECRET_ACCESS_KEY=...
OBJECT_STORAGE_FORCE_PATH_STYLE=0
MAX_AD_ASSET_UPLOAD_MB=50
```

Use the location shown by your provider, for example `fsn1`, `nbg1` or `hel1` for Hetzner.

## After Setup

1. Revoke the temporary API token.
2. Store production secrets outside Git.
3. Keep operational notes outside the public repository when they contain real server addresses, credentials or customer-specific routing.
