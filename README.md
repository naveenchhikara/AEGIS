# AEGIS

**Audit, Enterprise Governance & Internal Systems**

AEGIS is a multi-tenant audit and compliance platform for Urban
Cooperative Banks (UCBs) in India. It supports the full internal audit
lifecycle, from risk assessment and planning through field execution,
observation tracking, compliance follow-up, reporting, and board
governance.

> **Status:** Live at
> [aegis.nexlyadvisory.com](https://aegis.nexlyadvisory.com). Production
> deploys are tag-driven GitHub Actions releases into a repo-backed
> Docker Compose stack on the VPS. Latest verified production release:
> `v2026.03.07.3`. Backups run daily via `aegis-backup.timer`, write to
> `/backups`, and upload to S3.

## Product Scope

- **Risk Assessment Model (RAM)** for branch-level RBI-aligned risk
  scoring
- **Audit planning** for annual schedules, branch prioritization, and
  surprise audits
- **Audit execution** for branch, cash, loan, SMA/NPA, and RBIA reviews
- **Observation lifecycle** with role-based state transitions and maker
  checker controls
- **Compliance tracking** with ACE and ACB oversight
- **GRC workflows** for risks, controls, issues, QA, and work programs
- **Regulatory modules** for concurrent audit, governance, investments,
  IS audit, and housekeeping
- **Reports and exports** in XLSX and PDF
- **Multi-language UI** with English, Hindi, Marathi, and Gujarati

## Current Delivery State

- **v6 RBIA** is shipped, including hierarchical examination trees,
  weighted scoring, frozen branch score snapshots, and dual findings
  workflows
- **v7 Sample-Based Account Examination** is the active workstream,
  covering loan data import, sampling, account examination, and scoring
  integration

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16 with `pgcrypto` and `pg_trgm`
- pnpm

### Local Setup

```bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 App Router |
| Language | TypeScript 5.9 |
| UI | shadcn/ui, Radix UI, Tailwind CSS v4 |
| Database | PostgreSQL 16 with Prisma 7 |
| Auth | Better Auth |
| Jobs | pg-boss |
| Storage | AWS S3 |
| Email | AWS SES v2 + React Email |
| Reports | ExcelJS + `@react-pdf/renderer` |
| i18n | next-intl |
| Testing | Vitest + Playwright |
| Package manager | pnpm |

## Common Scripts

```bash
# Development
pnpm dev
pnpm build
pnpm start
pnpm lint

# Database
pnpm db:generate
pnpm db:push
pnpm db:migrate
pnpm db:seed
pnpm db:studio
pnpm seed:master-directions

# Testing
pnpm test:unit
pnpm test:e2e
pnpm test:e2e:ui
```

## Repository Layout

```text
src/
  actions/         # Server actions by domain
  app/             # App Router pages, layouts, and API routes
  components/      # UI primitives and domain components
  data/            # RBI reference data and seed assets
  data-access/     # Tenant-aware database queries
  emails/          # React Email templates
  hooks/           # Shared React hooks
  jobs/            # pg-boss workers and schedulers
  lib/             # Auth, permissions, exports, uploads, utilities
  providers/       # React providers
  services/        # Domain services and engines
  stores/          # Zustand stores
  types/           # Shared TypeScript types
prisma/
  schema.prisma    # Production schema
  migrations/      # Prisma and SQL migrations
tests/
  e2e/             # Playwright specs
messages/          # next-intl dictionaries
deploy/            # VPS deploy, backup, restore, and systemd assets
docs/ops/          # Release, deploy, rollback, and hygiene docs
infra/             # AWS CDK infrastructure definitions
```

## Route Groups

| Group | Routes | Purpose |
| --- | --- | --- |
| Auth | `/login`, `/accept-invite`, `/onboarding` | Login, invitations, onboarding |
| Dashboard | `/dashboard`, `/analytics`, `/audit-trail` | KPI views and audit activity |
| RAM and Planning | `/ram/[id]`, `/audit-plans`, `/pre-audit-profiling` | Risk scoring and planning |
| Audit Execution | `/audit-execution/[id]/...` | Branch audits and working papers |
| RBIA | `/audit-execution/[id]/rbia/...` | RBIA examination, sampling, scoring |
| Findings | `/findings`, `/findings/[id]` | Observation workflow |
| Compliance | `/compliance/...`, `/auditee/[id]` | Response tracking and escalation |
| GRC | `/risk-management`, `/controls/[id]`, `/issues`, `/work-program`, `/qa-assessment` | Risk and control management |
| Regulatory | `/regulatory`, `/concurrent-audit`, `/governance`, `/investments`, `/is-audit`, `/calendar`, `/housekeeping` | RBI-specific modules |
| Reports | `/reports` | XLSX and PDF outputs |
| Admin | `/admin/...`, `/settings` | Tenant configuration and user admin |

## Architecture Notes

### Tenant Isolation

Tenant isolation is enforced in the application layer:

1. Tenant ID comes from the authenticated session only
2. Queries in `src/data-access/` explicitly scope by tenant
3. `prismaForTenant(tenantId)` is the required entry point for tenant
   aware reads and writes
4. Runtime assertions validate tenant ownership of critical records

### Authentication and Authorization

- Better Auth with database-backed sessions
- 17 roles with union-based multi-role permissions
- Login rate limiting and account lockout controls
- Maker checker enforcement on approval workflows

### Background Jobs

pg-boss runs notification and reminder workloads from the PostgreSQL
database.

## Environment Variables

Copy `.env.example` to `.env` for local development. Key variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Better Auth secret |
| `BETTER_AUTH_URL` | Auth base URL |
| `NEXT_PUBLIC_APP_URL` | Browser-facing app URL |
| `AWS_REGION` | AWS region |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | AWS credentials |
| `S3_BUCKET_NAME` | Evidence and backup bucket |
| `AWS_SES_REGION` / `SES_FROM_EMAIL` | Email delivery |

## Production Deployment

Production runs from the repo-backed compose file at
`/opt/aegis/repo/docker-compose.prod.yml`.

| Component | Current State |
| --- | --- |
| App root | `/opt/aegis` |
| Git checkout | `/opt/aegis/repo` |
| Shared secrets | `/opt/aegis/shared/.env.production` |
| Legacy env path | `/opt/aegis/.env.production` symlinked to shared env |
| App container | `aegis-app` bound to `127.0.0.1:3000` |
| Database | `aegis-postgres` on the internal Compose network only |
| Reverse proxy | Nginx serves `https://aegis.nexlyadvisory.com` |
| Backups | `aegis-backup.timer` runs daily at 02:00 and uploads to S3 |
| Release tracking | `/opt/aegis/shared/current-release` |
| Legacy compose | Archived as `/opt/aegis/docker-compose.yml.archived-20260307` |

### Release Flow

1. Merge to `main`
2. Wait for `ci.yml` to go green
3. Create an annotated tag in the `vYYYY.MM.DD.N` format
4. Push the tag
5. GitHub Actions verifies, bundles, deploys, and health-checks the
   tagged commit on the VPS

### Health Verification

```bash
curl -fsS http://127.0.0.1:3000/api/health | jq
docker compose -p aegis \
  --env-file /opt/aegis/shared/.env.production \
  -f /opt/aegis/repo/docker-compose.prod.yml ps
systemctl status aegis-backup.timer --no-pager
```

For bootstrap, deploy, rollback, backup, and restore procedures, use
[deploy/README.md](deploy/README.md) and
[docs/ops/runbook.md](docs/ops/runbook.md).

## Demo Accounts

The seed script provisions sample users for local/demo environments:

| Role | Email | Password |
| --- | --- | --- |
| CEO | `rajesh.deshmukh@apexbank.example` | `TestPassword123!` |
| HIA | `priya.sharma@apexbank.example` | `TestPassword123!` |
| Auditor | `amit.joshi@apexbank.example` | `TestPassword123!` |
| CCO | `suresh.patil@apexbank.example` | `TestPassword123!` |
| Auditee | `vikram.kulkarni@apexbank.example` | `TestPassword123!` |
| Admin | `admin@testbank.example` | `TestPassword123!` |

## Domain Context

AEGIS is built for Urban Cooperative Banks operating under RBI
supervision.

| Term | Description |
| --- | --- |
| RBIA | Risk Based Internal Audit |
| RAM | Risk Assessment Model used for branch prioritization |
| CRAR | Capital to Risk-weighted Assets Ratio |
| PCA | Prompt Corrective Action framework |
| NPA | Non-Performing Assets classification and provisioning |
| UCB Tier | RBI tiering of cooperative banks by deposit size |

## Operations Documentation

- [deploy/README.md](deploy/README.md)
- [docs/ops/runbook.md](docs/ops/runbook.md)
- [docs/ops/release-checklist.md](docs/ops/release-checklist.md)
- [docs/ops/repository-hygiene.md](docs/ops/repository-hygiene.md)

## License

Proprietary. All rights reserved.
