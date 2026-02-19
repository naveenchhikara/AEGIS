---
phase: 2
plan: 2
type: standard
wave: 2
depends_on: [1]
files_modified:
  - src/services/risk-rating/compute.ts (new)
  - src/services/risk-rating/types.ts (new)
  - src/actions/reports/compute-risk-rating.ts (new)
  - src/data-access/compliance-items.ts (new)
autonomous: true
must_haves:
  truths:
    - "RiskRatingService computes weighted average from observation severity scores"
    - "Repeat finding multiplier is 1.5× (configurable)"
    - "Rating bands: Poor ≤40%, Moderate 40-50%, Satisfactory 50-65%, Good 65-80%, Very Good >80%"
    - "Service can compute rating for a single engagement or multiple engagements"
    - "Severity weights: CRITICAL=4, HIGH=3, MEDIUM=2, LOW=1"
    - "Auto-create ComplianceItem on observation issuance (status transition to ISSUED)"
  artifacts:
    - path: "src/services/risk-rating/compute.ts"
      provides: "RiskRatingService with computeEngagementRating() and getRatingBand()"
    - path: "src/actions/reports/compute-risk-rating.ts"
      provides: "Server action to trigger rating computation for an engagement"
    - path: "src/data-access/compliance-items.ts"
      provides: "DAL functions for ComplianceItem CRUD operations"
---

## Objective

Implement risk rating computation service that calculates audit engagement risk scores from observation severity with repeat finding multiplier (1.5×), and maps scores to rating bands per R32. Also create ComplianceItem records automatically when observations are issued.

This plan covers R31 (risk rating computation), R32 (rating bands), and partial R34 (ComplianceItem creation).

## Context

@AEGIS/prisma/schema.prisma — Phase 2 schema with ComplianceItem, ReportMetadata
@AEGIS/src/lib/permissions.ts — RBAC with report:generate permission
@AEGIS/src/actions/observations/transition.ts — observation status transitions (may need to add hook)
@AEGIS/.planning/REQUIREMENTS.md — R31, R32, R34
@AEGIS/.planning/codebase/CONVENTIONS.md — server action patterns

## Tasks

<task type="auto">
  <name>Task 1: Risk rating service — types and constants</name>
  <files>src/services/risk-rating/types.ts (new)</files>
  <action>
  Create `src/services/risk-rating/types.ts`:

```typescript
import type { Severity } from "@/generated/prisma/enums";

export type RatingBand =
  | "VERY_GOOD"
  | "GOOD"
  | "SATISFACTORY"
  | "MODERATE"
  | "POOR";

export interface RiskRatingConfig {
  repeatFindingMultiplier: number;
  severityWeights: Record<Severity, number>;
  ratingBands: {
    band: RatingBand;
    minScore: number;
    maxScore: number;
  }[];
}

export interface ObservationInput {
  id: string;
  severity: Severity;
  isRepeatFinding: boolean;
}

export interface RiskRatingResult {
  totalScore: number;
  maxPossibleScore: number;
  percentageScore: number;
  ratingBand: RatingBand;
  observationCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  repeatFindingCount: number;
}

// Default configuration per R31, R32
export const DEFAULT_RISK_RATING_CONFIG: RiskRatingConfig = {
  repeatFindingMultiplier: 1.5,
  severityWeights: {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  },
  ratingBands: [
    { band: "VERY_GOOD", minScore: 80, maxScore: 100 },
    { band: "GOOD", minScore: 65, maxScore: 79.99 },
    { band: "SATISFACTORY", minScore: 50, maxScore: 64.99 },
    { band: "MODERATE", minScore: 40, maxScore: 49.99 },
    { band: "POOR", minScore: 0, maxScore: 39.99 },
  ],
};
```

**Note:** Rating bands are inverted — higher percentage = better rating. This matches banking audit convention where fewer/lower-severity findings = better score.
</action>
<verify>

```bash
cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/services/risk-rating/types.ts
```

  </verify>
  <done>
  - types.ts exists with RiskRatingConfig, ObservationInput, RiskRatingResult interfaces
  - DEFAULT_RISK_RATING_CONFIG has 1.5× repeat multiplier and severity weights
  - Rating bands configured per R32 specification
  - TypeScript compiles successfully
  </done>
</task>

<task type="auto">
  <name>Task 2: Risk rating service — computation logic</name>
  <files>src/services/risk-rating/compute.ts (new)</files>
  <action>
  Create `src/services/risk-rating/compute.ts`:

```typescript
import type {
  RiskRatingConfig,
  RatingBand,
  ObservationInput,
  RiskRatingResult,
} from "./types";
import { DEFAULT_RISK_RATING_CONFIG } from "./types";
import type { Severity } from "@/generated/prisma/enums";

export class RiskRatingService {
  private config: RiskRatingConfig;

  constructor(config?: Partial<RiskRatingConfig>) {
    this.config = { ...DEFAULT_RISK_RATING_CONFIG, ...config };
  }

  /**
   * Compute risk rating for an engagement based on its observations.
   *
   * Algorithm (R31):
   * 1. Each observation gets a weighted score = severity_weight × repeat_multiplier
   * 2. Total score = sum of all weighted scores
   * 3. Max possible score = count × CRITICAL_weight × repeat_multiplier
   * 4. Percentage = (max_possible - total) / max_possible × 100
   * 5. Map percentage to rating band per R32
   *
   * Inverted scale: fewer/lower findings = higher percentage = better rating
   */
  computeEngagementRating(observations: ObservationInput[]): RiskRatingResult {
    if (observations.length === 0) {
      return {
        totalScore: 0,
        maxPossibleScore: 0,
        percentageScore: 100, // No findings = perfect score
        ratingBand: "VERY_GOOD",
        observationCount: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        repeatFindingCount: 0,
      };
    }

    let totalScore = 0;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let repeatFindingCount = 0;

    for (const obs of observations) {
      const baseWeight = this.config.severityWeights[obs.severity];
      const multiplier = obs.isRepeatFinding
        ? this.config.repeatFindingMultiplier
        : 1;
      const weightedScore = baseWeight * multiplier;

      totalScore += weightedScore;

      // Count by severity
      if (obs.severity === "CRITICAL") criticalCount++;
      else if (obs.severity === "HIGH") highCount++;
      else if (obs.severity === "MEDIUM") mediumCount++;
      else if (obs.severity === "LOW") lowCount++;

      if (obs.isRepeatFinding) repeatFindingCount++;
    }

    // Max possible = all findings at CRITICAL severity with repeat multiplier
    const maxPossibleScore =
      observations.length *
      this.config.severityWeights.CRITICAL *
      this.config.repeatFindingMultiplier;

    // Inverted percentage: (max - actual) / max × 100
    const percentageScore =
      maxPossibleScore > 0
        ? ((maxPossibleScore - totalScore) / maxPossibleScore) * 100
        : 100;

    const ratingBand = this.getRatingBand(percentageScore);

    return {
      totalScore,
      maxPossibleScore,
      percentageScore: Math.round(percentageScore * 100) / 100, // 2 decimal places
      ratingBand,
      observationCount: observations.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      repeatFindingCount,
    };
  }

  /**
   * Map percentage score to rating band per R32.
   */
  getRatingBand(percentageScore: number): RatingBand {
    for (const band of this.config.ratingBands) {
      if (
        percentageScore >= band.minScore &&
        percentageScore <= band.maxScore
      ) {
        return band.band;
      }
    }
    // Fallback
    return "POOR";
  }

  /**
   * Compute aggregate rating for multiple engagements (e.g., quarterly).
   */
  computeAggregateRating(
    engagementRatings: RiskRatingResult[],
  ): RiskRatingResult {
    if (engagementRatings.length === 0) {
      return {
        totalScore: 0,
        maxPossibleScore: 0,
        percentageScore: 100,
        ratingBand: "VERY_GOOD",
        observationCount: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        repeatFindingCount: 0,
      };
    }

    const aggregated = engagementRatings.reduce(
      (acc, rating) => ({
        totalScore: acc.totalScore + rating.totalScore,
        maxPossibleScore: acc.maxPossibleScore + rating.maxPossibleScore,
        observationCount: acc.observationCount + rating.observationCount,
        criticalCount: acc.criticalCount + rating.criticalCount,
        highCount: acc.highCount + rating.highCount,
        mediumCount: acc.mediumCount + rating.mediumCount,
        lowCount: acc.lowCount + rating.lowCount,
        repeatFindingCount: acc.repeatFindingCount + rating.repeatFindingCount,
      }),
      {
        totalScore: 0,
        maxPossibleScore: 0,
        observationCount: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        repeatFindingCount: 0,
      },
    );

    const percentageScore =
      aggregated.maxPossibleScore > 0
        ? ((aggregated.maxPossibleScore - aggregated.totalScore) /
            aggregated.maxPossibleScore) *
          100
        : 100;

    return {
      ...aggregated,
      percentageScore: Math.round(percentageScore * 100) / 100,
      ratingBand: this.getRatingBand(percentageScore),
    };
  }
}
```

  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/services/risk-rating/compute.ts
  ```
  </verify>
  <done>
  - RiskRatingService class exists with computeEngagementRating() method
  - Weighted scoring algorithm implemented with repeat finding 1.5× multiplier
  - Inverted percentage calculation (fewer findings = higher score)
  - getRatingBand() maps percentage to rating bands per R32
  - computeAggregateRating() supports quarterly/annual aggregation
  - TypeScript compiles successfully
  </done>
</task>

<task type="auto">
  <name>Task 3: ComplianceItem DAL</name>
  <files>src/data-access/compliance-items.ts (new)</files>
  <action>
  Create `src/data-access/compliance-items.ts`:

```typescript
import { prismaForTenant } from "./prisma";
import type { Session } from "@/lib/auth";
import { logger } from "@/lib/logger";

/**
 * Create ComplianceItem for an observation (R34).
 * Called when observation transitions to ISSUED status.
 */
export async function createComplianceItem(
  session: Session,
  observationId: string,
  auditId: string,
  branchId: string | null,
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  try {
    // Check if ComplianceItem already exists
    const existing = await db.complianceItem.findUnique({
      where: { observationId },
    });

    if (existing) {
      logger.warn(
        { observationId, tenantId },
        "ComplianceItem already exists for observation",
      );
      return existing;
    }

    // Compute due date: 30 days from now (R35 — branch response SLA)
    const now = new Date();
    const branchResponseDue = new Date(now);
    branchResponseDue.setDate(branchResponseDue.getDate() + 30);

    const complianceItem = await db.complianceItem.create({
      data: {
        tenantId,
        observationId,
        auditId,
        branchId,
        status: "OPEN",
        escalationLevel: "NONE",
        daysOpen: 0,
        branchResponseDue,
      },
    });

    logger.info(
      { complianceItemId: complianceItem.id, observationId, tenantId },
      "ComplianceItem created",
    );

    return complianceItem;
  } catch (error) {
    logger.error(
      { error, observationId, tenantId },
      "Failed to create ComplianceItem",
    );
    throw error;
  }
}

/**
 * Get ComplianceItem for an observation.
 */
export async function getComplianceItemByObservation(
  session: Session,
  observationId: string,
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.complianceItem.findUnique({
    where: { observationId },
    include: {
      observation: {
        select: {
          id: true,
          title: true,
          severity: true,
          status: true,
        },
      },
      branch: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });
}

/**
 * Get all ComplianceItems for an engagement.
 */
export async function getComplianceItemsByEngagement(
  session: Session,
  auditId: string,
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.complianceItem.findMany({
    where: {
      tenantId,
      auditId,
    },
    include: {
      observation: {
        select: {
          id: true,
          title: true,
          severity: true,
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Update daysOpen for all open compliance items (cron job).
 */
export async function updateDaysOpenForOpenItems(tenantId: string) {
  const db = prismaForTenant(tenantId);

  try {
    const openItems = await db.complianceItem.findMany({
      where: {
        tenantId,
        status: {
          notIn: ["COMPLIED", "ACCEPTED_RISK", "CLOSED"],
        },
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    const now = new Date();

    for (const item of openItems) {
      const daysOpen = Math.floor(
        (now.getTime() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      await db.complianceItem.update({
        where: { id: item.id },
        data: { daysOpen },
      });
    }

    logger.info(
      { tenantId, count: openItems.length },
      "Updated daysOpen for compliance items",
    );
  } catch (error) {
    logger.error(
      { error, tenantId },
      "Failed to update daysOpen for compliance items",
    );
    throw error;
  }
}
```

  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/data-access/compliance-items.ts
  ```
  </verify>
  <done>
  - compliance-items.ts exists with createComplianceItem()
  - createComplianceItem() sets 30-day branch response SLA
  - getComplianceItemByObservation() and getComplianceItemsByEngagement() implemented
  - updateDaysOpenForOpenItems() for daily cron job
  - TypeScript compiles successfully
  </done>
</task>

<task type="auto">
  <name>Task 4: Server action — compute risk rating</name>
  <files>src/actions/reports/compute-risk-rating.ts (new)</files>
  <action>
  Create `src/actions/reports/compute-risk-rating.ts`:

```typescript
"use server";

import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import { RiskRatingService } from "@/services/risk-rating/compute";
import type { ObservationInput } from "@/services/risk-rating/types";

/**
 * Compute risk rating for an audit engagement.
 *
 * Algorithm:
 * 1. Fetch all ISSUED observations for the engagement
 * 2. Determine repeat findings (observation.repeatOfId exists)
 * 3. Compute weighted risk score with RiskRatingService
 * 4. Update AuditEngagement.overallRiskRating
 *
 * Security: Requires report:generate permission
 * Returns: { success, data: RiskRatingResult, error? }
 */
export async function computeRiskRating(engagementId: string) {
  // ─── Step 1: Authentication ────────────────────────────────────
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  // ─── Step 2: Permission Check ──────────────────────────────────
  if (!hasPermission(userRoles, "report:generate")) {
    return {
      success: false as const,
      error: "You do not have permission to compute risk ratings.",
    };
  }

  // ─── Step 3: Tenant-Scoped Database ────────────────────────────
  const db = prismaForTenant(tenantId);

  try {
    // ─── Step 4: Verify Engagement Exists ──────────────────────
    const engagement = await db.auditEngagement.findFirst({
      where: { id: engagementId, tenantId },
    });

    if (!engagement) {
      return {
        success: false as const,
        error: "Audit engagement not found.",
      };
    }

    // ─── Step 5: Fetch Issued Observations ─────────────────────
    const observations = await db.observation.findMany({
      where: {
        tenantId,
        engagementId,
        status: "ISSUED",
      },
      select: {
        id: true,
        severity: true,
        repeatOfId: true,
      },
    });

    // ─── Step 6: Prepare Input for Risk Rating Service ────────
    const observationInputs: ObservationInput[] = observations.map((obs) => ({
      id: obs.id,
      severity: obs.severity,
      isRepeatFinding: obs.repeatOfId !== null,
    }));

    // ─── Step 7: Compute Risk Rating ───────────────────────────
    const ratingService = new RiskRatingService();
    const ratingResult =
      ratingService.computeEngagementRating(observationInputs);

    // ─── Step 8: Update Engagement ─────────────────────────────
    await db.auditEngagement.update({
      where: { id: engagementId },
      data: {
        overallRiskRating: ratingResult.ratingBand,
      },
    });

    logger.info(
      {
        engagementId,
        tenantId,
        ratingBand: ratingResult.ratingBand,
        percentageScore: ratingResult.percentageScore,
      },
      "Risk rating computed",
    );

    // ─── Step 9: Success Response ──────────────────────────────
    return {
      success: true as const,
      data: ratingResult,
    };
  } catch (error) {
    // ─── Step 10: Error Handling ───────────────────────────────
    logger.error(
      { error, engagementId, tenantId },
      "Failed to compute risk rating",
    );

    return {
      success: false as const,
      error: "Failed to compute risk rating. Please try again.",
    };
  }
}
```

  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/actions/reports/compute-risk-rating.ts
  ```
  </verify>
  <done>
  - computeRiskRating() server action exists
  - Fetches ISSUED observations with repeatOfId check
  - Calls RiskRatingService.computeEngagementRating()
  - Updates AuditEngagement.overallRiskRating
  - Permission check: report:generate
  - TypeScript compiles successfully
  </done>
</task>

## Success Criteria

1. `pnpm exec tsc --noEmit` passes for all new files
2. RiskRatingService implements weighted scoring with 1.5× repeat multiplier
3. Rating bands correctly map: Poor ≤40%, Moderate 40-50%, Satisfactory 50-65%, Good 65-80%, Very Good >80%
4. computeRiskRating() server action updates AuditEngagement.overallRiskRating
5. ComplianceItem DAL provides createComplianceItem() with 30-day SLA
6. All inverted percentage logic correct (fewer findings = higher score)
7. Aggregate rating computation supports multi-engagement analysis
