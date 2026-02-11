# Architecture

**Analysis Date:** 2026-02-08
**Updated:** 2026-02-11 (post v2.0 MVP)

## Pattern Overview

**Overall:** Multi-tenant SaaS Platform with Server-Side Rendering and PostgreSQL Backend

**Key Characteristics:**

- Next.js 16 App Router with file-based routing
- PostgreSQL database with Prisma ORM and Row-Level Security (multi-tenancy)
- Better Auth for authentication with session cookies and RBAC (7 roles)
- Server actions for all data mutations with Zod validation
- React Server Components for data fetching, client components for interactivity
- AWS S3 for evidence storage, SES for email, pg-boss for background jobs
- Client-side i18n using next-intl with cookie-based locale storage

## Layers

**Presentation Layer (Client Components):**

- Purpose: Renders UI, handles user interactions, manages client-side state
- Location: `src/components/` and `src/app/(dashboard)/*/page.tsx`
- Contains: React components with "use client" directive, shadcn/ui primitives, TanStack Table, Recharts, React Query for data caching
- Depends on: Server components for data, types from Prisma, utility functions
- Used by: Next.js routing system

**Server Layer (Server Components + Actions):**

- Purpose: Data fetching, mutations, business logic, authorization checks
- Location: `src/actions/` (15 files), `src/app/api/` (API routes), page server components
- Contains: Server actions with Zod validation, Prisma queries with tenant scoping, session checks
- Depends on: Prisma client, Better Auth session, S3 client, SES client
- Pattern: DAL pattern — `server-only → getRequiredSession → prismaForTenant → WHERE tenantId → runtime assertion`

**Data Layer (PostgreSQL + Prisma):**

- Purpose: Persistent storage with multi-tenant isolation
- Location: `prisma/schema.prisma` (865 lines, 23 models)
- Contains: Tenant, User, Observation (7-state lifecycle), Evidence, ComplianceRequirement, AuditPlan, AuditEngagement, BoardReport, DashboardSnapshot, AuditLog, NotificationQueue, EmailLog, OnboardingProgress, and more
- Key feature: Row-Level Security — tenant isolation enforced at database level
- Depends on: PostgreSQL
- Used by: Server actions, API routes, server components

**Authentication Layer:**

- Purpose: User identity, session management, role-based access control
- Location: `src/lib/auth.ts`, `src/lib/auth-client.ts`
- Contains: Better Auth v1.4.18 with Prisma adapter, email/password auth, rate limiting, account lockout, session limits
- Depends on: PostgreSQL (session/account storage)
- Roles: Auditor, Audit Manager, CAE, CCO, CEO, Auditee, Admin

**Infrastructure Layer (AWS):**

- Purpose: Cloud services for evidence, email, and job processing
- Location: `src/lib/s3.ts`, `src/lib/ses-client.ts`, `src/emails/`
- Contains: S3 client (Mumbai, SSE-S3 encryption), SES client (email templates), pg-boss (background jobs)
- Services: S3 (evidence files), SES (notifications), pg-boss (deadline reminders, weekly digests, daily snapshots)

**Type System:**

- Purpose: Enforces type safety across application
- Location: `src/types/index.ts`, Prisma-generated types
- Contains: Application interfaces plus Prisma model types (auto-generated from schema)
- Pattern: Prisma types preferred for database entities; custom types for UI-only concerns

**Utility Layer:**

- Purpose: Shared helper functions, constants, and configuration
- Location: `src/lib/`
- Contains: `utils.ts`, `constants.ts`, `nav-items.ts`, `icons.ts`, `report-utils.ts`

**Routing Layer:**

- Purpose: File-based routing with layouts and nested routes
- Location: `src/app/`
- Contains: Route groups (`(auth)`, `(dashboard)`, `(onboarding)`), page components, layout components, API routes
- New in v2.0: `(onboarding)` route group, `accept-invite` page, API routes for reports and health

**Internationalization Layer:**

- Purpose: Multi-language support for Indian banking context (EN, HI, MR, GU)
- Location: `src/i18n/`, `messages/`
- Pattern: Cookie-based locale storage, dynamic message loading

## Data Flow

**Page Load Flow (v2.0):**

1. User navigates to route
2. Next.js middleware / layout checks session via Better Auth
3. Server component fetches data via Prisma with tenant-scoped queries
4. Data passed to client components as props
5. Client components render with TanStack Table, Recharts, etc.
6. React Query caches client-side data for subsequent interactions

**Mutation Flow (v2.0):**

1. User performs action (create observation, upload evidence, transition state)
2. Client component calls server action
3. Server action validates input with Zod schema
4. Server action checks session and role permissions
5. Prisma executes tenant-scoped database operation
6. AuditLog entry created for data-modifying actions
7. Notification queued if applicable (pg-boss)
8. Server action returns result; React Query invalidates cache

**Observation Lifecycle Flow:**

1. Auditor creates observation (Draft)
2. Auditor submits → Submitted
3. Audit Manager reviews → Reviewed (or returns to Draft)
4. Audit Manager issues to auditee → Issued
5. Auditee responds with evidence → Response
6. Reviewer verifies compliance → Compliance
7. Authorized closer (Manager for Low/Med, CAE for High/Critical) closes → Closed
8. Each transition recorded in ObservationTimeline (immutable)

**State Management:**

- Server state: PostgreSQL (source of truth)
- Client cache: React Query (TanStack Query v5.90)
- Local UI state: React useState (tables, dialogs, filters)
- Auth state: Better Auth session cookie
- Locale: Cookie (`NEXT_LOCALE`)

## Key Abstractions

**Route Groups:**

- `(auth)`: Login page with simple layout
- `(dashboard)`: All authenticated pages with sidebar/topbar layout
- `(onboarding)`: Multi-step onboarding wizard

**DAL Pattern (Data Access Layer):**

- Purpose: Enforce tenant isolation on every database query
- Flow: `server-only → getRequiredSession → prismaForTenant → WHERE tenantId → runtime assertion`
- Files: Server actions in `src/actions/`

**Observation State Machine:**

- Purpose: Enforce valid state transitions for audit observations
- States: Draft → Submitted → Reviewed → Issued → Response → Compliance → Closed
- Special: "Resolved during fieldwork" status with rationale
- Maker-checker: Different roles required for different transitions

**Barrel Exports:**

- `src/lib/icons.ts`: All Lucide icons
- `src/data/index.ts`: Legacy demo data (kept for seed scripts)

**shadcn/ui Component Pattern:**

- Radix UI primitives wrapped with Tailwind CSS styling
- "use client" since Radix requires client-side JS

**Feature Component Grouping:**

- `src/components/dashboard/`, `src/components/compliance/`, `src/components/findings/`, `src/components/reports/`, `src/components/pdf-report/`, `src/components/audit/`, `src/components/settings/`, `src/components/onboarding/`

## Entry Points

**Application Entry:**

- Location: `src/app/layout.tsx`
- Responsibilities: Load fonts, initialize next-intl provider, suppress hydration warnings

**Root Redirect:**

- Location: `src/app/page.tsx`
- Responsibilities: Redirect to `/login`

**Auth Routes:**

- Login: `src/app/(auth)/login/page.tsx`
- Accept Invite: `src/app/accept-invite/page.tsx`

**Dashboard Layout:**

- Location: `src/app/(dashboard)/layout.tsx`
- Responsibilities: Sidebar + topbar layout, Suspense boundary, session verification

**Onboarding:**

- Location: `src/app/(onboarding)/onboarding/`
- Responsibilities: 5-step wizard, server-side persistence, Excel upload

**API Routes:**

- Board report PDF: `src/app/api/reports/board-report/route.ts`
- Health check: `src/app/api/health/route.ts` (used by Dockerfile)

## Error Handling

**Strategy:** Server action validation + session checks + Prisma error handling

**Patterns:**

- Zod validation on all server action inputs (fail-fast with descriptive errors)
- Session verification before any data access
- Tenant-scoped Prisma queries prevent cross-tenant data access
- 404 for invalid routes via `notFound()`
- Immutable audit log records all state-changing operations
- No global error boundary yet (recommended for production)

## Cross-Cutting Concerns

**Logging:** Append-only AuditLog for all data-modifying actions. Console logging in development.

**Validation:** Zod schemas for server action inputs. Prisma schema constraints at database level.

**Authentication:** Better Auth with email/password, rate limiting, account lockout, session limits.

**Authorization:** RBAC with 7 roles. Server actions check role before executing. Sidebar items filtered by role.

**Performance Monitoring:** None (recommended: add before pilot).

**Accessibility:** Skip-to-content link, Recharts `accessibilityLayer`, Radix ARIA attributes, reduced motion support, keyboard navigation.

**Responsive Design:** Mobile-first with Tailwind breakpoints, collapsible sidebar, `use-mobile.tsx` hook.

**Multi-tenancy:** PostgreSQL RLS. Tenant ID on all data tables. DAL pattern enforces scoping.

---

_Architecture analysis: 2026-02-08_
_Updated: 2026-02-11 — reflects v2.0 Working Core MVP (shipped 2026-02-10)_
