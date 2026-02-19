import "server-only";
import { prismaForTenant } from "./prisma";
import type { Session } from "@/lib/auth";

/**
 * Get all QA self-assessments with filters.
 */
export async function getQaSelfAssessments(
  session: Session,
  options?: {
    assessmentYear?: number;
    iiaStandard?: string;
    gapIdentified?: boolean;
  },
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.qaSelfAssessment.findMany({
    where: {
      tenantId,
      ...(options?.assessmentYear && {
        assessmentYear: options.assessmentYear,
      }),
      ...(options?.iiaStandard && { iiaStandard: options.iiaStandard }),
      ...(options?.gapIdentified !== undefined && {
        gapIdentified: options.gapIdentified,
      }),
    },
    orderBy: [{ assessmentYear: "desc" }, { iiaStandard: "asc" }],
  });
}

/**
 * Get a single QA self-assessment by ID.
 */
export async function getQaSelfAssessment(
  session: Session,
  assessmentId: string,
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.qaSelfAssessment.findFirst({
    where: { id: assessmentId, tenantId },
  });
}

/**
 * Get QA assessments by year for compliance tracking.
 */
export async function getQaAssessmentsByYear(
  session: Session,
  assessmentYear: number,
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  const assessments = await db.qaSelfAssessment.findMany({
    where: {
      tenantId,
      assessmentYear,
    },
    orderBy: { iiaStandard: "asc" },
  });

  // Calculate summary statistics
  const summary = {
    total: assessments.length,
    conforms: assessments.filter((a) => a.response === "CONFORMS").length,
    partiallyConforms: assessments.filter(
      (a) => a.response === "PARTIALLY_CONFORMS",
    ).length,
    doesNotConform: assessments.filter((a) => a.response === "DOES_NOT_CONFORM")
      .length,
    notApplicable: assessments.filter((a) => a.response === "NOT_APPLICABLE")
      .length,
    gapsIdentified: assessments.filter((a) => a.gapIdentified).length,
    issuesCreated: assessments.filter((a) => a.issueCreated).length,
  };

  return { assessments, summary };
}

/**
 * Get gaps identified but not yet converted to issues (R65).
 */
export async function getUnconvertedGaps(session: Session) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.qaSelfAssessment.findMany({
    where: {
      tenantId,
      gapIdentified: true,
      issueCreated: false,
    },
    orderBy: [{ assessmentYear: "desc" }, { iiaStandard: "asc" }],
  });
}

/**
 * Get QA assessment summary by IIA standard category.
 */
export async function getQaSummaryByStandard(
  session: Session,
  assessmentYear: number,
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  const assessments = await db.qaSelfAssessment.findMany({
    where: {
      tenantId,
      assessmentYear,
    },
    select: {
      iiaStandard: true,
      response: true,
      gapIdentified: true,
    },
  });

  // Group by IIA standard category (first digit)
  const grouped = assessments.reduce((acc: Record<string, any>, assessment) => {
    const category = assessment.iiaStandard.substring(0, 1) + "000";
    if (!acc[category]) {
      acc[category] = {
        standard: category,
        total: 0,
        conforms: 0,
        partiallyConforms: 0,
        doesNotConform: 0,
        notApplicable: 0,
        gaps: 0,
      };
    }

    acc[category].total++;
    if (assessment.response === "CONFORMS") acc[category].conforms++;
    if (assessment.response === "PARTIALLY_CONFORMS")
      acc[category].partiallyConforms++;
    if (assessment.response === "DOES_NOT_CONFORM")
      acc[category].doesNotConform++;
    if (assessment.response === "NOT_APPLICABLE") acc[category].notApplicable++;
    if (assessment.gapIdentified) acc[category].gaps++;

    return acc;
  }, {});

  return Object.values(grouped);
}

/**
 * Get QA assessment progress for current year.
 */
export async function getQaAssessmentProgress(session: Session) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  const currentYear = new Date().getFullYear();

  const assessments = await db.qaSelfAssessment.findMany({
    where: {
      tenantId,
      assessmentYear: currentYear,
    },
    select: {
      response: true,
    },
  });

  const completed = assessments.filter((a) => a.response !== null).length;
  const total = assessments.length;

  return {
    year: currentYear,
    total,
    completed,
    pending: total - completed,
    completionPct: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

/**
 * Get 10 Internal Audit Effectiveness KPIs (R66).
 */
export async function getAuditEffectivenessKpis(session: Session) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);
  const currentYear = new Date().getFullYear();

  // KPI 1: Audit Plan Coverage (planned vs universe)
  const totalEntities = await db.auditUniverseEntity.count({
    where: { tenantId },
  });
  const plannedAudits = await db.auditEngagement.count({
    where: { tenantId, status: { not: "CANCELLED" } },
  });
  const auditCoverage =
    totalEntities > 0 ? (plannedAudits / totalEntities) * 100 : 0;

  // KPI 2: Audit Plan Completion Rate
  const completedAudits = await db.auditEngagement.count({
    where: { tenantId, status: "COMPLETED" },
  });
  const planCompletionRate =
    plannedAudits > 0 ? (completedAudits / plannedAudits) * 100 : 0;

  // KPI 3: Finding Closure Rate (within SLA)
  const totalFindings = await db.observation.count({ where: { tenantId } });
  const closedFindings = await db.observation.count({
    where: { tenantId, status: "CLOSED" },
  });
  const findingClosureRate =
    totalFindings > 0 ? (closedFindings / totalFindings) * 100 : 0;

  // KPI 4: Repeat Finding Rate (use repeatOfId as proxy for repeat findings)
  const repeatFindings = await db.observation.count({
    where: { tenantId, repeatOfId: { not: null } },
  });
  const repeatFindingRate =
    totalFindings > 0 ? (repeatFindings / totalFindings) * 100 : 0;

  // KPI 5: Average Days to Close Findings (use updatedAt as proxy for closedAt)
  const closedObs = await db.observation.findMany({
    where: { tenantId, status: "CLOSED" },
    select: { createdAt: true, updatedAt: true },
  });
  const avgDaysToClose =
    closedObs.length > 0
      ? closedObs.reduce(
          (sum, o) =>
            sum +
            Math.ceil(
              (o.updatedAt.getTime() - o.createdAt.getTime()) / 86400000,
            ),
          0,
        ) / closedObs.length
      : 0;

  // KPI 6: High/Critical Finding Ratio
  const highCritical = await db.observation.count({
    where: { tenantId, severity: { in: ["HIGH", "CRITICAL"] } },
  });
  const highCriticalRatio =
    totalFindings > 0 ? (highCritical / totalFindings) * 100 : 0;

  // KPI 7: QA Conformance Rate
  const qaAssessments = await db.qaSelfAssessment.findMany({
    where: { tenantId, assessmentYear: currentYear },
    select: { response: true },
  });
  const conforming = qaAssessments.filter(
    (a) => a.response === "CONFORMS",
  ).length;
  const qaConformanceRate =
    qaAssessments.length > 0 ? (conforming / qaAssessments.length) * 100 : 0;

  // KPI 8: Compliance Item Overdue Rate
  const totalCompliance = await db.complianceItem.count({
    where: { tenantId },
  });
  const overdueCompliance = await db.complianceItem.count({
    where: {
      tenantId,
      status: { in: ["OPEN", "BRANCH_RESPONSE_DUE"] },
      dueDate: { lt: new Date() },
    },
  });
  const overdueRate =
    totalCompliance > 0 ? (overdueCompliance / totalCompliance) * 100 : 0;

  // KPI 9: Staff Utilization (audits per auditor)
  const auditors = await db.user.count({
    where: {
      tenantId,
      roles: { hasSome: ["AUDITOR", "LEAD_AUDITOR", "FIELD_AUDITOR"] },
    },
  });
  const staffUtilization = auditors > 0 ? completedAudits / auditors : 0;

  // KPI 10: Stakeholder Satisfaction (% accepted at first ZAC review)
  const zacReviewed = await db.complianceItem.count({
    where: {
      tenantId,
      status: {
        in: ["ZAC_APPROVED", "ACE_REVIEW", "ACB_REVIEW", "CLOSED"],
      },
    },
  });
  const firstPassRate =
    totalCompliance > 0 ? (zacReviewed / totalCompliance) * 100 : 0;

  return {
    auditCoverage: Math.round(auditCoverage * 10) / 10,
    planCompletionRate: Math.round(planCompletionRate * 10) / 10,
    findingClosureRate: Math.round(findingClosureRate * 10) / 10,
    repeatFindingRate: Math.round(repeatFindingRate * 10) / 10,
    avgDaysToClose: Math.round(avgDaysToClose),
    highCriticalRatio: Math.round(highCriticalRatio * 10) / 10,
    qaConformanceRate: Math.round(qaConformanceRate * 10) / 10,
    overdueRate: Math.round(overdueRate * 10) / 10,
    staffUtilization: Math.round(staffUtilization * 10) / 10,
    firstPassRate: Math.round(firstPassRate * 10) / 10,
  };
}
