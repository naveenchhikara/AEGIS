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
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

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
