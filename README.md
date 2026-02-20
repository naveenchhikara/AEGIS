# AEGIS

**Audit, Enterprise Governance & Internal Systems**

A multi-tenant SaaS platform for Urban Cooperative Banks (UCBs) in India to manage the full internal audit lifecycle — from risk assessment and audit planning through execution, reporting, compliance tracking, and board governance — in compliance with RBI regulations.

> **Status:** Production deployed at [aegis.nexlyadvisory.com](https://aegis.nexlyadvisory.com). 86/104 requirements complete across 18 modules. 559 source files, 63 DB models, 426 commits.

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

- **VPS:** 4 vCPU, 16GB RAM, Ubuntu
- **Runtime:** Node.js standalone output (Next.js)
- **Database:** PostgreSQL 16 (local on VPS)
- **Reverse Proxy:** Nginx with SSL (Certbot auto-renewal)
- **Process Manager:** systemd (`aegis.service`)
- **Region:** AWS ap-south-1 (Mumbai) for RBI data localization
- **Docker:** Multi-stage Dockerfile and docker-compose configs available
- **CI/CD:** GitHub Actions (build + test, Claude Code review)

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
