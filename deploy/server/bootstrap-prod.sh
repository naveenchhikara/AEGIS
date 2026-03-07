#!/usr/bin/env bash

set -euo pipefail

SOURCE="${1:-}"
APP_ROOT="${2:-/opt/aegis}"
REPO_DIR="${APP_ROOT}/repo"
SHARED_DIR="${APP_ROOT}/shared"
ENV_FILE="${SHARED_DIR}/.env.production"
LEGACY_ENV_FILE="${APP_ROOT}/.env.production"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYSTEMD_DIR="$(cd "${SCRIPT_DIR}/../systemd" && pwd)"

mkdir -p "${SHARED_DIR}" /backups

if [[ ! -f "${ENV_FILE}" && -f "${LEGACY_ENV_FILE}" ]]; then
  cp "${LEGACY_ENV_FILE}" "${ENV_FILE}"
fi

if [[ ! -d "${REPO_DIR}/.git" ]]; then
  if [[ -z "${SOURCE}" ]]; then
    echo "Missing git source for initial bootstrap" >&2
    exit 1
  fi

  git clone "${SOURCE}" "${REPO_DIR}"
elif [[ -n "${SOURCE}" ]]; then
  if [[ -f "${SOURCE}" ]]; then
    git -C "${REPO_DIR}" fetch "${SOURCE}" --tags --force
  else
    git -C "${REPO_DIR}" remote set-url origin "${SOURCE}"
    git -C "${REPO_DIR}" fetch --tags --force origin
  fi
fi

ln -sfn "${ENV_FILE}" "${APP_ROOT}/.env.production"
ln -sfn "${ENV_FILE}" "${REPO_DIR}/.env.production"

install -D -m 0644 "${SYSTEMD_DIR}/aegis-backup.service" /etc/systemd/system/aegis-backup.service
install -D -m 0644 "${SYSTEMD_DIR}/aegis-backup.timer" /etc/systemd/system/aegis-backup.timer
systemctl daemon-reload
systemctl enable --now aegis-backup.timer
