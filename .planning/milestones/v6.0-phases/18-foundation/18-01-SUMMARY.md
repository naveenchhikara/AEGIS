---
phase: 18-foundation
plan: 01
subsystem: scoring
tags: [rbia, scoring-engine, vitest, tdd, pure-functions, weighted-rollup]

# Dependency graph
requires: []
provides:
  - Pure RBIA scoring engine with weighted roll-up from leaf nodes to module composite
  - Critical-item cap at module level (0.5 ceiling when NON_COMPLIANT critical item present)
  - Rating band assignment per RBIA Policy 2020 Section 8.9.1
  - toPercentage with Math.round to prevent floating-point under-counting
  - 40 passing unit tests covering all branches and edge cases
affects:
  - 18-02 (engagement state machine — same module pattern)
  - 20 (freeze server action calls computeModuleScore, computeCompositeScore)
  - 21 (live UI scoring uses computeNodeScore and computeModuleScore)
  - 23 (reporting uses getRatingBand and toPercentage)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure function module: zero side effects, imports only from generated Prisma types"
    - "TDD RED-GREEN: failing tests committed before implementation"
    - "weightedSum / totalWeight pattern (never pre-normalize weights)"
    - "N/A exclusion: null scoreLabel items excluded from weight denominator"

key-files:
  created:
    - src/lib/rbia-scoring-engine.ts
    - src/lib/__tests__/rbia-scoring-engine.test.ts
  modified: []

key-decisions:
  - "Critical-item cap is a ceiling (not a floor) — scores below 0.5 are not raised"
  - "Cap applied in computeModuleScore only — does not propagate to composite computation"
  - "Rating band thresholds use strict > (0.80 = GOOD, not VERY_GOOD)"
  - "toPercentage uses Math.round to prevent 14-item floating-point producing 99% instead of 100%"
  - "ScoredNode.isLeaf distinguishes leaf scoring from parent weighted roll-up"

patterns-established:
  - "Pattern 1: weightedSum / totalWeight for weighted averages — never pre-normalize weights to avoid FP drift"
  - "Pattern 2: null propagation — unscored (N/A) nodes return score: null and are excluded from denominator"
  - "Pattern 3: hasCriticalNonCompliant bubbles up through computeNodeScore, applied as cap in computeModuleScore"

requirements-completed: [EXAM-05, EXAM-06, EXAM-12]

# Metrics
duration: 8min
completed: 2026-02-23
---

# Phase 18 Plan 01: RBIA Scoring Engine Summary

**Pure TypeScript RBIA scoring engine with recursive weighted roll-up, critical-item cap, and RBIA Policy 2020 rating bands — 40 unit tests passing via TDD**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-23T03:09:14Z
- **Completed:** 2026-02-23T03:17:00Z
- **Tasks:** 2 (RED + GREEN)
- **Files modified:** 2

## Accomplishments

- Scoring engine with 7 exports: `computeNodeScore`, `computeModuleScore`, `computeCompositeScore`, `getRatingBand`, `toPercentage`, `SCORE_VALUES`, `CRITICAL_ITEM_CAP`
- Recursive weighted roll-up handles variable-depth ExaminationNode trees (leaf to module)
- Critical-item cap: if any `isCritical` leaf scores `NON_COMPLIANT`, module is capped at 0.5 (ceiling only)
- N/A exclusion: null `scoreLabel` items are excluded from both numerator and denominator
- 40 unit tests covering all branches including boundary thresholds and floating-point edge case

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — Write failing tests** - `37eacd4c` (test)
2. **Task 2: GREEN — Implement scoring engine** - `1766bca2` (feat)

_TDD plan: two commits (test → feat)_

## Files Created/Modified

- `src/lib/rbia-scoring-engine.ts` - Pure scoring engine (215 lines), zero external dependencies
- `src/lib/__tests__/rbia-scoring-engine.test.ts` - 40 Vitest unit tests (332 lines)

## Decisions Made

- Used `isLeaf` boolean to distinguish leaf scoring (direct SCORE_VALUES lookup) from parent weighted roll-up — prevents ambiguity when a parent has no children yet
- `hasCriticalNonCompliant` propagated through `computeNodeScore` tree walk; cap applied only in `computeModuleScore` to preserve correct composite computation
- `Math.round(score * 100)` chosen for `toPercentage` — prevents the 14-item floating-point accumulation bug where `14 * (1/14) = 0.9999...` rounds down to 99% with `Math.floor`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Scoring engine is ready for consumption by Phase 20 (freeze), Phase 21 (live UI), Phase 23 (reports)
- Phase 18-02 (engagement state machine) can proceed independently — same module pattern

---

_Phase: 18-foundation_
_Completed: 2026-02-23_
