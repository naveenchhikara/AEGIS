# CLAUDE.md

## Project Overview

AEGIS (Audit, Enterprise Governance & Internal Systems) is a **multi-tenant SaaS platform** for Urban Cooperative Banks (UCBs) in India to manage the full internal audit lifecycle — from risk assessment and audit planning through execution, reporting, compliance tracking, and board governance — in compliance with RBI regulations.

**Live:** https://aegis.nexlyadvisory.com
**Scale:** 639 source files · 2,333-line Prisma schema · 71 DB models · 20 enums · 617 commits · 104 v5.0 requirements (complete) + 41 v6.0 requirements (in progress)
**Status:** v5.0 complete (104/104 requirements). v6.0 RBIA Implementation — Phases 18-23 complete, Phase 24 (Score Freeze Fixes) in progress, gap-closure phases 24-26 remaining.

## Tech Stack

- **Framework:** Next.js 16 with App Router + Turbopack
- **UI:** shadcn/ui + Radix UI + Tailwind CSS v4
- **Language:** TypeScript 5.9
- **Database:** PostgreSQL 16 with Prisma 7 ORM (`@prisma/adapter-pg`)
- **Auth:** Better Auth with bcrypt hashing, session cookies, RBAC (17 roles, 60+ permissions)
- **i18n:** next-intl with 4 locales (English, Hindi, Marathi, Gujarati) — `messages/{en,hi,mr,gu}.json`
- **State:** Zustand (client), React Query (server state)
- **File Storage:** AWS S3 (Mumbai region, ap-south-1)
- **Email:** AWS SES with DKIM verification
- **Reports:** ExcelJS (XLSX), @react-pdf/renderer (PDF)
- **Job Queue:** pg-boss
- **Logging:** pino + pino-pretty
- **Testing:** Playwright (E2E), Vitest (unit)
- **Package Manager:** pnpm

## Working Style

- **Always execute verifications yourself** — run tests, check code, use browser tools. Never present manual verification steps for the user to follow.
- **Read relevant files before acting** — if a request is ambiguous, read recent files or ask one clarifying question rather than guessing.
- **Bash conventions:** Use `rm -f` (not `rm`) to avoid interactive prompts. Use `yes |` prefix for commands that may prompt for confirmation.

## Quick Commands

```bash
pnpm install              # Install dependencies
pnpm dev                  # Start dev server (http://localhost:3000) with Turbopack
pnpm build                # Production build
pnpm start                # Start production server
pnpm lint                 # Run ESLint
pnpm db:generate          # Generate Prisma client
pnpm db:push              # Push schema to DB (no migration)
pnpm db:migrate           # Run Prisma migrations
pnpm db:seed              # Seed database (tsx prisma/seed.ts)
pnpm db:studio            # Open Prisma Studio
pnpm seed:master-directions  # Seed RBI master directions
pnpm test:e2e             # Run Playwright E2E tests
pnpm test:e2e:ui          # Run E2E tests with Playwright UI
```

## Architecture

```
.planning/                     # GSD workflow docs (PROJECT, ROADMAP, STATE, REQUIREMENTS)
Project Doc/                   # Business docs, SDD, RBI circulars reference
infra/                         # AWS CDK infrastructure-as-code
messages/                      # i18n message files (en.json, hi.json, mr.json, gu.json)
deploy/                        # Deployment scripts, Nginx config, PM2, demo scripts
scripts/                       # Utility scripts (account creation, S3 setup, translations)
prisma/
├── schema.prisma              # 71 models, 20 enums, 2320 lines
├── seed.ts                    # Database seeder (1,690 lines, 10 users, 2 tenants)
├── migrations/                # Prisma + standalone SQL migrations
└── *.sql                      # Manual SQL (triggers, views)
tests/
├── e2e/                       # Playwright E2E specs
└── auth.setup.ts              # Auth setup for E2E
src/
├── actions/                   # Server actions (91 files across 15 domains)
├── app/                       # Next.js App Router (61 pages)
│   ├── (auth)/                # Login, signup
│   ├── (dashboard)/           # All authenticated pages
│   ├── (onboarding)/          # Tenant onboarding wizard
│   ├── api/                   # REST endpoints (auth, health, exports, cron, reports)
│   └── page.tsx               # Root redirect → /login
├── components/                # 239 files across 30 dirs (ui/, layout/, domain-specific/)
├── data/                      # RBI regulations (production), seed JSON (deprecated)
├── data-access/               # Data Access Layer (47 files) — DB queries with tenant isolation
├── emails/                    # React Email templates (assignment, escalation, digest)
├── generated/prisma/          # Prisma-generated client
├── hooks/                     # Custom React hooks
├── jobs/                      # pg-boss background jobs (reminders, escalation, digest)
├── lib/                       # Core utilities (40 files) — auth, permissions, engines, S3, SES
├── providers/                 # React context providers
├── services/                  # Business logic (risk-rating computation)
├── stores/                    # Zustand stores
├── instrumentation.ts         # Next.js instrumentation hook (pg-boss job registration)
└── types/                     # TypeScript type definitions
```

## Routes (61 pages)

| Group           | Routes                                                                                                                     | Purpose                                            |
| --------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Auth            | `/login`, `/accept-invite`, `/onboarding`                                                                                  | Login/signup, invitations, tenant setup            |
| Dashboard       | `/dashboard`, `/analytics`, `/audit-trail`                                                                                 | KPI widgets, analytics dashboards, audit log       |
| RAM & Planning  | `/ram/[id]`, `/audit-plans`, `/pre-audit-profiling`                                                                        | 19-parameter risk scoring, annual plan simulation  |
| Audit Execution | `/audit-execution`, `/audit-execution/create`, `/audit-execution/[id]/{sections,cash,loans,sma-npa,report,bh-certificate}` | Field audit with section examination (568 items)   |
| RBIA (v6.0)     | `/audit-execution/[id]/rbia`, `/rbia/module/[moduleCode]`, `/rbia/findings`, `/rbia/meetings`, `/rbia/score`               | RBIA examination tree, scoring, findings, meetings |
| Findings        | `/findings`, `/findings/[id]`, `/findings/new`                                                                             | Observation lifecycle with timeline                |
| Compliance      | `/compliance/{ace,acb}`, `/auditee/[id]`                                                                                   | Compliance tracking, branch responses              |
| GRC             | `/risk-management`, `/controls/[id]`, `/issues`, `/work-program`, `/qa-assessment`                                         | Risk register, control library, issue management   |
| Regulatory      | `/regulatory`, `/concurrent-audit`, `/governance`, `/investments`, `/is-audit`, `/calendar`, `/housekeeping`               | UCB-specific regulatory modules                    |
| Reports         | `/reports`                                                                                                                 | XLSX multi-tab + PDF generation                    |
| Admin           | `/admin/{users,branches,zones,templates,ram-config}`, `/settings`                                                          | User/branch management, configuration              |
| API             | `/api/{auth,health,dashboard,exports,reports,cron,download}`                                                               | REST endpoints                                     |

## Authentication & Authorization

- **Auth Provider:** Better Auth with email/password
- **Password Hashing:** bcrypt (via bcryptjs)
- **Session Storage:** Database-backed via Prisma adapter
- **Session Cookies:** `__Secure-better-auth.session_token` (production), `better-auth.session_token` (dev)
- **Middleware:** Edge-compatible cookie check in `src/middleware.ts`, full session validation in dashboard layout
- **Rate Limiting:** 10 login attempts per IP per 15 minutes
- **Account Lockout:** 5 failed attempts → 30-minute lockout
- **Concurrent Sessions:** Max 2 per user
- **RBAC:** 17 roles (AUDITOR, AUDIT_MANAGER, CAE, CCO, CEO, AUDITEE, BOARD_OBSERVER, LEAD_AUDITOR, FIELD_AUDITOR, BRANCH_HEAD, ZONAL_AUDITOR, ACE_OFFICER, CONCURRENT_AUDITOR, IS_AUDITOR, RISK_HEAD, ACB_MEMBER, SYSTEM_ADMIN)
- **Multi-role:** Users can hold multiple roles; permission is union of all role permissions
- **Tenant Isolation:** Application-level WHERE clauses via `prismaForTenant(tenantId)` — tenantId from session only

## Database

- **Engine:** PostgreSQL 16 with pgcrypto + pg_trgm extensions
- **ORM:** Prisma 7 with PostgreSQL adapter (`@prisma/adapter-pg`)
- **Connection Pool:** pg.Pool with max 25 connections
- **Models:** 71 models (User, Tenant, Observation, AuditEngagement, ExaminationNode, ActionPoint, BranchRbiaScore, etc.)
- **Enums:** 20 enums (Role, Severity, ObservationStatus, EngagementStatus, ScoreLabel, ActionPointStatus, etc.)
- **Views:** 4 PostgreSQL views/functions for dashboard (`v_compliance_summary`, `v_observation_severity`, `v_audit_coverage_branch`, `fn_dashboard_health_score`) — applied via standalone SQL, not in Prisma migrations
- **Seed Data:** 10 users, 2 tenants, 39 examination areas, 568 examination items, RAM parameters
- **Prisma Client:** Generated to `src/generated/prisma/`

## Data Layer Pattern

```
Page (server component)
  → getRequiredSession()        # Auth check, get tenantId
  → DAL function (data-access/) # Queries with WHERE tenantId = ?
    → prismaForTenant(tenantId) # Returns singleton Prisma client
  → Component (client/server)   # Renders data
```

- **DAL functions** are in `src/data-access/*.ts` — 47 files covering all domains
- **Server actions** are in `src/actions/` — 91 files with auth + permission checks
- **Session helper:** `getRequiredSession()` from `@/data-access/session` — ALWAYS use this, never accept tenantId from URL/body

## Deployment

- **Live URL:** https://aegis.nexlyadvisory.com
- **VPS:** 145.223.19.8 — 4 vCPU, 16GB RAM, Ubuntu
- **Container management:** Dockge (Docker stacks)
- **Runtime:** Node.js standalone output (Next.js), Docker container `aegis-app` on port 3000
- **Database:** PostgreSQL 16 — Docker container `postgres-postgres-1` on port 5432
- **Reverse Proxy:** Nginx Proxy Manager with SSL on `aegis.nexlyadvisory.com` (valid till 2026-05-21)
- **Docker:** Dockerfile (multi-stage build), docker-compose.yml, docker-compose.dev.yml, docker-compose.prod.yml
- **Infrastructure as Code:** AWS CDK in `infra/` directory
- **CI/CD:** GitHub Actions — `ci.yml` (build + test), `claude.yml` (Claude Code), `claude-code-review.yml`
- **Region:** AWS ap-south-1 (Mumbai) for RBI data localization
- **Deploy workflow:** Push to GitHub → SSH to VPS → `git pull` in project dir → Docker rebuild via Dockge
- **Schema changes:** After deploy, run `prisma db push` inside container; disable triggers before seeding (`DISABLE TRIGGER USER`)

## Environment Variables

See `.env.example` for full list. Key variables:

| Variable                                      | Purpose                                      |
| --------------------------------------------- | -------------------------------------------- |
| `DATABASE_URL`                                | PostgreSQL connection string                 |
| `BETTER_AUTH_SECRET`                          | Auth secret (min 32 chars)                   |
| `BETTER_AUTH_URL`                             | Auth base URL                                |
| `AWS_REGION`                                  | AWS region (ap-south-1)                      |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | AWS credentials                              |
| `S3_BUCKET_NAME`                              | Evidence storage bucket                      |
| `AWS_SES_REGION` / `SES_FROM_EMAIL`           | Email sending (optional in dev)              |
| `NEXT_PUBLIC_APP_URL`                         | Client-side app URL                          |
| `SKIP_ENV_VALIDATION`                         | Set to `1` for Docker builds without secrets |

Validated at build time via `@t3-oss/env-nextjs` + Zod in `src/env.ts`.

## Domain Context

- **Target:** Urban Cooperative Banks (UCBs) in India — Tier III/IV banks under RBI supervision
- **Regulator:** Reserve Bank of India (RBI)
- **Key Requirements:**
  - Data must remain in India (AWS Mumbai region ap-south-1)
  - Multi-language UI (English, Hindi, Marathi, Gujarati)
  - DAKSH score visualization (RBI supervisory score)
  - PCA status (Prompt Corrective Action)
  - RAM (Risk Assessment Model) based audit planning per RBI RBIA policy
  - Compliance lifecycle: Branch Response → ZAC Review → ACE → ACB
  - Escalation engine (L1-L4 with role-based routing)

## Code Style

- Prettier configured (`.prettierrc`) with Tailwind plugin
- shadcn/ui "new-york" style variant (see `components.json`)
- Path alias: `@/*` maps to `./src/*`
- Tailwind CSS v4 with native CSS variables
- Icons: always import from `@/lib/icons` (barrel export), not directly from `lucide-react`
- Zod v4 with `zodResolver(Schema as any)` for react-hook-form compatibility
- Server actions: always use `getRequiredSession()` + permission checks
- DAL functions: always add `WHERE tenantId = ?` for tenant isolation
- Forms: react-hook-form + @hookform/resolvers + Zod schemas

## Preflight Check

Before running E2E tests or deploying, verify:

1. `DATABASE_URL` has no special characters in password (`/`, `@`, `#`, `%`)
2. `BETTER_AUTH_URL` port matches `NEXT_PUBLIC_APP_URL` port
3. All required tables exist (including `FailedLoginAttempt`)
4. Seed users have password hashes (use bcrypt compatible with Better Auth)
5. No locked accounts from previous failed login attempts
6. Port 3000 is available

## Session Management

- **Checkpoint every ~30 messages:** Commit progress and summarize what's done/pending before context fills up
- **Never let compaction fail:** If a session is getting long, proactively commit and start fresh
- **Progress is auto-captured:** Hooks log notifications to `memory/session-progress.md` — no need for manual observer agents

## Sub-Agent / Observer Rules

- **Observer agents are READ-ONLY.** They must NEVER use Edit, Write, or NotebookEdit tools. They observe and record only.
- **Do not spawn observer agents.** Progress capture is handled automatically by hooks. Manual observer sessions are deprecated.
- Sub-agents spawned via Task tool should have a clear, scoped objective — not open-ended exploration

## Database / Environment Configuration

- Database passwords must not contain special characters (`/`, `@`, `#`, `%`, `?`, `=`). Use only alphanumeric passwords.
- When setting `DATABASE_URL`, verify it matches the individual `POSTGRES_*` env vars
- Always test DB connectivity before running migrations or seeds

## Testing / Seed Data

- When seeding test users, always generate proper bcrypt password hashes compatible with Better Auth
- Never seed users without password hashes — auth will silently fail
- Default test password: `TestPassword123!` (hashed via `better-auth/crypto` `hashPassword`)
- After seeding, verify with: `SELECT a."userId", LENGTH(a.password) FROM "Account" a WHERE a."providerId" = 'credential'`
- Prisma uses PascalCase table names: `User`, `Account`, `Session`, `FailedLoginAttempt` (not snake_case)
- E2E tests: Playwright specs in `tests/e2e/` with auth setup in `tests/auth.setup.ts`
- Unit tests: Vitest with happy-dom, test files in `src/lib/__tests__/`

## Gotchas

- **Tenant isolation is application-level** — no PostgreSQL RLS policies exist; `prismaForTenant()` returns the singleton client, DAL functions enforce WHERE clauses
- Radix UI causes hydration warnings in Next.js — use `suppressHydrationWarning` on `<html>` tag
- Dev server uses Turbopack (`pnpm dev` runs `next dev --turbopack`)
- Turbopack cache corruption: if pages show stale content, delete `.next/` and restart dev server
- Recharts center overlays (e.g., "2/8 Audits" text on donut charts) need `pointer-events-none` or they block chart tooltips
- `formatDate()` in `src/lib/utils.ts` formats dates in Indian locale (en-IN) — use it instead of raw ISO strings
- Icons: always import from `@/lib/icons` (barrel export), not directly from `lucide-react`
- Dashboard views (`v_compliance_summary`, etc.) must be applied manually after fresh deploy — not tracked in Prisma migrations
- `src/data/seed/` JSON files are **deprecated** for runtime use — pages should query the database via DAL functions
- Server actions body size limit is 5MB (configured in `next.config.ts`)
- `@react-pdf/renderer`, `pg-boss`, and `exceljs` are externalized from the server bundle (`serverExternalPackages`)
- **`NEXT_PUBLIC_*` vars must be set at Docker BUILD time** (ARG/ENV in Dockerfile) — Next.js inlines them, runtime env has no effect
- **`BETTER_AUTH_SECRET` must be hex-only** (no `+`, `=`, `\`) — base64 chars cause JSON parse errors
- **Shell escaping:** `!` in passwords gets mangled by bash/zsh — use Python or base64 for testing
- **Health check URL:** Must use `http://127.0.0.1:3000` (not `localhost` — IPv6 resolution fails in Docker)

## v6.0 RBIA Implementation (In Progress)

**Phases 18-23 complete.** 37/41 requirements satisfied. Gap-closure phases 24-26 address remaining 4 requirements. Phase 24 (Score Freeze Fixes) in progress.

- **ExaminationNode**: Hierarchical tree with materialized path (`path` field), variable depth 0-5, replaces flat 2-level structure
- **4-point scoring**: `ScoreLabel` enum (FULLY/LARGELY/PARTIALLY/NON_COMPLIANT) maps to decimal scores (1.0/0.75/0.5/0.0) with weighted roll-up and critical-item cap at module level
- **Rating bands**: >80% Very Good, >65% Good, >50% Satisfactory, >40% Moderate, ≤40% Poor (RBIA Policy 2020, Section 8.9.1)
- **ActionPoint vs Observation**: ActionPoints are operational findings (~15-40 per audit, simple lifecycle), Observations are formal 5C findings (~3-10 per audit)
- **EngagementStatus**: 8 states: PLANNED → TEAM_ASSIGNED → OPENING_MEETING → IN_PROGRESS → EXIT_MEETING → REPORT_DRAFT → COMPLETED (+ CANCELLED)
- **BranchRbiaScore**: Frozen JSONB snapshot (summary: composite score, per-module scores, rating band) — DB trigger enforces immutability after freeze
- **Schema is additive**: v6.0 models added alongside old models; both coexist until cleanup phase
- **Terminology**: "Chief Audit Executive (CAE)" display strings renamed to "Head of Internal Audit (HIA)" — `Role.CAE` enum and `cae:*` permissions unchanged
- **Gap-closure phases**: Phase 24 (freeze button wiring + TS error + orphan cleanup), Phase 25 (manual module management UI), Phase 26 (S3 evidence upload with presigned URLs)
- **Planning docs**: `.planning/phases/18-foundation/` through `.planning/phases/26-evidence-upload/`

## Known Issues

1. **SES sandbox mode** — Email only goes to verified addresses; production access pending
2. **DB views not in migrations** — 4 PostgreSQL views require manual SQL application after fresh deploy
3. **Seed data mismatch** — Production DB may have old minimal seed vs comprehensive local seed
