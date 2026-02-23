# 20-05 Summary: freezeRbiaScore Server Action

**Phase:** 20 — Server Actions  
**Task:** 20-05  
**Status:** ✅ Complete  
**Commit:** `feat(20-05): freezeRbiaScore — atomic score snapshot, AP issuance, BM batch creation`

---

## What Was Built

Created `src/actions/rbia/freeze.ts` — a "use server" action implementing the most complex RBIA action:
the **score freeze**, which atomically crystallises all scoring data for an engagement into immutable
snapshot records.

---

## Implementation Details

### Auth & Validation
- `getRequiredSession()` + `hasPermission("rbia:score_freeze")`
- `FreezeRbiaScoreSchema.safeParse(input)` for input validation

### Guard Layer (pre-transaction, fast-fail)
| Guard | Behaviour |
|---|---|
| Engagement exists for tenant | `NOT_FOUND` |
| Status is `EXIT_MEETING` or `REPORT_DRAFT` | `TRANSITION_BLOCKED` |
| `branchRbiaScore.frozenAt !== null` | `SCORE_FROZEN` (app-layer) |
| `engagement.branchId === null` | `INTERNAL_ERROR` |

### Step 1 — Load Tree (outside tx)
- Calls `getExaminationTree(session, engagementId)` from `rbia-examination.ts`
- Returns full `ExaminationTreeNode[]` with per-engagement responses joined

### Step 2 — Score Computation (pure, outside tx)
- `toScoredNode()` helper recursively maps `ExaminationTreeNode → ScoredNode`
- For each depth-1 module node:
  - `computeNodeScore()` → `hasCriticalNonCompliant`
  - `computeModuleScore()` → module score (with critical cap applied)
  - `getRatingBand()` + `toPercentage()` → per-module rating & percentage
- `computeCompositeScore()` → weighted composite across all modules
- Returns `TRANSITION_BLOCKED` if compositeScore is null (nothing scored)

### Step 3–5 — Atomic `$transaction`
Engagement is re-loaded inside the tx for authoritative state (race-condition safety).
Second frozen check inside tx guards against concurrent freeze calls.

| Step | Operation |
|---|---|
| **3** | `branchRbiaScore.upsert` — creates or updates draft; stores `compositeScore`, `ratingBand`, `moduleScores` (JSONB array), `scoringTreeSnapshot` (JSONB), `frozenAt`, `frozenById` |
| **4** | `actionPoint.updateMany` — bulk `DRAFT → ISSUED`; sets `bmResponseDeadline = +15d` |
| **5** | `bmResponseBatch.create` — `totalActionPoints = issuedCount`, `deadline = +15d`, `status = PENDING` |
| **+** | Auto-transitions engagement `EXIT_MEETING → REPORT_DRAFT` via `canTransitionEngagement` (inside tx; non-fatal if blocked) |

### Return Value
```typescript
ActionResult<{
  branchRbiaScoreId: string;
  compositeScore: number;      // decimal 0.0–1.0
  ratingBand: string;          // VERY_GOOD | GOOD | SATISFACTORY | MODERATE | POOR
  issuedActionPoints: number;  // count of DRAFT APs promoted to ISSUED
  bmBatchId: string;           // BmResponseBatch.id
}>
```

---

## Schema Field Notes (deviations from plan spec)
| Plan Spec | Actual Schema Field | Reason |
|---|---|---|
| `scoredTree` | `scoringTreeSnapshot` | Actual Prisma model field name |
| `compositePercentage` | _(not stored)_ | Field doesn't exist in BranchRbiaScore |
| `issuedAt` | _(not stored)_ | ActionPoint has no `issuedAt`; used `bmResponseDeadline` |
| `status: OPEN` (BmResponseBatch) | `status: PENDING` | Actual `BmBatchStatus` enum value |
| `branchId` on BmResponseBatch | _(not stored)_ | Not in BmResponseBatch schema |

---

## Error Handling
- `SCORE_FROZEN` caught from both app-layer guard and DB trigger errors (`error.code === "SCORE_FROZEN"` or message match)
- All other errors log via `logger.error` and return `INTERNAL_ERROR`

---

## Type Check
`pnpm tsc --noEmit` — no errors in `src/actions/rbia/freeze.ts`. Pre-existing baseline errors in `src/lib/s3.ts` and `src/data-access/__tests__/tenant-isolation.test.ts` are unrelated.

---

## Files Changed
- `src/actions/rbia/freeze.ts` ← **created** (399 lines)
