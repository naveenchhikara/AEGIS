#!/usr/bin/env bash
# ==============================================================================
# AEGIS - One-time Server Setup Script
# Supports: Hostinger KVM VPS (Ubuntu 24.04 LTS) or AWS Lightsail (Ubuntu 22.04)
# Usage: bash setup.sh
# ==============================================================================
#
# Hostinger VPS Details:
#   IP: 145.223.19.8 | Hostname: srv1324829.hstgr.cloud
#   Data Center: Mumbai (in) — RBI data localization compliant
#   Plan: KVM 2 (2 vCPU, 8 GB RAM, 100 GB SSD)
#
# ==============================================================================

set -euo pipefail

# ---------- Detect deploy user and home dir ----------
DEPLOY_USER="${AEGIS_DEPLOY_USER:-$(whoami)}"
DEPLOY_HOME=$(eval echo "~$DEPLOY_USER")
APP_DIR="${AEGIS_APP_DIR:-$DEPLOY_HOME/aegis}"

echo "========================================"
echo "  AEGIS Server Setup"
echo "  OS: $(lsb_release -ds 2>/dev/null || cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2)"
echo "  User: $DEPLOY_USER"
echo "  App dir: $APP_DIR"
echo "========================================"
echo ""

# ---------- System Update ----------
echo "[1/8] Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# ---------- Install Node.js 22 LTS ----------
echo "[2/8] Installing Node.js 22 LTS..."
if ! command -v node &> /dev/null || [[ "$(node --version)" != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "  Node.js version: $(node --version)"
echo "  npm version: $(npm --version)"

# ---------- Install pnpm ----------
echo "[3/8] Installing pnpm..."
sudo npm install -g pnpm
echo "  pnpm version: $(pnpm --version)"

# ---------- Install PM2 ----------
echo "[4/8] Installing PM2..."
sudo npm install -g pm2
echo "  PM2 version: $(pm2 --version)"

# ---------- Install Docker (optional, for PostgreSQL) ----------
echo "[5/8] Installing Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  sudo systemctl enable docker
  sudo systemctl start docker
  sudo usermod -aG docker "$DEPLOY_USER"
  echo "  Docker installed: $(docker --version)"
else
  echo "  Docker already installed: $(docker --version)"
fi

# ---------- Install Nginx ----------
echo "[6/8] Installing Nginx..."
sudo apt-get install -y nginx
sudo systemctl enable nginx
echo "  Nginx version: $(nginx -v 2>&1)"

# ---------- Install Certbot (for HTTPS) ----------
echo "[7/8] Installing Certbot..."
sudo apt-get install -y certbot python3-certbot-nginx

# ---------- Create App Directory ----------
echo "[8/8] Setting up application directory..."
mkdir -p "$APP_DIR"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"

# ---------- Configure Nginx ----------
echo "Configuring Nginx..."
sudo cp "$APP_DIR/deploy/nginx-aegis.conf" /etc/nginx/sites-available/aegis 2>/dev/null || \
  echo "  Skipped: nginx-aegis.conf not found yet. Run again after cloning the repo."
sudo ln -sf /etc/nginx/sites-available/aegis /etc/nginx/sites-enabled/aegis
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# ---------- Configure UFW Firewall ----------
echo "Configuring firewall..."
sudo apt-get install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
echo "y" | sudo ufw enable
sudo ufw status

# ---------- Configure PM2 Startup ----------
echo "Configuring PM2 startup..."
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u "$DEPLOY_USER" --hp "$DEPLOY_HOME"

echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Clone the AEGIS repo to $APP_DIR"
echo "     git clone https://github.com/naveenchhikara/AEGIS.git $APP_DIR"
echo "  2. Copy .env.example to .env and configure"
echo "     cp $APP_DIR/.env.example $APP_DIR/.env"
echo "  3. Start PostgreSQL with Docker:"
echo "     docker compose -f $APP_DIR/docker-compose.dev.yml up -d"
echo "  4. Install, build, run:"
echo "     cd $APP_DIR && pnpm install --frozen-lockfile && pnpm build"
echo "     pm2 start deploy/ecosystem.config.js && pm2 save"
echo ""
echo "Or run: bash deploy/deploy.sh"
echo ""
