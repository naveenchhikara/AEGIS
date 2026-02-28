# Phase 31: Instance-Based Scoring - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Compute compliance scores for credit modules from violation rates across sampled accounts — wire into the existing 4-point scale, weighted roll-up engine, and score visualizations. This is primarily a computation + wiring phase, not a new UI phase.

</domain>

<decisions>
## Implementation Decisions

### Compliance Percentage Computation

- Per-question compliance % = (accounts marked COMPLIANT / total sampled accounts examined for that question) × 100
- Only count accounts that have a response for the question — skip unexamined accounts
- Questions with zero responses should show "Not Examined" rather than 0%

### Score Label Mapping

- 100% → FULLY_COMPLIANT (1.0)
- 75-99% → LARGELY_COMPLIANT (0.75)
- 50-74% → PARTIALLY_COMPLIANT (0.5)
- Below 50% → NON_COMPLIANT (0.0)
- These thresholds are consistent with existing RBIA Policy 2020 4-point scale

### Integration with Existing Scoring Engine

- The existing `rbia-scoring-engine.ts` computes weighted roll-ups from leaf nodes through parent nodes to module level
- Instance-based scores should feed into this same engine — compliance % maps to a ScoreLabel, which the engine already consumes
- No new scoring code path — reuse existing `computeNodeScore` and `computeModuleScore` functions
- The bridge: a new function computes compliance % from AccountExamResponse data, maps to ScoreLabel, and sets it on the corresponding ExaminationNode leaf

### Score Visualization

- Existing score gauge, module breakdown bars, rating band badge, and drill-down views must work unchanged
- No new visualization components — only ensure data flows correctly from instance-based computation through existing rendering

### Claude's Discretion

- Whether compliance % display is inline in the examination tree or in a separate summary
- Caching strategy for computed compliance percentages
- Whether to batch-update scores or update per-response save

</decisions>

<specifics>
## Specific Ideas

- The key insight: instance-based scoring bridges Phase 30's per-account examination responses to the existing Phase 20-23 scoring infrastructure
- Compliance % is the new "input" that replaces manual ScoreLabel selection on leaf nodes for credit modules
- Non-credit modules continue to use the existing manual scoring flow

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- `rbia-scoring-engine.ts`: Pure scoring engine with `computeNodeScore`, `computeModuleScore`, SCORE_VALUES, CRITICAL_ITEM_CAP — consumes ScoredNode trees
- `rbia-scoring.ts` (DAL): `getEngagementModuleScores`, `getBranchScoreHistory` — existing data access for scores
- `rbia-examination-tree.tsx`: Renders hierarchical examination tree with inline scoring buttons
- `rbia-score-panel.tsx`: Score gauge + module breakdown visualization
- `SCORE_BUTTON_STYLES`, `getRatingBandBadgeClass` from `@/lib/constants`

### Established Patterns

- Scoring engine is pure functions, zero side effects — computation separated from I/O
- ScoreLabel enum: FULLY_COMPLIANT, LARGELY_COMPLIANT, PARTIALLY_COMPLIANT, NON_COMPLIANT
- Rating bands: >80% Very Good, >65% Good, >50% Satisfactory, >40% Moderate, ≤40% Poor
- BranchRbiaScore stores frozen JSONB snapshot with composite score, per-module scores, rating band

### Integration Points

- Phase 30: AccountExamResponse records (COMPLIANT/VIOLATION per account-question pair) — source data
- Phase 27: ExaminationQuestion model with moduleCode — maps questions to modules
- Existing ExaminationNode tree — leaf nodes need ScoreLabel derived from compliance %
- Existing freeze flow — snapshot must include instance-based scores

</code_context>

<deferred>
## Deferred Ideas

- Trend analysis (compliance % over time) — future analytics phase
- Predictive scoring based on partial examination — future enhancement
- Score simulation ("what if" analysis) — future phase

</deferred>

---

_Phase: 31-instance-based-scoring_
_Context gathered: 2026-02-28_
