# 20-02 SUMMARY: Examination Response Save + Module Selection Server Actions

**Phase:** 20-server-actions  
**Plan:** 02  
**Status:** ✅ Complete  
**Commit:** `cd64183 feat(20-02): examination response save + module selection server actions`

---

## What Was Built

Created `src/actions/rbia/examination.ts` with four exported server actions:

### 1. `saveExaminationResponse`
- Parses input with `SaveExaminationResponseSchema` (Zod, includes 500-char notes guard for partial/non-compliant)
- Requires `rbia:examine` permission
- DB transaction via `prismaForTenant`:
  - Upserts `ExaminationResponse` on compound unique `(engagementId, nodeId)` — re-saves update rather than duplicate
  - Score decimal sourced from `SCORE_VALUES` in `@/lib/rbia-scoring-engine` (canonical map)
  - Silent DRAFT `ActionPoint` creation when `flagForActionPoint=true` and no AP already linked to response
  - Serial number assigned atomically via `_max` aggregate (race-condition safe)
  - `moduleCode` extracted from node path's depth-1 segment (e.g. `ROOT.OPS.CASH` → `OPS`)
- Returns `ActionResult<{ responseId, actionPointId, autoCreatedActionPoint }>`

### 2. `autoSelectModules`
- Parses with `AutoSelectModulesSchema`
- Loads engagement's `branch.category` from DB
- Filters depth=1 `ExaminationNode` records: empty `applicableBranchTypes` = all branches; non-empty = match required
- `createMany` with `skipDuplicates: true` — idempotent, safe to call multiple times
- Returns `ActionResult<{ selectedCount }>`

### 3. `addModuleSelection`
- Parses with `AddModuleSelectionSchema` (engagementId + moduleCode)
- Looks up `ExaminationNode` by `code` (depth=1, active) to get `moduleNodeId`
- Returns `CONFLICT` if already selected
- Creates `EngagementModuleSelection` with `isAutoSelected: false`
- Returns `ActionResult<{ selectionId, moduleCode, moduleName }>`

### 4. `removeModuleSelection`
- Parses with `RemoveModuleSelectionSchema`
- Looks up node by code, verifies selection exists
- Deletes `EngagementModuleSelection` on compound unique
- Returns `ActionResult<{ removed: true }>`

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Use `SCORE_VALUES` from scoring engine | Canonical single source of truth for score decimals |
| `_max` aggregate for serial | Avoids race condition vs `count()` under concurrent writes |
| `flagForActionPoint` + no-existing-AP guard | Idempotent — re-saves don't create duplicate APs |
| Silent AP creation | No toast/notification — caller decides how to communicate |
| `depth=1` filter for module operations | Ensures only top-level module nodes can be selected |
| Inline lookup rather than DAL wrapper | DAL functions take `session` + `moduleNodeId`; schema uses `moduleCode` — lookup is required anyway |

---

## Verification

- `pnpm tsc --noEmit` — zero errors in `examination.ts` (2 pre-existing errors in `s3.ts` + `tenant-isolation.test.ts` remain, unrelated to this phase)
- File starts with `"use server"` directive
- All four actions use `rbia:examine` permission check
- `examinationResponse.upsert` on `engagementId_nodeId` compound unique
- Score computed from `SCORE_VALUES[scoreLabel]`

---

## Files Changed

| File | Change |
|---|---|
| `src/actions/rbia/examination.ts` | Created (4 server actions, ~360 lines) |

---

## Satisfies Requirements

| Requirement | How |
|---|---|
| EXAM-03 (working notes) | `workingNotes` stored on upsert |
| EXAM-04 (flag for AP/Observation) | `flagForObservation`, `flagForActionPoint` stored; AP auto-created when flagged |
| EXAM-09 (incremental save via upsert) | `examinationResponse.upsert` on compound unique key |
