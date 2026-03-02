# Technology Stack

**Analysis Date:** 2026-03-02

## Languages

**Primary:**

- TypeScript 5.9 - Full application (frontend + backend)
- JSX/TSX - React components (`src/components/`, `src/app/`)

**Secondary:**

- JavaScript (CommonJS) - Config files (`tailwind.config.ts`, `eslint.config.mjs`, `next.config.ts`)
- SQL - PostgreSQL schema and migrations (`prisma/schema.prisma`, `prisma/*.sql`)
- Python - Optional utility scripts in `scripts/`

## Runtime

**Environment:**

- Node.js 22-alpine - Production Docker image
- Next.js 16.1.6 - Full-stack framework with App Router
- Turbopack - Dev server bundler (`pnpm dev --turbopack`)

**Package Manager:**

- pnpm (corepack enabled in Dockerfile)
- Lock file: `pnpm-lock.yaml` (present)

## Frameworks

**Core:**

- Next.js 16.1.6 - Full-stack React framework with App Router + Turbopack
- React 19.2.4 - UI framework

**UI & Components:**

- shadcn/ui - Component library (new-york style variant via `components.json`)
- Radix UI (15+ packages) - Headless UI primitives (`@radix-ui/react-*`)
- Tailwind CSS 4.2.0 - Utility-first CSS with native CSS variables
- Lucide React 0.563.0 - Icon library (always imported from `@/lib/icons` barrel export)

**Forms & Validation:**

- react-hook-form 7.71.2 - Form state management
- @hookform/resolvers 5.2.2 - React Hook Form validation adapters
- Zod 4.3.6 - Schema validation library

**Data Fetching & State:**

- @tanstack/react-query 5.90.20 - Server state management
- @tanstack/react-table 8.21.3 - Advanced table component logic
- Zustand 5.0.11 - Client state management
- next-intl 4.8.3 - Internationalization (4 locales: en, hi, mr, gu)

**UI Elements & Utils:**

- sonner 2.0.7 - Toast notifications
- react-day-picker 9.13.1 - Calendar/date picker
- date-fns 4.1.0 - Date utilities
- clsx 2.1.1 - Conditional className helper
- tailwind-merge 3.4.0 - Merge Tailwind classes without conflicts
- tailwindcss-animate 1.0.7 - Tailwind animation plugin
- recharts 3.7.0 - React charting library

**Reports & Export:**

- exceljs 4.4.0 - XLSX generation (externalized from server bundle)
- @react-pdf/renderer 4.3.2 - PDF generation (externalized from server bundle)
- @react-email/components 1.0.8 - Email template components
- react-email 5.2.8 - Email rendering framework

**File Handling:**

- react-dropzone 14.4.0 - File drag-and-drop component
- file-type 21.3.0 - Magic-byte file type detection

**Testing:**

- Playwright 1.58.2 - E2E testing framework
  - Config: `playwright.config.ts`
  - Tests: `tests/e2e/`
  - Storage state for role-based auth: `playwright/.auth/`
- Vitest 4.0.18 - Unit testing (Node environment)
  - Config: `vitest.config.ts`
  - Coverage provider: v8
  - Test glob: `src/**/__tests__/**/*.test.ts`
- happy-dom 20.5.1 - DOM implementation for Vitest
- @vitest/coverage-v8 4.0.18 - Coverage reporting
- @vitest/ui 4.0.18 - UI for test results

**Build & Dev:**

- Turbopack - Next.js dev server bundler (enabled via `pnpm dev --turbopack`)
- ESLint 9.39.2 - Linting (flat config: `eslint.config.mjs`)
- Prettier 3.8.1 - Code formatter with `prettier-plugin-tailwindcss`
- PostCSS 8.5.6 - CSS processing (with `@tailwindcss/postcss` and autoprefixer)

**Code Generation:**

- Prisma 7.4.1 - ORM + schema generation
  - Adapter: `@prisma/adapter-pg` 7.4.1 (PostgreSQL native)
  - Client output: `src/generated/prisma/`

**Other:**

- next-themes 0.4.6 - Dark mode provider
- class-variance-authority 0.7.1 - Component variant pattern
- bcryptjs 3.0.3 - Password hashing (compatible with Better Auth)
- server-only 0.0.1 - Ensure server-only code doesn't leak to client
- tsx 4.21.0 - TypeScript execution (seed scripts, utilities)

## Key Dependencies

**Critical:**

- `@prisma/client` 7.3.0, `@prisma/adapter-pg` 7.4.1 - ORM for PostgreSQL 16 with 71 models, 20 enums
- `better-auth` 1.4.18 - Email/password auth with Prisma adapter, rate limiting, account lockout, multi-session support
- `pg` 8.18.0 - PostgreSQL driver (used by pg-boss)
- `pg-boss` 12.9.0 - Job queue using PostgreSQL (no external infrastructure)

**Authentication & Security:**

- `bcryptjs` 3.0.3 - Password hashing (used by Better Auth)
- `better-auth` 1.4.18 plugins:
  - `multiSession` - Max 2 concurrent sessions per user
  - Custom `accountLockout` - 5 failures → 30-min lock
  - Built-in rate limiting - 10 login attempts per 15 min per IP

**Infrastructure:**

- `@aws-sdk/client-s3` 3.985.0 - S3 evidence storage (Mumbai region ap-south-1)
- `@aws-sdk/s3-request-presigner` 3.985.0 - Presigned URLs for S3 uploads/downloads
- `@aws-sdk/client-sesv2` 3.985.0 - SES email sending (Mumbai region ap-south-1)
- `@sentry/nextjs` 10.39.0 - Error tracking (server + client, conditional on SENTRY_DSN)

**Logging:**

- `pino` 10.3.1 - Structured JSON logging (production) + pretty console logging (dev)
- `pino-pretty` 13.1.3 - Pretty-print formatter for development

**Environment & Config:**

- `@t3-oss/env-nextjs` 0.13.10 - Build-time environment variable validation with Zod
- `dotenv` 17.3.1 - Load .env files

**TypeScript Support:**

- `@types/react` 19.2.14, `@types/react-dom` 19.2.3
- `@types/node` 25.3.0
- `@types/pg` 8.16.0
- `@types/bcryptjs` 3.0.0

## Configuration

**Environment:**

- Build-time validation: `src/env.ts` (Zod + @t3-oss/env-nextjs)
- Variables location: `.env` (development), `/docker/aegis/.env` (production Docker)
- Key variables:
  - `DATABASE_URL` - PostgreSQL connection string
  - `BETTER_AUTH_SECRET` - 32+ chars, hex-only
  - `BETTER_AUTH_URL` - Auth base URL
  - `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` - AWS credentials
  - `S3_BUCKET_NAME` - Evidence bucket
  - `AWS_SES_REGION`, `SES_FROM_EMAIL` - Email config
  - `NEXT_PUBLIC_APP_URL` - Client-side app URL
  - `SENTRY_DSN` - Optional error tracking
  - `NODE_ENV` - development/test/production
  - `SKIP_ENV_VALIDATION` - Skip validation in Docker builds

**Build:**

- Config files:
  - `next.config.ts` - Next.js config with Sentry, bundle analyzer, security headers, server external packages
  - `tailwind.config.ts` - Tailwind CSS v4 with CSS variables and theming
  - `postcss.config.js` - PostCSS with @tailwindcss/postcss and autoprefixer
  - `eslint.config.mjs` - Flat ESLint config (Next.js + TypeScript)
  - `tsconfig.json` - TypeScript with `@/*` path alias
  - `vitest.config.ts` - Vitest with node environment and coverage
  - `playwright.config.ts` - Playwright with role-based auth projects
  - `.prettierrc` - Prettier with Tailwind CSS plugin
  - `.nvmrc` - Not present (Node version managed by corepack)

**Code Style:**

- Prettier enforced
- Tailwind CSS v4 with native CSS variable theme (`hsl(var(--primary))`)
- Path alias: `@/*` → `./src/*`
- Icons always from `@/lib/icons` (lucide-react barrel export)
- Forms use `react-hook-form` + `Zod` with `zodResolver`
- Tailwind plugin order: `prettier-plugin-tailwindcss` (sorts classes)

## Docker

**Multi-stage build** (`Dockerfile`):

1. **deps** - Install dependencies with pnpm
2. **builder** - Generate Prisma client, build Next.js (with `SKIP_ENV_VALIDATION=1`)
3. **runner** - Minimal Node.js 22-alpine with standalone output

**Environment during build:**

- `NODE_ENV=production`
- `NEXT_TELEMETRY_DISABLED=1`
- `SKIP_ENV_VALIDATION=1`
- `NEXT_PUBLIC_APP_URL` - ARG (default: `https://aegis.nexlyadvisory.com`)

**Health check:**

```
GET http://localhost:3000/api/health
```

**Port:** 3000

## Platform Requirements

**Development:**

- Node.js 22+ (corepack for pnpm)
- PostgreSQL 16
- pnpm as package manager
- Port 3000 available

**Production:**

- Docker daemon (or Dockge container manager)
- PostgreSQL 16 in Docker container
- AWS region: ap-south-1 (Mumbai) for RBI data localization
- S3 bucket for evidence storage
- SES verified domain for email (if email enabled)
- Sentry project (if error tracking enabled)

---

_Stack analysis: 2026-03-02_
