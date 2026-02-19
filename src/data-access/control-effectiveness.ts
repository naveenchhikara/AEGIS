import "server-only";
import { prismaForTenant } from "@/data-access/prisma";

/**
 * Fetch control effectiveness data from work program results (R58).
 * Aggregates test outcomes per control for analytics dashboard.
 */
export async function getControlEffectivenessData(tenantId: string) {
  const db = prismaForTenant(tenantId);

  // Get all work program items with their test results and linked controls
  const items = await db.workProgramItem.findMany({
    where: {
      tenantId,
      status: "COMPLETED",
      result: { not: null },
    },
    select: {
      result: true,
      testProcedure: {
        select: {
          control: {
            select: {
              id: true,
              controlCode: true,
              description: true,
              processArea: true,
            },
          },
        },
      },
    },
  });

  // Group by control
  const controlMap = new Map<
    string,
    {
      controlCode: string;
      controlName: string;
      processArea: string;
      totalTests: number;
      effectiveCount: number;
      partialCount: number;
      ineffectiveCount: number;
    }
  >();

  for (const item of items) {
    const control = item.testProcedure?.control;
    if (!control) continue;

    const key = control.id;
    if (!controlMap.has(key)) {
      controlMap.set(key, {
        controlCode: control.controlCode,
        controlName: control.description.slice(0, 80),
        processArea: control.processArea ?? "General",
        totalTests: 0,
        effectiveCount: 0,
        partialCount: 0,
        ineffectiveCount: 0,
      });
    }

    const entry = controlMap.get(key)!;
    entry.totalTests++;

    switch (item.result) {
      case "EFFECTIVE":
        entry.effectiveCount++;
        break;
      case "PARTIALLY_EFFECTIVE":
        entry.partialCount++;
        break;
      case "INEFFECTIVE":
        entry.ineffectiveCount++;
        break;
    }
  }

  // Compute scores
  return Array.from(controlMap.values()).map((c) => ({
    ...c,
    score:
      c.totalTests > 0
        ? ((c.effectiveCount * 100 + c.partialCount * 50) /
            (c.totalTests * 100)) *
          100
        : 0,
  }));
}
