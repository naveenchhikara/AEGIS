---
status: complete
phase: 20-server-actions
source:
  [
    20-01-SUMMARY.md,
    20-02-SUMMARY.md,
    20-03-SUMMARY.md,
    20-04-SUMMARY.md,
    20-05-SUMMARY.md,
  ]
started: 2026-02-25T10:30:00Z
updated: 2026-02-28T12:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. RBIA Permissions Registered

expected: 4 new permissions exist in permissions.ts mapped to correct roles — `rbia:examine` (LEAD_AUDITOR, FIELD_AUDITOR), `rbia:score_freeze` (CAE, AUDIT_MANAGER), `action_point:manage` (LEAD_AUDITOR, CAE, AUDIT_MANAGER), `action_point:bm_respond` (BRANCH_HEAD)
result: pass

### 2. Zod Schemas and ActionResult Type

expected: `src/actions/rbia/schemas.ts` exports 10 Zod schemas and ActionResult<T> discriminated union type. File is NOT marked "use server" (shared between server actions and client forms).
result: pass
notes: File actually exports 12 schemas (not 10) — includes AddModuleSelection, RemoveModuleSelection, AutoSelectModules in addition to the core set. No "use server" directive confirmed. ActionResult<T> discriminated union at line 36.

### 3. Save Examination Response (Score + Notes)

expected: With dev server running, call `saveExaminationResponse` with a valid engagementId + nodeId + score. The ExaminationResponse row is upserted. Re-calling with same engagementId+nodeId updates instead of duplicating. Working notes validated (500 char min for PC/NC scores).
result: pass
notes: Upsert on compound unique `engagementId_nodeId` confirmed (examination.ts:121). Schema superRefine enforces 500-char minimum for PARTIALLY_COMPLIANT/NON_COMPLIANT (schemas.ts:54-69). Permission guard `rbia:examine`, engagement status guard via SCORING_ALLOWED_STATUSES.

### 4. Silent Draft ActionPoint on Flag

expected: Call `saveExaminationResponse` with `flagForActionPoint: true`. A DRAFT ActionPoint is created atomically in the same transaction with auto-incremented serial number and severity auto-suggested from score label.
result: pass
notes: examination.ts:152-197 — checks for existing AP first (idempotent), creates DRAFT with `_max.serialNo + 1`, severity mapped from scoreLabel (NON→HIGH, PARTIAL→MEDIUM, else LOW). All within `$transaction`.

### 5. Record Opening Meeting + Status Transition

expected: Call `recordMeeting` with type OPENING on an engagement in TEAM_ASSIGNED status. The meeting is created AND the engagement transitions to OPENING_MEETING atomically. Calling on wrong status returns TRANSITION_BLOCKED error.
result: pass
notes: meetings.ts:34-175 — uses `canTransitionEngagement` state machine. Upserts meeting + updates engagement status in single `$transaction`. TransitionBlockedError caught and returned as `TRANSITION_BLOCKED` code.

### 6. Sign Off Meeting

expected: Call `signOffMeeting` on an existing meeting. Sets signedOff=true, signedOffById, signedOffAt. Calling again is idempotent (returns success, no error).
result: pass
notes: meetings.ts:189-276 — sets signedOff/signedOffById/signedOffAt (line 250-256). If already signed off, early return within transaction (line 244-247), still returns success.

### 7. Create ActionPoint with Serial Number

expected: Call `createActionPoint` on an IN_PROGRESS engagement. AP created with atomic serial number (\_max+1). Engagement must be IN_PROGRESS, EXIT_MEETING, or REPORT_DRAFT — calling on PLANNED returns error.
result: pass
notes: findings.ts:44-145 — allowedStatuses = ["IN_PROGRESS", "EXIT_MEETING", "REPORT_DRAFT"] (line 89). Serial via `aggregate._max.serialNo + 1` inside transaction (lines 97-101). PLANNED not in allowed list → throws error with CONFLICT code.

### 8. DRAFT-Only Edit/Delete Guards

expected: Call `updateActionPoint` or `deleteActionPoint` on an ISSUED ActionPoint. Both return CONFLICT error. Only DRAFT APs can be modified/deleted.
result: pass
notes: updateActionPoint checks `ap.status !== "DRAFT"` (findings.ts:209-211). deleteActionPoint checks same (findings.ts:316-318). Both throw, caught and returned as CONFLICT code.

### 9. Promote ActionPoint to Observation

expected: Call `promoteToObservation` on a DRAFT ActionPoint. A formal Observation is created with `sourceActionPointId` linking back to the AP. The AP itself remains unchanged.
result: pass
notes: findings.ts:363-458 — creates Observation with `sourceActionPointId: ap.id` (line 429). No mutation of the AP itself within the transaction. Permission: `action_point:manage`.

### 10. Submit BM Response

expected: Call `submitBmResponse` on an ISSUED ActionPoint as BRANCH_HEAD. AP transitions to BM_RESPONDED and BmResponseBatch counter increments. Requires `action_point:bm_respond` permission.
result: pass
notes: findings.ts:475-579 — permission `action_point:bm_respond` (line 482). Respondable from ISSUED or BM_RESPONSE_DUE (line 521). Updates status to BM_RESPONDED (line 532). Increments `bmResponseBatch.respondedActionPoints` (line 544).

### 11. Freeze RBIA Score

expected: Call `freezeRbiaScore` on a REPORT_DRAFT engagement with scored items. Atomic transaction: computes scores, writes BranchRbiaScore with JSONB snapshot, transitions DRAFT APs to ISSUED, creates BmResponseBatch with 15-day deadline. Calling again returns SCORE_FROZEN error.
result: pass
notes: freeze.ts:52-338 — 6-step transaction: load engagement → load responses → build tree → compute scores (computeModuleScore/computeCompositeScore/getRatingBand) → upsert BranchRbiaScore with JSONB snapshot → updateMany DRAFT→ISSUED → upsert BmResponseBatch (15-day deadline). Pre-check for frozenAt returns SCORE_FROZEN code (line 116-121).

## Summary

total: 11
passed: 11
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
