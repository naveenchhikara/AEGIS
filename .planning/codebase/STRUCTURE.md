# Codebase Structure

**Analysis Date:** 2026-02-22

## Directory Layout

```
/Users/admin/Developer/AEGIS/
├── .planning/                           # GSD workflow docs (PROJECT, ROADMAP, STATE, REQUIREMENTS)
├── Project Doc/                         # Business docs, SDD, RBI circulars reference
├── deploy/                              # Deployment scripts, Nginx, PM2, demo scripts
├── infra/                               # AWS CDK infrastructure-as-code
├── messages/                            # i18n message files (en.json, hi.json, mr.json, gu.json)
├── prisma/
│   ├── schema.prisma                    # 71 models, 20 enums, 2320 lines
│   ├── seed.ts                          # Database seeder (10 users, 2 tenants, all master data)
│   ├── migrations/                      # Prisma migrations (pnpm db:migrate)
│   └── *.sql                            # Manual SQL (triggers, views, custom logic)
├── scripts/                             # Utility scripts (account creation, S3 setup, translations)
├── tests/
│   ├── e2e/                             # Playwright E2E specs (login, audit execution, exports)
│   └── auth.setup.ts                    # Auth setup for E2E tests
├── src/
│   ├── actions/                         # Server actions (81 files across 18 domains)
│   │   ├── admin/                       # User/branch/zone management
│   │   ├── audit-execution/             # Engagement lifecycle
│   │   ├── audit-plans/                 # RAM planning
│   │   ├── compliance/                  # Compliance tracking
│   │   ├── concurrent-audit/            # Concurrent audit lifecycle
│   │   ├── control-library/             # Control management
│   │   ├── governance/                  # Board governance
│   │   ├── housekeeping/                # Housekeeping checks
│   │   ├── investment/                  # Investment compliance
│   │   ├── issues/                      # Issue management
│   │   ├── observations/                # Observation lifecycle (create, update, resolve)
│   │   ├── qa-assessment/               # QA assessment lifecycle
│   │   ├── ram/                         # Risk assessment model
│   │   ├── regulatory/                  # Regulatory module
│   │   ├── repeat-findings/             # Repeat finding logic
│   │   ├── reports/                     # Report generation
│   │   ├── risk-management/             # Risk register
│   │   └── work-program/                # Work program execution
│   ├── app/                             # Next.js App Router (52 pages)
│   │   ├── (auth)/                      # Authentication routes (public)
│   │   │   └── login/page.tsx           # Login/signup tabs
│   │   ├── (dashboard)/                 # Protected routes (require session)
│   │   │   ├── dashboard/page.tsx       # Main dashboard (KPIs, widgets)
│   │   │   ├── admin/                   # Admin pages (users, branches, zones, templates, RAM config)
│   │   │   ├── analytics/               # Analytics dashboard
│   │   │   ├── audit-execution/         # Audit execution workflow
│   │   │   │   ├── [engagementId]/      # Engagement detail page
│   │   │   │   │   ├── page.tsx         # Overview tab
│   │   │   │   │   ├── sections/        # Field examination (568 items across sections)
│   │   │   │   │   ├── cash-verification/
│   │   │   │   │   ├── loan-review/
│   │   │   │   │   ├── sma-npa/         # SMA/NPA audit
│   │   │   │   │   ├── bh-certificate/
│   │   │   │   │   └── report/page.tsx  # Report generation + signing
│   │   │   │   └── create/page.tsx      # Create new engagement
│   │   │   ├── audit-plans/page.tsx     # Annual audit planning + simulation
│   │   │   ├── audit-trail/page.tsx     # Immutable audit log
│   │   │   ├── auditee/                 # Auditee branch response view
│   │   │   ├── compliance/              # Compliance tracking (ACE, ACB)
│   │   │   ├── concurrent-audit/        # Concurrent audit module
│   │   │   ├── controls/                # Control library
│   │   │   ├── findings/                # Observation management (5C findings)
│   │   │   ├── governance/              # Board governance
│   │   │   ├── housekeeping/            # Housekeeping MIS
│   │   │   ├── investments/             # Investment compliance
│   │   │   ├── is-audit/                # IS audit module
│   │   │   ├── issues/                  # Issue management + board report
│   │   │   ├── pre-audit-profiling/     # Pre-audit branch profiling
│   │   │   ├── qa-assessment/           # QA assessment
│   │   │   ├── ram/                     # Risk assessment model UI
│   │   │   ├── regulatory/              # Regulatory module
│   │   │   ├── reports/page.tsx         # Report downloads (XLSX, PDF)
│   │   │   ├── risk-management/         # Risk register
│   │   │   ├── settings/                # User/notification settings
│   │   │   ├── work-program/            # Work program execution
│   │   │   ├── calendar/                # Event calendar
│   │   │   ├── layout.tsx               # Dashboard layout (Layer 2 session validation)
│   │   │   ├── error.tsx                # Error boundary
│   │   │   ├── unauthorized-toast.tsx   # Permission denied toast
│   │   ├── (onboarding)/                # Tenant onboarding (public but auth-gated)
│   │   │   └── onboarding/page.tsx      # Onboarding wizard
│   │   ├── accept-invite/page.tsx       # Invite acceptance flow
│   │   ├── api/                         # REST API routes
│   │   │   ├── auth/[...all]/route.ts   # Better Auth endpoints
│   │   │   ├── health/route.ts          # Health check (DB, job queue, memory)
│   │   │   ├── dashboard/route.ts       # Dashboard data export
│   │   │   ├── exports/                 # Data exports
│   │   │   │   ├── compliance/route.ts
│   │   │   │   ├── findings/route.ts
│   │   │   │   └── audit-plans/route.ts
│   │   │   ├── reports/                 # Report generation
│   │   │   │   ├── board-report/route.ts
│   │   │   │   └── gap-analysis/route.ts
│   │   │   ├── download/route.ts        # File download from S3
│   │   │   ├── cron/escalation/route.ts # Escalation trigger (scheduled)
│   │   │   └── is-audit/checklist/route.ts
│   │   ├── page.tsx                     # Root redirect (→ /login)
│   │   ├── layout.tsx                   # Root layout (fonts, i18n, Toaster)
│   │   ├── error.tsx                    # Global error boundary
├── src/components/                      # React components (213 files across 30+ domains)
│   ├── ui/                              # shadcn/ui primitives (30+ components)
│   │   ├── button.tsx, card.tsx, dialog.tsx, form.tsx, input.tsx, etc.
│   ├── layout/                          # App layout
│   │   ├── app-sidebar.tsx              # Sidebar with role-based nav
│   │   └── top-bar.tsx                  # Header with user menu
│   ├── auth/                            # Auth components
│   │   ├── login-form.tsx
│   │   ├── signup-form.tsx
│   │   ├── session-warning-wrapper.tsx  # Session idle timeout warning
│   ├── dashboard/                       # Dashboard widgets (13 widgets for different roles)
│   │   ├── dashboard-composer.tsx       # Widget layout + data binding
│   │   ├── empty-state-card.tsx
│   │   └── [widget-name].tsx            # Specific widgets
│   ├── admin/, analytics/, audit-execution/, audit-plans/, compliance/, controls/, etc.
│   │   # Domain-specific components (forms, tables, detail views)
├── src/data-access/                     # Data Access Layer (39 files)
│   ├── session.ts                       # Session helpers (getRequiredSession, getSessionRoles)
│   ├── prisma.ts                        # Prisma exports
│   ├── index.ts                         # Barrel export for domain functions
│   ├── audit-execution.ts               # Audit engagement queries
│   ├── audit-plans.ts                   # Audit plan queries
│   ├── audit-trail.ts                   # Audit log queries
│   ├── compliance.ts                    # Compliance tracking queries
│   ├── observations.ts                  # Observation queries
│   ├── dashboard.ts                     # Dashboard metrics queries
│   ├── governance.ts                    # Governance queries
│   ├── analytics.ts                     # Analytics queries
│   └── [domain].ts                      # One file per domain
├── src/emails/                          # React Email templates
│   ├── assignment.tsx                   # Observation assigned
│   ├── escalation.tsx                   # Escalation notification
│   └── weekly-digest.tsx                # Weekly digest
├── src/generated/                       # Auto-generated code (DO NOT EDIT)
│   └── prisma/                          # Prisma Client (pnpm db:generate)
│       ├── client.ts                    # PrismaClient type
│       ├── models.ts                    # Model types
│       ├── enums.ts                     # Enum types (Role, Severity, etc.)
│       └── internal/                    # Internal types
├── src/hooks/                           # Custom React hooks
│   ├── use-auto-save.ts                 # Auto-save form changes
│   └── use-mobile.tsx                   # Mobile breakpoint detection
├── src/i18n/                            # i18n configuration
│   └── request.ts                       # locale request handler
├── src/jobs/                            # Background job workers (pg-boss)
│   ├── deadline-reminder.ts             # Deadline approaching reminders
│   ├── notification-processor.ts        # Email processor
│   ├── notification-batcher.ts          # Batch notifications
│   ├── overdue-escalation.ts            # Escalation level updates
│   ├── snapshot-metrics.ts              # Metric snapshots
│   ├── weekly-digest.ts                 # Weekly digest generation
│   └── index.ts                         # Job registration
├── src/lib/                             # Core utilities (37 files)
│   ├── auth.ts                          # Better Auth config + plugins
│   ├── auth-client.ts                   # Client-side auth helpers
│   ├── auth-lockout-plugin.ts           # Rate limiting + account lockout
│   ├── permissions.ts                   # RBAC (17 roles, 60+ permissions, hasPermission)
│   ├── guards.ts                        # Route guards (requirePermission, requireAnyPermission)
│   ├── prisma.ts                        # Prisma singleton + prismaForTenant(tenantId)
│   ├── logger.ts                        # pino logger
│   ├── csrf.ts                          # CSRF protection
│   ├── constants.ts                     # App constants
│   ├── utils.ts                         # Utility functions (formatDate, cn, etc.)
│   ├── icons.ts                         # Barrel export of lucide-react icons
│   ├── job-queue.ts                     # pg-boss queue init + worker start
│   ├── notification-service.ts          # Email/toast notification dispatch
│   ├── dashboard-config.ts              # Widget config per role
│   ├── *-engine.ts                      # Business logic engines
│   │   ├── escalation-engine.ts         # Compute escalation levels
│   │   ├── housekeeping-engine.ts       # Housekeeping rules
│   │   ├── kri-engine.ts                # Key risk indicator scoring
│   │   ├── ram-engine.ts                # Risk assessment model (19 parameters)
│   ├── excel-export/                    # XLSX export templates
│   │   ├── audit-plans.ts
│   │   ├── observations.ts
│   │   └── compliance.ts
│   ├── excel-parsers/                   # XLSX import parsers
│   │   └── onboarding-parser.ts         # Parse onboarding data
│   ├── excel-templates/                 # Template files (Examination items, etc.)
│   ├── investment-compliance.ts         # Investment compliance rules
│   ├── housekeeping-mis.ts              # Housekeeping MIS calculations
│   ├── __tests__/                       # Unit tests (Vitest)
│   │   └── escalation-engine.test.ts
├── src/providers/                       # React context providers
│   └── query-provider.tsx               # TanStack Query provider
├── src/services/                        # Domain-specific services
│   └── risk-rating/                     # Risk rating computation (RBIA)
├── src/stores/                          # Zustand state stores
│   └── onboarding-store.ts              # Onboarding wizard state
├── src/types/                           # TypeScript type definitions
│   ├── audit.ts                         # Audit types
│   ├── common.ts                        # Shared types
│   ├── compliance.ts                    # Compliance types
│   └── [domain].ts                      # Domain-specific types
├── src/middleware.ts                    # Next.js Edge middleware (Layer 1 session check)
├── src/instrumentation.ts               # Next.js instrumentation (Sentry + job queue init)
├── src/env.ts                           # Environment variable validation (t3-oss/env-nextjs + Zod)
├── next.config.ts                       # Next.js config (Turbopack, server externals)
├── tsconfig.json                        # TypeScript config (@/* alias)
├── prisma.config.ts                     # Prisma CLI config
├── .prettierrc                          # Prettier formatting
├── eslint.config.mjs                    # ESLint rules
├── components.json                      # shadcn/ui config (new-york style)
├── Dockerfile                           # Multi-stage build (dev + production)
├── docker-compose.yml                   # Production compose
├── docker-compose.dev.yml               # Development compose
└── package.json                         # Dependencies + scripts
```

---

## Directory Purposes

**`.planning/`:**

- Purpose: GSD workflow orchestration (PROJECT, ROADMAP, STATE, REQUIREMENTS, codebase docs)
- Contains: Project scope, roadmap, current state, phase requirements
- Committed: Yes

**`Project Doc/`:**

- Purpose: Business documentation (SDD, RBI circulars, design decisions)
- Contains: Software Design Document (PDF/DOCX), RBI policy references
- Committed: Yes (public docs only)

**`deploy/`:**

- Purpose: Deployment automation and configuration
- Contains: Nginx config, PM2 ecosystem, demo data scripts, health check scripts
- Committed: Yes

**`infra/`:**

- Purpose: Infrastructure-as-code (AWS CDK)
- Contains: VPC, security groups, RDS, S3, SES configuration
- Committed: Yes

**`messages/`:**

- Purpose: Internationalization message files
- Contains: `en.json`, `hi.json`, `mr.json`, `gu.json` with UI strings
- Generated: No (manually maintained)
- Committed: Yes

**`prisma/`:**

- Purpose: Database schema and migrations
- Contains:
  - `schema.prisma`: 71 models, 20 enums (generated types via `pnpm db:generate`)
  - `seed.ts`: Initial data (10 users, 2 tenants, 39 exam areas, 568 exam items)
  - `migrations/`: Prisma migration files
  - `*.sql`: Custom SQL (triggers, views, not tracked in Prisma)
- Committed: Yes
- Key files:
  - `schema.prisma`: 2320 lines, 71 models (User, Tenant, Observation, AuditEngagement, ExaminationNode, ActionPoint, BranchRbiaScore, etc.)
  - `seed.ts`: 1690 lines (creates demo users, branches, audit plans, RAM parameters)

**`scripts/`:**

- Purpose: Development and deployment utilities
- Contains: S3 setup, translation helpers, account creation, master data loaders
- Committed: Yes

**`tests/`:**

- Purpose: Test suites
- Contains:
  - `e2e/`: Playwright specs (login, audit execution, report generation)
  - `auth.setup.ts`: Auth setup for E2E (fixture)
- Run: `pnpm test:e2e` or `pnpm test:e2e:ui`
- Committed: Yes

---

## Key File Locations

**Entry Points:**

- `src/app/page.tsx`: Root redirect (→ /login)
- `src/app/(auth)/login/page.tsx`: Authentication page (login/signup tabs)
- `src/app/(dashboard)/layout.tsx`: Dashboard layout (Layer 2 session validation, sidebar)
- `src/app/(dashboard)/dashboard/page.tsx`: Main dashboard (KPI widgets, role-dependent)
- `src/app/(onboarding)/onboarding/page.tsx`: Tenant onboarding wizard

**Authentication & Authorization:**

- `src/lib/auth.ts`: Better Auth server config (email/password, Prisma adapter, rate limiting, lockout, multi-session)
- `src/lib/auth-client.ts`: Client-side auth helpers
- `src/lib/permissions.ts`: RBAC system (17 roles, 60+ permissions, hasPermission utility)
- `src/lib/guards.ts`: Route guards (requirePermission, requireAnyPermission, requireAllPermissions)
- `src/data-access/session.ts`: Session helpers (getRequiredSession, getSessionRoles, hasRole, hasAnyRole, hasAllRoles)

**Middleware & Security:**

- `src/middleware.ts`: Edge middleware (Layer 1: lightweight cookie check, request ID propagation)
- `src/app/(dashboard)/layout.tsx`: Layout middleware (Layer 2: authoritative session validation)

**Database & ORM:**

- `src/lib/prisma.ts`: Prisma singleton + `prismaForTenant(tenantId)` (application-level tenant isolation)
- `src/data-access/prisma.ts`: Re-export from lib/prisma (convenience)
- `src/data-access/session.ts`: Session helpers (always used in DAL functions)
- `prisma/schema.prisma`: 71 models, 20 enums (2320 lines)

**Data Access Layer (39 files):**

- `src/data-access/audit-execution.ts`: Engagement queries (getEngagements, getEngagementWithTeam, etc.)
- `src/data-access/audit-plans.ts`: Audit plan queries
- `src/data-access/compliance.ts`: Compliance tracking queries
- `src/data-access/observations.ts`: Observation queries
- `src/data-access/dashboard.ts`: Dashboard metrics queries (pre-fetches all widget data)
- `src/data-access/[domain].ts`: One file per feature domain (30+ files total)

**Server Actions (81 files, 18 domains):**

- `src/actions/observations/create.ts`: Create observation with 5C fields
- `src/actions/observations/transition.ts`: Observation workflow transitions
- `src/actions/audit-execution/[...].ts`: Engagement lifecycle
- `src/actions/compliance/[...].ts`: Compliance tracking updates
- `src/actions/[domain]/schemas.ts`: Zod schemas per domain (validation)

**Business Logic (Engines):**

- `src/lib/escalation-engine.ts`: Compute escalation levels (L0-L4 based on days overdue)
- `src/lib/housekeeping-engine.ts`: Housekeeping eligibility rules
- `src/lib/ram-engine.ts`: Risk assessment model (19 parameters → composite score)
- `src/lib/kri-engine.ts`: Key Risk Indicator scoring
- `src/services/risk-rating/`: Risk rating computation

**Components (213 files, 30+ domains):**

- `src/components/ui/`: shadcn/ui primitives (button, card, dialog, form, input, etc.)
- `src/components/layout/`: App structure (app-sidebar, top-bar)
- `src/components/auth/`: Auth UI (login-form, signup-form, session-warning-wrapper)
- `src/components/dashboard/`: Dashboard widgets (dashboard-composer, widget components)
- `src/components/[domain]/`: Domain-specific components (forms, tables, detail views)

**Background Jobs (pg-boss):**

- `src/jobs/deadline-reminder.ts`: Deadline approaching reminders
- `src/jobs/overdue-escalation.ts`: Escalation level updates
- `src/jobs/notification-processor.ts`: Email sending
- `src/jobs/weekly-digest.ts`: Weekly digest generation
- `src/instrumentation.ts`: Job registration on server start

**API Routes:**

- `src/app/api/auth/[...all]/route.ts`: Better Auth endpoints (login, logout, session, etc.)
- `src/app/api/health/route.ts`: Health check (DB, job queue, memory)
- `src/app/api/dashboard/route.ts`: Dashboard data export
- `src/app/api/exports/[type]/route.ts`: XLSX exports (compliance, findings, audit plans)
- `src/app/api/reports/[type]/route.ts`: PDF report generation (board report, gap analysis)
- `src/app/api/cron/escalation/route.ts`: Escalation trigger (scheduled via external cron)

**Configuration:**

- `src/env.ts`: Environment variable validation (t3-oss/env-nextjs + Zod schema)
- `src/lib/dashboard-config.ts`: Widget configuration per role
- `src/lib/constants.ts`: Application constants
- `next.config.ts`: Next.js configuration (Turbopack, server externals)
- `tsconfig.json`: TypeScript compiler options (@/\* alias)
- `components.json`: shadcn/ui configuration (style variant: new-york)
- `prisma.config.ts`: Prisma CLI configuration

**Logging & Observability:**

- `src/lib/logger.ts`: pino logger instance (development + production)
- `sentry.server.config.ts`: Sentry error tracking (server runtime)
- `sentry.edge.config.ts`: Sentry error tracking (edge runtime)

**i18n:**

- `messages/en.json`, `messages/hi.json`, `messages/mr.json`, `messages/gu.json`: Message catalogs (4 languages)
- `src/i18n/request.ts`: locale request handler

---

## Naming Conventions

**Files:**

- Pages: `page.tsx` (Next.js convention, no prefix)
- Layouts: `layout.tsx` (Next.js convention)
- Error boundaries: `error.tsx` (Next.js convention)
- API routes: `route.ts` (Next.js convention)
- Components: PascalCase + `.tsx` (e.g., `LoginForm.tsx`, `DashboardComposer.tsx`)
- Server actions: camelCase + `.ts` (e.g., `create.ts`, `update-status.ts`)
- Data-access functions: camelCase file, camelCase exports (e.g., `audit-execution.ts` → `getEngagements()`)
- Utilities: camelCase + `.ts` (e.g., `escalation-engine.ts`, `logger.ts`)
- Hooks: `use[Name].ts[x]` (e.g., `use-auto-save.ts`, `use-mobile.tsx`)
- Stores: `[name]-store.ts` (e.g., `onboarding-store.ts`)
- Schemas: `schemas.ts` (Zod schemas for a domain)

**Directories:**

- Feature domains: kebab-case (e.g., `audit-execution`, `audit-plans`, `compliance-management`)
- Components: kebab-case (e.g., `dashboard/`, `audit-execution/`)
- Actions: kebab-case (e.g., `actions/audit-execution/`, `actions/observations/`)
- Data-access: kebab-case (e.g., `data-access/audit-execution.ts`)

**Functions & Variables:**

- Functions: camelCase (e.g., `getObservations()`, `computeEscalation()`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`, `SESSION_TIMEOUT`)
- React components: PascalCase (e.g., `DashboardComposer`, `LoginForm`)
- Types: PascalCase (e.g., `AuthSession`, `EscalationResult`)
- Enums: PascalCase (from Prisma, e.g., `Role`, `Severity`, `ObservationStatus`)

---

## Where to Add New Code

**New Feature (e.g., "New Audit Module"):**

- Primary code: `src/actions/[feature]/` (server actions)
- Data access: `src/data-access/[feature].ts` (queries)
- Types: `src/types/[feature].ts` (domain types)
- Components: `src/components/[feature]/` (UI)
- Pages: `src/app/(dashboard)/[feature]/` (routes)
- Tests: `tests/e2e/[feature].spec.ts` (E2E)

**New Component/Widget:**

- Implementation: `src/components/[domain]/[ComponentName].tsx`
- If part of dashboard: `src/components/dashboard/[WidgetName].tsx`
- Styling: Tailwind CSS (v4 with CSS variables); see `src/app/globals.css` for theme
- State management: Zustand for local state, React Query for server state

**New Server Action:**

- File: `src/actions/[domain]/[action-name].ts`
- Pattern:
  1. `"use server"` directive
  2. `getRequiredSession()` → auth check
  3. Permission check via `hasPermission(roles, "action:name")`
  4. Zod validation via schema from `schemas.ts`
  5. `prismaForTenant(tenantId)` → get tenant-scoped client
  6. `db.$transaction()` → atomic operation
  7. `setAuditContext()` → audit logging
  8. `revalidatePath()` → cache invalidation
  9. Return `{ success: true/false, data?, error? }`

**New Database Query (DAL):**

- File: `src/data-access/[domain].ts`
- Pattern:
  1. `"server-only"` directive
  2. Accept `session: Session` parameter
  3. Get tenant ID: `const tenantId = session.user.tenantId`
  4. Get client: `const db = prismaForTenant(tenantId)`
  5. Add `WHERE tenantId = ?` clause
  6. Return plain data (no Prisma types in response)
  7. Export from `src/data-access/index.ts`

**New Background Job:**

- File: `src/jobs/[job-name].ts`
- Pattern:
  1. Define job handler: `export async function [jobName](job: PgBossJob<Payload>)`
  2. Register in `src/jobs/index.ts`: `boss.work("[jobName]", [jobName])`
  3. Enqueue in server action: `enqueueJob("[jobName]", { payload })`
  4. Keep idempotent (can be retried)

**New API Route:**

- File: `src/app/api/[route]/route.ts`
- Pattern:
  1. `export const dynamic = "force-dynamic"` (no caching)
  2. `export const runtime = "nodejs"` (if using Prisma)
  3. Define `export async function GET/POST/PUT(request: NextRequest)`
  4. For auth: call `auth.api.getSession()` explicitly
  5. Return `NextResponse.json(data, { status: 200 })`

**New Type Definition:**

- File: `src/types/[domain].ts`
- Pattern: TypeScript interfaces matching Prisma model + custom computed fields
- Example: `interface AuditEngagement extends Prisma.AuditEngagementGetPayload { /* custom */ }`
- Export from `src/types/index.ts` (barrel export)

**New i18n Message:**

- File: `messages/[locale].json`
- Pattern: Nested object, e.g., `{ "Observations": { "create": "Create Observation" } }`
- Usage in component: `const t = useTranslations("[Scope]"); t("key")`
- Always add to all 4 locales (en, hi, mr, gu)

**New Unit Test:**

- File: `src/lib/__tests__/[module].test.ts`
- Framework: Vitest + happy-dom
- Pattern: Pure function testing (engines, utilities)
- Run: `pnpm test` or `pnpm test:watch`

**New E2E Test:**

- File: `tests/e2e/[feature].spec.ts`
- Framework: Playwright
- Pattern: Full user workflows (login, navigate, submit form, verify result)
- Run: `pnpm test:e2e` or `pnpm test:e2e:ui`
- Setup: Use `auth.setup.ts` for authenticated fixtures

---

## Special Directories

**`.next/`:**

- Purpose: Build output
- Generated: Yes (on `pnpm build`)
- Committed: No (in `.gitignore`)
- Contains: JavaScript bundles, CSS, optimized images, type definitions

**`node_modules/`:**

- Purpose: Installed dependencies
- Generated: Yes (on `pnpm install`)
- Committed: No (in `.gitignore`)

**`src/generated/prisma/`:**

- Purpose: Auto-generated Prisma Client
- Generated: Yes (on `pnpm db:generate`)
- Committed: Yes (checked in for offline development)
- Contains: PrismaClient types, model types, enum types
- **CRITICAL:** Do NOT manually edit; regenerate after schema changes

**`.planning/codebase/`:**

- Purpose: GSD codebase analysis documents
- Generated: By `gsd map-codebase` command
- Committed: Yes
- Contains: ARCHITECTURE.md, STRUCTURE.md, STACK.md, INTEGRATIONS.md, CONCERNS.md, CONVENTIONS.md, TESTING.md

---

_Structure analysis: 2026-02-22_
