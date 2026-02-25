# Architecture

**Analysis Date:** 2026-02-25

## Pattern Overview

**Overall:** Layered Server-First Architecture with Next.js App Router

**Key Characteristics:**

- Server Components are the default; Client Components used only where interactivity requires it
- Three-layer data path: Page → DAL → Prisma (tenant-scoped)
- Application-level multi-tenancy enforced in the DAL via `WHERE tenantId = ?` — no PostgreSQL RLS
- Server Actions handle all mutations with auth + permission checks at the top of every action
- Edge middleware provides lightweight cookie-based route gating; full session validation happens in Server Components

## Layers

**Edge Middleware:**

- Purpose: Cookie-based route protection; not full auth validation
- Location: `src/middleware.ts`
- Contains: Public route list, session cookie check, request ID propagation
- Depends on: Next.js Edge Runtime only (no Node.js built-ins)
- Used by: Every HTTP request before it hits the app

**App Router (Pages):**

- Purpose: Route definitions, page-level data fetching, layout nesting
- Location: `src/app/`
- Contains: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` per route segment
- Depends on: DAL functions, Server Actions, Components
- Used by: Browser requests

**Server Actions:**

- Purpose: All data mutations (create, update, delete); replace REST endpoints for form submissions
- Location: `src/actions/` (81 files across 15 domain subdirectories)
- Contains: Auth checks via `getRequiredSession()`, permission guards, Zod validation, DAL calls
- Depends on: `src/data-access/`, `src/lib/permissions.ts`, `src/lib/auth.ts`
- Used by: Client Components, Server Components

**Data Access Layer (DAL):**

- Purpose: All database reads; enforces tenant isolation on every query
- Location: `src/data-access/` (39 files)
- Contains: Query functions that always include `WHERE tenantId = ?`
- Depends on: `src/lib/prisma.ts` (`prismaForTenant()`), `src/data-access/session.ts`
- Used by: Pages (server components), Server Actions

**Business Logic / Engines:**

- Purpose: Complex domain computations isolated from DB and UI
- Location: `src/lib/` (35 files) and `src/services/`
- Contains: `ram-engine.ts`, `rbia-scoring-engine.ts`, `escalation-engine.ts`, `escalation-router.ts`, `kri-engine.ts`, `housekeeping-engine.ts`, `engagement-state-machine.ts`
- Depends on: Prisma types, domain constants
- Used by: Server Actions, DAL functions, background jobs

**Background Jobs:**

- Purpose: Async work (email reminders, escalation runs, digest emails)
- Location: `src/jobs/`
- Contains: pg-boss job handlers registered via `src/instrumentation.ts`
- Depends on: `src/lib/job-queue.ts`, `src/lib/notification-service.ts`, DAL
- Used by: `src/instrumentation.ts` (Next.js server startup hook)

**Components:**

- Purpose: UI rendering; split between Server Components and Client Components
- Location: `src/components/` (213 files across 30 directories)
- Contains: Domain-specific components per feature, shared `ui/` (shadcn), `layout/`
- Depends on: `src/hooks/`, `src/stores/`, Server Action imports
- Used by: Pages

## Data Flow

**Read Flow (Server Component Page):**

1. Request hits `src/middleware.ts` — cookie check, redirect to `/login` if no session
2. Page Server Component calls `getRequiredSession()` from `src/data-access/session.ts`
3. Session returns `{ user, tenantId, roles, permissions }`
4. Page calls DAL function (e.g., `src/data-access/observations.ts`) passing session
5. DAL calls `prismaForTenant(tenantId)` and executes query with `WHERE tenantId = ?`
6. Data returned to page, passed as props to components for rendering

**Mutation Flow (Server Action):**

1. Client Component calls imported Server Action function
2. Server Action calls `getRequiredSession()` — throws if not authenticated
3. Server Action checks permission via `src/lib/permissions.ts` — throws if unauthorized
4. Input validated with Zod schema
5. Server Action calls DAL or calls Prisma directly for the write
6. Returns `{ success: boolean, data?, error? }` to client

**Background Job Flow:**

1. `src/instrumentation.ts` runs at Next.js server startup
2. Registers pg-boss job handlers from `src/jobs/`
3. Jobs are scheduled via cron or enqueued by Server Actions
4. Jobs use DAL functions and `src/lib/notification-service.ts` for email (SES)

**State Management:**

- Server state: React Query (`@tanstack/react-query`) for client-side caching of fetched data
- Client UI state: Zustand stores in `src/stores/`
- Form state: react-hook-form + Zod schemas via `@hookform/resolvers`

## Key Abstractions

**`getRequiredSession()`:**

- Purpose: Single source of truth for `tenantId`; throws on unauthenticated requests
- Location: `src/data-access/session.ts`, exported via `src/data-access/index.ts`
- Pattern: Called at the top of every Server Action and page. Never accept `tenantId` from URL params or request body.

**`prismaForTenant(tenantId)`:**

- Purpose: Returns the singleton Prisma client; signals to DAL functions which tenant context is active
- Location: `src/lib/prisma.ts`
- Pattern: DAL functions call this then immediately apply `WHERE tenantId = ?` in every query

**Engagement State Machine:**

- Purpose: Controls valid `EngagementStatus` transitions (8 states: PLANNED → COMPLETED)
- Location: `src/lib/engagement-state-machine.ts`
- Pattern: Server Actions call the state machine before any status update; invalid transitions are rejected

**RBIA Scoring Engine:**

- Purpose: Computes 4-point weighted scores for ExaminationNode hierarchies
- Location: `src/lib/rbia-scoring-engine.ts`
- Pattern: Takes node tree + responses, returns composite score + per-module scores + rating band

**RAM Engine:**

- Purpose: 19-parameter risk scoring for audit planning
- Location: `src/lib/ram-engine.ts`
- Pattern: Pure computation; accepts parameters, returns scores used for annual plan simulation

**Escalation Engine:**

- Purpose: L1-L4 escalation rules with role-based routing
- Location: `src/lib/escalation-engine.ts` + `src/lib/escalation-router.ts`
- Pattern: Used by background jobs to determine next escalation action

**Permission Guards:**

- Purpose: RBAC enforcement — 17 roles, 60+ permissions
- Location: `src/lib/permissions.ts`, `src/lib/guards.ts`
- Pattern: Server Actions call permission check; pages may also check for conditional UI rendering

## Entry Points

**Root Redirect:**

- Location: `src/app/page.tsx`
- Triggers: All requests to `/`
- Responsibilities: Redirect to `/login`

**Auth Routes:**

- Location: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/accept-invite/page.tsx`
- Triggers: Unauthenticated users, invitation links
- Responsibilities: Better Auth login/session creation

**Dashboard Layout:**

- Location: `src/app/(dashboard)/layout.tsx`
- Triggers: All authenticated page requests
- Responsibilities: Full session validation (not just cookie check), nav shell rendering, locale setup

**REST API:**

- Location: `src/app/api/`
- Contains: `/api/auth/[...all]` (Better Auth), `/api/health`, `/api/exports`, `/api/reports`, `/api/cron`, `/api/download`
- Triggers: External calls, scheduled cron pings, file downloads

**Instrumentation Hook:**

- Location: `src/instrumentation.ts`
- Triggers: Next.js server startup (once per process)
- Responsibilities: Register pg-boss background job handlers

## Error Handling

**Strategy:** Fail-fast with structured error returns from Server Actions

**Patterns:**

- Server Actions return `{ success: false, error: string }` on failure — never throw to client
- `getRequiredSession()` throws `AuthError` if session invalid — caught by Next.js error boundaries
- Permission failures throw immediately in Server Actions — logged via `src/lib/logger.ts`
- DAL functions do not catch errors; they propagate to Server Actions which handle them
- API routes return typed JSON error responses with appropriate HTTP status codes

## Cross-Cutting Concerns

**Logging:** pino + pino-pretty via `src/lib/logger.ts`; request ID (`x-request-id`) threaded from middleware through to logs

**Validation:** Zod schemas defined inline in Server Actions or in `src/types/`; `zodResolver(Schema as any)` used with react-hook-form for v4 compatibility

**Authentication:** Better Auth; session cookie checked at Edge in middleware, full validation via `getRequiredSession()` in Server Components and Server Actions

**Tenant Isolation:** Application-level; `prismaForTenant(tenantId)` + explicit `WHERE tenantId` in every DAL query; tenantId sourced exclusively from session (never URL/body)

**i18n:** next-intl with 4 locales; message files in `messages/{en,hi,mr,gu}.json`; locale config in `src/i18n/`

**Environment Validation:** `@t3-oss/env-nextjs` + Zod in `src/env.ts`; validated at build time

---

_Architecture analysis: 2026-02-25_
