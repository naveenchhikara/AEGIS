# Codebase Structure

**Analysis Date:** 2026-02-25

## Directory Layout

```
/Users/admin/Developer/AEGIS/
├── src/                          # All application source code
│   ├── actions/                  # Server Actions (mutations) — 81 files, 15 domain dirs
│   ├── app/                      # Next.js App Router — 52 pages
│   │   ├── (auth)/               # Unauthenticated routes (login, accept-invite)
│   │   ├── (dashboard)/          # All authenticated routes with shared layout
│   │   ├── (onboarding)/         # Tenant onboarding wizard
│   │   └── api/                  # REST endpoints
│   ├── components/               # UI components — 213 files, 30 dirs
│   │   ├── ui/                   # shadcn/ui primitives (button, dialog, form, etc.)
│   │   ├── layout/               # Shared layout (sidebar, header, nav)
│   │   └── [domain]/             # Domain-specific components (one dir per feature)
│   ├── data/                     # RBI regulation data (production JSON)
│   ├── data-access/              # DAL — 39 files, one per domain
│   ├── emails/                   # React Email templates
│   ├── generated/prisma/         # Prisma-generated client (do not edit)
│   ├── hooks/                    # Custom React hooks
│   ├── i18n/                     # next-intl config and routing
│   ├── jobs/                     # pg-boss background job handlers
│   ├── lib/                      # Core utilities — 35 files
│   ├── providers/                # React context providers
│   ├── services/                 # Business logic (risk-rating computation)
│   ├── stores/                   # Zustand client state stores
│   ├── types/                    # TypeScript type definitions
│   ├── env.ts                    # Environment variable validation (t3-oss/env-nextjs)
│   ├── instrumentation.ts        # Next.js server startup hook (job registration)
│   └── middleware.ts             # Edge middleware (route protection)
├── prisma/
│   ├── schema.prisma             # 71 models, 20 enums, 2320 lines
│   ├── seed.ts                   # Database seeder (1690 lines)
│   ├── migrations/               # Prisma migration files + standalone SQL
│   └── *.sql                     # Manual SQL (triggers, views)
├── messages/                     # i18n message files
│   ├── en.json                   # English (primary)
│   ├── hi.json                   # Hindi
│   ├── mr.json                   # Marathi
│   └── gu.json                   # Gujarati
├── tests/
│   ├── e2e/                      # Playwright E2E specs
│   └── auth.setup.ts             # Auth setup for E2E
├── infra/                        # AWS CDK infrastructure-as-code
├── deploy/                       # Deployment scripts, Nginx config, PM2, demo scripts
├── scripts/                      # Utility scripts (account creation, S3 setup)
├── .planning/                    # GSD workflow docs (PROJECT, ROADMAP, STATE, REQUIREMENTS)
│   ├── codebase/                 # Codebase analysis docs (this directory)
│   └── phases/                   # Phase plans and research
├── .env.example                  # Environment variable template
├── next.config.ts                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS v4 config
├── tsconfig.json                 # TypeScript config
├── components.json               # shadcn/ui config ("new-york" style)
└── package.json                  # pnpm workspace + scripts
```

## Directory Purposes

**`src/actions/`:**

- Purpose: All data mutations — create, update, delete, state transitions
- Contains: One subdirectory per domain (e.g., `observations/`, `compliance/`, `rbia/`), each with action files
- Pattern: Every action calls `getRequiredSession()` first, then permission check, then Zod validation, then DAL/Prisma
- Key files: `src/actions/observations/`, `src/actions/rbia/`, `src/actions/audit-execution/`

**`src/app/(dashboard)/`:**

- Purpose: All authenticated routes with the shared navigation shell
- Contains: Subdirectory per feature route; each has `page.tsx` (Server Component) + optional `loading.tsx`, `error.tsx`
- Key files: `src/app/(dashboard)/layout.tsx` (full session validation + nav shell)
- Route pattern: `/[feature]` for lists, `/[feature]/[id]` for detail pages

**`src/app/api/`:**

- Purpose: REST endpoints for auth, health, exports, reports, cron, downloads
- Contains: `auth/[...all]/route.ts` (Better Auth), `health/route.ts`, `exports/route.ts`, `reports/route.ts`, `cron/route.ts`, `download/route.ts`

**`src/components/ui/`:**

- Purpose: shadcn/ui primitive components — do not customize business logic here
- Contains: `button.tsx`, `dialog.tsx`, `form.tsx`, `table.tsx`, `badge.tsx`, `card.tsx`, etc.
- Rule: Import these from `@/components/ui/[name]`; never import from `radix-ui` directly in pages

**`src/components/layout/`:**

- Purpose: App shell components shared across all dashboard pages
- Contains: Sidebar, header, navigation items

**`src/components/[domain]/`:**

- Purpose: Feature-specific UI components (one directory per feature matching app route)
- Examples: `src/components/findings/`, `src/components/rbia/`, `src/components/compliance/`

**`src/data-access/`:**

- Purpose: All database reads; single source of truth for DB queries
- Contains: One file per domain (e.g., `observations.ts`, `compliance.ts`, `audit-execution.ts`)
- Rule: Always call `prismaForTenant(tenantId)` and include `WHERE tenantId` in every query
- Key files: `src/data-access/session.ts` (exports `getRequiredSession()`), `src/data-access/prisma.ts`

**`src/lib/`:**

- Purpose: Core utilities, engines, and integrations
- Key files:
  - `src/lib/auth.ts` — Better Auth server instance
  - `src/lib/auth-client.ts` — Better Auth browser client
  - `src/lib/permissions.ts` — RBAC permission definitions (17 roles, 60+ permissions)
  - `src/lib/prisma.ts` — Prisma client singleton + `prismaForTenant()`
  - `src/lib/logger.ts` — pino logger instance
  - `src/lib/icons.ts` — Lucide icon barrel export (always import icons from here)
  - `src/lib/ram-engine.ts` — Risk Assessment Model computation
  - `src/lib/rbia-scoring-engine.ts` — RBIA 4-point scoring with weighted roll-up
  - `src/lib/escalation-engine.ts` — L1-L4 escalation rules
  - `src/lib/engagement-state-machine.ts` — EngagementStatus 8-state machine
  - `src/lib/notification-service.ts` — Email dispatch via AWS SES
  - `src/lib/job-queue.ts` — pg-boss queue access
  - `src/lib/constants.ts` — Shared constants

**`src/jobs/`:**

- Purpose: Background job handler definitions
- Contains: Job files registered at startup via `src/instrumentation.ts`

**`src/stores/`:**

- Purpose: Zustand client-side state stores
- Rule: Only for UI state that does not belong on the server; server state uses React Query

**`src/types/`:**

- Purpose: Shared TypeScript types and interfaces not generated by Prisma
- Rule: Prisma-generated types come from `src/generated/prisma/`; domain types live here

**`prisma/migrations/`:**

- Purpose: Prisma migration history + standalone SQL files
- Note: 4 PostgreSQL views (`v_compliance_summary`, `v_observation_severity`, `v_audit_coverage_branch`, `fn_dashboard_health_score`) are in standalone `.sql` files and must be applied manually after fresh deploys

## Key File Locations

**Entry Points:**

- `src/app/page.tsx`: Root redirect to `/login`
- `src/app/(auth)/login/page.tsx`: Login page
- `src/app/(dashboard)/layout.tsx`: Authenticated shell with full session validation
- `src/middleware.ts`: Edge-runtime route protection

**Configuration:**

- `src/env.ts`: All environment variables with Zod validation
- `next.config.ts`: Next.js config (server external packages, body size limit)
- `tailwind.config.ts`: Tailwind CSS v4 config
- `components.json`: shadcn/ui config (new-york variant)
- `prisma/schema.prisma`: Full database schema

**Core Logic:**

- `src/data-access/session.ts`: `getRequiredSession()` — start every action/page here
- `src/lib/prisma.ts`: `prismaForTenant()` — tenant-scoped DB access
- `src/lib/permissions.ts`: RBAC role and permission definitions
- `src/lib/auth.ts`: Better Auth server configuration

**Testing:**

- `tests/e2e/`: Playwright E2E specs
- `tests/auth.setup.ts`: Playwright auth state setup
- `src/lib/__tests__/`: Vitest unit tests for lib utilities

## Naming Conventions

**Files:**

- Pages: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` (Next.js conventions)
- Server Actions: `kebab-case.ts` matching domain name (e.g., `create-observation.ts`)
- DAL files: `kebab-case.ts` matching domain (e.g., `observations.ts`, `audit-plans.ts`)
- Components: `PascalCase.tsx` (e.g., `ObservationCard.tsx`, `RiskMatrix.tsx`)
- Hooks: `use-kebab-case.ts` (e.g., `use-audit-filter.ts`)
- Lib utilities: `kebab-case.ts` (e.g., `ram-engine.ts`, `fiscal-year.ts`)

**Directories:**

- App routes: `kebab-case` matching URL segment (e.g., `audit-execution/`, `risk-management/`)
- Component dirs: `kebab-case` matching feature domain (e.g., `findings/`, `concurrent-audit/`)
- Action dirs: `kebab-case` matching domain (e.g., `observations/`, `compliance/`)

**Variables and Functions:**

- Functions: `camelCase` (e.g., `getRequiredSession`, `prismaForTenant`)
- Types/Interfaces: `PascalCase` (e.g., `TenantSettings`, `ObservationWithDetails`)
- Prisma enums: `UPPER_SNAKE_CASE` matching DB enum values (e.g., `Role.AUDITOR`, `ScoreLabel.FULLY_COMPLIANT`)
- Constants: `UPPER_SNAKE_CASE` in `src/lib/constants.ts`

## Where to Add New Code

**New Feature (full page + data):**

1. Route page: `src/app/(dashboard)/[feature-name]/page.tsx`
2. Components: `src/components/[feature-name]/`
3. DAL reads: `src/data-access/[feature-name].ts`
4. Server Actions: `src/actions/[feature-name]/`
5. Tests: `tests/e2e/[feature-name].spec.ts`

**New Server Action:**

- File: `src/actions/[domain]/[action-name].ts`
- Template: Call `getRequiredSession()` → permission check → Zod validate → DAL/Prisma → return `{ success, data?, error? }`

**New DAL Function:**

- File: `src/data-access/[domain].ts` (add to existing domain file or create new)
- Template: Accept session object → call `prismaForTenant(session.tenantId)` → query with `WHERE tenantId = session.tenantId`

**New Component:**

- Domain component: `src/components/[domain]/ComponentName.tsx`
- Shared primitive: `src/components/ui/` (only if it's a generic UI element)

**New Background Job:**

- Handler: `src/jobs/[job-name].ts`
- Register: Add to `src/instrumentation.ts`

**New Engine / Business Logic:**

- File: `src/lib/[domain]-engine.ts`
- Pattern: Pure functions; no HTTP, no direct Prisma calls — accept typed inputs, return typed outputs

**Utilities:**

- Shared helpers: `src/lib/[utility-name].ts`
- Icon imports: Always use `src/lib/icons.ts` barrel — never import from `lucide-react` directly

**New Prisma Model:**

- Add to `prisma/schema.prisma`
- Run `pnpm db:generate` to regenerate client to `src/generated/prisma/`
- Run `pnpm db:push` (dev) or `pnpm db:migrate` (prod)

## Special Directories

**`src/generated/prisma/`:**

- Purpose: Prisma-generated TypeScript client
- Generated: Yes (by `pnpm db:generate`)
- Committed: Yes (for Docker builds without DB access at build time)
- Rule: Never edit manually

**`.planning/`:**

- Purpose: GSD workflow documents — PROJECT, ROADMAP, STATE, phase plans, codebase analysis
- Generated: No (maintained by GSD agents and developers)
- Committed: Yes

**`src/data/`:**

- Purpose: Static RBI regulation JSON data (production use)
- Note: `src/data/seed/` JSON files are deprecated for runtime use — query DB via DAL instead

**`infra/`:**

- Purpose: AWS CDK infrastructure-as-code (S3, SES, etc.)
- Committed: Yes

**`deploy/`:**

- Purpose: Deployment scripts, Nginx config, PM2 config, demo data scripts
- Committed: Yes

---

_Structure analysis: 2026-02-25_
