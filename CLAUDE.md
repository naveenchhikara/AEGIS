# CLAUDE.md

## Project Overview

AEGIS is a multi-tenant SaaS platform for Urban Cooperative Banks (UCBs) in India to manage internal audits and track compliance with RBI regulations. Built for the Indian banking sector with multi-language support (English, Hindi, Marathi, Gujarati).

**Current Phase:** v2.0 Working Core MVP complete (Phases 5-10). Gap closure in progress (Phases 11-14).

**Current State:** Phase 12 of 14 — Dashboard Data Pipeline. See `.planning/STATE.md` for session continuity details. PostgreSQL backend, Better Auth authentication, multi-tenant RLS isolation, observation lifecycle, auditee portal, notifications, dashboards, onboarding, and security hardening are all shipped.

## Tech Stack

- **Framework:** Next.js 16 with App Router + Turbopack
- **UI:** shadcn/ui (new-york style) + Radix UI + Tailwind CSS v4
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL 16 via Prisma 7 ORM with Row-Level Security
- **Auth:** Better Auth (email/password) with multi-role RBAC
- **State:** Zustand (client), React Query (server state caching)
- **i18n:** next-intl (EN, HI, MR, GU)
- **Email:** AWS SES v2 + React Email templates
- **Storage:** AWS S3 (Mumbai region, evidence files)
- **Jobs:** pg-boss (PostgreSQL-based queue)
- **PDF:** @react-pdf/renderer (board reports)
- **Excel:** ExcelJS (data exports)
- **Validation:** Zod v4
- **Testing:** Vitest + Happy DOM
- **Package Manager:** pnpm

## Quick Commands

```bash
pnpm install                     # Install dependencies
pnpm dev                         # Start dev server (http://localhost:3000, Turbopack)
pnpm build                       # Production build (runs prisma generate first)
pnpm start                       # Start production server
pnpm lint                        # Run ESLint

# Database
pnpm db:generate                 # Generate Prisma client
pnpm db:push                     # Push schema to DB (no migration)
pnpm db:migrate                  # Run migrations (creates SQL files)
pnpm db:seed                     # Seed demo data (Apex Sahakari Bank + Test Bank B)
pnpm db:studio                   # Open Prisma Studio GUI
pnpm seed:master-directions      # Seed RBI master directions & checklist items

# Docker (PostgreSQL)
docker compose -f docker-compose.dev.yml up -d   # Start dev PostgreSQL (port 5433)
docker compose -f docker-compose.dev.yml down     # Stop dev PostgreSQL
```

## Architecture

```
.planning/                     # GSD workflow docs (14 phases, PROJECT, ROADMAP, STATE, REQUIREMENTS)
prisma/
├── schema.prisma              # Database schema (24+ models, RLS policies)
├── migrations/                # SQL migration files
├── seed.ts                    # Demo data seeder (Apex Sahakari Bank + Test Bank B)
└── seed-master-directions.ts  # RBI master directions seeder
messages/                      # i18n translation files (en.json, hi.json, mr.json, gu.json)
src/
├── app/
│   ├── (auth)/login/          # Login page
│   ├── (onboarding)/          # 5-step tenant onboarding wizard
│   ├── (dashboard)/           # Protected pages: dashboard, compliance, audit-plans,
│   │                          #   findings, reports, settings, auditee, admin, audit-trail
│   ├── accept-invite/         # User invitation acceptance flow
│   ├── api/
│   │   ├── auth/[...all]/     # Better Auth endpoints
│   │   ├── dashboard/         # Dashboard data API
│   │   ├── exports/           # Excel export endpoints (findings, compliance, audit-plans)
│   │   └── reports/           # PDF board report generation
│   └── proxy.ts               # Layer 1 auth: optimistic cookie check (no DB hit)
├── data-access/               # Data Access Layer (DAL) — all DB queries go through here
├── actions/                   # Server Actions (form submissions, state transitions)
├── components/
│   ├── ui/                    # shadcn/ui primitives (~33 components)
│   ├── layout/                # AppSidebar, TopBar (role-based nav)
│   ├── dashboard/             # Dashboard widgets (health score, DAKSH gauge, risk heatmap, etc.)
│   ├── findings/              # Observation form, table, filters, detail, timeline, tagging
│   ├── compliance/            # Compliance table, filters, dialog, trend chart
│   ├── audit/                 # Audit calendar, engagement cards, detail sheet
│   ├── auditee/               # Auditee portal (response form, evidence uploader, deadline badges)
│   ├── audit-trail/           # Enriched audit log table + filters
│   ├── reports/               # Board report sections
│   ├── pdf-report/            # React-PDF chart components & primitives
│   ├── settings/              # Bank profile, notification preferences, compliance settings
│   ├── admin/                 # User management, role assignment
│   ├── auth/                  # Login form, session timeout warning
│   └── emails/                # React Email template components
├── emails/                    # Email templates (assignment, reminder, escalation, digest)
├── data/
│   ├── demo/                  # Demo data JSON files (legacy, used for prototype fallback)
│   ├── rbi-regulations/       # RBI regulation knowledge base (JSON + TS modules)
│   └── rbi-master-directions/ # Master directions + checklist items
├── lib/                       # Core utilities (see Lib Utilities section below)
├── hooks/                     # Custom hooks (use-mobile, use-auto-save)
├── stores/                    # Zustand stores (onboarding-store)
├── jobs/                      # pg-boss job handlers (notifications, deadlines, digests)
├── providers/                 # React context providers (QueryClientProvider)
├── generated/                 # Prisma-generated client & enums (auto-generated, do not edit)
├── i18n/                      # next-intl setup (locale detection from cookies)
├── types/                     # TypeScript type definitions
└── instrumentation.ts         # Server startup hooks (pg-boss worker init)
```

## Database Schema (Key Models)

Full schema: `prisma/schema.prisma`

| Model | Purpose |
|-------|---------|
| `Tenant` | Multi-tenant scope (name, tier, dakshScore, pcaStatus, onboardingCompleted) |
| `User` | Auth & roles (email, roles[], tenantId, status: INVITED/ACTIVE/INACTIVE) |
| `Session` / `Account` | Better Auth session & credential storage |
| `Observation` | Audit findings (5C fields: condition, criteria, cause, effect, recommendation; 7-state lifecycle) |
| `ObservationTimeline` | Immutable state change audit trail |
| `Evidence` | S3-stored file uploads linked to observations |
| `ComplianceRequirement` | RBI requirements with status tracking (isCustom for user-added) |
| `RbiMasterDirection` | RBI guidance documents (MD-CAP, MD-IRAC, etc.) |
| `RbiChecklistItem` | Checklist items with tier applicability |
| `Branch` / `AuditArea` | Org structure |
| `AuditPlan` / `AuditEngagement` | Audit schedule & individual engagements |
| `AuditeeResponse` | Immutable auditee responses (no updatedAt) |
| `NotificationQueue` / `EmailLog` | Email queue + SES audit trail |
| `NotificationPreference` | Per-user email settings |
| `BoardReport` | Generated reports (S3 key, metrics snapshot) |
| `DashboardSnapshot` | Time-series metrics for trend widgets |
| `AuditLog` | Enriched activity log (10-year retention, PMLA compliance) |
| `OnboardingProgress` | Tenant setup wizard state |
| `FailedLoginAttempt` | Account lockout tracking (system-level, no tenantId) |

**Key Enums:** `Role` (AUDITOR, AUDIT_MANAGER, CAE, CCO, CEO, AUDITEE, BOARD_OBSERVER), `ObservationStatus` (DRAFT→SUBMITTED→REVIEWED→ISSUED→RESPONSE→COMPLIANCE→CLOSED), `Severity` (LOW, MEDIUM, HIGH, CRITICAL), `UcbTier` (TIER_1-4), `Quarter` (Indian fiscal year: Q1_APR_JUN through Q4_JAN_MAR)

## Key Architectural Patterns

### Two-Layer Authentication

1. **proxy.ts** — Optimistic cookie check (no DB call). Redirects to /login if `better-auth.session_token` absent.
2. **Dashboard layout** — Authoritative session validation via `auth.api.getSession()` (DB call).

### Multi-Tenant Isolation (Belt-and-Suspenders)

1. `prismaForTenant(tenantId)` wraps queries in `SET LOCAL app.current_tenant_id` for RLS.
2. Explicit `WHERE tenantId` in every DAL function.
3. TenantId always sourced from session, never from URL/body.

### Data Access Layer (DAL) Pattern

All database access goes through `src/data-access/`. Pattern:
1. Accept session object (tenantId source)
2. Call `prismaForTenant(tenantId)` for RLS
3. Add explicit WHERE tenantId
4. Runtime assertions where needed
5. Return typed data

**Never query Prisma directly from pages/components/actions** — always go through DAL.

### Server Actions Pattern

Located in `src/actions/`. Pattern:
1. `"use server"` directive
2. Get session & tenantId
3. Permission check via `requirePermission()`
4. Zod validation of inputs
5. Transactional DB write with audit logging
6. `revalidatePath()` for cache invalidation
7. Return `{ success, data?, error? }`

### Observation State Machine

7 states, 8 transitions (6 forward + 2 return). Defined in `src/lib/state-machine.ts`.

```
DRAFT → SUBMITTED → REVIEWED → ISSUED → RESPONSE → COMPLIANCE → CLOSED
                 ↙                              ↙
           (Return to Draft)            (Return to Response)
```

- Role-based guards on each transition
- Severity-based closing: AUDIT_MANAGER for LOW/MEDIUM, CAE for HIGH/CRITICAL
- Tests in `src/lib/__tests__/state-machine.test.ts`

### RBAC Permission System

Defined in `src/lib/permissions.ts`. Multi-role support — users can hold multiple roles. Use `hasPermission(roles, permission)` or `requirePermission()` guards.

### Notification System

- `NotificationQueue` → pg-boss workers → SES email delivery → `EmailLog` audit trail
- Workers: process queue (every minute), deadline check (daily 06:00 IST), weekly digest (Monday 10:00 IST)
- User preferences respected, with mandatory exceptions for regulatory emails (WEEKLY_DIGEST, OVERDUE_ESCALATION, INVITATION)
- Job handlers in `src/jobs/`, queue config in `src/lib/job-queue.ts`

## Lib Utilities

| File | Purpose |
|------|---------|
| `auth.ts` | Better Auth config (rate limiting, lockout, multi-session, cookie settings) |
| `auth-client.ts` | Better Auth browser client (sign-in, sign-up, getSession) |
| `auth-lockout-plugin.ts` | Account lockout (5 failures → 30-min lock) |
| `prisma.ts` | Prisma singleton + `prismaForTenant()` RLS wrapper |
| `state-machine.ts` | Observation lifecycle (7 states, 8 transitions, role guards) |
| `permissions.ts` | RBAC: Role→Permission mapping, `hasPermission()`, multi-role |
| `guards.ts` | `requirePermission()`, `requireAnyPermission()` — page-level auth |
| `s3.ts` | S3 client, file validation (magic-byte check), presigned URLs (5-min expiry) |
| `ses-client.ts` | AWS SES v2 email client |
| `notification-service.ts` | Queue notifications with user preference checks |
| `job-queue.ts` | pg-boss singleton, job scheduling, worker startup |
| `utils.ts` | `formatDate()` (Indian locale en-IN), `cn()` classname helper |
| `constants.ts` | Status labels, severity colors, role descriptions |
| `icons.ts` | Barrel export of lucide-react icons — always import from here |
| `nav-items.ts` | Sidebar navigation config (role-based filtering) |
| `fiscal-year.ts` | Indian fiscal year helpers (Apr-Mar cycle, quarter mapping) |
| `report-utils.ts` | Board report data aggregation |
| `excel-export.ts` | ExcelJS integration for XLSX exports |
| `onboarding-validation.ts` | Step-by-step onboarding wizard validation |
| `validations/` | Zod schemas for forms |

## Environment Variables

Copy `.env.example` to `.env`. Key variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (port 5433 for dev Docker) |
| `BETTER_AUTH_SECRET` | Auth secret (generate with `openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | App URL for auth callbacks |
| `AWS_REGION` | `ap-south-1` (Mumbai — RBI data localization requirement) |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | AWS credentials for S3 + SES |
| `S3_BUCKET_NAME` | Evidence file storage bucket |
| `NEXT_PUBLIC_APP_URL` | Public-facing app URL |

## Domain Context

- **Target:** Urban Cooperative Banks (UCBs) in India — Tier III/IV banks with limited IT
- **Regulator:** Reserve Bank of India (RBI)
- **Key Requirements:**
  - Data must remain in India (AWS Mumbai region ap-south-1, DR to ap-south-2 Hyderabad only)
  - Multi-language UI (English, Hindi, Marathi, Gujarati)
  - DAKSH score visualization (RBI supervisory score)
  - PCA status tracking (Prompt Corrective Action)
  - Indian fiscal year (April-March), quarters: Q1 Apr-Jun, Q2 Jul-Sep, Q3 Oct-Dec, Q4 Jan-Mar
  - 10-year audit log retention (PMLA compliance)

## Deployment

- **Docker:** Multi-stage Dockerfile (Node 22-Alpine, standalone Next.js output)
- **Dev:** `docker-compose.dev.yml` for PostgreSQL only (port 5433); run app with `pnpm dev`
- **Prod:** `docker-compose.yml` for PostgreSQL + app service
- **Target:** AWS Mumbai (ap-south-1) for RBI data localization
- **Output mode:** `standalone` (configured in `next.config.ts`)

## Code Style & Conventions

- Prettier configured (`.prettierrc`) with Tailwind plugin
- shadcn/ui "new-york" style variant (see `components.json`)
- Path alias: `@/*` maps to `./src/*`
- Tailwind CSS v4 with native CSS variables
- Icons: **always** import from `@/lib/icons` (barrel export), never directly from `lucide-react`
- Dates: **always** use `formatDate()` from `src/lib/utils.ts` (formats in Indian locale en-IN)
- Prisma types: import enums from `@/generated/prisma/enums`, not from `@prisma/client`
- Generated files in `src/generated/` — do not edit manually; run `pnpm db:generate` to regenerate
- Server-only data access: DAL functions in `src/data-access/` use `"server-only"` imports
- Zod v4 for all input validation (server actions, API routes)

## Testing

- **Framework:** Vitest with Happy DOM
- **Config:** `vitest.config.ts`
- **Test location:** `src/**/__tests__/**/*.test.ts`
- **Run:** `npx vitest` or `npx vitest run` (single pass)
- **Path alias:** `@/*` resolved in vitest config

## Planning & Workflow

- GSD (Get Stuff Done) workflow — see `.planning/STATE.md` for current progress and session continuity
- Roadmap in `.planning/ROADMAP.md` (14 phases across 3 milestones)
- Requirements in `.planning/REQUIREMENTS.md` (59 v2.0 requirements)
- Each phase has plan files (XX-PLAN.md) and summary files (XX-SUMMARY.md) in `.planning/`

### Milestone Progress

| Milestone | Phases | Status |
|-----------|--------|--------|
| v1.0 Clickable Prototype | 1-4 | Shipped 2026-02-08 |
| v2.0 Working Core MVP | 5-10 | Complete |
| v2.0 Gap Closure | 11-14 | In progress (Phase 12 active) |

## Key Decisions

Documented in `.planning/PROJECT.md`. Architecture-critical:

- **Multi-tenancy:** PostgreSQL RLS — tenant isolation at DB level
- **Auth:** Better Auth (not NextAuth.js) — better Next.js 16 support
- **DAL pattern:** server-only → getRequiredSession → prismaForTenant → WHERE tenantId → runtime assertion
- **RBAC:** Multi-role with permission-first design
- **Observations:** Bottom-up atoms; all macro views derived by aggregation
- **Infrastructure:** S3 PutObject+GetObject only (immutable evidence), SES Mumbai for email, React-PDF for board reports
- **Data locality:** AWS Mumbai (ap-south-1); DR replication only to ap-south-2 (Hyderabad)
- **FK deletion policy:** SetNull for engagementId/repeatOfId to prevent deletion cascades

## Gotchas

- **Docker required:** PostgreSQL runs in Docker (`docker compose -f docker-compose.dev.yml up -d`). Port 5433 mapped to avoid conflicts.
- **Prisma generate:** Run `pnpm db:generate` after schema changes. The generated client lives in `src/generated/` (custom output path).
- **Turbopack cache corruption:** If pages show stale content, delete `.next/` and restart dev server.
- **Radix UI hydration warnings:** Use `suppressHydrationWarning` on `<html>` tag — this is expected.
- **Recharts tooltip blocking:** Center overlays on donut charts (e.g., "2/8 Audits") need `pointer-events-none` or they block chart tooltips.
- **serverExternalPackages:** `@react-pdf/renderer` and `pg-boss` are configured as server external packages in `next.config.ts` — they cannot be bundled by Turbopack.
- **Seed data:** Two seeded tenants exist — Apex Sahakari Bank (primary demo) and Test Bank B. Run `pnpm db:seed` after migrations.
- **RBI master directions:** Seeded separately with `pnpm seed:master-directions` — includes 10 common master directions with tier-specific checklist items.
- **next-intl plugin:** Wraps Next.js config in `next.config.ts`. Locale files live in `messages/` (not `src/`).
- **FailedLoginAttempt:** This table has no tenantId — it's system-level, cross-tenant by design (tracks by email to prevent user enumeration).
- **Auditee responses:** Immutable records (no updatedAt field). Once submitted, they cannot be edited.
- **pg-boss workers:** Started via `instrumentation.ts` on server boot. If workers aren't processing, check that the hook fires and Docker PostgreSQL is running.
- **tsconfig excludes:** `prisma/seed.ts` and `scripts/` are excluded from TypeScript compilation — they use `tsx` runtime directly.
