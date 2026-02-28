---
phase: 29-sampling-engine
plan: "01"
subsystem: testing
tags: [sampling, loan-audit, pure-function, vitest, tdd, ucb, rbi]

requires:
  - phase: 27-schema-and-data-models
    provides: LoanAccountForSampling interface fields (sanctionDate, dpd, outstandingAmount, hasPriorObservations), BucketAllocation JSONB shape from SamplingConfig model
  - phase: 28-loan-data-upload
    provides: hasPriorObservations flag available from CSV/Excel upload column

provides:
  - Pure sampling engine (src/lib/sampling-engine.ts) with generateSample() function
  - 6 exported types: SamplingInput, SamplingResult, BucketAllocation, SampledAccount, RedistributionWarning, LoanAccountForSampling
  - 5-bucket deterministic selection algorithm (NEWLY_SANCTIONED, AMOUNT_WISE, AGE_WISE, DPD_WISE, PRIOR_OBSERVATIONS)
  - Overflow redistribution with warnings
  - 25 unit tests covering all edge cases

affects:
  - 29-02 (sampling criteria config UI — consumes generateSample)
  - 29-03 (sample display UI — renders SampledAccount / RedistributionWarning)
  - 30-account-examination-ui (links from sample list to account examination)

tech-stack:
  added: []
  patterns:
    - "Pure function pattern: sampling engine has zero DB or framework imports — all IO at calling layer"
    - "TDD red-green-refactor: tests committed first, implementation follows"
    - "Deterministic sort: stable id.localeCompare() as final tie-breaker ensures reproducible ordering"

key-files:
  created:
    - src/lib/sampling-engine.ts
    - src/lib/__tests__/sampling-engine.test.ts
  modified: []

key-decisions:
  - "hasPriorObservations added to LoanAccountForSampling interface (not in Phase 27 original) — Phase 28 upload file provides this flag, engine must accept it"
  - "Bucket processing order: largest pct first, alphabetical for ties — ensures deterministic redistribution target selection"
  - "Redistribution: shortfalls go to next-largest eligible bucket (not necessarily same bucket type) — cascade continues until no eligible accounts remain"
  - "Per-bucket rounding correction: if Math.round per bucket sums > totalRequested, largest-pct bucket absorbs reduction"
  - "MS_PER_YEAR = 365.25 days for NEWLY_SANCTIONED 12-month cutoff — handles leap years"

patterns-established:
  - "buildPool() helper: per-bucket classification + sorting in single switch — easy to extend with new bucket types"
  - "calculateBucketCounts() helper: isolated rounding-correction logic, tested implicitly via integration tests"

requirements-completed: [SMPL-04]

duration: 5min
completed: "2026-02-28"
---

# Phase 29 Plan 01: Sampling Engine Summary

**Pure deterministic loan sampling algorithm with 5 RBI-standard criteria buckets, overflow redistribution, and 25 vitest unit tests — zero DB dependencies**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-28T16:29:03Z
- **Completed:** 2026-02-28T16:34:17Z
- **Tasks:** 1 (TDD: RED + GREEN + REFACTOR + TS fix)
- **Files modified:** 2

## Accomplishments

- `generateSample(input: SamplingInput): SamplingResult` pure function with no framework or DB imports
- 5-bucket deterministic selection: each bucket uses risk-ordered sorting (DPD desc, outstanding desc, sanction date asc as tiebreakers)
- NEWLY_SANCTIONED filters to accounts within 12 months; PRIOR_OBSERVATIONS uses hasPriorObservations flag
- Overflow redistribution: shortfalls redistributed to next-largest eligible bucket, with RedistributionWarning for each underfilled bucket
- Rounding guard: per-bucket Math.round counts corrected so sum never exceeds totalRequested
- 25 test cases across 11 describe blocks covering all plan-specified edge cases

## Task Commits

TDD red-green-refactor cycle:

1. **RED — Failing tests** - `cb25cd6c` (test)
2. **GREEN — Implementation** - `d5b8bce9` (feat)
3. **REFACTOR — Remove unused variables** - `c4bf3c6c` (refactor)
4. **Fix — TS2783 duplicate id key in test helper** - `805d1548` (fix)

## Files Created/Modified

- `/Users/admin/Developer/AEGIS/src/lib/sampling-engine.ts` — Pure sampling engine: 6 exported types + generateSample() function, 375 lines
- `/Users/admin/Developer/AEGIS/src/lib/__tests__/sampling-engine.test.ts` — 25 unit tests, 11 describe blocks, 640+ lines

## Decisions Made

- `hasPriorObservations` added to `LoanAccountForSampling` — Phase 27 did not include it; Phase 28 provides it via upload column; engine interface must carry it forward
- Cascade redistribution: after first pass, shortfalls are processed in order; each shortfall iterates remaining buckets (largest-pct first) to absorb overflow
- Fixed test: cascading overflow test originally used 5 accounts at 20% = 1 total, all bucket targets rounded to 0; increased to 30 accounts at 10% = 3 total so bucket targets are non-zero

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TS2783 duplicate id key in makeAccount test helper**

- **Found during:** Verification (TypeScript compilation check)
- **Issue:** `makeAccount()` spread `...overrides` after explicitly setting `id: overrides.id`, causing duplicate property error TS2783
- **Fix:** Build base object first, then spread overrides — `{ ...base, ...overrides }` pattern eliminates duplicate keys
- **Files modified:** `src/lib/__tests__/sampling-engine.test.ts`
- **Verification:** `tsc --noEmit` shows no errors in sampling-engine files; all 25 tests still pass
- **Committed in:** `805d1548` (separate fix commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - TS bug in test helper)
**Impact on plan:** Necessary for TypeScript correctness. No scope creep.

## Issues Encountered

- Cascading overflow test initially failed because the test scenario produced `totalRequested = 1` with all bucket targets rounding to 0. Fixed by using 30 accounts at 10% instead of 5 accounts at 20% — same conceptual test, numbers now produce non-trivial bucket allocations.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `generateSample()` is ready to be consumed by Phase 29-02 (criteria config UI server action) and Phase 29-03 (sample display)
- Types align with Phase 27 LoanAccount and SamplingConfig Prisma models
- `hasPriorObservations` field expected from Phase 28 upload pipeline — Phase 28-01 parser must populate this from upload CSV column

---

## Self-Check: PASSED

- src/lib/sampling-engine.ts: FOUND
- src/lib/**tests**/sampling-engine.test.ts: FOUND
- cb25cd6c (test - RED): FOUND
- d5b8bce9 (feat - GREEN): FOUND
- c4bf3c6c (refactor): FOUND
- 805d1548 (fix - TS): FOUND

---

_Phase: 29-sampling-engine_
_Completed: 2026-02-28_
