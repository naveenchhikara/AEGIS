# CLAUDE.md

## Project Overview

AEGIS is a multi-tenant SaaS platform for Urban Cooperative Banks in
India. It manages internal audit planning, execution, RBIA workflows,
observations, compliance tracking, reporting, and governance in line
with RBI operating requirements.

**GitHub:** [nc-sapiex/AEGIS](https://github.com/nc-sapiex/AEGIS) (private)
**Deployment state:** **Not deployed.** Local development and testing only,
confirmed 2026-09-04. There is no VPS deployment and no Coolify application.

> **Merging to `main` releases nothing.** There is no deployment target, so a
> merge is ordinary integration, not a release — do not gate work on deploy
> risk. `main` still has no branch protection, so CI on the PR is the only
> check. `https://aegis.nexlyadvisory.com` does **not** serve AEGIS; it resolves
> to a host running an unrelated app. See [Deployment](#deployment).

## Working Style

- Execute verifications yourself when the task changes runnable behavior
- Read the relevant files before editing
- Prefer targeted, low-drift changes over speculative rewrites
- Keep production and documentation aligned; do not leave parallel old
  and new deploy paths documented

## Agent skills

### Issue tracker

GitHub Issues on `nc-sapiex/AEGIS`, driven through the `gh` CLI. See
`docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, each label string equal to its name
(`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`,
`wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` plus `docs/adr/` at the repo root. `CONTEXT.md`
exists (added with the audited-mutation work); `docs/adr/` does not — it is
created lazily when a decision needs recording. See `docs/agents/domain.md`.

## Repository Map

Vitest unit tests live beside the code they cover in `src/**/__tests__/`,
not under `tests/` — for example
`src/data-access/__tests__/tenant-isolation.test.ts` and
`src/lib/__tests__/permissions.test.ts`. Integration tests
(`pnpm test:integration`, live PostgreSQL) live in `src/**/__integration__/`
with their harness in `tests/integration/`. Only Playwright E2E specs live in
`tests/e2e/`.

## Route Snapshot

| Group           | Examples                                                                                                     | Purpose                      |
| --------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| Auth            | `/login`, `/accept-invite`, `/onboarding`                                                                    | Login and onboarding         |
| Dashboard       | `/dashboard`, `/analytics`, `/audit-trail`                                                                   | Summary and analytics        |
| Planning        | `/ram/[id]`, `/audit-plans`, `/pre-audit-profiling`                                                          | Risk scoring and planning    |
| Audit Execution | `/audit-execution/[id]/...`                                                                                  | Branch audit workflows       |
| RBIA            | `/audit-execution/[id]/rbia/...`                                                                             | RBIA examination and scoring |
| Findings        | `/findings`, `/findings/[id]`                                                                                | Observation lifecycle        |
| Compliance      | `/compliance/...`, `/auditee/[id]`                                                                           | Responses and escalation     |
| GRC             | `/risk-management`, `/controls/[id]`, `/issues`, `/work-program`, `/qa-assessment`                           | Risk, controls, QA           |
| Regulatory      | `/regulatory`, `/concurrent-audit`, `/governance`, `/investments`, `/is-audit`, `/calendar`, `/housekeeping` | Regulatory modules           |
| Reports         | `/reports`                                                                                                   | XLSX and PDF outputs         |
| Admin           | `/admin/...`, `/settings`                                                                                    | Tenant configuration         |

## Core Patterns

### Authentication and Authorization

- Better Auth with database-backed sessions
- Session cookies are the production auth boundary
- Multi-role RBAC with 17 roles and union-based permissions
- Maker checker constraints are enforced in workflow transitions

### Tenant Isolation

- Tenant ID always comes from the authenticated session
- `getRequiredSession()` is the standard entry point
- `src/data-access/` must scope queries by tenant
- `prismaForTenant(tenantId)` is the approved tenant-aware data access
  helper

### Background Jobs

pg-boss runs reminder and notification workloads from the PostgreSQL
database. Health checks include queue status and database latency.

## Deployment

**AEGIS is not currently deployed anywhere.** There is no production environment
to verify against, and merging to `main` releases nothing — CI on the PR is the
only gate. For deployment history, SSH host aliases, and SQL migration
sequencing, see the `deployment-ops` skill.

## Environment Notes

- `.env.example` is for local development only
- There is no production environment; `.env` is the only config that matters
- `src/env.ts` requires four vars — `DATABASE_URL`, `BETTER_AUTH_SECRET` (min 32),
  `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`. AWS/S3/SES vars are `.optional()`, so
  uploads and email degrade rather than block boot
- `NEXT_PUBLIC_*` variables must exist at Docker build time
- `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` must stay aligned with each other;
  locally both are `http://localhost:3000`, and so is the Dockerfile's
  `NEXT_PUBLIC_APP_URL` build arg. It is inlined into the client bundle and
  cannot be changed at runtime, so an image for a real host needs
  `--build-arg NEXT_PUBLIC_APP_URL=https://<host>`
- **pnpm is pinned by `packageManager` in `package.json`** (`pnpm@10.34.5`).
  pnpm 11 reads that field and self-delegates, so a bare `pnpm install` is now
  safe whatever is on `PATH`. Do **not** add a `version:` input to
  `pnpm/action-setup` — it throws when the two disagree
- **pnpm settings live in `pnpm-workspace.yaml`**, not the `pnpm` field of
  `package.json`: the 27 transitive-dependency security pins and
  `onlyBuiltDependencies`. pnpm 10.34.5 warns on every invocation that it no
  longer reads that field, and pnpm 11 is where the deprecation completes.
  The warning overstates the present: while the settings sat in
  `package.json` the pins still resolved correctly, including across a forced
  re-resolution, because `pnpm-lock.yaml` carries its own `overrides:` block
  that pnpm keeps. Nothing was unpinned; the move is forward-compatibility
- **`pnpm-workspace.yaml` is now load-bearing for any install.** Because the
  settings are no longer duplicated in `package.json`, a context that copies
  the manifest and lockfile without it fails `--frozen-lockfile` with
  `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`. The `Dockerfile` deps stage copies all
  three files for exactly this reason — do not trim that `COPY`

## Domain Context

- Target users: Urban Cooperative Banks under RBI supervision
- Data residency: India-hosted infrastructure only
- Audit methodology: RAM and RBIA aligned with RBI expectations
- Compliance path: Branch response, zonal review, ACE, ACB
- Language targets: English, Hindi, Marathi, Gujarati

## Current Product Scope

- RBIA examination trees, findings, scoring, and branch score freeze are
  shipped
- Sample-based account examination is the active delivery area
- Reports, evidence storage, and notification flows are production
  capabilities

## Code Style

- Use `@/*` path aliases
- Import icons from `@/lib/icons`
- Prefer server components unless client interactivity is required
- Use `cn()` for class composition
- Keep tenant scoping explicit in DAL functions and server actions
- Route every audited write through `withAuditedMutation(actor, actionType, fn)`
  from `src/data-access/audited-mutation.ts` — it opens the transaction and sets
  the session context the audit trigger reads. A hand-rolled `prisma.$transaction`
  that mutates an audited table does not write an unattributed row — it
  **throws**, because the trigger finds no tenant and `AuditLog.tenantId` is
  `NOT NULL`. The discipline test in `src/data-access/__tests__/` fails the build
  before that can happen; legacy `setAuditContext` call sites are grandfathered
  under a shrink-only allowlist (ceiling 67) that new code may not join

## Gotchas

- Tenant isolation is enforced in application code, not PostgreSQL RLS.
  `prismaForTenant()` returns the plain singleton; isolation comes from the
  explicit `WHERE tenantId` in every DAL function.
- `prisma/migrations/superseded/add_rls_policies.sql` is quarantined for a
  reason worth knowing. It sets `FORCE ROW LEVEL SECURITY` on 11 tables keyed to
  `app.current_tenant_id` — a GUC only audited transactions set, through
  `setSessionContext()` in `src/lib/session-context.ts` or the legacy
  `setAuditContext()`. Ordinary reads never set it, so applying the file makes
  those tables return **zero rows** rather than erroring, and raises an
  invalid-UUID error wherever a pooled connection exposes the GUC as `''`. The
  RLS enforcement model is still undecided; do not revive this file to settle it
- There is no `postinstall` hook: run `pnpm db:generate` after a fresh
  clone or any `schema.prisma` change, or `pnpm build` fails on missing
  imports from `@/generated/prisma`
- `prisma/migrations/` mixes Prisma migration directories with bare `.sql`
  files, and Prisma never discovers the loose ones. Apply those with
  `pnpm db:apply <path>` — the same path CI rehearses — not by hand with `psql`.
  Timestamped directories apply only under an explicit Prisma migration command
- **Session GUCs read back as `''`, not NULL, on a pooled connection** that has
  previously set them. `''::UUID` throws. Always wrap reads in
  `NULLIF(current_setting(...), '')` — see
  `prisma/migrations/20260826_audit_trigger_null_safe.sql`
- A fresh database needs `pnpm db:bootstrap` after `db:push`; `db:push` alone
  leaves it with no audit triggers, dashboard views, or composite FKs
- **An audited table is declared in three places that must agree** —
  `AUDITED_TABLES` in `src/lib/audit-triggers.ts`, the `audited` array in
  `prisma/sql/020_attach_audit_triggers.sql`, and `AUDIT_TRIGGER_TABLES` in
  `prisma/sql/manifest.ts`. `src/lib/__tests__/sql-manifest.test.ts` fails the
  build if they drift. Adding a table needs no dated migration: the attach script
  is idempotent and `pnpm db:bootstrap` re-runs it. 24 tables are audited today
- **Attach the trigger last, not first.** The audit trigger throws on a write with
  no session context, so a table can only join `AUDITED_TABLES` once every
  `create`/`update`/`upsert`/`delete` on it — in actions, the DAL and jobs — sets
  the context. Seeds and test fixtures do not set it; they detach the triggers
  around their inserts with `withTriggersDetached` instead. The eight RBIA/GRC
  scoring tables are covered, and `src/lib/__tests__/audit-coverage.test.ts`
  fails the build if one of them leaves the list; its exemption set is empty and
  may only shrink
- **`pnpm test:integration` resets the database it is pointed at.**
  `tests/integration/global-setup.ts` runs `prisma db push --force-reset` against
  `DATABASE_URL` with no safety guard (the seed script has one; this does not).
  Fixture rows must be created inside `withFixtures()` from
  `tests/integration/harness.ts`, which detaches the audit triggers — a fixture
  created outside it hits the trigger with no context and fails on
  `AuditLog.tenantId`. A null-`tenantId` failure in that suite means exactly that
- `@react-pdf/renderer`, `pg-boss`, and `exceljs` are externalized from
  the server bundle
- `!` in passwords is awkward in shell commands; quote carefully
- If a deployment is healthy but a browser shows stale server-action
  errors, verify with a fresh session before changing infrastructure
- **The `lint` CI job runs `pnpm docs:check`** (`scripts/generate-reference-docs.mjs
--check`), which regenerates `docs/reference/` from `prisma/schema.prisma` and
  the `src/` tree and fails if the committed output differs
- **`docs/reference/` goes stale from code changes, not just doc edits.** Adding a
  new Prisma model write to a server action changes that action's tables-touched
  column in `docs/reference/api-reference.md` and `data-flows.md`, reddening
  `lint`. It caught PR #86 (`tx.account.create` in
  `src/actions/user-invitations.ts` added `Account` to its row) and PR #87. Fix:
  run `pnpm docs:reference` and commit the four `docs/reference/*.md` files
- `--check` strips the `> Source commit:` line before comparing (the `norm()`
  helper near line 397 of the generator), so the commit/branch stamp never causes
  a false failure
- **`docs/reference/` is in `.prettierignore` and must stay there.** The generator
  owns those bytes and `docs:check` asserts byte-equality with its output, so a
  Prettier pass reddens `lint` with no content change — and regenerating undoes
  the formatting. The two rules fight, and whichever ran last decides the build.
  A "stale reference docs" failure against files nobody edited is this, not drift
- `security-audit` intermittently fails with `ERR_SOCKET_TIMEOUT` reaching
  `registry.npmjs.org` — an infrastructure flake that clears on re-run, not a
  vulnerability
