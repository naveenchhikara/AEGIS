# AEGIS

**Audit, Enterprise Governance & Internal Systems**

Multi-tenant audit and compliance platform for Urban Cooperative Banks (UCBs) in India. Implements Risk-Based Internal Audit (RBIA) per RBI guidelines with sample-based examination, dual findings, escalation workflows, and board governance.

**Live:** [aegis.nexlyadvisory.com](https://aegis.nexlyadvisory.com)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16, TypeScript 5.9, React 19 |
| Database | PostgreSQL 16, Prisma 7 (75 models, 21 enums) |
| Auth | Better Auth (17 roles, 60+ permissions, maker-checker RBAC) |
| UI | shadcn/ui + Radix UI, Tailwind CSS 4, Recharts |
| Cloud | AWS S3 (evidence storage), AWS SES (email) |
| Jobs | pg-boss (notifications, reminders) |
| i18n | next-intl (English, Hindi, Marathi, Gujarati) |
| Export | ExcelJS (XLSX), @react-pdf/renderer (PDF) |
| Testing | Playwright (E2E), Vitest (unit), 226 manual test cases |
| Deploy | Docker Compose + Nginx + systemd on VPS |

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
- **5C Framework** — Criteria, Cause, Consequence, Condition, Cure
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

Tag-driven deploys via GitHub Actions. Push a tag (`vYYYY.MM.DD.N`) to trigger:

1. CI verifies (lint, typecheck, build, unit tests)
2. Code bundled and SCP'd to VPS
3. Docker Compose rebuilt and restarted
4. Health check confirms readiness

```bash
git tag -a v2026.04.14.1 -m "release" && git push origin v2026.04.14.1
```

Daily database backups via systemd timer to `/backups`.

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
├── deploy/             VPS scripts, nginx config, systemd services
├── tests/              E2E specs, auth setup, 226-case test plan
├── infra/              AWS CDK (TypeScript)
└── messages/           i18n translations (en, hi, mr, gu)
```

## Scale

- 536 source files, 2,500-line Prisma schema
- 75 database models, 21 enums
- 103 server actions, 252 components, 54 pages
- 60+ RBAC permissions across 17 roles
- 18 functional modules

## License

Private — Nexly Advisory. All rights reserved.
