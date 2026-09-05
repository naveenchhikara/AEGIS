---
name: deployment-ops
description: Deployment history, SSH host aliases, and SQL migration sequencing for AEGIS ops questions. Use when asked about deploying AEGIS, SSH access to project hosts, Coolify, or applying database migrations/SQL.
---

# Deployment Ops

AEGIS is not currently deployed anywhere. The Coolify application was taken
down deliberately; the project is local-only for now. Nothing in this
repository releases on merge, and there is no production environment to
verify against.

Verified 2026-09-04 — `docker ps` on both reachable hosts shows no AEGIS
container, no `coolify-proxy` and no Coolify Postgres.

## Current Flow

1. Open a PR; CI runs on the **merge ref**, so a check reflects branch + main at
   that moment, not the branch alone.
2. Merge to `main`. That is the end of it — nothing builds or releases.

CI is therefore the only gate that exists. The `docker-build` job still builds
the production image on every PR, so `Dockerfile` changes stay validated even
though the image is not deployed.

## Dormant Production Layout (for restoration only)

**Do not treat any of this as live.** None of it exists right now; it is kept as
a record of how the deployment was configured before it was torn down.

<details>
<summary>Previous Coolify setup</summary>

AEGIS ran as **Coolify app id 6**, uuid `nil0nfvohfrgehgjxdv1g2xc`, `dockerfile`
build pack, `ports_exposes=3000`, in project `10-sapiex-websites` on the
`sapiex-websites` Docker network. Its database was a Coolify-managed Postgres
(`postgres:16-alpine`, container `ii2dkkgiwrf76iesksuhv5iq`, user/db `aegis`) on
the same network. `coolify-proxy` _was_ Traefik and terminated TLS. Config and
secrets lived in Coolify, not in a file on disk. Merging to `main` auto-deployed,
and `https://aegis.nexlyadvisory.com/api/health` was the check.

An older layout before the 2026-08-23 reprovision — `/opt/aegis`,
`docker-compose.prod.yml`, bespoke nginx, systemd timers, a `v*` tag pipeline —
was stale twice over.

The assets for both layouts were **deleted on 2026-09-05**, along with the
`Deploy Production` and `Health Check` workflows that drove them: `deploy/`
(deploy, backup, restore, nginx, systemd units), `infra/` (AWS CDK),
`docker-compose.prod.yml`, `scripts/ec2-init.sh` and `scripts/setup-s3.sh`.
`git log` has every one of them. `Health Check` had curled
`https://aegis.nexlyadvisory.com/api/health` every 12 hours and failed every run
from the teardown onward, because that host serves an unrelated app. Do not
recreate any of this without a target to deploy to.

</details>

## Applying SQL

**SQL is never applied automatically** — not by a build, and not by starting the
app. The container runs `node server.js`: no `migrate deploy`, no `db push`. On
any database, local included, two things are applied by hand, in this order:

1. The release's schema files in `prisma/migrations/`, if it has any — dated,
   idempotent `.sql` files adding that release's tables and columns, applied
   oldest first with `pnpm db:apply <path>`. CI rehearses the F07–F15 file;
   `docs/ops/release-checklist.md` lists the current set.
2. `pnpm db:bootstrap`, which applies `prisma/sql/manifest.ts` (triggers, views,
   functions, composite FKs), then `pnpm db:verify` to assert it landed.

Schema first: `060_tenant_composite_fks.sql` depends on `(tenantId, id)` unique
indexes the schema file creates. `prisma/migrations/superseded/` is history —
do not apply it. Full sequence in `docs/ops/release-checklist.md`.

## Operational Commands

**There is no `vps` host.** That alias does not exist and never resolves. The
real `~/.ssh/config` entries are:

| Alias         | Host                          | User        | Notes                                                                                          |
| ------------- | ----------------------------- | ----------- | ---------------------------------------------------------------------------------------------- |
| `vps-control` | 187.124.97.7 (`srv1447173`)   | `developer` | What `aegis.nexlyadvisory.com` resolves to. Runs an unrelated `hello-stack` app, **not AEGIS** |
| `vps-worker`  | 100.67.104.100 (`srv1940204`) | `deploy`    | Tailnet; public fallback 200.234.43.54. **Docker is not installed**                            |
| `vps-443`     | 187.124.97.7 port 443         | `developer` | Same box as `vps-control`, for networks blocking outbound 22                                   |

Neither host serves AEGIS, so there is no health check or container to inspect.
`curl https://aegis.nexlyadvisory.com/api/health` returns
`404 {"ok":false,"error":"not found"}` from the unrelated app, behind a
self-signed `CN=srv1447173.hstgr.cloud` certificate — that is expected, not an
outage.

Tailscale SSH runs in check mode and needs periodic browser re-auth; **never pass
`BatchMode=yes`** — it suppresses the auth URL and the connection hangs silently.

If the Coolify deployment is ever restored: Docker needs `sudo`, and when reading
container labels do **not** truncate — Docker prints `com.docker.*` before
`traefik.*`, so a `head -20` hides every Traefik label and makes a
correctly-routed container look unlabelled.
