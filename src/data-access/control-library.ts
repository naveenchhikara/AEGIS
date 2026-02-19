import "server-only";
import { prismaForTenant } from "./prisma";
import type { Session } from "@/lib/auth";

/**
 * Get all controls with filters.
 */
export async function getControls(
  session: Session,
  options?: {
    processArea?: string;
    controlType?: string;
    isKeyControl?: boolean;
    riskRegisterId?: string;
  },
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.controlLibrary.findMany({
    where: {
      tenantId,
      ...(options?.processArea && { processArea: options.processArea }),
      ...(options?.controlType && { controlType: options.controlType }),
      ...(options?.isKeyControl !== undefined && {
        isKeyControl: options.isKeyControl,
      }),
      ...(options?.riskRegisterId && {
        riskRegisterId: options.riskRegisterId,
      }),
    },
    include: {
      riskRegister: {
        select: {
          id: true,
          riskStatement: true,
          entity: { select: { name: true } },
        },
      },
      testProcedures: {
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
      },
      issues: {
        where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
        select: { id: true, title: true, severity: true },
      },
    },
    orderBy: [
      { isKeyControl: "desc" },
      { processArea: "asc" },
      { controlCode: "asc" },
    ],
  });
}

/**
 * Get a single control by ID.
 */
export async function getControl(session: Session, controlId: string) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.controlLibrary.findFirst({
    where: { id: controlId, tenantId },
    include: {
      riskRegister: {
        select: {
          id: true,
          riskStatement: true,
          riskCategory: true,
          entity: {
            select: { id: true, name: true, entityType: true },
          },
        },
      },
      testProcedures: {
        orderBy: { createdAt: "asc" },
      },
      issues: {
        include: {
          actionPlans: {
            select: { id: true, title: true, status: true, dueDate: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

/**
 * Get all test procedures with filters.
 */
export async function getTestProcedures(
  session: Session,
  options?: {
    controlId?: string;
  },
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.testProcedure.findMany({
    where: {
      tenantId,
      ...(options?.controlId && { controlId: options.controlId }),
    },
    include: {
      control: {
        select: {
          id: true,
          controlCode: true,
          processArea: true,
          description: true,
        },
      },
      workProgramItems: {
        select: {
          id: true,
          status: true,
          result: true,
          engagement: {
            select: { id: true, auditNumber: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Get a single test procedure by ID.
 */
export async function getTestProcedure(
  session: Session,
  testProcedureId: string,
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.testProcedure.findFirst({
    where: { id: testProcedureId, tenantId },
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
        },
      },
      workProgramItems: {
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
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

/**
 * Get key controls with low effectiveness scores (<60%) for risk monitoring.
 */
export async function getIneffectiveKeyControls(session: Session) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.controlLibrary.findMany({
    where: {
      tenantId,
      isKeyControl: true,
      effectivenessScore: { lt: 60 },
    },
    include: {
      riskRegister: {
        select: {
          id: true,
          riskStatement: true,
          residualScore: true,
        },
      },
      testProcedures: {
        select: { id: true, name: true },
      },
      issues: {
        where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
        select: { id: true, title: true, severity: true },
      },
    },
    orderBy: { effectivenessScore: "asc" },
  });
}

/**
 * Get controls by process area for coverage analysis.
 */
export async function getControlsByProcessArea(session: Session) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  const controls = await db.controlLibrary.findMany({
    where: { tenantId },
    select: {
      processArea: true,
      controlType: true,
      isKeyControl: true,
      effectivenessScore: true,
    },
  });

  // Group by process area
  const grouped = controls.reduce((acc: Record<string, any>, ctrl) => {
    if (!acc[ctrl.processArea]) {
      acc[ctrl.processArea] = {
        processArea: ctrl.processArea,
        totalControls: 0,
        keyControls: 0,
        avgEffectiveness: 0,
        controlTypes: {},
      };
    }

    acc[ctrl.processArea].totalControls++;
    if (ctrl.isKeyControl) acc[ctrl.processArea].keyControls++;

    const type = ctrl.controlType;
    if (!acc[ctrl.processArea].controlTypes[type]) {
      acc[ctrl.processArea].controlTypes[type] = 0;
    }
    acc[ctrl.processArea].controlTypes[type]++;

    return acc;
  }, {});

  return Object.values(grouped);
}
