#!/usr/bin/env bash
# AEGIS — Cloud Agent start phase.
# Per-boot reconciliation: ensure the local .env exists and PostgreSQL is up.
# Dependency install, schema, and seeding live in install.sh (not here).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PGVER=16
DB_PORT=5432

# Regenerate the gitignored dev .env if a fresh checkout dropped it.
if [ ! -f "$REPO_ROOT/.env" ]; then
  cat > "$REPO_ROOT/.env" <<ENV
POSTGRES_USER=aegis
POSTGRES_PASSWORD=aegis_dev_password
POSTGRES_DB=aegis
POSTGRES_PORT=${DB_PORT}
DATABASE_URL=postgresql://aegis:aegis_dev_password@localhost:${DB_PORT}/aegis
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
BETTER_AUTH_URL=http://localhost:3000
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_TELEMETRY_DISABLED=1
ENV
fi

# Start the cluster (no-op if already running) and wait until it accepts connections.
sudo pg_ctlcluster "$PGVER" main start 2>/dev/null || true
for _ in $(seq 1 30); do
  if pg_isready -q -h localhost -p "$DB_PORT"; then
    echo "PostgreSQL is ready on port ${DB_PORT}."
    exit 0
  fi
  sleep 1
done

echo "PostgreSQL did not become ready on port ${DB_PORT}." >&2
exit 1
