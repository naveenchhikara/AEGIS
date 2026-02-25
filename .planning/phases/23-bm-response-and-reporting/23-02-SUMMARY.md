---
phase: 23-bm-response-and-reporting
plan: 02
subsystem: jobs
tags: [pg-boss, cron, email, escalation, rbia, notification]

# Dependency graph
requires:
  - phase: 18-foundation
    provides: BmResponseBatch model, BmBatchStatus enum in Prisma schema
provides:
  - processRbiaOverdueEscalation() cron processor for BmResponseBatch deadline enforcement
  - BmBatchOverdueEmail template for Zonal Auditor notification
  - BM_BATCH_OVERDUE notification type in TEMPLATE_MAP
affects: [23-bm-response-and-reporting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    [
      atomic-transaction-for-status+notification,
      per-tenant-iteration-with-error-isolation,
    ]

key-files:
  created:
    - src/jobs/rbia-overdue-escalation.ts
    - src/emails/templates/bm-batch-overdue-email.tsx
  modified:
    - src/jobs/index.ts
    - src/jobs/notification-processor.ts
    - src/emails/render.ts

key-decisions:
  - "Atomic $transaction per batch wraps status update + notification creation to prevent double-firing"
  - "Added bm-batch-overdue case to render.ts switch for full email pipeline integration"

patterns-established:
  - "RBIA escalation pattern: iterate tenants -> find PENDING past deadline -> atomic transition + notify"

requirements-completed: [BMRP-05]

# Metrics
duration: 6min
completed: 2026-02-25
---

# Phase 23 Plan 02: RBIA Overdue Escalation Summary

**BmResponseBatch overdue cron job with atomic PENDING->OVERDUE transition and Zonal Auditor email notification via NotificationQueue pipeline**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-25T04:16:33Z
- **Completed:** 2026-02-25T04:22:45Z
- **Tasks:** 1
- **Files modified:** 5

## Accomplishments

- Created `processRbiaOverdueEscalation()` cron processor that detects expired BmResponseBatch deadlines and transitions status from PENDING to OVERDUE
- Created `BmBatchOverdueEmail` React Email template with orange-themed alert box, branch details, and CTA button
- Wired escalation into DEADLINE_CHECK job handler (runs daily at 06:00 IST)
- Added BM_BATCH_OVERDUE to TEMPLATE_MAP and render.ts for full notification pipeline integration
- Atomic `$transaction` per batch prevents double-firing: if notification creation fails, status rolls back to PENDING

## Task Commits

Each task was committed atomically:

1. **Task 1: Create RBIA overdue escalation job + email template + wire into pipeline** - `f6f8ff8a` (feat)

## Files Created/Modified

- `src/jobs/rbia-overdue-escalation.ts` - RBIA overdue escalation cron processor with per-tenant iteration and atomic batch transitions
- `src/emails/templates/bm-batch-overdue-email.tsx` - Email template for BM batch overdue notification to Zonal Auditors
- `src/jobs/index.ts` - Added processRbiaOverdueEscalation call inside DEADLINE_CHECK handler
- `src/jobs/notification-processor.ts` - Added BM_BATCH_OVERDUE entry to TEMPLATE_MAP
- `src/emails/render.ts` - Added bm-batch-overdue case to renderEmailTemplate switch with BmBatchOverdueEmail component

## Decisions Made

- Atomic `$transaction` per batch wraps both the status update and notification creation: if notification creation fails, status rolls back to PENDING so batch is retried on next cron run (prevents double-firing as specified in plan)
- Added `bm-batch-overdue` case to `render.ts` switch statement (Rule 2 - missing critical functionality: TEMPLATE_MAP entry alone is not sufficient; the render.ts switch must also handle the template name for email rendering to work)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added bm-batch-overdue to render.ts email template switch**

- **Found during:** Task 1 (Wire into pipeline)
- **Issue:** Plan specified adding to TEMPLATE_MAP in notification-processor.ts but the render.ts switch/case also needs a corresponding entry to resolve the template name to the React Email component
- **Fix:** Added import for BmBatchOverdueEmail and getBmBatchOverdueSubject, plus case "bm-batch-overdue" in the renderEmailTemplate switch
- **Files modified:** src/emails/render.ts
- **Verification:** TypeScript compilation passes, template chain is complete (TEMPLATE_MAP -> renderEmailTemplate -> BmBatchOverdueEmail)
- **Committed in:** f6f8ff8a (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for correctness -- without the render.ts case, BM_BATCH_OVERDUE notifications would fall through to the default throw. No scope creep.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- BM response batch overdue escalation is fully wired into the existing cron + notification pipeline
- Zonal Auditors will receive email notifications when BmResponseBatch deadlines pass
- Ready for other Phase 23 plans that depend on the notification infrastructure

---

_Phase: 23-bm-response-and-reporting_
_Completed: 2026-02-25_

## Self-Check: PASSED

- FOUND: src/jobs/rbia-overdue-escalation.ts
- FOUND: src/emails/templates/bm-batch-overdue-email.tsx
- FOUND: 23-02-SUMMARY.md
- FOUND: commit f6f8ff8a
- FOUND: processRbiaOverdueEscalation in index.ts
- FOUND: BM_BATCH_OVERDUE in notification-processor.ts
- FOUND: bm-batch-overdue in render.ts
