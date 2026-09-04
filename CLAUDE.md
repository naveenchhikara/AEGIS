# CLAUDE.md

## Project Overview

AEGIS is a multi-tenant SaaS platform for Urban Cooperative Banks in
India. It manages internal audit planning, execution, RBIA workflows,
observations, compliance tracking, reporting, and governance in line
with RBI operating requirements.

**Live:** https://aegis.nexlyadvisory.com
**GitHub:** [nc-sapiex/AEGIS](https://github.com/nc-sapiex/AEGIS) (private)
**Production state:** Runs as a Coolify application on the shared VPS.
**Deploy:** merge to `main` — Coolify auto-deploys. There is no tag step.

> **Merging to `main` deploys to production.** Auto-deploy is on and `main`
> has no branch protection, so nothing gates a merge. Confirm before merging
> anything you would not deploy.

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
pnpm seed:master-directions
pnpm seed:exam-questions
pnpm seed:lifecycle
pnpm test:unit
pnpm test:coverage
pnpm test:e2e
pnpm test:e2e:ui
pnpm build:analyze
```

## Repository Map

```text
infra/                         # AWS CDK infrastructure
messages/                      # i18n dictionaries
deploy/                        # VPS deploy, backup, restore, systemd assets
docs/ops/                      # Release, rollback, recovery, hygiene docs
scripts/                       # Local setup and utility scripts
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

## Route Snapshot

| Group | Examples | Purpose |
| --- | --- | --- |
| Auth | `/login`, `/accept-invite`, `/onboarding` | Login and onboarding |
| Dashboard | `/dashboard`, `/analytics`, `/audit-trail` | Summary and analytics |
| Planning | `/ram/[id]`, `/audit-plans`, `/pre-audit-profiling` | Risk scoring and planning |
| Audit Execution | `/audit-execution/[id]/...` | Branch audit workflows |
| RBIA | `/audit-execution/[id]/rbia/...` | RBIA examination and scoring |
| Findings | `/findings`, `/findings/[id]` | Observation lifecycle |
| Compliance | `/compliance/...`, `/auditee/[id]` | Responses and escalation |
| GRC | `/risk-management`, `/controls/[id]`, `/issues`, `/work-program`, `/qa-assessment` | Risk, controls, QA |
| Regulatory | `/regulatory`, `/concurrent-audit`, `/governance`, `/investments`, `/is-audit`, `/calendar`, `/housekeeping` | Regulatory modules |
| Reports | `/reports` | XLSX and PDF outputs |
| Admin | `/admin/...`, `/settings` | Tenant configuration |

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

**The VPS was reprovisioned on 2026-08-23 and the old layout is gone.** Anything
describing `/opt/aegis`, `docker-compose.prod.yml`, a bespoke nginx, systemd
timers, or a `v*` tag pipeline is stale — that host no longer exists. `Deploy
Production` and `Health Check` are `disabled_manually` in Actions; do not
re-enable them.

### Current Production Layout

AEGIS runs as **Coolify app id 6**, uuid `nil0nfvohfrgehgjxdv1g2xc`, `dockerfile`
build pack, `ports_exposes=3000`, in project `10-sapiex-websites` on the
`sapiex-websites` Docker network. Its database is a Coolify-managed Postgres
(`postgres:16-alpine`, container `ii2dkkgiwrf76iesksuhv5iq`, user/db `aegis`) on
the same network. `coolify-proxy` *is* Traefik and terminates TLS. Config and
secrets live in Coolify, not in a file on disk.

### Release Flow

1. Open a PR; CI runs on the **merge ref**, so a check reflects branch + main at
   that moment, not the branch alone.
2. Merge to `main`.
3. Coolify builds and releases automatically, within a minute or two.
4. Verify `https://aegis.nexlyadvisory.com/api/health`.

**SQL migrations do not ride along with a deploy.** The loose `.sql` files in
`prisma/migrations/` are applied by hand. Merging code that depends on one does
not apply it — apply it yourself, before or with the merge.

### Operational Commands

The VPS is reached over **Tailscale** as host `vps` (public :22 is filtered).
Tailscale SSH runs in check mode and needs periodic browser re-auth; **never pass
`BatchMode=yes`** — it suppresses the auth URL and the connection hangs silently.
The `nc` user has passwordless sudo but is not in the `docker` group, so Docker
needs `sudo`.

```bash
curl -fsS https://aegis.nexlyadvisory.com/api/health | jq
ssh vps 'sudo docker ps --filter name=nil0nfvohfrgehgjxdv1g2xc'
ssh vps 'sudo docker exec -it ii2dkkgiwrf76iesksuhv5iq psql -U aegis -d aegis'
```

When reading container labels, do **not** truncate: Docker prints `com.docker.*`
before `traefik.*`, so a `head -20` hides every Traefik label and makes a
correctly-routed container look unlabelled.

## Environment Notes

- `.env.example` is for local development only
- Production secrets live in Coolify, not in git or a file on the host
- `src/env.ts` requires four vars — `DATABASE_URL`, `BETTER_AUTH_SECRET` (min 32),
  `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`. AWS/S3/SES vars are `.optional()`, so
  uploads and email degrade rather than block boot
- `NEXT_PUBLIC_*` variables must exist at Docker build time
- `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` must stay aligned with the
  public domain — both are `https://aegis.nexlyadvisory.com`
- Use `npx -y pnpm@10` locally: the Dockerfile pins pnpm 9 and CI pins 10, while
  pnpm 11 ignores the `pnpm.overrides` block in `package.json` and fails
  `--frozen-lockfile`

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

- Tenant isolation is enforced in application code, not PostgreSQL RLS
- **Session GUCs read back as `''`, not NULL, on a pooled connection** that has
  previously set them. `''::UUID` throws. Always wrap reads in
  `NULLIF(current_setting(...), '')` — see
  `prisma/migrations/20260826_audit_trigger_null_safe.sql`
- Dashboard views still require SQL application on a fresh environment
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
- `security-audit` intermittently fails with `ERR_SOCKET_TIMEOUT` reaching
  `registry.npmjs.org` — an infrastructure flake that clears on re-run, not a
  vulnerability
