import "server-only";
import { prismaForTenant } from "./prisma";
import type { Session } from "@/lib/auth";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Policy Documents (R84)
 * ═══════════════════════════════════════════════════════════════════════════
 */

export async function getPolicyDocuments(
  session: Session,
  options?: {
    category?: string;
    status?: string;
  },
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.policyDocument.findMany({
    where: {
      tenantId,
      ...(options?.category && { category: options.category }),
      ...(options?.status && { status: options.status }),
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function getPolicyDocument(session: Session, policyId: string) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.policyDocument.findFirst({
    where: { id: policyId, tenantId },
  });
}

export async function createPolicyDocument(
  session: Session,
  data: {
    name: string;
    category: string;
    approvalDate?: Date;
    reviewDueDate?: Date;
    version?: string;
    status?: string;
    documentUrl?: string;
    summary?: string;
  },
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.policyDocument.create({
    data: {
      tenantId,
      ...data,
      version: data.version || "1.0",
      status: data.status || "DRAFT",
    },
  });
}

export async function updatePolicyDocument(
  session: Session,
  policyId: string,
  data: {
    name?: string;
    approvalDate?: Date;
    reviewDueDate?: Date;
    version?: string;
    status?: string;
    documentUrl?: string;
    summary?: string;
  },
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.policyDocument.update({
    where: { id: policyId, tenantId },
    data,
  });
}

export async function deletePolicyDocument(session: Session, policyId: string) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.policyDocument.delete({
    where: { id: policyId, tenantId },
  });
}

/**
 * Get policies due for review.
 */
export async function getPoliciesDueForReview(
  session: Session,
  withinDays: number = 30,
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + withinDays);

  return db.policyDocument.findMany({
    where: {
      tenantId,
      status: "APPROVED",
      reviewDueDate: {
        lte: cutoffDate,
      },
    },
    orderBy: { reviewDueDate: "asc" },
  });
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Committees (R85)
 * ═══════════════════════════════════════════════════════════════════════════
 */

export async function getCommittees(
  session: Session,
  options?: {
    isActive?: boolean;
  },
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.committee.findMany({
    where: {
      tenantId,
      ...(options?.isActive !== undefined && { isActive: options.isActive }),
    },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      _count: {
        select: { meetings: true },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getCommittee(session: Session, committeeId: string) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.committee.findFirst({
    where: { id: committeeId, tenantId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, roles: true },
          },
        },
      },
      meetings: {
        orderBy: { meetingDate: "desc" },
        take: 10,
      },
    },
  });
}

export async function createCommittee(
  session: Session,
  data: {
    name: string;
    description?: string;
    isActive?: boolean;
  },
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.committee.create({
    data: {
      tenantId,
      ...data,
      isActive: data.isActive ?? true,
    },
  });
}

export async function updateCommittee(
  session: Session,
  committeeId: string,
  data: {
    name?: string;
    description?: string;
    isActive?: boolean;
  },
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.committee.update({
    where: { id: committeeId, tenantId },
    data,
  });
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Committee Members (R85)
 * ═══════════════════════════════════════════════════════════════════════════
 */

export async function addCommitteeMember(
  session: Session,
  data: {
    committeeId: string;
    userId: string;
    role: string;
  },
) {
  const db = prismaForTenant(session.user.tenantId);

  return db.committeeMember.create({
    data,
  });
}

export async function removeCommitteeMember(
  session: Session,
  memberId: string,
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  // CommitteeMember has no direct tenantId — verify via parent committee's tenantId
  return db.committeeMember.deleteMany({
    where: { id: memberId, committee: { tenantId } },
  });
}

export async function updateCommitteeMemberRole(
  session: Session,
  memberId: string,
  role: string,
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  // CommitteeMember has no direct tenantId — verify via parent committee's tenantId
  return db.committeeMember.updateMany({
    where: { id: memberId, committee: { tenantId } },
    data: { role },
  });
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Committee Meetings (R85)
 * ═══════════════════════════════════════════════════════════════════════════
 */

export async function getCommitteeMeetings(
  session: Session,
  options?: {
    committeeId?: string;
    status?: string;
    fromDate?: Date;
    toDate?: Date;
  },
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.committeeMeeting.findMany({
    where: {
      tenantId,
      ...(options?.committeeId && { committeeId: options.committeeId }),
      ...(options?.status && { status: options.status }),
      ...(options?.fromDate && { meetingDate: { gte: options.fromDate } }),
      ...(options?.toDate && { meetingDate: { lte: options.toDate } }),
    },
    include: {
      committee: {
        select: { name: true },
      },
    },
    orderBy: { meetingDate: "desc" },
  });
}

export async function getCommitteeMeeting(session: Session, meetingId: string) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.committeeMeeting.findFirst({
    where: { id: meetingId, tenantId },
    include: {
      committee: {
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      },
    },
  });
}

export async function createCommitteeMeeting(
  session: Session,
  data: {
    committeeId: string;
    meetingDate: Date;
    agendaItems?: any;
    attendees?: string[];
  },
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.committeeMeeting.create({
    data: {
      tenantId,
      ...data,
      status: "SCHEDULED",
    },
  });
}

export async function updateCommitteeMeeting(
  session: Session,
  meetingId: string,
  data: {
    meetingDate?: Date;
    agendaItems?: any;
    minutesRef?: string;
    status?: string;
    attendees?: string[];
  },
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.committeeMeeting.update({
    where: { id: meetingId, tenantId },
    data,
  });
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Housekeeping Metrics (R80)
 * ═══════════════════════════════════════════════════════════════════════════
 */

export async function getHousekeepingMetrics(
  session: Session,
  options?: {
    branchId?: string;
    metricType?: string;
    period?: string;
  },
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.housekeepingMetric.findMany({
    where: {
      tenantId,
      ...(options?.branchId && { branchId: options.branchId }),
      ...(options?.metricType && { metricType: options.metricType }),
      ...(options?.period && { period: options.period }),
    },
    include: {
      branch: {
        select: { code: true, name: true },
      },
    },
    orderBy: [{ period: "desc" }, { branchId: "asc" }],
  });
}

export async function getHousekeepingMetric(
  session: Session,
  metricId: string,
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.housekeepingMetric.findFirst({
    where: { id: metricId, tenantId },
    include: {
      branch: true,
    },
  });
}

export async function createHousekeepingMetric(
  session: Session,
  data: {
    branchId: string;
    metricType: string;
    period: string;
    openingBalance: number;
    closingBalance: number;
    entriesCount?: number;
    agingDays?: number;
    remarks?: string;
  },
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.housekeepingMetric.create({
    data: {
      tenantId,
      ...data,
      entriesCount: data.entriesCount || 0,
    },
  });
}

export async function updateHousekeepingMetric(
  session: Session,
  metricId: string,
  data: {
    openingBalance?: number;
    closingBalance?: number;
    entriesCount?: number;
    agingDays?: number;
    remarks?: string;
  },
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.housekeepingMetric.update({
    where: { id: metricId, tenantId },
    data,
  });
}

/**
 * Get high-risk housekeeping metrics (for dashboard).
 */
export async function getHighRiskHousekeepingMetrics(
  session: Session,
  thresholdDays: number = 90,
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.housekeepingMetric.findMany({
    where: {
      tenantId,
      agingDays: {
        gte: thresholdDays,
      },
    },
    include: {
      branch: {
        select: { code: true, name: true },
      },
    },
    orderBy: { agingDays: "desc" },
  });
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ACB Dashboard (R81)
 * ═══════════════════════════════════════════════════════════════════════════
 */

export async function getAcbDashboardData(session: Session) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  const [
    criticalObs,
    complianceStats,
    overdueItems,
    recentAudits,
    riskMetrics,
  ] = await Promise.all([
    db.observation.count({
      where: {
        tenantId,
        severity: { in: ["HIGH", "CRITICAL"] },
        status: { not: "CLOSED" },
      },
    }),
    db.complianceItem.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: true,
    }),
    db.complianceItem.count({
      where: {
        tenantId,
        dueDate: { lt: new Date() },
        status: { notIn: ["CLOSED", "ZAC_APPROVED"] },
      },
    }),
    db.auditEngagement.count({
      where: { tenantId, status: "COMPLETED" },
    }),
    db.housekeepingMetric.findMany({
      where: {
        tenantId,
        agingDays: { gte: 90 },
      },
      take: 5,
      orderBy: { agingDays: "desc" },
      include: {
        branch: {
          select: { name: true },
        },
      },
    }),
  ]);

  return {
    criticalObs,
    complianceStats,
    overdueItems,
    recentAudits,
    riskMetrics,
  };
}
