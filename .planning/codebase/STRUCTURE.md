# Codebase Structure

**Analysis Date:** 2026-02-21

## Directory Layout

```
/Users/admin/Developer/AEGIS/
├── .planning/                  # GSD workflow documentation (PROJECT, ROADMAP, STATE, REQUIREMENTS)
├── .claude/                    # Claude Code agent definitions and settings
├── .github/                    # GitHub Actions CI/CD workflows (ci.yml, claude.yml, code-review.yml)
├── Project Doc/                # Business documents, RBI circulars, SDD reference
├── deploy/                     # Deployment scripts, Nginx config, PM2, demo scripts
├── infra/                      # AWS CDK infrastructure-as-code
├── messages/                   # i18n locale files (en.json, hi.json, mr.json, gu.json)
├── prisma/                     # Database schema and migrations
│   ├── schema.prisma           # 63 models, 16 enums, 1999 lines
│   ├── seed.ts                 # Database seeder (10 users, 2 tenants, comprehensive test data)
│   ├── seed-master-directions.ts  # RBI master directions seeder
│   ├── migrations/             # Prisma + standalone SQL migrations
│   ├── create_tables.sql       # Manual table creation
│   └── fix_trigger_function*.sql  # Audit trigger fixes
├── scripts/                    # Utility scripts (account creation, S3 setup, translations)
├── tests/                      # Test suites
│   ├── e2e/                    # Playwright E2E specs
│   └── auth.setup.ts           # Auth setup for E2E tests
├── src/
│   ├── actions/                # Server Actions (81 files across 15 domains)
│   │   ├── observations/       # observation CRUD (create, transition, resolve-fieldwork)
│   │   ├── audit-plans/        # RAM computation, plan creation/approval
│   │   ├── audit-execution/    # examination item responses, section completion
│   │   ├── compliance/         # compliance item tracking (branch response, ZAC, ACE, ACB)
│   │   ├── findings/           # observation lifecycle (submit, review, issue, close)
│   │   ├── governance/         # board reports, policies, committee minutes
│   │   ├── risk-management/    # risk register CRUD, control effectiveness
│   │   ├── issues/             # issue tracking (open, resolve, accept risk)
│   │   ├── control-library/    # control library management
│   │   ├── qa-assessment/      # QA assessment tracking
│   │   ├── work-program/       # work program execution
│   │   ├── housekeeping/       # housekeeping metrics
│   │   ├── concurrent-audit/   # concurrent audit tracking
│   │   ├── regulatory/         # regulatory compliance (ATR submission, etc.)
│   │   ├── investment/         # investment compliance tracking
│   │   ├── reports/            # report generation, export
│   │   ├── admin/              # user/branch/zone management
│   │   └── [domain]/schemas.ts # Zod validation schemas per domain
│   ├── app/                    # Next.js App Router routes
│   │   ├── layout.tsx          # Root layout (i18n providers, fonts)
│   │   ├── page.tsx            # Landing page (redirect to /login)
│   │   ├── middleware.ts       # Edge middleware (auth cookie check)
│   │   ├── (auth)/             # Public routes group
│   │   │   ├── login/          # `/login` page
│   │   │   ├── signup/         # `/signup` page
│   │   │   └── layout.tsx       # Auth layout
│   │   ├── (dashboard)/        # Protected routes group
│   │   │   ├── layout.tsx       # Dashboard layout (session validation, sidebar, topbar)
│   │   │   ├── dashboard/      # `/dashboard` KPI widgets
│   │   │   ├── admin/          # `/admin/{users,branches,zones,templates,ram-config}`
│   │   │   ├── audit-execution/    # `/audit-execution/[id]/{sections,cash,loans,sma-npa,report}`
│   │   │   ├── audit-plans/    # `/audit-plans` listing + RAM simulation
│   │   │   ├── findings/       # `/findings`, `/findings/[id]`, `/findings/new`
│   │   │   ├── compliance/     # `/compliance/{ace,acb}`, `/auditee/[id]`
│   │   │   ├── governance/     # Board reports, policies, committees
│   │   │   ├── risk-management/    # Risk register, controls
│   │   │   ├── issues/         # Issue tracking
│   │   │   ├── work-program/   # Work program execution
│   │   │   ├── qa-assessment/  # QA assessment
│   │   │   ├── concurrent-audit/   # Concurrent audit tracking
│   │   │   ├── regulatory/     # RBI compliance (ATR, IS audit, housekeeping, investments)
│   │   │   ├── calendar/       # Audit calendar
│   │   │   ├── analytics/      # Analytics dashboards
│   │   │   ├── audit-trail/    # Audit log viewer
│   │   │   ├── settings/       # User settings, preferences
│   │   │   └── reports/        # Report generation and export
│   │   ├── (onboarding)/       # Onboarding wizard group
│   │   │   └── onboarding/     # Multi-step wizard (bank registration, tier selection, RBI directions, org structure, user invites)
│   │   ├── accept-invite/      # Accept user invitation
│   │   └── api/                # REST API endpoints
│   │       ├── auth/[...all]/  # Better Auth endpoints
│   │       ├── health/         # Health check (DB connectivity)
│   │       ├── dashboard/      # Widget data API
│   │       ├── exports/        # Data export endpoints (compliance, findings, audit-plans)
│   │       ├── reports/        # Report generation (board-report, gap-analysis)
│   │       ├── download/       # File download (evidence, reports)
│   │       ├── cron/           # Cron job endpoints (escalation)
│   │       └── is-audit/       # IS audit checklist API
│   ├── components/             # React UI components (213+ files)
│   │   ├── ui/                 # shadcn/ui components (button, card, dialog, etc.)
│   │   ├── layout/             # App layout (sidebar, topbar, breadcrumbs, skip-to-content)
│   │   ├── auth/               # Auth components (login form, session warning, etc.)
│   │   ├── dashboard/          # Dashboard widgets and composer
│   │   ├── findings/           # Observation list, detail, form components
│   │   ├── audit-execution/    # Examination form, section progress
│   │   ├── audit-plans/        # RAM form, audit plan list
│   │   ├── compliance/         # Compliance tracker, branch response form
│   │   ├── admin/              # User, branch, zone management UI
│   │   ├── governance/         # Board report, policy, committee UI
│   │   ├── risk-management/    # Risk register, control library UI
│   │   ├── issues/             # Issue tracking UI
│   │   ├── reports/            # Report generation, export UI
│   │   ├── pdf-report/         # React PDF report templates
│   │   ├── [domain]/           # Domain-specific component groups
│   │   └── [component-name]    # Individual component files (naming: PascalCase.tsx)
│   ├── data/                   # Static data and reference
│   │   ├── rbi-master-directions/  # RBI master directions (production seed data)
│   │   ├── rbi-regulations/    # RBI policy documents for reference
│   │   └── seed/               # Deprecated: Use database queries instead
│   ├── data-access/            # Data Access Layer (39 files)
│   │   ├── session.ts          # getRequiredSession(), getCurrentTenantId(), permission checks
│   │   ├── prisma.ts           # Re-export prisma, prismaForTenant
│   │   ├── observations.ts     # observation queries with tenant scope
│   │   ├── dashboard.ts        # Widget data aggregation (32KB — largest DAL)
│   │   ├── reports.ts          # Report data collection
│   │   ├── governance.ts       # Board report data
│   │   ├── audit-execution.ts  # Engagement + section queries
│   │   ├── audit-plans.ts      # Audit plan queries
│   │   ├── compliance-*.ts     # Compliance tracking queries
│   │   ├── audit-trail.ts      # Audit log queries
│   │   ├── analytics.ts        # Dashboard analytics aggregation
│   │   └── [domain].ts         # Per-domain DAL functions
│   ├── emails/                 # React Email templates
│   │   ├── components/         # Email UI components (header, footer, sections)
│   │   └── templates/          # Email templates (observation-assigned, escalation, digest)
│   ├── generated/              # Generated code (DO NOT EDIT)
│   │   └── prisma/             # Prisma Client + types (generated by `pnpm db:generate`)
│   ├── hooks/                  # Custom React hooks
│   │   ├── use-mobile.tsx      # Detect mobile viewport
│   │   └── use-auto-save.ts    # Form auto-save debounce
│   ├── i18n/                   # i18n configuration
│   │   └── routing.ts          # next-intl routing config
│   ├── jobs/                   # pg-boss background job handlers
│   │   ├── index.ts            # Job registration (registerJobs function)
│   │   ├── deadline-reminder.ts    # Daily deadline check + overdue escalation
│   │   ├── overdue-escalation.ts   # L1-L4 escalation routing
│   │   ├── notification-processor.ts  # Dequeue and send notifications
│   │   ├── notification-batcher.ts    # Batch notifications
│   │   ├── weekly-digest.ts    # Monday 10:00 IST digest email
│   │   └── snapshot-metrics.ts # Daily dashboard metrics snapshot
│   ├── lib/                    # Utility libraries and business logic (35 files)
│   │   ├── auth.ts             # Better Auth configuration
│   │   ├── auth-client.ts      # Client-side auth helpers
│   │   ├── auth-lockout-plugin.ts  # Account lockout on failed login attempts
│   │   ├── prisma.ts           # Prisma singleton + prismaForTenant()
│   │   ├── permissions.ts      # RBAC system (17 roles, 60+ permissions)
│   │   ├── guards.ts           # Authorization helpers (requireAnyPermission, etc.)
│   │   ├── ram-engine.ts       # Risk Assessment Model computation (pure functions)
│   │   ├── escalation-engine.ts    # Escalation logic (L1-L4 routing)
│   │   ├── escalation-router.ts    # Route overdue observations to correct role
│   │   ├── repeat-finding-detector.ts  # Identify repeat findings
│   │   ├── kri-engine.ts       # Key Risk Indicator computation
│   │   ├── housekeeping-engine.ts   # Housekeeping MIS logic
│   │   ├── investment-compliance.ts # Investment compliance checks
│   │   ├── control-effectiveness.ts # Control testing results aggregation
│   │   ├── job-queue.ts        # pg-boss wrapper (enqueueJob, etc.)
│   │   ├── notification-service.ts  # Create notification records
│   │   ├── logger.ts           # pino logging setup
│   │   ├── s3-client.ts        # AWS S3 file upload/download
│   │   ├── ses-client.ts       # AWS SES email sending
│   │   ├── dashboard-config.ts # Role → dashboard widget mapping
│   │   ├── nav-items.ts        # Role → sidebar menu items mapping
│   │   ├── excel-export.ts     # ExcelJS wrapper for multi-tab exports
│   │   ├── report-utils.ts     # Observation summary, highlight logic
│   │   ├── constants.ts        # Shared constants (enums, mappings, defaults)
│   │   ├── utils.ts            # formatDate(), cn(), classname helpers
│   │   ├── fiscal-year.ts      # Indian FY (Apr-Mar) utilities
│   │   ├── csrf.ts             # CSRF token validation
│   │   ├── onboarding-validation.ts # Multi-step wizard validation
│   │   ├── excel-export/       # Excel export templates and parsers
│   │   ├── excel-parsers/      # Parse uploaded Excel files
│   │   ├── excel-templates/    # Excel template generation
│   │   ├── validations/        # Shared Zod schemas (across domains)
│   │   └── __tests__/          # Unit tests for lib functions
│   ├── providers/              # React context providers
│   │   ├── query-provider.tsx  # React Query (TanStack Query) provider
│   │   └── [provider].tsx      # Other context providers
│   ├── services/               # Business logic services
│   │   └── risk-rating/        # Risk rating computation service
│   │       ├── compute.ts      # RiskRatingService class
│   │       └── types.ts        # RiskRatingConfig, RatingBand types
│   ├── stores/                 # Zustand state stores
│   │   └── onboarding-store.ts # Onboarding wizard state (localStorage persistence)
│   ├── types/                  # TypeScript type definitions
│   │   ├── index.ts            # Barrel export of all types
│   │   ├── auth.ts             # Auth types (AuthSession, User, Session)
│   │   ├── onboarding.ts       # Onboarding wizard types
│   │   ├── dashboard.ts        # Dashboard widget types
│   │   └── [domain].ts         # Per-domain types (Observation, AuditPlan, etc.)
│   ├── instrumentation.ts      # Next.js instrumentation hook (pg-boss startup)
│   └── env.ts                  # Environment validation (Zod + t3-oss/env-nextjs)
├── .env.example                # Template for environment variables
├── .eslintrc.json              # ESLint configuration
├── .prettierrc                 # Prettier formatting rules
├── biome.json                  # Alternative linter config (not actively used)
├── next.config.ts             # Next.js configuration (Turbopack, externals, redirects)
├── tsconfig.json              # TypeScript configuration
├── components.json            # shadcn/ui component customization (new-york style)
├── package.json               # Dependencies and scripts
├── pnpm-lock.yaml             # Locked dependency versions (pnpm)
└── README.md                  # Project overview
```

## Directory Purposes

**src/actions/**
- Purpose: Server actions (form mutations) with auth + permission checks + audit tracking
- Contains: Zod validation schemas, permission guards, transaction-wrapped mutations
- Key files: `observations/create.ts`, `audit-plans/approve.ts`, `compliance/submit-response.ts`

**src/app/**
- Purpose: Next.js App Router route definitions
- Contains: Page routes (52 total), API endpoints, middleware, layout wrappers
- Key files: `(dashboard)/layout.tsx` (security boundary), `api/auth/[...all]/route.ts` (Better Auth)

**src/components/**
- Purpose: React UI components (both server and client)
- Contains: shadcn/ui base components, layout wrappers, domain-specific UI
- Key files: `layout/app-sidebar.tsx` (navigation), `dashboard/dashboard-composer.tsx` (widget orchestration)

**src/data-access/**
- Purpose: All database queries with tenant isolation
- Contains: Functions accepting session, extracting tenantId, building WHERE clauses
- Key files: `dashboard.ts` (32KB, most complex), `observations.ts`, `reports.ts`

**src/lib/**
- Purpose: Utility functions, business logic, service wrappers
- Contains: RAM engine, escalation router, auth config, logging, permission system
- Key files: `ram-engine.ts` (pure risk computation), `escalation-router.ts`, `permissions.ts`

**src/jobs/**
- Purpose: Background job handlers (pg-boss)
- Contains: Cron job logic, email sending, metrics aggregation
- Key files: `deadline-reminder.ts` (daily 06:00 IST), `notification-processor.ts` (every minute)

**prisma/**
- Purpose: Database schema, migrations, seeders
- Contains: Prisma schema (63 models), SQL migration files, seed data
- Key files: `schema.prisma`, `seed.ts`, `seed-master-directions.ts`

**tests/**
- Purpose: Automated testing (E2E via Playwright)
- Contains: Playwright test specs, auth setup fixtures
- Key files: `e2e/` (test specs), `auth.setup.ts` (login/session setup)

**deploy/**
- Purpose: Deployment scripts and infrastructure config
- Contains: Nginx config, PM2 config, demo setup scripts
- Key files: `nginx.conf`, `ecosystem.config.js`, `deploy.sh`

**infra/**
- Purpose: AWS CDK infrastructure-as-code
- Contains: CDK stacks for VPC, RDS, S3, SES
- Key files: `lib/aegis-stack.ts`

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout (i18n providers, fonts, root <html>)
- `src/app/(dashboard)/layout.tsx`: Dashboard layout (session validation, sidebar, topbar) — TRUE security boundary
- `src/app/(auth)/layout.tsx`: Auth layout (public routes)
- `src/middleware.ts`: Edge middleware (cookie-based route protection)

**Configuration:**
- `.env.example`: Environment variable template
- `src/env.ts`: Zod environment validation
- `next.config.ts`: Next.js config (Turbopack, redirects, externals)
- `tsconfig.json`: TypeScript paths (`@/*` → `./src/*`)
- `components.json`: shadcn/ui customization

**Core Logic:**
- `src/lib/auth.ts`: Better Auth configuration + session management
- `src/lib/prisma.ts`: Prisma singleton + `prismaForTenant()` (tenant isolation)
- `src/lib/permissions.ts`: RBAC system (17 roles, 60+ permissions)
- `src/lib/ram-engine.ts`: Risk Assessment Model computation
- `src/data-access/session.ts`: `getRequiredSession()`, permission checkers

**Testing:**
- `tests/e2e/`: Playwright E2E test files
- `tests/auth.setup.ts`: Auth fixture (login before tests)
- `src/lib/__tests__/`: Unit tests for utility functions

## Naming Conventions

**Files:**
- React components: PascalCase (e.g., `AppSidebar.tsx`, `CreateObservationForm.tsx`)
- Server actions: camelCase with action suffix (e.g., `createObservation.ts`, `approveAuditPlan.ts`)
- Server utilities: camelCase (e.g., `formatDate.ts`, `prisma.ts`)
- API routes: kebab-case directory names (e.g., `api/audit-execution/[id]/sections/`)
- Page routes: kebab-case (e.g., `(dashboard)/audit-plans/`, `(auth)/login/`)

**Directories:**
- Feature domains: kebab-case (e.g., `src/actions/audit-plans/`, `src/components/risk-management/`)
- Group routes (parentheses): `(auth)`, `(dashboard)`, `(onboarding)` — not in URL
- Subdomain organization: `[domain]/[sub-action]` pattern in actions/components

**Functions:**
- Async/server: verb prefix (e.g., `getObservations()`, `createObservation()`, `approveAuditPlan()`)
- Hooks: `use` prefix (e.g., `useAutoSave`, `useMobile`)
- Helpers: camelCase (e.g., `formatDate()`, `cn()`)
- Pure functions: descriptive (e.g., `computeCompositeScore()`, `getRiskCategory()`)

**Variables:**
- Component props: PascalCase type, camelCase instance (e.g., `interface CreateObservationFormProps { ... }`)
- Enums: UPPER_CASE or PascalCase (e.g., `Role.AUDITOR`, `ObservationStatus.DRAFT`)
- Constants: UPPER_SNAKE_CASE (e.g., `DEFAULT_PAGE_SIZE`, `SESSION_COOKIE_NAME`)

## Where to Add New Code

**New Feature (e.g., Concurrent Audit):**
- Page route: `src/app/(dashboard)/concurrent-audit/page.tsx`
- Server actions: `src/actions/concurrent-audit/{list,create,update,approve}.ts`
- Components: `src/components/concurrent-audit/{list,form,detail}.tsx`
- DAL: `src/data-access/concurrent-audit.ts`
- Tests: `tests/e2e/concurrent-audit.spec.ts`

**New Component/Module:**
- Location: Create directory in `src/components/[domain]/`
- Naming: PascalCase files, export as named export
- Server components: Use by default; `"use client"` only for interactivity
- Props: Define TypeScript interface `[ComponentName]Props`

**New Utility/Service:**
- Pure functions: `src/lib/[service].ts`
- With state: `src/services/[service]/` directory
- Validation schema: `src/lib/validations/[domain].ts` or `src/actions/[domain]/schemas.ts`
- Types: `src/types/[domain].ts`

**New Business Logic:**
- Domain-specific: Create engine in `src/lib/[domain]-engine.ts` (e.g., `ram-engine.ts`)
- Computation classes: `src/services/[domain]/` with `types.ts` + `compute.ts`
- Constants: Add to `src/lib/constants.ts` or domain-specific file

**New Background Job:**
- Handler: `src/jobs/[job-name].ts` (export async function `process[JobName]()`)
- Registration: Add case in `src/jobs/index.ts` `registerJobs(boss)`
- Cron: Set schedule as comment in handler; list in job registration with IST timezone note

**New Database Model:**
- Schema: Edit `prisma/schema.prisma`
- Generate: `pnpm db:generate`
- Migration: `pnpm db:migrate:dev --name [description]`
- Seed (if test data): Add to `prisma/seed.ts`

## Special Directories

**src/generated/prisma/**
- Purpose: Prisma Client auto-generated types and client
- Generated: By `pnpm db:generate` from `prisma/schema.prisma`
- Committed: Yes (includes in git)
- DO NOT EDIT MANUALLY — regenerate after schema changes

**src/data/**
- Purpose: Static reference data (RBI regulations)
- Generated: Partially (RBI directions imported via `seed-master-directions.ts`)
- Committed: Yes
- `rbi-master-directions/`: Production seed data
- `seed/`: DEPRECATED — use database queries instead

**prisma/migrations/**
- Purpose: Prisma migration history
- Generated: By `pnpm db:migrate:dev`
- Committed: Yes
- DO NOT EDIT MANUALLY — generated by Prisma

**messages/**
- Purpose: i18n locale strings
- Files: `en.json`, `hi.json`, `mr.json`, `gu.json`
- Committed: Yes
- Structure: Nested objects keyed by domain (Navigation, Dashboard, Findings, etc.)

**tests/e2e/**
- Purpose: Playwright end-to-end test specs
- Committed: Yes
- Pattern: `[feature].spec.ts` files
- Run: `pnpm test:e2e`

**.next/**
- Purpose: Next.js build output cache
- Generated: By `pnpm build` or dev server
- Committed: No (.gitignore)
- If stale (showing old pages): Delete and restart dev server

**node_modules/**
- Purpose: Installed dependencies (pnpm)
- Generated: By `pnpm install`
- Committed: No (.gitignore)
- Lock file: `pnpm-lock.yaml` (committed)

---

*Structure analysis: 2026-02-21*
