# Codebase Structure

**Analysis Date:** 2026-02-20

## Directory Layout

```
AEGIS/
├── src/
│   ├── actions/                   # Server Actions (mutations, 79 files)
│   ├── app/                       # Next.js App Router (52 pages + API routes)
│   │   ├── (auth)/                # Unauthenticated routes
│   │   ├── (dashboard)/           # Authenticated app shell routes
│   │   ├── (onboarding)/          # Tenant onboarding wizard routes
│   │   ├── api/                   # REST API endpoints
│   │   ├── globals.css            # Global CSS + Tailwind v4 theme
│   │   ├── layout.tsx             # Root layout (i18n, fonts, Toaster)
│   │   └── page.tsx               # Root redirect to /login
│   ├── components/                # React components (212 files, 30 dirs)
│   ├── data/                      # Static RBI regulation data (production use)
│   ├── data-access/               # DAL — DB queries with tenant isolation (39 files)
│   ├── emails/                    # React Email templates
│   ├── generated/prisma/          # Prisma-generated client (do not edit)
│   ├── hooks/                     # Custom React hooks
│   ├── i18n/                      # next-intl config and routing
│   ├── jobs/                      # pg-boss background job workers
│   ├── lib/                       # Core utilities and business logic engines
│   ├── middleware.ts              # Edge middleware — cookie-based route protection
│   ├── providers/                 # React context providers
│   ├── services/                  # Business logic services (risk-rating)
│   ├── stores/                    # Zustand client state stores
│   └── types/                     # TypeScript type definitions
├── prisma/
│   ├── schema.prisma              # 63 models, 16 enums, 1999 lines
│   ├── seed.ts                    # Database seeder (1690 lines)
│   ├── migrations/                # Prisma migration history
│   └── *.sql                      # Manual SQL (triggers, views, indexes)
├── messages/
│   ├── en.json                    # English translations
│   ├── hi.json                    # Hindi translations
│   ├── mr.json                    # Marathi translations
│   └── gu.json                    # Gujarati translations
├── tests/
│   ├── e2e/                       # Playwright E2E test specs
│   └── auth.setup.ts              # Auth setup for E2E test suites
├── scripts/                       # Utility scripts (account creation, S3 setup)
├── deploy/                        # Nginx config, PM2, systemd, demo scripts
├── infra/                         # AWS CDK infrastructure-as-code
├── public/                        # Static assets (logos)
├── .planning/                     # GSD workflow docs (phases, codebase analysis)
├── CLAUDE.md                      # Project context for Claude Code
├── next.config.ts                 # Next.js configuration
├── tailwind.config.ts             # Tailwind CSS v4 config
├── tsconfig.json                  # TypeScript compiler config
├── prisma/schema.prisma           # Database schema
└── package.json                   # Dependencies and scripts
```

## Directory Purposes

**`src/actions/`:**

- Purpose: All data mutation entry points — form submissions, state changes, creates/updates/deletes
- Contains: `"use server"` files, Zod schema files (`schemas.ts`), organized by domain
- Key files:
  - `src/actions/observations/create.ts` — create observation server action
  - `src/actions/observations/transition.ts` — state machine transitions
  - `src/actions/compliance/` — compliance lifecycle actions
  - `src/actions/ram/` — risk assessment scoring actions
  - `src/actions/users.ts` — user management (flat file, not directory)
- Pattern: Domain directories contain multiple action files; simpler domains are single flat files

**`src/app/(auth)/`:**

- Purpose: Unauthenticated routes accessible without session
- Contains: Login page, accept-invite page
- Key files: `src/app/(auth)/login/page.tsx`, `src/app/accept-invite/page.tsx`

**`src/app/(dashboard)/`:**

- Purpose: All authenticated application pages; wrapped in `layout.tsx` that enforces session
- Contains: One directory per feature module; each has `page.tsx` and sometimes `[id]/` subdirectories
- Key subdirectories:
  - `admin/` — user, branch, zone, template, RAM config management
  - `audit-execution/[id]/` — field audit execution with section tabs
  - `findings/` — observation lifecycle (list, detail, new)
  - `compliance/` — ACE and ACB compliance tracking
  - `ram/[id]/` — risk assessment model per branch
  - `dashboard/` — role-specific KPI widget layout
  - `reports/` — XLSX/PDF generation
  - `governance/` — board governance module
  - `concurrent-audit/` — concurrent audit module
  - `is-audit/` — IS audit module
  - `regulatory/` — regulatory compliance module

**`src/app/api/`:**

- Purpose: REST API endpoints (not server actions; used for auth, health checks, file downloads)
- Key routes:
  - `src/app/api/auth/[...all]/route.ts` — Better Auth catch-all handler
  - `src/app/api/health/route.ts` — health check (public)
  - `src/app/api/exports/route.ts` — XLSX export endpoint
  - `src/app/api/reports/route.ts` — report generation
  - `src/app/api/download/route.ts` — S3 file download proxy
  - `src/app/api/cron/route.ts` — scheduled job trigger

**`src/components/`:**

- Purpose: All React components; split into generic UI and domain-specific
- Key subdirectories:
  - `src/components/ui/` — shadcn/ui primitives (Button, Card, Dialog, etc.)
  - `src/components/layout/` — AppSidebar, TopBar, navigation
  - `src/components/auth/` — session warning, auth helpers
  - `src/components/dashboard/` — widget system, dashboard composer
  - `src/components/observations/` — observation forms, timeline, detail view
  - `src/components/compliance/` — compliance tracking UI
  - `src/components/audit/` — audit execution components
  - `src/components/ram/` — risk assessment model UI
  - `src/components/reports/` — PDF report viewer components
  - `src/components/admin/` — user/branch admin UI

**`src/data-access/`:**

- Purpose: Data Access Layer — all DB reads; enforces tenant isolation
- Contains: One file per domain, each exporting query functions accepting `Session`
- Key files:
  - `src/data-access/session.ts` — `getRequiredSession()`, `getOptionalSession()`, role helpers
  - `src/data-access/prisma.ts` — `prismaForTenant()`, singleton Prisma client
  - `src/data-access/observations.ts` — observation queries
  - `src/data-access/dashboard.ts` — dashboard widget data
  - `src/data-access/compliance.ts` — compliance tracking queries
  - `src/data-access/ram.ts` — RAM assessments
  - `src/data-access/users.ts` — user management queries
  - `src/data-access/audit-context.ts` — audit trail context helper

**`src/lib/`:**

- Purpose: Core utilities, business logic engines, external service clients
- Key files:
  - `src/lib/auth.ts` — Better Auth configuration and `AuthSession` type
  - `src/lib/permissions.ts` — RBAC roles, permissions map, `hasPermission()`
  - `src/lib/guards.ts` — page-level permission guards (`requirePermission()`)
  - `src/lib/prisma.ts` — Prisma singleton and `prismaForTenant()`
  - `src/lib/state-machine.ts` — Observation lifecycle state machine
  - `src/lib/ram-engine.ts` — RAM risk scoring pure functions
  - `src/lib/escalation-engine.ts` — Compliance escalation level computation
  - `src/lib/logger.ts` — pino logger instance
  - `src/lib/utils.ts` — `cn()`, `formatDate()`, shared utilities
  - `src/lib/icons.ts` — barrel export for lucide-react icons (always use this)
  - `src/lib/s3.ts` — AWS S3 client and file operations
  - `src/lib/ses-client.ts` — AWS SES email client
  - `src/lib/job-queue.ts` — pg-boss initialization and worker registration
  - `src/lib/notification-service.ts` — notification dispatch logic
  - `src/lib/excel-export.ts` — ExcelJS XLSX generation
  - `src/lib/validations/` — shared Zod validation schemas
  - `src/lib/__tests__/` — unit tests for lib utilities

**`src/jobs/`:**

- Purpose: Background job worker definitions registered with pg-boss
- Key files:
  - `src/jobs/deadline-reminder.ts` — upcoming audit deadline reminders
  - `src/jobs/overdue-escalation.ts` — escalate overdue compliance items
  - `src/jobs/notification-processor.ts` — process notification queue
  - `src/jobs/notification-batcher.ts` — batch notifications to reduce emails
  - `src/jobs/weekly-digest.ts` — weekly summary email to managers
  - `src/jobs/snapshot-metrics.ts` — periodic metrics snapshot for dashboard
  - `src/jobs/index.ts` — worker registration entry

**`src/stores/`:**

- Purpose: Zustand client-side state (non-server state only)
- Key files: `src/stores/onboarding-store.ts` — multi-step onboarding wizard state

**`src/emails/`:**

- Purpose: React Email component templates for transactional emails
- Key subdirectories: `src/emails/templates/` — email template components, `src/emails/components/` — shared email UI

**`prisma/`:**

- Purpose: Database schema, migration history, seed data
- Key files:
  - `prisma/schema.prisma` — 63 models, 16 enums, full DB definition
  - `prisma/seed.ts` — comprehensive seeder (10 users, 2 tenants, 568 examination items)
  - `prisma/migrations/` — Prisma migration SQL history
  - `prisma/*.sql` — Manual SQL applied outside Prisma migrations (DB views, triggers)

## Key File Locations

**Entry Points:**

- `src/app/page.tsx` — root redirect to `/login`
- `src/app/layout.tsx` — root HTML layout (i18n, fonts)
- `src/app/(dashboard)/layout.tsx` — authenticated app shell (session validation)
- `src/middleware.ts` — edge cookie check
- `src/instrumentation.ts` — server startup jobs initialization

**Configuration:**

- `next.config.ts` — Next.js config (server external packages, body size limits)
- `tailwind.config.ts` — Tailwind CSS v4 configuration
- `tsconfig.json` — TypeScript config with `@/*` → `./src/*` path alias
- `src/env.ts` — Environment variable validation via `@t3-oss/env-nextjs` + Zod
- `components.json` — shadcn/ui configuration (style: "new-york")
- `.prettierrc` — Prettier formatting config

**Core Logic:**

- `src/lib/auth.ts` — authentication configuration
- `src/lib/permissions.ts` — RBAC permission map for all 17 roles
- `src/lib/state-machine.ts` — observation state machine
- `src/data-access/session.ts` — session management helpers
- `src/data-access/prisma.ts` — database client

**Testing:**

- `tests/e2e/` — Playwright E2E specs
- `tests/auth.setup.ts` — Playwright auth state setup
- `src/lib/__tests__/` — Vitest unit tests

## Naming Conventions

**Files:**

- Pages: `page.tsx` (required by Next.js App Router)
- Layouts: `layout.tsx` (required by Next.js App Router)
- Server Actions: kebab-case verb-noun files (`create.ts`, `transition.ts`, `resolve-fieldwork.ts`)
- DAL files: kebab-case domain noun (`observations.ts`, `audit-plans.ts`, `compliance-management.ts`)
- Components: PascalCase (`ObservationCard.tsx`, `DashboardComposer.tsx`)
- Hooks: camelCase with `use-` prefix (`use-auto-save.ts`, `use-mobile.tsx`)
- Lib utilities: kebab-case (`ram-engine.ts`, `state-machine.ts`, `escalation-engine.ts`)

**Directories:**

- App routes: kebab-case matching URL segment (`audit-execution/`, `risk-management/`, `concurrent-audit/`)
- Dynamic segments: `[id]` or named `[assessmentId]`
- Route groups: parentheses `(auth)`, `(dashboard)`, `(onboarding)` — no URL impact
- Component dirs: kebab-case domain name (`audit-execution/`, `compliance/`, `pre-audit/`)

**Exports:**

- Actions: named exports (`export async function createObservation`)
- DAL functions: named exports (`export async function getObservations`)
- Lib engines: named function exports
- Components: default exports for page/layout; named exports for components in barrel files

## Where to Add New Code

**New Feature Page:**

- Primary page: `src/app/(dashboard)/[feature-name]/page.tsx`
- Nested detail: `src/app/(dashboard)/[feature-name]/[id]/page.tsx`
- Add permission guard at top of page: `const session = await requirePermission('feature:read')`

**New Server Action:**

- Simple single-action domain: `src/actions/[domain].ts`
- Multi-action domain: `src/actions/[domain]/[action].ts` with `src/actions/[domain]/schemas.ts`
- Always: `"use server"`, call `getRequiredSession()` first, check permissions, validate with Zod

**New DAL Function:**

- Add to `src/data-access/[domain].ts` (create file if new domain)
- Always accept `session: AuthSession` as first parameter
- Always include `WHERE tenantId = session.user.tenantId` in every query
- Import `prismaForTenant` from `src/data-access/prisma.ts`

**New Component:**

- Generic UI primitive: `src/components/ui/[component-name].tsx` (shadcn/ui style)
- Domain-specific: `src/components/[domain]/[ComponentName].tsx`

**New Background Job:**

- Worker definition: `src/jobs/[job-name].ts`
- Register in: `src/jobs/index.ts`

**New Permission:**

- Add to `Permission` union type in `src/lib/permissions.ts`
- Add to role permission maps in the same file
- Use `hasPermission(roles, 'new:permission')` or `requirePermission('new:permission')`

**New Email Template:**

- Template component: `src/emails/templates/[TemplateName].tsx`
- Shared components: `src/emails/components/`

**Utilities:**

- Shared helpers: `src/lib/utils.ts` (small utilities) or new `src/lib/[utility-name].ts` for larger
- Shared Zod schemas: `src/lib/validations/[domain].ts`
- Icons: Always import from `src/lib/icons.ts`, not directly from `lucide-react`

## Special Directories

**`src/generated/prisma/`:**

- Purpose: Auto-generated Prisma client output
- Generated: Yes (via `pnpm db:generate`)
- Committed: Yes (client is committed to enable deployments without build step)
- Never edit manually

**`.planning/`:**

- Purpose: GSD workflow documentation (phases, roadmap, state, codebase analysis)
- Generated: No (hand-authored by GSD commands)
- Committed: Yes

**`prisma/migrations/`:**

- Purpose: Prisma migration SQL history for schema evolution
- Generated: Yes (via `pnpm db:migrate`)
- Committed: Yes

**`infra/`:**

- Purpose: AWS CDK TypeScript infrastructure as code (S3, SES, VPC definitions)
- Generated: No
- Committed: Yes

**`.next/`:**

- Purpose: Next.js build output and Turbopack cache
- Generated: Yes
- Committed: No (in .gitignore)
- Note: Delete `.next/` if pages show stale content due to Turbopack cache corruption

---

_Structure analysis: 2026-02-20_
