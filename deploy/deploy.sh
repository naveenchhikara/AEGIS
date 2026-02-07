#!/usr/bin/env bash
# ==============================================================================
# AEGIS - Deployment Script
# Run on the server to pull latest changes and restart the app
# Usage: bash deploy/deploy.sh
# ==============================================================================

set -euo pipefail

APP_DIR="/home/ubuntu/aegis"
cd "$APP_DIR"

echo "========================================"
echo "  AEGIS Deployment"
echo "  $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "========================================"
echo ""

# ---------- Pull Latest Code ----------
echo "[1/4] Pulling latest code..."
git pull origin main

# ---------- Install Dependencies ----------
echo "[2/4] Installing dependencies..."
pnpm install --frozen-lockfile

# ---------- Build Application ----------
echo "[3/4] Building application..."
pnpm build

# ---------- Create Logs Directory ----------
mkdir -p "$APP_DIR/logs"

# ---------- Restart PM2 ----------
echo "[4/4] Restarting application..."
if pm2 describe aegis > /dev/null 2>&1; then
    pm2 reload ecosystem.config.js --update-env
    echo "  Application reloaded."
else
    pm2 start deploy/ecosystem.config.js
    pm2 save
    echo "  Application started for the first time."
fi

echo ""
echo "========================================"
echo "  Deployment Complete!"
echo "========================================"
echo ""
echo "Status:"
pm2 status aegis
echo ""
echo "Verify: curl -s http://localhost:3000 | head -20"
echo ""
