# Technology Stack

**Analysis Date:** 2026-02-22

## Languages

**Primary:**

- TypeScript 5.9 - All application code (`.ts`, `.tsx`), type-safe development with strict mode enabled
- JavaScript - Build tooling, configuration files
- SQL - Database views, triggers, and standalone migrations in `prisma/migrations/`

**Secondary:**

- JSX/TSX - React components and Next.js pages (React 19.2)
- Bash - Deployment scripts in `deploy/` and utility scripts in `scripts/`

## Runtime

**Environment:**

- Node.js 22.x (Alpine) - Specified in `Dockerfile` (node:22-alpine)
- No `.nvmrc` file present; version locked to Node 22 in Docker

**Package Manager:**

- pnpm (latest, version controlled via corepack)
- Lock file: `pnpm-lock.yaml` (committed, frozen installs via `--frozen-lockfile`)

## Frameworks

**Core:**

- Next.js 16.1.6 - Full-stack framework with App Router, Turbopack dev server, server actions
- React 19.2.4 - UI component library with React Server Components (RSC) support

**Styling & UI:**

- Tailwind CSS 4.1.18 - Utility-first CSS with native CSS variables
- shadcn/ui - Headless component library (30+ components)
- Radix UI 1.2+ - Primitive components (accordion, dialog, popover, select, tabs, toggle, tooltip, etc.)
- Lucide React 0.563 - Icon library (imported via `@/lib/icons` barrel export)
- Recharts 3.7.0 - Chart library for KPI widgets (pie, radial bar, area, line charts)
- Sonner 2.0.7 - Toast notifications

**Forms & Validation:**

- react-hook-form 7.71.1 - Form state management
- @hookform/resolvers 5.2.2 - Integration with validation schemas
- Zod 4.3.6 - TypeScript-first schema validation (with `zodResolver(Schema as any)` pattern)
- @t3-oss/env-nextjs 0.13.10 - Environment variable validation at build time

**Testing:**

- Playwright 1.58.2 - End-to-end testing (E2E)
- Vitest 4.0.18 - Unit test runner (node environment, happy-dom)
- @vitest/coverage-v8 4.0.18 - Code coverage reporting
- @playwright/test 1.58.2 - E2E test framework

**Build & Dev:**

- Turbopack - Dev server bundler (enabled via `next dev --turbopack`)
- ESLint 9.39.2 - Code linting (Next.js core-web-vitals + TypeScript rules)
- Prettier 3.8.1 - Code formatting with prettier-plugin-tailwindcss
- @next/bundle-analyzer 16.1.6 - Bundle size analysis (enabled via ANALYZE=true)

**ORM & Database:**

- Prisma 7.3.0 - Database ORM
- @prisma/adapter-pg 7.3.0 - PostgreSQL adapter for Prisma
- Prisma Client (generated to `src/generated/prisma/`)

## Key Dependencies

**Critical:**

- better-auth 1.4.18 - Authentication (email/password, session management, RBAC)
- @aws-sdk/client-s3 3.985.0 - S3 file storage (evidence upload)
- @aws-sdk/client-sesv2 3.985.0 - Email sending (AWS SES)
- @aws-sdk/s3-request-presigner 3.985.0 - Pre-signed S3 URLs
- pg 8.18.0 - PostgreSQL client (used by pg-boss job queue)
- pg-boss 12.9.0 - PostgreSQL-backed job queue for background jobs

**State Management:**

- zustand 5.0.11 - Client state store (with persist middleware)
- @tanstack/react-query 5.90.20 - Server state management, caching, SSR support
- @tanstack/react-table 8.21.3 - Headless table library

**Utilities:**

- date-fns 4.1.0 - Date manipulation (Indian locale en-IN)
- next-intl 4.8.2 - Internationalization (4 locales: en, hi, mr, gu)
- next-themes 0.4.6 - Dark mode theme support
- clsx 2.1.1 - Class name utilities
- tailwind-merge 3.4.0 - Merge Tailwind CSS classes without conflicts
- class-variance-authority 0.7.1 - Variant management for components

**File Operations:**

- exceljs 4.4.0 - Excel (XLSX) file generation (externalized from server bundle)
- @react-pdf/renderer 4.3.2 - PDF generation from React components (externalized from server bundle)
- react-dropzone 14.4.0 - File upload handling
- file-type 21.3.0 - Validate file types via magic bytes

**Email & Notifications:**

- @react-email/components 1.0.7 - React email template components
- react-email 5.2.8 - Email template development framework

**Logging & Monitoring:**

- pino 10.3.1 - Structured JSON logger
- pino-pretty 13.1.3 - Pretty-printed logs in development
- @sentry/nextjs 10.39.0 - Error tracking and performance monitoring

**Authentication & Security:**

- bcryptjs 3.0.3 - Password hashing (used by better-auth)
- server-only 0.0.1 - Ensure server-only modules don't leak to client

## Configuration

**Environment:**

- `.env.example` - Template with all required and optional variables
- `src/env.ts` - Centralized Zod schema for environment variable validation
- Validation runs at build time via `next.config.ts`
- `SKIP_ENV_VALIDATION=1` bypasses validation for Docker builds without secrets

**Build:**

- `next.config.ts` - Next.js configuration (CSP headers, Sentry, bundle analyzer, serverExternalPackages)
- `tsconfig.json` - TypeScript strict mode, path alias `@/*` → `./src/*`
- `.prettierrc` - Prettier config (semi: true, singleQuote: false, tailwindcss plugin)
- `eslint.config.mjs` - ESLint flat config (Next.js core-web-vitals + TypeScript)
- `components.json` - shadcn/ui configuration (new-york style variant, Tailwind CSS v4)

**Testing:**

- `vitest.config.ts` - Unit test config (node environment, coverage for `src/lib/**` and `src/services/**`)
- `playwright.config.ts` - E2E test config (serial execution, 4 user roles, storage state auth)

## Platform Requirements

**Development:**

- Node.js 22.x or compatible
- pnpm (latest)
- PostgreSQL 16+ for local database (Docker Compose recommended)
- Port 3000 available for dev server

**Production:**

- Node.js 22.x Alpine runtime (Docker container)
- PostgreSQL 16+ (local on VPS or managed service)
- AWS region: ap-south-1 (Mumbai) for RBI data localization
  - S3 bucket for evidence storage
  - SES for email notifications
- Nginx reverse proxy with SSL (Certbot for Let's Encrypt)
- systemd service manager or Docker orchestration

---

_Stack analysis: 2026-02-22_
