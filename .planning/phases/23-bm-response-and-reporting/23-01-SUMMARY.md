---
phase: 23-bm-response-and-reporting
plan: 01
subsystem: ui
tags: [react, next.js, prisma, rbia, branch-manager, action-points, shadcn]

# Dependency graph
requires:
  - phase: 20-server-actions
    provides: submitBmResponse server action and action_point:bm_respond permission
  - phase: 18-foundation
    provides: ActionPoint, BmResponseBatch, Evidence models in Prisma schema
  - phase: 19-data-access-layer
    provides: rbia-findings DAL patterns and ActionPointData type
provides:
  - BM response page at /auditee/[engagementId]/action-points/ with auth guard
  - rbia-bm-response.ts DAL with getBmResponseBatchForEngagement
  - BmDeadlineBanner component with green/amber/red urgency tiers
  - BmResponseApCard component with inline textarea and evidence zone
  - BmBatchSubmitModal component with review summary table
  - Evidence.actionPointId FK for BM response attachments
affects: [23-bm-response-and-reporting, 22-audit-execution-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    [
      BM response page pattern with server/client split,
      DAL-to-client-component state flow,
    ]

key-files:
  created:
    - src/data-access/rbia-bm-response.ts
    - src/app/(dashboard)/auditee/[engagementId]/action-points/page.tsx
    - src/app/(dashboard)/auditee/[engagementId]/action-points/bm-response-page-client.tsx
    - src/components/rbia/bm-deadline-banner.tsx
    - src/components/rbia/bm-response-ap-card.tsx
    - src/components/rbia/bm-batch-submit-modal.tsx
  modified:
    - prisma/schema.prisma

key-decisions:
  - "AuditPlan has year+quarter, not planName — built human-readable label from year + quarter enum"
  - "Evidence upload buttons present but disabled — full S3 presigned upload wiring deferred to integration phase"
  - "Client page wrapper (bm-response-page-client.tsx) manages response state as Record<string, string> for batch submission"

patterns-established:
  - "BM response page: server page (auth guard + DAL) -> client wrapper (state + submit) -> presentational components"
  - "Deadline banner urgency: >7d green, 3-7d amber, <48h red, OVERDUE red+badge"

requirements-completed: [BMRP-05]

# Metrics
duration: 15min
completed: 2026-02-25
---

# Phase 23 Plan 01: BM Response Page Summary

**Branch Manager response page with deadline countdown banner, per-AP inline response cards, and batch review/submit modal using Phase 20 submitBmResponse server action**

## Performance

- **Duration:** 15 min
- **Started:** 2026-02-25T04:44:36Z
- **Completed:** 2026-02-25T04:59:30Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Created BM response DAL function with tenant-isolated batch + action point queries
- Built server page at `/auditee/[engagementId]/action-points/` with `action_point:bm_respond` permission guard
- Implemented deadline countdown banner with green/amber/red urgency color coding
- Built per-AP response card with expand/collapse, inline textarea, and evidence upload zone
- Created batch submit review modal with summary table and confirm/cancel flow
- Added Evidence.actionPointId FK and ActionPoint.evidence reverse relation to schema

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BM response DAL function + server page** - `14c131aa` (feat)
2. **Task 2: Create BM response components** - `53ba45de` (feat)

## Files Created/Modified

- `prisma/schema.prisma` - Added actionPointId FK on Evidence, evidence relation on ActionPoint
- `src/data-access/rbia-bm-response.ts` - DAL: getBmResponseBatchForEngagement with batch + AP loading
- `src/app/(dashboard)/auditee/[engagementId]/action-points/page.tsx` - Server page with auth guard
- `src/app/(dashboard)/auditee/[engagementId]/action-points/bm-response-page-client.tsx` - Client state wrapper
- `src/components/rbia/bm-deadline-banner.tsx` - Sticky deadline countdown with urgency colors (84 lines)
- `src/components/rbia/bm-response-ap-card.tsx` - Per-AP card with inline response form (193 lines)
- `src/components/rbia/bm-batch-submit-modal.tsx` - Review summary modal with confirm (170 lines)

## Decisions Made

- **AuditPlan label:** AuditPlan model has `year` + `quarter` fields (not `planName`). Built human-readable label like "2026 Q1 (Apr-Jun)" from these fields.
- **Evidence upload:** Upload buttons are rendered but disabled. Full S3 presigned URL wiring requires integration with server actions for evidence creation — deferred to integration phase.
- **Client state pattern:** Used `Record<string, string>` for response tracking instead of `Map` for simpler JSON serialization between server and client.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed AuditPlan.planName field reference**

- **Found during:** Task 1 (DAL function)
- **Issue:** Plan specified `auditPlan: { select: { planName } }` but AuditPlan model has `year` + `quarter`, not `planName`
- **Fix:** Changed select to `{ year: true, quarter: true }` and built human-readable label from year + quarter enum
- **Files modified:** src/data-access/rbia-bm-response.ts
- **Verification:** TypeScript compiles cleanly
- **Committed in:** 14c131aa (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor schema field name correction. No scope creep.

## Issues Encountered

None — both tasks executed smoothly after the planName field fix.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- BM response page ready for visual verification once engagement + batch data exists
- Evidence upload buttons present but need S3 server action wiring in future integration
- Existing `bm-response-panel.tsx` (from parallel phase) also imports from rbia-bm-response DAL — compatible

---

## Self-Check: PASSED

All 7 created files verified on disk. Both task commits (14c131aa, 53ba45de) verified in git log.

---

_Phase: 23-bm-response-and-reporting_
_Completed: 2026-02-25_
