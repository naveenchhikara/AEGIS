---
status: complete
phase: 25-module-selection-ui
source: [25-01-SUMMARY.md, 25-02-SUMMARY.md]
started: 2026-02-28T11:10:00Z
updated: 2026-02-28T11:20:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Add Module Button in Grid Header

expected: Navigate to an active RBIA engagement (not frozen). The Examination Modules section shows an "Add Module" button in the header area. The button should only appear for users with rbia:examine permission on engagements in PLANNED/TEAM_ASSIGNED/OPENING_MEETING/IN_PROGRESS status.
result: pass
verified: Code inspection — rbia-module-grid.tsx:113-121 and :135-143 conditionally render AddModuleDialog when canManageModules && allModules. page.tsx:55-66 computes canManageModules = hasPermission(rbia:examine) && allowed status set && !isFrozen.

### 2. Add Module Dialog Shows Available Modules

expected: Clicking "Add Module" opens a dialog with a scrollable checklist. Already-selected modules appear pre-checked and disabled. Unselected modules have empty checkboxes. Checking a new module reveals an inline reason textarea for that module.
result: pass
verified: Code inspection — add-module-dialog.tsx:169-230 maps allModules with Checkbox (disabled when isAlreadySelected), shows "(already selected)" label, ScrollArea wrapper, and inline Textarea only when isNewlyChecked (:207).

### 3. Add Module Saves Successfully

expected: After checking one or more new modules and providing reasons in the textareas, clicking Save adds the modules. A success toast appears. The module grid refreshes to show the newly added module cards.
result: pass
verified: Code inspection — add-module-dialog.tsx:105-142 handleSave uses Promise.all for parallel addModuleSelectionAction calls, toast.success on all succeed, router.refresh() for grid update. Save button gated by saveEnabled (all reasons non-empty).

### 4. Remove Module Icon on Cards

expected: Each module card in the grid shows a trash icon (top-right corner). Clicking the trash icon does NOT navigate to the module page — instead it opens a removal confirmation dialog.
result: pass
verified: Code inspection — rbia-module-grid.tsx:163-182 renders Trash2 button with e.preventDefault() + e.stopPropagation() inside Link element, triggers setRemoveTarget which opens RemoveModuleAlertDialog (:236-244).

### 5. Remove Module Dialog with Reason

expected: The removal dialog shows the module name, requires a non-empty reason textarea, and has a destructive "Remove" button. If the module was auto-selected, a risk-profile warning appears. Submitting with a valid reason removes the module and shows a success toast.
result: pass
verified: Code inspection — remove-module-alert-dialog.tsx:84-91 shows module name and auto-selected risk warning, :104-116 shows reason Textarea (required via canRemove check), :120-127 destructive button. handleRemove calls removeModuleSelectionAction + toast.success + router.refresh().

### 6. Scored-Items Guard Blocks Removal

expected: Attempting to remove a module that has existing scored examination responses shows a destructive warning indicating scored items exist. The Remove button is disabled/blocked — the module cannot be removed while it has scores.
result: pass
verified: Code inspection — remove-module-alert-dialog.tsx:94-101 shows destructive AlertTriangle warning when hasScoredItems. Reason textarea hidden (:104 !hasScoredItems check). Button shows "Cannot Remove" (:126) and is disabled (:123 canRemove=false). Backend double-guard in examination.ts:419-425 returns CONFLICT with scored count.

### 7. Controls Hidden When Frozen or Past Status

expected: On a frozen RBIA engagement (or one past EXIT_MEETING status), the Add Module button and trash remove icons are NOT visible. The grid shows modules in read-only mode.
result: pass
verified: Code inspection — page.tsx:62-66 sets canManageModules=false when isFrozen or status outside allowed set. Grid conditionally renders AddModuleDialog (:115,:137) and Trash2 (:163) only when canManageModules is truthy. TypeScript compilation confirms no errors.

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
