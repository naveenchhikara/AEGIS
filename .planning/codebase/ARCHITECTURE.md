# Architecture

**Analysis Date:** 2026-02-20

## Pattern Overview

**Overall:** Multi-tenant SaaS with layered server-first architecture

**Key Characteristics:**

- Next.js App Router with React Server Components as the primary rendering model
- Strict 4-layer separation: Page → Guard → DAL → Prisma
- Application-level multi-tenancy (WHERE clauses, no PostgreSQL RLS)
- Server Actions as the mutation path (no REST API for writes, except auth)
- Background job queue via pg-boss for async processing

## Layers

**Presentation Layer (Pages):**

- Purpose: Render UI, SSR data fetching, permission enforcement at page entry
- Location: `src/app/(dashboard)/*/page.tsx`, `src/app/(auth)/*/page.tsx`
- Contains: React Server Components, async data loading, permission guards
- Depends on: Guards layer, DAL layer, Components
- Used by: Users via browser (routed by Next.js App Router)

**Guards Layer:**

- Purpose: Permission checks before page content renders
- Location: `src/lib/guards.ts`
- Contains: `requirePermission()`, `requireAnyPermission()` — redirect to `/dashboard?unauthorized=true` if denied
- Depends on: `getRequiredSession()` from `src/data-access/session.ts`, `hasPermission()` from `src/lib/permissions.ts`
- Used by: Server Component pages

**Data Access Layer (DAL):**

- Purpose: All database reads; enforces tenant isolation via explicit WHERE clauses
- Location: `src/data-access/*.ts` (39 files covering all domains)
- Contains: Domain-scoped query functions accepting a `Session` argument
- Depends on: `prismaForTenant()` from `src/data-access/prisma.ts`
- Used by: Pages (reads), Server Actions (reads within mutations)

**Server Actions Layer:**

- Purpose: All data mutations; auth + permission + validation before any DB write
- Location: `src/actions/**/*.ts` (79 files across 15 domains)
- Contains: `"use server"` functions following 5-step pattern (auth → permission → validate → DB → revalidate)
- Depends on: `getRequiredSession()`, `hasPermission()`, DAL functions, Zod schemas
- Used by: Client Components via form submissions, React Query mutations

**Business Logic / Engines:**

- Purpose: Pure computation and domain rules with zero side effects
- Location: `src/lib/*.ts`
- Key engines:
  - `src/lib/state-machine.ts` — Observation lifecycle (DRAFT → SUBMITTED → REVIEWED → ISSUED → RESPONSE → COMPLIANCE → CLOSED)
  - `src/lib/ram-engine.ts` — Risk Assessment Model scoring (19 parameters, weighted composite score)
  - `src/lib/escalation-engine.ts` — Compliance escalation levels (L0-L4 based on days overdue)
  - `src/lib/housekeeping-engine.ts` — Housekeeping MIS computation
  - `src/lib/kri-engine.ts` — Key Risk Indicator computation
  - `src/lib/repeat-finding-detector.ts` — Repeat audit finding detection
- Depends on: Prisma-generated types only
- Used by: Server Actions, Jobs

**Background Jobs Layer:**

- Purpose: Async/scheduled processing (notifications, escalation, digests)
- Location: `src/jobs/*.ts`
- Key jobs: `deadline-reminder.ts`, `overdue-escalation.ts`, `notification-processor.ts`, `weekly-digest.ts`, `snapshot-metrics.ts`
- Initialized at: `src/instrumentation.ts` (Next.js server start hook)
- Depends on: pg-boss (`src/lib/job-queue.ts`), DAL, notification service

**Component Layer:**

- Purpose: Reusable UI elements; split into generic UI primitives and domain-specific components
- Location: `src/components/` (212 files across 30 directories)
- Key directories: `src/components/ui/` (shadcn/ui primitives), `src/components/layout/` (sidebar, top-bar), domain directories (`observations/`, `compliance/`, `dashboard/`, etc.)
- Depends on: hooks, stores, React Query, shadcn/ui
- Used by: Pages

## Data Flow

**Page Read Flow:**

1. User navigates to route — Next.js App Router invokes `page.tsx`
2. `requirePermission()` or `requireAnyPermission()` in `src/lib/guards.ts` calls `getRequiredSession()` from `src/data-access/session.ts`
3. If authenticated and authorized, session is returned; otherwise redirect occurs
4. Page calls DAL function (e.g., `getObservations(session, options)`) from `src/data-access/*.ts`
5. DAL function calls `prismaForTenant(tenantId)` from `src/data-access/prisma.ts` (returns singleton) and runs query with explicit `WHERE tenantId = ?`
6. Data is returned to Page as props passed to Client or Server Components

**Mutation Flow (Server Actions):**

1. Client Component submits form or calls server action
2. Server Action (`"use server"`) calls `getRequiredSession()` — always first step
3. `hasPermission(userRoles, permission)` check — returns error object if denied
4. Zod schema validation of input — returns error if invalid
5. `prismaForTenant(tenantId)` used for DB write, often inside `$transaction`
6. `setAuditContext()` called in transaction for audit trail
7. `revalidatePath()` called to invalidate cached page data
8. Returns `{ success: true, data? }` or `{ success: false, error: string }`

**Authentication Flow:**

1. Edge middleware (`src/middleware.ts`) checks for session cookie presence — lightweight, no DB
2. Dashboard layout (`src/app/(dashboard)/layout.tsx`) performs full session validation via `auth.api.getSession()`
3. Individual pages call `getRequiredSession()` for their own auth boundary
4. `tenantId` sourced exclusively from validated session — never from URL params or request body

**State Management:**

- Server state: React Query (client-side caching of server-fetched data)
- Client-only state: Zustand stores in `src/stores/` (onboarding wizard state)
- Form state: react-hook-form with Zod resolvers

## Key Abstractions

**getRequiredSession():**

- Purpose: Single auth boundary — validates session and redirects to login if absent
- Location: `src/data-access/session.ts`
- Pattern: All Server Actions and DAL functions call this; `tenantId` sourced only from here
- Returns: `AuthSession` with `user.tenantId`, `user.roles`, `user.id`

**prismaForTenant(tenantId):**

- Purpose: Returns singleton Prisma client after validating UUID format of tenantId
- Location: `src/data-access/prisma.ts`
- Pattern: Called in every DAL function and Server Action before any DB operation
- Note: Returns same singleton; isolation is in WHERE clauses, not connection-level

**hasPermission() / requirePermission():**

- Purpose: RBAC enforcement — checks if user roles include the required permission
- Location: `src/lib/permissions.ts`, `src/lib/guards.ts`
- Pattern: Multi-role users get union of all role permissions; checks use `roles.includes()` not `role ===`
- Examples: `hasPermission(userRoles, "observation:create")`, `requirePermission("compliance:read")`

**State Machine (observation lifecycle):**

- Purpose: Enforces valid state transitions with role-based guards
- Location: `src/lib/state-machine.ts`
- Pattern: Pure functions; `TRANSITIONS` array defines from→to with `allowedRoles` and optional `severityGuard`
- 7 states: DRAFT → SUBMITTED → REVIEWED → ISSUED → RESPONSE → COMPLIANCE → CLOSED

**DAL Functions:**

- Purpose: Tenant-scoped database queries accepting session as first argument
- Examples: `src/data-access/observations.ts`, `src/data-access/dashboard.ts`, `src/data-access/compliance.ts`
- Pattern: Each file contains functions like `getXxx(session, options?)` and `getXxxById(session, id)`

## Entry Points

**Root:**

- Location: `src/app/page.tsx`
- Triggers: Root URL visit
- Responsibilities: Immediate redirect to `/login`

**Root Layout:**

- Location: `src/app/layout.tsx`
- Triggers: All page requests
- Responsibilities: HTML structure, i18n provider (next-intl), font loading, Toaster

**Dashboard Layout:**

- Location: `src/app/(dashboard)/layout.tsx`
- Triggers: Any `/dashboard/*` or other authenticated route
- Responsibilities: Authoritative session validation (Layer 2 auth), renders AppSidebar + TopBar, wraps in QueryProvider

**Edge Middleware:**

- Location: `src/middleware.ts`
- Triggers: All requests matching the config matcher
- Responsibilities: Cookie-presence check only (Layer 1 auth, UX optimization for redirect), passes through to server for real validation

**Instrumentation Hook:**

- Location: `src/instrumentation.ts`
- Triggers: Server process startup
- Responsibilities: Initializes pg-boss job queue, registers all background workers

**API Routes:**

- Auth: `src/app/api/auth/[...all]/route.ts` — Better Auth handler
- Health: `src/app/api/health/route.ts` — Health check endpoint
- Dashboard: `src/app/api/dashboard/route.ts` — Dashboard data API
- Reports: `src/app/api/reports/route.ts` — Report generation endpoint
- Cron: `src/app/api/cron/route.ts` — Scheduled job trigger
- Exports: `src/app/api/exports/route.ts` — XLSX/PDF export endpoint
- Download: `src/app/api/download/route.ts` — S3 file download proxy

## Error Handling

**Strategy:** Server Actions return `{ success, data?, error? }` discriminated unions; pages handle errors in-component; layout-level `error.tsx` for unhandled exceptions

**Patterns:**

- Server Actions: Wrap DB operations in try/catch, return `{ success: false, error: message }` — never throw
- Pages: Optional try/catch around DAL calls with fallback render states
- Unhandled errors: `src/app/error.tsx` and `src/app/global-error.tsx` as error boundaries
- Permission failures: Redirect to `/dashboard?unauthorized=true` (not an error page)
- Auth failures: Redirect to `/login` with `?redirect=pathname`

## Cross-Cutting Concerns

**Logging:** pino (`src/lib/logger.ts`) — structured JSON logging; `logger.info/warn/error` throughout Server Actions and jobs

**Validation:** Zod schemas co-located with actions (`src/actions/*/schemas.ts`) or in `src/lib/validations/`; Zod v4 with `zodResolver(Schema as any)` for react-hook-form

**Authentication:** Better Auth with Prisma adapter; session stored in DB; additional fields (`tenantId`, `roles`) on user model

**i18n:** next-intl; locale detected server-side; messages in `messages/{en,hi,mr,gu}.json`; `getMessages()` in root layout provides all translations to client

**Audit Trail:** `setAuditContext()` called in Prisma transactions for DB-level tracking; DB trigger-based `AuditLog` table captures changes

---

_Architecture analysis: 2026-02-20_
