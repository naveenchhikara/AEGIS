# AEGIS Ops Runbook

## Production Paths

- App root: `/opt/aegis`
- Repo: `/opt/aegis/repo`
- Shared env: `/opt/aegis/shared/.env.production`
- Legacy env path: `/opt/aegis/.env.production`
- Current release file: `/opt/aegis/shared/current-release`
- Backups: `/backups`
- Legacy root compose archive: `/opt/aegis/docker-compose.yml.archived-20260307`

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

After a successful deploy, verify:

```bash
cat /opt/aegis/shared/current-release
```

## Rollback

```bash
sudo bash deploy/server/rollback-prod.sh <tag> /opt/aegis
cat /opt/aegis/shared/current-release
```

## Backup

```bash
systemctl status aegis-backup.timer --no-pager
sudo systemctl start aegis-backup.service
sudo journalctl -u aegis-backup.service -n 50 --no-pager
ls -lt /backups | head
```

## Restore

```bash
AEGIS_SHARED_DIR=/opt/aegis/shared sudo /opt/aegis/repo/deploy/restore.sh --list
AEGIS_SHARED_DIR=/opt/aegis/shared sudo /opt/aegis/repo/deploy/restore.sh <backup-file>
```

## Encryption at Rest (DSEC-04)

Decision: use a dedicated **LUKS-encrypted secondary volume** for Docker
data (`/var/lib/docker`). This protects the PostgreSQL Docker volume at
rest without waiting for full host reprovisioning.

Post-change verification:

```bash
lsblk -f | grep -i crypt
findmnt /var/lib/docker
docker info --format '{{ .DockerRootDir }}'
cryptsetup status /dev/mapper/aegis-docker-data
```

## Health

```bash
curl -fsS http://127.0.0.1:3000/api/health | jq
docker compose -p aegis \
  --env-file /opt/aegis/shared/.env.production \
  -f /opt/aegis/repo/docker-compose.prod.yml ps
systemctl status aegis-backup.timer --no-pager
```

## Current Verified Baseline

- Repo-backed compose deployment is active
- `aegis-app` is loopback-only on `127.0.0.1:3000`
- `aegis-postgres` is internal-only and not host-published
- Shared env is the canonical secret source
- S3 backup uploads are working
