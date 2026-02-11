# Technology Stack

**Analysis Date:** 2026-02-08
**Updated:** 2026-02-11 (post v2.0 MVP)

## Languages

**Primary:**

- TypeScript 5.9.3 - All application code (290 `.ts`/`.tsx` files in `src/`)
- Strict mode enabled (`tsconfig.json`)

**Secondary:**

- JavaScript (ESM) - Configuration files (`next.config.ts`, `tailwind.config.ts`, `postcss.config.js`)
- CSS - Tailwind v4 with `@theme inline` directive in `src/app/globals.css`
- SQL - Prisma migrations and RLS policies
- JSON - i18n message files (`messages/`), legacy demo data (`src/data/demo/`)

## Runtime

**Environment:**

- Node.js v25.6.0 (detected in development)
- Target: ES2017 (`tsconfig.json`)

**Package Manager:**

- pnpm 10.28.2
- Install command: `pnpm install`

## Frameworks

**Core:**

- Next.js 16.1.6 - App Router with React Server Components
- React 19.2.4 - Server Components + Client Components
- React DOM 19.2.4

**Database:**

- PostgreSQL - Primary database with Row-Level Security
- Prisma 7.3.0 - ORM with 23 models, generated types
- Schema: `prisma/schema.prisma` (865 lines)

**Authentication:**

- Better Auth 1.4.18 - Email/password, session management, RBAC
- Prisma adapter for PostgreSQL storage
- Rate limiting, account lockout, concurrent session limits

**Internationalization:**

- next-intl 4.8.2 - Multi-language support (en, hi, mr, gu)
- Config: `src/i18n/request.ts` with locale stored in `NEXT_LOCALE` cookie
- Message files: `messages/{en,hi,mr,gu}.json`

**Build/Dev:**

- Turbopack - Bundler (`pnpm dev` runs `next dev --turbopack`)
- TypeScript 5.9.3 - Compiler with Next.js plugin
- ESLint 10.0.0 - Linting with `next/core-web-vitals` and `next/typescript` configs
- Prettier 3.8.1 - Code formatting with `prettier-plugin-tailwindcss`

**Testing:**

- Playwright - E2E testing with role-based projects (auditor, manager, CAE, auditee)
- Config: `playwright.config.ts`
- Tests: `tests/e2e/` (observation-lifecycle, permission-guards)

## Key Dependencies

**UI Framework:**

- @radix-ui/\* (12 packages) - Headless UI primitives
- shadcn/ui pattern - Component composition (`components.json`, new-york style)
- lucide-react 0.563.0 - Icon library (via `@/lib/icons` barrel export)

**Styling:**

- Tailwind CSS 4.1.18 - Utility-first CSS framework
- @tailwindcss/postcss 4.1.18 - PostCSS plugin
- tailwindcss-animate 1.0.7 - Animation utilities
- tailwind-merge 3.4.0 - Merge utility classes
- class-variance-authority 0.7.1 - Variant API for component styles

**Data & Tables:**

- @tanstack/react-table 8.21.3 - Table state management
- @tanstack/react-query 5.90.20 - Client-side data caching
- recharts 3.7.0 - Chart library (donut charts, area charts, bar charts)

**Validation:**

- zod 4.3.6 - Schema validation for server actions and forms

**AWS Services:**

- @aws-sdk/client-s3 3.985.0 - Evidence file storage (Mumbai, SSE-S3 encryption)
- @aws-sdk/client-sesv2 3.985.0 - Email notifications (Mumbai region)

**Reports & Exports:**

- @react-pdf/renderer 4.3.2 - PDF board report generation
- exceljs 4.4.0 - Formatted XLSX exports

**Background Jobs:**

- pg-boss 12.9.0 - PostgreSQL-based job queue (reminders, digests, snapshots)

**Utilities:**

- clsx 2.1.1 - Conditional classNames
- react-is 19.2.4 - React element type checking

**Fonts:**

- next/font/google - Google Fonts loader
  - Noto Sans (Latin)
  - Noto Sans Devanagari (Hindi)
  - Noto Sans Gujarati (Gujarati)
  - DM Serif Display (headings)

## Configuration

**Environment:**

- `.env.example` - 52 environment variables documented
- Key vars: DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, AWS_REGION, S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SES_REGION, SES_FROM_EMAIL, NEXT_PUBLIC_APP_URL
- No runtime validation schema (recommended: add `@t3-oss/env-nextjs`)

**Build:**

- `next.config.ts` - Next.js config with `next-intl/plugin`, standalone output
- `tsconfig.json` - TypeScript config with `@/*` path alias to `./src/*`
- `tailwind.config.ts` - Tailwind theme with shadcn color tokens
- `postcss.config.js` - PostCSS with Tailwind and Autoprefixer
- `components.json` - shadcn/ui CLI config (new-york style)
- `eslint.config.mjs` - ESLint flat config with Next.js presets
- `.prettierrc` - Prettier config (semi: true, singleQuote: false, Tailwind plugin)
- `Dockerfile` - Multi-stage build (63 lines, node:22-alpine, standalone mode)

**Database:**

- `prisma/schema.prisma` - 23 models, enums, relations
- Scripts: `pnpm db:generate`, `pnpm db:push`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm db:studio`

**TypeScript:**

- Path aliases: `@/*` → `./src/*`
- Module resolution: `bundler`
- JSON imports enabled (`resolveJsonModule: true`)
- JSX runtime: `react-jsx`

## Platform Requirements

**Development:**

- Node.js 20+ (v25.6.0 in use)
- pnpm 9+ (v10.28.2 in use)
- PostgreSQL (Docker or local)
- Port 3000 (default Next.js dev server)

**Production:**

- Deployment: AWS Lightsail Mumbai (ap-south-1) via Coolify
- Dockerfile: Multi-stage build with health check
- Build: `pnpm build` → standalone Next.js output
- Start: `node server.js` (standalone mode)
- AWS services: S3 (evidence), SES (email) — both ap-south-1

---

_Stack analysis: 2026-02-08_
_Updated: 2026-02-11 — reflects v2.0 Working Core MVP (shipped 2026-02-10)_
