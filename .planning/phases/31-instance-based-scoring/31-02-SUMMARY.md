---
phase: 31-instance-based-scoring
plan: "02"
subsystem: rbia-scoring
tags: [instance-scoring, rbia, compliance, dal, freeze]
dependency_graph:
  requires: [31-01]
  provides: [instance-scoring-dal, freeze-integration, scoring-pipeline-wiring]
  affects: [rbia-scoring, freeze-action, examination-response]
tech_stack:
  added: []
  patterns:
    - "Module-level compliance aggregation: weighted average of per-question ScoreLabels"
    - "Pre-transaction sync: syncAllInstanceScores called before freeze $transaction"
    - "Bridge pattern: AccountExamResponse → ExaminationResponse via ExaminationNode leaf upsert"
key_files:
  created:
    - src/data-access/instance-scoring.ts
  modified:
    - src/actions/rbia/freeze.ts
    - src/data-access/rbia-scoring.ts
decisions:
  - "Pre-transaction sync: syncAllInstanceScores runs OUTSIDE the Prisma $transaction to avoid nested transaction conflict with the same singleton client"
  - "Module-level aggregation: weighted average of per-question ScoreLabels mapped to a single ScoreLabel, then distributed to all leaf ExaminationNodes under the credit module"
  - "getCreditModuleCodes uses LoanAccount.isSampled=true (not AccountExamResponse) — more efficient and semantically correct: only sampled modules need instance scoring"
  - "mapComplianceToScoreLabel applied to module-level numeric score percentage — consistent with per-question compliance threshold logic from Plan 01"
  - "rbia-scoring.ts getEngagementModuleScores: no functional changes needed — instance-scored leaf nodes create standard ExaminationResponse records counted identically to manual responses"
metrics:
  duration: "4 minutes"
  completed: "2026-03-01"
  tasks_completed: 2
  files_created: 1
  files_modified: 2
requirements: [CSCR-03]
---

# Phase 31 Plan 02: Instance-Based Scoring Integration Summary

Integration layer that wires compliance scores from Phase 30 AccountExamResponse data into the existing RBIA scoring pipeline — credit module leaf nodes receive auto-derived ScoreLabels from account-level compliance data so computeModuleScore/computeCompositeScore produce correct roll-up scores transparently.

## What Was Built

### Task 1: Instance-Scoring DAL Module (`src/data-access/instance-scoring.ts`)

New DAL module with 4 exported functions following the canonical DAL pattern (server-only, prismaForTenant, extractTenantId, tenant isolation via WHERE clauses):

**`getQuestionResponseTallies(session, engagementId, moduleCode)`**

- Fetches all active ExaminationQuestion records for the module
- Fetches AccountExamResponse records grouped by questionId
- Returns `Map<questionId, ResponseTally[]>` with empty arrays for unexamined questions
- Empty arrays → computeModuleComplianceScores returns null (Not Examined, not 0%)

**`computeAndApplyInstanceScores(session, engagementId, moduleCode)`**

- Calls getQuestionResponseTallies → computeModuleComplianceScores (Plan 01 pure functions)
- Computes weighted average numeric score from per-question compliance ScoreLabels
- Maps module-level score back to ScoreLabel via mapComplianceToScoreLabel
- Finds all leaf ExaminationNodes under the credit module's path prefix
- Upserts ExaminationResponse on each leaf node with the derived ScoreLabel
- Returns `{ scoredLeafCount, moduleScore }`

**`getCreditModuleCodes(session, engagementId)`**

- Returns distinct moduleCode strings from LoanAccount WHERE isSampled=true
- Only modules with sampled accounts need instance-based scoring

**`syncAllInstanceScores(session, engagementId)`**

- Calls getCreditModuleCodes → computeAndApplyInstanceScores for each module
- Convenience wrapper for the freeze action pre-sync step
- Returns `{ modulesProcessed, totalScoredLeaves }`

### Task 2: Freeze Action + rbia-scoring DAL Updates

**`src/actions/rbia/freeze.ts` — freezeRbiaScore**

- Added `import { syncAllInstanceScores } from "@/data-access/instance-scoring"`
- Added pre-transaction sync step: `await syncAllInstanceScores(session, validated.engagementId)`
- `currentStep` initialized to `"syncing_instance_scores"` before try block
- Added `syncing_instance_scores` to `stepMessages` error map
- Sync runs OUTSIDE the `$transaction` to avoid nested transaction conflicts
- The existing Steps 1-6 are unchanged — they transparently consume the upserted ExaminationResponse records

**`src/data-access/rbia-scoring.ts` — getEngagementModuleScores**

- Added JSDoc noting that instance-scored credit module leaf nodes have standard ExaminationResponse records counted identically to manually-scored nodes
- No functional changes required — the existing query correctly handles instance-scored modules

## Architecture Decision: Pre-Transaction Sync

The plan specified that syncAllInstanceScores must run before the `$transaction` because it uses the same `prismaForTenant` singleton client. Running it inside `$transaction` would create a nested transaction conflict. The solution:

```typescript
// Pre-transaction sync
let currentStep = "syncing_instance_scores";
try {
  await syncAllInstanceScores(session, validated.engagementId);
  // Then the $transaction reads the now-upserted ExaminationResponse records
  const result = await db.$transaction(async (tx: any) => { ... });
}
```

This guarantees the scoring tree snapshot in Step 4 includes compliance-derived ScoreLabels for all credit module leaf nodes.

## Integration Bridge Pattern

```
AccountExamResponse records (Phase 30)
  ↓ getQuestionResponseTallies
Map<questionId, ResponseTally[]>
  ↓ computeModuleComplianceScores (Plan 01 pure functions)
QuestionComplianceResult[] (per-question compliance %, ScoreLabel)
  ↓ weighted average + SCORE_VALUES
moduleScore (0.0–1.0) → mapComplianceToScoreLabel → moduleScoreLabel
  ↓ examinationResponse.upsert on each leaf ExaminationNode
ExaminationResponse records (existing scoring engine input)
  ↓ computeModuleScore / computeCompositeScore (unchanged)
Correct roll-up scores in BranchRbiaScore snapshot
```

## Deviations from Plan

None — plan executed exactly as written. The dynamic import of `mapComplianceToScoreLabel` specified in the plan was converted to a static import at the top of the file (more efficient, same behavior).

## Self-Check

### Created files exist

- `src/data-access/instance-scoring.ts`: 296 lines, 4 exported functions

### Modified files verified

- `src/actions/rbia/freeze.ts`: syncAllInstanceScores imported and called, syncing_instance_scores in error map
- `src/data-access/rbia-scoring.ts`: JSDoc updated with instance-based scoring note

### Commits exist

- `4033db20`: feat(31-02): create instance-scoring DAL module
- `0c93a6eb`: feat(31-02): wire instance-based scores into freeze action and update rbia-scoring DAL

### TypeScript: no errors in modified files

## Self-Check: PASSED

All files created, all commits verified, no TypeScript errors in modified files.
