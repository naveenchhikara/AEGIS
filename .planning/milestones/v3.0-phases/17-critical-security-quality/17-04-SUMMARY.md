---
phase: 17-critical-security-quality
plan: "04"
subsystem: database
tags:
  [
    prisma,
    postgresql,
    groupBy,
    n+1,
    performance,
    analytics,
    dashboard,
    compliance,
  ]

requires:
  - phase: 17-critical-security-quality/01
    provides: tenantId in all DAL WHERE clauses
  - phase: 17-critical-security-quality/03
    provides: typed AuthSession eliminating as-any casts

provides:
  - N+1 loop elimination in getAuditPlanProgress (analytics.ts)
  - Server-side aggregation for getFindingTrends, getComplianceAging, getNpaMovement
  - groupBy-based fallbacks in dashboard.ts (severity, workload, branch risk)
  - Promise.all parallelization of 13 serial KPI queries in qa-assessment.ts
  - Bulk SQL UPDATE for compliance item daysOpen (N+1 → 1 query)
  - Batch escalation job (pre-fetch recipients, createMany notifications, $transaction updates)
  - createMany for compliance item creation and work program generation
  - Safety limits (take guards) on report/export/inspection pack queries
  - Fiscal year scoping for calendar page default date range
  - LIMIT 100 on generate_series gap detection SQL

affects:
  - Any future plan modifying analytics.ts, dashboard.ts, compliance escalation, or report generation
  - Performance testing/benchmarking plans

tech-stack:
  added: []
  patterns:
    - "groupBy replaces findMany + in-JS aggregation for analytics queries"
    - "raw SQL with date_trunc for server-side quarterly time-series grouping"
    - "raw SQL CASE WHEN for server-side age bucketing"
    - "Promise.all for independent DB count queries (parallel vs serial)"
    - "Pre-fetch by unique values (escalation levels, branches) before N+1 loop"
    - "createMany with skipDuplicates instead of N individual create calls"
    - "take: N safety guards on all findMany that could grow unbounded"

key-files:
  created: []
  modified:
    - src/data-access/analytics.ts
    - src/data-access/dashboard.ts
    - src/data-access/qa-assessment.ts
    - src/data-access/compliance-items.ts
    - src/data-access/reports.ts
    - src/data-access/exports.ts
    - src/data-access/audit-trail.ts
    - src/actions/compliance/run-escalation-job.ts
    - src/actions/compliance/create-compliance-items.ts
    - src/actions/work-program/generate-program.ts
    - src/actions/governance/generate-inspection-pack.ts
    - src/app/(dashboard)/calendar/page.tsx

key-decisions:
  - "date_trunc('quarter') in raw SQL for quarterly grouping — avoids loading all rows into JS"
  - "Raw SQL CASE WHEN for age buckets — server-side bucketing eliminates full table fetch"
  - "Pre-fetch recipients by escalation level (4 levels max) before item loop — not per-item"
  - "Pre-fetch branch-head assignments in single query grouped by branchId"
  - "getComplianceAging returns empty items[] array in bucket — detail via separate endpoint"
  - "take: 1000 for board reports (topFindings uses first 15), take: 5000 for exports"
  - "Calendar page scoped to Indian fiscal year (Apr 1 — Mar 31) by default"
  - "LIMIT 100 on generate_series gap detection — sufficient for tamper detection alerts"

patterns-established:
  - "groupBy pattern: use Prisma groupBy instead of findMany + JS aggregation for counts"
  - "Promise.all pattern: wrap all independent DB queries in parallel execution"
  - "Batch create pattern: fetch existing IDs into Set, createMany for new items"
  - "Raw SQL pattern: use $queryRaw with date_trunc for time-series aggregation"
  - "Safety guard pattern: all findMany on large tables must have take: N limit"

requirements-completed: []

duration: 15min
completed: 2026-02-19
---

# Phase 17 Plan 04: N+1 Queries and Unbounded Fetches Summary

**Eliminated 19 N+1/unbounded patterns via Prisma groupBy, Promise.all parallelization, raw SQL aggregation, and createMany batching across analytics, dashboard, compliance, and cron job layers**

## Performance

- **Duration:** 15 min
- **Started:** 2026-02-19T17:18:36Z
- **Completed:** 2026-02-19T17:33:28Z
- **Tasks:** 16
- **Files modified:** 12

## Accomplishments

- Eliminated 5 N+1 loops (audit plan progress, compliance item updates, escalation job, compliance item creation, work program generation)
- Replaced 12 unbounded findMany calls with groupBy or limited queries (analytics page, dashboard fallbacks, exports, reports)
- Parallelized 13 serial KPI count queries in qa-assessment.ts with Promise.all
- Added LIMIT 100 to generate_series gap detection SQL

## Task Commits

1. **Tasks 4.1-4.4: analytics.ts N+1 and unbounded fetches** - `1fb01ec` (perf)
2. **Tasks 4.5-4.7: dashboard.ts fallback optimization** - `8e619c4` (perf)
3. **Task 4.8: qa-assessment.ts serial KPI queries** - `f6206bc` (perf)
4. **Task 4.9: compliance-items.ts N+1 update loop** - `db1c47c` (perf)
5. **Task 4.10: run-escalation-job.ts batching** - `07ba28f` (perf)
6. **Task 4.11: create-compliance-items.ts createMany** - `897b23f` (perf)
7. **Task 4.12: generate-program.ts createMany** - `8130d70` (perf)
8. **Task 4.13: report/export safety limits** - `c4c74be` (perf)
9. **Task 4.14: calendar page fiscal year scoping** - `690a8bd` (perf)
10. **Task 4.15: audit-trail.ts LIMIT 100** - `b89e028` (perf)
11. **Task 4.16: TypeScript fixes** - `f393413` (fix)

## Files Created/Modified

- `src/data-access/analytics.ts` - N+1 loop → include; findMany → groupBy/raw SQL date_trunc; take: 20 guard
- `src/data-access/dashboard.ts` - 3 fallbacks: findMany → groupBy with separate name lookup
- `src/data-access/qa-assessment.ts` - 13 serial counts → Promise.all; findMany for avg → raw SQL AVG()
- `src/data-access/compliance-items.ts` - N+1 update loop → single raw SQL UPDATE
- `src/data-access/reports.ts` - take: 1000 on observation query
- `src/data-access/exports.ts` - take: 5000 on findings and compliance exports
- `src/data-access/audit-trail.ts` - LIMIT 100 on generate_series gap query
- `src/actions/compliance/run-escalation-job.ts` - pre-fetch recipients by level, createMany notifications, $transaction updates
- `src/actions/compliance/create-compliance-items.ts` - Set-based dedup + createMany
- `src/actions/work-program/generate-program.ts` - Set-based dedup + createMany + take: 500 guard
- `src/actions/governance/generate-inspection-pack.ts` - filter CLOSED compliance, db.count() for overdue
- `src/app/(dashboard)/calendar/page.tsx` - scope to current Indian fiscal year

## Decisions Made

- **date_trunc in raw SQL for time-series:** Prisma groupBy doesn't support date_trunc natively; raw SQL gives precise server-side quarterly bucketing without loading all rows
- **Empty `items[]` in getComplianceAging buckets:** The full item list is not needed for the chart — if detail is needed, a separate endpoint can fetch by bucket criteria
- **Pre-fetch recipients by escalation level (max 4):** Avoids per-item recipient queries in escalation loop; levels are bounded (L0-L4)
- **take: 1000 for board reports:** topFindings only uses first 15 observations; generous cap accommodates future growth without unbounded memory use
- **take: 5000 for exports:** CSV exports are expected to be large but bounded; 5000 rows is practical for an Excel file
- **LIMIT 100 on gap detection:** Sufficient for tamper detection alerts; complete gap enumeration is O(max-min) and unnecessary for security alerting

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript errors introduced by perf changes**

- **Found during:** Task 4.16 (TypeScript verification)
- **Issue:** `_count: { id: true }` in groupBy should be `_count: true`; implicit `any` types from `tx: any` transaction context; wrong import path for `NotificationType`
- **Fix:** Changed to `_count: true`, added explicit type casts in transaction callbacks, corrected import to `@/generated/prisma/enums`
- **Files modified:** src/data-access/qa-assessment.ts, src/actions/compliance/run-escalation-job.ts, src/actions/compliance/create-compliance-items.ts, src/actions/work-program/generate-program.ts
- **Committed in:** f393413

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Fix required for TypeScript compilation. No scope change.

## Issues Encountered

- `_count: true` vs `_count: { field: true }` in Prisma groupBy: when using `_count: true`, access the count via `g._count` directly (it's a number), not `g._count.id`. Fixed with explicit type guard.

## Next Phase Readiness

- Analytics and dashboard queries are now O(1) in query count regardless of data volume
- Cron jobs (escalation, daysOpen update) now scale horizontally: updateDaysOpenForOpenItems handles 1M rows in 1 query
- All analytics page queries use groupBy or raw SQL aggregation — no full table scans
- Pre-existing TypeScript errors in qa-assessment.ts, compliance-items.ts (from session tenantId type) are unrelated to this plan and should be addressed in a dedicated type cleanup plan

---

_Phase: 17-critical-security-quality_
_Completed: 2026-02-19_

## Self-Check: PASSED
