# AEGIS Release Checklist

## Before Tagging

- `git status` is clean
- `main` is up to date with origin
- CI is green on the commit to release
- No unreviewed env changes are pending
- No schema change requires manual intervention
- Release tag follows `vYYYY.MM.DD.N`

## Before Deploy

- Production backup timer is healthy
- Latest backup completed successfully
- `.env.production` is present at `/opt/aegis/shared/.env.production`
- `/opt/aegis/.env.production` resolves to the shared env file
- Release tag points to the exact commit intended for production

## After Deploy

- `curl -fsS http://127.0.0.1:3000/api/health`
- `docker compose -p aegis ... ps` shows healthy services
- `systemctl status aegis-backup.timer`
- `/opt/aegis/shared/current-release` matches the deployed tag
- `docker logs aegis-app --tail 50` has no new critical errors
- One backup run completes locally and uploads to S3 when credentials are in scope
- Rollback tag is known before the change window closes
