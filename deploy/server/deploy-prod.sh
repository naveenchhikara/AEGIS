#!/usr/bin/env bash

set -euo pipefail

TAG="${1:?usage: deploy-prod.sh <tag> <git-source> [app-root]}"
SOURCE="${2:?usage: deploy-prod.sh <tag> <git-source> [app-root]}"
APP_ROOT="${3:-/opt/aegis}"
REPO_DIR="${APP_ROOT}/repo"
SHARED_DIR="${APP_ROOT}/shared"
ENV_FILE="${SHARED_DIR}/.env.production"

if [[ ! -d "${REPO_DIR}/.git" ]]; then
  "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/bootstrap-prod.sh" "${SOURCE}" "${APP_ROOT}"
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing production env file: ${ENV_FILE}" >&2
  exit 1
fi

if [[ -f "${SOURCE}" ]]; then
  git -C "${REPO_DIR}" fetch "${SOURCE}" --tags
else
  git -C "${REPO_DIR}" remote set-url origin "${SOURCE}"
  git -C "${REPO_DIR}" fetch --tags origin
fi

git -C "${REPO_DIR}" checkout --force "${TAG}"

docker compose \
  -p aegis \
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

echo "AEGIS health check failed after deploy" >&2
exit 1
