---
phase: 19-data-access-layer
plan: "03"
subsystem: database
tags: [prisma, dal, rbia, action-points, observations, carry-forward, findings]

requires:
  - phase: 18-foundation
    provides: ActionPoint and Observation models, ExaminationNode, ExaminationResponse, AuditEngagement schema

provides:
  - getEngagementFindings() returning two typed arrays (actionPoints + observations) plus carry-forward APs
  - getEngagementActionPoints() with source link (node.code/path/name) and BM response inline
  - getEngagementObservations() for formal 5C findings per engagement
  - getCarryForwardActionPoints() from preceding COMPLETED engagement

affects:
  - 20-server-actions
  - 22-audit-execution-ui

tech-stack:
  added: []
  patterns:
    - "Carry-forward detection: preceding COMPLETED engagement via findFirst orderBy completionDate desc"
    - "Status mapping: OPEN → ISSUED + BM_RESPONSE_DUE, PARTIALLY_RESOLVED → BM_RESPONDED"
    - "Parallel Promise.all() for unified findings query"

key-files:
  created:
    - src/data-access/rbia-findings.ts

key-decisions:
  - "Two typed arrays (actionPoints[] + observations[]) — not discriminated union — maps to Phase 22 separate tabs"
  - "Carry-forward uses ISSUED + BM_RESPONSE_DUE + BM_RESPONDED (mapped from OPEN + PARTIALLY_RESOLVED in CONTEXT.md)"
  - "carriedForwardToEngagementId: null excludes APs already forwarded to another engagement"
  - "branchId null guard returns empty array (AuditEngagement.branchId is String?)"

requirements-completed:
  - FIND-05

duration: 8min
completed: 2026-02-23
---

# Phase 19 Plan 03: RBIA Findings DAL Summary

**RBIA findings DAL with four exported functions: unified getEngagementFindings() returning ActionPoints + Observations + carry-forward APs from preceding COMPLETED engagement with source traceability and BM response inline**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-23T00:00:00Z
- **Completed:** 2026-02-23T00:08:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- `getEngagementActionPoints()` with sourceResponse node.code/path/name for "flagged from" breadcrumb display and bmResponseText/Date/Deadline inline
- `getEngagementObservations()` selecting only ObservationData fields (formal 5C findings)
- `getCarryForwardActionPoints()` finding open/unresolved APs from the immediately preceding COMPLETED engagement for the same branch
- `getEngagementFindings()` parallel unified query returning three typed arrays: actionPoints, carryForwardActionPoints, observations

## Task Commits

1. **Task 1: Create rbia-findings.ts** - `e0cd5361` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `src/data-access/rbia-findings.ts` — RBIA findings DAL: ActionPoints + Observations + carry-forward detection (293 lines)

## Decisions Made

- Two typed arrays shape (not discriminated union) maps directly to Phase 22 UI separate tabs for APs and Observations
- Carry-forward status mapping: ISSUED + BM_RESPONSE_DUE = "OPEN", BM_RESPONDED = "PARTIALLY_RESOLVED" — documented in code comment per CONTEXT.md
- Already-forwarded APs excluded via `carriedForwardToEngagementId: null` filter

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Prisma enum import path from `@/generated/prisma` to `@/generated/prisma/enums`**

- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** `@/generated/prisma` has no type declarations; enums are at `@/generated/prisma/enums`
- **Fix:** Updated import to `from "@/generated/prisma/enums"` matching existing DAL files
- **Files modified:** src/data-access/rbia-findings.ts
- **Verification:** `pnpm tsc --noEmit` shows no errors for rbia-findings.ts
- **Committed in:** e0cd5361 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — wrong import path)
**Impact on plan:** Necessary fix, no scope change.

## Issues Encountered

None beyond the import path correction.

## Next Phase Readiness

- `rbia-findings.ts` ready for Phase 20 server actions that create/update ActionPoints and Observations
- Phase 20 needs to add `sourceActionPointId` to Observation schema for promote-to-observation link (documented as TODO in code)
- Phase 22 UI can consume `getEngagementFindings()` directly for separate AP/Observation tabs

---

_Phase: 19-data-access-layer_
_Completed: 2026-02-23_
