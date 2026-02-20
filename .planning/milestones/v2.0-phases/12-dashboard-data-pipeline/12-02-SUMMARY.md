---
phase: 12-dashboard-data-pipeline
plan: 02
subsystem: background-jobs
tags: [pg-boss, dashboard, snapshots, trends, repeat-findings]

# Dependency graph
requires:
  - phase: 12-dashboard-data-pipeline
    plan: 01
    provides: DashboardSnapshot model and repeatOfId FK
  - phase: 09-dashboards
    provides: Dashboard queries with placeholder trend data
  - phase: 08-notifications-reports
    provides: pg-boss job infrastructure
provides:
  - Daily snapshot capture job at 01:00 IST
  - Real-time severity trend data from DashboardSnapshot
  - Real-time compliance trend data from DashboardSnapshot
  - Repeat findings query using repeatOfId FK
affects: [dashboard-widgets, board-reports, trend-analysis]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Daily cron job for metrics snapshot capture"
    - "Batch processing to prevent connection pool exhaustion"
    - "Historical trend queries from time-series snapshot table"

key-files:
  created:
    - src/jobs/snapshot-metrics.ts
  modified:
    - src/jobs/index.ts
    - src/lib/job-queue.ts
    - src/data-access/dashboard.ts
    - src/data-access/reports.ts

key-decisions:
  - "Snapshot job runs at 01:00 IST (19:30 UTC) via pg-boss cron scheduler"
  - "Batch size of 10 tenants prevents connection pool exhaustion"
  - "getSeverityTrend reads quarterly data from DashboardSnapshot (not Observation.createdAt)"
  - "getComplianceTrend returns daily trend points for 6-month sparkline"
  - "Repeat findings shows simple 2-level relation (current + original) - full ancestry deferred"

patterns-established:
  - "Daily metrics snapshot pattern for dashboard trend widgets"
  - "Time-series data aggregation from snapshots instead of runtime computation"

# Metrics
duration: 7min 44s
completed: 2026-02-09
---

# Phase 12 Plan 02: Dashboard Data Pipeline - Snapshot Job & Trend Queries

**Daily snapshot job captures metrics at 01:00 IST, trend queries read from DashboardSnapshot, repeat findings use repeatOfId FK**

## Performance

- **Duration:** 7 min 44 sec
- **Started:** 2026-02-09T21:03:55Z
- **Completed:** 2026-02-09T21:11:40Z
- **Tasks:** 2
- **Files created:** 1
- **Files modified:** 4

## Accomplishments

- Daily snapshot job registered with pg-boss to run at 01:00 IST (19:30 UTC)
- Captures health score, compliance summary, and severity metrics for all onboarded tenants
- getSeverityTrend reads quarterly data from DashboardSnapshot table
- getComplianceTrend returns historical trend points from DashboardSnapshot
- Board report repeat findings section queries observations with repeatOfId populated
- Removed all "not yet implemented" and placeholder comments

## Task Commits

Each task was committed atomically:

1. **Task 1: Create snapshot-metrics job and register with pg-boss** - `f2a623d` (feat)
2. **Task 2: Update trend queries and repeat findings to use real data** - `6676126` (feat)

## Files Created/Modified

- `src/jobs/snapshot-metrics.ts` - NEW: Daily snapshot capture job with batch processing
- `src/jobs/index.ts` - Added snapshot job handler registration
- `src/lib/job-queue.ts` - Added SNAPSHOT_METRICS job name and cron schedule
- `src/data-access/dashboard.ts` - Updated getSeverityTrend and getComplianceTrend to read from DashboardSnapshot
- `src/data-access/reports.ts` - Updated repeat findings to query repeatOfId FK

## Decisions Made

**D1: Snapshot job schedule at 01:00 IST**

- Schedule: Daily at 19:30 UTC = 01:00 IST
- Rationale: Off-peak hours for UCB operations, before business day starts
- Impact: Daily snapshots available for trend widgets after first run

**D2: Batch processing with size 10**

- Batch size: 10 tenants at a time
- Rationale: Prevents connection pool exhaustion for multi-tenant deployments
- Impact: Scalable to hundreds of tenants without infrastructure changes

**D3: Quarterly aggregation for severity trend**

- Groups snapshots by fiscal quarter, takes latest snapshot per quarter
- Rationale: Matches UCB quarterly review cycle, reduces noise
- Impact: Trend widget shows 6 quarters of severity data

**D4: Daily granularity for compliance trend**

- Returns all daily snapshots for 6-month period
- Rationale: Enables sparkline visualization of compliance changes
- Impact: Compliance widget shows fine-grained trend line

**D5: Simple 2-level repeat finding relation**

- occurrenceCount hardcoded as 2 (current + original)
- Rationale: Full ancestry tree traversal deferred per research recommendation
- Impact: Repeat findings show in board reports, full lineage tracking deferred to future phase

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Initial Prisma import issue:** Dynamic import pattern required adjustment for custom Prisma client location (@/generated/prisma/client) and adapter configuration. Resolved by matching pattern from src/lib/prisma.ts.

## User Setup Required

None - snapshot job will run automatically on server boot via pg-boss scheduler.

## Next Phase Readiness

**Ready for dashboard widget consumption:**

- Snapshot job will begin capturing metrics on next server restart
- Trend queries will return real data after first snapshot capture (01:00 IST next day)
- Empty arrays returned until snapshots exist (widgets handle gracefully)

**Blockers:** None

**Tech debt paid:**

- ✅ Phase 9 gap: "Trend widgets return null" - CLOSED
- ✅ Phase 8 gap: "Repeat findings board report empty" - CLOSED

**Remaining Phase 12 work:**

Phase 12 is now complete. All success criteria satisfied:

1. ✅ DashboardSnapshot model added (Plan 01)
2. ✅ engagementId FK added to Observation (Plan 01)
3. ✅ Daily snapshot job captures metrics (Plan 02)
4. ✅ Trend queries read from DashboardSnapshot (Plan 02)
5. ✅ Repeat findings query uses repeatOfId (Plan 02)

---

## Self-Check: PASSED

All files and commits verified:

- ✅ src/jobs/snapshot-metrics.ts exists
- ✅ src/jobs/index.ts modified
- ✅ src/lib/job-queue.ts modified
- ✅ src/data-access/dashboard.ts modified
- ✅ src/data-access/reports.ts modified
- ✅ Commit f2a623d found in git history
- ✅ Commit 6676126 found in git history

---

_Phase: 12-dashboard-data-pipeline_
_Completed: 2026-02-09_
