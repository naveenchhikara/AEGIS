---
phase: 2
plan: 2
type: standard
wave: 2
depends_on: [1]
files_modified:
  - src/lib/risk-rating-engine.ts
  - src/data-access/reports.ts
  - src/actions/reports/schemas.ts
  - src/actions/reports/compute-risk-rating.ts
autonomous: true
must_haves:
  truths:
    - "computeObservationRiskScore() uses severity weights (CRITICAL=10, HIGH=7, MEDIUM=5, LOW=3)"
    - "computeAuditRiskRating() calculates weighted average with 1.5× repeat multiplier"
    - "getRatingBand() maps score to Poor/Moderate/Satisfactory/Good/Very Good per RBIA Policy"
    - "Risk rating computation works for audits with mixed severity observations including repeats"
    - "Server action follows AEGIS conventions with proper permission checks"
  artifacts:
    - path: "src/lib/risk-rating-engine.ts"
      provides: "Pure computation functions for audit risk rating"
      exports: ["computeObservationRiskScore", "computeAuditRiskRating", "getRatingBand", "RatingBand"]
    - path: "src/data-access/reports.ts"
      provides: "DAL queries for report generation data fetching"
      exports: ["getAuditReportData", "getObservationsForRating"]
    - path: "src/actions/reports/compute-risk-rating.ts"
      provides: "Server action to compute and store audit risk rating"
  key_links:
    - from: "computeAuditRiskRating"
      to: "Observation.repeatOfId"
      via: "Applies 1.5× multiplier for repeat findings"
    - from: "computeRiskRating action"
      to: "AuditEngagement.overallRiskRating"
      via: "Updates engagement with computed rating band"
---

## Objective

Build the risk rating computation engine for completed audits. The engine calculates a weighted risk score from observation severities, applies a 1.5× multiplier for repeat findings, and maps the final score to rating bands (Poor ≤40%, Moderate 40-50%, Satisfactory 50-65%, Good 65-80%, Very Good >80%) per RBIA Policy §8.9. This rating drives compliance prioritization and board reporting.

## Context

@AEGIS/src/lib/risk-rating-engine.ts — NEW: rating computation engine
@AEGIS/src/data-access/reports.ts — NEW: report data queries
@AEGIS/src/actions/reports/compute-risk-rating.ts — NEW: server action
@AEGIS/.planning/REQUIREMENTS.md — R31, R32
@AEGIS/.planning/codebase/CONVENTIONS.md — pure function patterns, server action conventions

## Tasks

<task type="auto">
  <name>Task 1: Risk rating computation engine (pure functions)</name>
  <files>src/lib/risk-rating-engine.ts</files>
  <action>
  **Create `src/lib/risk-rating-engine.ts` — pure computation functions:**

  ```typescript
  /**
   * Audit Risk Rating Computation Engine (Phase 2 — R31, R32)
   *
   * Computes overall audit risk rating from observation severities.
   * Per RBIA Policy §8.9:
   * - Severity weights: CRITICAL=10, HIGH=7, MEDIUM=5, LOW=3
   * - Repeat findings: 1.5× multiplier
   * - Rating bands: Poor ≤40%, Moderate 40-50%, Satisfactory 50-65%, Good 65-80%, Very Good >80%
   *
   * Pure functions - no side effects, no database access.
   */

  export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

  export interface ObservationForRating {
    id: string;
    severity: Severity;
    isRepeat: boolean; // True if repeatOfId is set
  }

  export type RatingBand = "POOR" | "MODERATE" | "SATISFACTORY" | "GOOD" | "VERY_GOOD";

  const SEVERITY_WEIGHTS: Record<Severity, number> = {
    CRITICAL: 10,
    HIGH: 7,
    MEDIUM: 5,
    LOW: 3,
  };

  const REPEAT_MULTIPLIER = 1.5;

  /**
   * Compute risk score for a single observation.
   * Formula: base_weight × (isRepeat ? 1.5 : 1.0)
   */
  export function computeObservationRiskScore(
    severity: Severity,
    isRepeat: boolean
  ): number {
    const baseWeight = SEVERITY_WEIGHTS[severity];
    return isRepeat ? baseWeight * REPEAT_MULTIPLIER : baseWeight;
  }

  /**
   * Compute overall audit risk rating from observations.
   * Returns score as percentage (0-100).
   *
   * Formula:
   * 1. Calculate actual risk: Σ(observation scores)
   * 2. Calculate max possible risk: count × CRITICAL weight × REPEAT_MULTIPLIER
   * 3. Score = 100 - (actual / max × 100)
   *
   * Higher compliance = higher score (inverted risk).
   */
  export function computeAuditRiskRating(
    observations: ObservationForRating[]
  ): number {
    if (observations.length === 0) {
      return 100; // Perfect score if no observations
    }

    // Sum actual risk scores
    const actualRisk = observations.reduce(
      (sum, obs) => sum + computeObservationRiskScore(obs.severity, obs.isRepeat),
      0
    );

    // Max possible risk: every observation is CRITICAL + REPEAT
    const maxPossibleRisk =
      observations.length * SEVERITY_WEIGHTS.CRITICAL * REPEAT_MULTIPLIER;

    // Invert: lower risk = higher compliance score
    const score = 100 - (actualRisk / maxPossibleRisk) * 100;

    return Math.round(score * 100) / 100; // 2 decimal places
  }

  /**
   * Map numeric score to rating band per RBIA Policy §8.9.1.
   */
  export function getRatingBand(score: number): RatingBand {
    if (score > 80) return "VERY_GOOD";
    if (score >= 65) return "GOOD";
    if (score >= 50) return "SATISFACTORY";
    if (score >= 40) return "MODERATE";
    return "POOR";
  }

  /**
   * Get rating band display name.
   */
  export function getRatingBandLabel(band: RatingBand): string {
    const LABELS: Record<RatingBand, string> = {
      VERY_GOOD: "Very Good",
      GOOD: "Good",
      SATISFACTORY: "Satisfactory",
      MODERATE: "Moderate",
      POOR: "Poor",
    };
    return LABELS[band];
  }

  /**
   * Full audit rating computation pipeline.
   */
  export interface AuditRatingResult {
    score: number;
    ratingBand: RatingBand;
    ratingLabel: string;
    totalObservations: number;
    repeatFindings: number;
    severityBreakdown: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  }

  export function computeFullAuditRating(
    observations: ObservationForRating[]
  ): AuditRatingResult {
    const score = computeAuditRiskRating(observations);
    const ratingBand = getRatingBand(score);
    const ratingLabel = getRatingBandLabel(ratingBand);

    const severityBreakdown = {
      critical: observations.filter((o) => o.severity === "CRITICAL").length,
      high: observations.filter((o) => o.severity === "HIGH").length,
      medium: observations.filter((o) => o.severity === "MEDIUM").length,
      low: observations.filter((o) => o.severity === "LOW").length,
    };

    const repeatFindings = observations.filter((o) => o.isRepeat).length;

    return {
      score,
      ratingBand,
      ratingLabel,
      totalObservations: observations.length,
      repeatFindings,
      severityBreakdown,
    };
  }
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit --pretty 2>&1 | grep "risk-rating-engine" | head -10
  ```
  No TypeScript errors in risk-rating-engine.ts.

  Manual verification of computation logic:
  ```bash
  cd /root/.openclaw/workspace/AEGIS && node -e "
    // Simulate rating computation
    const obs = [
      { severity: 'CRITICAL', isRepeat: false },
      { severity: 'HIGH', isRepeat: true },
      { severity: 'MEDIUM', isRepeat: false },
    ];
    const scores = obs.map(o => {
      const base = { CRITICAL: 10, HIGH: 7, MEDIUM: 5, LOW: 3 }[o.severity];
      return o.isRepeat ? base * 1.5 : base;
    }); // [10, 10.5, 5]
    const actualRisk = scores.reduce((a,b) => a+b, 0); // 25.5
    const maxRisk = 3 * 10 * 1.5; // 45
    const score = 100 - (actualRisk / maxRisk * 100); // 100 - 56.67 = 43.33
    console.log('Score:', Math.round(score * 100) / 100, '(expected: 43.33)');
    console.log('Band:', score > 80 ? 'VERY_GOOD' : score >= 65 ? 'GOOD' : score >= 50 ? 'SATISFACTORY' : score >= 40 ? 'MODERATE' : 'POOR');
    // Expected: MODERATE
  "
  ```
  </verify>
  <done>
  - src/lib/risk-rating-engine.ts exists with 7 exported functions/types
  - SEVERITY_WEIGHTS: CRITICAL=10, HIGH=7, MEDIUM=5, LOW=3
  - REPEAT_MULTIPLIER = 1.5
  - computeObservationRiskScore applies multiplier correctly
  - computeAuditRiskRating inverts risk to compliance score (0-100)
  - getRatingBand thresholds: >80→VERY_GOOD, 65-80→GOOD, 50-65→SATISFACTORY, 40-50→MODERATE, ≤40→POOR
  - computeFullAuditRating returns severity breakdown + repeat count
  </done>
</task>

<task type="auto">
  <name>Task 2: Report DAL queries + compute risk rating server action</name>
  <files>src/data-access/reports.ts, src/actions/reports/schemas.ts, src/actions/reports/compute-risk-rating.ts</files>
  <action>
  **2a. Create `src/data-access/reports.ts` — report data queries:**

  ```typescript
  import "server-only";
  import { prismaForTenant } from "./prisma";
  import type { Session } from "@/lib/auth";

  /**
   * Get observations for risk rating computation.
   * Returns minimal data needed by rating engine.
   */
  export async function getObservationsForRating(
    session: Session,
    engagementId: string
  ) {
    const tenantId = (session.user as any).tenantId as string;
    const db = prismaForTenant(tenantId);

    return db.observation.findMany({
      where: {
        tenantId,
        engagementId,
        status: { in: ["ISSUED", "RESPONSE", "COMPLIANCE", "CLOSED"] },
      },
      select: {
        id: true,
        severity: true,
        repeatOfId: true,
      },
    });
  }

  /**
   * Get full audit report data for XLSX/PDF generation.
   */
  export async function getAuditReportData(
    session: Session,
    engagementId: string
  ) {
    const tenantId = (session.user as any).tenantId as string;
    const db = prismaForTenant(tenantId);

    const engagement = await db.auditEngagement.findFirst({
      where: { id: engagementId, tenantId },
      include: {
        branch: {
          select: {
            id: true,
            code: true,
            name: true,
            city: true,
            state: true,
            category: true,
            businessSize: true,
            ramScore: true,
          },
        },
        auditArea: { select: { id: true, name: true } },
        teamMembers: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        observations: {
          where: {
            status: { in: ["ISSUED", "RESPONSE", "COMPLIANCE", "CLOSED"] },
          },
          include: {
            auditArea: { select: { name: true } },
            assignedTo: { select: { name: true } },
          },
        },
        cashChecks: true,
        loanReviews: true,
        smaNpaEntries: true,
        examinationResponses: {
          include: {
            item: {
              include: {
                area: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    return engagement;
  }
  ```

  **2b. Create `src/actions/reports/schemas.ts`:**

  ```typescript
  import { z } from "zod";

  export const ComputeRiskRatingSchema = z.object({
    engagementId: z.string().uuid("Invalid engagement ID"),
  });

  export type ComputeRiskRatingInput = z.infer<typeof ComputeRiskRatingSchema>;
  ```

  **2c. Create `src/actions/reports/compute-risk-rating.ts`:**

  ```typescript
  "use server";

  import { revalidatePath } from "next/cache";
  import { getRequiredSession } from "@/data-access/session";
  import { prismaForTenant } from "@/data-access/prisma";
  import { setAuditContext } from "@/data-access/audit-context";
  import { hasPermission, type Role } from "@/lib/permissions";
  import { logger } from "@/lib/logger";
  import { getObservationsForRating } from "@/data-access/reports";
  import {
    computeFullAuditRating,
    type ObservationForRating,
  } from "@/lib/risk-rating-engine";
  import { ComputeRiskRatingSchema, type ComputeRiskRatingInput } from "./schemas";

  /**
   * Compute and store risk rating for a completed audit engagement.
   * Security: Requires report:generate permission.
   * Side effects: Updates AuditEngagement.overallRiskRating.
   */
  export async function computeRiskRating(input: ComputeRiskRatingInput) {
    const session = await getRequiredSession();
    const userRoles = ((session.user as any).roles ?? []) as Role[];
    const tenantId = (session.user as any).tenantId as string;

    if (!hasPermission(userRoles, "report:generate")) {
      return {
        success: false as const,
        error: "You do not have permission to generate reports.",
      };
    }

    const parsed = ComputeRiskRatingSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues[0].message,
      };
    }

    const db = prismaForTenant(tenantId);

    try {
      const result = await db.$transaction(async (tx: any) => {
        await setAuditContext(tx, {
          actionType: "audit.risk_rating_computed",
          userId: session.user.id,
          tenantId,
          sessionId: session.session.id,
        });

        // Verify engagement exists and is completed
        const engagement = await tx.auditEngagement.findFirst({
          where: { id: parsed.data.engagementId, tenantId },
        });

        if (!engagement) {
          throw new Error("Audit engagement not found");
        }

        if (engagement.status !== "COMPLETED") {
          throw new Error("Can only compute rating for completed audits");
        }

        // Get observations for rating
        const observations = await getObservationsForRating(
          session,
          parsed.data.engagementId
        );

        // Map to engine input format
        const obsForRating: ObservationForRating[] = observations.map((obs) => ({
          id: obs.id,
          severity: obs.severity as any,
          isRepeat: obs.repeatOfId !== null,
        }));

        // Compute rating
        const rating = computeFullAuditRating(obsForRating);

        // Update engagement
        const updated = await tx.auditEngagement.update({
          where: { id: engagement.id },
          data: {
            overallRiskRating: rating.ratingBand,
          },
        });

        return { engagement: updated, rating };
      });

      revalidatePath(`/audit-plans/${result.engagement.id}`);
      revalidatePath("/reports");

      return {
        success: true as const,
        data: {
          engagementId: result.engagement.id,
          score: result.rating.score,
          ratingBand: result.rating.ratingBand,
          ratingLabel: result.rating.ratingLabel,
          totalObservations: result.rating.totalObservations,
          repeatFindings: result.rating.repeatFindings,
        },
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to compute risk rating.";
      logger.error(
        { error, action: "compute_risk_rating", tenantId },
        message
      );
      return { success: false as const, error: message };
    }
  }
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit --pretty 2>&1 | grep -E "(data-access/reports|actions/reports)" | head -20
  ```
  No TypeScript errors in report-related files.
  </verify>
  <done>
  - src/data-access/reports.ts has getObservationsForRating + getAuditReportData DAL functions
  - getObservationsForRating selects id, severity, repeatOfId (minimal for rating engine)
  - getAuditReportData includes full nested data (branch, team, observations, cash checks, loans, etc.)
  - src/actions/reports/compute-risk-rating.ts follows AEGIS conventions
  - Action validates engagement is COMPLETED before computing
  - Action maps observations to ObservationForRating format with isRepeat flag
  - Action updates AuditEngagement.overallRiskRating with computed band
  - Action returns full rating breakdown (score, band, severity counts)
  </done>
</task>

## Success Criteria

1. `pnpm exec tsc --noEmit` has no errors in rating engine or report files
2. risk-rating-engine.ts exports 7 items (functions + types)
3. SEVERITY_WEIGHTS map: CRITICAL=10, HIGH=7, MEDIUM=5, LOW=3
4. Repeat multiplier is 1.5
5. Rating bands: Poor ≤40%, Moderate 40-50%, Satisfactory 50-65%, Good 65-80%, Very Good >80%
6. computeAuditRiskRating inverts risk to compliance score (higher = better)
7. computeRiskRating action requires report:generate permission
8. Action only processes COMPLETED engagements
9. Action updates AuditEngagement.overallRiskRating field
10. getAuditReportData includes all data needed for XLSX/PDF generation
