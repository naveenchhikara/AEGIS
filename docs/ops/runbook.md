# AEGIS Ops Runbook

## Production Paths

- Repo: `/opt/aegis/repo`
- Shared env: `/opt/aegis/shared/.env.production`
- Backups: `/backups`

## Bootstrap

```bash
git bundle create /tmp/aegis.bundle --all
scp /tmp/aegis.bundle vps-admin:/tmp/aegis.bundle
sudo bash deploy/server/bootstrap-prod.sh /tmp/aegis.bundle /opt/aegis
```

## Deploy

```bash
sudo bash deploy/server/deploy-prod.sh <tag> /tmp/aegis.bundle /opt/aegis
```

## Rollback

```bash
sudo bash deploy/server/rollback-prod.sh <tag> /opt/aegis
```

## Backup

```bash
systemctl status aegis-backup.timer --no-pager
sudo /opt/aegis/repo/deploy/backup.sh
```

## Restore

```bash
AEGIS_SHARED_DIR=/opt/aegis/shared sudo /opt/aegis/repo/deploy/restore.sh --list
AEGIS_SHARED_DIR=/opt/aegis/shared sudo /opt/aegis/repo/deploy/restore.sh <backup-file>
```

## Health

```bash
curl -fsS http://127.0.0.1:3000/api/health | jq
docker compose --env-file /opt/aegis/shared/.env.production -f /opt/aegis/repo/docker-compose.prod.yml ps
```
