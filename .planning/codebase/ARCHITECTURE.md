# Architecture

**Analysis Date:** 2026-03-02

## Pattern Overview

**Overall:** Full-stack Next.js 16 (App Router) SaaS with multi-tenant application-level isolation, server actions for mutations, and Data Access Layer (DAL) for queries.

**Key Characteristics:**

- **Multi-tenant SaaS:** Application-level isolation via WHERE clauses enforced at the DAL layer; tenantId sourced exclusively from authenticated session
- **Three-layer request handling:** Middleware (Edge) → Page/API (Node) → DAL (Data Access) with security boundaries at each
- **Server-first architecture:** Server components handle data fetching and permission checks; client components remain thin
- **Type-safe mutations:** Server actions in `src/actions/` use Zod validation and permission checks before data modification
- **State management hybrid:** Server-side queries via DAL, client-side caching via React Query, browser state via Zustand
- **Background jobs:** pg-boss job queue for async workflows (escalations, notifications, reminders)

## Layers

**Presentation Layer:**

- Purpose: Render UI components and handle user interactions
- Location: `src/app/` (Next.js App Router pages, layouts) and `src/components/`
- Contains: Page components (server/client hybrids), layout components, UI primitives (shadcn/ui), domain-specific feature components
- Depends on: Actions, hooks, stores, client auth library
- Used by: Browser requests via Next.js routing

**Action Layer (Server Mutations):**

- Purpose: Validate inputs, check permissions, and mutate data
- Location: `src/actions/` (91 files across 15 domains: audit-execution, observations, compliance, rbia, governance, etc.)
- Contains: Server actions exported via `"use server"`, Zod schemas, permission validation, transaction management
- Depends on: DAL functions, permissions library, session management, transaction context
- Used by: Client components via form submissions, form actions, server-side event handlers

**Data Access Layer (DAL):**

- Purpose: Encapsulate all database queries with tenant isolation and permission enforcement
- Location: `src/data-access/` (47 files: session, analytics, dashboard, audit-execution, observations, etc.)
- Contains: Parameterized Prisma queries with explicit `WHERE tenantId = ?`, select clauses for column-level security, complex aggregations
- Depends on: Prisma client, session helpers, business logic (RAM engine, RBIA scoring, etc.)
- Used by: Pages (server components), actions, jobs

**Business Logic Layer (Engines):**

- Purpose: Encapsulate domain-specific calculations and state machines
- Location: `src/lib/` (engine files: ram-engine, rbia-scoring-engine, escalation-engine, housekeeping-engine, sampling-engine)
- Contains: Pure functions for scoring, state transitions, rule evaluation; consumed by DAL and actions
- Depends on: Types, Prisma models
- Used by: DAL functions, actions, tests

**Database Layer:**

- Purpose: Store and persist all application data
- Location: PostgreSQL 16 via `@prisma/adapter-pg`, schema in `prisma/schema.prisma` (71 models, 20 enums, 2320 lines)
- Contains: 71 models (User, Tenant, AuditEngagement, Observation, ExaminationNode, BranchRbiaScore, etc.), 20 enums (Role, ObservationStatus, EngagementStatus, ScoreLabel, etc.), 4 PostgreSQL views for dashboards
- Depends on: pgcrypto, pg_trgm extensions
- Used by: Prisma ORM via `prismaForTenant()` singleton client

**Job Queue Layer:**

- Purpose: Execute async background tasks (escalations, notifications, periodic metrics snapshots)
- Location: `src/jobs/` (8 job handlers) + `src/instrumentation.ts` (job registration)
- Contains: Job handlers registered with pg-boss, job execution logic, notification batching
- Depends on: DAL, notification service, email service, database
- Used by: Cron triggers, system events

**Infrastructure Layer:**

- Purpose: Cross-cutting utilities for logging, auth, S3, SES, request tracking
- Location: `src/lib/` (auth.ts, logger.ts, s3.ts, ses-client.ts, csrf.ts, permissions.ts)
- Contains: Better Auth configuration, Pino logger setup, AWS SDK clients, permission definitions, CSRF protection
- Depends on: Better Auth, AWS SDK, Pino
- Used by: All layers

## Data Flow

**Authenticated Request (Page):**

1. User navigates to `/audit-execution` (protected route)
2. Middleware checks for session cookie (`middleware.ts`) — if missing, redirects to `/login`
3. Page loads as server component, calls `getRequiredSession()` to retrieve tenantId + roles from database
4. Page calls DAL function (e.g., `getAuditEngagements(tenantId)`) to fetch data
5. DAL function calls `prismaForTenant(tenantId)` to get singleton Prisma client, executes query with `WHERE tenantId = ?`
6. Page renders UI with fetched data, hydrates client components for interactivity

**Form Submission (Server Action):**

1. Form element in client component dispatches action via `<form action={createObservation}>`
2. Server action receives FormData or JSON from client
3. Action validates input with Zod schema → rejects invalid data early
4. Action calls `getRequiredSession()` to get tenantId (never from request body)
5. Action checks permissions via `hasPermission(userRoles, "observation:create")`
6. Action calls DAL function to save data, wrapping in `db.$transaction()` for atomicity
7. Action calls `revalidatePath()` to bust Next.js cache
8. Browser receives server action result (success/error) and updates UI
9. Client may refetch data via React Query hook if needed

**Background Job (Escalation):**

1. Cron job scheduled via `pg-boss` triggers at scheduled time
2. Job handler in `src/jobs/overdue-escalation.ts` fetches current findings past deadline
3. Job calls escalation-engine to determine next escalation level and assignees
4. Job calls action point creation action to create new escalation record
5. Job calls notification service to queue email notifications
6. Next.js instrumentation hook ensures jobs are registered on startup

**State Management:**

- **Server state:** Prisma queries in DAL functions (cache invalidation via `revalidatePath`)
- **Network state:** React Query hooks for client-side refetch, polling, pagination
- **Client state:** Zustand stores (auth client state, UI toggles) persisted to localStorage
- **Session state:** Better Auth session cookie + application-level session object in `getRequiredSession()`

## Key Abstractions

**Session (Source of Truth for Identity):**

- Purpose: Represents authenticated user with tenantId, roles, permissions
- Examples: `src/data-access/session.ts`, `src/lib/auth.ts`
- Pattern: `getRequiredSession()` returns `AuthSession` type with user.tenantId and user.roles; used in every protected endpoint

**Prisma Client Singleton with Tenant Isolation:**

- Purpose: Single connection pool per process, tenant isolation enforced via WHERE clauses in DAL
- Examples: `src/lib/prisma.ts` (pool max 25 connections), `prismaForTenant(tenantId)` validation
- Pattern: `prismaForTenant()` validates tenantId as UUID, returns singleton client; DAL functions use it with WHERE clauses

**DAL Function Pattern:**

- Purpose: Encapsulate query logic with tenant isolation, column selection, and aggregation
- Examples: `src/data-access/dashboard.ts`, `src/data-access/audit-execution.ts`
- Pattern: Each function accepts `tenantId`, calls `prismaForTenant(tenantId)`, queries with `WHERE tenantId`, returns typed response

**Server Action Pattern:**

- Purpose: Type-safe mutations with validation, permission checks, and transaction wrapping
- Examples: `src/actions/observations/create.ts`, `src/actions/audit-execution/create-engagement.ts`
- Pattern: Validate with Zod, check permissions, call DAL/Prisma in `db.$transaction()`, revalidate cache, return result object with `{ success, data?, error? }`

**Permission System:**

- Purpose: Role-based access control (RBAC) with 17 roles and 60+ permissions
- Examples: `src/lib/permissions.ts` (ROLE_PERMISSIONS map), `src/lib/guards.ts` (permission check helpers)
- Pattern: `hasPermission(roles: Role[], permission: Permission)` checks if union of user's role permissions includes target permission

**State Machine (Engagement Lifecycle):**

- Purpose: Enforce valid state transitions for audit engagements (PLANNED → TEAM_ASSIGNED → OPENING_MEETING → IN_PROGRESS → EXIT_MEETING → REPORT_DRAFT → COMPLETED)
- Examples: `src/lib/engagement-state-machine.ts`
- Pattern: Validate transitions before state updates; prevent invalid state combinations

**RBIA Scoring Engine:**

- Purpose: Compute 4-point scores (FULLY=1.0, LARGELY=0.75, PARTIALLY=0.5, NON_COMPLIANT=0.0) with weighted roll-up
- Examples: `src/lib/rbia-scoring-engine.ts`, `src/data-access/instance-scoring.ts`
- Pattern: Score items, aggregate per module with critical-item cap, roll up to engagement level

**Escalation Router:**

- Purpose: Determine next escalation level and assign to appropriate role (L1 → L2 → L3 → L4)
- Examples: `src/lib/escalation-router.ts`, `src/lib/escalation-engine.ts`
- Pattern: Check escalation level, determine next role based on bank hierarchy (branch → zonal → central), create escalation record

## Entry Points

**Web Application Root:**

- Location: `src/app/page.tsx`
- Triggers: Browser navigates to `/`
- Responsibilities: Redirect to `/login` (unauthenticated) or `/dashboard` (via login flow)

**Authentication Entry Point:**

- Location: `src/app/(auth)/login/page.tsx` (client form) + `src/app/api/auth/[...all]/route.ts` (Better Auth handler)
- Triggers: User visits `/login` or form submission
- Responsibilities: Email/password validation, session creation, redirect to dashboard on success

**Dashboard Entry Point:**

- Location: `src/app/(dashboard)/dashboard/page.tsx`
- Triggers: User navigates to `/dashboard` after authentication
- Responsibilities: Enforce dashboard permission, fetch widget config based on roles, pre-fetch widget data for SSR

**API Health Check:**

- Location: `src/app/api/health/route.ts`
- Triggers: Monitoring system polls `/api/health`
- Responsibilities: Check database connectivity, pg-boss job queue health, memory usage; return 200/503

**Onboarding Entry Point:**

- Location: `src/app/(onboarding)/onboarding/page.tsx`
- Triggers: New tenant invites users via `/accept-invite` → onboarding wizard
- Responsibilities: Walk user through bank setup (branches, zones, audit plan initial data)

**Job Queue Instrumentation:**

- Location: `src/instrumentation.ts`
- Triggers: Next.js startup hook
- Responsibilities: Register all job handlers with pg-boss (escalation, notifications, reminders, metrics)

## Error Handling

**Strategy:** Errors are caught at boundaries (middleware, page components, server actions) and returned as structured objects with `{ success: false, error: string }` to avoid crashes and allow UI to display user-friendly messages.

**Patterns:**

- **Permission errors:** `hasPermission()` checks return false → action returns `{ success: false, error: "Unauthorized" }`
- **Validation errors:** Zod safeParse returns issues → action returns first issue message
- **Database errors:** Catch in try-catch block, log with context (userId, tenantId, action), return generic error message to client
- **Session errors:** `getRequiredSession()` redirects to `/login` if no valid session (hard stop, not graceful error)
- **Network errors:** Client-side React Query handles retries; server-side operations fail fast
- **Authentication errors:** Middleware redirects to `/login`; layout validates session before rendering children

## Cross-Cutting Concerns

**Logging:** Pino logger with structured JSON logging (environment, context, error stack); logged to stdout in dev, rotated files in production via Docker

**Validation:** Zod schemas for form inputs and API payloads; `zodResolver` for react-hook-form integration; server actions validate before mutation

**Authentication:** Better Auth with email/password + session cookies; multi-session support (max 2 per user); rate limiting (10 login attempts per 15 min per IP); account lockout (5 failures → 30 min lock)

**Authorization:** Role-based access control (17 roles) + permission checks in all actions; DAL functions enforce column-level security via select clauses

**Tenant Isolation:** Session-scoped tenantId + application-level WHERE clauses; no PostgreSQL RLS policies (isolation via code)

**Request Tracking:** x-request-id header propagated through middleware, passed to logger for distributed tracing

---

_Architecture analysis: 2026-03-02_
