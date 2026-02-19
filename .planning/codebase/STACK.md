# AEGIS Technology Stack

## Framework & Core

### Next.js 16.1.6 (App Router)

- **Output mode:** Standalone (Docker optimized)
- **Turbopack:** Enabled for dev (`--turbopack` flag)
- **Server Actions:** Body size limit 5MB
- **Route groups:** `(auth)`, `(dashboard)`, `(onboarding)`
- **Layouts:** Nested layout system with role-based rendering
- **API Routes:** `/api/auth/[...all]`, `/api/exports/*`, `/api/reports/*`, `/api/dashboard`, `/api/health`
- **Middleware:** Edge runtime cookie-based auth gating (`src/middleware.ts`)
- **Config:** `next.config.ts` imports env validation at build time

### React 19.2.4 / React DOM 19.2.4

- **Server Components:** Default pattern (no `"use client"` unless needed)
- **Client Components:** Marked with `"use client"` directive (forms, interactivity)
- **Hooks:** `useActionState`, `useTransition` for progressive enhancement
- **Suspense:** Used for async boundaries with loading fallbacks

### TypeScript 5.9.3

- **Config:** `tsconfig.json` with strict mode, paths alias `@/*`
- **Target:** ES2017
- **Module resolution:** bundler
- **Lib:** dom, dom.iterable, esnext
- **JSX:** react-jsx (React 19 new transform)

---

## Database & ORM

### Prisma 7.3.0 (dev) / @prisma/client 7.3.0

- **Adapter:** `@prisma/adapter-pg` 7.3.0 (native PostgreSQL driver)
- **Provider:** PostgreSQL
- **Extensions:** `pgcrypto` (UUID generation), `pg_trgm` (fuzzy search)
- **Preview features:** `postgresqlExtensions`
- **Output:** `src/generated/prisma` (custom path)
- **Scripts:**
  - `db:generate` - Generate Prisma Client
  - `db:push` - Push schema to database
  - `db:migrate` - Run migrations
  - `db:seed` - Seed database (via `prisma/seed.ts`)
  - `db:studio` - Launch Prisma Studio

### PostgreSQL (via pg 8.18.0)

- **Version:** PostgreSQL 16 (docker-compose)
- **Database:** `aegis_prod` (production), `aegis` (dev)
- **Extensions:** pgcrypto, pg_trgm
- **Connection pooling:** Native pg driver with Prisma adapter
- **RLS:** Row-Level Security via transaction-scoped `app.current_tenant_id` parameter

---

## Authentication & Authorization

### Better Auth 1.4.18

- **Adapter:** `better-auth/adapters/prisma`
- **Strategy:** Cookie-based sessions (`httpOnly`, `secure`, `sameSite: lax`)
- **Session timeout:** 30 minutes idle
- **Plugins:**
  - `multiSession` - Max 2 concurrent sessions per user (SC-3)
  - Custom `accountLockout` - 5 failed attempts → 30-minute lock (SC-2)
- **Rate limiting:** 10 login attempts per IP per 15 minutes (SC-1)
- **Password hashing:** bcryptjs 3.0.3
- **Tables:** User, Session, Account, Verification (Prisma schema)
- **Client:** `@/lib/auth-client` (createAuthClient)
- **Server:** `@/lib/auth` (betterAuth config)

### Authorization (RBAC)

- **Roles:** Prisma enum (AUDITOR, AUDIT_MANAGER, CAE, CCO, CEO, AUDITEE, BOARD_OBSERVER)
- **Multi-role support:** Users have `roles Role[]` (array, not single role)
- **Permission system:** `@/lib/permissions` with granular permission checks
- **Guards:** `@/lib/guards` for declarative route/action protection
- **Session helpers:** `@/data-access/session` (getRequiredSession, getOptionalSession)

---

## UI Framework

### Radix UI (Headless Components)

All components version ^1.x or ^2.x (latest stable):

- `@radix-ui/react-accordion` 1.2.12
- `@radix-ui/react-alert-dialog` 1.1.15
- `@radix-ui/react-avatar` 1.1.11
- `@radix-ui/react-checkbox` 1.3.3
- `@radix-ui/react-dialog` 1.1.15
- `@radix-ui/react-dropdown-menu` 2.1.16
- `@radix-ui/react-label` 2.1.8
- `@radix-ui/react-popover` 1.1.15
- `@radix-ui/react-progress` 1.1.8
- `@radix-ui/react-radio-group` 1.3.8
- `@radix-ui/react-scroll-area` 1.2.10
- `@radix-ui/react-select` 2.2.6
- `@radix-ui/react-separator` 1.1.8
- `@radix-ui/react-slot` 1.2.4
- `@radix-ui/react-switch` 1.2.6
- `@radix-ui/react-tabs` 1.1.13
- `@radix-ui/react-toast` 1.2.15
- `@radix-ui/react-toggle` 1.1.10
- `@radix-ui/react-toggle-group` 1.1.11
- `@radix-ui/react-tooltip` 1.2.8

### shadcn/ui Components

Located in `src/components/ui/`, built on Radix UI + CVA:

- **Styling:** Tailwind CSS utility classes
- **Variants:** `class-variance-authority` 0.7.1 for component variants
- **Utils:** `tailwind-merge` 3.4.0 + `clsx` 2.1.1 for class merging (`cn()` helper)
- **Icons:** `lucide-react` 0.563.0

### Tailwind CSS 4.1.18

- **Config:** `tailwind.config.ts`
- **Plugin:** `tailwindcss-animate` 1.0.7 for animations
- **PostCSS:** `@tailwindcss/postcss` 4.1.18
- **Prettier integration:** `prettier-plugin-tailwindcss` 0.7.2

### Theming

- **Theme provider:** `next-themes` 0.4.6 (dark/light mode)
- **Toast notifications:** `sonner` 2.0.7 (Sonner toast library)

---

## State Management

### TanStack Query 5.90.20 (@tanstack/react-query)

- **Provider:** `@/providers/query-provider` wraps dashboard layout
- **Pattern:** Server-side initial fetch → client hydration → React Query cache
- **Usage:** Async state management for dashboard widgets, real-time updates

### Zustand 5.0.11

- **Stores:** `src/stores/` (minimal usage, prefer React Query for server state)
- **Pattern:** Client-side ephemeral state (UI toggles, modals, filters)

---

## Forms & Validation

### React Hook Form 7.71.1

- **Resolver:** `@hookform/resolvers` 5.2.2 (Zod integration)
- **Pattern:** Controlled forms with `useActionState` for server actions
- **Registration:** Direct input registration or controlled via `value`/`onChange`

### Zod 4.3.6

- **Usage:** Schema validation for server actions, env vars, form inputs
- **Location:** Action schemas in `src/actions/*/schemas.ts`
- **Env validation:** `@t3-oss/env-nextjs` 0.13.10 wraps Zod for env vars

---

## Email

### React Email 5.2.8 (dev)

- **Components:** `@react-email/components` 1.0.7
- **Templates:** `src/emails/` (React components)
- **Development:** `react-email` CLI for preview

### AWS SES (@aws-sdk/client-sesv2 3.985.0)

- **Client:** `src/lib/ses-client.ts` (SESv2 API)
- **Region:** Mumbai (ap-south-1) for RBI data localization
- **From email:** Configured via `SES_FROM_EMAIL` env var
- **Email log:** `EmailLog` Prisma model for audit trail

---

## File Storage

### AWS S3 (@aws-sdk/client-s3 3.985.0)

- **Client:** `src/lib/s3.ts` (S3 upload/download helpers)
- **Presigned URLs:** `@aws-sdk/s3-request-presigner` 3.985.0
- **Region:** Mumbai (ap-south-1) for RBI data localization
- **Bucket:** Configured via `S3_BUCKET_NAME` env var
- **Evidence:** Observation evidence files stored in S3
- **File uploads:** `react-dropzone` 14.4.0 for UI

### File Type Detection

- **Library:** `file-type` 21.3.0 (magic byte detection)
- **Usage:** Server-side validation of uploaded files

---

## Export & Reporting

### ExcelJS 4.4.0

- **Library:** `src/lib/excel-export.ts` for programmatic Excel generation
- **Templates:** `src/lib/excel-templates/` for structured exports
- **Parsers:** `src/lib/excel-parsers/` for import validation
- **API routes:** `/api/exports/findings`, `/api/exports/compliance`, `/api/exports/audit-plans`

### @react-pdf/renderer 4.3.2

- **Components:** `src/components/pdf-report/` (Board report PDF generation)
- **External package:** Added to `serverExternalPackages` in next.config.ts
- **Usage:** Server-side PDF generation for board reports

---

## Background Jobs

### pg-boss 12.9.0

- **Queue:** PostgreSQL-based job queue
- **Setup:** `src/lib/job-queue.ts`
- **Usage:** Notification batching, async email delivery
- **Instrumentation:** `src/instrumentation.ts` for Next.js lifecycle hooks

---

## Logging

### Pino 10.3.1

- **Logger:** `src/lib/logger.ts` (structured JSON logging)
- **Pretty print:** `pino-pretty` 13.1.3 (dev dependency)
- **Usage:** Server-side logging (actions, DAL functions, errors)

---

## Internationalization

### next-intl 4.8.2

- **Config:** `src/i18n/` (locale setup)
- **Plugin:** `createNextIntlPlugin()` in next.config.ts
- **Pattern:** Server-side i18n with locale detection

---

## Testing

### Playwright 1.58.2 (@playwright/test)

- **Config:** `playwright.config.ts`
- **Test dir:** `tests/`
- **Auth setup:** `tests/auth.setup.ts` (4 role storageStates)
- **Projects:** auditor, manager, cae, auditee (parallel role-based tests)
- **Scripts:**
  - `test:e2e` - Run Playwright tests
  - `test:e2e:ui` - Run with UI mode
- **Reports:** HTML report at `playwright-report/`

### Vitest 4.0.18 (Unit tests, minimal usage)

- **Config:** `vitest.config.ts`
- **UI:** `@vitest/ui` 4.0.18 (test UI)
- **Environment:** `happy-dom` 20.5.1 (DOM simulation)

---

## Data Visualization

### Recharts 3.7.0

- **Usage:** Dashboard charts (line, bar, area, pie)
- **Components:** `src/components/dashboard/` widgets

### TanStack Table 8.21.3 (@tanstack/react-table)

- **Usage:** Findings table, audit trail, compliance management
- **Pattern:** Server-side pagination, client-side sorting/filtering

---

## Date Handling

### date-fns 4.1.0

- **Usage:** Date formatting, fiscal year calculations
- **Helpers:** `src/lib/fiscal-year.ts` (Indian FY Q1-Q4 helpers)

### react-day-picker 9.13.1

- **Component:** Calendar UI (Radix Popover + DayPicker)
- **Usage:** Date inputs, date range pickers

---

## Developer Experience

### ESLint 10.0.0

- **Config:** `eslint.config.mjs` (flat config format)
- **Extends:** `eslint-config-next` 16.1.6
- **RC:** `@eslint/eslintrc` 3.3.3 for legacy support

### Prettier 3.8.1

- **Config:** `.prettierrc`
- **Plugins:** `prettier-plugin-tailwindcss` 0.7.2 (Tailwind class sorting)

### tsx 4.21.0

- **Usage:** TypeScript execution for scripts (seed, migrations)
- **Scripts:** `prisma/seed.ts`, `scripts/*.ts`

### dotenv 17.2.4 (dev)

- **Usage:** Local .env file loading for development
- **Production:** Docker secrets via environment variables

---

## Build & Runtime

### Node.js v22.22.0

- **Package manager:** pnpm 10.29.3
- **Scripts:**
  - `dev` - Next.js dev server with Turbopack
  - `build` - Production build
  - `start` - Start production server
  - `lint` - ESLint

### Docker

- **Base image:** node:22-alpine (Dockerfile)
- **Compose:** docker-compose.yml, docker-compose.prod.yml
- **Standalone:** Next.js standalone output for optimized container

---

## Security & Utilities

### server-only 0.0.1

- **Usage:** Mark server-only modules (prisma.ts, session.ts, etc.)
- **Pattern:** Import at top of file to throw error if bundled for client

### crypto (Node.js built-in)

- **Usage:** UUID generation (`randomUUID()` for Better Auth IDs)
- **Password hashing:** bcryptjs (not native crypto for portability)

### react-is 19.2.4

- **Usage:** React element type checking

---

## Development Dependencies Summary

- **@types/\*:** Type definitions for bcryptjs, node, pg, react, react-dom
- **autoprefixer** 10.4.24 - PostCSS plugin for vendor prefixes
- **postcss** 8.5.6 - CSS transformer
- **happy-dom** 20.5.1 - DOM simulation for tests

---

## Package Manager

**pnpm 10.29.3** - Fast, disk-efficient package manager

- Lock file: `pnpm-lock.yaml`
- Workspace support: Single-root project (no workspaces)

---

## Total Dependencies

- **Production:** 57
- **Development:** 23
- **Total:** 80

---

## Multi-Tenancy Architecture

### Tenant Isolation

- **Database:** Row-Level Security via `prismaForTenant()` extension
- **Session-based tenantId:** NEVER from URL/body, always from `getRequiredSession()`
- **Transaction-scoped:** `app.current_tenant_id` parameter per query

### Optimistic Locking

- **Version field:** `version Int` on Observation model
- **Pattern:** Check-and-increment on updates to prevent race conditions

---

## External Service Dependencies

### AWS Services (Mumbai Region - ap-south-1)

- **S3:** Evidence file storage
- **SES:** Transactional email delivery

### PostgreSQL 16

- **Extensions:** pgcrypto (UUIDs), pg_trgm (full-text search)
- **Connection:** Direct via `pg` driver + Prisma adapter

---

## Notable Patterns

1. **Server Actions** - `"use server"` at top of action files, never inline in components
2. **Data Access Layer** - `src/data-access/` for all Prisma queries (separation of concerns)
3. **Type Safety** - Zod for runtime validation, TypeScript for compile-time
4. **Progressive Enhancement** - Forms work without JS via native form actions
5. **Security First** - Server-only imports, RBAC guards, audit logging on all mutations
