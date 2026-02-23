---
phase: 20-server-actions
plan: 04
type: summary
status: complete
completed_at: "2026-02-23"
---

# 20-04 Summary: Findings CRUD + Promote-to-Observation + BM Response

## What Was Built

Created `src/actions/rbia/findings.ts` with five exported server actions covering the full ActionPoint lifecycle through Branch Manager response.

## Files Modified

| File | Change |
|------|--------|
| `src/actions/rbia/findings.ts` | Created — 5 server actions (~596 lines) |

## Actions Implemented

### 1. `createActionPoint` (FIND-01, FIND-06)
- Permission: `action_point:manage`
- Validates with `CreateActionPointSchema`
- Verifies engagement exists and is in an active audit phase (`IN_PROGRESS`, `EXIT_MEETING`, `REPORT_DRAFT`)
- Assigns serial number atomically via `_max + 1` inside `$transaction` — prevents race conditions under concurrent creation
- Creates ActionPoint with status `DRAFT`, links `sourceResponseId` if provided
- Returns `{ id, serialNo }`

### 2. `updateActionPoint` (FIND-02)
- Permission: `action_point:manage`
- Validates with `UpdateActionPointSchema`
- **DRAFT-only guard**: rejects update on any non-DRAFT AP with `CONFLICT` code
- Builds update payload with only the provided optional fields (title, description, severity, moduleCode)
- Returns `{ id }`

### 3. `deleteActionPoint` (FIND-02)
- Permission: `action_point:manage`
- Validates with `DeleteActionPointSchema`
- **DRAFT-only guard**: rejects deletion on any non-DRAFT AP with `CONFLICT` code
- Hard-deletes the ActionPoint record
- Returns `{ deleted: true }`

### 4. `promoteToObservation` (FIND-03)
- Permission: `action_point:manage`
- Validates with `PromoteToObservationSchema`
- **Dual findings model** (locked decision): AP stays as-is — both AP and Observation coexist
- DB transaction:
  - Creates formal 5C Observation with `observationType = "AUDIT"` and all 5C fields
  - Sets `sourceActionPointId` to the AP's UUID (links Observation back to source)
  - Creates initial `ObservationTimeline` entry with `event = "created"`, `newValue = "DRAFT"`
  - Uses `engagement.branchId ?? ap.branchId` for the Observation's branchId
- Returns `{ id }` — the new Observation's UUID

### 5. `submitBmResponse` (FIND-02 partial: BM_RESPONSE_DUE → BM_RESPONDED)
- Permission: `action_point:bm_respond` (BRANCH_HEAD only)
- Validates with `SubmitBmResponseSchema`
- Accepts AP in `ISSUED` or `BM_RESPONSE_DUE` status
- Updates AP: `bmResponseText`, `bmResponseDate = now()`, `status = "BM_RESPONDED"`
- Increments `BmResponseBatch.respondedActionPoints` if a batch record exists
- Returns `{ id, status: "BM_RESPONDED" }`

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Serial number assignment | `_max + 1` inside `$transaction` | Atomic — prevents duplicate serial numbers under concurrent requests |
| AP status on promote | Unchanged (stays as-is) | Locked decision: dual findings model — AP and Observation coexist |
| promoteToObservation observationType | `"AUDIT"` | Distinguishes RBIA-sourced observations from legacy `AUTO_LEGACY` entries |
| BM respondable statuses | `ISSUED` OR `BM_RESPONSE_DUE` | Branch Head can respond once reminder status also triggers |
| Error encoding | Prefixed message strings (`NOT_FOUND:`, `CONFLICT:`) | Avoids custom error classes; simple to decode in catch block |

## Error Handling

All five actions use the shared `ActionResult<T>` discriminated union with typed `ActionErrorCode`:

| Error | Code | Condition |
|-------|------|-----------|
| Permission denied | `PERMISSION_DENIED` | User lacks required permission |
| Validation failure | `VALIDATION_ERROR` | Zod parse failure |
| AP not found | `NOT_FOUND` | DB lookup returns null |
| Status conflict | `CONFLICT` | DRAFT guard or wrong state for transition |
| Unexpected | `INTERNAL_ERROR` | All other exceptions |

## Verification

- `pnpm tsc --noEmit` exits with code 0 (no errors in findings.ts)
- Pre-existing errors in `s3.ts` and `tenant-isolation.test.ts` are unrelated to this work
- All 5 actions export named async functions from `"use server"` module
- `sourceActionPointId` written correctly on Observation creation (field added in 20-01)

## Requirements Satisfied

| Requirement | Coverage |
|-------------|----------|
| FIND-01 | `createActionPoint` — creates AP from flagged response with source link |
| FIND-02 | `updateActionPoint`, `deleteActionPoint`, `submitBmResponse` — lifecycle transitions |
| FIND-03 | `promoteToObservation` — creates Observation with sourceActionPointId |
| FIND-06 | Serial number auto-assigned as `AP-{N}`, atomic inside transaction |
