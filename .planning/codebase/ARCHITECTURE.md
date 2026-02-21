# Architecture

**Analysis Date:** 2026-02-21

## Pattern Overview

**Overall:** Next.js 16 multi-tenant SaaS with edge-optimized routing, application-level tenant isolation, and server-driven state management.

**Key Characteristics:**

- Server-first architecture leveraging Next.js App Router with server components as the default
- Edge middleware for lightweight request gating (cookie presence)
- Application-level tenant isolation via WHERE clauses in DAL queries (no PostgreSQL RLS policies)
- Segregated request flow: authentication layer (middleware) → authorization layer (guards on pages/actions) → data access layer (session-scoped queries)
- Background job processing via pg-boss integrated with Next.js instrumentation hook
- Client state (form wizards) managed in Zustand with server-sync capability

## Layers

**Edge Runtime (Middleware):**

- Purpose: Fast request gate-keeping without Prisma/Node.js imports; checks for session cookie presence
- Location: `src/middleware.ts`
- Contains: Cookie validation, public route lists, redirect logic
- Depends on: Next.js headers/navigation APIs (Edge runtime compatible)
- Used by: All incoming requests (matched by `matcher` config)
- Security Model: Optimistic check; full session validation happens server-side

**Authentication Layer:**

- Purpose: Session validation, user identity establishment, Better Auth integration
- Location: `src/lib/auth.ts` (Better Auth config), `src/data-access/session.ts` (getRequiredSession/getOptionalSession)
- Contains: Session cookie handling, bcrypt password hashing, multi-role user context
- Depends on: Better Auth library, Prisma for user/session persistence
- Used by: All server components, server actions, API routes via getRequiredSession()
- Security Model: Session sourced from cookies only; never from URL/query/body; cast to AuthSession type at boundary

**Authorization Layer:**

- Purpose: Role-based access control (RBAC) and permission enforcement
- Location: `src/lib/permissions.ts` (permission definitions + hasPermission), `src/lib/guards.ts` (requirePermission/requireAnyPermission)
- Contains: 17 roles, 100+ permissions, multi-role union logic
- Depends on: Session (roles array), Prisma enums (Role type)
- Used by: Page guards (at start of server components), server action guards
- Security Model: Roles from session; permissions are union of all role permissions; guards redirect to /dashboard?unauthorized=true on failure

**Data Access Layer (DAL):**

- Purpose: Tenant-scoped database queries with application-level isolation
- Location: `src/data-access/*.ts` (39 files covering all domains)
- Contains: Query functions accepting session, prismaForTenant() calls, explicit WHERE tenantId filters
- Depends on: `prismaForTenant(tenantId)`, session.user.tenantId, Prisma client
- Used by: Server components (SSR), server actions, API routes
- Security Model: tenantId extracted from session only; UUID validation on tenantId format; WHERE tenantId clause on every query (belt-and-suspenders)

**Server Actions Layer:**

- Purpose: Server-side mutations with auth + permission checks + validation
- Location: `src/actions/` (81 files across 15 domains)
- Contains: createX/updateX/deleteX handlers, Zod validation, permission checks, audit context tracking
- Depends on: getRequiredSession(), hasPermission(), DAL functions, validation schemas
- Used by: Client components (form handlers), page routes
- Pattern: "use server" directive; always check auth → permission → validate input → mutate via DAL → revalidate path/tags

**Presentation Layer:**

- Purpose: UI components, pages, layouts
- Location: `src/components/` (213 files), `src/app/` (52 pages)
- Contains: shadcn/ui wrappers, domain-specific components, page structures, layouts
- Depends on: Server/client components, server actions, React Query for data sync
- Used by: End users via Next.js routing
- Patterns: Server components as default; client only for interactivity; Suspense boundaries for fallback UI

**Job Queue & Background Workers:**

- Purpose: Asynchronous task processing (notifications, digests, escalation, reports)
- Location: `src/lib/job-queue.ts` (pg-boss singleton), `src/jobs/` (job handlers)
- Contains: Scheduled jobs, recurring tasks, pub/sub job queues
- Depends on: PostgreSQL (pg-boss uses same DATABASE_URL), logger
- Triggered by: `src/instrumentation.ts` on server boot; also callable from server actions
- Pattern: Job registered in instrumentation → scheduled cron expressions (IST offsets) → handler processes → revalidates cache or sends notifications

**Client State Management:**

- Purpose: Ephemeral UI state + form progress persistence
- Location: `src/stores/onboarding-store.ts` (Zustand), `src/providers/query-provider.tsx` (React Query context)
- Contains: Wizard progress (localStorage + server sync), SWR cache (React Query)
- Depends on: Zustand persist middleware, localStorage API, server actions for sync
- Used by: Onboarding wizard pages, dashboard widgets (SWR for refetch)
- Pattern: Client-side default; server-sync on explicit save; React Query auto-refetch on window focus

## Data Flow

**Page Request Flow (Authenticated User):**

1. **Middleware** (`src/middleware.ts`) — Check if session cookie exists
   - If missing → redirect to /login
   - If present → allow through
2. **Page Server Component** (e.g., `src/app/(dashboard)/findings/page.tsx`) — Call `requirePermission()`
   - Fetches full session via `getRequiredSession()`
   - Checks permission via `hasPermission(roles, "observation:read")`
   - If unauthorized → redirect to /dashboard?unauthorized=true
   - If authorized → proceed to data fetch
3. **DAL Function** (e.g., `getObservations(session)`) — Query with tenant scope
   - Extract `tenantId = session.user.tenantId`
   - Call `prismaForTenant(tenantId)` (returns singleton Prisma)
   - Add `WHERE tenantId = ?` to query
   - Return typed result
4. **Component Render** — Serialize data as props to client component
   - If client component marked with "use client", hydrate with data
   - If server component, inline data into HTML
5. **Client Hydration** — React takes over, sets up event listeners
   - React Query provider starts polling (if configured)
   - Zustand stores hydrate from localStorage

**Form Submission Flow (Server Action):**

1. **Client** (e.g., `<form action={createObservation}>`) — User submits form
2. **Server Action** (`src/actions/observations/create.ts`) — "use server" directive runs on server
   - Get session: `getRequiredSession()`
   - Check permission: `hasPermission(roles, "observation:create")`
   - Validate input: `CreateObservationSchema.safeParse(input)`
   - Get tenant-scoped DB: `prismaForTenant(tenantId)`
   - Mutate: `db.$transaction()` with audit context
   - Revalidate: `revalidatePath("/findings")` to bust Next.js cache
   - Return: `{ success: true, data? } | { success: false, error }`
3. **Client** — Form updates, error/success toast, redirect or stay on page
4. **Next.js Cache** — Revalidation fetches fresh data on next request

**Background Job Flow (Escalation Example):**

1. **Server Start** — `instrumentation.ts` calls `startWorkers()`
2. **pg-boss Init** — `getJobQueue()` creates PgBoss with DATABASE_URL
3. **Job Registration** — `registerJobs(queue)` subscribes handlers to job names
4. **Job Trigger** — Either scheduled cron (daily 00:30 UTC = 06:00 IST) or manual enqueue
5. **Handler Execution** — Worker dequeues job, runs escalation logic (e.g., escalate DRAFT→IN_REVIEW)
6. **Side Effects** — Send notifications, update Observation.status, log action
7. **Retry** — On error, retry up to 3 times with exponential backoff; log failures
8. **Cleanup** — Job deleted from queue after 30 days

**State Management Flow (Onboarding Wizard):**

1. **Local State** — User fills form on step 3, Zustand store updates
   - `useOnboardingStore.setSelectedDirections(data)` → localStorage persisted
2. **User navigates away** — Browser closes tab or page reloads
3. **Next session** — Store hydrates from localStorage; checks 30-day expiry
4. **User clicks "Save to Server"** — Client calls `saveWizardStep()` server action
   - Server validates, persists to DB
   - Store sets `lastSyncedAt`, `isSyncing = false`
5. **User on different device** — Load page, call `loadFromServer()`
   - Fetches latest from DB
   - Merges if server is newer than local cache
   - Syncs Zustand state

## Key Abstractions

**prismaForTenant(tenantId):**

- Purpose: Tenant-scoped Prisma client wrapper
- Examples: `src/lib/prisma.ts` definition, used in all DAL files
- Pattern: Validates UUID format, returns singleton Prisma (isolation via WHERE clauses, not RLS)
- Why: Prevents P2028 transaction timeout errors under SSR load (had issues with per-query transactions)

**getRequiredSession():**

- Purpose: Fetch authenticated session or redirect to login
- Examples: Used in all pages, server actions, API routes
- Pattern: `const session = await getRequiredSession()` → access `session.user.tenantId`, `session.user.roles`
- Why: Central auth boundary; ensures tenantId is sourced from trusted session, never URL/query

**hasPermission(roles: Role[], permission: Permission):**

- Purpose: Multi-role permission check
- Examples: Called in guards and server action guards
- Pattern: Returns `roles.some(role => rolePermissions[role].includes(permission))`
- Why: Users can hold multiple roles; permission is union of all role permissions

**requirePermission(permission) / requireAnyPermission(permissions):**

- Purpose: Guard function for pages
- Examples: `const session = await requirePermission("observation:read")`
- Pattern: Call at top of page server component; redirects if unauthorized
- Why: DRY; avoids repeating auth checks across pages

**DAL Function Pattern (5-step canonical form):**

- Purpose: Standardized data access with built-in security checks
- Examples: All functions in `src/data-access/*.ts`
- Pattern:
  1. Accept session parameter
  2. Extract tenantId from session
  3. Call prismaForTenant(tenantId)
  4. Add WHERE tenantId = ? (explicit belt-and-suspenders)
  5. Return typed result
- Why: Reduces attack surface for tenant isolation bugs; makes audit easier

**Server Action Pattern (6-step canonical form):**

- Purpose: Standardized mutation with auth, validation, audit, cache revalidation
- Examples: All files in `src/actions/*`
- Pattern:
  1. "use server" directive
  2. getRequiredSession() + extract roles, tenantId
  3. hasPermission() check → return error if unauthorized
  4. Zod validation → return error if invalid
  5. prismaForTenant() + $transaction + audit context
  6. revalidatePath() + return { success, data?, error? }
- Why: Consistent error handling; audit trail; cache invalidation; permission enforcement

**Role-Based Navigation (AppSidebar):**

- Purpose: Show/hide menu items based on user roles
- Examples: `src/components/layout/app-sidebar.tsx` filters nav items
- Pattern: Pass user roles to component; filter nav items via permission check
- Why: UX; prevents confusion of missing pages

## Entry Points

**Web (HTTP/HTTPS):**

- Location: `src/app/page.tsx` → redirects to `/login`
- Triggers: User visits https://aegis.nexlyadvisory.com
- Responsibilities: Redirect to login page

**Login Page:**

- Location: `src/app/(auth)/login/page.tsx`
- Triggers: User navigates to /login (or redirected by middleware)
- Responsibilities: Render login form; call Better Auth `/api/auth/sign-in` on submit

**Dashboard (Authenticated):**

- Location: `src/app/(dashboard)/layout.tsx` (parent) → `src/app/(dashboard)/dashboard/page.tsx` (actual page)
- Triggers: User logs in successfully
- Responsibilities: Validate session, render sidebar + top bar + children

**API Routes:**

- Location: `src/app/api/**/*.ts` (health, auth, exports, reports, cron, dashboard)
- Triggers: HTTP requests to /api/...
- Responsibilities: Health checks, auth endpoints (proxied to Better Auth), data exports, report generation, cron tasks

**Background Jobs:**

- Location: `src/instrumentation.ts` → `src/jobs/index.ts` (job registration)
- Triggers: Server startup or explicit job enqueue
- Responsibilities: Process notifications, send digests, escalate findings, snapshot metrics

## Error Handling

**Strategy:** Try-catch at boundary; log error; return structured result; never throw to client.

**Patterns:**

**Server Actions (Successful)::**

```typescript
return {
  success: true as const,
  data: {
    /* result */
  },
};
```

**Server Actions (Error - Validation)::**

```typescript
const parsed = Schema.safeParse(input);
if (!parsed.success) {
  return {
    success: false as const,
    error: parsed.error.issues[0].message,
  };
}
```

**Server Actions (Error - Permission/Auth)::**

```typescript
if (!hasPermission(userRoles, "permission:name")) {
  return {
    success: false as const,
    error: "You do not have permission...",
  };
}
```

**Server Actions (Error - DB/Runtime)::**

```typescript
try {
  const result = await db.thing.create({ data });
  return { success: true as const, data: result };
} catch (error) {
  logger.error({ error }, "action_name failed");
  return {
    success: false as const,
    error: "Failed to create thing. Try again.",
  };
}
```

**DAL Functions:** Return null/empty array on not found; throw on permission/auth errors; throw on constraint violations (let caller handle recovery).

**Pages:** Use `requirePermission()` which redirects on failure; never try-catch at page level (let errors bubble to error boundary).

**API Routes:** Return 401/403 for auth/permission errors; 400 for validation; 500 for runtime; always `NextResponse.json()`.

## Cross-Cutting Concerns

**Logging:**

- Framework: pino + pino-pretty (dev), plain JSON (prod)
- Patterns: `logger.info()`, `logger.error()`, `logger.warn()` in actions, DAL, jobs
- Files: `src/lib/logger.ts`
- Context: Includes action, userId, tenantId, timestamps

**Validation:**

- Framework: Zod v4 with @hookform/resolvers for react-hook-form
- Patterns: Define Schema in `src/actions/domain/schemas.ts`; safeParse in action; return error if invalid
- Files: `src/actions/*/schemas.ts` files

**Authentication:**

- Framework: Better Auth (email/password, session cookies, bcrypt)
- Patterns: Session sourced from cookies; validated via auth.api.getSession()
- Security: No session in URL/query/body; middleware checks cookie presence (optimization); full validation in pages/actions
- Files: `src/lib/auth.ts`, `src/data-access/session.ts`

**Authorization:**

- Framework: Custom RBAC with 17 roles, 100+ permissions
- Patterns: Multi-role union; permission check on pages via guards; permission check in actions via hasPermission()
- Files: `src/lib/permissions.ts`, `src/lib/guards.ts`

**Audit Trail:**

- Framework: Prisma transaction with audit context injection
- Patterns: Set context in action transaction; audit log rows created automatically
- Files: `src/data-access/audit-context.ts` (setAuditContext helper)

**Tenant Isolation:**

- Framework: Application-level WHERE clauses (no PostgreSQL RLS)
- Patterns: DAL functions always add WHERE tenantId = ?; tenantId from session only
- Files: All `src/data-access/*.ts` files
- Security: Validated UUID format; session-sourced tenantId

**Cache Invalidation:**

- Framework: Next.js revalidatePath(), revalidateTag()
- Patterns: After mutation, call `revalidatePath("/findings")` to bust SSG cache
- Files: Server actions, API routes

**Internationalization (i18n):**

- Framework: next-intl with 4 locales (en, hi, mr, gu)
- Patterns: `getTranslations("Domain")` in server components; `useTranslations()` in client components
- Files: `messages/{en,hi,mr,gu}.json` (domain-organized JSON)

---

_Architecture analysis: 2026-02-21_
