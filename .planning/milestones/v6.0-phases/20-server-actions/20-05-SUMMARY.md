---
phase: 20-server-actions
plan: 05
subsystem: api
tags:
  [
    prisma,
    server-actions,
    rbia,
    scoring,
    freeze,
    transaction,
    action-points,
    bm-response,
  ]

# Dependency graph
requires:
  - phase: 18-foundation
    provides: rbia-scoring-engine (computeModuleScore, computeCompositeScore, getRatingBand, SCORE_VALUES, ScoredNode)
  - phase: 18-foundation
    provides: engagement-state-machine (canTransitionEngagement, EngagementContext)
  - phase: 20-server-actions/02
    provides: examination actions + saveExaminationResponse (SCORE_VALUES import pattern)
  - phase: 20-server-actions/04
    provides: findings actions (ActionPoint model usage pattern, BmResponseBatch counter pattern)
  - phase: 20-server-actions/01
    provides: shared schemas (FreezeRbiaScoreSchema, ActionResult type)
provides:
  - "freezeRbiaScore server action - atomic 6-step RBIA score freeze with step-specific error reporting"
  - "BranchRbiaScore JSONB snapshot creation (compositeScore, moduleScores, scoringTreeSnapshot, frozenAt)"
  - "Batch DRAFT->ISSUED ActionPoint transition inside freeze transaction"
  - "BmResponseBatch creation with 15-day deadline and AP count"
affects: [21-ui-components, 22-pages, 23-reports]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Step-tracking error reporting via currentStep variable in transaction"
    - "Belt-and-suspenders frozen-score guard (app pre-check + DB trigger)"
    - "Two-pass Map tree reconstruction inside transaction (same as DAL buildTree)"
    - "Idempotent upsert for BmResponseBatch (safe retry on partial failure)"

key-files:
  created:
    - src/actions/rbia/freeze.ts
  modified: []

key-decisions:
  - "Used step-specific currentStep tracking for granular error messages on freeze failure"
  - "Pre-check for frozenAt before upsert as belt-and-suspenders with DB BEFORE UPDATE trigger"
  - "BmResponseBatch uses upsert (not create) for idempotent retry on partial transaction failure"
  - "15-day deadline hardcoded with TODO for Phase 23 tenant settings configurability"
  - "Scoring tree snapshot serializes full ScoredNode[] tree for historical drill-down in Phase 23 reports"

patterns-established:
  - "Step-tracking pattern: currentStep string variable tracks which phase of multi-step transaction is executing, mapped to user-friendly error messages on catch"
  - "SCORE_FROZEN error code: custom error code for already-frozen scores, distinct from INTERNAL_ERROR"

requirements-completed: [EXAM-10, FIND-02, BMRP-01]

# Metrics
duration: 10min
completed: 2026-02-25
---

# Phase 20 Plan 05: Freeze RBIA Score Summary

**freezeRbiaScore atomic server action with 6-step transaction: load responses, build scored tree, compute composite/module scores via scoring engine, upsert BranchRbiaScore JSONB snapshot, batch DRAFT->ISSUED AP transition, and BmResponseBatch creation with 15-day deadline**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-25T04:33:44Z
- **Completed:** 2026-02-25T04:43:29Z
- **Tasks:** 1
- **Files created:** 1

## Accomplishments

- Implemented the most complex v6.0 server action: freezeRbiaScore with 6 sequential steps inside a single Prisma $transaction
- Scoring engine integration: computeModuleScore, computeCompositeScore, getRatingBand produce the official immutable score record
- BranchRbiaScore upsert with full JSONB snapshot (compositeScore, ratingBand, moduleScores map, scoringTreeSnapshot for drill-down)
- Atomic DRAFT->ISSUED ActionPoint batch transition via updateMany
- BmResponseBatch with 15-day deadline and correct AP count, using upsert for idempotent retry
- Step-specific error reporting via currentStep tracking (8 distinct step names)
- SCORE_FROZEN error code for already-frozen scores with belt-and-suspenders approach (pre-check + DB trigger)

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement freezeRbiaScore - 5-step atomic transaction with step-specific error reporting** - `79efa33e` (feat)

## Files Created/Modified

- `src/actions/rbia/freeze.ts` - freezeRbiaScore server action: 6-step atomic transaction (load, tree, score, snapshot, issue APs, BM batch)

## Decisions Made

- **Step-tracking error reporting:** Used a `currentStep` string variable that tracks which phase of the transaction is executing. On error, maps to user-friendly messages (e.g., "Failed to load examination responses" instead of generic "Internal error"). This fulfills the locked decision requiring "specific step that failed."
- **Belt-and-suspenders frozen guard:** Pre-check `engagement.branchRbiaScore?.frozenAt` before attempting the upsert. If a concurrent request passes the pre-check, the DB BEFORE UPDATE trigger still protects immutability. The pre-check provides a user-friendly SCORE_FROZEN error instead of a raw Prisma/DB error.
- **Idempotent BmResponseBatch:** Uses `upsert` instead of `create` per Pitfall 3 from research. If a previous freeze attempt created the batch but the transaction failed later, the retry will update the existing batch rather than throw a unique constraint violation.
- **Hardcoded 15-day deadline:** The BM response deadline is hardcoded to 15 days with a TODO comment for Phase 23 tenant settings configurability (per research recommendation).
- **Full tree snapshot:** The `scoringTreeSnapshot` JSONB field stores the complete ScoredNode[] tree with per-node scores. This enables Phase 23 report drill-down without re-querying historical responses that may have changed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 5 Phase 20 server action plans are complete: schemas (20-01), examination (20-02), meetings (20-03), findings (20-04), freeze (20-05)
- Phase 21 UI components can now import and call all RBIA server actions
- Phase 22 pages have the full server action API available for RBIA audit workflow
- Phase 23 reports can reference BranchRbiaScore snapshots for historical scoring data

---

## Self-Check: PASSED

- FOUND: src/actions/rbia/freeze.ts
- FOUND: commit 79efa33e
- FOUND: 20-05-SUMMARY.md

_Phase: 20-server-actions_
_Completed: 2026-02-25_
