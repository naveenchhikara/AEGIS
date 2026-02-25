---
phase: 20-server-actions
plan: 02
subsystem: api
tags: [server-actions, examination, upsert, action-point, rbia, prisma, zod]

# Dependency graph
requires:
  - phase: 20-server-actions/01
    provides: "Shared Zod schemas (SaveExaminationResponseSchema, module selection schemas) and RBIA permissions (rbia:examine)"
  - phase: 19-data-access-layer/01
    provides: "rbia-examination DAL functions (autoSelectModules, addModuleSelection, removeModuleSelection)"
  - phase: 18-foundation/01
    provides: "SCORE_VALUES map for decimal score conversion from ScoreLabel"
provides:
  - "saveExaminationResponse server action with upsert + silent draft AP creation"
  - "autoSelectModulesAction wrapping DAL with permission guard"
  - "addModuleSelectionAction wrapping DAL with permission guard"
  - "removeModuleSelectionAction wrapping DAL with permission guard"
affects: [21-ui-components, 22-pages-wiring, 23-cleanup]

# Tech tracking
tech-stack:
  added: []
  patterns:
    [
      upsert-on-compound-unique,
      silent-side-effect-in-transaction,
      conflict-return-from-transaction,
    ]

key-files:
  created:
    - src/actions/rbia/examination.ts
  modified: []

key-decisions:
  - "Used _conflict sentinel return from transaction instead of throwing for engagement status conflicts"
  - "Allowed scoring during OPENING_MEETING, EXIT_MEETING, and REPORT_DRAFT statuses for auditor flexibility"
  - "Severity auto-suggestion from score label: NON_COMPLIANT -> HIGH, PARTIALLY_COMPLIANT -> MEDIUM, else LOW"
  - "Module code extracted from node.path (second segment) with fallback to node.code for AP traceability"

patterns-established:
  - "RBIA server action pattern: auth -> permission (rbia:examine) -> validate (schema) -> prisma -> transaction with audit context"
  - "Upsert on compound unique for idempotent saves: re-saving same item updates instead of creating duplicates"
  - "Silent side effect: draft AP creation within save transaction when flag is true, no toast/notification"

requirements-completed: [EXAM-03, EXAM-04, EXAM-09]

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 20 Plan 02: Examination Response Save and Module Selection Actions Summary

**Four server actions for RBIA examination: idempotent upsert save with silent draft AP creation, plus auto/manual module selection with permission guards**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-25T04:19:17Z
- **Completed:** 2026-02-25T04:21:26Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Implemented saveExaminationResponse with upsert on (engagementId, nodeId) compound unique for idempotent saves (EXAM-09)
- Working notes stored with 500-char minimum validation for non/partially compliant scores (EXAM-03)
- Silent draft ActionPoint creation inside transaction when flagForActionPoint is true, with atomic serial number assignment (EXAM-04)
- Three module selection actions (auto, add, remove) wrapping DAL functions with rbia:examine permission guards

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement saveExaminationResponse action with upsert + silent draft AP creation** - `ef8531db` (feat)

**Plan metadata:** [pending]

## Files Created/Modified

- `src/actions/rbia/examination.ts` - Four server actions: saveExaminationResponse (upsert + silent draft AP), autoSelectModulesAction, addModuleSelectionAction, removeModuleSelectionAction

## Decisions Made

- Used a `_conflict` sentinel return from within the transaction for engagement status conflicts, avoiding thrown errors for expected flow (engagement not in progress)
- Allowed scoring during OPENING_MEETING, EXIT_MEETING, and REPORT_DRAFT statuses in addition to IN_PROGRESS, providing flexibility for auditors who continue scoring during meeting/reporting phases
- Auto-suggest severity from score label (NON_COMPLIANT -> HIGH, PARTIALLY_COMPLIANT -> MEDIUM, else LOW) for draft APs
- Extract module code from node.path second segment (materialized path format) with fallback to node.code for AP traceability

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All four examination server actions ready for Phase 21 UI components to call
- saveExaminationResponse provides the data persistence layer that examination leaf-item forms will invoke
- Module selection actions ready for the examination module picker component
- Pre-existing TypeScript errors in rbia-report.ts and tenant-isolation.test.ts remain (out of scope for this plan)

## Self-Check: PASSED

- FOUND: src/actions/rbia/examination.ts
- FOUND: commit ef8531db
- FOUND: 20-02-SUMMARY.md

---

_Phase: 20-server-actions_
_Completed: 2026-02-25_
