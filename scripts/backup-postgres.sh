#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-/srv/apps/adclare}"
BACKUP_DIR="${BACKUP_DIR:-/srv/backups/adclare/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

cd "$APP_DIR"

mkdir -p "$BACKUP_DIR"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-adclare}"
POSTGRES_DB="${POSTGRES_DB:-adclare_prod}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET="$BACKUP_DIR/adclare-$STAMP.dump"

docker compose -f "$COMPOSE_FILE" exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$TARGET"
chmod 600 "$TARGET"

find "$BACKUP_DIR" -type f -name 'adclare-*.dump' -mtime +"$RETENTION_DAYS" -delete

printf '%s\n' "$TARGET"
