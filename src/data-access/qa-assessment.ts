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
  }
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.qaSelfAssessment.findMany({
    where: {
      tenantId,
      ...(options?.assessmentYear && { assessmentYear: options.assessmentYear }),
      ...(options?.iiaStandard && { iiaStandard: options.iiaStandard }),
      ...(options?.gapIdentified !== undefined && {
        gapIdentified: options.gapIdentified,
      }),
    },
    orderBy: [
      { assessmentYear: "desc" },
      { iiaStandard: "asc" },
    ],
  });
}

/**
 * Get a single QA self-assessment by ID.
 */
export async function getQaSelfAssessment(
  session: Session,
  assessmentId: string
) {
  const tenantId = (session.user as any).tenantId as string;
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
  assessmentYear: number
) {
  const tenantId = (session.user as any).tenantId as string;
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
      (a) => a.response === "PARTIALLY_CONFORMS"
    ).length,
    doesNotConform: assessments.filter(
      (a) => a.response === "DOES_NOT_CONFORM"
    ).length,
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
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.qaSelfAssessment.findMany({
    where: {
      tenantId,
      gapIdentified: true,
      issueCreated: false,
    },
    orderBy: [
      { assessmentYear: "desc" },
      { iiaStandard: "asc" },
    ],
  });
}

/**
 * Get QA assessment summary by IIA standard category.
 */
export async function getQaSummaryByStandard(
  session: Session,
  assessmentYear: number
) {
  const tenantId = (session.user as any).tenantId as string;
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
  const tenantId = (session.user as any).tenantId as string;
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
