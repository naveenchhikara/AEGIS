# Codebase Concerns

**Analysis Date:** 2026-02-08
**Updated:** 2026-02-11 (post v2.0 MVP)

## Tech Debt

**~~No Authentication System~~ — RESOLVED in v2.0 (Phase 5)**

- Better Auth with email/password, session cookies, rate limiting (10/15min), account lockout (5 failures → 30min), max 2 concurrent sessions
- 7 roles: Auditor, Audit Manager, CAE, CCO, CEO, Auditee, Admin
- Files: `src/lib/auth.ts`, `src/lib/auth-client.ts`

**~~Hardcoded Demo Data with Type Casting Workarounds~~ — RESOLVED in v2.0 (Phase 5)**

- PostgreSQL with Prisma ORM (23 models, 865-line schema)
- Server actions in `src/actions/` (15 files) replace static JSON imports
- Type safety enforced via Prisma-generated types
- Legacy demo data in `src/data/demo/` still exists but is no longer used by the app at runtime

**Large Translated JSON Duplication (REMAINING):**

- Issue: Demo data duplicated 4x for each locale (en/hi/mr/gu) still committed to git (~648KB). Now unused at runtime since v2.0 reads from database.
- Files: `src/data/demo/hi/*`, `src/data/demo/mr/*`, `src/data/demo/gu/*`
- Impact: Git repo bloat only — no runtime impact. Could be removed in cleanup.
- Fix approach: Delete locale-specific demo data directories. Keep `src/data/demo/` only for seed scripts if needed.

**Tailwind CSS v4 CSS Variable Issues (REMAINING):**

- Issue: Tailwind v4 does not auto-wrap CSS variables in `var()` for arbitrary values. `w-[--sidebar-width]` compiles to invalid CSS.
- Files: Documented in `MEMORY.md`, affects shadcn/ui sidebar spacer pattern
- Impact: Requires `w-[var(--sidebar-width)]` workaround everywhere. Known issue, manageable.
- Fix approach: Monitor Tailwind CSS updates for improved CSS variable handling.

**Oversized shadcn/ui Sidebar Component (REMAINING):**

- Issue: Single file with 781 lines, 20+ component definitions.
- Files: `src/components/ui/sidebar.tsx`
- Impact: Hard to navigate. This is upstream shadcn/ui code — splitting risks diverging from upstream updates.
- Fix approach: Accept as-is (standard shadcn/ui pattern) or split if sidebar needs heavy customization.

**No Environment Variable Validation (REMAINING):**

- Issue: 52 environment variables documented in `.env.example` but no runtime validation schema. Invalid or missing vars fail silently at runtime.
- Files: `.env.example` (52 vars including DATABASE_URL, BETTER_AUTH_SECRET, AWS keys)
- Impact: Deployment failures difficult to diagnose. Missing AWS credentials cause runtime errors instead of startup errors.
- Fix approach: Add `@t3-oss/env-nextjs` with zod schema for all required vars. Fail fast on startup.

## Known Bugs

**Radix UI Hydration Warnings (REMAINING):**

- Symptoms: React hydration mismatch warnings in console during development.
- Files: Workaround applied in `src/app/layout.tsx` with `suppressHydrationWarning`
- Workaround: `suppressHydrationWarning` on `<html>` tag. Cosmetic only, no functional impact.

**Turbopack Cache Corruption (REMAINING):**

- Symptoms: Dev server shows stale content after file changes.
- Workaround: Delete `.next/` directory and restart `pnpm dev`.

**Recharts Center Overlay Pointer Blocking (REMAINING):**

- Symptoms: Tooltips on donut charts don't trigger when hovering near center.
- Workaround: `pointer-events-none` on center text container. Applied.

## Security Considerations

**~~No Input Validation or Sanitization~~ — RESOLVED in v2.0**

- Zod v4.3.6 used for server action input validation
- Server actions validate all inputs before database operations
- Files: `src/actions/*/schemas.ts`, individual action files with zod schemas

**~~No CSRF Protection~~ — RESOLVED in v2.0**

- All mutations use Next.js server actions (built-in CSRF protection)
- Session cookies: httpOnly, sameSite=lax, secure in production
- Files: `src/lib/auth.ts` (cookie config)

**~~Sensitive Data Exposure Risk~~ — RESOLVED in v2.0**

- PostgreSQL Row-Level Security enforces tenant isolation at database level
- Append-only audit log tracks all data-modifying actions (AuditLog model)
- RBAC enforces role-based data access
- Files: `prisma/schema.prisma` (RLS policies), `src/lib/auth.ts` (session management)

**No Environment Variable Validation (REMAINING — see Tech Debt section above)**

**No Middleware for Route Protection (NEW):**

- Risk: No `src/middleware.ts` file detected. Route protection relies on server-side session checks in individual pages/actions rather than centralized middleware.
- Impact: Each page must individually verify authentication. Missing a check on a new page could expose unauthenticated access.
- Recommendation: Add Next.js middleware for centralized auth gate on all `(dashboard)` routes.

## Performance Bottlenecks

**~~Large JSON Imports on Every Page Load~~ — RESOLVED in v2.0**

- Data now fetched from PostgreSQL via Prisma in server components
- React Server Components stream data without client-side JSON bloat

**No Pagination on Tables (PARTIALLY RESOLVED):**

- Server-side: Prisma supports `skip`/`take` for pagination
- Client-side: TanStack Table pagination may not be enabled on all views yet
- Impact: Performance fine for typical UCB data volumes (hundreds of observations). May need attention at 1000+ records.

**~~Synchronous Locale Data Loading~~ — RESOLVED in v2.0**

- Database queries replace synchronous JSON imports
- i18n UI labels still loaded from message files (lightweight, ~20KB per locale)

**All Routes Dynamically Rendered (REMAINING):**

- Cookie-based locale detection still forces dynamic rendering
- Mitigated: With database backend, all routes are dynamic anyway (user session, tenant data)
- Impact: Acceptable for authenticated SaaS app. Static optimization not applicable for personalized content.

## Fragile Areas

**Report Generation with Hardcoded Calculations (REMAINING):**

- Files: `src/lib/report-utils.ts`, `src/components/pdf-report/board-report.tsx`
- Why fragile: Complex business logic with hardcoded RBI regulatory thresholds. Now generates actual PDF via React-PDF with embedded charts.
- Test coverage: E2E tests cover report generation flow but not individual calculation correctness
- Recommendation: Add unit tests for regulatory threshold calculations before pilot deployment

**TanStack Table Column Definitions (REDUCED RISK):**

- Now backed by Prisma-generated types instead of raw JSON shapes
- TypeScript compiler catches column/field mismatches at build time
- Test coverage: E2E tests cover observation lifecycle and permission guards

**~~Multi-locale Data Loading~~ — RESOLVED in v2.0**

- No longer loads locale-specific JSON data files
- Database stores data in original language; UI labels come from message files

**Internationalization Setup (REMAINING):**

- Cookie-based locale detection unchanged
- Impact: Lower risk now — app is dynamic anyway due to auth/database
- Test coverage: Not specifically tested in E2E suite

## Scaling Limits

**~~Static JSON Data Storage~~ — RESOLVED in v2.0**

- PostgreSQL with 23 models, connection pooling via Prisma
- Prisma schema supports all CRUD operations, audit logging, evidence storage

**~~Single-Tenant Demo Data~~ — RESOLVED in v2.0**

- Multi-tenant with PostgreSQL RLS (Row-Level Security)
- Tenant isolation enforced at database level — even application bugs can't leak cross-tenant data
- Onboarding wizard provisions new tenants with 5-step flow

**No Caching Strategy (PARTIALLY RESOLVED):**

- React Query (TanStack Query v5.90) added for client-side data caching
- Server-side: No Redis or explicit cache layer yet
- Impact: Acceptable for pilot scale (single-digit tenants). May need Redis for 50+ concurrent users.

**Client-Side Bundle Size (REMAINING):**

- Additional dependencies added in v2.0: React-PDF, ExcelJS, AWS SDK, pg-boss
- Mitigation: React-PDF runs server-side in API route. ExcelJS used in server actions only.
- Recommendation: Run bundle analyzer before pilot to verify client-side impact

## Dependencies at Risk

**Tailwind CSS v4 (REMAINING — Early Adopter Risk):**

- Using v4.1.18. CSS variable workarounds documented and manageable.

**Next.js 16 (REMAINING — stabilized with usage):**

- v2.0 built successfully on Next.js 16. Standalone output mode works with Dockerfile.
- Turbopack issues limited to development (cache corruption workaround known).

**React 19 (REMAINING — stabilized with usage):**

- Radix UI hydration warnings persist but are cosmetic only.

**Better Auth v1.4.18 (NEW — monitor):**

- Relatively new auth library. Plugin ecosystem still maturing.
- Known gap: accountLockout plugin hook workaround needed (documented in PROJECT.md D24)
- Mitigation: Core auth flow is battle-tested. Lock-in is low — standard session/cookie patterns.

## Missing Critical Features

**~~No Database Layer~~ — RESOLVED in v2.0** (PostgreSQL + Prisma, 23 models)

**~~No Authentication/Authorization~~ — RESOLVED in v2.0** (Better Auth + RBAC, 7 roles)

**~~No API Layer~~ — RESOLVED in v2.0** (Server actions for all mutations, API routes for reports)

**~~No Audit Logging~~ — RESOLVED in v2.0** (Append-only AuditLog, immutable, CAE searchable)

**~~No File Upload/Storage~~ — RESOLVED in v2.0** (S3 Mumbai, Evidence model, drag-and-drop UI)

**~~No Email Notifications~~ — RESOLVED in v2.0** (SES Mumbai, 6 templates, pg-boss queue, digest batching)

**~~No Export to Excel~~ — RESOLVED in v2.0** (ExcelJS with formatted XLSX, role-scoped exports)

**No Real-time Collaboration (REMAINING — Low Priority):**

- No websockets or SSE. Intentional — out of scope per PROJECT.md.
- Impact: Acceptable for UCB audit workflows (structured lifecycle, not collaborative editing).

**No CI/CD Pipeline (NEW — needed for pilot):**

- No `.github/workflows/` directory
- Dockerfile exists (multi-stage, standalone mode) but no automated build/deploy
- Impact: Manual deployments only. Acceptable for early pilot, needed before scaling.

**TOTP/MFA (NEW — needed before Pilot B):**

- Email/password only. MFA deferred per requirements.
- Impact: Acceptable for Pilot A (sandbox). Required before Pilot B (real bank data).

## Test Coverage Gaps

**~~Zero Test Files~~ — RESOLVED in v2.0 (Phase 14)**

- Playwright E2E configured with 4 role-based test projects
- 2 test specs: `observation-lifecycle.spec.ts`, `permission-guards.spec.ts`
- Auth setup project with persistent session storage

**~~No Test Framework Configured~~ — RESOLVED in v2.0**

- Playwright configured (`playwright.config.ts`)
- Test scripts: `pnpm test:e2e`, `pnpm test:e2e:ui`

**Critical Untested Logic (PARTIALLY RESOLVED):**

- Report generation calculations still lack unit tests
- E2E tests cover observation lifecycle and permission guards but not calculation correctness
- Recommendation: Add Vitest unit tests for `report-utils.ts` regulatory thresholds

**Untested i18n Implementation (REMAINING):**

- Locale switching, cookie handling, fallback logic not covered by E2E suite
- Lower risk: UI labels work; data comes from database (not locale-specific JSON)

**No Unit Test Framework (REMAINING):**

- Vitest installed but no unit test files in `src/`
- Only E2E tests via Playwright
- Recommendation: Add Vitest config and unit tests for critical business logic before pilot

---

_Concerns audit: 2026-02-08_
_Updated: 2026-02-11 — reflects v2.0 Working Core MVP (shipped 2026-02-10)_
