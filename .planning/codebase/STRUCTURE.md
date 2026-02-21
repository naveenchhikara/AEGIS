# Codebase Structure

**Analysis Date:** 2026-02-21

## Directory Layout

```
/Users/admin/Developer/AEGIS/
├── .planning/                          # GSD workflow docs (PROJECT, ROADMAP, STATE, REQUIREMENTS)
├── Project Doc/                        # Business docs, SDD, RBI circulars reference
├── infra/                              # AWS CDK infrastructure-as-code
├── messages/                           # i18n message files (en.json, hi.json, mr.json, gu.json)
├── deploy/                             # Deployment scripts, Nginx config, PM2, demo scripts
├── scripts/                            # Utility scripts (account creation, S3 setup, translations)
├── prisma/
│   ├── schema.prisma                   # 63 models, 16 enums, 1999 lines
│   ├── seed.ts                         # Database seeder (1,690 lines, 10 users, 2 tenants)
│   └── migrations/                     # Prisma + standalone SQL migrations
├── tests/
│   ├── e2e/                            # Playwright E2E specs
│   └── auth.setup.ts                   # Auth setup for E2E
├── src/
│   ├── actions/                        # Server actions (81 files across 15 domains)
│   ├── app/                            # Next.js App Router (52 pages)
│   │   ├── (auth)/                     # Auth group: login, signup
│   │   ├── (dashboard)/                # Dashboard group: all authenticated pages
│   │   ├── (onboarding)/               # Onboarding group: tenant setup wizard
│   │   └── api/                        # REST endpoints (auth, health, exports, cron, reports)
│   ├── components/                     # UI components (213 files across 30 dirs)
│   ├── data/                           # RBI regulations (production), seed JSON (deprecated)
│   ├── data-access/                    # Data Access Layer (39 files) — DB queries with tenant isolation
│   ├── emails/                         # React Email templates (assignment, escalation, digest)
│   ├── generated/prisma/               # Prisma-generated client
│   ├── hooks/                          # Custom React hooks
│   ├── jobs/                           # pg-boss background jobs (reminders, escalation, digest)
│   ├── lib/                            # Core utilities (35 files) — auth, permissions, engines, S3, SES
│   ├── providers/                      # React context providers
│   ├── services/                       # Business logic (risk-rating computation)
│   ├── stores/                         # Zustand stores (client-side state)
│   ├── types/                          # TypeScript type definitions
│   ├── instrumentation.ts              # Next.js instrumentation hook (pg-boss job registration)
│   ├── middleware.ts                   # Edge runtime request gating (cookie check)
│   └── env.ts                          # Environment variable validation (Zod + t3-oss/env-nextjs)
├── Dockerfile                          # Multi-stage Docker build
├── docker-compose.yml                  # Production Docker stack
├── docker-compose.dev.yml              # Development Docker stack
├── next.config.ts                      # Next.js configuration (Turbopack, serverExternalPackages)
├── tsconfig.json                       # TypeScript config (path aliases: @/*)
├── tailwind.config.ts                  # Tailwind CSS v4 config
├── .prettierrc                         # Prettier code formatting
├── package.json                        # Dependencies + scripts (pnpm)
└── pnpm-lock.yaml                      # pnpm lockfile
```

## Directory Purposes

**src/actions/:**

- Purpose: Server-side mutation handlers (C.R.U.D operations with auth + validation)
- Contains: TypeScript files organized by domain (observations, audit-execution, compliance, etc.)
- Key files:
  - `observations/{create,update,transition}.ts` — Observation lifecycle (DRAFT → APPROVED → RESOLVED)
  - `compliance-management/*.ts` — Compliance status transitions (PENDING → RESOLVED)
  - `audit-execution/*.ts` — Audit section management
  - `reports/*.ts` — Report generation + export
  - `admin/*.ts` — User/branch/zone management (SYSTEM_ADMIN only)
- Pattern: "use server" directive; getRequiredSession() → hasPermission() → validate input → mutate → revalidatePath()

**src/app/(auth)/:**

- Purpose: Public authentication routes (no session required)
- Contains: Login, signup, accept invite, password reset pages
- Key files:
  - `login/page.tsx` — Email/password login form (calls /api/auth/sign-in)
  - `accept-invite/page.tsx` — Accept email invite link (invokes onboarding)
  - `layout.tsx` — Auth layout without sidebar

**src/app/(dashboard)/:**

- Purpose: Authenticated application pages (session required)
- Contains: 50+ pages organized by feature domain
- Key files:
  - `dashboard/page.tsx` — KPI dashboard (widgets by role)
  - `findings/page.tsx` — Observation list + severity distribution
  - `findings/[id]/page.tsx` — Observation detail + timeline
  - `audit-execution/[engagementId]/{sections,cash,loans,report}/page.tsx` — Audit field work
  - `audit-plans/page.tsx` — Annual audit plan simulator
  - `compliance/{ace,acb}/page.tsx` — Compliance lifecycle (branch response → ACE → ACB)
  - `controls/[id]/page.tsx` — Control library browser
  - `governance/page.tsx` — Board reports + policies
  - `regulatory/` — RBI-specific modules (concurrent audit, housekeeping, investments, IS audit)
  - `settings/page.tsx` — Tenant settings
- Pattern: Server component pages call requirePermission() or requireAnyPermission(), fetch data via DAL, pass to client components

**src/app/api/:**

- Purpose: REST API endpoints (for exports, reports, health checks, auth proxying)
- Contains: Route handlers organized by domain
- Key directories:
  - `auth/[...all]/` — Proxies to Better Auth (sign-in, sign-up, sign-out, session)
  - `health/` — Liveness check (DB connectivity)
  - `exports/{findings,compliance,audit-plans}/` — XLSX export
  - `reports/{board-report,gap-analysis}/` — PDF/XLSX report generation
  - `cron/escalation/` — Triggered by external cron (escalate findings daily)
  - `dashboard/` — Real-time widget data fetch
- Pattern: Route handlers call getRequiredSession() → validate permission → query DAL → return NextResponse.json()

**src/components/:**

- Purpose: React UI components (server + client)
- Contains: 30 subdirectories (one per feature domain + shared ui/)
- Key files:
  - `ui/` — shadcn/ui wrappers (button, card, input, dialog, table, sidebar, etc.)
  - `layout/{app-sidebar,top-bar,nav-items}.tsx` — Main navigation
  - `dashboard/` — Dashboard widgets, grid, composer
  - `findings/findings-table.tsx` — Sortable observation table
  - `audit-execution/` — Section examination forms, cash/loan entry
  - `compliance/` — Compliance status timeline
  - `auth/session-warning-wrapper.tsx` — Session expiry warning
  - `form/` — Form building blocks (Zod + react-hook-form integration)
- Pattern: Export domain-specific components from barrel exports (index.ts); use server/client boundaries

**src/data-access/:**

- Purpose: Centralized database query layer (tenant-scoped, permission-aware)
- Contains: 39 TypeScript files, one per domain
- Key files:
  - `session.ts` — getRequiredSession(), getOptionalSession(), hasRole(), hasAnyRole()
  - `prisma.ts` — Re-exports prismaForTenant() from lib
  - `observations.ts` — getObservations(), getObservationById(), getObservationSummary()
  - `audit-execution.ts` — getAuditEngagement(), getExaminationItems(), getSectionProgress()
  - `compliance.ts` — getComplianceStatus(), getComplianceSummary()
  - `audit-plans.ts` — getPlanDrafts(), publishPlan()
  - `dashboard.ts` — getDashboardData() (10-15 widget queries in parallel)
  - `analytics.ts` — getAnalyticsMetrics() (for reports)
  - `ram.ts` — getRiskAssessmentModel(), getRAMDrafts()
- Pattern: Accept (session: AuthSession, options?) → extract tenantId → call prismaForTenant() → add WHERE tenantId → return typed result

**src/emails/:**

- Purpose: React Email templates for transactional emails
- Contains: TSX template files
- Key files:
  - `assignment-notification.tsx` — "You've been assigned observation #123"
  - `escalation-alert.tsx` — "Observation overdue, escalated to manager"
  - `weekly-digest.tsx` — "Your weekly audit summary"
- Pattern: React components with props; rendered to HTML/plain text; sent via SES in background jobs

**src/hooks/:**

- Purpose: Custom React hooks for reusable client-side logic
- Contains: TypeScript hooks for state, side effects, data fetching
- Key files: Domain-specific hooks for UI state management

**src/jobs/:**

- Purpose: pg-boss background job handlers
- Contains: Job handler functions registered in instrumentation.ts
- Key files:
  - `index.ts` — registerJobs(queue) — exports job registry
  - `escalation.ts` — Escalate overdue findings (daily 06:00 IST)
  - `notifications.ts` — Process queued notifications (every minute)
  - `weekly-digest.ts` — Send digest emails (Monday 10:00 IST)
  - `board-report.ts` — Generate board reports (on-demand or scheduled)
- Pattern: Async handler (async (job) => { ... }); accepts tenantId in job.data; logs to logger; returns void or throws on error

**src/lib/:**

- Purpose: Core utilities and shared business logic
- Contains: 35 TypeScript files (auth, permissions, engines, S3, SES, etc.)
- Key files:
  - `auth.ts` — Better Auth configuration (email/password, session adapter)
  - `auth-client.ts` — Browser-side Better Auth client
  - `auth-lockout-plugin.ts` — Account lockout after failed login attempts
  - `permissions.ts` — RBAC: 17 roles, 100+ permissions, hasPermission()
  - `guards.ts` — requirePermission(), requireAnyPermission() (page guards)
  - `prisma.ts` — Singleton Prisma client + prismaForTenant() wrapper
  - `job-queue.ts` — pg-boss singleton + job scheduling
  - `logger.ts` — pino logger setup
  - `ram-engine.ts` — Risk Assessment Model scoring algorithm (19 parameters)
  - `escalation-engine.ts` — Escalation state machine (DRAFT → IN_REVIEW → CLOSED)
  - `escalation-router.ts` — Route escalations to roles (CAE → CCO → CEO)
  - `state-machine.ts` — Generic state machine builder (for observation, compliance states)
  - `s3.ts` — AWS S3 client (evidence uploads)
  - `ses-client.ts` — AWS SES client (email sending)
  - `notification-service.ts` — Enqueue notifications to job queue
  - `utils.ts` — Misc helpers (formatDate, cn for Tailwind, etc.)
  - `validations/` — Zod schemas for common inputs (email, password, UUID)
  - `icons.ts` — Barrel export of lucide-react icons
- Pattern: Pure utility functions exported as named exports; no side effects in module body (except logger init)

**src/providers/:**

- Purpose: React context providers for global app state
- Contains: Provider components wrapping \_app equivalent
- Key files:
  - `query-provider.tsx` — React Query provider (SWR config)
  - (Onboarding context if needed)

**src/services/:**

- Purpose: Business logic isolated from data access or API layers
- Contains: Domain-specific service functions
- Key files:
  - Risk rating computation, compliance calculation, RAM scoring
- Pattern: Pure functions that accept data, return computed result; no DB calls

**src/stores/:**

- Purpose: Client-side state management via Zustand
- Contains: Store definitions with localStorage persistence
- Key files:
  - `onboarding-store.ts` — Wizard progress (step, completed steps, form data); auto-saves to localStorage; server-sync methods
- Pattern: create() hook with persist middleware; actions to mutate state; partialize to exclude functions from serialization

**src/types/:**

- Purpose: TypeScript type definitions for custom domains
- Contains: interfaces, type aliases, discriminated unions
- Key files:
  - `index.ts` — Re-exports from generated Prisma types
  - `onboarding.ts` — OnboardingState, OnboardingStep, wizard form types
- Pattern: Avoid re-exporting Prisma types unless necessary (use generated types directly)

**prisma/:**

- Purpose: Database schema, migrations, and seed data
- Contains: Prisma schema definition + SQL migrations
- Key files:
  - `schema.prisma` — 63 models, 16 enums, full schema definition
  - `seed.ts` — Seeder script (1,690 lines) creating 10 test users, 2 tenants, 39 examination areas, 568 examination items
  - `migrations/` — Prisma migration history
  - `*.sql` — Manual SQL for triggers, views, functions (applied after `prisma db push`)
- Pattern: `pnpm db:push` to sync schema; `pnpm db:seed` to populate test data; `pnpm db:migrate` for production migrations

**tests/:**

- Purpose: E2E and unit tests
- Contains: Playwright specs, test setup
- Key files:
  - `e2e/auth.setup.ts` — Auth scenario setup (login → dashboard)
  - `e2e/*.spec.ts` — Playwright test cases (observations, compliance, reports)
  - `src/lib/__tests__/` — Unit tests for utilities (Vitest)
- Pattern: Playwright for critical user flows; Vitest for utility functions; always use test.describe() and test.it()

**messages/:**

- Purpose: i18n translation files (4 locales)
- Contains: JSON files with nested translation keys
- Key files:
  - `en.json`, `hi.json`, `mr.json`, `gu.json` — Domain-organized messages (Findings, Compliance, Audit, Admin, etc.)
- Pattern: Use `getTranslations("Domain")` in server components; `useTranslations()` in client components

## Key File Locations

**Entry Points:**

- `src/app/page.tsx` — Root redirect → /login
- `src/app/(auth)/login/page.tsx` — Login form
- `src/app/(dashboard)/layout.tsx` — Dashboard auth boundary
- `src/app/(dashboard)/dashboard/page.tsx` — KPI dashboard

**Configuration:**

- `src/env.ts` — Environment validation (Zod + t3-oss/env-nextjs)
- `tsconfig.json` — TypeScript paths (e.g., `@/* → src/*`)
- `next.config.ts` — Next.js config (Turbopack, externalized packages)
- `tailwind.config.ts` — Tailwind CSS custom config
- `.prettierrc` — Prettier formatting
- `src/middleware.ts` — Edge runtime request gating

**Core Logic:**

- `src/lib/auth.ts` — Better Auth configuration
- `src/lib/permissions.ts` — RBAC definitions + hasPermission()
- `src/lib/prisma.ts` — Prisma singleton + prismaForTenant()
- `src/lib/ram-engine.ts` — Risk Assessment Model algorithm
- `src/lib/escalation-engine.ts` — Escalation state machine
- `src/data-access/session.ts` — getRequiredSession() + tenant extraction
- `src/instrumentation.ts` — pg-boss job initialization

**Database:**

- `prisma/schema.prisma` — Full schema (63 models, 16 enums)
- `prisma/seed.ts` — Seeder (10 users, 2 tenants, test data)
- `prisma/migrations/` — Migration history

**Testing:**

- `tests/e2e/auth.setup.ts` — E2E auth setup
- `tests/e2e/` — Playwright specs
- `src/lib/__tests__/` — Vitest unit tests

## Naming Conventions

**Files:**

- Pages: `page.tsx` (Next.js convention)
- Layouts: `layout.tsx` (Next.js convention)
- API routes: `route.ts` (Next.js convention)
- Components: PascalCase (e.g., `FindingsTable.tsx`, `ObservationDetail.tsx`)
- Utilities: camelCase (e.g., `formatDate.ts`, `calculateRiskScore.ts`)
- Server actions: camelCase (e.g., `createObservation.ts`, `updateCompliance.ts`)
- Data access: camelCase (e.g., `observations.ts`, `audit-execution.ts`)
- Schemas: PascalCase (e.g., `CreateObservationSchema`, `UpdateComplianceSchema` in schemas.ts)
- Constants: UPPER_SNAKE_CASE (e.g., `JOB_NAMES`, `QUEUE_OPTIONS`)

**Directories:**

- Feature domains: kebab-case (e.g., `audit-execution`, `compliance-management`, `pre-audit-profiling`)
- UI components: lowercase (e.g., `components/ui/`, `components/dashboard/`)
- Internal utilities: lowercase (e.g., `src/lib/`, `src/hooks/`)
- Server functions: domain-based (e.g., `src/actions/observations/`, `src/data-access/`)

**Variables & Functions:**

- Functions: camelCase (e.g., `getObservations()`, `createObservation()`, `hasPermission()`)
- Constants: camelCase or UPPER_SNAKE_CASE based on scope (local: camelCase; exported: UPPER_SNAKE_CASE for truly constant)
- React hooks: camelCase with `use` prefix (e.g., `useOnboardingStore()`, `useObservations()`)
- Types: PascalCase (e.g., `AuthSession`, `ObservationStatus`, `DashboardData`)
- Enums: PascalCase (e.g., `Role`, `ObservationStatus`, `ComplianceStatus` — imported from Prisma)

**TypeScript Types:**

- Interfaces: PascalCase, prefix with I only if disambiguation needed (e.g., `AuthSession`, `DashboardData`)
- Generics: PascalCase (e.g., `T`, `K`, `V`)
- Branded types: PascalCase with `Brand` suffix if using nominal typing (e.g., `TenantId`)
- Enums: PascalCase (e.g., `Role`, `ObservationStatus`)

## Where to Add New Code

**New Feature (End-to-End):**

1. Create domain directory: `src/actions/{domain}/` for mutations
2. Add server action files: `create.ts`, `update.ts`, `transition.ts`
3. Add Zod schemas: `src/actions/{domain}/schemas.ts`
4. Add DAL functions: `src/data-access/{domain}.ts`
5. Add page: `src/app/(dashboard)/{domain}/page.tsx`
6. Add components: `src/components/{domain}/{ComponentName}.tsx`
7. Add tests: `tests/e2e/{domain}.spec.ts`

**New Component/Module:**

- Implementation: `src/components/{domain}/{ComponentName}.tsx`
- Barrel export: Update `src/components/{domain}/index.ts`
- Tests: `src/lib/__tests__/{component}.test.ts` (Vitest)

**Utilities/Helpers:**

- Shared helpers: `src/lib/{feature}.ts`
- Domain-specific utils: `src/lib/{domain}/`
- Validation schemas: `src/lib/validations/{schema}.ts`
- Custom hooks: `src/hooks/{feature}.ts`

**Database:**

- Schema changes: Edit `prisma/schema.prisma` then `pnpm db:push`
- Custom SQL: Add to `prisma/*.sql` (applied manually post-migration)
- Seed data: Update `prisma/seed.ts`

**Styling:**

- Global styles: `src/app/globals.css` (Tailwind directives)
- Component styles: Inline Tailwind classes (v4 native CSS variables)
- Theme config: `tailwind.config.ts` (color overrides)

**Testing:**

- E2E: Add `tests/e2e/{feature}.spec.ts` (Playwright)
- Unit: Add `src/lib/__tests__/{feature}.test.ts` (Vitest)

## Special Directories

**src/generated/prisma/:**

- Purpose: Auto-generated Prisma client types
- Generated: Yes (by `pnpm db:generate`)
- Committed: Yes (committed to repo)
- Override: Never edit manually; run `pnpm db:generate` to regenerate

**node_modules/:**

- Purpose: Installed npm dependencies
- Generated: Yes (by `pnpm install`)
- Committed: No (.gitignore'd)
- Maintain: Keep pnpm-lock.yaml in sync; commit lock file

**.next/:**

- Purpose: Next.js build cache
- Generated: Yes (by `pnpm build` or `pnpm dev`)
- Committed: No (.gitignore'd)
- Troubleshoot: Delete and restart if Turbopack cache is stale

**messages/:**

- Purpose: i18n translation files
- Generated: No (manually created/updated)
- Committed: Yes (source of truth)
- Maintain: Add keys to all 4 files (en, hi, mr, gu) to avoid runtime errors

**Project Doc/:**

- Purpose: Business documentation, SDD, RBI circulars
- Generated: No (external reference docs)
- Committed: Yes (reference)
- Keep: For context; not executed

**infra/:**

- Purpose: AWS CDK infrastructure-as-code
- Generated: No (hand-written)
- Committed: Yes (source of truth)
- Use: `cdk deploy` to provision AWS resources; `cdk destroy` to tear down

---

_Structure analysis: 2026-02-21_
