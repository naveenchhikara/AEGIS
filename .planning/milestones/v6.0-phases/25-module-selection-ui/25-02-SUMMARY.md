---
phase: 25-module-selection-ui
plan: "02"
subsystem: ui
tags:
  [
    react,
    shadcn,
    dialog,
    alert-dialog,
    rbia,
    module-management,
    useTransition,
    toast,
  ]

# Dependency graph
requires:
  - phase: 25-module-selection-ui
    provides: "Plan 25-01 backend (removalReason schema, scored-items guard, getAllModules DAL, addModuleSelectionAction, removeModuleSelectionAction)"
  - phase: 24-score-freeze-fixes
    provides: "AlertDialog + useTransition + toast + router.refresh() UI pattern from rbia-score-panel.tsx"
provides:
  - AddModuleDialog: checklist dialog for manually adding modules to RBIA examination with per-module reason fields
  - RemoveModuleAlertDialog: confirmation dialog with reason textarea, scored-items guard warning, auto-selected module risk warning
  - RbiaModuleGrid extended with Add Module button in section header and Trash2 remove icon on each card
  - RBIA page computing canManageModules server-side (status + permission + !isFrozen) and fetching allModules in parallel
affects: [phase-26-evidence-upload, rbia-module-page, rbia-score-panel]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dialog (non-destructive) for multi-select add flow vs AlertDialog for single-item destructive remove"
    - "canManageModules computed server-side and passed as boolean prop to avoid client-side permission logic"
    - "useMemo for Set/Map lookups to avoid O(n) recomputation on every render"
    - "e.preventDefault() + e.stopPropagation() on remove button inside Link to block navigation"
    - "useTransition + Promise.all for parallel multi-module add with per-action result tracking"

key-files:
  created:
    - src/components/rbia/add-module-dialog.tsx
    - src/components/rbia/remove-module-alert-dialog.tsx
  modified:
    - src/components/rbia/rbia-module-grid.tsx
    - src/app/(dashboard)/audit-execution/[engagementId]/rbia/page.tsx

key-decisions:
  - "Dialog (not AlertDialog) for Add Module — it is non-destructive and multi-step (requires reasons per module)"
  - "Promise.all for multi-module add — auditors may select several modules at once; parallel saves are safe since each is an independent upsert"
  - "canManageModules hides controls entirely (not just disables) when falsy — cleaner UX than disabled buttons with tooltips"
  - "Remove button positioned absolutely on the Link element (group relative) so Trash2 icon floats top-right without disrupting card layout"
  - "initialCheckState derived via useMemo with eslint-disable-next-line to allow stable reference across reopens"

patterns-established:
  - "Module management UI pattern: Dialog for add (multi-select + reasons), AlertDialog for remove (confirm + reason + guard)"
  - "Server-computed permission gates: canManageModules, canFreeze passed as boolean props to client components"

requirements-completed: [ENGG-06]

# Metrics
duration: 5min
completed: 2026-02-28
---

# Phase 25 Plan 02: Module Selection UI Summary

**AddModuleDialog (checklist + per-module reasons) and RemoveModuleAlertDialog (scored-items guard + auto-selection warning) completing the ENGG-06 module management UI layer**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-28T10:54:19Z
- **Completed:** 2026-02-28T10:59:12Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- AddModuleDialog: scrollable checklist showing all available modules with pre-checked disabled state for already-selected ones, inline reason textareas for newly-checked modules, parallel save via Promise.all
- RemoveModuleAlertDialog: AlertDialog with risk-profile warning for auto-selected modules, scored-items destructive warning that blocks removal, reason textarea with audit justification
- RbiaModuleGrid: extended with "Examination Modules" section header, AddModuleDialog button, and per-card Trash2 remove icon (absolute positioned, e.preventDefault + e.stopPropagation inside Link)
- RBIA page: added getAllModules to parallel data fetch and computes canManageModules (rbia:examine permission + status in PLANNED/TEAM_ASSIGNED/OPENING_MEETING/IN_PROGRESS + !isFrozen) server-side

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AddModuleDialog and RemoveModuleAlertDialog components** - `bc6962fc` (feat)
2. **Task 2: Extend RbiaModuleGrid with management controls and wire RBIA page** - `e160f4df` (feat)

## Files Created/Modified

- `src/components/rbia/add-module-dialog.tsx` - Checklist Dialog for adding modules with per-module reason fields; uses useTransition + Promise.all + toast (sonner) + router.refresh()
- `src/components/rbia/remove-module-alert-dialog.tsx` - AlertDialog for module removal with reason textarea, scored-items guard warning, and auto-selected risk warning
- `src/components/rbia/rbia-module-grid.tsx` - Extended with allModules/canManageModules props, section header with AddModuleDialog, per-card remove icon, RemoveModuleAlertDialog
- `src/app/(dashboard)/audit-execution/[engagementId]/rbia/page.tsx` - Added getAllModules to parallel fetch, computes canManageModules server-side, passes new props to RbiaModuleGrid

## Decisions Made

- Dialog (not AlertDialog) for Add Module since it is non-destructive and requires per-module reasons (multi-step UX)
- Promise.all for parallel multi-module add — each add is an independent upsert so concurrent saves are safe
- Controls hidden entirely (not just disabled) when canManageModules is false — avoids tooltip clutter on read-only pages
- Remove button absolutely positioned on Link (group relative) so Trash2 floats top-right without disrupting card layout
- initialCheckState uses useMemo with eslint-disable to maintain stable reference (re-initializes when allModules changes, not on every render)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ENGG-06 module management UI fully complete — auditors can add and remove modules from the RBIA examination
- Phase 25 is now complete (both plans done): 25-01 backend + 25-02 UI
- Phase 26 (S3 evidence upload with presigned URLs) can proceed — no dependencies on Phase 25 UI patterns

---

_Phase: 25-module-selection-ui_
_Completed: 2026-02-28_

## Self-Check: PASSED

- FOUND: src/components/rbia/add-module-dialog.tsx
- FOUND: src/components/rbia/remove-module-alert-dialog.tsx
- FOUND: .planning/phases/25-module-selection-ui/25-02-SUMMARY.md
- FOUND commit: bc6962fc (Task 1 - AddModuleDialog + RemoveModuleAlertDialog)
- FOUND commit: e160f4df (Task 2 - RbiaModuleGrid extended + RBIA page wired)
- FOUND commit: 3e2073c0 (metadata - SUMMARY + STATE + ROADMAP)
