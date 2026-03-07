# AEGIS Deployment Guide

Production is a git-backed Docker Compose deployment on the VPS behind Nginx.

## Production Layout

- App root: `/opt/aegis`
- Git clone: `/opt/aegis/repo`
- Shared secrets: `/opt/aegis/shared/.env.production`
- Backups: `/backups`
- Public entrypoint: `https://aegis.nexlyadvisory.com`

## Release Flow

1. Merge to `main`
2. Wait for CI to pass
3. Create an annotated release tag
4. Push the tag
5. GitHub Actions verifies and deploys the tagged commit to the VPS

Deploys use a transported git bundle plus the server scripts in `deploy/server/`. This keeps production tied to exact git commits without requiring the VPS to have direct GitHub credentials.

## One-Time Server Bootstrap

Copy `deploy/server/` and `deploy/systemd/` to the VPS, then run:

```bash
git bundle create /tmp/aegis.bundle --all
scp /tmp/aegis.bundle vps-admin:/tmp/aegis.bundle
sudo bash deploy/server/bootstrap-prod.sh /tmp/aegis.bundle /opt/aegis
```

This will:

- create `/opt/aegis/repo` and `/opt/aegis/shared`
- clone the repo if missing
- copy the legacy `.env.production` into shared storage if needed
- install and enable the `aegis-backup.timer`

## Manual Deploy

```bash
sudo bash deploy/server/deploy-prod.sh v7.0 /tmp/aegis.bundle /opt/aegis
```

## Manual Rollback

```bash
sudo bash deploy/server/rollback-prod.sh v7.0 /opt/aegis
```

## Health Verification

```bash
curl -fsS http://127.0.0.1:3000/api/health | jq
docker compose --env-file /opt/aegis/shared/.env.production -f /opt/aegis/repo/docker-compose.prod.yml ps
systemctl status aegis-backup.timer --no-pager
```

## Notes

- `docker-compose.prod.yml` is the only production compose file.
- Shared secrets live outside git.
- Backups are timer-driven, not cron-driven.
- PM2 is no longer part of the production path.
