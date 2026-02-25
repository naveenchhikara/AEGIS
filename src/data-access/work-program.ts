import "server-only";
import { prismaForTenant } from "./prisma";
import type { AuthSession as Session } from "@/lib/auth";

/**
 * Get all work program items with filters.
 */
export async function getWorkProgramItems(
  session: Session,
  options?: {
    engagementId?: string;
    assignedToId?: string;
    status?: string;
  },
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.workProgramItem.findMany({
    where: {
      tenantId,
      ...(options?.engagementId && { engagementId: options.engagementId }),
      ...(options?.assignedToId && { assignedToId: options.assignedToId }),
      ...(options?.status && { status: options.status }),
    },
    include: {
      engagement: {
        select: {
          id: true,
          auditNumber: true,
          status: true,
          branch: {
            select: { code: true, name: true },
          },
        },
      },
      testProcedure: {
        select: {
          id: true,
          name: true,
          description: true,
          sampleMethodology: true,
          sampleSize: true,
          control: {
            select: {
              id: true,
              controlCode: true,
              processArea: true,
              description: true,
            },
          },
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });
}

/**
 * Get a single work program item by ID with assigned user details.
 * Used for the detail page which needs full context including the assignee name.
 */
export async function getWorkProgramItemById(session: Session, itemId: string) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  const item = await db.workProgramItem.findFirst({
    where: { id: itemId, tenantId },
    include: {
      engagement: {
        select: {
          id: true,
          auditNumber: true,
          auditType: true,
          status: true,
          periodFrom: true,
          periodTo: true,
          branch: {
            select: { code: true, name: true, city: true },
          },
        },
      },
      testProcedure: {
        include: {
          control: {
            select: {
              id: true,
              controlCode: true,
              processArea: true,
              controlType: true,
              frequency: true,
              description: true,
              isKeyControl: true,
              riskRegister: {
                select: {
                  id: true,
                  riskStatement: true,
                  riskCategory: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!item) return null;

  // Fetch assigned user separately since WorkProgramItem has no relation to User
  let assignedTo: { id: string; name: string; email: string } | null = null;
  if (item.assignedToId) {
    assignedTo = await db.user.findFirst({
      where: { id: item.assignedToId, tenantId },
      select: { id: true, name: true, email: true },
    });
  }

  return { ...item, assignedTo };
}

/**
 * Get work program items by engagement for audit execution view.
 */
export async function getWorkProgramByEngagement(
  session: Session,
  engagementId: string,
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  const items = await db.workProgramItem.findMany({
    where: {
      tenantId,
      engagementId,
    },
    include: {
      testProcedure: {
        select: {
          id: true,
          name: true,
          description: true,
          control: {
            select: {
              controlCode: true,
              processArea: true,
              isKeyControl: true,
            },
          },
        },
      },
    },
    orderBy: [
      { status: "asc" },
      { testProcedure: { control: { processArea: "asc" } } },
    ],
  });

  // Calculate summary statistics
  const summary = {
    total: items.length,
    pending: items.filter((i) => i.status === "PENDING").length,
    inProgress: items.filter((i) => i.status === "IN_PROGRESS").length,
    completed: items.filter((i) => i.status === "COMPLETED").length,
    notApplicable: items.filter((i) => i.status === "NOT_APPLICABLE").length,
    effective: items.filter((i) => i.result === "EFFECTIVE").length,
    partiallyEffective: items.filter((i) => i.result === "PARTIALLY_EFFECTIVE")
      .length,
    ineffective: items.filter((i) => i.result === "INEFFECTIVE").length,
  };

  return { items, summary };
}

/**
 * Get work program items assigned to a specific auditor.
 */
export async function getMyWorkProgramItems(
  session: Session,
  userId: string,
  options?: {
    status?: string;
  },
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.workProgramItem.findMany({
    where: {
      tenantId,
      assignedToId: userId,
      ...(options?.status && { status: options.status }),
    },
    include: {
      engagement: {
        select: {
          id: true,
          auditNumber: true,
          status: true,
          branch: {
            select: { code: true, name: true },
          },
        },
      },
      testProcedure: {
        select: {
          id: true,
          name: true,
          control: {
            select: {
              controlCode: true,
              processArea: true,
              description: true,
            },
          },
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });
}

/**
 * Get completed work program items by result for effectiveness analysis.
 */
export async function getCompletedWorkProgramByResult(session: Session) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.workProgramItem.findMany({
    where: {
      tenantId,
      status: "COMPLETED",
      result: { not: null },
    },
    select: {
      id: true,
      result: true,
      completedAt: true,
      testProcedure: {
        select: {
          control: {
            select: {
              controlCode: true,
              processArea: true,
              isKeyControl: true,
            },
          },
        },
      },
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
    orderBy: { completedAt: "desc" },
  });
}
