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

## Backup & Disaster Recovery

### Overview

AEGIS uses automated `pg_dump` backups with offsite S3 storage. The S3 bucket has a lifecycle policy:

- **Local:** 7 days (pruned automatically by backup script)
- **S3 Standard:** 30 days (then transitions to Glacier)
- **S3 Glacier:** 60 more days (90 days total, then expired)

### Files

| File                | Purpose                                              |
| ------------------- | ---------------------------------------------------- |
| `deploy/backup.sh`  | Automated pg_dump + gzip + S3 upload + local pruning |
| `deploy/restore.sh` | Download from S3 + database restore + verification   |

### Initial Setup

```bash
# 1. Install AWS CLI on VPS
sudo apt update && sudo apt install -y awscli

# 2. Create local backup directory
sudo mkdir -p /backups
sudo chown $(whoami):$(whoami) /backups

# 3. Verify AWS credentials are in .env.production
#    Required: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET_NAME
grep -E "^(AWS_|S3_)" .env.production

# 4. Test backup manually
./deploy/backup.sh

# 5. Verify S3 upload
aws s3 ls s3://${S3_BUCKET_NAME}/backups/

# 6. Set up daily cron job (runs at 02:00 IST)
(crontab -l 2>/dev/null; echo "0 2 * * * cd $(pwd) && ./deploy/backup.sh >> /var/log/aegis-backup.log 2>&1") | crontab -

# 7. Verify cron is registered
crontab -l
```

### Manual Backup

```bash
# Run backup now
./deploy/backup.sh

# Check local backups
ls -lh /backups/

# Check S3 backups
aws s3 ls s3://${S3_BUCKET_NAME}/backups/
```

### Restore Procedure

```bash
# 1. List available backups (local + S3)
./deploy/restore.sh --list

# 2. Stop the application
docker compose -f docker-compose.prod.yml stop app

# 3. Restore from backup (downloads from S3 if not local)
./deploy/restore.sh aegis-20260221-020000.sql.gz

# 4. Run schema push if migrations were added since the backup
docker exec aegis-app npx prisma db push

# 5. Start the application
docker compose -f docker-compose.prod.yml start app

# 6. Verify health
curl -s http://127.0.0.1:3000/api/health | python3 -m json.tool
```

### Monitoring

```bash
# Check backup log
tail -f /var/log/aegis-backup.log

# Check last backup time
ls -lt /backups/ | head -5

# Check cron is running
grep -i backup /var/log/syslog | tail -5

# Check S3 for recent uploads
aws s3 ls s3://${S3_BUCKET_NAME}/backups/ --human-readable | tail -5
```

### Troubleshooting

| Issue                     | Resolution                                                      |
| ------------------------- | --------------------------------------------------------------- |
| `pg_dump failed`          | Check `docker ps` — is `aegis-postgres` running?                |
| `S3 upload failed`        | Verify AWS credentials in `.env.production` and IAM permissions |
| `Backup file is empty`    | Check disk space: `df -h /backups`                              |
| `Restore: 0 tables found` | Backup may be corrupted — try a different backup file           |
| `Cron not running`        | Check `crontab -l` and `/var/log/syslog` for cron entries       |
