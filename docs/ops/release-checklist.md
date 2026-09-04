# AEGIS Release Checklist

⚠️ **Updated for Coolify deployment model (as of 2026-08-23).**
No tag step; deploy is merge-to-main.

---

## Before Merging to `main`

- [ ] `git status` is clean
- [ ] All commits are squashed or logically organized
- [ ] CI passes on the PR (lint, build, unit tests, E2E, dependency audit)
- [ ] No unreviewed code or env-var changes
- [ ] Database schema changes documented and migration scripts prepared (if any)

**Note:** `main` has no branch protection; **any merge deploys immediately to production.**

---

## SQL Migrations (If Applicable)

**Important:** Prisma migrations do not ride along with deploys.

Before or during the merge:
- [ ] Apply `.sql` files from `prisma/migrations/` to production Postgres manually
- [ ] Verify migration completed: `ssh vps 'sudo docker exec -it ii2dkkgiwrf76iesksuhv5iq psql -U aegis -d aegis'`
- [ ] Run schema integrity checks if any

---

## After Merge to `main`

Coolify builds and deploys automatically (1–2 minutes). Verify:

- [ ] `curl -fsS https://aegis.nexlyadvisory.com/api/health | jq` → `"status": "healthy"`
- [ ] `ssh vps 'sudo docker ps --filter name=nil0nfvohfrgehgjxdv1g2xc'` → container is running
- [ ] Coolify UI shows green build status
- [ ] No errors in Coolify container logs
- [ ] E2E smoke test or manual user flow validates the key feature

---

## Rollback (If Needed)

- Revert the merge commit on `main` and push
- Or: Use Coolify UI to redeploy a prior image
- Verify rollback: `curl -fsS https://aegis.nexlyadvisory.com/api/health | jq`

---

## Reference

See **[CLAUDE.md § Release Flow](../CLAUDE.md#release-flow)** and **[Ops Runbook](runbook.md)** for full procedures.
