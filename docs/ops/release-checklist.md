# AEGIS Release Checklist

## Before Tagging

- `git status` is clean
- `main` is up to date with origin
- CI is green on the commit to release
- No unreviewed env changes are pending
- No schema change requires manual intervention

## Before Deploy

- Production backup timer is healthy
- Latest backup completed successfully
- `.env.production` is present at `/opt/aegis/shared/.env.production`
- Release tag points to the exact commit intended for production

## After Deploy

- `curl -fsS http://127.0.0.1:3000/api/health`
- `docker compose ... ps` shows healthy services
- `systemctl status aegis-backup.timer`
- `docker logs aegis-app --tail 50` has no new critical errors
- Rollback tag is known before the change window closes
