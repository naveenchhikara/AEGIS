# Codebase Concerns

**Analysis Date:** 2026-02-22

## Tech Debt

### Deprecated Seed Data Pattern

- **Issue:** JSON seed files (`src/data/seed/`) marked as deprecated (line 5-17 `src/data/index.ts`) but still imported in runtime code and pages
- **Files:** `src/data/index.ts`, `src/data/seed/examination-areas.json`, `src/data/seed/examination-items.json`, `src/data/seed/policies.json`
- **Impact:** Confusion about source of truth; potential stale data in non-production environments; inconsistency between seed and database queries
- **Fix approach:** Remove all JSON seed exports from `src/data/index.ts`. Update any remaining pages that import from deprecated exports to use database queries via DAL functions instead. Verify with grep for `from '@/data'` imports.

### Investment Compliance Integration Gap

- **Issue:** Non-SLR cap checking (R95) depends on deposit data that isn't available; TODO comment at line 111 `src/lib/investment-compliance.ts`
- **Files:** `src/lib/investment-compliance.ts` (lines 111-129)
- **Impact:** Non-SLR compliance check always returns warning "deposit data not available"; banks cannot validate this critical RBI regulation
- **Fix approach:** Add HousekeepingMetric type TOTAL_DEPOSITS capture to housekeeping module OR integrate with core banking system deposit feed. Document expected schema.

### Onboarding Store Tenant Isolation Unscoped

- **Issue:** Zustand localStorage store (`src/stores/onboarding-store.ts` line 31-33) is completely unscoped — if multiple users share a browser (common in bank branches), one user's partial onboarding PII is visible to the next
- **Files:** `src/stores/onboarding-store.ts`
- **Impact:** Security/privacy risk; sensitive bank registration data persisted unencrypted in localStorage with no user context
- **Fix approach:** Scope storage key by authenticated user ID: `STORAGE_KEY = "aegis-onboarding-${userId}"`. Implement sessionStorage fallback for sensitive data. Clear on logout. Add integrity check.

## Security Considerations

### Application-Level Tenant Isolation Without PostgreSQL RLS

- **Risk:** Tenant isolation enforced only via application WHERE clauses; no PostgreSQL Row-Level Security policies exist (see `src/lib/prisma.ts` lines 45-60)
- **Files:** `src/lib/prisma.ts`, all `src/data-access/*.ts` (39 files)
- **Current mitigation:** Every DAL function adds explicit WHERE tenantId filter; tenantId sourced only from authenticated session; UUID format validation in `prismaForTenant()`
- **Recommendations:**
  - Add PostgreSQL RLS policies as belt-and-suspenders protection
  - Audit all DAL functions to ensure WHERE clauses include tenantId (grep for "where: {" without tenantId)
  - Add unit tests that verify tenant isolation (cross-tenant query attempts should fail)

### Session Cast Boundary

- **Risk:** Single `as unknown as AuthSession` cast at session boundary (`src/data-access/session.ts` line 30) assumes Better Auth additionalFields (tenantId, roles) are always present
- **Files:** `src/data-access/session.ts` (lines 20-31)
- **Current mitigation:** Comments indicate tenantId/roles "are always present for onboarded users"; inline comment at line 75 `src/app/(dashboard)/layout.tsx` checks for `needsSetup` flag if missing
- **Recommendations:** Add explicit type guard. Validate session.user.tenantId and session.user.roles before cast. Add test case for partially-onboarded users.

### BETTER_AUTH_SECRET Character Restrictions

- **Risk:** Per MEMORY.md, BETTER_AUTH_SECRET must be hex-only (no +, =, \) — base64 chars cause JSON parse errors (documented in memory but not in schema or env validation)
- **Files:** `src/env.ts` (need to check), environment setup
- **Current mitigation:** Documentation in MEMORY.md only (not discoverable in code)
- **Recommendations:** Add Zod regex validation for BETTER_AUTH_SECRET in `src/env.ts`. Include error message with allowed character set.

### Type Unsafe Permission Checks

- **Issue:** Permission checks use `as any` cast (e.g., `src/actions/compliance/run-escalation-job.ts` line 34: `hasPermission(session.user.roles as any, ...)`)
- **Files:** ~98 instances of `throw new Error` and multiple `as any` in permission checks across `src/actions/`
- **Impact:** Type safety lost; potential permission bypass if types diverge
- **Fix approach:** Define strict TypeScript permission types. Use `Roles extends Role[]` generic constraint. Remove all `as any` from permission checks.

## Known Bugs

### Dashboard Null Handling on Incomplete Setup

- **Bug description:** Dashboard renders with empty sidebar if user has no tenant or roles (BUG-001/002)
- **Symptoms:** Broken UI, missing navigation, confusing user experience
- **Files:** `src/app/(dashboard)/layout.tsx` (lines 74-76)
- **Workaround:** Code checks `needsSetup` flag and should show setup message (not yet fully implemented based on code review)
- **Fix approach:** Verify error boundary or explicit setup page is shown. Add test case for onboarded-but-incomplete users.

### Dashboard View Creation Not Tracked

- **Issue:** 4 PostgreSQL views for dashboard (`v_compliance_summary`, `v_observation_severity`, `v_audit_coverage_branch`, `fn_dashboard_health_score`) must be applied manually after fresh deploy — not in Prisma migrations
- **Files:** `src/data-access/dashboard.ts`, `prisma/migrations/20260209_dashboard_views.sql`
- **Symptoms:** Dashboard shows no data on fresh VPS deploy until views are manually created
- **Workaround:** Documented in CLAUDE.md "Known Issues" section; deployment scripts reference manual SQL
- **Fix approach:** Migrate dashboard views into Prisma migration system OR add verification step to `prisma db:push` wrapper that checks view existence.

### Seed Data Mismatch (Local vs Production)

- **Issue:** Production DB may have old minimal seed data vs comprehensive local development seed (571 entities)
- **Files:** `prisma/seed.ts` (1690 lines)
- **Symptoms:** Test data works locally but not in production; examination items differ
- **Impact:** Inconsistent testing; manual re-seeding required after deploy
- **Fix approach:** Implement idempotent seeding with upserts. Add seed version tracking. Create seed reconciliation script.

### ATR Workflow Incomplete

- **Issue:** ATR form has TODO comment for submit action (line 33 `src/components/regulatory/atr-form.tsx`)
- **Files:** `src/components/regulatory/atr-form.tsx`
- **Symptoms:** Submit button likely non-functional; ATR workflow may not complete
- **Impact:** Regulatory compliance tracking blocked
- **Fix approach:** Implement submitATRAction server action. Add permission check. Create E2E test.

## Performance Bottlenecks

### Large Generated Prisma Client

- **Problem:** `src/generated/prisma/models/Tenant.ts` is 24,405 lines; `AuditEngagement.ts` is 9,479 lines due to type generation for 71 models
- **Files:** `src/generated/prisma/models/*.ts` (entire directory is auto-generated)
- **Cause:** Prisma generates comprehensive type definitions and delegate methods for every model; some models have dozens of relations
- **Improvement path:** Monitor bundle size impact. Consider lazy loading Prisma client in non-critical paths. Use `@prisma/internals` for lighter weight queries in reporting pipelines.

### Dashboard Query Waterfall

- **Problem:** Dashboard SSR fires 10-15 parallel queries (per `src/lib/prisma.ts` line 11 comment) to populate 4 view metrics + 6 KPI widgets; under concurrent load, queries may timeout
- **Files:** `src/data-access/dashboard.ts` (24 instances of `any` type), `src/lib/prisma.ts` (pool increased to max 25 from default 10)
- **Cause:** Pool was only 10 connections by default; dashboard SSR parallelism exceeded capacity
- **Current status:** Pool increased to 25; may still have edge cases
- **Improvement path:** Profile dashboard load time. Consider caching layer for dashboard snapshots (model `DashboardSnapshot` exists but needs integration). Batch queries where possible.

### Data Access Layer Type Unsafety

- **Problem:** 18 instances of `as any` in `src/data-access/reports.ts` alone; widespread use in complex queries
- **Files:** `src/data-access/reports.ts`, `src/data-access/dashboard.ts`, others
- **Impact:** Cannot catch query type errors at compile time; risk of runtime crashes in reporting pipelines
- **Improvement path:** Migrate complex queries to Prisma raw queries with TypeScript overloads OR extract query result types via `ReturnType<typeof queryFunction>`.

## Fragile Areas

### Examination Model Dual Coexistence (v6.0 Migration)

- **Files:** Schema contains both old (`ExaminationArea`, `ExaminationItem`, `AuditExaminationResponse`) and new (`ExaminationNode`, `ExaminationResponse`) models simultaneously
- **Why fragile:** Any change to old models affects both audit execution flows; no clear deprecation timeline; risk of data consistency issues
- **Safe modification:** All changes must maintain both schemas. New audit engagements should use `ExaminationNode` path. Add migration test that validates data can move from old to new format.
- **Test coverage:** Very limited — only 2 E2E specs exist; no unit tests for examination model transitions

### Observation Lifecycle State Machine

- **Problem:** 7-state Observation model with 5C findings, compliance tracking, and escalation; complex transition rules not formally encoded
- **Files:** `src/generated/prisma/models/Observation.ts` (5,906 lines), `src/lib/state-machine.ts` (limited), `src/actions/observations/*.ts` (create, transition, resolve-fieldwork)
- **Why fragile:** No single source of truth for valid state transitions; business logic scattered across actions and components; test coverage: 1 E2E spec
- **Safe modification:** Document all valid transitions in state machine before making changes. Add unit tests for transition validations.

### Report Generation Pipeline

- **Problem:** 3 large files handle report generation: `src/actions/reports/generate-xlsx.ts`, `generate-pdf.ts`, `transition-report.ts`
- **Files:** Report generation pipeline (XLSX: ExcelJS, PDF: @react-pdf/renderer)
- **Why fragile:** Multiple dependencies with different APIs; XLSX multi-tab requires careful column ordering; PDF renderer has specific component requirements
- **Safe modification:** Changes to report schema require updates to both XLSX and PDF generators. Add regression tests for each report type.

### Investment Compliance Monitoring

- **Problem:** Two compliance checks (broker concentration, non-SLR cap) depend on specific data formats in InvestmentRecord and HousekeepingMetric
- **Files:** `src/lib/investment-compliance.ts`, `src/components/investments/investment-table.tsx`, `src/actions/investment/*.ts`
- **Why fragile:** Assumes broker names match exactly; non-SLR check requires manual housekeeping metric entry; no validation on input data
- **Safe modification:** Add pre-check validation. Create test fixtures for edge cases (missing broker, zero deposits, rounding errors).

## Test Coverage Gaps

### Minimal E2E Test Suite

- **What's not tested:**
  - Observation full lifecycle (only partial spec in `tests/e2e/observation-lifecycle.spec.ts`)
  - Permission enforcement for all 17 roles (only basic guards tested)
  - Report generation (XLSX/PDF)
  - Escalation job routing
  - Compliance workflow (branch response → ZAC → ACE → ACB)
  - Investment compliance checks
  - Multi-tenant isolation
- **Files:** `tests/e2e/observation-lifecycle.spec.ts` (partial), `tests/e2e/permission-guards.spec.ts` (basic)
- **Risk:** Regression in complex workflows undetected until production
- **Priority:** High — add specs for escalation, compliance lifecycle, investment checks

### No Unit Tests for Core Algorithms

- **What's not tested:**
  - RAM risk scoring logic (`src/services/` or embedded in actions)
  - State machine transitions (`src/lib/state-machine.ts`: only 1 test file exists)
  - Escalation engine (`src/lib/escalation-engine.ts`)
  - Investment compliance checks (`src/lib/investment-compliance.ts`)
  - Permission resolution (`src/lib/permissions.ts`)
- **Risk:** Critical business logic can degrade unnoticed
- **Priority:** High — add Vitest unit tests for each

### No Integration Tests

- **Gap:** No tests validating DAL functions with actual database
- **Risk:** SQL injection in raw queries, tenant isolation bypasses, N+1 query problems
- **Priority:** Medium — set up test database fixture

## Dependencies at Risk

### Deprecated Prisma Pattern

- **Risk:** Code still references `prismaForTenant()` wrapper that returns singleton client without DB-level RLS (per ARCHITECTURE.md, `prismaForTenant()` returns global singleton)
- **Migration plan:** If moving to true RLS, need to replace `prismaForTenant()` calls with connection-scoped context OR use Prisma middleware to inject tenant context per connection. This is a breaking change to data layer.

### @react-pdf/Renderer Limitations

- **Risk:** Component rendering constraints (specific React element requirements); limited CSS support
- **Current usage:** `src/actions/reports/generate-pdf.ts`, `src/components/pdf-report/`
- **Migration plan:** Consider switching to `puppeteer` + HTML rendering if PDF flexibility becomes critical

### ExcelJS Type Safety

- **Risk:** ExcelJS uses flexible object patterns; many columns added via `worksheet.columns = [...]`
- **Current usage:** `src/lib/excel-export/audit-report-generator.ts` (10 lines of wc output suggests large file)
- **Migration plan:** Create typed wrapper for column definitions to reduce `as any` usage

## Missing Critical Features

### Deposit Data Integration

- **Problem:** Non-SLR cap regulation (R95) requires deposit information; currently only housekeeping metrics available
- **Blocks:** Accurate investment compliance reporting
- **Feature needed:** API to fetch deposit balance from core banking system OR manual entry field in housekeeping module

### Email Delivery in Sandbox Mode

- **Problem:** SES in sandbox mode (per CLAUDE.md Known Issues #1); email only goes to verified addresses
- **Blocks:** Production notification workflow; compliance escalations cannot reach all recipients
- **Feature needed:** Upgrade SES to production mode (pending AWS approval)

### PostgreSQL RLS Implementation

- **Problem:** Row-Level Security policies referenced in comments but not actually created; application-only isolation is risky
- **Blocks:** True database-level multi-tenant security
- **Feature needed:** Add RLS policies for each tenant-scoped table; test with connection-level tenant context

### Observation Timeline UI

- **Problem:** ObservationTimeline model exists (119 lines in Prisma) but component/page for viewing timeline gaps
- **Blocks:** Audit trail transparency for stakeholders
- **Feature needed:** Timeline view component showing all state transitions with actor and timestamp

## Scaling Limits

### Connection Pool Size

- **Current capacity:** PostgreSQL pool max 25 connections (set in `src/lib/prisma.ts` line 13)
- **Limit:** Dashboard SSR with 15 parallel queries + background jobs + API requests can exhaust pool under high concurrency
- **Scaling path:** Monitor pool utilization. Consider connection pooler like PgBouncer (not implemented). Reduce dashboard query parallelism via caching.

### In-Memory State (Zustand Stores)

- **Current usage:** Client-side state for onboarding, observations, etc. stored in browser memory
- **Limit:** No explicit memory limits; localStorage quota ~5-10MB per origin depending on browser
- **Scaling path:** Implement state size monitoring. Move large datasets (examination items) to server state via React Query (already implemented in some places).

### Seed Data Size

- **Current:** 568 examination items pre-loaded per tenant (lines in `prisma/seed.ts`)
- **Limit:** Linear growth with tenant count; no lazy loading of examination items in audit forms
- **Scaling path:** Implement pagination for examination item selection. Add search/filter with database indexes on `code` and `particulars` fields.

## Recommendations (Priority Order)

1. **HIGH - Add PostgreSQL RLS policies** — Convert application-level to database-level tenant isolation
2. **HIGH - Expand E2E test suite** — Critical workflows (compliance, escalation, reports) untested
3. **HIGH - Fix Onboarding Store tenant scoping** — Current implementation is a privacy/security risk
4. **MEDIUM - Migrate deprecated seed data** — Remove deprecated JSON exports; verify all pages use DAL functions
5. **MEDIUM - Implement Deposit API integration** — Enable R95 non-SLR cap compliance checks
6. **MEDIUM - Remove `as any` from permission checks** — Add strict TypeScript types
7. **LOW - Add DashboardSnapshot caching** — Improve dashboard SSR performance
8. **LOW - Implement dashboard view auto-creation** — Eliminate manual deploy step

---

_Concerns audit: 2026-02-22_
