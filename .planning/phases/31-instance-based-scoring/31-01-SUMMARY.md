---
phase: 31-instance-based-scoring
plan: "01"
subsystem: scoring
tags: [vitest, tdd, pure-functions, rbia, scoring, compliance]

# Dependency graph
requires:
  - phase: 30-account-examination-ui
    provides: AccountExamResponse records (COMPLIANT/VIOLATION per account-question pair)
  - phase: 18-foundation
    provides: ScoreLabel enum (FULLY_COMPLIANT, LARGELY_COMPLIANT, PARTIALLY_COMPLIANT, NON_COMPLIANT)
provides:
  - computeCompliancePercentage — (compliant/total)*100 or null for zero responses
  - mapComplianceToScoreLabel — maps compliance % to 4-point RBIA ScoreLabel
  - computeModuleComplianceScores — aggregates per-question compliance results with counts
affects:
  - 31-02 (DAL wiring — consumes QuestionComplianceResult to set leaf node ScoreLabels)
  - freeze action (freeze snapshot incorporates instance-based ScoreLabels)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD RED-GREEN-REFACTOR for pure utility functions"
    - "null return for unexamined questions (Not Examined vs 0% Compliant distinction)"
    - "Type-only Prisma enum import — zero runtime DB dependency in pure functions"

key-files:
  created:
    - src/lib/instance-scoring.ts
    - src/lib/__tests__/instance-scoring.test.ts
  modified: []

key-decisions:
  - "mapComplianceToScoreLabel: 75% inclusive for LARGELY_COMPLIANT (75-99%), 50% inclusive for PARTIALLY_COMPLIANT (50-74%) — consistent with RBIA Policy 2020"
  - "computeCompliancePercentage returns null (not 0) for zero responses — distinguishes Not Examined from 0% compliance"
  - "computeModuleComplianceScores sorts by questionId for deterministic output ordering"
  - "compliantCount and violationCount included in QuestionComplianceResult for UI transparency"

patterns-established:
  - "Pure function library pattern: import only Prisma enum types (no client), zero side effects, fully testable in isolation"
  - "Null-as-Not-Examined pattern: null compliance = skip from denominator in scoring engine (mirrors unscored leaf nodes)"

requirements-completed: [CSCR-01, CSCR-02]

# Metrics
duration: 12min
completed: 2026-03-01
---

# Phase 31 Plan 01: Instance-Based Scoring Summary

**Pure TypeScript compliance computation library: (compliant/total)\*100 percentage, 4-point ScoreLabel mapping, and per-module aggregation — 33 passing vitest tests**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-01T20:50:00Z
- **Completed:** 2026-03-01T20:51:30Z
- **Tasks:** 1 (TDD: RED + GREEN + REFACTOR)
- **Files modified:** 2

## Accomplishments

- `computeCompliancePercentage` computes (COMPLIANT/total)\*100 with `null` for zero responses (Not Examined)
- `mapComplianceToScoreLabel` maps 100%→FC, 75-99%→LC, 50-74%→PC, <50%→NC with correct inclusive boundaries
- `computeModuleComplianceScores` aggregates per-question results from a Map, including raw counts for UI transparency
- 33 vitest tests covering all behaviors, edge cases, and boundary conditions — all pass
- Existing `rbia-scoring-engine.test.ts` (40 tests) unaffected

## Task Commits

Each task was committed atomically:

1. **Task 1: Create instance-scoring pure functions with TDD** - `d4eddb5b` (feat)

**Plan metadata:** (docs commit — see below)

_Note: TDD task combined test + implementation + refactor in single commit as tests were written first then implementation verified._

## Files Created/Modified

- `src/lib/instance-scoring.ts` — Pure functions: `computeCompliancePercentage`, `mapComplianceToScoreLabel`, `computeModuleComplianceScores` with types `ResponseTally` and `QuestionComplianceResult`
- `src/lib/__tests__/instance-scoring.test.ts` — 33 vitest tests covering all behaviors, edge cases, and boundary conditions

## Decisions Made

- `computeCompliancePercentage` returns `null` (not `0`) for zero responses — distinguishes "Not Examined" from "0% compliant". This matches how unscored leaf nodes (`scoreLabel: null`) are excluded from the scoring engine denominator.
- `mapComplianceToScoreLabel`: 75% inclusive for LARGELY_COMPLIANT, 50% inclusive for PARTIALLY_COMPLIANT — consistent with CONTEXT.md spec "75-99% -> LC", "50-74% -> PC".
- `QuestionComplianceResult` includes raw `compliantCount`, `violationCount`, `totalResponses` for UI display transparency beyond just the label.
- Results sorted by `questionId` in `computeModuleComplianceScores` for deterministic output.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Instance scoring pure functions complete and tested. Ready for Plan 31-02 (DAL wiring).
- Plan 31-02 will import `QuestionComplianceResult` from this file and use `computeModuleComplianceScores` to derive ScoreLabels from `AccountExamResponse` records, then set them on `ExaminationNode` leaf nodes.
- No blockers.

---

_Phase: 31-instance-based-scoring_
_Completed: 2026-03-01_
