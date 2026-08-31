# AEGIS

**Audit, Enterprise Governance & Internal Systems**

Multi-tenant audit and compliance platform for Urban Cooperative Banks (UCBs) in India. Implements Risk-Based Internal Audit (RBIA) per RBI guidelines with sample-based examination, dual findings, escalation workflows, and board governance.

**Live:** [aegis.nexlyadvisory.com](https://aegis.nexlyadvisory.com)

## Recent Progress (August 2026)

- **Infrastructure migrated to Coolify.** The production VPS was rebuilt on
  2026-08-23; AEGIS now runs as a Coolify application with a managed PostgreSQL 16
  and Let's Encrypt TLS via Traefik. The database was bootstrapped fresh and
  reseeded; the app is live and healthy (`/api/health` reports database and
  pg-boss job queue OK).
- **Security remediation underway**, tracked as a shared map on the issue tracker
  ([#45](https://github.com/nc-sapiex/AEGIS/issues/45)). In review: a fix for a
  cross-tenant IDOR in `/api/download` where any authenticated user could presign
  another tenant's evidence keys ([#57](https://github.com/nc-sapiex/AEGIS/pull/57)),
  and a dependency sweep clearing every high/critical production advisory —
  including a Better Auth account-takeover and a Next.js middleware bypass —
  ([#59](https://github.com/nc-sapiex/AEGIS/pull/59)).
- **Production Prisma connection leak fixed.** The client singleton was cached
  only outside production, so `next start` opened a fresh connection pool per
  request; corrected in [#57](https://github.com/nc-sapiex/AEGIS/pull/57).
- **E2E suite stabilised** — it had drifted to 45/145 failing on a
  `continue-on-error` job (silently); now **140 passing**, verified against a real
  PostgreSQL and a production build.
- **A claims-vs-implementation audit** ([docs/claims-vs-implementation.md](docs/claims-vs-implementation.md))
  records where marketing/spec claims diverge from the code; the milestone
  completion figures below predate that verification and are being reconciled.

## Documentation

Start with **[`docs/architecture.md`](docs/architecture.md)** — how the system is
put together and the invariants that hold it together. [`docs/`](docs/README.md)
indexes the rest: the generated schema/route/API reference, the requirements
spec, and the operations runbooks.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16, TypeScript 5.9, React 19 |
| Database | PostgreSQL 16, Prisma 7 (75 models, 21 enums) |
| Auth | Better Auth (17 roles, 78 permissions, maker-checker RBAC) |
| UI | shadcn/ui + Radix UI, Tailwind CSS 4, Recharts |
| Cloud | AWS S3 (evidence storage), AWS SES (email) |
| Jobs | pg-boss (notifications, reminders) |
| i18n | next-intl (English, Hindi, Marathi, Gujarati) |
| Export | ExcelJS (XLSX), @react-pdf/renderer (PDF) |
| Testing | Vitest (385 unit tests, 12 files), Playwright (2 E2E spec files, 30 cases × 5 role projects) |
| Deploy | Coolify (self-hosted PaaS) + Traefik, managed PostgreSQL, Let's Encrypt |

## Features

### Core Audit (v5.0)
- **RAM Engine** — 19 configurable risk parameters with weighted scoring and frequency rules (12/18/24 months)
- **Annual Audit Plans** — Generated from RAM scores with engagement creation
- **Audit Execution** — 25 examination areas, 239 items across 39 functional areas
- **Evidence Pipeline** — S3 presigned uploads with per-observation attachments
- **Cash Verification** — Denomination tracking with retention limits
- **Loan Review** — Manual entry + CSV bulk import, SMA/NPA tracking

### Findings & Compliance (v5.0)
- **Observation Lifecycle** — DRAFT > SUBMITTED > REVIEWED > ISSUED > RESPONSE > COMPLIANCE > CLOSED
- **5C Framework** — Condition, Criteria, Cause, Effect, Recommendation
- **Repeat Detection** — pg_trgm similarity matching with 1.5x risk uplift
- **Escalation Engine** — L1 (+15d), L2 (+30d), L3 (+90d), L4 (+180d)
- **Compliance Routing** — Branch Response > ZAC Review > ACE > ACB (30-day SLA)

### RBIA (v6.0)
- **Hierarchical Examination Trees** — Variable depth (0-5) with materialized paths
- **4-Point Scoring** — Fully/Largely/Partially/Non-Compliant with weighted roll-up
- **8-State Engagement Lifecycle** — Planned through Completed
- **Dual Findings** — ActionPoints (15-40/audit) + Observations (formal 5C, 3-10/audit)
- **Branch Scoring** — Frozen immutable snapshots with DB-level trigger protection

### Sample-Based Examination (v7.0)
- **Configurable Sampling** — 20% rate with 4 criteria buckets (lockable config)
- **Instance-Based Scoring** — Weighted roll-up per examination node
- **Full Lifecycle** — RAM > Engagement > Execution > Score Freeze > Observations > Compliance > Board Report > GRC

### GRC & Governance
- **Risk Register** — Inherent/residual scoring, KRI tracking with thresholds
- **Control Library** — Test procedures, effectiveness analytics
- **Board Workspace** — ACB dashboards, agenda builder, RBI pack export
- **Policy Versioning** — Committee member management, governance workflows
- **IS/EDP Audit** — Application inventory, 6 checklists, 122 cyber security questionnaires

### Dashboards
- 7 analytics tabs: Branch Risk (heatmap), Audit Plans, Compliance (aging), Findings (trend), NPA (waterfall), Controls (effectiveness), Risk MIS
- Role-scoped views: Auditor, Auditee, CAE, CEO

## Quick Start

### Prerequisites

Node.js 22+, pnpm, PostgreSQL 16, Docker (optional)

### Development

```bash
pnpm install
pnpm db:generate          # Generate Prisma client
pnpm db:push              # Push schema to DB
pnpm db:seed              # Seed reference data
pnpm dev                  # Next.js with Turbopack on :3000
```

### Docker

```bash
docker compose up -d                              # Dev (PostgreSQL + app)
docker compose -f docker-compose.prod.yml up -d   # Production
```

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://aegis:PASSWORD@localhost:5433/aegis?sslmode=require

# Auth
BETTER_AUTH_SECRET=          # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000

# AWS (evidence storage + email)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=aegis-evidence-dev
SES_FROM_EMAIL=noreply@aegis.in

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

See `.env.example` for the full list.

## Testing

```bash
pnpm test:unit             # Vitest unit tests
pnpm test:coverage         # With coverage report
pnpm test:e2e              # Playwright E2E (5 role projects)
pnpm test:e2e:ui           # Playwright UI mode
```

E2E tests authenticate as 5 roles: Auditor, Manager, CAE, CCO, Auditee.

## Deployment

Deployed as a **Coolify** application (self-hosted PaaS). Coolify builds the
`Dockerfile`, manages the container, and fronts it with Traefik terminating TLS
via Let's Encrypt. A managed PostgreSQL runs alongside it on the same internal
Docker network; only `BETTER_AUTH_SECRET` and `DATABASE_URL` are required at
runtime. AWS S3/SES credentials are not required to boot, but evidence upload and
email are non-functional until they are configured (they do not silently fall
back to a working default).

Pushing to the configured branch triggers a rebuild in Coolify. CI (lint,
typecheck, unit tests, build, dependency audit, E2E) runs on every pull request.

> The earlier tag-driven pipeline that deployed to a bespoke `/opt/aegis` Docker
> Compose + Nginx + systemd stack has been **retired** — that VPS was rebuilt on
> 2026-08-23 and the workflow is disabled. Do not push `v*` release tags.

Fresh-database bootstrap order (schema push, roles, non-Prisma SQL, seed with
audit triggers detached) is non-obvious; see the project bootstrap notes before
provisioning a new environment.

## Project Structure

```
├── src/
│   ├── actions/        Server actions by domain (103 files)
│   ├── app/            Next.js App Router (auth, dashboard, onboarding, API)
│   ├── components/     UI components (252 files, 32 domain folders)
│   ├── data-access/    Tenant-aware DAL (53 files)
│   ├── data/           RBI reference data & seed assets
│   ├── emails/         React Email templates
│   ├── jobs/           pg-boss background workers
│   └── lib/            Utilities (auth, permissions, scoring engines, S3, export)
├── prisma/             Schema (75 models), migrations, seed scripts
├── deploy/             Legacy VPS scripts (retired — deployment is via Coolify)
├── tests/              E2E specs, auth setup, 226-case test plan
├── infra/              AWS CDK (TypeScript)
└── messages/           i18n translations (en, hi, mr, gu)
```

## Scale

- ~627 source files (excl. generated), 2,500-line Prisma schema
- 75 database models, 21 enums
- 157 server actions, ~250 components, 65 pages
- 78 RBAC permissions across 17 roles
- 18 functional modules

## License

Private — Nexly Advisory. All rights reserved.
