# AEGIS Deployment Guide

Production is a git-backed Docker Compose deployment on the VPS behind
Nginx.

## Current Production Layout

- App root: `/opt/aegis`
- Git checkout: `/opt/aegis/repo`
- Production compose: `/opt/aegis/repo/docker-compose.prod.yml`
- Shared secrets: `/opt/aegis/shared/.env.production`
- Compatibility env symlink: `/opt/aegis/.env.production`
- Active release file: `/opt/aegis/shared/current-release`
- Backups: `/backups`
- Public entrypoint: `https://aegis.nexlyadvisory.com`
- Legacy root compose: `/opt/aegis/docker-compose.yml.archived-20260307`

The production stack always runs under the Compose project name
`aegis`.

## Release Flow

1. Merge to `main`
2. Wait for `ci.yml` to pass
3. Create an annotated tag in the `vYYYY.MM.DD.N` format
4. Push the tag
5. `deploy.yml` verifies the tag, creates a git bundle, copies deploy
   helpers to the VPS, and runs the bootstrap/deploy scripts

Deploys use a transported git bundle plus the server scripts in
`deploy/server/`. The VPS does not need direct GitHub credentials.

## One-Time Server Bootstrap

```bash
git bundle create /tmp/aegis.bundle --all
scp /tmp/aegis.bundle vps-admin:/tmp/aegis.bundle
sudo bash deploy/server/bootstrap-prod.sh /tmp/aegis.bundle /opt/aegis
```

Bootstrap creates the repo-backed layout, installs the backup timer, and
ensures both `/opt/aegis/.env.production` and
`/opt/aegis/repo/.env.production` point to the shared env file.

## Manual Deploy

```bash
sudo bash deploy/server/deploy-prod.sh <tag> /tmp/aegis.bundle /opt/aegis
```

## Manual Rollback

```bash
sudo bash deploy/server/rollback-prod.sh <tag> /opt/aegis
```

## Health Verification

```bash
curl -fsS http://127.0.0.1:3000/api/health | jq
docker compose -p aegis \
  --env-file /opt/aegis/shared/.env.production \
  -f /opt/aegis/repo/docker-compose.prod.yml ps
systemctl status aegis-backup.timer --no-pager
cat /opt/aegis/shared/current-release
```

## Notes

- `docker-compose.prod.yml` is the only production compose file
- Shared secrets live outside git
- Backups are systemd-timer driven, not cron driven
- DSEC-04 route is an encrypted LUKS secondary volume for `/var/lib/docker`
- PM2, Dockge, and copied-workspace deploys are not part of the current
  production path
