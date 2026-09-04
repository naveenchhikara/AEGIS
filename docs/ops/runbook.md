# AEGIS Ops Runbook

**Production Environment:** Coolify (self-hosted PaaS) on shared VPS  
**Last Verified:** 2026-08-23 (VPS migration to Coolify complete)  
**Access:** Tailscale SSH to `vps` host (public :22 is filtered)

---

## Quick Health Check

```bash
# From local machine (requires Tailscale)
curl -fsS https://aegis.nexlyadvisory.com/api/health | jq

# Or via VPS SSH:
ssh vps 'curl -fsS http://127.0.0.1:3000/api/health | jq'
```

Expected output: `{ "status": "healthy", "database": "ok", "queue": "ok" }`

---

## Deployment

**Merge to `main` triggers auto-deploy in Coolify.** No manual action needed.

1. Open a PR, verify CI passes
2. Merge to `main` on GitHub
3. Coolify builds and releases automatically (1–2 minutes)
4. Verify health at `https://aegis.nexlyadvisory.com/api/health`

**SQL migrations:** Applied by hand to Coolify-managed Postgres *before* or *with* the code merge.
See CLAUDE.md § "SQL migrations do not ride along with a deploy."

---

## Container & Database Inspection

```bash
# List AEGIS container
ssh vps 'sudo docker ps --filter name=nil0nfvohfrgehgjxdv1g2xc'

# Container logs (last 50 lines)
ssh vps 'sudo docker logs -n 50 <container-id>'

# Connect to Postgres
ssh vps 'sudo docker exec -it ii2dkkgiwrf76iesksuhv5iq psql -U aegis -d aegis'
```

**Container identifiers:**
- App: `nil0nfvohfrgehgjxdv1g2xc`
- Postgres: `ii2dkkgiwrf76iesksuhv5iq`

Note: Do not truncate Docker output (Docker prints `com.docker.*` labels before
`traefik.*`, so `head -20` hides Traefik labels).

---

## Secrets & Configuration

Secrets are stored **in Coolify, not in files or git.**

- Login: Coolify web UI (ask admin for access)
- Configure via: Coolify → Project `10-sapiex-websites` → AEGIS (app id 6)
- Environment variables: Set in Coolify UI
- Required vars: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`
- Optional (degrade gracefully): AWS S3/SES credentials

---

## Rollback

Coolify maintains Docker images for recent deployments. To rollback:

1. Login to Coolify UI
2. Revert to a prior image/build
3. Restart the container

Alternatively, revert the git commit on `main` and push—Coolify will rebuild and deploy.

---

## Backup & Restore

Backups are managed by Coolify (snapshots). Ask admin for:
- Backup schedule
- Restore procedures
- Database snapshots

---

## VPS Access Notes

- **Tailscale:** Host is `vps`, public :22 is blocked
- **SSH mode:** Check mode (browser auth required); never pass `BatchMode=yes`—it suppresses auth URL and hangs
- **Sudo:** User `nc` has passwordless sudo but is not in docker group, so prepend `sudo` to docker commands
- **Network:** Postgres is internal-only, app is loopback-only on `127.0.0.1:3000`, Traefik (coolify-proxy) terminates TLS

---

## Reference

For full production details, see **[CLAUDE.md § Deployment](../CLAUDE.md#deployment)** and **[CLAUDE.md § Operational Commands](../CLAUDE.md#operational-commands)**.
