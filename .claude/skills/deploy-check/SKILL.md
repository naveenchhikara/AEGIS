---
name: deploy-check
description: Verify VPS deployment status, container health, and SSL — run before or after deploying
disable-model-invocation: true
---

# Deploy Check

Verify the production deployment on the AEGIS VPS. Run all checks and report pass/fail with a summary table.

## VPS Connection

- **SSH:** `ssh vps` (alias configured in `~/.ssh/config`; host/user/key
  are managed outside this repository)
- **Project dir:** `/root/.openclaw/workspace/projects/aegis/repo`
- If SSH times out after 5 seconds, report FAIL and stop — do not retry endlessly

## Checks to Perform

### 1. SSH Connectivity

```bash
ssh -o ConnectTimeout=5 vps "echo OK"
```

- If this fails, all subsequent checks will fail. Report and stop.

### 2. Docker Containers Running

```bash
ssh vps "docker ps --format '{{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E 'aegis|postgres'"
```

- Verify `aegis-app` container is Up
- Verify `postgres-postgres-1` container is Up
- Report uptime and port mappings

### 3. Application Health

```bash
ssh vps "curl -sf http://127.0.0.1:3000/api/health --max-time 5"
```

- Must use `127.0.0.1` (not `localhost` — IPv6 fails in Docker)
- Expect HTTP 200 with JSON response
- If health endpoint fails, check container logs: `docker logs aegis-app --tail 20`

### 4. Git Commit Sync

```bash
# Local
git rev-parse --short HEAD

# Remote
ssh vps "cd /path/to/aegis && git rev-parse --short HEAD"
```

- Compare local HEAD with VPS HEAD
- Report if VPS is behind and by how many commits
- Project dir on VPS: `/root/.openclaw/workspace/projects/aegis/repo`

### 5. Database Connectivity

```bash
ssh vps "docker exec postgres-postgres-1 psql -U aegis -d aegis -t -c 'SELECT count(*) FROM \"User\";'"
```

- Verify database is reachable from container
- Report user count as a sanity check

### 6. SSL Certificate

```bash
echo | openssl s_client -servername aegis.nexlyadvisory.com -connect aegis.nexlyadvisory.com:443 2>/dev/null | openssl x509 -noout -dates
```

- Report expiry date
- WARN if expiring within 30 days

### 7. Disk Space

```bash
ssh vps "df -h / | tail -1"
```

- WARN if usage > 80%
- FAIL if usage > 95%

## Output Format

```
AEGIS Deploy Check
==================

[PASS] SSH connectivity - connected in 1.2s
[PASS] Docker - aegis-app Up 3 days, postgres Up 3 days
[PASS] Health - /api/health returned 200
[WARN] Git sync - VPS is 2 commits behind (local: abc1234, VPS: def5678)
[PASS] Database - 10 users, connection OK
[PASS] SSL - expires 2026-05-21 (82 days remaining)
[PASS] Disk - 34% used (12G/35G)

Summary: 6 passed, 0 failed, 1 warning
Action needed: SSH to VPS and run `git pull && docker compose up -d --build`
```

If any check fails, provide the exact command to fix it. Do not just report the failure.
