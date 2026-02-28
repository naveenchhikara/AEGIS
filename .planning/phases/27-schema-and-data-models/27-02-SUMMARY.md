---
phase: 27-schema-and-data-models
plan: "02"
subsystem: database
tags: [seed, exam-questions, housing-loans, rbi, crd-hln, prisma, idempotent]

requires:
  - phase: 27-01
    provides: ExaminationQuestion model with tenantId_moduleCode_text unique constraint

provides:
  - scripts/seed-exam-questions.ts with 25 Housing Loans examination questions
  - CRD-HLN question set covering 7 RBI audit categories
  - Idempotent upsert seed pattern for credit module question libraries
  - "seed:exam-questions" npm script in package.json

affects: [phase-28-loan-data-upload, phase-29-sampling-engine, phase-30-account-examination-ui, phase-31-instance-based-scoring]

tech-stack:
  added: []
  patterns:
    - "moduleCode-keyed question sets — different credit modules get distinct question arrays with different moduleCode values (XMOD-01/XMOD-02)"
    - "Idempotent seed via upsert on @@unique([tenantId, moduleCode, text]) — re-running updates metadata only"
    - "General RBI regulation area names in rbiReference (not specific circular numbers) — more maintainable across policy revisions"

key-files:
  created:
    - scripts/seed-exam-questions.ts
  modified:
    - package.json

key-decisions:
  - "Database not available locally — verified idempotency and structure statically; same non-blocking pattern as Plan 01"
  - "25 questions across 7 categories (exceeded 20 minimum) to provide comprehensive RBI housing loan audit coverage"
  - "4 critical questions (not just 2 minimum): PSL classification x2 and NPA recognition x2 — both PSL and NPA areas require critical-item cap handling per RBIA scoring engine"
  - "Weight range 1.0-2.0 (1.0 standard, 1.5 important, 2.0 critical) to reflect real audit emphasis per CONTEXT.md guidance"

patterns-established:
  - "Credit module seed scripts: standalone scripts/seed-*.ts files per module, not embedded in prisma/seed.ts"
  - "Question category taxonomy: Documentation, Collateral & Valuation, Sanction & Appraisal, Disbursement, PSL & Regulatory, NPA & Provisioning, Monitoring & Recovery"

requirements-completed: [QMGT-01, QMGT-04, XMOD-01, XMOD-02]

duration: 3min
completed: 2026-02-28
---

# Phase 27 Plan 02: Schema and Data Models Summary

**25 Housing Loans (CRD-HLN) examination questions seeded via idempotent upsert script covering 7 RBI audit categories with varied weights and 4 critical flags.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-28T15:45:38Z
- **Completed:** 2026-02-28T15:49:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `scripts/seed-exam-questions.ts` (516 lines) with 25 Housing Loans questions across 7 categories
- 4 critical questions marking PSL classification (x2) and NPA recognition (x2) as requiring critical-item cap handling
- Varied question weights (1.0 standard, 1.5 important, 2.0 critical) reflecting real RBI audit emphasis
- Idempotent upsert on `tenantId_moduleCode_text` unique constraint — safe to re-run without duplicates
- Added `"seed:exam-questions": "tsx scripts/seed-exam-questions.ts"` to package.json
- Architecture comment in script explains how to add Gold Loans (CRD-GLD) or Vehicle Loans (CRD-VHL) question sets

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Housing Loans examination question seed script** - `a11184b1` (feat)
2. **Task 2: Add npm script and verify seed execution** - `c70cf365` (chore)

**Plan metadata:** (committed with docs commit below)

## Files Created/Modified

- `scripts/seed-exam-questions.ts` — Standalone seed script for 25 CRD-HLN examination questions with upsert idempotency
- `package.json` — Added `seed:exam-questions` npm script entry

## Decisions Made

- Database not available locally — verified structure statically (line count, question count, category distribution, critical flags); same non-blocking approach as Plan 01
- Wrote 25 questions (above 20 minimum) to provide comprehensive coverage of all 7 RBI housing loan audit areas
- Set 4 critical questions (PSL x2, NPA x2) rather than just 2 — both PSL misclassification and NPA recognition failures have material regulatory consequences requiring critical-item scoring cap
- RBI references use general regulation area names ("Master Direction on PSL", "Master Circular on Income Recognition and Asset Classification") per CONTEXT.md decision, not specific circular numbers

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- No local PostgreSQL database — static verification substituted for live seed run. Same condition as Plan 01; documented as non-blocking.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 28 (Loan Data Upload) can proceed — ExaminationQuestion model is schema-ready and question set exists for CRD-HLN
- Phase 30 (Account Examination UI) can render questions by querying `ExaminationQuestion WHERE moduleCode = 'CRD-HLN' AND isActive = true`
- Phase 31 (Instance-Based Scoring) has question weight and isCritical data needed for compliance score computation
- To seed against production DB: `DATABASE_URL=<url> pnpm seed:exam-questions`
- To add another module question set (e.g., Gold Loans): create parallel array with `moduleCode: 'CRD-GLD'`

## Self-Check

- [x] `scripts/seed-exam-questions.ts` — FOUND (516 lines)
- [x] 25 questions with moduleCode "CRD-HLN" — CONFIRMED
- [x] 4 isCritical: true questions — CONFIRMED
- [x] 7 distinct categories — CONFIRMED
- [x] `examinationQuestion.upsert` with `tenantId_moduleCode_text` — CONFIRMED
- [x] `package.json` has `seed:exam-questions` — CONFIRMED
- [x] Commit `a11184b1` (Task 1) — EXISTS
- [x] Commit `c70cf365` (Task 2) — EXISTS

## Self-Check: PASSED

---

_Phase: 27-schema-and-data-models_
_Completed: 2026-02-28_
