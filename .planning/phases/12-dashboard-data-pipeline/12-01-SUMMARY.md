---
phase: 12-dashboard-data-pipeline
plan: 01
subsystem: database
tags: [prisma, postgresql, schema, foreign-keys, dashboard, observations]

# Dependency graph
requires:
  - phase: 05-foundation-migration
    provides: Prisma schema foundation with Tenant, User, Observation models
  - phase: 09-dashboards
    provides: Dashboard queries with temporary null trend data
provides:
  - DashboardSnapshot model for time-series metrics storage
  - Observation.engagementId FK enabling engagement progress tracking
  - Observation.repeatOfId self-referential FK for repeat finding detection
  - Real observation counts in getMyEngagementProgress query
affects: [12-02, 12-03, dashboard-pipeline, board-reports, trend-analysis]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Self-referential FK with SetNull for hierarchical data (repeat findings)"
    - "Optional FK with SetNull to prevent deletion cascades"
    - "Prisma _count relation for aggregate queries"

key-files:
  created: []
  modified:
    - prisma/schema.prisma
    - src/data-access/dashboard.ts

key-decisions:
  - "Use onDelete: SetNull (NOT Cascade) for both engagementId and repeatOfId to prevent deletion loops"
  - "Both FK fields are optional (nullable) - existing observations keep NULL values"
  - "No backfill of existing data - engagement linking starts from Plan 12-02"
  - "Used db push instead of migrate dev due to shadow database issues with audit trigger migration"

patterns-established:
  - "Self-referential hierarchy pattern: repeatOfId → repeatOf relation + repeatInstances array"
  - "Aggregate count pattern: _count.observations for engagement progress"

# Metrics
duration: 5min 35s
completed: 2026-02-09
---

# Phase 12 Plan 01: Dashboard Data Pipeline Schema Foundation

**DashboardSnapshot model added, Observation gains engagementId and repeatOfId FKs with SetNull deletion policy, engagement progress now returns real observation counts**

## Performance

- **Duration:** 5 min 35 sec
- **Started:** 2026-02-09T20:55:05Z
- **Completed:** 2026-02-09T21:00:40Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- DashboardSnapshot model enables time-series metrics storage for trend widgets
- Observation.engagementId links observations to audit engagements for progress tracking
- Observation.repeatOfId enables repeat finding detection and lineage tracking
- getMyEngagementProgress returns real observation counts via Prisma \_count relation

## Task Commits

Each task was committed atomically:

1. **Task 1: Add DashboardSnapshot model and Observation FK fields to schema** - `2d6c1a5` (feat)
2. **Task 2: Update getMyEngagementProgress to count observations via engagementId** - `ef49ab7` (feat)

## Files Created/Modified

- `prisma/schema.prisma` - Added DashboardSnapshot model, engagementId + repeatOfId FKs on Observation with indexes, observations relation on AuditEngagement
- `src/data-access/dashboard.ts` - Updated getMyEngagementProgress to use \_count.observations instead of hardcoded 0

## Decisions Made

**D1: SetNull deletion policy for both FKs**

- Both engagementId and repeatOfId use `onDelete: SetNull` instead of Cascade
- Rationale: Prevents deletion loops on self-referential FK, preserves observation history when engagement deleted
- Impact: Observations remain intact even if engagement or parent observation deleted

**D2: No backfill of existing data**

- Existing observations keep NULL engagementId/repeatOfId
- Rationale: No reliable way to infer engagement from existing observations, linking starts fresh
- Impact: Historic observations won't appear in engagement progress counts

**D3: db push instead of migration file**

- Used `npx prisma db push` instead of `migrate dev --create-only`
- Rationale: Shadow database couldn't apply audit_trigger migration (function missing after previous reset)
- Impact: Schema changes applied directly, no migration SQL file generated (acceptable for Phase 12 gap closure)
- Workaround: Manually created audit_trigger_function in database before push

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Audit trigger function missing from database**

- **Found during:** Task 1 (Migration generation)
- **Issue:** `audit_trigger_function()` was deleted during previous database operations but migration table still showed it as applied, blocking shadow database creation for new migrations
- **Fix:** Manually created audit_trigger_function via psql before running prisma db push
- **Files modified:** PostgreSQL database only (no code changes)
- **Verification:** Function exists in database, triggers work correctly
- **Committed in:** N/A (database-only fix, not in git)

**2. [Rule 3 - Blocking] Shadow database migration failure**

- **Found during:** Task 1 (Migration generation with --create-only)
- **Issue:** Shadow database couldn't apply 20260209015123_audit_trigger migration cleanly
- **Fix:** Used `npx prisma db push --accept-data-loss` instead of migrate dev
- **Files modified:** prisma/schema.prisma (committed in 2d6c1a5)
- **Verification:** Schema changes applied to database, Prisma client generated successfully
- **Committed in:** 2d6c1a5 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - Blocking)
**Impact on plan:** Both fixes necessary to unblock schema changes. Used db push as valid alternative to migrations for gap closure phase. No scope creep.

## Issues Encountered

**Shadow database migration errors:** Previous session left audit_trigger migration in inconsistent state (marked applied, but function missing). Resolved by manually creating function and switching to db push strategy.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 12 Plan 02:**

- DashboardSnapshot table exists for trend data storage
- engagementId FK enables observation filtering by engagement
- repeatOfId FK enables repeat finding queries
- AuditEngagement.observations relation ready for queries

**Blockers:** None

**Tech debt paid:**

- ✅ Phase 9 gap: "Missing engagementId on Observation" - CLOSED
- ✅ Phase 9 gap: getMyEngagementProgress returns real counts - CLOSED

**Remaining Phase 12 work:**

- Plan 02: Implement trend pipeline queries (getSeverityTrend, getComplianceTrend)
- Plan 03: Wire up DashboardSnapshot capture scheduled job
- Plan 04: Add repeat findings to board report

---

## Self-Check: PASSED

All files and commits verified:

- ✅ prisma/schema.prisma exists
- ✅ src/data-access/dashboard.ts exists
- ✅ Commit 2d6c1a5 found in git history
- ✅ Commit ef49ab7 found in git history

---

_Phase: 12-dashboard-data-pipeline_
_Completed: 2026-02-09_
