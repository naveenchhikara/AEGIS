---
gsd_state_version: 1.0
milestone: v7.0
milestone_name: Sample-Based Account Examination
current_phase: 31-instance-based-scoring
current_plan: 31-03 (complete)
status: completed
last_updated: "2026-03-01T16:07:50.761Z"
progress:
  total_phases: 5
  completed_phases: 5
  total_plans: 13
  completed_plans: 13
---

# Session State

## Project Reference

See: .planning/PROJECT.md

## Position

**Milestone:** v7.0 Sample-Based Account Examination
**Current phase:** 31-instance-based-scoring
**Current plan:** 31-03 (complete)
**Status:** v7.0 milestone complete

## Decisions

- 2026-02-28 [27-01]: AccountExamResponse stores tenantId column only (no Tenant relation object) to avoid circular complexity — tenantId used for query isolation
- 2026-02-28 [27-01]: DB push skipped — no local PostgreSQL at localhost:5433; schema validated and client generated successfully
- [Phase 27-02]: Database not available locally — verified idempotency and structure statically; same non-blocking pattern as Plan 01
- [Phase 27-02]: 4 critical questions used (PSL x2, NPA x2) — both areas require critical-item cap handling per RBIA scoring engine
- 2026-02-28 [28-01]: sanctionDate is required in DB (non-nullable DateTime) but optional in bank uploads — null input defaults to import timestamp with parser warning
- 2026-02-28 [28-01]: MODULE_FIELD_CONFIGS maps both HOUSING_LOANS and CRD-HLN to same metadata config for UI/engine compatibility
- 2026-02-28 [28-01]: Zod v4 z.record() requires two arguments — z.record(z.string(), z.unknown()) for metadata field validation
- 2026-02-28 [28-02]: ValidationResult passed through runImport to avoid state race between pendingValidation and direct import path
- 2026-02-28 [28-02]: CREDIT_MODULE_CODES uses canonical keys (HOUSING_LOANS/GOLD_LOANS/VEHICLE_LOANS) to deduplicate MODULE_FIELD_CONFIGS entries in page.tsx
- 2026-02-28 [29-01]: hasPriorObservations added to LoanAccountForSampling interface — not in Phase 27 original; Phase 28 upload file provides this flag per column
- 2026-02-28 [29-01]: Bucket processing order: largest pct first, alphabetical ties — ensures deterministic redistribution target selection
- 2026-02-28 [29-01]: MS_PER_YEAR = 365.25 days for NEWLY_SANCTIONED 12-month cutoff — handles leap years correctly
- 2026-02-28 [29-02]: saveSamplingCriteria blocks modification when sampleGenerated=true — enforces config immutability after sample generation
- 2026-02-28 [29-02]: generateSampleAction wraps reset+mark+lock in a $transaction — atomicity, no partial state on error
- 2026-02-28 [29-02]: samplingBucket stored in LoanAccount.metadata JSONB (not new column) — keeps v7.0 schema additive
- 2026-02-28 [29-02]: Prisma Json type requires double cast (as unknown as BucketAllocation[]) — Json union type doesn't overlap directly
- 2026-02-28 [29-03]: Sampling tab inserted between Loan Portfolio and Findings — logical flow: upload → sample → examine → findings
- 2026-02-28 [29-03]: CriteriaConfigForm split into ReadOnlyView + EditableForm subcomponents — keeps auditor branch clean with no edit controls
- 2026-02-28 [29-03]: handleUnlock resets local isLocked state only — actual DB unlock happens when user saves new criteria
- 2026-02-28 [29-03]: SampleListTable rows link to /rbia/account/[id] — 404 expected until Phase 30 creates account examination route
- 2026-02-28 [30-01]: saveAccountExamResponse uses upsert on [engagementId, loanAccountId, questionId] — idempotent re-saving updates without duplicates
- 2026-02-28 [30-01]: deactivateQuestion sets isActive=false (soft-delete), never deletes AccountExamResponse records — QMGT-03 historical preservation
- 2026-02-28 [30-01]: Zod v4 z.enum() uses error string property, not errorMap callback — fixed build-breaking type error
- [Phase 30-03]: Module tabs use searchParams (?moduleCode=CRD-HLN) for URL-stateful navigation
- [Phase 30-03]: EditQuestionDialog uses controlled open state from parent QuestionTable
- [Phase 30-03]: AlertDialog for deactivation only shown when question has AccountExamResponse records
- [Phase 30-03]: Questions tab added to RBIA layout via canManageQuestions conditional spread
- 2026-02-28 [30-02]: Account Exam tab href defaults to CRD-HLN — most common UCB credit module; other modules navigable within the page
- 2026-02-28 [30-02]: Date fields (respondedAt) serialized to ISO strings at page boundary — client components receive strings, avoids React serialization errors
- 2026-02-28 [30-02]: Optimistic status update on compliance button click reverts on server action failure to maintain UI consistency
- 2026-02-28 [30-02]: Evidence section shows placeholder text — full S3 upload integration deferred to Phase 26; responseId preserved for future wiring
- 2026-03-01 [31-01]: mapComplianceToScoreLabel: 75% inclusive for LARGELY_COMPLIANT (75-99%), 50% inclusive for PARTIALLY_COMPLIANT (50-74%) — consistent with RBIA Policy 2020
- 2026-03-01 [31-01]: computeCompliancePercentage returns null (not 0) for zero responses — distinguishes Not Examined from 0% compliance; mirrors unscored leaf node exclusion in rbia-scoring-engine.ts
- 2026-03-01 [31-01]: QuestionComplianceResult includes raw compliantCount, violationCount, totalResponses for UI display transparency
- 2026-03-01 [31-02]: Pre-transaction sync: syncAllInstanceScores runs OUTSIDE the Prisma $transaction to avoid nested transaction conflict with singleton client
- 2026-03-01 [31-02]: Module-level aggregation: weighted average of per-question ScoreLabels mapped to single ScoreLabel, distributed to all ExaminationNode leaf nodes under the credit module
- 2026-03-01 [31-02]: getCreditModuleCodes uses LoanAccount.isSampled=true — more efficient than querying AccountExamResponse; only sampled modules need instance scoring
- 2026-03-01 [31-03]: ComplianceSummary uses native div for progress bars (not Radix Progress) — server-renderable component requires no client directive
- 2026-03-01 [31-03]: Compliance % computed inline in component from ViolationSummary data — keeps DAL thin, reuses existing getViolationSummary without additional query
- 2026-03-01 [31-03]: CSCR-04: Existing score components (score-gauge, rbia-module-breakdown, score-drilldown, rbia-score-panel) unchanged — instance-based scores produce same ScoreLabel values through standard data pipeline

## Session Log

- 2026-02-28: STATE.md regenerated by /gsd:health --repair
- 2026-02-28: Phase 27 Plan 01 complete — 4 v7.0 models added to schema.prisma (ExaminationQuestion, LoanAccount, SamplingConfig, AccountExamResponse)
- 2026-02-28: Phase 27 Plan 02 complete — 25 CRD-HLN Housing Loans examination questions seeded via scripts/seed-exam-questions.ts (idempotent upsert)
- 2026-02-28: Phase 28 Plan 01 complete — CSV/Excel parsing pipeline, fuzzy column mapping, loan portfolio DAL + server actions (DATA-01, DATA-02, DATA-03)
- 2026-02-28: Phase 28 Plan 02 complete — Loan Portfolio upload UI with drag-drop, column mapping preview, import summary, Excel parse action, RBIA layout tab (DATA-01, DATA-02, DATA-03)
- 2026-02-28: Phase 29 Plan 01 complete — Pure sampling engine with 5-bucket deterministic selection, overflow redistribution, 25 vitest tests (SMPL-04)
- 2026-02-28: Phase 29 Plan 02 complete — Sampling DAL + server actions: saveSamplingCriteria, generateSampleAction, 4 DAL functions with tenant isolation (SMPL-01, SMPL-02, SMPL-04)
- 2026-02-28: Phase 29 Plan 03 complete — Sampling UI: CriteriaConfigForm, SampleListTable, Sampling tab in RBIA layout (SMPL-01, SMPL-02, SMPL-03, SMPL-04)
- 2026-02-28: Phase 30 Plan 01 complete — Account examination DAL (getAccountsWithProgress, getQuestionsForAccount, getViolationSummary) and server actions (saveAccountExamResponse, addQuestion, updateQuestion, deactivateQuestion, reactivateQuestion) (AEXM-03, AEXM-04, AEXM-05, QMGT-02, QMGT-03)
- 2026-02-28: Phase 30 Plan 02 complete — Account examination UI: examination/[moduleCode]/page.tsx server component with deterministic shuffle, AccountSidebar (colored dots), QuestionCard (compliance buttons, collapsible RBI/best practice panels, debounced notes), ExaminationProgressBar (violation badge, completion banner), Account Exam tab in RBIA layout (AEXM-01, AEXM-02, AEXM-03, AEXM-04, AEXM-05)
- 2026-02-28: Phase 30 Plan 03 complete — Question management UI: questions/page.tsx with HIA-only guard, QuestionTable with sortable columns and deactivation warnings, AddQuestionDialog, EditQuestionDialog, conditional Questions tab in RBIA layout (QMGT-02, QMGT-03)
- 2026-03-01: Phase 31 Plan 01 complete — Pure instance-based compliance scoring: computeCompliancePercentage, mapComplianceToScoreLabel, computeModuleComplianceScores with 33 vitest tests (CSCR-01, CSCR-02)
- 2026-03-01: Phase 31 Plan 03 complete — ComplianceSummary component (per-question FC/LC/PC/NC badges + progress bars), wired into module examination page with conditional rendering when sampled data exists (CSCR-01, CSCR-04)
- 2026-03-01: Phase 31 Plan 02 complete — Instance-scoring DAL (getQuestionResponseTallies, computeAndApplyInstanceScores, getCreditModuleCodes, syncAllInstanceScores), freeze action wired with pre-transaction sync, rbia-scoring DAL documented (CSCR-03)
