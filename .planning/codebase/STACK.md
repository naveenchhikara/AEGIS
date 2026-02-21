# Technology Stack

**Analysis Date:** 2026-02-21

## Languages

**Primary:**

- TypeScript 5.9 - Full application codebase (`src/`, `tests/`, `infra/`)
- JavaScript (Node.js) - Build scripts and configuration files

**Secondary:**

- SQL - PostgreSQL migrations and database utilities in `prisma/`
- JSON - Internationalization messages in `messages/{en,hi,mr,gu}.json`
- YAML/TOML - Docker compose and configuration management

## Runtime

**Environment:**

- Node.js 22 (alpine) - Specified in `Dockerfile` (stage: `FROM node:22-alpine`)
- Next.js 16.1.6 with App Router and Turbopack bundler
- Standalone output mode for Docker production deployments

**Package Manager:**

- pnpm (latest) - Workspace manager with frozen lockfile
- Lockfile: `pnpm-lock.yaml` (present)

## Frameworks

**Core:**

- Next.js 16.1.6 - Full-stack React meta-framework with App Router
- React 19.2.4 - UI rendering and component system
- React DOM 19.2.4 - DOM-specific React rendering

**Authentication & Session:**

- Better Auth 1.4.18 - Email/password auth, session management, account lockout
  - Adapter: `@prisma/client` via `prismaAdapter()`
  - Password hashing: bcryptjs 3.0.3
  - Plugins: multiSession (max 2 concurrent), accountLockout (5 failures → 30min lock)

**State Management:**

- Zustand 5.0.11 - Client-side state (lightweight stores)
- React Query (@tanstack/react-query) 5.90.20 - Server state, caching, synchronization
- React Table (@tanstack/react-table) 8.21.3 - Headless table component library

**Forms & Validation:**

- react-hook-form 7.71.1 - Form state and validation
- @hookform/resolvers 5.2.2 - Schema adapters for react-hook-form
- Zod 4.3.6 - Runtime schema validation and TypeScript inference

**UI & Styling:**

- shadcn/ui - Copy-paste component library (32 Radix UI primitives + custom components)
- Radix UI - Headless component primitives (accordion, dialog, dropdown, select, tabs, etc.)
- Tailwind CSS 4.1.18 - Utility-first CSS framework with native CSS variables
- tailwind-merge 3.4.0 - Smart CSS class merging for component composition
- tailwindcss-animate 1.0.7 - Animation utilities
- class-variance-authority 0.7.1 - Component variant factory for style polymorphism
- clsx 2.1.1 - Conditional classname utility
- lucide-react 0.563.0 - Icon library (imported via `@/lib/icons` barrel export)
- next-themes 0.4.6 - Dark mode support

**Internationalization:**

- next-intl 4.8.2 - Multi-language support with 4 locales (en, hi, mr, gu)
- Messages: `messages/{en,gu,hi,mr}.json`

**Charts & Visualization:**

- recharts 3.7.0 - React charting library for DAKSH scores, audit trends
- react-day-picker 9.13.1 - Date range picker component

**Data Export:**

- ExcelJS 4.4.0 - XLSX (multi-sheet) report generation
- @react-pdf/renderer 4.3.2 - PDF report rendering
- Externalized from server bundle (`serverExternalPackages`)

**File Handling:**

- react-dropzone 14.4.0 - Drag-and-drop file upload
- file-type 21.3.0 - MIME type detection (magic bytes, not extension)

**Notifications & UX:**

- sonner 2.0.7 - Toast notifications
- @radix-ui/react-toast - Toast primitive (underlying)
- react-email 5.2.8 - React-based email template rendering

**Testing:**

- Vitest 4.0.18 - Unit test framework (Jest-compatible)
- @vitest/ui 4.0.18 - Vitest UI dashboard
- happy-dom 20.5.1 - Lightweight DOM implementation for tests
- @playwright/test 1.58.2 - E2E browser automation
  - Browsers: Desktop Chrome (headless)
  - Auth setup: `tests/auth.setup.ts` with storage state files
  - Projects: auditor, manager, cae, cco (role-based)

**Build & Dev:**

- Turbopack - Next.js 16 bundler (enabled with `next dev --turbopack`)
- postcss 8.5.6 - CSS transformation
- autoprefixer 10.4.24 - Browser vendor prefixes
- @tailwindcss/postcss 4.1.18 - PostCSS Tailwind CSS v4 plugin
- typescript 5.9.3 - TypeScript compiler
- tsx 4.21.0 - TypeScript runtime and execute utility

**Code Quality:**

- ESLint 9.39.2 with next config - Linting (rules in `eslint.config.mjs`)
- Prettier 3.8.1 - Code formatter (config: `.prettierrc`)
  - prettier-plugin-tailwindcss 0.7.2 - Tailwind class sorting

## Key Dependencies

**Critical:**

- @prisma/client 7.3.0 - PostgreSQL ORM and type generation
- @prisma/adapter-pg 7.3.0 - PostgreSQL database adapter for Prisma
- pg 8.18.0 - PostgreSQL driver (used by Prisma adapter)
  - Connection pool: max 25 (configured in `src/lib/prisma.ts` for concurrent SSR)

**Database & Job Queue:**

- pg-boss 12.9.0 - PostgreSQL-backed job queue
  - Uses `DATABASE_URL` (no separate infrastructure)
  - Jobs: notifications, escalations, weekly digest, board reports, snapshot metrics
  - Retry: 3 attempts with exponential backoff
  - Scheduling: Cron expressions (IST = UTC+5:30)

**AWS SDK:**

- @aws-sdk/client-s3 3.985.0 - S3 evidence storage (Mumbai region ap-south-1)
- @aws-sdk/client-sesv2 3.985.0 - SES email sending (RBI data localization)
- @aws-sdk/s3-request-presigner 3.985.0 - Signed URL generation for evidence downloads

**Utilities:**

- @t3-oss/env-nextjs 0.13.10 - Environment variable validation (Zod-based)
- date-fns 4.1.0 - Date manipulation (uses Indian locale en-IN)
- server-only 0.0.1 - Prevents server-only code from reaching client

**Email & Logging:**

- @react-email/components 1.0.7 - Email component library
- pino 10.3.1 - Structured logging with JSON output (production) and colorized (dev)
- pino-pretty 13.1.3 - Pretty-print pino logs in development

## Configuration

**Environment:**

- Validated via `src/env.ts` using `@t3-oss/env-nextjs` + Zod
- Server-side (DATABASE*URL, BETTER_AUTH_SECRET, AWS*\*): required unless `SKIP_ENV_VALIDATION=1`
- Client-side (`NEXT_PUBLIC_*`): inlined at Next.js build time
- Critical variables:
  - `DATABASE_URL` - PostgreSQL 16 connection string
  - `BETTER_AUTH_SECRET` - Min 32 characters (hex-only, no base64 chars)
  - `BETTER_AUTH_URL` - Auth base URL (must match origin for cookies)
  - `AWS_REGION` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` - Optional (S3/SES degrade gracefully)
  - `S3_BUCKET_NAME` - Evidence storage
  - `AWS_SES_REGION` / `SES_FROM_EMAIL` - Optional in dev, required in prod
  - `NEXT_PUBLIC_APP_URL` - Client-side app URL (must be set at Docker BUILD time)

**Build:**

- `tsconfig.json` - Strict TypeScript with ESNext module
- `next.config.ts` - Next.js App Router, standalone output, Turbopack FileSystemCache disabled
- `eslint.config.mjs` - ESLint config (flat format), Next.js + TypeScript rules
- `.prettierrc` - Prettier with Tailwind class sorting
- `vitest.config.ts` - Vitest with node environment, `@/*` alias
- `playwright.config.ts` - Playwright serial execution, 30s timeout, trace on failure

## Platform Requirements

**Development:**

- Node.js 22+
- PostgreSQL 16+ (local or Docker)
- pnpm latest
- Port 3000 available (dev server)
- AWS credentials optional (S3/SES features degrade gracefully)

**Production:**

- Node.js 22+ (alpine in Docker)
- PostgreSQL 16 (managed separately or in Docker service)
- AWS ap-south-1 (Mumbai) for RBI data localization
- Environment: Docker container on VPS or managed hosting
- Port 3000 exposed behind reverse proxy (Nginx with SSL)
- Health check: `GET /api/health` (30s interval, 40s start period)

**Database:**

- PostgreSQL 16
- Extensions: `pgcrypto`, `pg_trgm`
- Schema: Prisma 7 (63 models, 16 enums, 1,999 lines)
- Migrations: Standalone SQL migrations in `prisma/migrations/` + manual SQL in `prisma/*.sql`
- Views: 4 PostgreSQL views/functions (dashboard aggregations) applied manually post-deploy
- Seed: `prisma/seed.ts` (10 users, 2 tenants, 39 examination areas, 568 items, RAM parameters)

---

_Stack analysis: 2026-02-21_
