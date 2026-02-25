---
phase: 20-server-actions
plan: 01
subsystem: api
tags: [zod, prisma, rbac, permissions, validation, typescript]

# Dependency graph
requires:
  - phase: 18-foundation
    provides: "ExaminationNode model, ScoreLabel enum, EngagementStatus transitions"
  - phase: 19-data-access-layer
    provides: "DAL functions for RBIA examination, scoring, findings, meetings"
provides:
  - "sourceActionPointId field on Observation model for promote-to-observation link"
  - "4 new RBIA permissions (rbia:examine, rbia:score_freeze, action_point:manage, action_point:bm_respond)"
  - "ActionResult<T> shared return type for all RBIA server actions"
  - "10 Zod validation schemas for RBIA operations"
affects: [20-server-actions, 21-ui-components, 22-ui-pages]

# Tech tracking
tech-stack:
  added: []
  patterns:
    [
      "ActionResult<T> discriminated union for server action returns",
      "superRefine conditional validation for score-dependent fields",
    ]

key-files:
  created:
    - "src/actions/rbia/schemas.ts"
  modified:
    - "prisma/schema.prisma"
    - "src/lib/permissions.ts"

key-decisions:
  - "sourceActionPointId is a loose FK (no Prisma relation) — application-level referential integrity to avoid circular cross-section dependencies"
  - "Working notes validation is conditional via superRefine — 500 char minimum only for PARTIALLY/NON_COMPLIANT scores"

patterns-established:
  - "ActionResult<T> pattern: all RBIA server actions return { success: true, data: T } | { success: false, error: string, code: ActionErrorCode }"
  - "RBIA schemas file is shared (no 'use server') — importable by both server actions and client forms"

requirements-completed: [FIND-03, FIND-06]

# Metrics
duration: 7min
completed: 2026-02-25
---

# Phase 20 Plan 01: Schema, Permissions & Shared Schemas Summary

**sourceActionPointId on Observation model, 4 RBIA permissions mapped to 5 roles, and 10 Zod schemas with ActionResult<T> return type for all Phase 20 server actions**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-25T04:07:56Z
- **Completed:** 2026-02-25T04:14:27Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added `sourceActionPointId` nullable UUID field to Observation model for ActionPoint-to-Observation promotion link
- Registered 4 new RBIA permissions across 5 roles (LEAD_AUDITOR, FIELD_AUDITOR, CAE, AUDIT_MANAGER, BRANCH_HEAD)
- Created comprehensive schemas file with ActionResult<T> discriminated union and 10 Zod validation schemas covering all RBIA operations

## Task Commits

Each task was committed atomically:

1. **Task 1: Add sourceActionPointId to Observation model + regenerate Prisma client** - `da0020a7` (feat)
2. **Task 2: Add four RBIA permissions to permissions.ts + create shared Zod schemas** - `6c3c8719` (feat)

## Files Created/Modified

- `prisma/schema.prisma` - Added sourceActionPointId nullable UUID on Observation model
- `src/lib/permissions.ts` - Added 4 new RBIA permission literals and mapped to correct roles
- `src/actions/rbia/schemas.ts` - New file with ActionResult type, ActionErrorCode union, and 10 Zod schemas

## Decisions Made

- sourceActionPointId uses a loose FK pattern (no Prisma @relation annotation) to avoid circular dependencies between v1.0 Observation section and v6.0 ActionPoint section
- Working notes conditional validation uses Zod superRefine — 500 character minimum enforced only for PARTIALLY_COMPLIANT and NON_COMPLIANT scores, optional for FULLY/LARGELY

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All shared types and schemas ready for import by Phase 20 Plans 02-05 (server action implementations)
- Prisma client regenerated with sourceActionPointId — promoteToObservation action can link back to source ActionPoint
- Permission guards available for all RBIA server actions

---

## Self-Check: PASSED

All files verified present. All commit hashes found in git log.

---

_Phase: 20-server-actions_
_Completed: 2026-02-25_
