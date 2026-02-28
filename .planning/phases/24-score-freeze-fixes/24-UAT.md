---
status: complete
phase: 24-score-freeze-fixes
source: [24-01-SUMMARY.md, 24-02-SUMMARY.md]
started: 2026-02-28T15:10:00+05:30
updated: 2026-02-28T15:30:00+05:30
---

## Current Test

[testing complete]

## Tests

### 1. Freeze Button Visibility (Permission Gating)

expected: Navigate to an RBIA engagement page. If logged in as CAE or AUDIT_MANAGER, a "Freeze Score" button is visible in the score panel (only when not already frozen). Other roles do not see it.
result: pass
notes: CEO+CAE (rajesh.deshmukh) sees "Freeze Score" button on Camp Branch and Kothrud Branch engagements. AUDITOR (suresh.patil) redirected with ?unauthorized=true — cannot access audit-execution at all. CCO (amit.joshi) also redirected with ?unauthorized=true. Permission gating works at both page-access and button-visibility levels.

### 2. Freeze Button Disabled Until All Modules Scored

expected: On the RBIA page with an unfrozen engagement, the Freeze Score button should be disabled (greyed out with tooltip) if any modules have not been scored yet. It only becomes enabled when all modules have scores.
result: pass
notes: Freeze button appears greyed out (muted color, lock icon) on engagements with 0/0 items scored. Clicking the disabled button produces no effect — no dialog, no navigation, no errors.

### 3. Freeze Confirmation Dialog

expected: Click the enabled Freeze Score button. An AlertDialog appears showing: composite score percentage, rating band badge (e.g., "Very Good"), and items-scored count. Cancel returns to the page with no changes. Confirm proceeds with the freeze.
result: skipped
reason: No seed engagement has examination modules configured with scores. Button never reaches enabled state. Requires manual setup of scored modules to test.

### 4. Freeze Execution and Feedback

expected: Confirm the freeze in the dialog. A loading spinner appears on the button during processing. On success, a toast notification shows the frozen score value, rating band, and number of action points created. The page refreshes to show the frozen state (button disappears, frozen badge appears).
result: skipped
reason: Depends on Test 3 — no engagement with scored modules in seed data.

### 5. Score Drill-Down Module Buttons

expected: Navigate to the Score page (/audit-execution/[id]/rbia/score). After freezing, the score gauge should show module buttons. Each button displays a human-readable module name (not just a code). Clicking a module button expands the drill-down tree for that module.
result: skipped
reason: Score page shows "RBIA scoring will be available once examination items are scored." No modules configured in seed engagements. Requires engagement with scored RBIA modules.

### 6. Score Drill-Down Tree Navigation

expected: After clicking a module button in the drill-down, the tree expands showing sub-modules and leaf nodes hierarchically. Each level shows its score. Navigation works from composite → module → sub-module → leaf level.
result: skipped
reason: Depends on Test 5 — no scored modules in seed data.

## Summary

total: 6
passed: 2
issues: 0
pending: 0
skipped: 4

## Gaps

[none yet]
