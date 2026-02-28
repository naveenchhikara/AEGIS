---
phase: 24-score-freeze-fixes
plan: 01
subsystem: ui
tags: [react, alertdialog, useTransition, radix-ui, rbia, freeze, server-action]

# Dependency graph
requires:
  - phase: 20-server-actions
    provides: freezeRbiaScore server action (338-line implementation with 6-step transaction)
  - phase: 21-rbia-pages
    provides: RbiaScorePanel component with disabled freeze button placeholder
provides:
  - Wired freeze button in RbiaScorePanel calling freezeRbiaScore server action
  - AlertDialog confirmation with score summary preview before irreversible freeze
  - Permission-gated visibility (rbia:score_freeze) and all-modules-scored enable condition
  - Toast feedback (success with score/band/AP count, error with server message)
affects: [24-02, 25-module-management, 26-evidence-upload]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useTransition for server action pending state with button spinner"
    - "AlertDialog confirmation for irreversible actions with data preview"
    - "Permission-gated button visibility via canFreeze boolean prop from server page"

key-files:
  created: []
  modified:
    - src/components/rbia/rbia-score-panel.tsx
    - src/app/(dashboard)/audit-execution/[engagementId]/rbia/page.tsx

key-decisions:
  - "canFreeze prop computed server-side via hasPermission and passed as boolean -- avoids client-side permission logic"
  - "Button visibility gated by canFreeze AND !isFrozen; enable state gated by allModulesScored -- separate concerns for permission vs readiness"
  - "Destructured compositeScore/ratingBand in handleFreeze as cs/rb to avoid shadowing component-level compositeScore variable"

patterns-established:
  - "Permission-gated UI: server page computes boolean prop, client component uses for conditional rendering"
  - "Irreversible action flow: Button -> AlertDialog with data preview -> useTransition pending -> toast feedback -> router.refresh()"

requirements-completed: [EXAM-10]

# Metrics
duration: 4min
completed: 2026-02-28
---

# Phase 24 Plan 01: Freeze Button Wiring Summary

**Wired RbiaScorePanel freeze button to freezeRbiaScore server action with AlertDialog confirmation, permission gating, useTransition pending state, and toast feedback**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-28T09:38:17Z
- **Completed:** 2026-02-28T09:42:43Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Freeze button now calls the 338-line freezeRbiaScore server action, completing the end-to-end EXAM-10 requirement
- AlertDialog confirmation shows composite score percentage, rating band badge, and items-scored count before irreversible freeze
- Permission gating ensures only CAE and AUDIT_MANAGER roles see the freeze button (rbia:score_freeze permission)
- Post-freeze toast displays frozen score, rating band, and action point count; router.refresh() updates server state

## Task Commits

Each task was committed atomically:

1. **Task 1: Add engagementId and canFreeze props** - `0cf96761` (feat)
2. **Task 2: Wire freeze button with AlertDialog, useTransition, toast** - `744554e8` (feat)

## Files Created/Modified

- `src/components/rbia/rbia-score-panel.tsx` - Added imports (useState, useTransition, useRouter, toast, freezeRbiaScore, AlertDialog, Loader2), freeze state/handler, permission-gated button with tooltip, AlertDialog with score summary preview
- `src/app/(dashboard)/audit-execution/[engagementId]/rbia/page.tsx` - Added hasPermission import, computed canFreeze boolean, passed engagementId and canFreeze props to RbiaScorePanel

## Decisions Made

- **canFreeze computed server-side:** The boolean is computed in the server page via `hasPermission(session.user.roles, "rbia:score_freeze")` and passed as a prop. This avoids exposing permission logic to the client and follows the existing pattern from layout.tsx.
- **Separate visibility vs enable conditions:** `canFreeze && !isFrozen` controls button visibility (permission + state gate), while `allModulesScored` controls the enabled/disabled state (readiness gate). This provides clear UX -- the button is either invisible (no permission/already frozen) or visible but disabled (modules incomplete).
- **Destructured result as cs/rb:** In `handleFreeze`, the server action result's `compositeScore` and `ratingBand` are destructured with aliases to avoid shadowing the component-level variables of the same name.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Freeze button is fully wired, completing EXAM-10 requirement
- Plan 24-02 (TS error fix + orphan cleanup) can proceed independently
- Phase 25 (manual module management) and Phase 26 (evidence upload) are unblocked

---

_Phase: 24-score-freeze-fixes_
_Completed: 2026-02-28_
