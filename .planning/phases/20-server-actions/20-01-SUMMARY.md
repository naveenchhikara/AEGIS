# 20-01: Schemas + Permissions Foundation — SUMMARY

**Status:** ✅ Complete  
**Commit:** `1ff8fa6` — feat(20-01): RBIA schemas, permissions, sourceActionPointId field  
**Date:** 2026-02-23

---

## What Was Done

### Task 1 — `sourceActionPointId` on Observation

- Added `sourceActionPointId String? @db.Uuid` to the `Observation` model in `prisma/schema.prisma`, placed after `observationType`
- Ran `pnpm db:generate` — Prisma 7 regenerated the client successfully
- Verified: field present in `src/generated/prisma/internal/class.ts` runtime data model

### Task 2A — Permissions (`src/lib/permissions.ts`)

Added 4 new RBIA permissions to the `Permission` union type:
- `"rbia:examine"` — for RBIA examination workflow
- `"rbia:score_freeze"` — for freezing composite scores
- `"action_point:manage"` — for creating/managing action points
- `"action_point:bm_respond"` — for Branch Head BM responses

Updated `ROLE_PERMISSIONS`:
| Role | Permissions Added |
|---|---|
| `LEAD_AUDITOR` | `rbia:examine`, `action_point:manage` |
| `FIELD_AUDITOR` | `rbia:examine` |
| `CAE` | `rbia:score_freeze`, `action_point:manage` |
| `AUDIT_MANAGER` | `rbia:score_freeze`, `action_point:manage` |
| `BRANCH_HEAD` | `action_point:bm_respond` |

### Task 2B — Zod Schemas (`src/actions/rbia/schemas.ts`)

Created with NO `"use server"` directive. Schemas defined:

| Schema | Key Validation Rules |
|---|---|
| `SaveExaminationResponseSchema` | `engagementId`+`nodeId` (uuid), `scoreLabel` (enum), `workingNotes` (max 2000, min 500 for PARTIALLY/NON_COMPLIANT via `superRefine`), `flagFor*` (bool) |
| `AddModuleSelectionSchema` | `engagementId` (uuid), `moduleCode` (string) |
| `RemoveModuleSelectionSchema` | same as Add |
| `AutoSelectModulesSchema` | `engagementId` (uuid) |
| `RecordMeetingSchema` | full meeting fields, `attendees` min 1, `meetingDate` datetime |
| `SignOffMeetingSchema` | `engagementId`, `meetingType` |
| `CreateActionPointSchema` | `title` 5-200, `description` min 10, `severity` enum |
| `UpdateActionPointSchema` | all fields optional except `actionPointId` |
| `DeleteActionPointSchema` | `actionPointId` only |
| `PromoteToObservationSchema` | full 5C fields + `severity` |
| `SubmitBmResponseSchema` | `responseText` min 10 |
| `FreezeRbiaScoreSchema` | `engagementId` only |

All schemas export `z.infer<typeof Schema>` types with `Input` suffix.

Types defined:
- `ActionErrorCode` — 7-value union
- `ActionResult<T>` — discriminated union `{ success: true, data: T } | { success: false, error: string, code: ActionErrorCode }`

---

## Verification

- `pnpm db:generate` ✅ — Prisma 7 client generated cleanly
- `pnpm tsc --noEmit` ✅ — Only pre-existing errors remain (s3.ts type mismatch, test regex flag) — **no new errors introduced**

---

## Notes

- Zod v4 `superRefine` uses `z.ZodIssueCode.custom` for custom validation messages (not `too_small` which requires `origin` field in v4)
- Pre-existing tsc errors: `src/lib/s3.ts` (S3Client private field mismatch) and `src/data-access/__tests__/tenant-isolation.test.ts` (regex flag targeting)
