# Codebase Concerns

**Analysis Date:** 2026-03-02

## Tech Debt

### Deprecated Demo Data Still Exported

- **Issue:** JSON demo data (bank-profile, staff, branches, findings, etc.) is exported from `src/data/index.ts` with DEPRECATED comments, but prototype views still depend on it
- **Files:** `src/data/index.ts` (lines 16-24), `src/data/seed/` directory
- **Impact:** Blocks cleanup of seed directory; creates dual-source truth (JSON + DB); confuses new developers about data source
- **Fix approach:**
  1. Audit which pages still import from `src/data` (likely demo/prototype pages)
  2. Migrate remaining pages to database-backed DAL functions
  3. Remove JSON exports from barrel export and mark directory for deletion
  4. Add Phase for "Retire demo data exports"

### Schema Gap: sourceActionPointId Missing

- **Issue:** Observation model lacks `sourceActionPointId` field to link promoted findings back to originating ActionPoints
- **Files:** `src/data-access/rbia-findings.ts` (line 77 TODO comment), `prisma/schema.prisma`
- **Impact:** Promote-to-observation workflow cannot track source ActionPoint; breaks traceability requirement
- **Fix approach:**
  1. Add `sourceActionPointId String?` field to Observation model in schema
  2. Update Prisma migration and apply with `prisma db push`
  3. Update DAL query to populate this field when promoting ActionPoints
  4. Verify in Phase 20+ once schema gap is closed

### Hardcoded BM Response Deadline (15 Days)

- **Issue:** BM response deadline is hardcoded to 15 days in `src/actions/rbia/freeze.ts` line 300
- **Files:** `src/actions/rbia/freeze.ts` (TODO Phase 23), schema missing `tenant.settings.bmResponseDeadlineDays`
- **Impact:** Tenants cannot customize response deadline; RBI policy may require bank-specific timelines
- **Fix approach:**
  1. Add `bmResponseDeadlineDays Int` field to TenantSettings model (or create settings extension)
  2. Create Phase 23 settings UI to configure deadline
  3. Replace hardcoded `15` with `await getTenantSettings(tenantId).bmResponseDeadlineDays`
  4. Validate deadline is between 7-30 days

### Period Selector Not Wired in RBIA Analytics

- **Issue:** RBIA Analytics page uses TODO placeholder for period filtering; DAL function `getRbiaAnalyticsByPeriod()` exists but UI is not wired
- **Files:** `src/app/(dashboard)/analytics/page.tsx` (line 122 TODO), `scoreImprovement={null}` hardcoded at line 132
- **Impact:** Users cannot filter analytics by date range; score improvement metrics not computed
- **Fix approach:**
  1. Add state for period selection (startDate, endDate) to analytics page
  2. Wire Select dropdown to pass dates to `getRbiaAnalyticsByPeriod()`
  3. Implement `scoreImprovement` computation from consecutive period comparison
  4. Add to Phase 23 or 24 TODO list

### Manual Deposit Data Input (Not DB-Sourced)

- **Issue:** `src/lib/investment-compliance.ts` line 111 TODO — integrates with HousekeepingMetric but missing direct deposit data source
- **Files:** `src/lib/investment-compliance.ts` (line 111), housekeeping MIS fallback
- **Impact:** Deposit compliance checks may use stale or manual data; not real-time from core banking
- **Fix approach:**
  1. Determine deposit data source: CBS export, core banking API, or HousekeepingMetric table
  2. Create dedicated `depositData` table or use existing `InvestmentRecord` schema
  3. Replace fallback logic with direct source query
  4. Add to future phase (likely bank data integration phase)

### Fiscal Year Hardcoded (April-March)

- **Issue:** `src/actions/settings.ts` notes that Fiscal Year is hardcoded to April-March (Indian FY), not configurable
- **Files:** `src/actions/settings.ts` comment, `enum Quarter` in schema (Q1_APR_JUN, Q2_JUL_SEP, etc.)
- **Impact:** Non-Indian banks or banks with different fiscal years cannot be supported; schema tightly coupled to India
- **Fix approach:**
  1. If multi-country support planned: add `fiscalYearStartMonth` to TenantSettings
  2. Create fiscal year utility functions parametrized by tenant FY
  3. Refactor Quarter enum to use months (MONTH_01, etc.) or timestamp-based approach
  4. Migrate all FY logic to use `getTenantFiscalYear(tenantId)`
  5. Priority: LOW (v1 is India-only per CLAUDE.md)

## Known Bugs

### Stale Turbopack Cache Causing Page Rendering Issues

- **Symptoms:** Dashboard pages show old component content; CSS changes don't reflect
- **Files:** Next.js `.next/` build cache (dev server only)
- **Trigger:** Prolonged Turbopack build sessions; cache corruption after hot reload failures
- **Workaround:** Delete `.next/` directory and restart `pnpm dev`
- **Prevention:** Consider pre-commit hook to clean Turbopack cache before commits

### PostgreSQL Views Not Applied After Fresh Deploy

- **Symptoms:** Dashboard KPIs show NaN or missing data; SQL errors on `v_compliance_summary`, `v_observation_severity`
- **Files:** `prisma/migrations/20260209_dashboard_views.sql` (not tracked in Prisma migrations)
- **Trigger:** Fresh database setup; `prisma db push` does not apply standalone SQL files
- **Workaround:** Manually run SQL from migration files in order after `prisma db push`:
  ```bash
  psql -d aegis_db < prisma/migrations/add_rls_policies.sql
  psql -d aegis_db < prisma/migrations/20260209_dashboard_views.sql
  ```
- **Fix approach:**
  1. Create Prisma managed migrations for all views (migration.sql + metadata.json)
  2. Or document post-deploy SQL scripts in deployment checklist
  3. Add healthcheck query to verify views exist before app starts
  4. Priority: HIGH (blocks production deployment automation)

### SES Sandbox Mode Restricts Email Delivery

- **Symptoms:** Emails sent to unverified recipients fail silently; compliance notifications not delivered
- **Files:** `src/lib/ses.ts`, environment configuration, AWS SES settings
- **Trigger:** Production SES account not yet granted production access
- **Current Mitigation:** Email sending made optional in `src/env.ts`; staging/demo uses console logs
- **Fix approach:**
  1. AWS SES production access request → requires AWS support ticket
  2. Once granted, remove email sender restrictions from env validation
  3. Implement email queue retry logic (pg-boss job) for transient failures
  4. Add monitoring/alerting for bounces and complaints
  5. Priority: MEDIUM (blocking production email notifications)

### Seed Data Mismatch: Local vs Production

- **Symptoms:** Local dev database has comprehensive seed (10 users, 2 tenants, 39 exam areas); production may have minimal seed
- **Files:** `prisma/seed.ts` (1,690 lines), production seed script
- **Impact:** Development features may not work in production with minimal seed data
- **Fix approach:**
  1. Document expected seed state for production (minimal vs comprehensive)
  2. Create separate seed scripts: `seed-minimal.ts`, `seed-comprehensive.ts`
  3. Add seed verification query (e.g., "At least 20 ExaminationItems should exist")
  4. Add to deployment runbook

## Security Considerations

### Type Assertions Bypass TypeScript Safety

- **Risk:** 184+ occurrences of `as any`, `as any]`, `@ts-ignore` scattered across codebase
- **Files:** `src/actions/rbia/freeze.ts`, `src/components/examination-questions/`, `src/data-access/loan-account.ts`, etc.
- **Current Mitigation:** Code review and testing catch most logical errors
- **Recommendations:**
  1. Audit each `as any` to understand why type safety was bypassed
  2. For legitimate cases (e.g., Zod resolver), extract to typed helper function
  3. For unfinished types, complete the type definition instead of asserting
  4. Add pre-commit hook to flag `as any` (fail-soft, warn only)
  5. Priority: MEDIUM (prevents future regressions; addresses code quality)

### Tenant Isolation is Application-Level, Not Database-Level

- **Risk:** No PostgreSQL Row-Level Security (RLS) policies enforce tenant boundaries at DB layer
- **Files:** `src/data-access/` (47 files), ALL query functions depend on WHERE clauses
- **Current Mitigation:**
  - DAL functions use `prismaForTenant(tenantId)` singleton + WHERE clauses
  - `getRequiredSession()` ensures tenantId comes from authenticated session only
  - Unit test `src/data-access/__tests__/tenant-isolation.test.ts` verifies patterns
- **Risks:**
  1. Bug in single DAL function WHERE clause exposes all tenant data
  2. No database-level protection if application layer bypassed (e.g., raw SQL)
  3. Session hijacking leads to immediate cross-tenant access
- **Recommendations:**
  1. Implement PostgreSQL RLS policies on 10 tenant-scoped tables (already prepared in migrations)
  2. After RLS: Test that direct DB access (psql, Prisma raw queries) enforces isolation
  3. Add `POLICY` assertions to schema: `@db.Policy("tenant_isolation")`
  4. Document: "RLS is defense-in-depth; application isolation is primary control"
  5. Priority: MEDIUM (high-value security improvement for production)

### NEXT_PUBLIC Environment Variables Inlined at Build Time

- **Risk:** `NEXT_PUBLIC_APP_URL` and any other `NEXT_PUBLIC_*` vars are hardcoded into the build artifact at Docker build time
- **Files:** `Dockerfile` (lines 28-31), `src/env.ts`, any file importing `process.env.NEXT_PUBLIC_*`
- **Current Mitigation:** Dockerfile uses `ARG NEXT_PUBLIC_APP_URL` with production default; deploy scripts pass correct URL
- **Risks:**
  1. If Docker image built with staging URL but deployed to production, app will still call staging
  2. Runtime env vars (e.g., Docker `--env-file`) have NO effect on `NEXT_PUBLIC_*` values
  3. Developers may assume runtime env injection works (it doesn't for NEXT_PUBLIC)
- **Recommendations:**
  1. Document in CLAUDE.md: "NEXT*PUBLIC*\* are build-time only; change Dockerfile ARG or rebuild"
  2. For multi-environment deployments: Use separate Docker images per environment (recommended)
  3. Or: Use non-public vars + client-side config API for runtime settings
  4. Add healthcheck to verify `NEXT_PUBLIC_APP_URL` matches actual deployment URL
  5. Priority: MEDIUM (has already caused confusion; add clear docs)

### Type Casting in Authentication Routes

- **Risk:** Session user properties accessed unsafely (e.g., `(session.user as any).tenantName`, `tenantId not in session`)
- **Files:** Multiple app routes, data-access functions
- **Current Mitigation:** `getRequiredSession()` enforces session existence; `tenantId` always from session
- **Recommendations:**
  1. Extend session type to include `tenantId`, `tenantName`, `roles` (already in session)
  2. Use typed session object instead of `as any` casts
  3. Add session validation at page level (already done in dashboard layout)

## Performance Bottlenecks

### Large Components Missing Pagination

- **Problem:** Table components render all rows without pagination; can cause performance issues with 100+ items
- **Files:**
  - `src/app/(dashboard)/findings/page.tsx` (line 106 TODO: Add pagination)
  - `src/app/(dashboard)/audit-execution/page.tsx` (line 92 TODO: Add pagination)
  - `src/components/rbia/findings-list.tsx` (681 lines, may load all findings)
  - `src/components/governance/committee-panel.tsx` (987 lines, large component)
- **Impact:** Slow page loads with 200+ findings; browser memory exhaustion; poor UX
- **Improvement path:**
  1. Add pagination UI (Page size: 20, 50, 100)
  2. Refactor components to accept `page`, `pageSize` props
  3. Update DAL to support `skip/take` parameters
  4. Add React Query caching for paginated results
  5. Priority: MEDIUM (affects UX at scale; 100+ findings per engagement)

### Dashboard Query Parallelism at Limit

- **Problem:** Dashboard SSR fires 10-15 parallel DB queries (confirmed in code comment); pool max is 25
- **Files:** `src/lib/prisma.ts`, `src/data-access/dashboard.ts` (1,160 lines)
- **Cause:** Dashboard aggregates data from 10+ tables (observations, compliance items, audit trails, etc.)
- **Impact:** With 4+ concurrent users, pool exhaustion may cause query timeouts
- **Improvement path:**
  1. Measure actual query count via pg_stat_statements
  2. Consider GraphQL data loader or query batching middleware
  3. Add materialized view for dashboard metrics (daily refresh)
  4. Implement query result caching (Redis or in-memory with TTL)
  5. Monitor connection pool usage in production
  6. Priority: MEDIUM (scales with user count; risk increases at 10+ concurrent users)

### Concurrent Audit Template Query Loads 2,000 Records

- **Problem:** `src/data-access/concurrent-audit.ts` has `take: 2000` without filtering for actual engagement
- **Files:** `src/data-access/concurrent-audit.ts` (line ~147)
- **Impact:** Memory spike when comparing to RBIA observations; full scan on every audit comparison
- **Fix approach:**
  1. Refactor to load per-engagement observations, not all observations
  2. Add engagement-level WHERE clause before `take: 2000`
  3. Implement lazy loading for comparison UI
  4. Priority: MEDIUM-HIGH (direct performance impact)

### Large Generated Type Files Not Optimized

- **Problem:** Prisma-generated client files are massive: 26K lines for Tenant model alone
- **Files:** `src/generated/prisma/` (all model files)
- **Impact:** Slower TypeScript compilation; larger bundle size (though only server-side)
- **Fix approach:** No action needed (Prisma generates these automatically); acceptable trade-off

## Fragile Areas

### RBIA Examination Tree Component (1,156 lines)

- **Files:** `src/components/rbia/rbia-examination-tree.tsx`
- **Why Fragile:**
  - Large monolithic component combining tree rendering, state management, and event handling
  - Deep nesting of conditional logic for collapsed/expanded states
  - Multiple responsibilities: scoring computation, UI rendering, form state
  - Likely uses `as any` type casts for complex node structures
- **Safe Modification:**
  1. Extract node rendering logic to separate `ExaminationNodeRow` component
  2. Move scoring logic to separate hook (`useExaminationScoring`)
  3. Add unit tests for score computation before refactoring
  4. Test coverage: Expand/collapse, score updates, drill-down navigation
- **Test Coverage Gaps:** Unknown (no test file found)

### PDF Report Generation (1,366 lines)

- **Files:** `src/components/pdf-report/rbia-report-document.tsx`
- **Why Fragile:**
  - Long component with heavy JSX/React PDF rendering
  - Likely has hardcoded page breaks, fonts, widths
  - Changes to observation data schema require manual PDF layout updates
  - No e2e tests for PDF generation
- **Safe Modification:**
  1. Extract report sections into separate components (ReportHeader, FindingSection, etc.)
  2. Define report layout constants (margins, font sizes, widths) at module level
  3. Add visual regression tests (Percy or similar) for PDF output
- **Test Coverage Gaps:** No PDF generation tests found

### Audit Execution Engagement Form (601 lines)

- **Files:** `src/app/(onboarding)/onboarding/_components/step-4-org-structure.tsx`
- **Why Fragile:**
  - Complex form state with multi-step validation
  - Form may submit partial data if validation logic has gaps
  - Org structure tree manipulation prone to race conditions
- **Safe Modification:**
  1. Add form validation tests before making changes
  2. Test edge cases: empty org, circular references (if possible)
  3. Verify state resets properly between steps
- **Test Coverage Gaps:** No unit tests; likely E2E tested only

### Investment Compliance Logic (111+ lines in library)

- **Files:** `src/lib/investment-compliance.ts`
- **Why Fragile:**
  - TODO comment indicates incomplete integration with deposit data source
  - Fallback to HousekeepingMetric may use stale data
  - Compliance threshold calculations may differ from RBI circular spec
- **Safe Modification:**
  1. Add unit tests for compliance threshold calculations
  2. Test with HousekeepingMetric fallback vs. actual deposit source
  3. Verify against RBI Investment Regulations circular
- **Test Coverage Gaps:** No tests found; compliance calculation not verified

### Escalation Engine (Multiple files, 335+ lines)

- **Files:** `src/actions/compliance/run-escalation-job.ts`, `src/lib/escalation-engine.ts`
- **Why Fragile:**
  - Hardcoded escalation levels (L0: 0-15 days, L1: 15+ days)
  - Email template generation tightly coupled to escalation logic
  - Job execution may fire duplicate escalations if pg-boss job retries
- **Safe Modification:**
  1. Add idempotency key to escalation records (tenantId + itemId + escalationLevel)
  2. Test retry behavior with duplicate job execution
  3. Add unit tests for escalation level calculation
- **Test Coverage Gaps:** No escalation logic tests found

## Scaling Limits

### Pagination Not Enforced in Most DAL Functions

- **Current Capacity:** Reliably handles <100 items per result set; 500-2000 for analytical queries
- **Limit:** Without pagination, pages with 200+ observations/findings will slow down; browsers with 300+ records in memory risk OOM
- **Scaling Path:**
  1. Implement pagination at DAL layer (add `skip/take` to all `findMany` calls)
  2. Update components to request data in 20-50 item chunks
  3. Implement cursor-based pagination for large result sets
  4. Cache aggregate results (e.g., "total finding count") separately from paginated data
  5. Target: Support 500+ findings per engagement without memory issues

### Database Pool at Practical Limit

- **Current Capacity:** 25 connection max; serves 4-5 concurrent dashboard users comfortably
- **Limit:** 10+ concurrent users may see query timeouts; horizontal scaling requires read replicas
- **Scaling Path:**
  1. Monitor actual pool exhaustion: `SELECT count(*) FROM pg_stat_activity WHERE datname='aegis'`
  2. Increase pool max to 50 if under-utilized
  3. Implement connection pooling middleware (pgBouncer) for 100+ connections
  4. Consider read replicas for reporting queries (analytics, exports)
  5. Target: Support 20+ concurrent users

### Dashboard Metrics Recomputed on Every Page Load

- **Current Capacity:** Instant for <100 observations; 2-3 second load time with 500+ observations
- **Limit:** Dashboard becomes sluggish at 1000+ observations per tenant
- **Scaling Path:**
  1. Implement database view materialization (refresh hourly)
  2. Cache KPI values with 1-hour TTL
  3. Move trend computation to nightly batch job
  4. Provide "Refresh" button for on-demand updates
  5. Target: Dashboard loads in <1 second regardless of audit volume

### Audit Report Generation (Excel/PDF)

- **Current Capacity:** Reliable for <500 findings; 5-10MB PDF
- **Limit:** Reports with 1000+ findings may timeout (15-minute server timeout) or exceed file size limits
- **Scaling Path:**
  1. Implement streaming PDF generation (instead of building full document in memory)
  2. For large reports, generate Excel only (XLSX is smaller than PDF)
  3. Add report generation job queue (pg-boss) with progress tracking
  4. Implement background job report delivery (email + download link)
  5. Target: Support 2000+ findings per report without timeout

## Dependencies at Risk

### Prisma Adapter Strategy (PostgreSQL Adapter)

- **Risk:** Using `@prisma/adapter-pg` instead of native Prisma client; potential compatibility issues with future Prisma versions
- **Files:** `src/lib/prisma.ts`, `package.json` (adapter-pg dependency)
- **Impact:** Custom connection pooling required; need to verify migrations work with adapter version
- **Migration Plan:**
  1. Monitor Prisma release notes for adapter stability
  2. If adapter deprecated, migrate to native Prisma client + PgBouncer
  3. Test migration on staging before production
  4. Priority: LOW (adapter is actively maintained; no imminent risk)

### React Query Caching Strategy

- **Risk:** Client-side cache invalidation may get out of sync with server mutations
- **Files:** `src/hooks/`, component query usage
- **Impact:** Users may see stale data after creating/editing findings
- **Recommendations:**
  1. Use mutation callbacks to invalidate query keys on update
  2. Implement server push (WebSocket) for real-time cache invalidation
  3. Add cache busting headers (Pragma: no-cache) for critical pages
  4. Priority: MEDIUM (low probability; high impact if occurs)

### Date Handling Library Dependency

- **Risk:** formatDate() in `src/lib/utils.ts` uses Indian locale (en-IN); may break for multi-country deployments
- **Files:** `src/lib/utils.ts`, all components using formatDate()
- **Impact:** Date display won't match user's locale if supporting non-Indian users
- **Migration Plan:**
  1. If multi-country support planned: Add locale to session/tenant context
  2. Update formatDate() to accept locale parameter
  3. Pass locale from page context to components
  4. Priority: LOW (v1 is India-only)

## Missing Critical Features

### Evidence Upload with S3 Presigned URLs

- **Problem:** Phase 26 feature not yet implemented; evidence upload may be broken or falling back to synchronous upload
- **Files:** `src/actions/audit-execution/upload-examination-evidence.ts` (295 lines, Phase 25 state)
- **Blocks:** Auditees cannot reliably upload large evidence files (>5MB)
- **Fix timeline:** Phase 26 (estimated 1-2 weeks)

### Manual Module Selection UI

- **Problem:** Phase 25 feature for manually selecting RBIA modules not fully wired; may default to all modules
- **Files:** `src/components/rbia/add-module-dialog.tsx` (260 lines)
- **Blocks:** CAEs cannot customize audit scope by RBIA module
- **Fix timeline:** Phase 25 (estimated 1 week)

### Concurrent Audit Deep Dive Analysis

- **Problem:** Concurrent audit comparison logic exists but full drill-down analysis not implemented
- **Files:** `src/data-access/concurrent-audit.ts`, related components
- **Blocks:** Auditors cannot perform detailed concurrent audit analysis
- **Fix timeline:** Future phase (dependent on Phase 24 completion)

## Test Coverage Gaps

### DAL Functions Not Unit Tested

- **What's Not Tested:** Query logic in 47 DAL files (data-access/); only tenant isolation verified statically
- **Files:** `src/data-access/*.ts` (except tenant-isolation.test.ts)
- **Risk:** Schema changes may break queries without detection; null/error cases untested
- **Priority:** HIGH — Add unit tests for critical DAL functions:
  - `getRbiaAnalyticsByPeriod()` (analytics reliability)
  - `getEngagementFindings()` (findings retrieval)
  - `computeEscalationRequired()` (escalation accuracy)
  - Recommend: Vitest with in-memory SQLite or test DB

### Server Actions Not Systematically Tested

- **What's Not Tested:** 91 server action files; mostly E2E tested only
- **Files:** `src/actions/` (all domains)
- **Risk:** Logic errors in critical workflows (freeze, submit, escalate) caught late in E2E
- **Priority:** MEDIUM — Add unit tests for:
  - `freezeRbiaScore()` (score computation)
  - `submitBmResponse()` (response validation)
  - `runEscalationJob()` (escalation logic)

### E2E Tests Limited Scope

- **What's Not Tested:** Full audit lifecycle; edge cases like concurrent user conflicts; offline behavior
- **Files:** `tests/e2e/` (3 test files only)
- **Risk:** Regressions in workflow critical paths go undetected until production
- **Priority:** MEDIUM — Expand E2E coverage:
  - Audit creation → execution → findings → reporting workflow
  - Permission denial scenarios
  - Concurrent session behavior

### Component Rendering Tests Missing

- **What's Not Tested:** 239 component files; no visual regression tests
- **Risk:** CSS/layout changes break UX without detection; accessibility issues undetected
- **Priority:** LOW-MEDIUM — Consider adding:
  - Playwright component tests for critical UI (forms, tables)
  - Percy or similar for visual regression
  - axe-core integration tests for accessibility

---

_Concerns audit: 2026-03-02_
