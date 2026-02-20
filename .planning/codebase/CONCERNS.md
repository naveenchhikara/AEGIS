# Codebase Concerns

**Analysis Date:** 2026-02-20

---

## Tech Debt

**Deprecated Seed Data Still Used in Production Components:**

- Issue: Multiple dashboard components and `src/lib/report-utils.ts` import static JSON from `src/data/seed/` instead of querying the live database. This means dashboards show hardcoded demo data rather than real tenant data.
- Files:
  - `src/components/dashboard/risk-indicator-panel.tsx` — imports `findings`, `demoComplianceRequirements` from `@/data`
  - `src/components/dashboard/findings-count-cards.tsx` — imports `findings` from `@/data`
  - `src/components/dashboard/regulatory-calendar.tsx` — imports `demoComplianceRequirements` from `@/data`
  - `src/components/dashboard/health-score-card.tsx` — imports `demoComplianceRequirements` from `@/data`
  - `src/components/dashboard/audit-coverage-chart.tsx` — imports `auditPlans` from `@/data`
  - `src/lib/report-utils.ts` — imports `findings`, `auditPlans`, `demoComplianceRequirements`, `bankProfile` from `@/data`
  - `src/data/index.ts` — marked deprecated at line 16-17
- Impact: Dashboards for real tenants show demo/seed data. Board reports generated via `src/lib/report-utils.ts` contain demo data, not live data.
- Fix approach: Replace each import with DAL queries using `getRequiredSession()` + `prismaForTenant(tenantId)`. The DAL structure already exists in `src/data-access/`.

**Onboarding localStorage Not Scoped by Tenant/User:**

- Issue: `src/stores/onboarding-store.ts` uses a single `STORAGE_KEY = "aegis-onboarding"` without user or tenant scoping. The TODO at line 31-33 acknowledges this.
- Files: `src/stores/onboarding-store.ts`
- Impact: In bank branch environments where multiple employees share a browser, one user's partial onboarding data is visible to the next user opening the onboarding wizard.
- Fix approach: Scope the storage key with the authenticated user's ID (e.g., `aegis-onboarding-{userId}`). Requires passing user ID into the store initialization.

**Widespread `zodResolver(Schema as any)` Pattern:**

- Issue: 12+ form components cast Zod schemas to `any` to work around react-hook-form + Zod v4 compatibility issues. This eliminates type-checking on form resolver inputs.
- Files:
  - `src/components/housekeeping/metrics-capture-form.tsx:111`
  - `src/components/is-audit/vendor-risk-panel.tsx:109`
  - `src/components/is-audit/app-inventory-table.tsx:115`
  - `src/components/is-audit/checklist-form.tsx:156`
  - `src/components/audit-execution/engagement-form.tsx:51`
  - `src/components/audit-execution/team-assignment-panel.tsx:85`
  - `src/components/audit-execution/loan-review-form.tsx:103`
  - `src/components/governance/policy-table.tsx:124`
  - `src/components/governance/committee-panel.tsx:148,157,164`
  - `src/components/investments/investment-table.tsx:104`
- Impact: Type-unsafe form validation — mismatch between schema and form values silently compiles.
- Fix approach: Upgrade `@hookform/resolvers` to a version compatible with Zod v4, or pin Zod to v3. The CLAUDE.md notes `zodResolver(Schema as any)` as the current workaround.

**`investment-compliance.ts` Uses `any` for Prisma Transaction Client:**

- Issue: `src/lib/investment-compliance.ts` declares `type PrismaTransactionClient = any` at line 13 to accept Prisma transaction clients, bypassing type safety for all DB calls inside.
- Files: `src/lib/investment-compliance.ts`
- Impact: Any Prisma method can be called without type checking inside compliance functions. Runtime errors surface at database level.
- Fix approach: Import `Prisma.TransactionClient` from the generated Prisma client at `src/generated/prisma/`.

**`housekeeping-engine.ts` Also Uses `any` for Transaction Client:**

- Issue: Same pattern as `investment-compliance.ts` — transaction client typed as `any`.
- Files: `src/lib/housekeeping-engine.ts:23`
- Impact: Same as above.

**Unimplemented Features Leaving UI in Stub State:**

- Issue: Several UI elements have TODO stubs with no server action wired up.
  - `src/components/regulatory/atr-form.tsx:33` — ATR submission not implemented (`TODO: Implement submit ATR action`)
  - `src/components/dashboard/dashboard-composer.tsx:141` — Trend chart widgets not implemented (`TODO: Implement trend chart widgets`)
  - `src/actions/investment/quarterly-certification.ts:83` — ACB notifications not sent on certification (`TODO: Create notification to ACB members`)
  - `src/lib/investment-compliance.ts:111` — Non-SLR cap check falls back to warning when `TOTAL_DEPOSITS` housekeeping metric is missing (`TODO: Integrate with deposit data source`)
- Impact: Features appear in UI but perform no action; regulatory compliance may be incomplete.

---

## Known Bugs

**Dashboard NaN Values in Risk Indicators:**

- Symptoms: Risk indicator widgets show "NaN" when observation aggregation returns null values.
- Files: `src/components/dashboard/risk-indicator-panel.tsx`, `src/data-access/dashboard.ts`
- Trigger: When there are no observations for a tenant, aggregate operations produce `null` which is then used in arithmetic.
- Workaround: None — bug appears in production for new tenants with no data.
- Fix approach: Add null coalescing to all numeric aggregations in `src/data-access/dashboard.ts` (e.g., `Number(value ?? 0)`).

**Missing Index Pages Return 404:**

- Symptoms: Navigating to `/audit-execution` or `/admin` returns Next.js 404.
- Files: `src/app/(dashboard)/audit-execution/` (contains only `[engagementId]/` and `create/`), `src/app/(dashboard)/admin/` (contains only subdirectories)
- Trigger: Any link or browser navigation to the parent route.
- Fix approach: Add `page.tsx` files at each route that either redirect to a sensible default or show a list/overview view.

---

## Security Considerations

**In-Memory Rate Limiting Resets on Process Restart:**

- Risk: Auth rate limiting uses `storage: "memory"` (see `src/lib/auth.ts:61`). Every server restart or PM2 reload clears the rate limit counters, allowing brute force attempts across restarts.
- Files: `src/lib/auth.ts`
- Current mitigation: Account lockout plugin stores lockout state in PostgreSQL `FailedLoginAttempt` table — this persists across restarts. Rate limiting loss only affects the window-based IP throttle.
- Recommendations: Move rate limiting storage to Redis or PostgreSQL for persistence across restarts.

**CSRF Protection Only on Board Report Route:**

- Risk: `src/lib/csrf.ts` implements origin/referer-based CSRF verification, but only `src/app/api/reports/board-report/route.ts` calls `verifyCsrf()`. Other POST/PUT API routes do not call it.
- Files: `src/lib/csrf.ts`, `src/app/api/reports/board-report/route.ts`
- Current mitigation: Next.js server actions have built-in CSRF protection via same-site cookie behavior. Only the REST API routes are affected.
- Recommendations: Apply `verifyCsrf()` to all non-GET API routes, or confirm server action CSRF protection is sufficient and document the rationale.

**Health Endpoint Exposes Infrastructure Details Without Auth:**

- Risk: `GET /api/health` is publicly accessible without authentication. It currently only returns `{status, timestamp, db}` — low exposure. However, `src/app/api/health/route.ts:13` creates a raw `pg.Pool` using `process.env.DATABASE_URL`, creating a second connection pool outside of Prisma.
- Files: `src/app/api/health/route.ts`
- Current mitigation: Response is minimal. DATABASE_URL is not leaked.
- Recommendations: Add IP allowlist or basic auth token for health endpoint in production; consolidate to use the existing Prisma singleton for the DB connectivity check.

**Download Endpoint Missing Tenant Authorization on S3 Keys:**

- Risk: `GET /api/download?key=<s3Key>` validates session existence but does NOT verify the requested S3 key belongs to the authenticated user's tenant. Any authenticated user from any tenant can request a presigned URL for any key if they know it.
- Files: `src/app/api/download/route.ts`
- Current mitigation: Key format validation prevents path traversal; keys are UUIDs not guessable.
- Recommendations: Encode `tenantId` as a path prefix in S3 keys (e.g., `tenants/{tenantId}/...`) and validate the prefix matches the session's `tenantId` before generating the presigned URL.

**CRON_SECRET Not in Validated Environment Schema:**

- Risk: `src/app/api/cron/escalation/route.ts` reads `process.env.CRON_SECRET` directly, bypassing the `@t3-oss/env-nextjs` validation in `src/env.ts`. If `CRON_SECRET` is unset, the check `if (!cronSecret || ...)` rejects all requests — but this failure is silent at build/startup time.
- Files: `src/app/api/cron/escalation/route.ts:26`, `src/env.ts`
- Impact: Missing `CRON_SECRET` in production deploys is not caught at startup; cron jobs silently fail with 401.
- Fix approach: Add `CRON_SECRET: z.string().min(16)` to the `server` block in `src/env.ts`.

**Auth Secret Fallback to Weak Dev Default:**

- Risk: `src/lib/auth.ts:21` sets `secret: process.env.BETTER_AUTH_SECRET || "dev-secret-change-in-production"`. If `BETTER_AUTH_SECRET` is not set in production, the app uses a publicly known default secret, breaking session security.
- Files: `src/lib/auth.ts`
- Current mitigation: `src/env.ts` validates `BETTER_AUTH_SECRET: z.string().min(32)`, so this should be caught at startup.
- Recommendations: Remove the fallback entirely to fail fast rather than silently using an insecure default.

---

## Performance Bottlenecks

**Unbounded `findMany` Queries Across Most DAL Functions:**

- Problem: The majority of `findMany` calls in `src/data-access/` have no `take` or pagination limit. With growing tenant data, these will fetch entire tables.
- Files (sample — not exhaustive):
  - `src/data-access/governance.ts` — `policyDocument.findMany`, `committee.findMany`, `committeeMeeting.findMany`, `housekeepingMetric.findMany` (multiple calls)
  - `src/data-access/work-program.ts` — `workProgramItem.findMany` (4 calls)
  - `src/data-access/analytics.ts` — `branch.findMany`, `auditPlan.findMany`, `auditCalendar.findMany`
  - `src/data-access/qa-assessment.ts` — `qaSelfAssessment.findMany` (4 calls)
  - `src/data-access/concurrent-audit.ts` — `observation.findMany` (2 unbounded)
  - `src/data-access/risk-mis.ts` — `investmentRecord.findMany`, `housekeepingMetric.findMany`, `riskRegister.findMany`
- Impact: Slow page loads and high memory usage as data grows. UCBs with years of audit history will accumulate thousands of records.
- Improvement path: Add cursor-based or offset pagination to list views; add `take` caps on aggregate queries.

**N+1 Query in `detectRepeatFindings`:**

- Problem: `src/actions/repeat-findings/detect.ts:109` maps over `candidates` array and fires a separate `$queryRaw` COUNT query for each candidate.
- Files: `src/actions/repeat-findings/detect.ts`
- Cause: Occurrence count calculated per-candidate with individual queries rather than a single GROUP BY.
- Improvement path: Replace the `.map(async ...)` with a single SQL query using `GROUP BY` to get all counts in one round-trip.

**`dashboard.ts` is 1,160 Lines — Monolithic DAL File:**

- Problem: All dashboard aggregate queries live in one 1,160-line file. Batching is partially implemented (line 1156 batches in groups of 4) but the file complexity makes it hard to optimize individual queries.
- Files: `src/data-access/dashboard.ts`
- Impact: Hard to cache individual widgets independently; any change risks breaking all dashboard metrics.
- Improvement path: Split into per-widget DAL functions in separate files, enable React `cache()` or `unstable_cache` per widget.

**Report Generation Is Synchronous and Blocks the Request:**

- Problem: Excel and PDF report generation (`src/lib/excel-export/`, `src/app/api/reports/board-report/route.ts`) runs synchronously in the request/response cycle. Large reports with many branches can time out.
- Files: `src/app/api/reports/board-report/route.ts`, `src/lib/excel-export/audit-report-generator.ts` (523 lines)
- Impact: Long-running requests can hit Next.js server action body/timeout limits; user experiences UI freeze.
- Improvement path: Move report generation to a `pg-boss` background job (infrastructure already exists in `src/jobs/`); return a job ID for polling.

---

## Fragile Areas

**PostgreSQL Views Not Tracked in Prisma Migrations:**

- Files: Referenced in `src/data-access/dashboard.ts` (lines 174, 226, 300, 476)
- Views: `v_compliance_summary`, `v_observation_severity`, `v_audit_coverage_branch`, `fn_dashboard_health_score`
- Why fragile: These views are applied via manual SQL after deploys. Fresh deploys without applying the SQL crash the dashboard with PostgreSQL relation-not-found errors. There is no automated check that these views exist.
- Safe modification: Keep the manual SQL file up to date at `prisma/create_tables.sql`; document the post-deploy step in runbooks.
- Test coverage: No test verifies these views exist or return correct data.

**Tenant Isolation is Application-Level Only (No PostgreSQL RLS):**

- Files: All `src/data-access/*.ts`, `src/lib/prisma.ts`
- Why fragile: Tenant data isolation relies entirely on developers remembering to add `WHERE tenantId = ?` in every query. There is no database-level enforcement. A single missed `WHERE` clause leaks cross-tenant data.
- Current state: `prismaForTenant()` returns the same singleton client — it is a naming convention, not an enforced filter.
- Safe modification: Always use DAL functions from `src/data-access/` and never write ad-hoc queries in pages or server actions.
- Improvement path: Implement PostgreSQL Row Level Security (RLS) policies as a defense-in-depth layer.

**Direct `prisma` Usage in `src/actions/user-invitations.ts`:**

- Files: `src/actions/user-invitations.ts` (lines 46, 144, 172, 183, 218, 232, 267, 276, 279)
- Why fragile: Uses raw `prisma` client (not `prismaForTenant`) for user creation and management. The `tenantId` is passed as a `where` clause argument rather than being enforced by the wrapper function pattern.
- Safe modification: Follow the pattern of passing `tenantId` explicitly in `where` clauses; ensure all writes include `tenantId` in the data payload.

**Dashboard DB Views Create Two Separate Connection Pools:**

- Files: `src/app/api/health/route.ts` (creates a `pg.Pool` with `max: 1`)
- Why fragile: The health check creates its own `pg.Pool` using `process.env.DATABASE_URL` directly rather than reusing the Prisma-managed pool. This means 2 pools exist: Prisma's (max 25) plus health's (max 1), potentially hitting the PG `max_connections` limit under load.
- Safe modification: Rewrite the health check to use a simple Prisma `$queryRaw` via the existing Prisma singleton.

**Onboarding Wizard Uses `eslint-disable react-hooks/exhaustive-deps` in Multiple Places:**

- Files:
  - `src/app/(onboarding)/onboarding/_components/step-3-rbi-directions.tsx:131`
  - `src/app/(onboarding)/onboarding/_components/onboarding-wizard.tsx:85`
  - `src/app/(onboarding)/onboarding/_components/step-4-org-structure.tsx:153`
  - `src/app/(onboarding)/onboarding/_components/step-5-user-invites.tsx:131`
- Why fragile: Suppressed exhaustive-deps warnings indicate effects that may not re-run when dependencies change, causing stale closures and hard-to-reproduce bugs in multi-step wizard state.

---

## Test Coverage Gaps

**No Unit Tests for Core Business Logic:**

- What's not tested: RAM risk scoring engine, compliance escalation engine, investment compliance rules, observation state machine transitions (except one test file).
- Files: `src/lib/`, `src/services/`, `src/actions/` (79 files) — only `src/lib/__tests__/state-machine.test.ts` exists as a unit test.
- Risk: Regressions in risk calculation, audit scoring, or compliance state changes go undetected until production.
- Priority: High — these are the core regulatory compliance features.

**E2E Tests Cover Only Two Flows:**

- What's not tested: RAM assessment workflow, report generation, concurrent audit, IS audit, investment module, governance module, compliance lifecycle (ZAC/ACE/ACB), onboarding.
- Files: `tests/e2e/observation-lifecycle.spec.ts`, `tests/e2e/permission-guards.spec.ts`
- Risk: Breaking changes in untested modules reach production undetected.
- Priority: High for observation compliance lifecycle; Medium for admin and reporting flows.

**No Tests for DAL Tenant Isolation:**

- What's not tested: None of the 39 DAL files in `src/data-access/` have tests verifying that cross-tenant data is blocked.
- Files: `src/data-access/` (39 files)
- Risk: A regression in tenant isolation is invisible without explicit tests verifying that tenant A cannot read tenant B's data.
- Priority: Critical — multi-tenant data leakage is a compliance and security incident.

---

## Scaling Limits

**pg-boss Job Queue Shares the Main Application DB:**

- Current capacity: One PostgreSQL instance; `pg-boss` creates its own `pgboss` schema tables.
- Limit: As job volume grows (notifications, escalation, digests), job queue tables can grow large and create lock contention with application queries.
- Scaling path: Move `pg-boss` to a dedicated PostgreSQL instance or migrate to Redis-backed queue (BullMQ).

**Connection Pool Capped at 25:**

- Current capacity: `src/lib/prisma.ts` configures `max: 25` connections.
- Limit: With 25 max connections and a 4-vCPU VPS, ~80 concurrent requests can saturate the pool under mixed-load conditions.
- Scaling path: Add PgBouncer as a connection proxy; or increase VPS size and pool to 50.

---

## Dependencies at Risk

**Zod v4 + `@hookform/resolvers` Incompatibility:**

- Risk: The project uses Zod v4 but `@hookform/resolvers` does not fully support Zod v4 generics, causing the widespread `zodResolver(Schema as any)` workaround.
- Impact: 12+ form components have type-unsafe form resolvers.
- Migration plan: Either pin Zod to v3 (`zod@3.x`) and remove `as any` casts, or wait for an `@hookform/resolvers` release with Zod v4 support and update both packages together.

**`@react-pdf/renderer` Externalized from Server Bundle:**

- Risk: `@react-pdf/renderer` is in `serverExternalPackages` in `next.config.ts`. PDF rendering runs at the Node.js level, not in the Edge runtime. Upgrading Next.js could change bundling behavior.
- Impact: PDF generation in `src/actions/reports/generate-pdf.ts` could break on Next.js updates.
- Migration plan: Maintain integration tests for PDF generation; pin the package version and test on every Next.js upgrade.

---

## Missing Critical Features

**RLS (Row Level Security) Not Implemented at Database Level:**

- Problem: All tenant isolation is application-level. No PostgreSQL RLS policies exist.
- Blocks: Defense-in-depth for multi-tenant data. Any bug in the application layer (missed `tenantId` filter) directly leaks cross-tenant data.

**Audit Trail for Server Actions Is Incomplete:**

- Problem: `src/lib/audit-logger.ts` exists but not all server actions create `AuditLog` entries. User invitation actions and some governance actions log to `AuditLog`, but most data mutations in `src/actions/` do not.
- Files: `src/actions/` (79 files), `src/lib/audit-logger.ts`
- Impact: Incomplete audit trail for regulatory compliance. RBI audits may require evidence of who changed what and when.

---

_Concerns audit: 2026-02-20_
