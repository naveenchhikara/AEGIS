---
phase: 30-account-examination-ui
plan: "01"
subsystem: api
tags: [prisma, dal, server-actions, zod, rbia, account-examination]

requires:
  - phase: 27-schema-and-data-models
    provides: ExaminationQuestion, LoanAccount, AccountExamResponse, SamplingConfig models in Prisma schema
  - phase: 29-sampling-engine
    provides: isSampled flag on LoanAccount, sampling engine and DAL

provides:
  - DAL for account examination (getAccountsWithProgress, getQuestionsForAccount, getViolationSummary, getExaminationProgress)
  - DAL for question management (getQuestionsByModule, getQuestionById)
  - Server action saveAccountExamResponse (COMPLIANT/VIOLATION upsert with notes)
  - Server actions addQuestion, updateQuestion, deactivateQuestion, reactivateQuestion
  - Zod schemas for all account examination and question management inputs

affects:
  - 30-account-examination-ui (plans 02 and 03 consume these DAL functions and actions)

tech-stack:
  added: []
  patterns:
    - DAL-first pattern with extractTenantId(session) for tenant isolation
    - Server action 6-step pattern (auth, permission, validate, verify, DB op, revalidate)
    - Soft-delete via isActive=false to preserve historical AccountExamResponse records
    - Upsert on composite unique constraint (engagementId, loanAccountId, questionId) for response idempotency

key-files:
  created:
    - src/data-access/account-examination.ts
    - src/data-access/examination-questions.ts
    - src/actions/account-examination/schemas.ts
    - src/actions/account-examination/save-response.ts
    - src/actions/examination-questions/schemas.ts
    - src/actions/examination-questions/manage-questions.ts
  modified: []

key-decisions:
  - "saveAccountExamResponse uses upsert on [engagementId, loanAccountId, questionId] — re-saving updates without duplicates, idempotent"
  - "deactivateQuestion sets isActive=false (soft-delete), never deletes AccountExamResponse records — QMGT-03 historical preservation"
  - "getAccountsWithProgress uses 4 parallel queries (accounts, question count, violation counts, response counts) for efficiency"
  - "Zod v4 z.enum() uses error string property, not errorMap callback — fixed build-breaking type error"
  - "saveAccountExamResponse requires audit_execution:read (any auditor role); question management requires audit_execution:manage_sections (CAE/HIA only)"

requirements-completed: [AEXM-03, AEXM-04, AEXM-05, QMGT-02, QMGT-03]

duration: 8min
completed: "2026-02-28"
---

# Phase 30 Plan 01: Account Examination DAL and Server Actions Summary

**Tenant-isolated DAL functions and Zod-validated server actions for COMPLIANT/VIOLATION account examination responses and ExaminationQuestion CRUD, with soft-delete preserving historical response data**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-28T17:01:31Z
- **Completed:** 2026-02-28T17:09:25Z
- **Tasks:** 2
- **Files modified:** 6 created

## Accomplishments

- getAccountsWithProgress: returns sampled accounts with per-account completion/violation counts using 4 parallel queries for efficiency
- getQuestionsForAccount: returns active questions with LEFT-JOINed existing response per account, powering the examination card list
- getViolationSummary: per-question violation counts across all sampled accounts for AEXM-05 portfolio risk analysis
- saveAccountExamResponse: upserts COMPLIANT/VIOLATION with optional notes, validates engagement status, verifies account is sampled
- Question CRUD (add, update, deactivate, reactivate): CAE/HIA-only, soft-delete preserves historical data per QMGT-03

## Task Commits

Each task was committed atomically:

1. **Task 1: Create DAL modules for account examination and question management** - `da765f94` (feat)
2. **Task 2: Create server actions and Zod schemas for response saving and question management** - `761822d6` (feat)

## Files Created/Modified

- `src/data-access/account-examination.ts` - DAL for sampled account examination (getAccountsWithProgress, getQuestionsForAccount, getViolationSummary, getExaminationProgress)
- `src/data-access/examination-questions.ts` - DAL for question management (getQuestionsByModule, getQuestionById with usage counts)
- `src/actions/account-examination/schemas.ts` - Zod schema for SaveAccountExamResponseSchema
- `src/actions/account-examination/save-response.ts` - saveAccountExamResponse server action with engagement status gate
- `src/actions/examination-questions/schemas.ts` - Zod schemas for AddQuestionSchema, UpdateQuestionSchema, DeactivateQuestionSchema
- `src/actions/examination-questions/manage-questions.ts` - addQuestion, updateQuestion, deactivateQuestion, reactivateQuestion server actions

## Decisions Made

- `saveAccountExamResponse` uses upsert on composite unique `[engagementId, loanAccountId, questionId]` — re-saving updates without duplicates, fully idempotent per AEXM-03
- `deactivateQuestion` sets `isActive=false` (soft-delete) rather than deleting the question — `AccountExamResponse` records are never deleted, preserving historical examination data per QMGT-03
- `getAccountsWithProgress` fires 4 parallel queries via `Promise.all` (accounts + `_count`, active question count, violation counts by account, response counts by account) for a single round-trip
- Permission split: `saveAccountExamResponse` requires `audit_execution:read` (any auditor), question management actions require `audit_execution:manage_sections` (CAE/HIA only)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zod v4 enum errorMap syntax replaced with error property**

- **Found during:** Task 2 (server actions creation) — caught during `pnpm build` TypeScript check
- **Issue:** Used `errorMap: () => ({...})` in `z.enum()` which is Zod v3 API — Zod v4 uses `error: string` property
- **Fix:** Changed `errorMap: () => ({ message: "Status must be COMPLIANT or VIOLATION" })` to `error: "Status must be COMPLIANT or VIOLATION"` in schemas.ts
- **Files modified:** `src/actions/account-examination/schemas.ts`
- **Verification:** `pnpm build` passed with `✓ Compiled successfully`
- **Committed in:** `761822d6` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Required for build correctness. No scope creep — single field name change.

## Issues Encountered

None beyond the Zod v4 syntax fix above.

## Next Phase Readiness

- All DAL functions and server actions ready for Plan 02 (account examination UI) and Plan 03 (question management UI) consumption
- Tenant isolation enforced on all DB queries via `extractTenantId(session)`
- TypeScript build passes cleanly — no type errors in new files
- No external configuration required

---

_Phase: 30-account-examination-ui_
_Completed: 2026-02-28_
