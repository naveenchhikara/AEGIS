# Architecture

**Analysis Date:** 2026-02-21

## Pattern Overview

**Overall:** Next.js 16 App Router + Server Components with Three-Layer Data Flow

AEGIS follows a strict **Server Components → Data Access Layer → Prisma ORM** pattern with application-level tenant isolation. No RPC frameworks; server actions and API routes provide mutation/query endpoints.

**Key Characteristics:**
- Edge-safe authentication middleware (cookie check) + server-side session validation in layouts
- Server Component rendering with pre-fetched data for SSR (zero loading flash)
- Data Access Layer enforces tenant isolation via WHERE clauses (application-level, not PostgreSQL RLS)
- Session always source-of-truth for tenantId; never from URL, params, or request body
- Multi-role users with permission union (role array, not single role)
- pg-boss background job queue for async tasks (notifications, escalations, digests)
- Better Auth for session management with account lockout + concurrent session limits

## Layers

**Authentication & Session Layer:**
- Purpose: User identity verification and session management
- Location: `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/auth-lockout-plugin.ts`, `src/middleware.ts`
- Contains: Better Auth config, lockout plugin, session helpers
- Depends on: Prisma ORM for session storage, pg.Pool for rate limiting
- Used by: All pages, API routes, data-access layer via `getRequiredSession()`

**Presentation Layer (Server & Client Components):**
- Purpose: Render pages and interactive UI
- Location: `src/app/` (page routes), `src/components/` (UI components)
- Contains: 52 page routes (auth, dashboard, audit, compliance, GRC, regulatory, admin, reports), 213+ component files
- Depends on: Data Access Layer, Server Actions, Client hooks (Zustand, React Query)
- Used by: Users via HTTP requests

**Server Action Layer:**
- Purpose: Mutation logic with auth + permission checks
- Location: `src/actions/` (81 files across 15 domains: observations, audit-plans, compliance, issues, reports, etc.)
- Contains: Validated input, permission guards, audit context tracking, revalidatePath calls
- Depends on: Data Access Layer (`prismaForTenant()`), permission system, session helpers
- Used by: Client components via form submissions, client-side mutations

**Data Access Layer (DAL):**
- Purpose: All database queries with tenant isolation enforcement
- Location: `src/data-access/` (39 files: observations, audit-execution, dashboard, governance, reports, etc.)
- Contains: Functions that accept session object, extract tenantId, build WHERE clauses
- Depends on: Prisma ORM (`prismaForTenant(tenantId)`), session helpers
- Used by: Pages, Server Actions, API routes

**Business Logic Layer:**
- Purpose: Domain-specific computations and algorithms
- Location: `src/lib/` (35 files), `src/services/` (risk rating computation)
- Contains: Pure functions (RamEngine, RiskRatingService, EscalationRouter, etc.)
- Depends on: Prisma types, constants, enums
- Used by: Server Actions, DAL, Jobs

**Job Queue Layer:**
- Purpose: Asynchronous background work (reminders, escalations, digests, snapshots)
- Location: `src/jobs/` (7 files), `src/lib/job-queue.ts`, `src/instrumentation.ts`
- Contains: pg-boss job registration, cron schedules, job handlers
- Depends on: Prisma ORM, notification service, email templates
- Used by: Triggered by `instrumentation.ts` on server startup, or enqueued via job-queue helpers

**Persistence Layer:**
- Purpose: Database schema and ORM mapping
- Location: `prisma/schema.prisma`, `src/lib/prisma.ts`, `src/generated/prisma/` (Prisma client)
- Contains: 63 Prisma models, 16 enums, PostgreSQL adapter with connection pooling (max 25)
- Depends on: PostgreSQL 16
- Used by: All DAL functions, Jobs, Server Actions

## Data Flow

**Server-Side Rendering (SSR) with Pre-fetched Data:**

1. **Page Request** → User hits `/dashboard`
2. **Middleware** (`src/middleware.ts`) → Cookie check (lightweight, edge-safe) → pass through or redirect to /login
3. **Layout** (`src/app/(dashboard)/layout.tsx`) → `auth.api.getSession()` (full session validation)
4. **Page Component** (`src/app/(dashboard)/dashboard/page.tsx`) → Server Component:
   - `getRequiredSession()` — extract tenantId, roles
   - `getDashboardConfig(roles)` — get role-based widget config
   - `getDashboardData(session, widgetIds)` — DAL function pre-fetches all widget metrics
5. **DAL Function** (`src/data-access/dashboard.ts`) → `prismaForTenant(tenantId)` → builds WHERE clauses with tenantId
6. **Prisma Client** → PostgreSQL query with tenant scope
7. **Response** → Component renders with `initialData` → client hydrates → client can query further via React Query

**Server Action Mutation:**

1. **Form Submission** → Client calls `createObservation(input)` (server action)
2. **Server Action** (`src/actions/observations/create.ts`):
   - `getRequiredSession()` — get tenantId, roles
   - `hasPermission(roles, "observation:create")` — check authorization
   - `CreateObservationSchema.safeParse(input)` — validate
   - `prismaForTenant(tenantId).$transaction()` — atomic create observation + timeline
   - `setAuditContext()` — track who made this change
3. **Prisma** → INSERT observation, INSERT timeline entry
4. **Revalidate** → `revalidatePath("/findings")` — update cache
5. **Response** → `{ success, data?, error? }`

**Background Job Execution:**

1. **Server Startup** → `src/instrumentation.ts` → `startWorkers()` registers job handlers
2. **Cron Trigger** (e.g., daily 06:00 IST) → pg-boss dequeues job
3. **Job Handler** (`src/jobs/deadline-reminder.ts`) → runs `processDeadlineReminders()`:
   - Query overdue observations via DAL
   - Generate notification records
   - Send emails via AWS SES
   - Update notification status
4. **Response** → Job completes, next cron cycle

**State Management:**

- **Server State** (source of truth): PostgreSQL database, queried via DAL
- **Session State** (authentication): Better Auth sessions table + HTTP cookies
- **Client State** (transient UI): React Query for server-synced state, Zustand for local UI state (e.g., onboarding wizard)
- **Cache Invalidation** (ISR): `revalidatePath()` in server actions clears Next.js cache for affected routes

## Key Abstractions

**Session Object:**
- Purpose: Carries authenticated user identity and tenant scope
- Examples: `src/data-access/session.ts` `getRequiredSession()`, `src/lib/auth.ts` Better Auth config
- Pattern: `AuthSession` type with `user: { id, email, name, tenantId, roles: Role[] }`, `session: { id, expiresAt }`
- Usage: Passed to all DAL functions as first parameter; tenantId extracted at DAL boundary

**Permission System:**
- Purpose: Role-based access control with granular permissions
- Examples: `src/lib/permissions.ts` (60+ permissions), `src/actions/observations/create.ts` (permission check)
- Pattern: User holds multiple roles → getPermissions(roles) returns union → check single permission via `hasPermission(roles, permission)`
- Roles: 17 roles (AUDITOR, CAE, CCO, CEO, AUDIT_MANAGER, LEAD_AUDITOR, etc.)

**Tenant Isolation:**
- Purpose: Application-level isolation (no RLS in DB)
- Examples: `src/lib/prisma.ts` `prismaForTenant(tenantId)`, every DAL function adds `WHERE tenantId = ?`
- Pattern: Extract tenantId from session → pass to `prismaForTenant()` (validates UUID format, returns singleton client) → all queries scoped by WHERE
- Safety: `belt-and-suspenders` assertion in DAL functions: even if tenantId somehow changed mid-query, runtime check catches it

**Observation Lifecycle Engine:**
- Purpose: State machine for observation tracking (DRAFT → SUBMITTED → REVIEWED → ISSUED → RESPONSE → COMPLIANCE → CLOSED)
- Examples: `src/actions/observations/transition.ts`, `src/data-access/observations.ts`
- Pattern: Server actions enforce valid transitions + permissions; DAL queries observations with timeline (immutable audit trail)
- Related: ObservationTimeline records WHO, WHEN, WHY for every status change

**Risk Assessment Model (RAM) Engine:**
- Purpose: Compute branch risk scores per RBIA Policy (19 parameters, weighted 1-5)
- Examples: `src/lib/ram-engine.ts` (pure functions), `src/actions/audit-plans/` (invokes engine)
- Pattern: Input array of RamScoreInput → computeCompositeScore() → getRiskCategory() → getAuditFrequency()
- Result: composite score (1-5), risk category (LOW/MEDIUM/HIGH), audit frequency (12/18/24 months)
- Uplift: 1.5× multiplier if repeat findings detected

**Escalation Router:**
- Purpose: Route overdue observations to escalation L1-L4 based on role hierarchy
- Examples: `src/lib/escalation-router.ts`, `src/jobs/overdue-escalation.ts`
- Pattern: Given observation ID, find owner, determine days overdue, route to next escalation level, send notification
- Levels: L1 (assignee), L2 (branch head), L3 (zonal auditor), L4 (CAE)

**Report Generation Pipeline:**
- Purpose: Multi-format export (XLSX, PDF) with dynamic data aggregation
- Examples: `src/lib/excel-export.ts`, `src/components/pdf-report/`, `src/data-access/reports.ts`
- Pattern: Collect observations/compliance data via DAL → format via ExcelJS or React PDF → stream to client
- Formats: Board Report (PDF), Audit Plan (XLSX), Compliance Tracker (XLSX), Gap Analysis (XLSX)

## Entry Points

**Web Page (Server Component):**
- Location: `src/app/(dashboard)/[route]/page.tsx` (52 routes)
- Triggers: HTTP GET requests from authenticated users
- Responsibilities: Call `getRequiredSession()`, pre-fetch data via DAL, render components with SSR data

**Server Action:**
- Location: `src/actions/[domain]/[action].ts` (81 files)
- Triggers: Form submission (POST via `<form action={serverAction}>`) or client-side mutation call
- Responsibilities: Validate input, check permissions, execute mutation, revalidate cache, return result

**API Route:**
- Location: `src/app/api/[endpoint]/route.ts` (health, auth, exports, reports, downloads, cron jobs)
- Triggers: HTTP GET/POST from external systems or UI
- Responsibilities: Parse request, validate, call DAL/services, return JSON response

**Background Job:**
- Location: `src/jobs/[job].ts`
- Triggers: Cron schedule (registered in `src/jobs/index.ts`) or manual enqueue via `enqueueJob()`
- Responsibilities: Fetch data, compute results, send emails, update records

**Middleware:**
- Location: `src/middleware.ts` (edge runtime)
- Triggers: Every HTTP request (except static files)
- Responsibilities: Check session cookie, redirect to /login if missing

## Error Handling

**Strategy:** Three-tier error catching (middleware → layout → server action/API)

**Patterns:**

1. **Middleware (Edge)** — Cookie-based session check (lightweight, no errors thrown)
   - Missing cookie → redirect to /login
   - No exception handling needed (edge runtime constraints)

2. **Layout (Server Component)** — Full session validation + setup check
   - `getRequiredSession()` throws via `redirect("/login")` if no session
   - Missing tenantId or roles → render "Account Setup Required" message (not 500 error)
   - Suspense fallback → skeleton loading state while children pre-fetch data

3. **Server Action / API Route** — Validation + permission checks
   - Input validation via Zod `safeParse()` → return `{ success: false, error: string }`
   - Permission check → return 403-like error object (no exception thrown)
   - Database error → catch block logs + returns `{ success: false, error: "Something went wrong" }`
   - Pattern: `try/catch` wraps `$transaction()`, logs error, returns safe error message to client

4. **Client Component Error Boundary** — React Error Boundary for runtime errors
   - Location: `src/components/` (not widely used, most components are server-rendered)
   - Renders fallback UI if child component throws

**Examples:**
- `src/actions/observations/create.ts` — schema validation, permission check, try/catch around transaction
- `src/lib/auth.ts` — Better Auth handles auth errors (wrong password, rate limit, lockout)
- `src/app/api/health/route.ts` — DB connection error returns 503, logs error

## Cross-Cutting Concerns

**Logging:**
- Framework: pino + pino-pretty
- Location: `src/lib/logger.ts`
- Usage: `logger.info()`, `logger.error()`, `logger.warn()` called throughout DAL, server actions, jobs
- Output: stdout (structured JSON in production, colorized in dev)

**Validation:**
- Framework: Zod v4
- Location: `src/lib/validations/`, `src/actions/[domain]/schemas.ts` (action input schemas)
- Pattern: `SafeParse()` in server actions + API routes; catch validation errors, return safe error messages
- Example: `src/actions/observations/schemas.ts` defines `CreateObservationSchema`

**Authentication:**
- Framework: Better Auth with email/password + Prisma adapter
- Location: `src/lib/auth.ts`, `src/lib/auth-lockout-plugin.ts`
- Checks: Cookie validation in middleware, full session validation in layout, permission checks in server actions
- Security: rate limiting (10 login attempts per 15min), account lockout (5 failures → 30min lock), concurrent session limit (max 2)

**Audit Tracking:**
- Framework: Custom `AuditLog` model + `setAuditContext()` helper
- Location: `src/data-access/audit-context.ts`
- Pattern: Every server action wraps its transaction with `setAuditContext()` to record WHO, WHEN, WHAT
- Usage: Enables audit trail page showing all observation status changes, report generation, etc.

**Internationalization:**
- Framework: next-intl
- Location: `src/i18n/`, `messages/` (en.json, hi.json, mr.json, gu.json)
- Pattern: Server-side `getLocale()`, `getMessages()` in root layout; client components use `useTranslations()`
- Support: English, Hindi, Marathi, Gujarati (for UCB audience)

**Notifications:**
- Framework: Custom `Notification` model + `NotificationService` + pg-boss job queue
- Location: `src/lib/notification-service.ts`, `src/jobs/notification-processor.ts`
- Pattern: Server action creates Notification record → job dequeues and sends email via AWS SES
- Async: Decouples notification creation from email sending (prevents slow sends blocking user interactions)

**File Storage:**
- Service: AWS S3 (ap-south-1, Mumbai region)
- Location: `src/lib/s3-client.ts` (wrapper around AWS SDK)
- Usage: Observations can attach evidence files; signed URLs for download
- Env vars: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`

---

*Architecture analysis: 2026-02-21*
