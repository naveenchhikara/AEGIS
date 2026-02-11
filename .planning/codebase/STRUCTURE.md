# Codebase Structure

**Analysis Date:** 2026-02-08
**Updated:** 2026-02-11 (post v2.0 MVP)

## Directory Layout

```
AEGIS/
├── .planning/                  # GSD workflow documentation
│   ├── codebase/              # Codebase analysis docs (this file)
│   ├── phases/                # Phase implementation plans (1-14)
│   ├── quick/                 # Quick task documentation
│   └── milestones/            # Milestone tracking (v1.0, v2.0)
├── infra/                      # AWS CDK infrastructure (excluded from TS compilation)
├── prisma/                     # Database schema and migrations
│   ├── schema.prisma          # 23 models, 865 lines
│   ├── migrations/            # Database migrations
│   └── seed.ts                # Database seed script
├── Project Doc/               # Business docs, RBI blueprints
├── messages/                  # i18n translation JSON files (en, hi, mr, gu)
├── public/                    # Static assets
│   └── logos/                 # AEGIS logo assets
├── scripts/                   # Build/deployment scripts
├── tests/                     # Test files
│   └── e2e/                   # Playwright E2E tests
│       ├── observation-lifecycle.spec.ts
│       └── permission-guards.spec.ts
├── playwright/                # Playwright auth storage
│   └── .auth/                 # Stored sessions per role
├── src/
│   ├── app/                   # Next.js App Router pages and layouts
│   │   ├── (auth)/            # Auth route group (login)
│   │   ├── (dashboard)/       # Dashboard route group (all sidebar pages)
│   │   ├── (onboarding)/      # Onboarding wizard route group
│   │   ├── accept-invite/     # Invitation acceptance page
│   │   ├── api/               # API routes (reports, health)
│   │   ├── globals.css        # Global styles with Tailwind v4
│   │   ├── layout.tsx         # Root layout (fonts, i18n provider)
│   │   └── page.tsx           # Root redirect to /login
│   ├── actions/               # Server actions (15 files)
│   │   ├── observations/      # Create, transition, resolve-fieldwork
│   │   ├── repeat-findings/   # Detect, confirm, schemas
│   │   ├── compliance-management.ts
│   │   ├── auditee.ts
│   │   ├── onboarding.ts
│   │   ├── onboarding-excel-upload.ts
│   │   ├── user-invitations.ts
│   │   ├── notification-preferences.ts
│   │   ├── settings.ts
│   │   └── users.ts
│   ├── components/            # React components (290 files in src/ total)
│   │   ├── ui/                # shadcn/ui primitives (23+ components)
│   │   ├── layout/            # AppSidebar, TopBar
│   │   ├── dashboard/         # Dashboard widgets
│   │   ├── compliance/        # Compliance table, filters, charts
│   │   ├── audit/             # Audit calendar, cards, detail
│   │   ├── findings/          # Findings table, filters, detail, observation form
│   │   ├── reports/           # Board report sections, report generator
│   │   ├── pdf-report/        # React-PDF board report components
│   │   ├── onboarding/        # Onboarding wizard step components
│   │   ├── settings/          # Settings page components
│   │   └── auth/              # Login form components
│   ├── emails/                # Email templates and rendering
│   │   ├── templates/         # 6 React email templates
│   │   ├── render.ts          # Email rendering utility
│   │   └── email-base-layout.tsx
│   ├── data/                  # Demo data and RBI regulations (legacy, used for seeding)
│   │   ├── demo/              # JSON files for Apex Sahakari Bank
│   │   │   ├── en/hi/mr/gu/  # Locale-specific copies (unused at runtime)
│   │   ├── rbi-regulations/   # RBI regulation knowledge base
│   │   └── index.ts           # Barrel export
│   ├── hooks/                 # Custom React hooks
│   ├── i18n/                  # Internationalization config
│   ├── lib/                   # Utility functions, clients, and constants
│   │   ├── auth.ts            # Better Auth server config
│   │   ├── auth-client.ts     # Better Auth client hooks
│   │   ├── s3.ts              # AWS S3 client
│   │   ├── ses-client.ts      # AWS SES client
│   │   ├── utils.ts           # cn(), formatDate()
│   │   ├── constants.ts       # Colors, languages
│   │   ├── nav-items.ts       # Sidebar navigation
│   │   ├── icons.ts           # Lucide icons barrel export
│   │   └── report-utils.ts    # Report calculations
│   └── types/                 # TypeScript type definitions
├── .env.example               # 52 environment variables documented
├── Dockerfile                 # Multi-stage build (63 lines)
├── docker-compose.yml         # Local PostgreSQL
├── playwright.config.ts       # Playwright E2E config
├── .prettierrc                # Code formatting config
├── CLAUDE.md                  # Project instructions for Claude
├── components.json            # shadcn/ui configuration
├── eslint.config.mjs          # ESLint configuration
├── next.config.ts             # Next.js configuration (standalone output)
├── package.json               # Dependencies and scripts
├── pnpm-lock.yaml             # pnpm lockfile
├── postcss.config.js          # PostCSS config
├── tailwind.config.ts         # Tailwind CSS v4 configuration
└── tsconfig.json              # TypeScript configuration
```

## Directory Purposes

**`prisma/`:**

- Purpose: Database schema, migrations, and seed script
- Contains: `schema.prisma` (23 models, 865 lines), migrations directory, seed script
- Key models: Tenant, User, Observation, Evidence, ComplianceRequirement, AuditPlan, AuditEngagement, AuditLog, NotificationQueue, BoardReport, DashboardSnapshot, OnboardingProgress
- Scripts: `pnpm db:generate`, `pnpm db:push`, `pnpm db:migrate`, `pnpm db:seed`

**`tests/e2e/`:**

- Purpose: Playwright end-to-end tests
- Contains: `observation-lifecycle.spec.ts`, `permission-guards.spec.ts`
- Config: `playwright.config.ts` with 4 role-based projects + auth setup
- Run: `pnpm test:e2e`

**`src/actions/`:**

- Purpose: Next.js server actions for all data mutations
- Contains: 15 files organized by domain (observations, repeat-findings, compliance, auditee, onboarding, etc.)
- Pattern: Zod validation → session check → tenant-scoped Prisma query → audit log → notification queue

**`src/emails/`:**

- Purpose: Email templates for transactional notifications
- Contains: 6 React email templates, render utility, base layout
- Templates: assignment, response, reminder, escalation, weekly-digest, bulk-digest

**`src/app/api/`:**

- Purpose: API routes for non-action endpoints
- Contains: Board report PDF generation (`reports/board-report/route.ts`), health check (`health/route.ts`)

**`.planning/`:**

- Purpose: GSD workflow state and planning documents
- Contains: PROJECT.md, ROADMAP.md, STATE.md, REQUIREMENTS.md, phase plans (1-14), milestone tracking
- Checked into git for team coordination

**`Project Doc/`:**

- Purpose: Business documentation and regulatory reference materials
- Contains: AEGIS blueprint, RBI circulars, UCB guidelines

**`messages/`:**

- Purpose: i18n translation files for multi-language support (en, hi, mr, gu)
- Structure: Nested JSON organized by feature
- Loaded by `src/i18n/request.ts` based on locale cookie

**`public/`:**

- Purpose: Static assets (logos)

**`src/app/(auth)/`:**

- Purpose: Login page with simple centered layout

**`src/app/(dashboard)/`:**

- Purpose: All authenticated pages with sidebar/topbar layout
- Contains: dashboard, compliance, audit-plans, findings, reports, settings, auditee

**`src/app/(onboarding)/`:**

- Purpose: Multi-step onboarding wizard (5 steps)
- Contains: Step components, Excel upload, server persistence

**`src/components/ui/`:**

- Purpose: shadcn/ui primitive components (23+)
- Pattern: Radix UI wrappers with Tailwind styling

**`src/components/pdf-report/`:**

- Purpose: React-PDF components for board report generation
- Contains: `board-report.tsx`, cover page, sections

**`src/lib/`:**

- Purpose: Shared utilities, AWS clients, auth config, constants
- Key files: `auth.ts`, `auth-client.ts`, `s3.ts`, `ses-client.ts`, `utils.ts`, `report-utils.ts`

**`src/data/`:**

- Purpose: Legacy demo data (v1.0) and RBI regulations knowledge base
- Note: Demo data no longer used at runtime (v2.0 reads from PostgreSQL). Kept for seed scripts.

## Key File Locations

**Entry Points:**

- `src/app/layout.tsx`: Root layout
- `src/app/page.tsx`: Root redirect to `/login`
- `src/app/(auth)/login/page.tsx`: Login page
- `src/app/(dashboard)/layout.tsx`: Dashboard layout
- `src/app/(onboarding)/onboarding/`: Onboarding wizard

**Authentication:**

- `src/lib/auth.ts`: Better Auth server config (rate limiting, lockout, sessions)
- `src/lib/auth-client.ts`: Client-side auth hooks

**Database:**

- `prisma/schema.prisma`: All 23 models and enums

**Server Actions:**

- `src/actions/observations/`: Create, transition, resolve-fieldwork
- `src/actions/repeat-findings/`: Detection, confirmation
- `src/actions/compliance-management.ts`: Compliance CRUD
- `src/actions/auditee.ts`: Auditee portal actions
- `src/actions/onboarding.ts`: Onboarding wizard persistence

**AWS Services:**

- `src/lib/s3.ts`: Evidence upload/download
- `src/lib/ses-client.ts`: Email sending
- `src/emails/templates/`: 6 email templates

**Configuration:**

- `next.config.ts`: Standalone output, next-intl plugin
- `Dockerfile`: Multi-stage production build
- `.env.example`: 52 environment variables

**Testing:**

- `playwright.config.ts`: E2E test config
- `tests/e2e/`: Test specs

## Naming Conventions

(Unchanged from v1.0 — see CONVENTIONS.md)

- Files: kebab-case (components, utilities, data)
- Components: PascalCase
- Variables: camelCase, constants SCREAMING_SNAKE_CASE
- Types: PascalCase

## Where to Add New Code

**New Server Action:**

- File: `src/actions/{domain}.ts` or `src/actions/{domain}/action-name.ts`
- Pattern: Zod schema → session check → Prisma query → audit log
- Register in relevant page component

**New Email Template:**

- Template: `src/emails/templates/{template-name}.tsx`
- Register in: `src/emails/render.ts`
- Trigger from: Server action or pg-boss job

**New Database Model:**

- Schema: `prisma/schema.prisma`
- Generate: `pnpm db:generate`
- Migrate: `pnpm db:migrate`

**New Dashboard Widget:**

- Component: `src/components/dashboard/{widget-name}.tsx`
- Data: Prisma query in server component or server action

**New Page:**

- Route: `src/app/(dashboard)/{page-name}/page.tsx`
- Components: `src/components/{page-name}/`
- Sidebar: Update `src/lib/nav-items.ts`
- Translations: Update `messages/{locale}.json`

**New API Route:**

- File: `src/app/api/{route-name}/route.ts`
- Pattern: Session check → business logic → JSON response

**New E2E Test:**

- File: `tests/e2e/{feature-name}.spec.ts`
- Run: `pnpm test:e2e`

---

_Structure analysis: 2026-02-08_
_Updated: 2026-02-11 — reflects v2.0 Working Core MVP (shipped 2026-02-10)_
