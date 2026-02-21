#!/usr/bin/env bash
# AEGIS PostgreSQL Backup Script
# Creates compressed pg_dump, uploads to S3, prunes old local copies.
# Usage: ./deploy/backup.sh
# Cron:  0 2 * * * cd /path/to/aegis && ./deploy/backup.sh >> /var/log/aegis-backup.log 2>&1

set -euo pipefail

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_DIR}/.env.production"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
CONTAINER_NAME="${CONTAINER_NAME:-aegis-postgres}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILENAME="aegis-${TIMESTAMP}.sql.gz"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

# --- Load Environment ---
if [[ ! -f "$ENV_FILE" ]]; then
  error "Environment file not found: $ENV_FILE"
  exit 1
fi

# shellcheck source=/dev/null
source "$ENV_FILE"

# Validate required variables
for var in POSTGRES_USER POSTGRES_DB; do
  if [[ -z "${!var:-}" ]]; then
    error "Required variable $var is not set in $ENV_FILE"
    exit 1
  fi
done

# S3 upload is optional — warn if not configured
S3_ENABLED=true
for var in S3_BUCKET_NAME AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_REGION; do
  if [[ -z "${!var:-}" ]]; then
    log "WARNING: $var not set — S3 upload will be skipped"
    S3_ENABLED=false
    break
  fi
done

# --- Create Backup Directory ---
mkdir -p "$BACKUP_DIR"

# --- Create Backup ---
log "Starting backup: $BACKUP_FILENAME"
log "Database: $POSTGRES_DB | Container: $CONTAINER_NAME"

BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"

if ! docker exec "$CONTAINER_NAME" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip > "$BACKUP_PATH"; then
  error "pg_dump failed"
  rm -f "$BACKUP_PATH"
  exit 1
fi

# Verify backup is non-empty
BACKUP_SIZE=$(stat -f%z "$BACKUP_PATH" 2>/dev/null || stat -c%s "$BACKUP_PATH" 2>/dev/null || echo "0")
if [[ "$BACKUP_SIZE" -eq 0 ]]; then
  error "Backup file is empty: $BACKUP_PATH"
  rm -f "$BACKUP_PATH"
  exit 1
fi

log "Backup created: $BACKUP_PATH ($(numfmt --to=iec "$BACKUP_SIZE" 2>/dev/null || echo "${BACKUP_SIZE} bytes"))"

# --- Upload to S3 ---
if [[ "$S3_ENABLED" == "true" ]]; then
  log "Uploading to S3: s3://${S3_BUCKET_NAME}/backups/${BACKUP_FILENAME}"

  if ! aws s3 cp "$BACKUP_PATH" "s3://${S3_BUCKET_NAME}/backups/${BACKUP_FILENAME}" \
    --sse AES256 \
    --region "$AWS_REGION" \
    --quiet; then
    error "S3 upload failed"
    exit 1
  fi

  log "S3 upload complete"
else
  log "S3 upload skipped (credentials not configured)"
fi

# --- Prune Old Local Backups ---
PRUNED=$(find "$BACKUP_DIR" -name "aegis-*.sql.gz" -mtime +"$RETENTION_DAYS" -print -delete | wc -l)
if [[ "$PRUNED" -gt 0 ]]; then
  log "Pruned $PRUNED local backup(s) older than $RETENTION_DAYS days"
fi

# --- Summary ---
log "Backup complete: $BACKUP_FILENAME"
LOCAL_COUNT=$(find "$BACKUP_DIR" -name "aegis-*.sql.gz" | wc -l)
log "Local backups retained: $LOCAL_COUNT"

exit 0
