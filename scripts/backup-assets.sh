#!/bin/sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/srv/backups/adclare/assets}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
VOLUME_NAME="${VOLUME_NAME:-adclare_asset_data}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET_BASENAME="adclare-assets-$STAMP.tgz"
TMP_BASENAME=".$TARGET_BASENAME.tmp"

mkdir -p "$BACKUP_DIR"

docker run --rm \
  -v "$VOLUME_NAME:/data/uploads:ro" \
  -v "$BACKUP_DIR:/backup" \
  alpine:3.22 \
  sh -eu -c "tar -czf /backup/$TMP_BASENAME -C /data/uploads ."

mv "$BACKUP_DIR/$TMP_BASENAME" "$BACKUP_DIR/$TARGET_BASENAME"
chmod 600 "$BACKUP_DIR/$TARGET_BASENAME"

find "$BACKUP_DIR" -type f -name 'adclare-assets-*.tgz' -mtime +"$RETENTION_DAYS" -delete

printf '%s\n' "$BACKUP_DIR/$TARGET_BASENAME"
