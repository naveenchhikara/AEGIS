import "server-only";
import { prismaForTenant } from "./prisma";
import type { Session } from "@/lib/auth";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Investment Records (R93-R94)
 * ═══════════════════════════════════════════════════════════════════════════
 */

export async function getInvestmentRecords(
  session: Session,
  options?: {
    securityType?: string;
    classification?: string;
    brokerName?: string;
    period?: string;
    reconciled?: boolean;
  }
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.investmentRecord.findMany({
    where: {
      tenantId,
      ...(options?.securityType && { securityType: options.securityType }),
      ...(options?.classification && { classification: options.classification }),
      ...(options?.brokerName && { brokerName: options.brokerName }),
      ...(options?.period && { period: options.period }),
      ...(options?.reconciled !== undefined && { reconciled: options.reconciled }),
    },
    orderBy: [{ period: "desc" }, { securityType: "asc" }],
  });
}

export async function getInvestmentRecord(
  session: Session,
  recordId: string
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.investmentRecord.findFirst({
    where: { id: recordId, tenantId },
  });
}

export async function createInvestmentRecord(
  session: Session,
  data: {
    securityType: string;
    classification: string;
    isin?: string;
    faceValue: number;
    bookValue: number;
    marketValue?: number;
    brokerName?: string;
    brokerShare?: number;
    sglAccount?: string;
    reconciled?: boolean;
    period: string;
  }
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.investmentRecord.create({
    data: {
      tenantId,
      ...data,
      reconciled: data.reconciled ?? false,
    },
  });
}

export async function updateInvestmentRecord(
  session: Session,
  recordId: string,
  data: {
    faceValue?: number;
    bookValue?: number;
    marketValue?: number;
    brokerShare?: number;
    reconciled?: boolean;
  }
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.investmentRecord.update({
    where: { id: recordId },
    data,
  });
}

/**
 * Get broker concentration analysis (R94).
 */
export async function getBrokerConcentration(
  session: Session,
  period: string
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  const records = await db.investmentRecord.findMany({
    where: {
      tenantId,
      period,
      brokerName: { not: null },
    },
    select: {
      brokerName: true,
      brokerShare: true,
      faceValue: true,
    },
  });

  // Group by broker
  const brokerMap = new Map<string, { totalValue: number; count: number; maxShare: number }>();
  
  records.forEach((r) => {
    if (!r.brokerName) return;
    const current = brokerMap.get(r.brokerName) || { totalValue: 0, count: 0, maxShare: 0 };
    current.totalValue += Number(r.faceValue);
    current.count += 1;
    if (r.brokerShare) {
      current.maxShare = Math.max(current.maxShare, Number(r.brokerShare));
    }
    brokerMap.set(r.brokerName, current);
  });

  return Array.from(brokerMap.entries()).map(([broker, stats]) => ({
    broker,
    ...stats,
  }));
}

/**
 * Get unreconciled investment records.
 */
export async function getUnreconciledInvestments(
  session: Session,
  period?: string
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.investmentRecord.findMany({
    where: {
      tenantId,
      reconciled: false,
      ...(period && { period }),
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Application Inventory (R98)
 * ═══════════════════════════════════════════════════════════════════════════
 */

export async function getApplicationInventory(
  session: Session,
  options?: {
    criticality?: string;
    hostingType?: string;
  }
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.applicationInventory.findMany({
    where: {
      tenantId,
      ...(options?.criticality && { criticality: options.criticality }),
      ...(options?.hostingType && { hostingType: options.hostingType }),
    },
    include: {
      _count: {
        select: { vendorRiskAssessments: true },
      },
    },
    orderBy: [{ criticality: "asc" }, { appName: "asc" }],
  });
}

export async function getApplication(
  session: Session,
  appId: string
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.applicationInventory.findFirst({
    where: { id: appId, tenantId },
    include: {
      vendorRiskAssessments: {
        orderBy: { lastAssessmentDate: "desc" },
      },
    },
  });
}

export async function createApplication(
  session: Session,
  data: {
    appName: string;
    vendor?: string;
    version?: string;
    hostingType: string;
    criticality: string;
    drTested?: boolean;
    lastDrTestDate?: Date;
    lastIsAuditDate?: Date;
    dataClassification?: string;
    description?: string;
  }
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.applicationInventory.create({
    data: {
      tenantId,
      ...data,
      drTested: data.drTested ?? false,
    },
  });
}

export async function updateApplication(
  session: Session,
  appId: string,
  data: {
    vendor?: string;
    version?: string;
    criticality?: string;
    drTested?: boolean;
    lastDrTestDate?: Date;
    lastIsAuditDate?: Date;
    dataClassification?: string;
    description?: string;
  }
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.applicationInventory.update({
    where: { id: appId },
    data,
  });
}

/**
 * Get applications pending DR test.
 */
export async function getApplicationsPendingDrTest(
  session: Session,
  monthsThreshold: number = 12
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsThreshold);

  return db.applicationInventory.findMany({
    where: {
      tenantId,
      OR: [
        { lastDrTestDate: null },
        { lastDrTestDate: { lt: cutoffDate } },
      ],
    },
    orderBy: { criticality: "asc" },
  });
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Vendor Risk Assessment (R100)
 * ═══════════════════════════════════════════════════════════════════════════
 */

export async function getVendorRiskAssessments(
  session: Session,
  options?: {
    vendorName?: string;
    riskRating?: string;
    applicationId?: string;
  }
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.vendorRiskAssessment.findMany({
    where: {
      tenantId,
      ...(options?.vendorName && { vendorName: options.vendorName }),
      ...(options?.riskRating && { riskRating: options.riskRating }),
      ...(options?.applicationId && { applicationId: options.applicationId }),
    },
    include: {
      application: {
        select: { appName: true, criticality: true },
      },
    },
    orderBy: { lastAssessmentDate: "desc" },
  });
}

export async function getVendorRiskAssessment(
  session: Session,
  assessmentId: string
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.vendorRiskAssessment.findFirst({
    where: { id: assessmentId, tenantId },
    include: {
      application: true,
    },
  });
}

export async function createVendorRiskAssessment(
  session: Session,
  data: {
    applicationId?: string;
    vendorName: string;
    contractStart?: Date;
    contractEnd?: Date;
    slaCompliance?: number;
    riskRating?: string;
    lastAssessmentDate?: Date;
    findings?: string;
    mitigations?: string;
  }
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.vendorRiskAssessment.create({
    data: {
      tenantId,
      ...data,
    },
  });
}

export async function updateVendorRiskAssessment(
  session: Session,
  assessmentId: string,
  data: {
    contractEnd?: Date;
    slaCompliance?: number;
    riskRating?: string;
    lastAssessmentDate?: Date;
    findings?: string;
    mitigations?: string;
  }
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.vendorRiskAssessment.update({
    where: { id: assessmentId },
    data,
  });
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * IS Audit Checklist (R99, R101, R103)
 * ═══════════════════════════════════════════════════════════════════════════
 */

export async function getIsAuditChecklists(
  session: Session,
  options?: {
    category?: string;
    engagementId?: string;
  }
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.isAuditChecklist.findMany({
    where: {
      tenantId,
      ...(options?.category && { category: options.category }),
      ...(options?.engagementId && { engagementId: options.engagementId }),
    },
    include: {
      engagement: {
        select: {
          id: true,
          auditNumber: true,
          branch: {
            select: { code: true, name: true },
          },
        },
      },
    },
    orderBy: [{ category: "asc" }, { createdAt: "desc" }],
  });
}

export async function getIsAuditChecklist(
  session: Session,
  checklistId: string
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.isAuditChecklist.findFirst({
    where: { id: checklistId, tenantId },
    include: {
      engagement: {
        include: {
          branch: true,
        },
      },
    },
  });
}

export async function createIsAuditChecklist(
  session: Session,
  data: {
    category: string;
    checklistName: string;
    items: any;
    engagementId?: string;
    completedById?: string;
  }
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.isAuditChecklist.create({
    data: {
      tenantId,
      ...data,
    },
  });
}

export async function updateIsAuditChecklist(
  session: Session,
  checklistId: string,
  data: {
    items?: any;
    completedById?: string;
    completedAt?: Date;
    overallRating?: string;
  }
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.isAuditChecklist.update({
    where: { id: checklistId },
    data,
  });
}

/**
 * Get incomplete IS audit checklists for an engagement.
 */
export async function getIncompleteIsChecklists(
  session: Session,
  engagementId: string
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.isAuditChecklist.findMany({
    where: {
      tenantId,
      engagementId,
      completedAt: null,
    },
    orderBy: { category: "asc" },
  });
}
