#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-/srv/apps/adclare}"
HEALTH_URL="${HEALTH_URL:-https://adclare.eu/api/health}"
STATE_DIR="${STATE_DIR:-/var/lib/adclare-monitor}"
ALERT_EMAIL="${UPTIME_ALERT_EMAIL:-${ALERT_EMAIL:-}}"
ALERT_SUBJECT_PREFIX="${ALERT_SUBJECT_PREFIX:-Adclare uptime}"
STATUS_FILE="$STATE_DIR/health-down"

cd "$APP_DIR"
mkdir -p "$STATE_DIR"

env_value() {
  key="$1"

  if [ ! -f .env ]; then
    return 0
  fi

  awk -F= -v key="$key" '
    $1 == key {
      value = substr($0, index($0, "=") + 1)
      gsub(/^'\''|'\''$/, "", value)
      gsub(/^"|"$/, "", value)
      print value
      exit
    }
  ' .env
}

EMAIL_FROM="${EMAIL_FROM:-$(env_value EMAIL_FROM)}"
CLOUDFLARE_EMAIL_ACCOUNT_ID="${CLOUDFLARE_EMAIL_ACCOUNT_ID:-$(env_value CLOUDFLARE_EMAIL_ACCOUNT_ID)}"
CLOUDFLARE_EMAIL_API_TOKEN="${CLOUDFLARE_EMAIL_API_TOKEN:-$(env_value CLOUDFLARE_EMAIL_API_TOKEN)}"
ALERT_EMAIL="${ALERT_EMAIL:-$(env_value UPTIME_ALERT_EMAIL)}"
ALERT_EMAIL="${ALERT_EMAIL:-$(env_value SUPPORT_EMAIL)}"

send_alert() {
  subject="$1"
  body="$2"

  if [ -z "$ALERT_EMAIL" ] || [ -z "$EMAIL_FROM" ] || [ -z "$CLOUDFLARE_EMAIL_ACCOUNT_ID" ] || [ -z "$CLOUDFLARE_EMAIL_API_TOKEN" ]; then
    printf '%s\n' "Alert not sent: missing email configuration."
    return 0
  fi

  export ALERT_TO="$ALERT_EMAIL"
  export ALERT_FROM="$EMAIL_FROM"
  export ALERT_SUBJECT="$subject"
  export ALERT_BODY="$body"
  export CF_ACCOUNT_ID="$CLOUDFLARE_EMAIL_ACCOUNT_ID"
  export CF_EMAIL_TOKEN="$CLOUDFLARE_EMAIL_API_TOKEN"

  python3 - <<'PY'
import json
import os
import sys
import urllib.request

payload = {
    "from": os.environ["ALERT_FROM"],
    "to": os.environ["ALERT_TO"],
    "subject": os.environ["ALERT_SUBJECT"],
    "text": os.environ["ALERT_BODY"],
    "html": "<pre>{}</pre>".format(os.environ["ALERT_BODY"].replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")),
}
request = urllib.request.Request(
    "https://api.cloudflare.com/client/v4/accounts/{}/email/sending/send".format(os.environ["CF_ACCOUNT_ID"]),
    data=json.dumps(payload).encode("utf-8"),
    headers={
        "Authorization": "Bearer {}".format(os.environ["CF_EMAIL_TOKEN"]),
        "Content-Type": "application/json",
    },
    method="POST",
)

try:
    with urllib.request.urlopen(request, timeout=20) as response:
        result = json.loads(response.read().decode("utf-8") or "{}")
except Exception as exc:
    print("Alert send failed: {}".format(exc), file=sys.stderr)
    sys.exit(1)

if not result.get("success", False):
    print("Alert send failed: {}".format(result.get("errors", result)), file=sys.stderr)
    sys.exit(1)
PY
}

checked_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
response="$(curl -fsS --max-time 20 "$HEALTH_URL" 2>&1)" || {
  if [ ! -f "$STATUS_FILE" ]; then
    printf '%s\n' "$checked_at" > "$STATUS_FILE"
    send_alert "[$ALERT_SUBJECT_PREFIX] DOWN" "Health check failed at $checked_at\nURL: $HEALTH_URL\nError: $response"
  fi
  printf '%s\n' "DOWN $checked_at $HEALTH_URL"
  exit 1
}

if ! printf '%s' "$response" | grep -q '"ok":true'; then
  if [ ! -f "$STATUS_FILE" ]; then
    printf '%s\n' "$checked_at" > "$STATUS_FILE"
    send_alert "[$ALERT_SUBJECT_PREFIX] DOWN" "Health check returned unexpected response at $checked_at\nURL: $HEALTH_URL\nResponse: $response"
  fi
  printf '%s\n' "DOWN $checked_at $HEALTH_URL"
  exit 1
fi

if [ -f "$STATUS_FILE" ]; then
  down_since="$(cat "$STATUS_FILE" 2>/dev/null || true)"
  rm -f "$STATUS_FILE"
  send_alert "[$ALERT_SUBJECT_PREFIX] RECOVERED" "Health check recovered at $checked_at\nURL: $HEALTH_URL\nPrevious down state: $down_since\nResponse: $response"
fi

printf '%s\n' "OK $checked_at $HEALTH_URL"
