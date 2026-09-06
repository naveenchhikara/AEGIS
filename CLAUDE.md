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
- Keep production and documentation aligned; do not leave parallel old
  and new deploy paths documented

## Agent skills

- **Issue tracker** — GitHub Issues on `nc-sapiex/AEGIS` via the `gh` CLI.
  `docs/agents/issue-tracker.md`
- **Triage labels** — five canonical roles, each label string equal to its name:
  `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`.
  `docs/agents/triage-labels.md`
- **Domain docs** — single-context: one root `CONTEXT.md` (exists) plus
  `docs/adr/` (does not; created lazily when a decision needs recording).
  `docs/agents/domain.md`

## Repository Map

Tests do **not** all live under `tests/`. Vitest unit tests sit beside the code
they cover in `src/**/__tests__/`, integration specs in `src/**/__integration__/`.
Only Playwright E2E specs and the integration harness live under `tests/` — see
`tests/CLAUDE.md`.

Route groups are readable from `src/app/`.

## Nested guidance

Additional rules load automatically when you work under these directories:

- `prisma/CLAUDE.md` — migration application, the quarantined RLS file,
  session-GUC null handling
- `tests/CLAUDE.md` — the integration suite's destructive reset and `withFixtures()`

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
  The RLS enforcement model is still undecided, and a quarantined migration file
  exists that must not be revived to settle it — `prisma/CLAUDE.md` has the
  detail, along with migration application and session-GUC null handling
- There is no `postinstall` hook: run `pnpm db:generate` after a fresh clone or
  any `schema.prisma` change, or `pnpm build` fails on missing imports from
  `@/generated/prisma`
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
- **`pnpm test:integration` resets the database it is pointed at** — no safety
  guard. See `tests/CLAUDE.md` before running it or adding fixtures
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
