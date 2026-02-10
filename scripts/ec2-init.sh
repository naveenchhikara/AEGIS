#!/bin/bash
# =============================================================================
# AEGIS - EC2 Instance Bootstrap (User Data)
# =============================================================================
# Runs once on first boot. Installs Coolify (which installs Docker, Traefik,
# and the Coolify management platform).
#
# After boot, access Coolify at http://<ELASTIC_IP>:8000 to:
#   1. Create admin account
#   2. Add GitHub repo as a project
#   3. Configure PostgreSQL as a database resource
#   4. Set environment variables
#   5. Deploy with one click (auto-deploys on git push)
# =============================================================================
set -euo pipefail

echo "=== AEGIS EC2 Bootstrap Starting ==="

# --- System updates ---
yum update -y

# --- Install Coolify (installs Docker, Docker Compose, Traefik, etc.) ---
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# --- Install AWS CLI (for S3 evidence uploads via IAM instance role) ---
yum install -y aws-cli

echo "=== AEGIS EC2 Bootstrap Complete ==="
echo "Access Coolify at http://<YOUR_ELASTIC_IP>:8000"
