# AEGIS Deployment Guide

Deployment configuration for AWS Lightsail (Ubuntu 22.04 LTS, ap-south-1 Mumbai).

## Files

| File                  | Purpose                                           |
| --------------------- | ------------------------------------------------- |
| `setup.sh`            | One-time server setup (Node.js, pnpm, PM2, Nginx) |
| `ecosystem.config.js` | PM2 process configuration                         |
| `nginx-aegis.conf`    | Nginx reverse proxy configuration                 |
| `deploy.sh`           | Pull, build, and restart deployment script        |

## Prerequisites

- AWS Lightsail instance: Ubuntu 22.04 LTS, $5/month plan
- Region: ap-south-1 (Mumbai) for RBI data localization
- Static IP attached to the instance
- SSH access configured

## First-Time Setup

```bash
# 1. SSH into the instance
ssh -i ~/.ssh/aegis-lightsail.pem ubuntu@STATIC_IP

# 2. Clone the repository
git clone https://github.com/YOUR_ORG/aegis.git /home/ubuntu/aegis

# 3. Run the setup script
cd /home/ubuntu/aegis
bash deploy/setup.sh

# 4. Install dependencies and build
pnpm install --frozen-lockfile
pnpm build

# 5. Start the application
pm2 start deploy/ecosystem.config.js
pm2 save

# 6. Verify
curl http://localhost:3000
```

## Subsequent Deployments

```bash
ssh -i ~/.ssh/aegis-lightsail.pem ubuntu@STATIC_IP
cd /home/ubuntu/aegis
bash deploy/deploy.sh
```

## Useful Commands

```bash
# Application status
pm2 status aegis

# View logs
pm2 logs aegis --lines 50

# Restart application
pm2 restart aegis

# Nginx status
sudo systemctl status nginx

# Test Nginx config
sudo nginx -t

# View Nginx error log
sudo tail -f /var/log/nginx/error.log
```

## Architecture

```
Internet -> Lightsail Static IP -> Nginx (:80) -> Next.js (:3000 via PM2)
```

- Nginx handles: SSL termination (future), compression, static asset caching, security headers
- PM2 handles: Process management, auto-restart, log rotation
- Next.js handles: Server-side rendering, API routes, static pages

## Adding HTTPS (Future)

```bash
# After pointing a domain to the static IP:
sudo certbot --nginx -d yourdomain.com
```

Certbot is pre-installed by `setup.sh` and will auto-configure Nginx for HTTPS.
