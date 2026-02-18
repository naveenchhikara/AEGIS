---
phase: gap-closure-a
plan: A11
type: execute
wave: 2
depends_on: []
files_modified:
  - src/lib/ram-engine.ts
  - src/actions/ram/compute-assessment.ts
  - src/data-access/ram.ts
  - src/lib/repeat-finding-detector.ts
autonomous: true
gap_closure: true
must_haves:
  truths:
    - "Repeat findings across audits are detected for each branch during RAM computation"
    - "Branches with repeat findings receive a 1.5× multiplier on their RAM composite score"
    - "The repeat uplift is applied AFTER composite computation but BEFORE category derivation"
    - "Repeat detection queries CLOSED observations from prior audits at the same branch"
    - "RAM assessment display shows whether repeat uplift was applied and by how much"
  artifacts:
    - path: "src/lib/repeat-finding-detector.ts"
      provides: "Detection logic for repeat findings across audits"
      exports: ["detectRepeatFindingsForBranch", "computeRepeatUplift"]
      min_lines: 40
    - path: "src/lib/ram-engine.ts"
      provides: "Updated RAM engine with repeat finding uplift"
      contains: "repeatUplift"
    - path: "src/actions/ram/compute-assessment.ts"
      provides: "Updated RAM compute action that applies repeat uplift"
      contains: "repeatUplift"
  key_links:
    - from: "src/actions/ram/compute-assessment.ts"
      to: "src/lib/repeat-finding-detector.ts"
      via: "Checks for repeat findings before computing final score"
      pattern: "detectRepeatFindingsForBranch"
    - from: "src/lib/ram-engine.ts"
      to: "src/lib/repeat-finding-detector.ts"
      via: "applyRepeatUplift called during computation"
      pattern: "applyRepeatUplift"
---

## Objective

Implement R40: Repeat finding 1.5× risk weight in next RAM computation. The repeat finding detection system exists (`src/actions/repeat-findings/detect.ts`) using pg_trgm similarity, and the RAM engine (`src/lib/ram-engine.ts`) computes composite scores. This plan connects them so repeat findings from prior audits increase a branch's RAM risk score.

**Purpose:** Branches with recurring audit findings should be flagged as higher risk and audited more frequently — a core RBIA principle per SDD p.40 and RBIA Policy §8.9.

**Output:**
- Repeat finding detection module for RAM context (branch-level, not observation-level)
- RAM engine enhanced with repeat uplift factor
- RAM compute action integrates repeat check before score finalization
- RAM assessment shows uplift applied

## Execution Context

@/root/.openclaw/workspace/.claude/agents/gsd-planner.md
@/root/.openclaw/workspace/.claude/workflows/execute-plan.md

## Context

@AEGIS/.planning/REQUIREMENTS.md — R40 specification
@AEGIS/.planning/VALIDATION-REPORT.md — Repeat finding RAM gap
@AEGIS/.planning/codebase/CONVENTIONS.md — Pure function patterns
@AEGIS/prisma/schema.prisma — Observation model (repeatOfId, branchId, status), RamAssessment
@AEGIS/src/lib/ram-engine.ts — Existing RAM computation (computeCompositeScore, deriveRiskCategory)
@AEGIS/src/actions/ram/compute-assessment.ts — Existing RAM compute action
@AEGIS/src/actions/repeat-findings/detect.ts — Existing repeat detection (pg_trgm)
@AEGIS/src/data-access/ram.ts — Existing RAM DAL

## Tasks

<task type="auto">
  <name>Task 1: Repeat finding detector for RAM context</name>
  <files>src/lib/repeat-finding-detector.ts</files>
  <action>
  Create `src/lib/repeat-finding-detector.ts`:

  This is a data-fetching module (not pure — it queries the database) that detects repeat findings for a branch across audit periods.

  ```typescript
  import "server-only";
  import { prismaForTenant } from "@/data-access/prisma";

  export interface RepeatFindingSummary {
    branchId: string;
    hasRepeatFindings: boolean;
    repeatCount: number;
    totalPriorFindings: number;
    repeatRatio: number; // 0.0 to 1.0
    repeatFindings: Array<{
      currentObservationId: string;
      priorObservationId: string;
      title: string;
      severity: string;
    }>;
  }

  /**
   * Detect repeat findings for a branch by checking current audit observations
   * against closed observations from prior audits at the same branch.
   *
   * Two methods of detection:
   * 1. Explicit: Observation.repeatOfId is set (user confirmed repeat)
   * 2. Implicit: Title similarity > 0.5 via pg_trgm (same as detect.ts)
   *
   * For RAM purposes, we use BOTH methods.
   *
   * @param tenantId - Tenant ID
   * @param branchId - Branch being assessed
   * @param currentEngagementId - Current audit engagement (to exclude from "prior" query)
   * @returns RepeatFindingSummary
   */
  export async function detectRepeatFindingsForBranch(
    tenantId: string,
    branchId: string,
    currentEngagementId?: string,
  ): Promise<RepeatFindingSummary> {
    const db = prismaForTenant(tenantId);

    // Get explicitly linked repeat findings
    const explicitRepeats = await db.observation.findMany({
      where: {
        tenantId,
        branchId,
        repeatOfId: { not: null },
        ...(currentEngagementId && { engagementId: currentEngagementId }),
      },
      select: {
        id: true,
        title: true,
        severity: true,
        repeatOfId: true,
      },
    });

    // Get current audit findings (from most recent engagement or specified one)
    const currentFindings = await db.observation.findMany({
      where: {
        tenantId,
        branchId,
        status: { in: ["DRAFT", "SUBMITTED", "REVIEWED", "ISSUED"] },
        ...(currentEngagementId && { engagementId: currentEngagementId }),
      },
      select: { id: true, title: true, severity: true },
    });

    // Get total prior findings (CLOSED observations at this branch)
    const priorFindingsCount = await db.observation.count({
      where: {
        tenantId,
        branchId,
        status: "CLOSED",
      },
    });

    // Implicit detection via pg_trgm for findings without explicit repeatOfId
    let implicitRepeats: Array<{
      currentObservationId: string;
      priorObservationId: string;
      title: string;
      severity: string;
    }> = [];

    // Only check findings that don't already have explicit repeat link
    const unlinkedFindings = currentFindings.filter(
      f => !explicitRepeats.some(r => r.id === f.id),
    );

    if (unlinkedFindings.length > 0 && priorFindingsCount > 0) {
      // Check each unlinked finding against closed observations
      for (const finding of unlinkedFindings) {
        const matches = await db.$queryRaw<Array<{ id: string; title: string; similarity_score: number }>>`
          SELECT id, title, similarity(title, ${finding.title}) as similarity_score
          FROM "Observation"
          WHERE "tenantId" = ${tenantId}::uuid
            AND "branchId" = ${branchId}::uuid
            AND status = 'CLOSED'
            AND similarity(title, ${finding.title}) > 0.5
          ORDER BY similarity_score DESC
          LIMIT 1
        `;

        if (matches.length > 0) {
          implicitRepeats.push({
            currentObservationId: finding.id,
            priorObservationId: matches[0].id,
            title: finding.title,
            severity: finding.severity,
          });
        }
      }
    }

    // Combine explicit and implicit
    const allRepeats = [
      ...explicitRepeats.map(r => ({
        currentObservationId: r.id,
        priorObservationId: r.repeatOfId!,
        title: r.title,
        severity: r.severity,
      })),
      ...implicitRepeats,
    ];

    // Deduplicate by currentObservationId
    const uniqueRepeats = Array.from(
      new Map(allRepeats.map(r => [r.currentObservationId, r])).values(),
    );

    const repeatCount = uniqueRepeats.length;
    const totalCurrent = currentFindings.length;

    return {
      branchId,
      hasRepeatFindings: repeatCount > 0,
      repeatCount,
      totalPriorFindings: priorFindingsCount,
      repeatRatio: totalCurrent > 0 ? repeatCount / totalCurrent : 0,
      repeatFindings: uniqueRepeats,
    };
  }

  /**
   * Compute the repeat uplift factor for RAM scoring.
   *
   * Per RBIA Policy §8.9:
   * - If branch has repeat findings → apply 1.5× multiplier to composite score
   * - The multiplier is applied to the final composite, not individual params
   * - Score is capped at 5.0 (max score)
   *
   * @param compositeScore - Raw composite score from RAM engine
   * @param repeatSummary - Repeat finding detection result
   * @returns { adjustedScore, upliftApplied, upliftFactor }
   */
  export function computeRepeatUplift(
    compositeScore: number,
    repeatSummary: RepeatFindingSummary,
  ): {
    adjustedScore: number;
    upliftApplied: boolean;
    upliftFactor: number;
    repeatCount: number;
  } {
    const REPEAT_MULTIPLIER = 1.5;
    const MAX_SCORE = 5.0;

    if (!repeatSummary.hasRepeatFindings) {
      return {
        adjustedScore: compositeScore,
        upliftApplied: false,
        upliftFactor: 1.0,
        repeatCount: 0,
      };
    }

    const adjustedScore = Math.min(compositeScore * REPEAT_MULTIPLIER, MAX_SCORE);

    return {
      adjustedScore: Math.round(adjustedScore * 100) / 100,
      upliftApplied: true,
      upliftFactor: REPEAT_MULTIPLIER,
      repeatCount: repeatSummary.repeatCount,
    };
  }
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/lib/repeat-finding-detector.ts 2>&1 | head -20
  ```
  </verify>
  <done>
  - `detectRepeatFindingsForBranch` detects both explicit (repeatOfId) and implicit (pg_trgm) repeats
  - `computeRepeatUplift` applies 1.5× multiplier capped at 5.0
  - Pure computation in computeRepeatUplift, data-fetching in detectRepeatFindingsForBranch
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 2: Update RAM engine — Add repeat uplift to computation pipeline</name>
  <files>src/lib/ram-engine.ts</files>
  <action>
  Update the existing `src/lib/ram-engine.ts` to include repeat uplift awareness:

  **Add new types:**
  ```typescript
  export interface RamComputationResultWithUplift extends RamComputationResult {
    rawCompositeScore: number;     // Score before uplift
    repeatUpliftApplied: boolean;  // Whether 1.5× was applied
    repeatUpliftFactor: number;    // 1.0 or 1.5
    repeatFindingCount: number;    // Number of repeat findings detected
  }
  ```

  **Add new function:**
  ```typescript
  /**
   * Compute RAM assessment with repeat finding uplift.
   *
   * Pipeline:
   * 1. Compute raw composite score (weighted average)
   * 2. Apply repeat finding uplift if applicable (1.5×)
   * 3. Derive risk category from ADJUSTED score
   * 4. Derive audit frequency from risk category
   *
   * @param scores - Individual parameter scores
   * @param repeatUplift - Optional uplift from repeat detection
   * @returns Full computation result with uplift metadata
   */
  export function computeRamWithUplift(
    scores: RamScoreInput[],
    repeatUplift?: {
      adjustedScore: number;
      upliftApplied: boolean;
      upliftFactor: number;
      repeatCount: number;
    },
  ): RamComputationResultWithUplift {
    const rawComposite = computeCompositeScore(scores);

    const finalScore = repeatUplift?.upliftApplied
      ? repeatUplift.adjustedScore
      : rawComposite;

    const riskCategory = deriveRiskCategory(finalScore);
    const auditFrequency = deriveAuditFrequency(riskCategory);

    return {
      compositeScore: finalScore,
      riskCategory,
      auditFrequency,
      rawCompositeScore: rawComposite,
      repeatUpliftApplied: repeatUplift?.upliftApplied ?? false,
      repeatUpliftFactor: repeatUplift?.upliftFactor ?? 1.0,
      repeatFindingCount: repeatUplift?.repeatCount ?? 0,
    };
  }
  ```

  **Keep existing functions unchanged** for backward compatibility. The new `computeRamWithUplift` is an enhanced version that wraps the existing pure functions.

  Also export `deriveAuditFrequency` if not already exported:
  ```typescript
  export function deriveAuditFrequency(category: "HIGH" | "MEDIUM" | "LOW"): number {
    switch (category) {
      case "HIGH": return 12;
      case "MEDIUM": return 18;
      case "LOW": return 24;
    }
  }
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/lib/ram-engine.ts 2>&1 | head -20
  ```
  </verify>
  <done>
  - `computeRamWithUplift` exported with full pipeline
  - Raw composite preserved for display (before vs after uplift)
  - Existing functions unchanged (backward compatible)
  - `RamComputationResultWithUplift` type exported
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 3: Update RAM compute action — Integrate repeat detection</name>
  <files>src/actions/ram/compute-assessment.ts</files>
  <action>
  Update the existing RAM compute action to include repeat finding detection:

  Find the existing `computeRamAssessment` action (or similar) and modify the computation step:

  **Before (existing):**
  ```typescript
  const result = computeCompositeScore(scoreInputs);
  const riskCategory = deriveRiskCategory(result);
  ```

  **After (updated):**
  ```typescript
  import { detectRepeatFindingsForBranch, computeRepeatUplift } from "@/lib/repeat-finding-detector";
  import { computeRamWithUplift } from "@/lib/ram-engine";

  // ... inside the action, after collecting score inputs ...

  // Step: Detect repeat findings for this branch
  const repeatSummary = await detectRepeatFindingsForBranch(
    tenantId,
    assessment.branchId,
    undefined, // No current engagement filter — check all recent audits
  );

  // Step: Compute uplift
  const rawComposite = computeCompositeScore(scoreInputs);
  const uplift = computeRepeatUplift(rawComposite, repeatSummary);

  // Step: Full computation with uplift
  const result = computeRamWithUplift(scoreInputs, uplift);

  // Step: Update assessment with enriched result
  await tx.ramAssessment.update({
    where: { id: assessmentId },
    data: {
      compositeScore: result.compositeScore,
      riskCategory: result.riskCategory,
      auditFrequency: result.auditFrequency,
      status: "COMPUTED",
      computedById: session.user.id,
      computedAt: new Date(),
    },
  });

  // Step: Update branch cached score
  await tx.branch.update({
    where: { id: assessment.branchId },
    data: {
      ramScore: result.compositeScore,
      auditFrequency: result.auditFrequency,
    },
  });
  ```

  Also store repeat uplift metadata in the return value so the UI can display it:
  ```typescript
  return {
    success: true as const,
    data: {
      compositeScore: result.compositeScore,
      riskCategory: result.riskCategory,
      auditFrequency: result.auditFrequency,
      repeatUpliftApplied: result.repeatUpliftApplied,
      repeatFindingCount: result.repeatFindingCount,
      rawCompositeScore: result.rawCompositeScore,
    },
  };
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/actions/ram/compute-assessment.ts 2>&1 | head -20
  ```
  </verify>
  <done>
  - RAM compute action integrates repeat finding detection
  - Uses detectRepeatFindingsForBranch + computeRepeatUplift
  - Uses computeRamWithUplift for final score
  - Branch.ramScore updated with uplift-adjusted score
  - Return value includes uplift metadata
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 4: Update RAM assessment UI — Show repeat uplift</name>
  <files>src/components/ram/ram-score-display.tsx (or equivalent)</files>
  <action>
  Find the existing RAM assessment result display component and add repeat uplift indicator.

  Add a section that shows:
  ```tsx
  {repeatUpliftApplied && (
    <Alert variant="warning" className="mt-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Repeat Finding Uplift Applied</AlertTitle>
      <AlertDescription>
        {repeatFindingCount} repeat finding(s) detected from prior audits.
        A 1.5× risk multiplier has been applied.
        <br />
        Raw score: {rawCompositeScore} → Adjusted score: {compositeScore}
      </AlertDescription>
    </Alert>
  )}
  ```

  If the component doesn't exist in a straightforward place, create a new one:

  ```typescript
  // src/components/ram/repeat-uplift-indicator.tsx
  "use client";

  interface RepeatUpliftIndicatorProps {
    applied: boolean;
    repeatCount: number;
    rawScore: number;
    adjustedScore: number;
  }

  export function RepeatUpliftIndicator({ applied, repeatCount, rawScore, adjustedScore }: RepeatUpliftIndicatorProps) {
    if (!applied) return null;

    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Repeat Finding Risk Uplift (1.5×)</AlertTitle>
        <AlertDescription>
          <p>{repeatCount} repeat finding(s) detected from prior audits at this branch.</p>
          <p className="mt-1 font-mono text-sm">
            Raw Score: {rawScore.toFixed(2)} × 1.5 = {adjustedScore.toFixed(2)}
          </p>
        </AlertDescription>
      </Alert>
    );
  }
  ```

  Wire this into the RAM assessment detail page (`/ram/[assessmentId]`).
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/components/ram/repeat-uplift-indicator.tsx 2>&1 | head -20
  ```
  </verify>
  <done>
  - RepeatUpliftIndicator component shows when uplift is applied
  - Displays repeat count, raw score, and adjusted score
  - Warning/destructive alert styling for visibility
  - Wired into RAM assessment page
  - TypeScript compiles
  </done>
</task>

## Verification

```bash
# 1. TypeScript compilation
cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit

# 2. Verify repeat detection module
grep -E "export.*(detectRepeatFindingsForBranch|computeRepeatUplift)" src/lib/repeat-finding-detector.ts | wc -l
# Expected: 2

# 3. Verify RAM engine has uplift function
grep "computeRamWithUplift" src/lib/ram-engine.ts && echo "PASS" || echo "FAIL"

# 4. Verify 1.5x multiplier
grep "1\.5" src/lib/repeat-finding-detector.ts && echo "PASS: 1.5x multiplier present" || echo "FAIL"

# 5. Verify RAM action integration
grep "repeatUplift\|detectRepeatFindings" src/actions/ram/compute-assessment.ts && echo "PASS" || echo "FAIL"

# 6. Verify UI indicator
test -f src/components/ram/repeat-uplift-indicator.tsx && echo "PASS" || echo "FAIL"
```

## Success Criteria

1. **R40 gap closed:** Repeat finding 1.5× risk weight applied in RAM computation
2. **Detection methods:** Both explicit (repeatOfId) and implicit (pg_trgm similarity > 0.5)
3. **Uplift factor:** 1.5× multiplier applied to composite score, capped at 5.0
4. **Application order:** Raw composite → uplift → category derivation → frequency
5. **Branch score updated:** Branch.ramScore reflects uplift-adjusted score
6. **Visibility:** RAM UI shows when uplift was applied and the impact
7. **Backward compatible:** Existing RAM functions still work without uplift
8. **Pure computation:** Uplift math is pure; detection is separate data-fetching layer
9. **TypeScript:** All files compile
10. **Conventions:** Pure functions in lib, server-only detection in separate module
