#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-/srv/apps/adclare}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
RESTORE_FILE="${RESTORE_FILE:-}"
CONFIRM_RESTORE="${CONFIRM_RESTORE:-}"

if [ -z "$RESTORE_FILE" ]; then
  echo "Set RESTORE_FILE=/path/to/adclare.dump" >&2
  exit 1
fi

if [ "$CONFIRM_RESTORE" != "adclare-prod" ]; then
  echo "Refusing restore. Set CONFIRM_RESTORE=adclare-prod to continue." >&2
  exit 1
fi

if [ ! -f "$RESTORE_FILE" ]; then
  echo "Restore file not found: $RESTORE_FILE" >&2
  exit 1
fi

cd "$APP_DIR"

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

POSTGRES_USER="${POSTGRES_USER:-$(env_value POSTGRES_USER)}"
POSTGRES_DB="${POSTGRES_DB:-$(env_value POSTGRES_DB)}"
POSTGRES_USER="${POSTGRES_USER:-adclare}"
POSTGRES_DB="${POSTGRES_DB:-adclare_prod}"

cat "$RESTORE_FILE" | docker compose -f "$COMPOSE_FILE" exec -T db pg_restore \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --clean \
  --if-exists \
  --no-owner

printf 'Restored %s into %s\n' "$RESTORE_FILE" "$POSTGRES_DB"
