"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";

const ExecuteWorkProgramItemSchema = z.object({
  workProgramItemId: z.string().uuid(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "NOT_APPLICABLE"]),
  result: z
    .enum(["EFFECTIVE", "PARTIALLY_EFFECTIVE", "INEFFECTIVE"])
    .optional(),
  findings: z.string().optional(),
  evidence: z.array(z.string()).optional(), // S3 keys
});

type ExecuteWorkProgramItemInput = z.infer<typeof ExecuteWorkProgramItemSchema>;

/**
 * Execute a work program item - record result and evidence (R57).
 * Security: Requires work_program:execute permission.
 */
export async function executeWorkProgramItem(
  input: ExecuteWorkProgramItemInput,
) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "work_program:execute")) {
    return {
      success: false as const,
      error: "You do not have permission to execute work program items.",
    };
  }

  const parsed = ExecuteWorkProgramItemSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }

  // Validation: result is required if status is COMPLETED
  if (parsed.data.status === "COMPLETED" && !parsed.data.result) {
    return {
      success: false as const,
      error: "Result is required when marking item as completed.",
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const workProgramItem = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "work_program.item_executed",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Update work program item
      const item = await tx.workProgramItem.update({
        where: { id: parsed.data.workProgramItemId, tenantId },
        data: {
          status: parsed.data.status,
          result: parsed.data.result,
          findings: parsed.data.findings,
          evidence: parsed.data.evidence,
          completedAt:
            parsed.data.status === "COMPLETED" ? new Date() : undefined,
        },
        include: {
          testProcedure: {
            include: {
              control: true,
            },
          },
          engagement: {
            select: {
              id: true,
              auditNumber: true,
            },
          },
        },
      });

      // If completed, update control effectiveness score
      if (parsed.data.status === "COMPLETED" && parsed.data.result) {
        // Get all completed work program items for this control
        const controlId = item.testProcedure.controlId;
        const allItems = await tx.workProgramItem.findMany({
          where: {
            tenantId,
            status: "COMPLETED",
            result: { not: null },
            testProcedure: {
              controlId,
            },
          },
          select: { result: true },
        });

        // Calculate effectiveness score (R58)
        let effectiveCount = 0;
        let partialCount = 0;
        let ineffectiveCount = 0;

        for (const item of allItems) {
          if (item.result === "EFFECTIVE") effectiveCount++;
          else if (item.result === "PARTIALLY_EFFECTIVE") partialCount++;
          else if (item.result === "INEFFECTIVE") ineffectiveCount++;
        }

        const total = allItems.length;
        const effectivenessScore =
          total > 0
            ? Math.round(
                ((effectiveCount * 100 + partialCount * 50) / total) * 100,
              ) / 100
            : null;

        // Update control effectiveness score
        await tx.controlLibrary.update({
          where: { id: controlId, tenantId },
          data: {
            effectivenessScore,
            lastTestedDate: new Date(),
          },
        });
      }

      return item;
    });

    revalidatePath("/work-program");
    revalidatePath(`/work-program/${parsed.data.workProgramItemId}`);
    revalidatePath(
      `/audit-plans/${workProgramItem.engagement.id}/work-program`,
    );

    return {
      success: true as const,
      data: workProgramItem,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to execute work program item.";
    logger.error(
      { error, action: "execute_work_program_item", tenantId },
      message,
    );
    return { success: false as const, error: message };
  }
}

/**
 * Assign a work program item to an auditor.
 * Security: Requires work_program:execute or audit_execution:manage_team permission.
 */
export async function assignWorkProgramItem(
  workProgramItemId: string,
  assignedToId: string,
) {
  if (
    !z.string().uuid().safeParse(workProgramItemId).success ||
    !z.string().uuid().safeParse(assignedToId).success
  ) {
    return { success: false as const, error: "Invalid ID format." };
  }
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (
    !hasPermission(userRoles, "work_program:execute") &&
    !hasPermission(userRoles, "audit_execution:manage_team")
  ) {
    return {
      success: false as const,
      error: "You do not have permission to assign work program items.",
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const workProgramItem = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "work_program.item_assigned",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      return tx.workProgramItem.update({
        where: { id: workProgramItemId, tenantId },
        data: { assignedToId },
      });
    });

    revalidatePath("/work-program");
    revalidatePath(`/work-program/${workProgramItemId}`);

    return {
      success: true as const,
      data: workProgramItem,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to assign work program item.";
    logger.error(
      { error, action: "assign_work_program_item", tenantId },
      message,
    );
    return { success: false as const, error: message };
  }
}
