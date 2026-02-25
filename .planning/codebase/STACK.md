# Technology Stack

**Analysis Date:** 2026-02-25

## Languages

**Primary:**

- TypeScript 5.9 - All application code (`src/`, `prisma/`, config files)

**Secondary:**

- SQL - PostgreSQL views, triggers, manual migrations (`prisma/*.sql`)
- CSS - Tailwind CSS v4 with native CSS variables

## Runtime

**Environment:**

- Node.js (targeting Node 18+ for standalone Docker output)
- Edge runtime for `src/middleware.ts` only

**Package Manager:**

- pnpm (version from `pnpm-lock.yaml`)
- Lockfile: present (`pnpm-lock.yaml`)

## Frameworks

**Core:**

- Next.js 16.1.6 - Full-stack React framework with App Router
  - Turbopack enabled for development (`next dev --turbopack`)
  - Standalone output for Docker production deploys
  - Server Actions with 5MB body size limit
- React 19.2.4 - UI rendering
- next-intl 4.8.3 - Internationalization with 4 locales (en, hi, mr, gu)

**UI Component System:**

- shadcn/ui "new-york" variant - Component library (see `components.json`)
- Radix UI - Headless primitives (accordion, dialog, dropdown, select, tabs, toast, tooltip, etc.)
- Tailwind CSS 4.2.0 - Utility-first styling with CSS-native variable system
- tailwindcss-animate 1.0.7 - Animation utilities
- class-variance-authority 0.7.1 - Variant management
- tailwind-merge 3.4.0 - Conditional class merging
- lucide-react 0.563.0 - Icons (ALWAYS import via `@/lib/icons` barrel, not directly)

**Data & Forms:**

- Prisma 7.4.1 ORM with `@prisma/adapter-pg` PostgreSQL adapter
- react-hook-form 7.71.2 - Form state management
- @hookform/resolvers 5.2.2 - Zod resolver integration
- Zod 4.3.6 - Schema validation (use `zodResolver(Schema as any)` for RHF compat)
- @tanstack/react-query 5.90.20 - Server state / async data
- @tanstack/react-table 8.21.3 - Table state management
- zustand 5.0.11 - Client-side global state

**Charts & Reports:**

- recharts 3.7.0 - Data visualization (charts, dashboards)
- exceljs 4.4.0 - XLSX multi-tab report generation (server-external bundle)
- @react-pdf/renderer 4.3.2 - PDF report generation (server-external bundle)

**Testing:**

- Playwright 1.58.2 - E2E tests in `tests/e2e/`
- Vitest 4.0.18 - Unit tests in `src/lib/__tests__/`
- @vitest/coverage-v8 4.0.18 - Coverage reports
- happy-dom 20.5.1 - DOM environment for unit tests

**Build/Dev:**

- tsx 4.21.0 - TypeScript script execution (seed scripts, migrations)
- @next/bundle-analyzer 16.1.6 - Bundle size analysis (`ANALYZE=true pnpm build:analyze`)
- dotenv 17.3.1 - Env loading for scripts
- pino-pretty 13.1.3 - Dev log formatting
- react-email 5.2.8 - Email template previews

## Key Dependencies

**Critical:**

- `better-auth` 1.4.18 - Authentication engine; session DB-backed via Prisma adapter; RBAC with 17 roles
- `pg` 8.18.0 - Raw PostgreSQL driver; used by Prisma adapter and pg-boss
- `pg-boss` 12.9.0 - PostgreSQL-backed job queue for background jobs (reminders, escalation, email digest); server-externalized
- `@t3-oss/env-nextjs` 0.13.10 - Build-time environment variable validation via Zod (`src/env.ts`)
- `bcryptjs` 3.0.3 - Password hashing for authentication
- `pino` 10.3.1 - Structured logging (JSON in production)
- `@sentry/nextjs` 10.39.0 - Error tracking (optional; degrades gracefully)

**Infrastructure:**

- `@aws-sdk/client-s3` 3.985.0 - S3 file storage client
- `@aws-sdk/client-sesv2` 3.985.0 - SES email sending client
- `@aws-sdk/s3-request-presigner` 3.985.0 - Pre-signed URL generation
- `@react-email/components` 1.0.8 - Email template components
- `date-fns` 4.1.0 - Date manipulation
- `file-type` 21.3.0 - MIME type detection for uploads
- `react-dropzone` 14.4.0 - File upload UI
- `sonner` 2.0.7 - Toast notifications
- `next-themes` 0.4.6 - Light/dark theme support
- `react-day-picker` 9.13.1 - Date picker component
- `server-only` 0.0.1 - Ensures server modules never run on client

## Configuration

**Environment:**

- Validated at build time via `src/env.ts` using `@t3-oss/env-nextjs` + Zod
- Set `SKIP_ENV_VALIDATION=1` for Docker builds without secrets at build time
- `NEXT_PUBLIC_*` vars must be set at Docker BUILD time (Next.js inlines at build, not runtime)
- `BETTER_AUTH_SECRET` must be hex-only (no `+`, `=`, `\` — base64 breaks JSON parsing)
- Required: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`
- Optional (degrade gracefully): AWS S3, AWS SES, Sentry

**Build:**

- `next.config.ts` - Next.js config with Sentry, next-intl, bundle analyzer wrappers
- `tsconfig.json` - TypeScript config; `@/*` maps to `./src/*`
- `tailwind.config.ts` - Tailwind configuration
- `postcss.config.js` - PostCSS with `@tailwindcss/postcss`
- `eslint.config.mjs` - ESLint with next config
- `vitest.config.ts` - Vitest unit test config
- `playwright.config.ts` - Playwright E2E config
- `prisma.config.ts` - Prisma config
- `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` - Sentry initialization per runtime

**Server Bundle Externalization:**

These packages are excluded from Next.js server bundle (native modules or too large):

- `@react-pdf/renderer`, `pg-boss`, `exceljs`

## Platform Requirements

**Development:**

- pnpm installed globally
- PostgreSQL 16 running locally or via Docker
- Node.js compatible with Next.js 16 (18+)
- Turbopack dev server on port 3000

**Production:**

- Docker multi-stage build (Dockerfile, docker-compose.prod.yml)
- Node.js standalone output served via systemd (`aegis.service`)
- PostgreSQL 16 (local on VPS or container)
- Nginx reverse proxy with SSL (Certbot)
- AWS Mumbai region (ap-south-1) for RBI data localization compliance

---

_Stack analysis: 2026-02-25_
