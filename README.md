# AEGIS

**Audit, Enterprise Governance & Internal Systems**

A multi-tenant SaaS platform for Urban Cooperative Banks (UCBs) in India to manage the full internal audit lifecycle — from risk assessment and audit planning through execution, reporting, compliance tracking, and board governance — in compliance with RBI regulations.

> **Status:** Production deployed at [aegis.nexlyadvisory.com](https://aegis.nexlyadvisory.com). 99/104 requirements complete across 18 modules. 559 source files, 63 DB models.

## Key Features

- **Risk Assessment Model (RAM)** — 19-parameter risk scoring per RBI RBIA policy
- **Audit Planning** — Annual plan simulation with branch-wise scheduling and surprise audits
- **Audit Execution** — Field audits with 568 examination items across sections (cash, loans, SMA-NPA)
- **Observation Lifecycle** — State-machine-driven workflow from draft to closure with role-based transitions
- **Compliance Tracking** — 4-level escalation engine (L1-L4) with ACE/ACB committee oversight
- **GRC Module** — Risk register, control library, issue management, QA assessment, work programs
- **Regulatory** — Concurrent audit, governance committees, investments, IS audit, housekeeping
- **Reports** — XLSX multi-tab and PDF generation for board reporting
- **Multi-language** — English, Hindi, Marathi, Gujarati (next-intl)
- **RBAC** — 17 roles, 60+ permissions, multi-role support with maker-checker enforcement

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16 (with `pgcrypto` and `pg_trgm` extensions)
- pnpm 9+

### Setup

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials, auth secret, and AWS keys

# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push

# Seed demo data (Apex Sahakari Bank — 10 users, 2 tenants)
pnpm db:seed

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

| Layer           | Technology                                                |
| --------------- | --------------------------------------------------------- |
| Framework       | Next.js 16 (App Router + Turbopack)                       |
| UI              | shadcn/ui (new-york) + Radix UI + Tailwind CSS v4         |
| Language        | TypeScript 5.9 (strict)                                   |
| Database        | PostgreSQL 16 + Prisma 7 ORM                              |
| Auth            | Better Auth (bcrypt, session cookies, RBAC)               |
| State           | React Query (server) + Zustand (client) + react-hook-form |
| Tables          | TanStack Table v8                                         |
| Charts          | Recharts 3                                                |
| Storage         | AWS S3 (Mumbai, ap-south-1)                               |
| Email           | React Email + AWS SES v2 (DKIM verified)                  |
| Reports         | ExcelJS (XLSX) + @react-pdf/renderer (PDF)                |
| Jobs            | pg-boss (PostgreSQL-backed)                               |
| i18n            | next-intl (en, hi, mr, gu)                                |
| Icons           | Lucide React (via `@/lib/icons` barrel)                   |
| Testing         | Playwright (E2E) + Vitest (unit)                          |
| Package Manager | pnpm                                                      |

## Scripts

```bash
# Development
pnpm dev                     # Dev server with Turbopack
pnpm build                   # Production build
pnpm start                   # Start production server
pnpm lint                    # Run ESLint

# Database
pnpm db:generate             # Generate Prisma client
pnpm db:push                 # Push schema to DB (no migration)
pnpm db:migrate              # Run Prisma migrations
pnpm db:seed                 # Seed database
pnpm db:studio               # Open Prisma Studio
pnpm seed:master-directions  # Seed RBI master directions

# Testing
pnpm test:unit               # Run unit tests (Vitest)
pnpm test:e2e                # Run E2E tests (Playwright)
pnpm test:e2e:ui             # E2E tests with Playwright UI
```

## Project Structure

```
src/
  actions/              # Server actions (79 files, 15 domains)
  app/                  # App Router (52 pages)
    (auth)/             # Login, accept-invite
    (dashboard)/        # All authenticated screens
    (onboarding)/       # 5-step tenant setup wizard
    api/                # REST endpoints (auth, health, exports, cron, reports)
  components/           # 212 components across 30 directories
    ui/                 # shadcn/ui primitives
    dashboard/          # KPI widgets, charts, panels
    compliance/         # Compliance tables, filters, charts
    findings/           # Observation lifecycle, timeline
    pdf-report/         # React-PDF report components
  data-access/          # Data Access Layer (39 files, tenant-isolated queries)
  emails/               # React Email templates (assignment, escalation, digest)
  hooks/                # Custom React hooks
  jobs/                 # pg-boss background jobs
  lib/                  # Core utilities (auth, permissions, S3, SES, state-machine)
  services/             # Business logic (risk-rating engine)
  stores/               # Zustand stores
  types/                # TypeScript definitions
prisma/
  schema.prisma         # 63 models, 16 enums, 1,999 lines
  seed.ts               # Database seeder (10 users, 2 tenants)
tests/
  e2e/                  # Playwright E2E specs
  auth.setup.ts         # Auth state setup for 5 roles
messages/               # i18n (en.json, hi.json, mr.json, gu.json)
infra/                  # AWS CDK infrastructure
deploy/                 # Deployment configs (Nginx, systemd)
```

## Routes (52 pages)

| Group           | Routes                                                                                                       | Purpose                                |
| --------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| Auth            | `/login`, `/accept-invite`, `/onboarding`                                                                    | Login, invitations, tenant setup       |
| Dashboard       | `/dashboard`, `/analytics`, `/audit-trail`                                                                   | KPI widgets, analytics, audit log      |
| RAM & Planning  | `/ram/[id]`, `/audit-plans`                                                                                  | 19-parameter risk scoring, annual plan |
| Audit Execution | `/audit-execution/[id]/{sections,cash,loans,sma-npa,report}`                                                 | Field audit with 568 items             |
| Findings        | `/findings`, `/findings/[id]`, `/findings/new`                                                               | Observation lifecycle with timeline    |
| Compliance      | `/compliance/{ace,acb}`, `/auditee/[id]`                                                                     | Compliance tracking, branch responses  |
| GRC             | `/risk-management`, `/controls/[id]`, `/issues`, `/work-program`, `/qa-assessment`                           | Risk register, controls, issues        |
| Regulatory      | `/regulatory`, `/concurrent-audit`, `/governance`, `/investments`, `/is-audit`, `/calendar`, `/housekeeping` | UCB regulatory modules                 |
| Reports         | `/reports`                                                                                                   | XLSX + PDF generation                  |
| Admin           | `/admin/{users,branches,zones,templates,ram-config}`, `/settings`                                            | User/branch management, config         |

## Architecture

### Multi-Tenancy

Tenant isolation is enforced at the application level:

1. **Session-only tenantId** — Tenant ID extracted exclusively from authenticated sessions, never from URLs or request bodies
2. **DAL enforcement** — Every query in `src/data-access/` includes `WHERE tenantId = ?`
3. **`prismaForTenant(tenantId)`** — Returns singleton Prisma client; DAL functions enforce isolation via explicit WHERE clauses
4. **Runtime assertions** — Query results verified against expected tenantId

### Authentication & Authorization

- **Better Auth** — Email/password with session cookies (httpOnly, secure, sameSite=lax)
- **Rate limiting** — 10 login attempts per 15 minutes per IP
- **Account lockout** — 5 failed attempts triggers 30-minute lockout
- **Concurrent sessions** — Max 2 per user
- **17 roles:** AUDITOR, AUDIT_MANAGER, CAE, CCO, CEO, AUDITEE, BOARD_OBSERVER, LEAD_AUDITOR, FIELD_AUDITOR, BRANCH_HEAD, ZONAL_AUDITOR, ACE_OFFICER, CONCURRENT_AUDITOR, IS_AUDITOR, RISK_HEAD, ACB_MEMBER, SYSTEM_ADMIN
- **Multi-role** — Users can hold multiple roles; permissions are the union of all role grants
- **Maker-checker** — Creator cannot approve own observations

### Background Jobs

pg-boss processes scheduled jobs:

| Job                     | Schedule         | Purpose                              |
| ----------------------- | ---------------- | ------------------------------------ |
| `process-notifications` | On demand        | Dequeue and send email notifications |
| `deadline-check`        | Daily 06:00 IST  | 7/3/1 day advance reminders          |
| `send-weekly-digest`    | Monday 10:00 IST | Aggregated weekly email digest       |

## Environment Variables

Copy `.env.example` to `.env` and configure. Key variables:

| Variable                                      | Purpose                      |
| --------------------------------------------- | ---------------------------- |
| `DATABASE_URL`                                | PostgreSQL connection string |
| `BETTER_AUTH_SECRET`                          | Auth secret (min 32 chars)   |
| `BETTER_AUTH_URL`                             | Auth base URL                |
| `AWS_REGION`                                  | AWS region (ap-south-1)      |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | AWS credentials              |
| `S3_BUCKET_NAME`                              | Evidence storage bucket      |
| `SES_FROM_EMAIL`                              | Email sender address         |
| `NEXT_PUBLIC_APP_URL`                         | Client-side app URL          |

## Deployment

Production runs on a VPS managed via [Dockge](https://github.com/louislam/dockge) with Docker containers.

| Component         | Details                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| **VPS**           | 4 vCPU, 16GB RAM, Ubuntu (145.223.19.8)                                 |
| **App Container** | `aegis-app` — Multi-stage Docker build, Next.js standalone on port 3000 |
| **Database**      | PostgreSQL 16 in Docker (`postgres-postgres-1` on port 5432)            |
| **Reverse Proxy** | Nginx Proxy Manager with Let's Encrypt SSL (auto-renewal)               |
| **Domain**        | `aegis.nexlyadvisory.com` — HTTPS with HSTS, HTTP/2                     |
| **CI/CD**         | GitHub Actions (build + test, Claude Code review)                       |

### Docker Deployment

```bash
# Build image (NEXT_PUBLIC_APP_URL is inlined at build time)
docker build -t aegis:latest .

# Stack managed by Dockge at /docker/aegis/
# .env contains DB_PASSWORD and BETTER_AUTH_SECRET
docker compose up -d
```

### Post-Deploy Steps

After a fresh deployment with a new database:

1. Push schema: `prisma db push`
2. Disable audit triggers: `ALTER TABLE "Tenant" DISABLE TRIGGER USER;` (repeat for all tables)
3. Seed data: `npx tsx prisma/seed.ts`
4. Re-enable triggers: `ALTER TABLE "Tenant" ENABLE TRIGGER USER;`
5. Apply dashboard views: `psql < prisma/migrations/20260209_dashboard_views.sql`

### Demo Accounts

| Role    | Email                              | Password           |
| ------- | ---------------------------------- | ------------------ |
| CEO     | `rajesh.deshmukh@apexbank.example` | `TestPassword123!` |
| CAE     | `priya.sharma@apexbank.example`    | `TestPassword123!` |
| Auditor | `amit.joshi@apexbank.example`      | `TestPassword123!` |
| CCO     | `suresh.patil@apexbank.example`    | `TestPassword123!` |
| Auditee | `vikram.kulkarni@apexbank.example` | `TestPassword123!` |
| Admin   | `admin@testbank.example`           | `TestPassword123!` |

## Domain Context

**Target users:** Urban Cooperative Banks (Tier III/IV) under RBI supervision.

| Term         | Description                                                    |
| ------------ | -------------------------------------------------------------- |
| **RBIA**     | Risk Based Internal Audit — RBI's mandated audit methodology   |
| **RAM**      | Risk Assessment Model — 19-parameter scoring for branch risk   |
| **CRAR**     | Capital to Risk-weighted Assets Ratio (min 9% for UCBs)        |
| **DAKSH**    | RBI's supervisory scoring system for UCBs                      |
| **PCA**      | Prompt Corrective Action framework for weak banks              |
| **NPA**      | Non-Performing Assets classification and provisioning          |
| **UCB Tier** | Classification by deposit size (Tier 1-4), affects regulations |

## Roadmap

| Phase | Focus                            | Status   |
| ----- | -------------------------------- | -------- |
| 1     | Core Audit Domain (Foundation)   | Complete |
| 2     | Reporting & Compliance Lifecycle | Complete |
| 3     | GRC & Issue Management           | Complete |
| 4     | UCB Regulatory & Governance      | Complete |
| 5     | Advanced Analytics & AI          | Deferred |
| 6     | Specialized Regulatory Modules   | Complete |
| 17    | Critical Security & Quality      | Complete |

See [`.planning/ROADMAP.md`](.planning/ROADMAP.md) for detailed phase breakdowns.

## License

Proprietary. All rights reserved.
