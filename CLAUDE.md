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

## Stack

Next.js 16 (App Router) · React 19 · TypeScript 5.9 (strict) ·
Prisma 7 → PostgreSQL 16 · Tailwind 4 · shadcn/ui + Radix ·
Better Auth · next-intl 4 · pg-boss · pnpm

Schema is large: 76 models, 22 enums in `prisma/schema.prisma`.
Assume current-generation idioms — these are all recent majors.

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

## Quick Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm db:generate
pnpm db:push
pnpm db:migrate
pnpm db:seed
pnpm db:studio
pnpm db:bootstrap
pnpm db:apply
pnpm db:verify
pnpm seed:master-directions
pnpm seed:rbia-housing
pnpm seed:exam-questions
pnpm seed:lifecycle
pnpm test:unit
pnpm test:integration
pnpm test:coverage
pnpm test:e2e
pnpm test:e2e:ui
pnpm test:e2e:smoke
pnpm build:analyze
```

## Repository Map

```text
messages/                      # i18n dictionaries
docs/ops/                      # Merge checklist, local runbook, repo hygiene
scripts/                       # Database bootstrap/verify, seeds, doc generation
prisma/
├── schema.prisma              # Production schema
├── migrations/                # Prisma and SQL migrations
└── seed.ts                    # Seed data
tests/
├── e2e/                       # Playwright E2E specs
└── auth.setup.ts              # Auth bootstrap for E2E
src/
├── actions/                   # Server actions by domain
├── app/                       # App Router pages, layouts, and API routes
├── components/                # UI primitives and domain components
├── data/                      # RBI reference data and seed assets
├── data-access/               # Tenant-aware queries
├── emails/                    # React Email templates
├── generated/prisma/          # Generated Prisma client
├── hooks/                     # Shared hooks
├── i18n/                      # Locale configuration
├── jobs/                      # pg-boss workers
├── lib/                       # Auth, state, utilities, exports, uploads
├── providers/                 # React providers
├── services/                  # Domain services and engines
├── stores/                    # Zustand stores
└── types/                     # Shared types
```

Vitest unit tests live beside the code they cover in `src/**/__tests__/`,
not under `tests/` — for example
`src/data-access/__tests__/tenant-isolation.test.ts` and
`src/lib/__tests__/permissions.test.ts`. Only Playwright E2E specs live in
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

**AEGIS is not currently deployed anywhere.** The Coolify application was taken
down deliberately; the project is local-only for now. Nothing in this repository
releases on merge, and there is no production environment to verify against.

Verified 2026-09-04 — `docker ps` on both reachable hosts shows no AEGIS
container, no `coolify-proxy` and no Coolify Postgres.

### Current Flow

1. Open a PR; CI runs on the **merge ref**, so a check reflects branch + main at
   that moment, not the branch alone.
2. Merge to `main`. That is the end of it — nothing builds or releases.

CI is therefore the only gate that exists. The `docker-build` job still builds
the production image on every PR, so `Dockerfile` changes stay validated even
though the image is not deployed.

### Dormant Production Layout (for restoration only)

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

### Applying SQL

**SQL is never applied automatically** — not by a build, and not by starting the
app. The container runs `node server.js`: no `migrate deploy`, no `db push`. On
any database, local included, two things are applied by hand, in this order:

1. The release's schema file in `prisma/migrations/`, if it has one — a dated,
   idempotent `.sql` adding that release's tables and columns. Apply it with
   `pnpm db:apply <path>`, which is what CI rehearses.
2. `pnpm db:bootstrap`, which applies `prisma/sql/manifest.ts` (triggers, views,
   functions, composite FKs), then `pnpm db:verify` to assert it landed.

Schema first: `060_tenant_composite_fks.sql` depends on `(tenantId, id)` unique
indexes the schema file creates. `prisma/migrations/superseded/` is history —
do not apply it. Full sequence in `docs/ops/release-checklist.md`.

### Operational Commands

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

## Environment Notes

- `.env.example` is for local development only
- There is no production environment; `.env` is the only config that matters
- `src/env.ts` requires four vars — `DATABASE_URL`, `BETTER_AUTH_SECRET` (min 32),
  `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`. AWS/S3/SES vars are `.optional()`, so
  uploads and email degrade rather than block boot
- `NEXT_PUBLIC_*` variables must exist at Docker build time
- `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` must stay aligned with each other;
  locally both are `http://localhost:3000`. The Dockerfile still defaults
  `NEXT_PUBLIC_APP_URL` to `https://aegis.nexlyadvisory.com` for image builds
- **pnpm is pinned by `packageManager` in `package.json`** (`pnpm@10.34.5`).
  pnpm 11 reads that field and self-delegates, so a bare `pnpm install` is now
  safe whatever is on `PATH`. Do **not** add a `version:` input to
  `pnpm/action-setup` — it throws when the two disagree
- **pnpm 11 silently ignores `pnpm.overrides`.** It warns and exits 0 rather than
  failing, so all 27 security pins would vanish unnoticed. pnpm 11 also relocates
  the setting out of `package.json`; migrate those pins before adopting 11

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
  that mutates an audited table writes a row with no attribution, and the
  discipline test in `src/data-access/__tests__/` will fail the build

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
