# Technology Stack

**Analysis Date:** 2026-02-20

## Languages

**Primary:**

- TypeScript 5.9 - All application code (`src/`, `prisma/`, `tests/`, `infra/`)

**Secondary:**

- SQL - Prisma migrations (`prisma/migrations/`) and manual views (`prisma/*.sql`)
- JSON - i18n message files (`messages/en.json`, `messages/hi.json`, `messages/mr.json`, `messages/gu.json`)

## Runtime

**Environment:**

- Node.js (no `.nvmrc` present; targets ES2017 per `tsconfig.json`)

**Package Manager:**

- pnpm (lockfile: `pnpm-lock.yaml` present)

## Frameworks

**Core:**

- Next.js 16.1.6 - Full-stack App Router framework with Turbopack dev server
  - Config: `next.config.ts`
  - Output: `standalone` (production/Docker), undefined (CI)
  - Server Actions body limit: 5MB
  - `serverExternalPackages`: `@react-pdf/renderer`, `pg-boss`, `exceljs`
- React 19.2.4 - UI rendering
- next-intl 4.8.2 - Internationalization (4 locales: en, hi, mr, gu)
  - Config: via `createNextIntlPlugin()` in `next.config.ts`
  - Message files: `messages/{en,hi,mr,gu}.json`

**UI Component Library:**

- shadcn/ui "new-york" style variant (config: `components.json`)
- Radix UI - Headless primitives for all interactive components
  - 18 packages: accordion, alert-dialog, avatar, checkbox, dialog, dropdown-menu, label, popover, progress, radio-group, scroll-area, select, separator, slot, switch, tabs, toast, toggle, toggle-group, tooltip
- Tailwind CSS 4.1.18 - Utility CSS with native CSS variables
  - Config: `tailwind.config.ts`, PostCSS: `postcss.config.js`
  - Plugin: `prettier-plugin-tailwindcss` for class sorting
  - Note: Use `w-[var(--sidebar-width)]` NOT `w-[--sidebar-width]` in v4

**ORM / Database:**

- Prisma 7.3.0 - Schema, migrations, generated client
  - Config: `prisma.config.ts`, Schema: `prisma/schema.prisma`
  - Generated client output: `src/generated/prisma/`
  - PostgreSQL adapter: `@prisma/adapter-pg` 7.3.0

**Authentication:**

- better-auth 1.4.18 - Email/password auth with Prisma adapter
  - Config: `src/lib/auth.ts`
  - Plugins: `multiSession` (max 2 concurrent), custom `accountLockout`

**State Management:**

- Zustand 5.0.11 - Client-side global state (`src/stores/`)
- TanStack React Query 5.90.20 - Server state / data fetching

**Forms:**

- react-hook-form 7.71.1 - Form management
- @hookform/resolvers 5.2.2 - Zod resolver integration
- Zod 4.3.6 - Schema validation; use `zodResolver(Schema as any)` for RHF compatibility

**Data Visualization:**

- recharts 3.7.0 - Charts (donut, bar, line)
  - Note: Add `pointer-events-none` to center overlay text to avoid blocking tooltips

**Tables:**

- @tanstack/react-table 8.21.3 - Headless table logic

**Testing:**

- Playwright 1.58.2 - E2E tests (`tests/e2e/`, config: `playwright.config.ts`)
  - 4 user role projects: auditor, manager, cae, auditee
  - Auth storageState files: `playwright/.auth/*.json`
- Vitest 4.0.18 - Unit tests (`src/lib/__tests__/`, config: `vitest.config.ts`)
  - Environment: `node` (not happy-dom for unit tests)
  - happy-dom 20.5.1 installed but env set to node in config

**Build/Dev:**

- Turbopack - Dev server (`pnpm dev` = `next dev --turbopack`)
  - Cache disabled for filesystem: `turbopackFileSystemCacheForDev: false`
- tsx 4.21.0 - TypeScript script runner for seed scripts
- ESLint 9.39.2 with `eslint-config-next` (config: `eslint.config.mjs`)
- Prettier 3.8.1 - Formatting (config: `.prettierrc`)

## Key Dependencies

**Critical:**

- `pg` 8.18.0 - PostgreSQL driver (used directly by Prisma adapter and pg-boss)
- `pg-boss` 12.9.0 - PostgreSQL-backed job queue (uses same `DATABASE_URL`)
  - Registered via `src/instrumentation.ts` on server boot
  - Jobs in `src/jobs/`: deadline-reminder, notification-processor, weekly-digest, overdue-escalation, snapshot-metrics
- `@t3-oss/env-nextjs` 0.13.10 - Build-time env var validation via Zod
  - Config: `src/env.ts` — imported by `next.config.ts` for build-time check
  - Skip with `SKIP_ENV_VALIDATION=1` for Docker builds
- `bcryptjs` 3.0.3 - Password hashing (Better Auth compatible)
- `server-only` - Marks modules as server-only to prevent client bundle leakage

**Reports & Exports:**

- `exceljs` 4.4.0 - XLSX multi-tab report generation (`src/lib/excel-export.ts`)
- `@react-pdf/renderer` 4.3.2 - PDF report generation
- `@react-email/components` 1.0.7 - React Email component library
- `react-email` 5.2.8 - Email preview dev tooling

**Utilities:**

- `date-fns` 4.1.0 - Date manipulation
- `lucide-react` 0.563.0 - Icon library (ALWAYS import via `@/lib/icons` barrel, not directly)
- `next-themes` 0.4.6 - Dark/light theme switching
- `sonner` 2.0.7 - Toast notifications
- `class-variance-authority` 0.7.1 + `clsx` 2.1.1 + `tailwind-merge` 3.4.0 - Class utilities
- `react-day-picker` 9.13.1 - Date picker
- `react-dropzone` 14.4.0 - File upload UI
- `file-type` 21.3.0 - Magic-byte file type validation
- `pino` 10.3.1 + `pino-pretty` 13.1.3 - Structured logging

**Infrastructure:**

- `@aws-sdk/client-s3` 3.985.0 - S3 evidence storage (ap-south-1 hardcoded in `src/lib/s3.ts`)
- `@aws-sdk/client-sesv2` 3.985.0 - SES email sending
- `@aws-sdk/s3-request-presigner` 3.985.0 - Presigned S3 URLs (5-minute expiry)

## Configuration

**Environment Validation:**

- Centralized in `src/env.ts` using `@t3-oss/env-nextjs` + Zod
- Required server vars: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`
- Optional server vars: `AWS_SES_REGION`, `SES_FROM_EMAIL` (email sending)
- Required client var: `NEXT_PUBLIC_APP_URL`
- Docker builds: Set `SKIP_ENV_VALIDATION=1` to bypass at build time
- Empty strings treated as undefined (catches misconfiguration)

**Build:**

- `next.config.ts` - Next.js config, imports `src/env.ts` for build-time validation
- `tsconfig.json` - TypeScript strict mode, `@/*` alias to `./src/*`, target ES2017
- `postcss.config.js` - PostCSS with `@tailwindcss/postcss`
- `tailwind.config.ts` - Tailwind v4 config

## Platform Requirements

**Development:**

- Node.js runtime with pnpm
- PostgreSQL 16 database
- AWS credentials for S3 (or mock/dev bucket)
- Turbopack dev server on port 3000

**Production:**

- Ubuntu VPS, 4 vCPU 16GB RAM
- PostgreSQL 16 local on VPS
- Node.js standalone output (Next.js)
- systemd service (`aegis.service`) + Nginx reverse proxy
- AWS ap-south-1 (Mumbai) — mandatory for RBI data localization compliance
- SSL via Certbot (valid till 2026-05-18)
- Docker support available: `Dockerfile`, `docker-compose.yml`, `docker-compose.prod.yml`

---

_Stack analysis: 2026-02-20_
