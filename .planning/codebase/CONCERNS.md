# Codebase Concerns

**Analysis Date:** 2026-02-08

## Tech Debt

**No Authentication System:**

- Issue: Login form accepts any email without validation and redirects to dashboard. No session management, no token validation, no user context beyond hardcoded CEO.
- Files: `src/components/auth/login-form.tsx` (lines 22-28), `src/lib/current-user.ts`
- Impact: Cannot deploy to production. All users see same data (Apex Sahakari Bank CEO view). No multi-tenancy, no role-based access control.
- Fix approach: Implement NextAuth.js or Supabase Auth with JWT sessions. Add middleware to protect routes. Create user context provider. Add tenant_id to all data queries.

**Hardcoded Demo Data with Type Casting Workarounds:**

- Issue: All data comes from static JSON files. Every file uses `as unknown as Type` or `as any` type assertions to bypass TypeScript strict mode. 45+ instances across codebase.
- Files: Every page in `src/app/(dashboard)/*/page.tsx`, `src/lib/get-locale-data.ts` (33 casts), `src/lib/report-utils.ts`, `src/components/compliance/compliance-table.tsx` (line 42 uses `as any`)
- Impact: No real data persistence. Type safety completely bypassed. Cannot add/edit/delete findings or compliance requirements. Summary counts in JSON files must be manually kept in sync with array data.
- Fix approach: Replace with PostgreSQL + Prisma ORM. Remove all type casts. Add server actions for CRUD operations. Implement optimistic updates for client components.

**Large Translated JSON Duplication:**

- Issue: Demo data duplicated 4x for each locale (en/hi/mr/gu). 144KB for Gujarati, 208KB for Hindi, 156KB for Marathi copies of same data. Findings JSON has 1409 lines × 4 locales.
- Files: `src/data/demo/hi/*`, `src/data/demo/mr/*`, `src/data/demo/gu/*`
- Impact: 648KB of redundant demo data committed to git. Any data change requires editing 4 files. Plan 04-02b (demo data translations) was skipped but localized copies still exist from earlier work.
- Fix approach: Store only English data in database. Move translations to i18n message files. Use translation keys for field labels, not field values.

**Tailwind CSS v4 CSS Variable Issues:**

- Issue: Tailwind v4 does not auto-wrap CSS variables in `var()` for arbitrary values. `w-[--sidebar-width]` compiles to invalid `width: --sidebar-width`. Requires verbose `w-[var(--sidebar-width)]` everywhere.
- Files: Documented in `MEMORY.md`, affects shadcn/ui sidebar spacer pattern
- Impact: Easy to write invalid CSS with arbitrary values. Sidebar layout required workarounds. May break future shadcn/ui component additions.
- Fix approach: Wait for Tailwind CSS v4.2+ with improved CSS variable handling, or downgrade to Tailwind v3 stable branch.

**Oversized shadcn/ui Sidebar Component:**

- Issue: Single file with 781 lines, 20+ component definitions, massive barrel export block. Violates single responsibility principle.
- Files: `src/components/ui/sidebar.tsx`
- Impact: Hard to navigate and modify. High merge conflict risk. Difficult to tree-shake unused sidebar sub-components.
- Fix approach: Split into `sidebar/index.tsx`, `sidebar/provider.tsx`, `sidebar/menu.tsx`, `sidebar/group.tsx`, `sidebar/button.tsx`, `sidebar/rail.tsx`. Use barrel export from index.

**Missing i18n for Demo Data Fields:**

- Issue: Demo data contains English text in observation/rootCause/recommendation fields. Localized copies (`hi/*.json`, `mr/*.json`, `gu/*.json`) duplicate this English content instead of translating it.
- Files: `src/data/demo/findings.json` (1409 lines), localized copies in `hi/mr/gu/` subdirectories
- Impact: UI is translated but all findings/compliance requirement descriptions remain in English for non-English locales. Defeats purpose of multi-language support.
- Fix approach: Move all user-facing text to database. Use separate translation table with locale column. Or use translation keys in demo data that map to message files.

## Known Bugs

**Radix UI Hydration Warnings:**

- Symptoms: React hydration mismatch warnings in console during development. Caused by Radix UI components rendering differently on server vs client.
- Files: Workaround applied in `src/app/layout.tsx` (line 57) with `suppressHydrationWarning`
- Trigger: Any page load with Radix UI components (Dialog, Sheet, Dropdown, Select, etc.)
- Workaround: `suppressHydrationWarning` on `<html>` tag suppresses warnings but doesn't fix root cause.

**Turbopack Cache Corruption:**

- Symptoms: Dev server shows stale content after file changes. Pages don't reflect latest code edits.
- Files: `.next/` directory (generated)
- Trigger: Rapid file changes, interrupted builds, or unclean dev server shutdown
- Workaround: Delete `.next/` directory and restart `pnpm dev`. Documented in `CLAUDE.md` gotchas.

**Recharts Center Overlay Pointer Blocking:**

- Symptoms: Tooltips on donut charts don't trigger when hovering near center. Center text overlays block pointer events.
- Files: `src/components/dashboard/audit-coverage-chart.tsx` (line 74 has `pointer-events-none` workaround)
- Trigger: Hover over donut chart segments when center text is present
- Workaround: Add `pointer-events-none` to center text container. Applied in audit coverage chart.

## Security Considerations

**No Environment Variable Validation:**

- Risk: No `.env` file in project. No environment variable usage detected in codebase. Future AWS/database credentials will be added without validation schema.
- Files: No `.env` file exists, no `process.env` usage in `src/`
- Current mitigation: None - demo data only
- Recommendations: Add `zod` schema for env validation. Create `.env.example` template. Use `@t3-oss/env-nextjs` for type-safe env vars. Document required vars in deployment guide.

**No Input Validation or Sanitization:**

- Risk: All components render data directly from JSON imports. No validation on form inputs (login form only checks for truthy email). Future user input will need validation.
- Files: `src/components/auth/login-form.tsx` (no validation), all table components render raw data
- Current mitigation: Static demo data is pre-validated
- Recommendations: Add `zod` schemas for all data types. Use React Hook Form with resolver for client-side validation. Add server-side validation in API routes/server actions.

**No CSRF Protection:**

- Risk: No forms currently submit data, but future mutations will need CSRF tokens. Next.js doesn't provide CSRF protection out of the box.
- Files: N/A - no mutations yet
- Current mitigation: None needed for static prototype
- Recommendations: Use Next.js server actions (built-in CSRF protection) or add `next-csrf` package for API routes. Set SameSite=Strict on session cookies.

**Sensitive Data Exposure Risk:**

- Risk: Demo data contains realistic bank details (branch addresses, staff emails, audit findings). If real data is added without sanitization, could expose sensitive audit information.
- Files: `src/data/demo/bank-profile.json`, `src/data/demo/staff.json`, `src/data/demo/findings.json`
- Current mitigation: Apex Sahakari Bank is fictional
- Recommendations: Add row-level security policies when implementing database. Implement audit logging for all data access. Add data masking for non-admin users.

## Performance Bottlenecks

**Large JSON Imports on Every Page Load:**

- Problem: All pages import entire demo data sets synchronously. Findings JSON is 76KB, compliance requirements 36KB. Multiplied by 4 locales = 648KB loaded on every route.
- Files: `src/data/index.ts` (barrel export), all page components
- Cause: Static imports of large JSON files, no code splitting or lazy loading
- Improvement path: Move to database with pagination. Implement incremental static regeneration (ISR) for data-heavy pages. Use React Server Components with streaming for large tables.

**No Pagination on Tables:**

- Problem: FindingsTable renders all 35 findings at once. ComplianceTable renders all 55 requirements. With real data (1000+ findings), will cause performance issues.
- Files: `src/components/findings/findings-table.tsx` (398 lines), `src/components/compliance/compliance-table.tsx` (297 lines)
- Cause: TanStack Table configured without pagination. Demo data is small enough to render all rows.
- Improvement path: Enable TanStack Table pagination. Add server-side pagination with Prisma `skip`/`take`. Implement virtual scrolling for very large datasets.

**Synchronous Locale Data Loading:**

- Problem: `getLocaleData()` function synchronously imports all 7 demo data files for current locale on every page render. No caching between requests.
- Files: `src/lib/get-locale-data.ts` (76 lines with 33 type casts)
- Cause: Cookie-based locale detection makes root layout dynamic, forcing all pages to render on server with fresh data imports
- Improvement path: Cache locale data in React context or server-side cache. Use `unstable_cache` from Next.js for server-side caching. Consider URL-based locale (`/en/dashboard`) instead of cookies for better static optimization.

**All Routes Dynamically Rendered:**

- Problem: Cookie-based locale detection in root layout forces all pages to be server-rendered on every request. No static optimization, no Edge runtime.
- Files: `src/i18n/request.ts` (reads NEXT_LOCALE cookie), `src/app/layout.tsx` (async locale detection)
- Cause: `cookies()` call in root layout makes entire app dynamic
- Improvement path: Switch to URL-based i18n routing (`/en/*`, `/hi/*`). Enable static export for locale-specific routes. Use middleware for locale detection/redirect instead of layout.

## Fragile Areas

**Report Generation with Hardcoded Calculations:**

- Files: `src/lib/report-utils.ts` (421 lines)
- Why fragile: Complex business logic spread across 10+ functions with hardcoded thresholds, manual data aggregations, and no unit tests. Functions like `generateRecommendations()` use nested conditionals based on magic numbers (e.g., CRAR < 9% triggers "critical" priority).
- Safe modification: Extract constants to separate file. Add JSDoc with business rule explanations. Create unit tests before refactoring. Document RBI regulatory thresholds.
- Test coverage: Zero - no test files exist

**TanStack Table Column Definitions:**

- Files: `src/components/findings/findings-table.tsx` (398 lines with 7 sortable columns), `src/components/compliance/compliance-table.tsx` (297 lines)
- Why fragile: Column definitions tightly coupled to JSON data structure. Any change to demo data field names breaks table rendering. Sorting/filtering logic embedded in column config.
- Safe modification: Keep demo data structure stable. Add TypeScript strict checks on column accessors. Test sorting on all columns after data changes. Consider schema validation on JSON imports.
- Test coverage: None

**Multi-locale Data Loading:**

- Files: `src/lib/get-locale-data.ts` (76 lines, 33 type casts)
- Why fragile: Assumes all 4 locale directories have identical file structure. If one locale is missing a JSON file, entire app crashes. No fallback to English.
- Safe modification: Add try-catch around locale imports. Implement fallback to English data if locale file missing. Validate locale data structure matches English schema on build.
- Test coverage: None

**Internationalization Setup:**

- Files: `src/i18n/request.ts`, `src/app/layout.tsx`, all translated components
- Why fragile: Cookie-based locale detection makes entire app dynamic. If NEXT_LOCALE cookie is malformed or contains unsupported locale, falls back to English silently. Root layout async locale detection prevents static optimization.
- Safe modification: Add locale validation middleware. Log locale fallbacks for monitoring. Consider URL-based routing for better static optimization. Test all 4 locales on every page.
- Test coverage: None

## Scaling Limits

**Static JSON Data Storage:**

- Current capacity: ~3200 lines of demo data (35 findings, 55 compliance requirements, 8 audit plans)
- Limit: Cannot add more data without committing to git. No way to add findings from UI. Multi-user scenarios impossible.
- Scaling path: Migrate to PostgreSQL database. Implement connection pooling for high concurrency. Use read replicas for reporting queries. Partition findings table by year for >100k records.

**Single-Tenant Demo Data:**

- Current capacity: 1 bank (Apex Sahakari Bank) hardcoded
- Limit: Cannot support multiple UCBs without code changes. All users see same data.
- Scaling path: Add `tenant_id` to all database tables. Implement tenant resolution middleware. Use row-level security (RLS) in PostgreSQL. Create tenant provisioning flow.

**No Caching Strategy:**

- Current capacity: Full page re-render on every request with synchronous JSON imports
- Limit: Will not scale beyond 10 concurrent users once database is added
- Scaling path: Implement React Query for client-side caching. Use Next.js `unstable_cache` for server components. Add Redis for session and frequently accessed data. Enable Edge caching for static assets.

**Client-Side Bundle Size:**

- Current capacity: Initial JS bundle includes all UI components, Recharts, TanStack Table, Radix UI primitives
- Limit: 781-line sidebar component, 390-line chart component, all loaded on first paint
- Scaling path: Code split large components with `next/dynamic`. Lazy load Recharts and TanStack Table. Use bundle analyzer to identify large dependencies. Consider lighter alternatives (recharts → nivo, @tanstack/table → basic table for simple views).

## Dependencies at Risk

**Tailwind CSS v4 (Early Adopter Risk):**

- Risk: Using Tailwind v4.1.18 which is relatively new (released Jan 2025). CSS variable handling issues with arbitrary values. Breaking changes likely in v4.2+.
- Impact: May need to rewrite custom CSS or stay pinned to v4.1.x. shadcn/ui components may not fully support v4 edge cases.
- Migration plan: Monitor Tailwind v4 changelog for CSS variable improvements. Consider downgrade to Tailwind v3.4.x (stable) if v4 issues persist. Budget 2-3 days for migration if needed.

**Next.js 16 (Bleeding Edge):**

- Risk: Using Next.js 16.1.6 which is very recent (Jan 2025). Turbopack cache corruption issues mentioned in docs. React 19 requirement.
- Impact: May encounter undiscovered bugs. Community resources focused on Next.js 14/15. Turbopack is still marked experimental.
- Migration plan: Stay on 16.x for App Router improvements. If stability issues, downgrade to Next.js 15.x LTS. Turbopack is optional - can use Webpack instead.

**React 19 (Latest):**

- Risk: Using React 19.2.4. Breaking changes in useEffect timing, new server component rules, concurrent rendering changes.
- Impact: Radix UI hydration warnings may be related to React 19 changes. Some third-party components not yet React 19 compatible.
- Migration plan: No downgrade planned - React 19 required for Next.js 16. Monitor Radix UI for React 19 compatibility updates.

## Missing Critical Features

**No Database Layer:**

- Problem: All data in static JSON files. Cannot persist user changes.
- Blocks: Any create/update/delete operations, multi-user scenarios, production deployment, audit trail logging
- Priority: High

**No Authentication/Authorization:**

- Problem: Login form is cosmetic. No session management, no protected routes, no RBAC.
- Blocks: Production deployment, multi-user support, compliance with RBI security requirements
- Priority: High

**No API Layer:**

- Problem: No REST API or GraphQL endpoint. Frontend directly imports JSON files.
- Blocks: Mobile app development, third-party integrations, webhook support
- Priority: Medium

**No Audit Logging:**

- Problem: No tracking of who viewed/modified findings or compliance data.
- Blocks: RBI regulatory requirement for audit trails on all audit data access
- Priority: High (regulatory requirement)

**No File Upload/Storage:**

- Problem: Cannot attach evidence documents to findings (screenshots, scanned documents, reports).
- Blocks: Complete audit workflow - RBI expects documentary evidence for all findings
- Priority: High

**No Email Notifications:**

- Problem: Cannot notify auditees when findings are assigned or when deadlines approach.
- Blocks: Workflow automation, timely remediation tracking
- Priority: Medium

**No Export to Excel:**

- Problem: Print button only generates PDF-styled HTML print. UCBs need Excel exports for RBI submission.
- Blocks: RBI compliance reporting workflow (they require Excel format for some returns)
- Priority: Medium

**No Real-time Collaboration:**

- Problem: No websockets or server-sent events. Multiple auditors cannot see each other's changes in real-time.
- Blocks: Team collaboration during concurrent audits
- Priority: Low (nice-to-have)

## Test Coverage Gaps

**Zero Test Files:**

- What's not tested: Everything. No unit tests, integration tests, or e2e tests exist in codebase.
- Files: No test files found in `src/` directory
- Risk: Any refactoring could introduce regressions without detection. Complex business logic in `report-utils.ts` has no verification.
- Priority: High

**Critical Untested Logic:**

- What's not tested: Report generation calculations (`report-utils.ts` 421 lines with regulatory threshold checks, compliance scoring, recommendation prioritization)
- Files: `src/lib/report-utils.ts`
- Risk: Incorrect CRAR thresholds or NPA calculations could lead to wrong regulatory assessments. RBI audit compliance at risk.
- Priority: Critical

**Untested i18n Implementation:**

- What's not tested: Locale switching, cookie handling, fallback logic, message loading for 4 locales
- Files: `src/i18n/request.ts`, `src/lib/get-locale-data.ts`, all translated components
- Risk: Missing translations could crash pages for Hindi/Marathi/Gujarati users. Locale detection failures would show wrong language.
- Priority: High

**Untested TanStack Table Logic:**

- What's not tested: Sorting, filtering, column rendering for findings and compliance tables
- Files: `src/components/findings/findings-table.tsx`, `src/components/compliance/compliance-table.tsx`
- Risk: Incorrect sorting could hide critical findings. Filter logic bugs could show wrong compliance status.
- Priority: Medium

**No Test Framework Configured:**

- What's not tested: No Jest, Vitest, or Playwright configuration exists
- Files: No test configs found
- Risk: High barrier to adding tests. No CI pipeline verification possible.
- Priority: High

---

_Concerns audit: 2026-02-08_
