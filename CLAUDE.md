# CLAUDE.md

## Project Overview

AEGIS is a multi-tenant SaaS platform for Urban Cooperative Banks in
India. It manages internal audit planning, execution, RBIA workflows,
observations, compliance tracking, reporting, and governance in line
with RBI operating requirements.

**Live:** https://aegis.nexlyadvisory.com
**Production state:** Tag-driven GitHub Actions deploys into the
repo-backed Docker Compose stack at `/opt/aegis/repo`.
**Latest verified production release:** `v2026.03.07.3`

## Working Style

- Execute verifications yourself when the task changes runnable behavior
- Read the relevant files before editing
- Prefer targeted, low-drift changes over speculative rewrites
- Keep production and documentation aligned; do not leave parallel old
  and new deploy paths documented

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
pnpm test:unit
pnpm test:e2e
pnpm test:e2e:ui
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

Production does **not** use Dockge, PM2, or a copied workspace.

### Current Production Layout

- App root: `/opt/aegis`
- Git checkout: `/opt/aegis/repo`
- Production compose file: `/opt/aegis/repo/docker-compose.prod.yml`
- Shared env: `/opt/aegis/shared/.env.production`
- Compatibility env symlink: `/opt/aegis/.env.production`
- Active release file: `/opt/aegis/shared/current-release`
- Backups: `/backups`
- Legacy root compose archived as:
  `/opt/aegis/docker-compose.yml.archived-20260307`

### Runtime Topology

- `aegis-app` listens on `127.0.0.1:3000`
- `aegis-postgres` is internal to the Compose network only
- Nginx terminates TLS for `aegis.nexlyadvisory.com`
- Backups run through `aegis-backup.timer` at `02:00`

### Release Flow

1. Merge to `main`
2. Wait for `ci.yml` to pass
3. Create an annotated tag in the `vYYYY.MM.DD.N` format
4. Push the tag
5. `deploy.yml` verifies the tag, creates a git bundle, copies deploy
   helpers to the VPS, runs bootstrap/deploy scripts, and waits for
   `http://127.0.0.1:3000/api/health`

### Operational Commands

```bash
curl -fsS http://127.0.0.1:3000/api/health | jq
docker compose -p aegis \
  --env-file /opt/aegis/shared/.env.production \
  -f /opt/aegis/repo/docker-compose.prod.yml ps
systemctl status aegis-backup.timer --no-pager
cat /opt/aegis/shared/current-release
```

## Environment Notes

- `.env.example` is for local development only
- Production secrets live outside git in
  `/opt/aegis/shared/.env.production`
- `NEXT_PUBLIC_*` variables must exist at Docker build time
- `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` must stay aligned with the
  public domain
- Health checks must use `127.0.0.1`, not `localhost`

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

## Gotchas

- Tenant isolation is enforced in application code, not PostgreSQL RLS
- Dashboard views still require SQL application on a fresh environment
- `@react-pdf/renderer`, `pg-boss`, and `exceljs` are externalized from
  the server bundle
- `!` in passwords is awkward in shell commands; quote carefully
- If a deployment is healthy but a browser shows stale server-action
  errors, verify with a fresh session before changing infrastructure
