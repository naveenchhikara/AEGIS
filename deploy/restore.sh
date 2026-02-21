#!/usr/bin/env bash
# AEGIS PostgreSQL Restore Script
# Downloads backup from S3 (if needed) and restores into PostgreSQL.
# Usage: ./deploy/restore.sh <backup-filename>
#        ./deploy/restore.sh --list

set -euo pipefail

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_DIR}/.env.production"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
CONTAINER_NAME="${CONTAINER_NAME:-aegis-postgres}"

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

for var in POSTGRES_USER POSTGRES_DB; do
  if [[ -z "${!var:-}" ]]; then
    error "Required variable $var is not set in $ENV_FILE"
    exit 1
  fi
done

S3_ENABLED=true
for var in S3_BUCKET_NAME AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_REGION; do
  if [[ -z "${!var:-}" ]]; then
    S3_ENABLED=false
    break
  fi
done

# --- List Backups ---
list_backups() {
  echo ""
  echo "=== Local Backups (${BACKUP_DIR}) ==="
  if [[ -d "$BACKUP_DIR" ]]; then
    local count
    count=$(find "$BACKUP_DIR" -name "aegis-*.sql.gz" 2>/dev/null | wc -l)
    if [[ "$count" -gt 0 ]]; then
      find "$BACKUP_DIR" -name "aegis-*.sql.gz" -exec ls -lh {} \; | sort -k9
    else
      echo "  (none)"
    fi
  else
    echo "  (directory does not exist)"
  fi

  echo ""
  echo "=== S3 Backups ==="
  if [[ "$S3_ENABLED" == "true" ]]; then
    aws s3 ls "s3://${S3_BUCKET_NAME}/backups/" --region "$AWS_REGION" 2>/dev/null || echo "  (unable to list — check credentials)"
  else
    echo "  (S3 not configured)"
  fi
  echo ""
}

# --- Handle --list flag ---
if [[ "${1:-}" == "--list" ]]; then
  list_backups
  exit 0
fi

# --- Validate Arguments ---
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup-filename>"
  echo "       $0 --list"
  echo ""
  echo "Examples:"
  echo "  $0 aegis-20260221-020000.sql.gz"
  echo "  $0 --list"
  exit 1
fi

FILENAME="$1"
BACKUP_PATH="${BACKUP_DIR}/${FILENAME}"

# --- Download from S3 if not local ---
if [[ ! -f "$BACKUP_PATH" ]]; then
  if [[ "$S3_ENABLED" == "true" ]]; then
    log "Backup not found locally. Downloading from S3..."
    mkdir -p "$BACKUP_DIR"

    if ! aws s3 cp "s3://${S3_BUCKET_NAME}/backups/${FILENAME}" "$BACKUP_PATH" \
      --region "$AWS_REGION" \
      --quiet; then
      error "Failed to download from S3: $FILENAME"
      exit 1
    fi

    log "Downloaded: $BACKUP_PATH"
  else
    error "Backup file not found: $BACKUP_PATH (S3 not configured for remote download)"
    exit 1
  fi
fi

# Verify file exists and is non-empty
BACKUP_SIZE=$(stat -f%z "$BACKUP_PATH" 2>/dev/null || stat -c%s "$BACKUP_PATH" 2>/dev/null || echo "0")
if [[ "$BACKUP_SIZE" -eq 0 ]]; then
  error "Backup file is empty: $BACKUP_PATH"
  exit 1
fi

# --- Confirmation ---
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  WARNING: DATABASE RESTORE                      ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  This will:                                     ║"
echo "║  1. DROP the database: ${POSTGRES_DB}"
echo "║  2. Recreate it from: ${FILENAME}"
echo "║  3. ALL current data will be LOST               ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
read -rp "Type 'RESTORE' to confirm: " CONFIRM

if [[ "$CONFIRM" != "RESTORE" ]]; then
  log "Restore cancelled by user"
  exit 0
fi

# --- Stop Application (if running) ---
log "Checking if application container is running..."
if docker ps --format '{{.Names}}' | grep -q "aegis-app"; then
  log "Stopping aegis-app to prevent connections during restore..."
  docker stop aegis-app 2>/dev/null || true
  APP_WAS_RUNNING=true
else
  APP_WAS_RUNNING=false
fi

# --- Terminate Active Connections ---
log "Terminating active connections to $POSTGRES_DB..."
docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();" \
  2>/dev/null || true

# --- Drop and Recreate Database ---
log "Dropping database: $POSTGRES_DB"
docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d postgres -c \
  "DROP DATABASE IF EXISTS \"${POSTGRES_DB}\";"

log "Creating database: $POSTGRES_DB"
docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d postgres -c \
  "CREATE DATABASE \"${POSTGRES_DB}\";"

# --- Restore from Backup ---
log "Restoring from: $FILENAME"
if ! gunzip -c "$BACKUP_PATH" | docker exec -i "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" > /dev/null 2>&1; then
  error "Restore command returned errors (some may be harmless role/extension warnings)"
fi

# --- Verify Restore ---
log "Verifying restore..."
TABLE_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

if [[ "$TABLE_COUNT" -gt 0 ]]; then
  log "Restore verified: $TABLE_COUNT tables found in public schema"
else
  error "Restore verification failed: 0 tables found"
  exit 1
fi

# --- Restart Application ---
if [[ "$APP_WAS_RUNNING" == "true" ]]; then
  log "Restarting aegis-app..."
  docker start aegis-app 2>/dev/null || log "WARNING: Could not restart aegis-app — start manually"
fi

# --- Summary ---
echo ""
log "Restore complete"
log "  Database: $POSTGRES_DB"
log "  Source:   $FILENAME"
log "  Tables:   $TABLE_COUNT"
echo ""
log "Next steps:"
log "  1. Verify app health: curl http://127.0.0.1:3000/api/health"
log "  2. Run migrations if schema changed: docker exec aegis-app npx prisma db push"
log "  3. Check application logs: docker logs aegis-app --tail 50"

exit 0
