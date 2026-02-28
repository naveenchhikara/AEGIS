---
phase: 29-sampling-engine
plan: "02"
subsystem: database
tags: [prisma, server-actions, zod, sampling, loan-portfolio]

# Dependency graph
requires:
  - phase: 29-01
    provides: "Pure sampling engine (generateSample function + all types)"
  - phase: 27-01
    provides: "LoanAccount and SamplingConfig Prisma models"
  - phase: 28-01
    provides: "Loan account import pipeline — accounts exist in DB for sampling"
provides:
  - "DAL functions: getSamplingConfig, getSamplingConfigWithCreator, getLoanAccountsForSampling, getSampledAccounts, getLoanAccountCount"
  - "Server action saveSamplingCriteria — validates 5-bucket allocation (sum=100%) and upserts SamplingConfig"
  - "Server action generateSampleAction — calls sampling engine, marks isSampled, stores samplingBucket in metadata, locks config"
  - "Zod schemas: SaveCriteriaSchema (bucket sum refine), GenerateSampleSchema"
affects: [29-03, 30-account-examination-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prisma Json field cast via unknown: config.criteriaBuckets as unknown as BucketAllocation[]"
    - "Metadata JSONB spread-update: { ...existingMeta, samplingBucket: value } — preserves all other module-specific fields"
    - "Re-generation pattern: reset isSampled=false on all previous then mark new selection in same transaction"

key-files:
  created:
    - src/data-access/sampling.ts
    - src/actions/sampling/schemas.ts
    - src/actions/sampling/save-criteria.ts
    - src/actions/sampling/generate-sample.ts
  modified: []

key-decisions:
  - "saveSamplingCriteria blocks modification when sampleGenerated=true — user must unlock first (enforces config immutability after sample generation)"
  - "generateSampleAction wraps reset+mark+lock in a single $transaction for atomicity — no partial state possible"
  - "samplingBucket stored in LoanAccount.metadata JSONB (not a separate column) — keeps schema minimal while enabling bucket display in UI"
  - "Prisma Json type cast via unknown required — Json union type does not overlap with BucketAllocation[] directly"

patterns-established:
  - "DAL pattern: import 'server-only', prismaForTenant(tenantId), all WHERE clauses include tenantId"
  - "Server action pattern: getRequiredSession + hasPermission check + Zod safeParse + try/catch with logger.error"

requirements-completed: [SMPL-01, SMPL-02, SMPL-04]

# Metrics
duration: 4min
completed: "2026-02-28"
---

# Phase 29 Plan 02: Sampling DAL and Server Actions Summary

**DAL + server actions wiring the pure sampling engine to PostgreSQL: criteria upsert, transactional sample generation, and config locking**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-28T16:39:16Z
- **Completed:** 2026-02-28T16:43:07Z
- **Tasks:** 2
- **Files modified:** 4 (all created)

## Accomplishments

- DAL layer with 5 tenant-isolated functions for SamplingConfig and LoanAccount queries, including Decimal-to-number conversion for engine compatibility
- `saveSamplingCriteria` server action: validates 5-bucket allocation summing to 100%, upserts SamplingConfig, blocks modification post-sample-generation
- `generateSampleAction` server action: fetches criteria + accounts, calls `generateSample()`, resets previous sample, marks new accounts, locks config — all in one transaction
- Zod schemas with bucket sum refine constraint (`Math.abs(sum - 100) < 0.01` for float tolerance)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Zod schemas and DAL functions** - `26f11ed1` (feat)
2. **Task 2: Create server actions for saving criteria and generating sample** - `cd43bedb` (feat)

## Files Created/Modified

- `src/data-access/sampling.ts` — 5 DAL functions with tenantId WHERE isolation; converts Prisma Decimal fields to number for sampling engine; extracts hasPriorObservations from metadata JSONB
- `src/actions/sampling/schemas.ts` — SaveCriteriaSchema (5-bucket array, sum=100% refine), GenerateSampleSchema, exported TS types
- `src/actions/sampling/save-criteria.ts` — saveSamplingCriteria with permission check, locked-config guard, SamplingConfig upsert
- `src/actions/sampling/generate-sample.ts` — generateSampleAction with transaction: reset → mark sampled → lock config

## Decisions Made

- `saveSamplingCriteria` blocks modification when `sampleGenerated=true` — enforces immutability after sample generation per CONTEXT.md
- Transaction in `generateSampleAction` wraps 3 operations (reset + mark + lock) for atomicity — no partial state if error occurs
- `samplingBucket` stored in `LoanAccount.metadata` JSONB spread rather than a new column — keeps v7.0 schema additive and minimal
- Prisma `Json` type requires double cast (`as unknown as BucketAllocation[]`) — corrected as deviation Rule 1 fix during verification

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Prisma Json type cast for criteriaBuckets**

- **Found during:** Task 2 (generate-sample.ts TypeScript check)
- **Issue:** `config.criteriaBuckets as BucketAllocation[]` raised TS2352 — Prisma's `Json` union type does not overlap with `BucketAllocation[]`
- **Fix:** Changed to `config.criteriaBuckets as unknown as BucketAllocation[]` (double cast through unknown)
- **Files modified:** `src/actions/sampling/generate-sample.ts`
- **Verification:** `npx tsc --noEmit --skipLibCheck` — no errors in sampling files
- **Committed in:** `cd43bedb` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - TypeScript type error)
**Impact on plan:** Required correction for type safety. No functional change, no scope creep.

## Issues Encountered

None — both tasks completed cleanly. The Prisma Json type cast deviation was caught immediately by the TS check step and resolved inline.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 4 backend files are ready for Phase 29-03 (Sampling UI) to consume via server action calls
- `saveSamplingCriteria` and `generateSampleAction` provide the two primary form submit handlers the UI needs
- `getSamplingConfigWithCreator`, `getSampledAccounts`, `getLoanAccountCount` provide page-level data fetching
- SMPL-01 (criteria config), SMPL-02 (sample size %), SMPL-04 (auto-select) are satisfied

---

_Phase: 29-sampling-engine_
_Completed: 2026-02-28_
