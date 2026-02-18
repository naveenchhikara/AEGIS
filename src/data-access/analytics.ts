import "server-only";

import { prismaForTenant } from "@/lib/prisma";

/**
 * R42: Branch risk heatmap data — RAM scores + compliance stats per branch
 */
export async function getBranchRiskHeatmap(tenantId: string) {
  const db = prismaForTenant(tenantId);
  const branches = await db.branch.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      code: true,
      category: true,
      ramScore: true,
      auditFrequency: true,
      lastAuditDate: true,
      lastAuditRating: true,
      zone: { select: { name: true } },
      _count: {
        select: {
          complianceItems: { where: { status: { notIn: ["CLOSED"] } } },
        },
      },
    },
    orderBy: { ramScore: "desc" },
  });

  return branches.map((b) => ({
    id: b.id,
    name: b.name,
    code: b.code,
    category: b.category,
    zone: b.zone?.name ?? "Unassigned",
    ramScore: b.ramScore,
    auditFrequency: b.auditFrequency,
    lastAuditDate: b.lastAuditDate,
    lastAuditRating: b.lastAuditRating,
    openComplianceItems: b._count.complianceItems,
    riskCategory:
      Number(b.ramScore ?? 0) >= 3.5
        ? "HIGH"
        : Number(b.ramScore ?? 0) >= 2.5
          ? "MEDIUM"
          : "LOW",
  }));
}

/**
 * R43: Audit plan progress — plans with engagement completion stats
 */
export async function getAuditPlanProgress(tenantId: string) {
  const db = prismaForTenant(tenantId);
  const plans = await db.auditPlan.findMany({
    where: { tenantId },
    orderBy: { year: "desc" },
  });

  const results = [];
  for (const plan of plans) {
    const engagements = await db.auditEngagement.findMany({
      where: { auditPlanId: plan.id },
      select: {
        id: true,
        status: true,
        scheduledStartDate: true,
        completionDate: true,
        branch: { select: { name: true } },
      },
    });

    const total = engagements.length;
    const completed = engagements.filter((e) => e.status === "COMPLETED").length;
    const inProgress = engagements.filter((e) => e.status === "IN_PROGRESS").length;
    const planned = engagements.filter((e) => e.status === "PLANNED").length;

    results.push({
      id: plan.id,
      year: plan.year,
      quarter: plan.quarter,
      status: plan.status,
      total,
      completed,
      inProgress,
      planned,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      engagements,
    });
  }

  return results;
}

/**
 * R44: Compliance aging analysis — group open items by age buckets
 */
export async function getComplianceAging(tenantId: string) {
  const db = prismaForTenant(tenantId);
  const items = await db.complianceItem.findMany({
    where: {
      tenantId,
      status: { notIn: ["CLOSED"] },
    },
    select: {
      id: true,
      status: true,
      daysOpen: true,
      escalationLevel: true,
      dueDate: true,
      branch: { select: { name: true, code: true } },
      observation: { select: { title: true, severity: true } },
    },
    orderBy: { daysOpen: "desc" },
  });

  const buckets = {
    "0-15 days": items.filter((i) => i.daysOpen <= 15),
    "16-30 days": items.filter((i) => i.daysOpen > 15 && i.daysOpen <= 30),
    "31-90 days": items.filter((i) => i.daysOpen > 30 && i.daysOpen <= 90),
    "91-180 days": items.filter((i) => i.daysOpen > 90 && i.daysOpen <= 180),
    "180+ days": items.filter((i) => i.daysOpen > 180),
  };

  return {
    total: items.length,
    buckets: Object.entries(buckets).map(([label, bucketItems]) => ({
      label,
      count: bucketItems.length,
      items: bucketItems,
    })),
    byEscalation: {
      L0: items.filter((i) => i.escalationLevel === 0).length,
      L1: items.filter((i) => i.escalationLevel === 1).length,
      L2: items.filter((i) => i.escalationLevel === 2).length,
      L3: items.filter((i) => i.escalationLevel === 3).length,
      L4: items.filter((i) => i.escalationLevel === 4).length,
    },
  };
}

/**
 * R45: Finding trend analysis — observations grouped by period + severity
 */
export async function getFindingTrends(tenantId: string) {
  const db = prismaForTenant(tenantId);
  const observations = await db.observation.findMany({
    where: { tenantId },
    select: {
      id: true,
      severity: true,
      createdAt: true,
      engagementId: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Group by quarter based on creation date
  const quarters = new Map<
    string,
    { HIGH: number; MEDIUM: number; LOW: number; CRITICAL: number }
  >();

  for (const obs of observations) {
    const date = obs.createdAt;
    const q = `${date.getFullYear()}-Q${Math.ceil((date.getMonth() + 1) / 3)}`;
    if (!quarters.has(q)) {
      quarters.set(q, { HIGH: 0, MEDIUM: 0, LOW: 0, CRITICAL: 0 });
    }
    const bucket = quarters.get(q)!;
    const sev = (obs.severity ?? "MEDIUM") as keyof typeof bucket;
    if (sev in bucket) bucket[sev]++;
  }

  return Array.from(quarters.entries())
    .map(([quarter, counts]) => ({
      quarter,
      ...counts,
      total: counts.HIGH + counts.MEDIUM + counts.LOW + counts.CRITICAL,
    }))
    .sort((a, b) => a.quarter.localeCompare(b.quarter));
}

/**
 * R46: NPA movement waterfall — SMA/NPA entries by category over time
 */
export async function getNpaMovement(tenantId: string) {
  const db = prismaForTenant(tenantId);
  const entries = await db.smaNpaEntry.findMany({
    where: { tenantId },
    select: {
      id: true,
      category: true,
      accountCount: true,
      totalAmount: true,
      createdAt: true,
      engagementId: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Group by quarter
  const quarters = new Map<
    string,
    { SMA0: number; SMA1: number; SMA2: number; NPA: number }
  >();

  for (const entry of entries) {
    const date = entry.createdAt;
    const q = `${date.getFullYear()}-Q${Math.ceil((date.getMonth() + 1) / 3)}`;
    if (!quarters.has(q)) {
      quarters.set(q, { SMA0: 0, SMA1: 0, SMA2: 0, NPA: 0 });
    }
    const bucket = quarters.get(q)!;
    const cat = (entry.category ?? "SMA0") as string;
    if (cat in bucket) (bucket as Record<string, number>)[cat]++;
  }

  return Array.from(quarters.entries())
    .map(([quarter, counts]) => ({ quarter, ...counts }))
    .sort((a, b) => a.quarter.localeCompare(b.quarter));
}

/**
 * R47: Audit calendar events
 */
export async function getAuditCalendarEvents(
  tenantId: string,
  startDate?: Date,
  endDate?: Date
) {
  const db = prismaForTenant(tenantId); return db.auditCalendar.findMany({
    where: {
      tenantId,
      ...(startDate && endDate
        ? {
            startDate: { gte: startDate },
            endDate: { lte: endDate },
          }
        : {}),
    },
    include: {
      branch: { select: { name: true, code: true } },
      engagement: { select: { auditNumber: true } },
    },
    orderBy: { startDate: "asc" },
  });
}

/**
 * R48: Report templates
 */
export async function getReportTemplates(tenantId: string) {
  const db = prismaForTenant(tenantId);
  return db.reportTemplate.findMany({
    where: { tenantId, isActive: true },
    orderBy: [{ category: "asc" }, { name: "asc" }, { versionNumber: "desc" }],
  });
}
