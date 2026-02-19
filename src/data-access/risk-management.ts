import "server-only";
import { prismaForTenant } from "./prisma";
import type { Session } from "@/lib/auth";

/**
 * Get all audit universe entities for the tenant with filters.
 */
export async function getAuditUniverseEntities(
  session: Session,
  options?: {
    entityType?: string;
    branchId?: string;
  },
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.auditUniverseEntity.findMany({
    where: {
      tenantId,
      ...(options?.entityType && { entityType: options.entityType }),
      ...(options?.branchId && { branchId: options.branchId }),
    },
    include: {
      branch: {
        select: { id: true, code: true, name: true, city: true },
      },
      riskRegisters: {
        select: {
          id: true,
          riskStatement: true,
          riskCategory: true,
          residualScore: true,
        },
        orderBy: { residualScore: "desc" },
        take: 5,
      },
    },
    orderBy: [{ entityType: "asc" }, { name: "asc" }],
  });
}

/**
 * Get a single audit universe entity by ID.
 */
export async function getAuditUniverseEntity(
  session: Session,
  entityId: string,
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.auditUniverseEntity.findFirst({
    where: { id: entityId, tenantId },
    include: {
      branch: {
        select: { id: true, code: true, name: true },
      },
      riskRegisters: {
        include: {
          kris: {
            select: {
              id: true,
              name: true,
              breachStatus: true,
              currentValue: true,
            },
          },
        },
        orderBy: { residualScore: "desc" },
      },
      riskAuditLinkages: {
        include: {
          engagement: {
            select: {
              id: true,
              auditNumber: true,
              status: true,
              scheduledStartDate: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

/**
 * Get all risk register entries with filters.
 */
export async function getRiskRegisters(
  session: Session,
  options?: {
    entityId?: string;
    riskCategory?: string;
    status?: string;
  },
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.riskRegister.findMany({
    where: {
      tenantId,
      ...(options?.entityId && { entityId: options.entityId }),
      ...(options?.riskCategory && { riskCategory: options.riskCategory }),
      ...(options?.status && { status: options.status }),
    },
    include: {
      entity: {
        select: { id: true, name: true, entityType: true },
      },
      kris: {
        select: {
          id: true,
          name: true,
          breachStatus: true,
          currentValue: true,
        },
      },
      linkedControls: {
        select: {
          id: true,
          controlCode: true,
          description: true,
          effectivenessScore: true,
        },
      },
    },
    orderBy: { residualScore: "desc" },
  });
}

/**
 * Get a single risk register entry by ID.
 */
export async function getRiskRegister(session: Session, riskId: string) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.riskRegister.findFirst({
    where: { id: riskId, tenantId },
    include: {
      entity: {
        select: { id: true, name: true, entityType: true, branch: true },
      },
      kris: {
        orderBy: { lastUpdated: "desc" },
      },
      linkedControls: {
        include: {
          testProcedures: {
            select: { id: true, name: true },
          },
        },
      },
      riskAuditLinkages: {
        include: {
          engagement: {
            select: {
              id: true,
              auditNumber: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

/**
 * Get all KRIs for a risk register entry.
 */
export async function getKeyRiskIndicators(
  session: Session,
  riskRegisterId: string,
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.keyRiskIndicator.findMany({
    where: {
      tenantId,
      riskRegisterId,
    },
    orderBy: [
      { breachStatus: "desc" }, // Breaches first
      { lastUpdated: "desc" },
    ],
  });
}

/**
 * Get a single KRI by ID.
 */
export async function getKeyRiskIndicator(session: Session, kriId: string) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.keyRiskIndicator.findFirst({
    where: { id: kriId, tenantId },
    include: {
      riskRegister: {
        select: {
          id: true,
          riskStatement: true,
          entity: {
            select: { name: true },
          },
        },
      },
    },
  });
}

/**
 * Get all risk-audit linkages with filters.
 */
export async function getRiskAuditLinkages(
  session: Session,
  options?: {
    entityId?: string;
    engagementId?: string;
    thematicArea?: string;
  },
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.riskAuditLinkage.findMany({
    where: {
      tenantId,
      ...(options?.entityId && { entityId: options.entityId }),
      ...(options?.engagementId && { engagementId: options.engagementId }),
      ...(options?.thematicArea && { thematicArea: options.thematicArea }),
    },
    include: {
      entity: {
        select: { id: true, name: true, entityType: true },
      },
      riskRegister: {
        select: {
          id: true,
          riskStatement: true,
          riskCategory: true,
          residualScore: true,
        },
      },
      engagement: {
        select: { id: true, auditNumber: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get high-risk entities (residual score > 3.5) for audit planning.
 */
export async function getHighRiskEntities(session: Session) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.auditUniverseEntity.findMany({
    where: {
      tenantId,
      riskScore: { gt: 3.5 },
    },
    include: {
      branch: {
        select: { id: true, code: true, name: true },
      },
      riskRegisters: {
        where: { residualScore: { gt: 3.5 } },
        select: { id: true, riskStatement: true, residualScore: true },
      },
    },
    orderBy: { riskScore: "desc" },
  });
}

/**
 * Get breached KRIs for monitoring dashboard.
 */
export async function getBreachedKRIs(session: Session) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.keyRiskIndicator.findMany({
    where: {
      tenantId,
      breachStatus: { in: ["WARNING", "BREACH"] },
    },
    include: {
      riskRegister: {
        select: {
          id: true,
          riskStatement: true,
          entity: {
            select: { name: true, entityType: true },
          },
        },
      },
    },
    orderBy: [{ breachStatus: "desc" }, { lastUpdated: "desc" }],
  });
}
