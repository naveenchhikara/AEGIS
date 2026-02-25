---
status: testing
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
updated: 2026-02-25T10:30:00Z
---

## Current Test

number: 1
name: RBIA Permissions Registered
expected: |
In Prisma Studio or DB, verify the permissions system includes the 4 new RBIA permissions.
Open `src/lib/permissions.ts` and confirm: `rbia:examine`, `rbia:score_freeze`, `action_point:manage`, `action_point:bm_respond` exist and are mapped to roles (LEAD_AUDITOR, FIELD_AUDITOR, CAE, AUDIT_MANAGER, BRANCH_HEAD).
awaiting: user response

## Tests

### 1. RBIA Permissions Registered

expected: 4 new permissions exist in permissions.ts mapped to correct roles — `rbia:examine` (LEAD_AUDITOR, FIELD_AUDITOR), `rbia:score_freeze` (CAE, AUDIT_MANAGER), `action_point:manage` (LEAD_AUDITOR, CAE, AUDIT_MANAGER), `action_point:bm_respond` (BRANCH_HEAD)
result: [pending]

### 2. Zod Schemas and ActionResult Type

expected: `src/actions/rbia/schemas.ts` exports 10 Zod schemas and ActionResult<T> discriminated union type. File is NOT marked "use server" (shared between server actions and client forms).
result: [pending]

### 3. Save Examination Response (Score + Notes)

expected: With dev server running, call `saveExaminationResponse` with a valid engagementId + nodeId + score. The ExaminationResponse row is upserted. Re-calling with same engagementId+nodeId updates instead of duplicating. Working notes validated (500 char min for PC/NC scores).
result: [pending]

### 4. Silent Draft ActionPoint on Flag

expected: Call `saveExaminationResponse` with `flagForActionPoint: true`. A DRAFT ActionPoint is created atomically in the same transaction with auto-incremented serial number and severity auto-suggested from score label.
result: [pending]

### 5. Record Opening Meeting + Status Transition

expected: Call `recordMeeting` with type OPENING on an engagement in TEAM_ASSIGNED status. The meeting is created AND the engagement transitions to OPENING_MEETING atomically. Calling on wrong status returns TRANSITION_BLOCKED error.
result: [pending]

### 6. Sign Off Meeting

expected: Call `signOffMeeting` on an existing meeting. Sets signedOff=true, signedOffById, signedOffAt. Calling again is idempotent (returns success, no error).
result: [pending]

### 7. Create ActionPoint with Serial Number

expected: Call `createActionPoint` on an IN_PROGRESS engagement. AP created with atomic serial number (\_max+1). Engagement must be IN_PROGRESS, EXIT_MEETING, or REPORT_DRAFT — calling on PLANNED returns error.
result: [pending]

### 8. DRAFT-Only Edit/Delete Guards

expected: Call `updateActionPoint` or `deleteActionPoint` on an ISSUED ActionPoint. Both return CONFLICT error. Only DRAFT APs can be modified/deleted.
result: [pending]

### 9. Promote ActionPoint to Observation

expected: Call `promoteToObservation` on a DRAFT ActionPoint. A formal Observation is created with `sourceActionPointId` linking back to the AP. The AP itself remains unchanged.
result: [pending]

### 10. Submit BM Response

expected: Call `submitBmResponse` on an ISSUED ActionPoint as BRANCH_HEAD. AP transitions to BM_RESPONDED and BmResponseBatch counter increments. Requires `action_point:bm_respond` permission.
result: [pending]

### 11. Freeze RBIA Score

expected: Call `freezeRbiaScore` on a REPORT_DRAFT engagement with scored items. Atomic transaction: computes scores, writes BranchRbiaScore with JSONB snapshot, transitions DRAFT APs to ISSUED, creates BmResponseBatch with 15-day deadline. Calling again returns SCORE_FROZEN error.
result: [pending]

## Summary

total: 11
passed: 0
issues: 0
pending: 11
skipped: 0

## Gaps

[none yet]
