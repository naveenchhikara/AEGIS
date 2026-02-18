"use server";

import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";

/**
 * Generate one-click RBI inspection support pack (R86).
 * Aggregates 9 components for comprehensive RBI inspection readiness.
 */
export async function generateInspectionPack(year: number) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "board:reporting")) {
    return {
      success: false as const,
      error: "You do not have permission to generate inspection packs.",
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const startDate = new Date(year, 3, 1); // April 1st (Indian FY start)
    const endDate = new Date(year + 1, 2, 31); // March 31st

    // Component 1: Branch Audit Coverage Report
    const auditCoverage = await db.auditEngagement.findMany({
      where: {
        tenantId,
        scheduledStartDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        branch: {
          select: { code: true, name: true },
        },
      },
      orderBy: { scheduledStartDate: "desc" },
    });

    // Component 2: RAM Assessment Summary
    const ramSummary = await db.ramAssessment.findMany({
      where: { tenantId },
      include: {
        branch: {
          select: { code: true, name: true },
        },
      },
      orderBy: { computedAt: "desc" },
      take: 100,
    });

    // Component 3: Open Observations Summary
    const openObs = await db.observation.findMany({
      where: {
        tenantId,
        status: { notIn: ["CLOSED"] },
      },
      include: {
        branch: {
          select: { code: true, name: true },
        },
      },
      orderBy: [
        { severity: "desc" },
        { createdAt: "asc" },
      ],
    });

    // Component 4: Compliance Status Report
    const compliance = await db.complianceItem.findMany({
      where: { tenantId },
      include: {
        branch: {
          select: { code: true, name: true },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    // Component 5: Regulatory Observation ATR Status
    const regObs = await db.regulatoryObservation.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    // Component 6: Risk Register Summary
    const risks = await db.riskRegister.findMany({
      where: { tenantId },
      orderBy: { residualScore: "desc" },
      take: 50,
    });

    // Component 7: KRI Breach Report
    const kris = await db.keyRiskIndicator.findMany({
      where: {
        tenantId,
        breachStatus: "BREACH",
      },
      orderBy: { lastUpdated: "desc" },
      take: 50,
    });

    // Component 8: Policy Review Status
    const policies = await db.policyDocument.findMany({
      where: { tenantId },
      orderBy: [
        { category: "asc" },
        { reviewDueDate: "asc" },
      ],
    });

    // Component 9: IS Audit Status
    const isAudits = await db.isAuditChecklist.findMany({
      where: { tenantId },
      include: {
        engagement: {
          select: {
            branch: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: { completedAt: "desc" },
    });

    // Summary stats
    const stats = {
      totalBranches: await db.branch.count({ where: { tenantId } }),
      totalAudits: auditCoverage.length,
      completedAudits: auditCoverage.filter((a) => a.status === "COMPLETED").length,
      criticalObservations: openObs.filter((o) => o.severity === "CRITICAL").length,
      highObservations: openObs.filter((o) => o.severity === "HIGH").length,
      overdueCompliance: compliance.filter(
        (c) => c.dueDate < new Date() && !["CLOSED", "ZAC_APPROVED"].includes(c.status)
      ).length,
      activeRisks: risks.filter((r) => r.status === "OPEN").length,
      kriBreach: kris.length,
      policiesDueReview: policies.filter(
        (p) => p.reviewDueDate && p.reviewDueDate < new Date() && p.status === "APPROVED"
      ).length,
    };

    return {
      success: true as const,
      data: {
        year,
        generatedAt: new Date().toISOString(),
        stats,
        auditCoverage,
        ramSummary,
        openObs,
        compliance,
        regObs,
        risks,
        kris,
        policies,
        isAudits,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate inspection pack.";
    logger.error({ error, action: "generate_inspection_pack", tenantId }, message);
    return { success: false as const, error: message };
  }
}
