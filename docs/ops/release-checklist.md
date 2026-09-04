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

## Database Changes (If Applicable)

**Important:** nothing in the deploy touches the database. The container runs
`node server.js` — there is no `prisma migrate deploy` and no `db push`. Merging
code that needs a new table or column deploys an application that queries
something production does not have, and `/api/health` stays green while it does.

**Do not** bulk-apply `prisma/migrations/*.sql`. That directory contains
`superseded/`, which is history — its README says so, and applying
`add_rls_policies.sql` would create the `aegis_app` role and enable row-level
security on a system whose tenant isolation is enforced in application code.
Apply named files only.

Apply in this order — schema first, because `prisma/sql/060_tenant_composite_fks.sql`
needs the `(tenantId, id)` unique indexes the schema file creates:

- [ ] Apply this release's schema file, if it has one, with
      `pnpm db:apply prisma/migrations/<file>.sql` (e.g.
      `20260904_f07_f15_schema_additions.sql`). Each is idempotent and carries
      its own header explaining what it adds and why. CI rehearses this exact
      step against a freshly pushed schema, so a file that fails here has
      already failed a build.
- [ ] Run the pre-check queries in the header of
      `prisma/sql/060_tenant_composite_fks.sql` — each must return zero rows. If
      any returns rows there is cross-tenant data: **stop and repair it.** Do not
      weaken the constraint.
- [ ] `pnpm db:bootstrap` — applies `prisma/sql/manifest.ts` (triggers, views,
      functions, composite FKs). Idempotent; safe against a live database.
- [ ] Merge, and let Coolify deploy.
- [ ] `pnpm db:verify` — asserts every required object landed. Exits non-zero
      and lists what is missing.

Shell access, if you need it:
`ssh vps 'sudo docker exec -it ii2dkkgiwrf76iesksuhv5iq psql -U aegis -d aegis'`

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
