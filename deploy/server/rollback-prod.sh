#!/usr/bin/env bash

set -euo pipefail

TAG="${1:?usage: rollback-prod.sh <tag> [app-root]}"
APP_ROOT="${2:-/opt/aegis}"
REPO_DIR="${APP_ROOT}/repo"
SHARED_DIR="${APP_ROOT}/shared"
ENV_FILE="${SHARED_DIR}/.env.production"

if [[ ! -d "${REPO_DIR}/.git" ]]; then
  echo "Missing repo checkout at ${REPO_DIR}" >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing production env file: ${ENV_FILE}" >&2
  exit 1
fi

git -C "${REPO_DIR}" rev-parse --verify "${TAG}" >/dev/null
git -C "${REPO_DIR}" checkout --force "${TAG}"

docker compose \
  --env-file "${ENV_FILE}" \
  -f "${REPO_DIR}/docker-compose.prod.yml" \
  up -d --build

for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null; then
    printf '%s\n' "${TAG}" > "${SHARED_DIR}/current-release"
    exit 0
  fi
  sleep 5
done

echo "AEGIS health check failed after rollback" >&2
exit 1
