---
phase: 20-server-actions
plan: 04
subsystem: api
tags:
  [
    server-actions,
    action-points,
    findings,
    prisma,
    rbia,
    observations,
    bm-response,
  ]

# Dependency graph
requires:
  - phase: 20-01
    provides: "Shared Zod schemas (CreateActionPointSchema, PromoteToObservationSchema, SubmitBmResponseSchema) and RBIA permissions"
  - phase: 18-foundation
    provides: "ActionPoint, BmResponseBatch Prisma models, ActionPointStatus enum, sourceActionPointId on Observation"
  - phase: 19-data-access-layer
    provides: "rbia-findings DAL with getEngagementFindings, ActionPointData types"
provides:
  - "createActionPoint server action with atomic serial number assignment"
  - "updateActionPoint server action with DRAFT-only edit guard"
  - "deleteActionPoint server action with DRAFT-only deletion guard"
  - "promoteToObservation server action creating formal 5C Observation with sourceActionPointId link"
  - "submitBmResponse server action for BM_RESPONDED transition with batch counter increment"
affects: [22-ui-components, 23-cleanup]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ActionPoint CRUD actions with status-based lifecycle guards"
    - "Atomic serial number assignment via _max+1 inside $transaction"
    - "Permission split: action_point:manage vs action_point:bm_respond"
    - "Dual error code mapping: NOT_FOUND for missing entities, CONFLICT for wrong status"

key-files:
  created:
    - src/actions/rbia/findings.ts
  modified: []

key-decisions:
  - "Both tasks implemented in a single commit since they modify only one file — all five actions are cohesive"
  - "Engagement status guard allows AP creation during IN_PROGRESS, EXIT_MEETING, and REPORT_DRAFT phases"
  - "promoteToObservation uses engagement.branchId with AP.branchId as fallback for Observation.branchId"

patterns-established:
  - "RBIA findings action pattern: auth -> permission -> validate -> transaction(audit context + business logic) -> revalidate -> typed ActionResult"
  - "DRAFT-only guard pattern: findFirst with tenant check, then status !== DRAFT throws CONFLICT"

requirements-completed: [FIND-01, FIND-02, FIND-03, FIND-06]

# Metrics
duration: 4min
completed: 2026-02-25
---

# Phase 20 Plan 04: Findings Server Actions Summary

**Five ActionPoint lifecycle actions: create (atomic serial), update/delete (DRAFT-only), promote-to-observation (sourceActionPointId link), BM response (status transition + batch counter)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-25T04:18:42Z
- **Completed:** 2026-02-25T04:22:38Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Implemented createActionPoint with atomic serial number assignment via `_max + 1` inside `$transaction`, engagement status validation, and source response traceability (FIND-01, FIND-06)
- Implemented updateActionPoint and deleteActionPoint with DRAFT-only lifecycle guards preventing modification of issued/responded APs
- Implemented promoteToObservation creating formal 5C Observation linked back via `sourceActionPointId` while preserving the source ActionPoint (FIND-03)
- Implemented submitBmResponse transitioning ISSUED/BM_RESPONSE_DUE APs to BM_RESPONDED with `BmResponseBatch` counter increment (FIND-02)
- Enforced permission split: `action_point:manage` for LEAD_AUDITOR CRUD/promote, `action_point:bm_respond` for BRANCH_HEAD responses

## Task Commits

Each task was committed atomically:

1. **Task 1+2: Implement all five findings server actions** - `36726c62` (feat)

## Files Created/Modified

- `src/actions/rbia/findings.ts` - Five exported server actions: createActionPoint, updateActionPoint, deleteActionPoint, promoteToObservation, submitBmResponse. All use `"use server"` directive, session-based auth, Zod validation, audit context, and typed ActionResult returns.

## Decisions Made

- Combined Tasks 1 and 2 into a single commit since they both create/modify the same file (`findings.ts`) and the five actions form a cohesive unit
- Engagement status guard allows AP creation during IN_PROGRESS, EXIT_MEETING, and REPORT_DRAFT (not during PLANNED, TEAM_ASSIGNED, or OPENING_MEETING)
- promoteToObservation uses `engagement.branchId` with `ap.branchId` as fallback for the new Observation's branchId
- BmResponseBatch counter increment is conditional (only if batch exists) to handle cases where batch hasn't been created yet

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - pre-existing TypeScript errors in `rbia-report.ts` and `tenant-isolation.test.ts` were confirmed unrelated to this plan's changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All five findings actions ready for Phase 22 UI integration (action point list, create/edit forms, promote dialog, BM response form)
- Remaining Phase 20 plan (20-05) can proceed independently
- The `sourceActionPointId` field on Observation is correctly used, enabling promote-to-observation traceability in UI

## Self-Check: PASSED

- [x] `src/actions/rbia/findings.ts` exists
- [x] `20-04-SUMMARY.md` exists
- [x] Commit `36726c62` exists in git log

---

_Phase: 20-server-actions_
_Completed: 2026-02-25_
