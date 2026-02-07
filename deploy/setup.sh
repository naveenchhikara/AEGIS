#!/usr/bin/env bash
# ==============================================================================
# AEGIS - One-time Server Setup Script
# Run on a fresh Ubuntu 22.04 LTS instance (AWS Lightsail)
# Usage: bash setup.sh
# ==============================================================================

set -euo pipefail

echo "========================================"
echo "  AEGIS Server Setup"
echo "  Target: Ubuntu 22.04 LTS"
echo "  Region: ap-south-1 (Mumbai)"
echo "========================================"
echo ""

# ---------- System Update ----------
echo "[1/7] Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# ---------- Install Node.js 20 LTS ----------
echo "[2/7] Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "  Node.js version: $(node --version)"
echo "  npm version: $(npm --version)"

# ---------- Install pnpm ----------
echo "[3/7] Installing pnpm..."
sudo npm install -g pnpm
echo "  pnpm version: $(pnpm --version)"

# ---------- Install PM2 ----------
echo "[4/7] Installing PM2..."
sudo npm install -g pm2
echo "  PM2 version: $(pm2 --version)"

# ---------- Install Nginx ----------
echo "[5/7] Installing Nginx..."
sudo apt-get install -y nginx
sudo systemctl enable nginx
echo "  Nginx version: $(nginx -v 2>&1)"

# ---------- Install Certbot (for future HTTPS) ----------
echo "[6/7] Installing Certbot..."
sudo apt-get install -y certbot python3-certbot-nginx

# ---------- Create App Directory ----------
echo "[7/7] Setting up application directory..."
APP_DIR="/home/ubuntu/aegis"
mkdir -p "$APP_DIR"
chown -R ubuntu:ubuntu "$APP_DIR"

# ---------- Configure Nginx ----------
echo "Configuring Nginx..."
sudo cp /home/ubuntu/aegis/deploy/nginx-aegis.conf /etc/nginx/sites-available/aegis
sudo ln -sf /etc/nginx/sites-available/aegis /etc/nginx/sites-enabled/aegis
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# ---------- Configure PM2 Startup ----------
echo "Configuring PM2 startup..."
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Clone/copy the AEGIS project to $APP_DIR"
echo "  2. cd $APP_DIR && pnpm install --frozen-lockfile"
echo "  3. pnpm build"
echo "  4. pm2 start deploy/ecosystem.config.js"
echo "  5. pm2 save"
echo ""
echo "Or run: bash deploy/deploy.sh"
echo ""
