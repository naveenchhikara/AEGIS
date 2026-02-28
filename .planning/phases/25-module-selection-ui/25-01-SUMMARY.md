---
phase: 25-module-selection-ui
plan: 01
subsystem: api
tags: [prisma, rbia, zod, server-actions, dal, module-selection, audit-trail]

# Dependency graph
requires:
  - phase: 24-score-freeze-fixes
    provides: BranchRbiaScore freeze infrastructure and ExaminationResponse model
  - phase: 19-data-access-layer
    provides: rbia-examination.ts DAL with removeModuleSelection/addModuleSelection/getApplicableModules

provides:
  - EngagementModuleSelection.removalReason field in Prisma schema
  - RemoveModuleSelectionSchema with required reason field (min 1, max 500 chars)
  - getAllModules DAL function returning all active depth-1 ExaminationNode rows
  - removeModuleSelection DAL with reason parameter (API contract)
  - removeModuleSelectionAction with scored-items guard (CONFLICT on existing responses)
  - Audit trail: removal reason stored as setAuditContext justification

affects:
  - 25-02 (UI components for add/remove module dialog that consume these endpoints)
  - 26-evidence-upload (shares rbia-examination DAL file)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Materialized path prefix query for descendant leaf lookup (path: { startsWith: moduleNode.path + "." })
    - Scored-items guard pattern: count responses for leaf descendants before allowing destructive operations
    - Audit context with justification field for ENGG-06 compliance
    - DAL reason parameter accepted for API contract even when inline transaction handles audit

key-files:
  created: []
  modified:
    - prisma/schema.prisma
    - src/actions/rbia/schemas.ts
    - src/data-access/rbia-examination.ts
    - src/actions/rbia/examination.ts

key-decisions:
  - "Approach A for removalReason: keep DAL delete(), pass reason to setAuditContext justification inside transaction — simpler than soft-delete and reason is captured in audit log"
  - "Scored-items guard uses materialized path prefix (path: startsWith) to find leaf descendants — O(n) lookup consistent with tree architecture"
  - "Delete moved inline into db.$transaction with setAuditContext to ensure audit context is set atomically with the delete — avoids race condition risk"
  - "getAllModules returns all active depth-1 nodes (no branch type filter) for Add Module dialog — callers filter selected vs unselected in UI"

patterns-established:
  - "Scored-items guard before destructive module operations: count ExaminationResponse for leaf descendants"
  - "Audit trail for removals: setAuditContext with justification=reason inside same transaction as delete"

requirements-completed: [ENGG-06]

# Metrics
duration: 4min
completed: 2026-02-28
---

# Phase 25 Plan 01: Backend Extensions for Module Management Summary

**removalReason Prisma field + RequireModuleSelectionSchema reason field + scored-items guard that blocks module removal when ExaminationResponse rows exist for the module's leaf descendants**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-28T10:47:40Z
- **Completed:** 2026-02-28T10:51:17Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `removalReason String? @db.Text` to `EngagementModuleSelection` model and regenerated Prisma client
- Extended `RemoveModuleSelectionSchema` with required `reason` field (min 1, max 500 chars) per ENGG-06 audit trail requirement
- Created `getAllModules` DAL returning all active depth-1 nodes regardless of branch type for Add Module dialog
- Updated `removeModuleSelection` DAL signature to accept `reason` parameter for API contract
- Implemented scored-items guard in `removeModuleSelectionAction` using materialized path prefix lookup + `examinationResponse.count`
- Wired removal reason into `setAuditContext(justification)` inside `db.$transaction` — atomic audit trail

## Task Commits

Each task was committed atomically:

1. **Task 1: Add removalReason to schema, extend Zod schema, create getAllModules DAL** - `2a2a1dab` (feat)
2. **Task 2: Add scored-items guard and reason audit context to removeModuleSelectionAction** - `b9c26560` (feat)

## Files Created/Modified

- `prisma/schema.prisma` - Added `removalReason String? @db.Text` to `EngagementModuleSelection` model
- `src/actions/rbia/schemas.ts` - Added `reason: z.string().min(1).max(500)` to `RemoveModuleSelectionSchema`
- `src/data-access/rbia-examination.ts` - Updated `removeModuleSelection` signature + added `getAllModules` function
- `src/actions/rbia/examination.ts` - Full replacement of `removeModuleSelectionAction` with scored-items guard and audit context

## Decisions Made

- **Approach A for removalReason field**: Keep delete(), record reason via `setAuditContext(justification)` — simpler than soft-delete (true soft-delete would require `removedAt` field, filtered queries everywhere). The `removalReason` Prisma field exists for future use (schema is additive).
- **Scored-items guard via materialized path**: `path: { startsWith: moduleNode.path + "." }` to find all leaf descendants — consistent with the tree architecture used throughout v6.0.
- **Inline transaction for delete**: Moved delete from DAL call to `db.$transaction` inside the server action — ensures `setAuditContext` and delete are atomic, no race condition.
- **Removed `removeModuleSelection` DAL import** from the server action since delete now happens inline in the transaction. The DAL function is still exported for other potential callers.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Moved delete inline into transaction instead of calling DAL**

- **Found during:** Task 2 (scored-items guard + audit context implementation)
- **Issue:** The plan spec called for `setAuditContext` then `removeModuleSelection(session, ...)`. But `setAuditContext` requires a Prisma transaction client (`tx.$executeRaw`), not the regular `db` client. The DAL `removeModuleSelection` doesn't accept a transaction. Calling `setAuditContext` outside a transaction means the session variable might not be visible when the delete audit trigger fires.
- **Fix:** Moved the delete into a `db.$transaction(async (tx) => { setAuditContext(tx); tx.engagementModuleSelection.delete(); })` block. The `removeModuleSelection` DAL still exists for other callers with its `reason` parameter but isn't called from this action.
- **Files modified:** `src/actions/rbia/examination.ts`
- **Verification:** TypeScript compiles cleanly; audit context and delete are now atomic.
- **Committed in:** `b9c26560` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug: audit context not transactionally safe without inline tx)
**Impact on plan:** Fix required for correctness/audit-trail integrity. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviation above.

## User Setup Required

None — no external service configuration required. Schema changes (`removalReason` field) will be applied via `prisma db push` at deploy time.

## Next Phase Readiness

- All backend endpoints ready for Phase 25 Plan 02 UI consumption
- `getAllModules` available for Add Module dialog
- `addModuleSelectionAction` already had `reason` field (unchanged)
- `removeModuleSelectionAction` now requires `reason` field — Plan 02 UI must provide this
- TypeScript compiles cleanly; 3 pre-existing errors unrelated to this plan

## Self-Check: PASSED

- prisma/schema.prisma — FOUND (removalReason field present)
- src/actions/rbia/schemas.ts — FOUND (reason field in RemoveModuleSelectionSchema)
- src/data-access/rbia-examination.ts — FOUND (getAllModules exported, removeModuleSelection updated)
- src/actions/rbia/examination.ts — FOUND (scored-items guard present)
- 25-01-SUMMARY.md — FOUND
- Commit 2a2a1dab — FOUND (Task 1)
- Commit b9c26560 — FOUND (Task 2)

---

_Phase: 25-module-selection-ui_
_Completed: 2026-02-28_
