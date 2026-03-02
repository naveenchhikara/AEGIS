# Codebase Structure

**Analysis Date:** 2026-03-02

## Directory Layout

```
project-root/
├── .planning/                     # GSD workflow (PROJECT, ROADMAP, STATE, REQUIREMENTS, phases/)
├── prisma/                        # Database schema and migrations
│   ├── schema.prisma              # 71 models, 20 enums, 2320 lines
│   ├── seed.ts                    # Database seeder (10 users, 2 tenants, seed data)
│   ├── seed-master-directions.ts  # RBI master directions seeder
│   ├── migrations/                # Prisma migrations + standalone SQL
│   └── *.sql                      # Manual SQL (views, triggers, indexes)
├── messages/                      # next-intl i18n messages (en.json, hi.json, mr.json, gu.json)
├── public/                        # Static assets (logos, images)
├── deploy/                        # Deployment scripts (shell, nginx, PM2 config)
├── scripts/                       # Utility scripts (account creation, S3 setup, seed data)
├── infra/                         # AWS CDK infrastructure-as-code
├── tests/                         # Test suites
│   ├── e2e/                       # Playwright E2E specs
│   └── auth.setup.ts              # E2E auth setup
├── src/
│   ├── app/                       # Next.js App Router (61 pages)
│   │   ├── page.tsx               # Root page (redirect to /login)
│   │   ├── layout.tsx             # Root layout (fonts, i18n provider, Toaster)
│   │   ├── globals.css            # Tailwind v4 + custom CSS variables
│   │   ├── middleware.ts          # Edge runtime route protection + request ID propagation
│   │   ├── (auth)/                # Auth routes (login, signup)
│   │   │   ├── layout.tsx         # Auth layout (no sidebar)
│   │   │   └── login/page.tsx     # Login form
│   │   ├── (dashboard)/           # Protected dashboard routes
│   │   │   ├── layout.tsx         # Main dashboard layout (sidebar, topbar, session check)
│   │   │   ├── dashboard/page.tsx # Home dashboard with widgets
│   │   │   ├── audit-execution/   # Audit execution section (14 nested pages)
│   │   │   ├── findings/          # Findings management (3 pages: list, detail, create)
│   │   │   ├── compliance/        # Compliance tracking (ACE, ACB, responses)
│   │   │   ├── rbia/              # RBIA examination tree and scoring
│   │   │   ├── admin/             # User, branch, zone, RAM config management
│   │   │   ├── reports/           # Report generation and download
│   │   │   ├── analytics/         # Dashboard analytics views
│   │   │   ├── ram/               # Risk Assessment Model pages
│   │   │   ├── risk-management/   # Risk register, controls, KRIs
│   │   │   ├── governance/        # Work program, QA, board reporting
│   │   │   └── [...others]/       # 20+ more feature areas
│   │   ├── (onboarding)/          # Tenant onboarding wizard
│   │   │   └── onboarding/        # Multi-step bank setup form
│   │   ├── api/                   # REST API endpoints
│   │   │   ├── auth/[...all]      # Better Auth dynamic handler
│   │   │   ├── health/            # Health check (DB, jobs, memory)
│   │   │   ├── dashboard/         # Dashboard widget data fetcher
│   │   │   ├── exports/           # Excel/CSV export endpoints
│   │   │   ├── reports/           # PDF report generation
│   │   │   ├── cron/              # Scheduled job triggers
│   │   │   ├── download/          # File download handler
│   │   │   ├── is-audit/          # IS audit checklist templates
│   │   │   └── loan-portfolio/    # Loan portfolio upload template
│   │   └── accept-invite/         # Invitation acceptance page
│   ├── actions/                   # Server actions (91 files across 15 domains)
│   │   ├── audit-execution/       # Create/update audit engagements, team assignments, section exams
│   │   ├── observations/          # Create, transition, resolve observations
│   │   ├── compliance/            # Compliance item status updates, escalations
│   │   ├── rbia/                  # RBIA scoring, freeze, meeting management
│   │   ├── findings/              # Formal finding creation and lifecycle
│   │   ├── governance/            # Work program, QA assessment actions
│   │   ├── ram/                   # RAM parameter updates
│   │   ├── reports/               # Report generation triggers
│   │   ├── audit-plans/           # Audit plan creation and updates
│   │   ├── concurrent-audit/      # Concurrent audit rapid entry
│   │   ├── investment/            # Investment classification and IS audit
│   │   ├── issues/                # Issue management actions
│   │   ├── risk-management/       # Risk register actions
│   │   ├── control-library/       # Control library management
│   │   ├── sampling/              # Sampling methodology actions
│   │   └── [other domains]/       # Account examination, loan portfolio, etc.
│   ├── components/                # 239 files across 30 feature directories
│   │   ├── ui/                    # shadcn/ui primitives (36 files: button, dialog, form, chart, etc.)
│   │   ├── layout/                # Navigation layout (app-sidebar, top-bar, session warning)
│   │   ├── auth/                  # Auth components (login form, session wrapper)
│   │   ├── dashboard/             # Dashboard widgets and composer
│   │   ├── audit-execution/       # Engagement list, section examiners, report view
│   │   ├── findings/              # Findings table, detail view, create form
│   │   ├── compliance/            # Compliance tracking tables, response forms
│   │   ├── rbia/                  # RBIA tree, scoring UI, freeze button, meetings
│   │   ├── reports/               # Report builder, PDF preview
│   │   ├── [other features]/      # Components for each feature area
│   │   └── [domain]/              # ~27 feature-specific component directories
│   ├── data-access/               # Data Access Layer (47 files)
│   │   ├── session.ts             # getRequiredSession() + role/tenant helpers
│   │   ├── dashboard.ts           # Dashboard widget data queries
│   │   ├── analytics.ts           # Analytics and heatmap queries
│   │   ├── audit-execution.ts     # Engagement queries, team assignments
│   │   ├── observations.ts        # Observation list and detail queries
│   │   ├── findings.ts            # Formal finding queries
│   │   ├── compliance-items.ts    # Compliance tracking queries
│   │   ├── compliance-management.ts # Compliance status aggregation
│   │   ├── rbia-scoring.ts        # RBIA tree and score queries
│   │   ├── instance-scoring.ts    # Instance-level RBIA scoring
│   │   ├── governance.ts          # Work program, QA, board report queries
│   │   ├── audit-plans.ts         # Audit plan and planning queries
│   │   ├── control-library.ts     # Control library queries
│   │   ├── investment.ts          # Investment and IS audit queries
│   │   ├── risk-management.ts     # Risk register and KRI queries
│   │   ├── audit-trail.ts         # Audit log and change tracking queries
│   │   ├── exports.ts             # Data export preparation
│   │   ├── issues.ts              # Issue management queries
│   │   ├── users.ts               # User queries (admin only)
│   │   ├── [other domains]/       # 20+ more domain-specific DAL files
│   │   └── index.ts               # Barrel export (canonical DAL imports)
│   ├── lib/                       # Core utilities (42 files)
│   │   ├── auth.ts                # Better Auth configuration
│   │   ├── auth-client.ts         # Client-side auth helper (useSession hook)
│   │   ├── auth-lockout-plugin.ts # Account lockout logic (5 failures → 30 min lock)
│   │   ├── prisma.ts              # Prisma client singleton + prismaForTenant()
│   │   ├── permissions.ts         # ROLE_PERMISSIONS map (17 roles, 60+ permissions)
│   │   ├── guards.ts              # Permission check helpers (requireAnyPermission)
│   │   ├── logger.ts              # Pino logger configuration
│   │   ├── utils.ts               # Utility functions (formatDate, cn, etc.)
│   │   ├── constants.ts           # App-wide constants (roles, statuses, enum mappings)
│   │   ├── icons.ts               # Lucide icon barrel export
│   │   ├── csrf.ts                # CSRF token generation
│   │   ├── notification-service.ts # Email notification queueing
│   │   ├── s3.ts                  # AWS S3 client (evidence upload/download)
│   │   ├── ses-client.ts          # AWS SES email sending
│   │   ├── job-queue.ts           # pg-boss configuration
│   │   ├── engines/               # Business logic engines
│   │   │   ├── ram-engine.ts      # RAM (Risk Assessment Model) score computation
│   │   │   ├── rbia-scoring-engine.ts # RBIA 4-point scoring + weighted roll-up
│   │   │   ├── escalation-engine.ts # Escalation level determination + routing
│   │   │   ├── escalation-router.ts # Role-based escalation assignment
│   │   │   ├── housekeeping-engine.ts # Housekeeping metric calculations
│   │   │   ├── sampling-engine.ts # Sampling methodology (stratified, random)
│   │   │   ├── kri-engine.ts      # Key Risk Indicator queries and thresholds
│   │   │   ├── control-effectiveness.ts # Control test result aggregation
│   │   │   ├── repeat-finding-detector.ts # Repeat finding identification
│   │   │   ├── investment-compliance.ts # Investment restriction checks
│   │   │   └── engagement-state-machine.ts # Audit engagement state transitions
│   │   ├── excel-export/          # Excel generation utilities
│   │   ├── excel-parsers/         # Excel parsing for imports
│   │   ├── excel-templates/       # Excel template builders
│   │   ├── loan-portfolio/        # Loan account querying
│   │   ├── dashboard-config.ts    # Widget configuration per role
│   │   ├── nav-items.ts           # Sidebar navigation items per role
│   │   ├── report-utils.ts        # Report generation helpers
│   │   ├── fiscal-year.ts         # Fiscal year calculations (Indian FY)
│   │   ├── onboarding-validation.ts # Onboarding data validation
│   │   ├── __tests__/             # Unit tests (6 test files)
│   │   └── [other utilities]/     # 5+ more utility modules
│   ├── services/                  # Business logic services
│   │   └── risk-rating/           # Risk assessment service
│   │       ├── compute.ts         # Risk score computation
│   │       ├── types.ts           # Risk score types
│   │       └── __tests__/         # Risk scoring tests
│   ├── stores/                    # Zustand stores (client state)
│   │   └── [store files]/         # Auth state, UI toggles
│   ├── hooks/                     # Custom React hooks
│   │   └── [hook files]/          # useSession, useFormState, etc.
│   ├── jobs/                      # Background job handlers (8 files)
│   │   ├── overdue-escalation.ts  # Escalate findings past deadline
│   │   ├── rbia-overdue-escalation.ts # RBIA-specific escalation
│   │   ├── deadline-reminder.ts   # Send deadline approaching notifications
│   │   ├── notification-processor.ts # Process notification queue
│   │   ├── notification-batcher.ts # Batch notifications for efficiency
│   │   ├── weekly-digest.ts       # Weekly summary email
│   │   ├── snapshot-metrics.ts    # Periodic metrics snapshot
│   │   └── index.ts               # Job registry
│   ├── emails/                    # React Email templates
│   │   ├── assignment.tsx         # Assignment notification email
│   │   ├── escalation.tsx         # Escalation notification email
│   │   ├── digest.tsx             # Weekly digest email
│   │   └── [other templates]/     # Reminder, closure, etc.
│   ├── providers/                 # React context providers
│   │   ├── query-provider.tsx     # React Query (TanStack Query)
│   │   └── [other providers]/     # Theme provider, etc.
│   ├── types/                     # TypeScript type definitions
│   │   ├── index.ts               # All types exported from here
│   │   ├── domain-types.ts        # Domain models (Observation, Engagement, etc.)
│   │   ├── auth-types.ts          # Session and auth types
│   │   └── [other types]/         # API response types, etc.
│   ├── generated/                 # Generated code (DO NOT EDIT)
│   │   └── prisma/                # Prisma-generated client
│   ├── i18n/                      # i18n configuration
│   │   └── routing.ts             # next-intl locale configuration
│   ├── instrumentation.ts         # Next.js instrumentation hook (job registration)
│   ├── middleware.ts              # Edge middleware (route protection)
│   ├── env.ts                     # Environment variable validation (Zod + @t3-oss/env-nextjs)
│   └── proxy.ts                   # Session proxy helper (optimistic cookie check)
├── Dockerfile                     # Multi-stage build (dependencies → build → runtime)
├── docker-compose.yml             # Dev compose with PostgreSQL 16
├── docker-compose.prod.yml        # Production compose
├── next.config.ts                 # Next.js config (Turbopack, Tailwind v4)
├── tailwind.config.ts             # Tailwind CSS v4 with custom theme
├── tsconfig.json                  # TypeScript configuration
├── package.json                   # Dependencies and scripts
├── pnpm-lock.yaml                 # pnpm lock file
├── .prettierrc                    # Prettier config
├── .eslintrc.json                 # ESLint rules
├── vitest.config.ts               # Vitest unit test config
├── playwright.config.ts           # Playwright E2E config
├── CLAUDE.md                      # Project instructions
└── [root docs]/                   # README, CHANGELOG, etc.
```

## Directory Purposes

**src/app:**

- Purpose: Next.js App Router pages and layouts organized by feature group
- Contains: Server/client hybrid page components, layout wrappers, API route handlers
- Key files: `layout.tsx` (root + per-route), `middleware.ts` (edge protection), `page.tsx` (route handlers)

**src/actions:**

- Purpose: Server actions for all mutations (create, update, delete, status change, escalate)
- Contains: 91 files organized by domain (audit-execution, observations, compliance, rbia, etc.)
- Key files: `create.ts`, `update.ts`, `transition.ts`, `schemas.ts` (Zod validation) per domain

**src/components:**

- Purpose: React components organized by feature area + UI primitives
- Contains: shadcn/ui (36 files), domain-specific components (200+ files across 27 feature dirs)
- Key files: `ui/*.tsx` (form, button, dialog, chart, etc.), layout components (sidebar, topbar), feature components

**src/data-access:**

- Purpose: Encapsulate all database queries with tenant isolation and column-level security
- Contains: 47 DAL functions organized by domain (dashboard, audit-execution, observations, etc.)
- Key files: `session.ts` (auth source of truth), `dashboard.ts` (32KB dashboard queries), index.ts (barrel export)

**src/lib:**

- Purpose: Core utilities, business logic engines, and configuration
- Contains: Auth (Better Auth), permissions (RBAC), Prisma client, business engines (10 files), utilities (20+ files)
- Key files: `auth.ts` (auth config), `permissions.ts` (role/permission map), `prisma.ts` (singleton client), engines (RAM, RBIA, escalation, etc.)

**src/jobs:**

- Purpose: Background job handlers executed by pg-boss on schedule or event
- Contains: 8 job handlers (escalation, notifications, reminders, metrics)
- Key files: `index.ts` (registry), `overdue-escalation.ts`, `notification-processor.ts`

**src/generated/prisma:**

- Purpose: Prisma-generated client types and types (auto-generated, do not edit)
- Contains: Model types, enums, client class, index signature helpers
- Key files: `client.d.ts` (type definitions), model files (auto-generated)

**prisma:**

- Purpose: Database schema definition and migrations
- Contains: `schema.prisma` (71 models, 20 enums), seed script, migrations, SQL extensions
- Key files: `schema.prisma` (2320 lines), `seed.ts` (1690 lines), migrations (Prisma + SQL)

## Key File Locations

**Entry Points:**

- `src/app/page.tsx`: Root redirect (/ → /login)
- `src/app/(auth)/login/page.tsx`: Login page
- `src/app/(dashboard)/layout.tsx`: Dashboard layout (sidebar, topbar, session validation)
- `src/app/(dashboard)/dashboard/page.tsx`: Home dashboard with widgets
- `src/app/api/auth/[...all]/route.ts`: Better Auth endpoints

**Configuration:**

- `src/env.ts`: Environment variable schema validation (Zod)
- `next.config.ts`: Next.js configuration (Turbopack, Tailwind, externals)
- `tailwind.config.ts`: Tailwind CSS v4 theme (colors, fonts, custom variants)
- `tsconfig.json`: TypeScript configuration (paths, strict mode)
- `prisma/schema.prisma`: Database schema (71 models, 20 enums)

**Core Logic:**

- `src/lib/auth.ts`: Better Auth configuration (email/password, session, rate limiting)
- `src/lib/permissions.ts`: Role-to-permission mapping (17 roles, 60+ permissions)
- `src/lib/prisma.ts`: Prisma singleton client + `prismaForTenant()` function
- `src/lib/rbia-scoring-engine.ts`: RBIA 4-point scoring algorithm
- `src/lib/escalation-engine.ts`: Escalation level determination

**Testing:**

- `tests/e2e/`: Playwright E2E test specs
- `tests/auth.setup.ts`: E2E auth setup (login, session creation)
- `src/lib/__tests__/`: Unit tests (permissions, state machines, scoring)
- `vitest.config.ts`: Vitest configuration

## Naming Conventions

**Files:**

- **Pages:** `page.tsx` (Next.js convention)
- **Layouts:** `layout.tsx` (Next.js convention)
- **API routes:** `route.ts` (Next.js convention)
- **Server actions:** `create.ts`, `update.ts`, `delete.ts`, `transition.ts`, `schemas.ts` (grouped by domain)
- **Components:** PascalCase (`Button.tsx`, `ObservationForm.tsx`)
- **Data access:** camelCase (`dashboard.ts`, `audit-execution.ts`)
- **Utilities:** camelCase (`formatDate.ts`, `permissions.ts`)
- **Types:** camelCase with `-types.ts` suffix (`auth-types.ts`, `domain-types.ts`)
- **Tests:** `*.test.ts` or `*.spec.ts`

**Directories:**

- **Feature groups:** kebab-case (`audit-execution/`, `audit-plans/`, `risk-management/`)
- **Route groups:** parentheses (`(auth)/`, `(dashboard)/`, `(onboarding)/`)
- **Nested routes:** kebab-case (`/audit-execution/[engagementId]/rbia/`)
- **Component subdirs:** feature name in kebab-case (`audit-execution/`, `findings/`)
- **Action subdirs:** domain name in kebab-case (`observations/`, `compliance/`)

## Where to Add New Code

**New Feature:**

1. **Page/Route:** Create directory in `src/app/(dashboard)/[feature-name]/`
   - Add `page.tsx` (server component calling DAL)
   - Create `layout.tsx` if nested routes exist
   - Create subdirectory for components if UI is complex

2. **Primary code:** `src/actions/[feature-name]/create.ts`, `update.ts`, `transition.ts`
   - Start with schema in `schemas.ts`
   - Use pattern: validate → permission check → DAL → revalidate

3. **Queries:** `src/data-access/[feature-name].ts`
   - Pattern: `async function get[Feature](tenantId: string) { const db = prismaForTenant(tenantId); ... WHERE tenantId }`

4. **Components:** `src/components/[feature-name]/`
   - Create `[feature]-list.tsx`, `[feature]-detail.tsx`, `[feature]-form.tsx`
   - Use shadcn/ui primitives for consistency

5. **Tests:**
   - Unit tests in `src/lib/__tests__/` if business logic
   - E2E tests in `tests/e2e/[feature].spec.ts`

**New Component/Module:**

- **UI component (reusable):** `src/components/ui/[component-name].tsx`
  - Use shadcn/ui pattern (import Radix primitive, wrap with Tailwind styling)
  - Export with prop types

- **Feature component:** `src/components/[domain]/[specific-component].tsx`
  - Client or server component as needed
  - Accept data + callbacks as props

- **Business logic engine:** `src/lib/[domain]-engine.ts`
  - Pure functions (no side effects)
  - Unit tested in `src/lib/__tests__/`

**Utilities:**

- **Shared helpers:** `src/lib/utils.ts` (general) or `src/lib/[domain]-utils.ts` (domain-specific)
  - Pure functions only
  - Document with JSDoc

- **Server-only utilities:** Mark with `"use server"` at top
  - Example: `src/lib/escalation-engine.ts`

## Special Directories

**src/generated/prisma:**

- Purpose: Prisma-generated client (auto-generated on `pnpm db:generate`)
- Generated: Yes (run `pnpm db:generate` after schema changes)
- Committed: No (should be .gitignored, but currently committed for CI/CD)
- Note: Do NOT edit manually; regenerate after schema changes

**prisma/migrations:**

- Purpose: Prisma migration history (tracked for reproducibility)
- Generated: Yes (Prisma creates on `pnpm db:migrate`)
- Committed: Yes (tracked in git for rollback capability)
- Note: Can include standalone SQL files for extensions, triggers, views

**node_modules:**

- Purpose: Installed dependencies
- Generated: Yes (from pnpm-lock.yaml)
- Committed: No (.gitignored)
- Note: Run `pnpm install` after cloning

**.next:**

- Purpose: Next.js build cache (Turbopack)
- Generated: Yes (created on `pnpm build` or `pnpm dev`)
- Committed: No (.gitignored)
- Note: Delete and restart dev server if cache corruption (stale pages)

**public:**

- Purpose: Static assets (logos, images, favicon) served directly
- Generated: No (manually added)
- Committed: Yes
- Note: Served at `/` path (e.g., `public/logo.png` → `/logo.png`)

**.planning:**

- Purpose: GSD (Getting Stuff Done) workflow documentation
- Generated: Yes (by GSD system)
- Committed: Yes (tracks project phases, requirements, state)
- Note: Updated by `/gsd:*` commands

**tests/**

- Purpose: Test suites (E2E, unit)
- Generated: No (manually written)
- Committed: Yes
- Note: Run with `pnpm test:e2e` or `pnpm test:unit`

---

_Structure analysis: 2026-03-02_
