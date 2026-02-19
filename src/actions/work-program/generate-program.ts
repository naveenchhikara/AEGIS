"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";

const GenerateWorkProgramSchema = z.object({
  engagementId: z.string().uuid(),
  testProcedureIds: z.array(z.string().uuid()).optional(),
  autoAssign: z.boolean().optional(),
});

type GenerateWorkProgramInput = z.infer<typeof GenerateWorkProgramSchema>;

/**
 * Auto-generate work program for an audit engagement (R57).
 * Creates work program items from test procedures linked to relevant controls.
 * Security: Requires work_program:execute permission.
 */
export async function generateWorkProgram(input: GenerateWorkProgramInput) {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (!hasPermission(userRoles, "work_program:execute")) {
    return {
      success: false as const,
      error: "You do not have permission to generate work programs.",
    };
  }

  const parsed = GenerateWorkProgramSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "work_program.generated",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Get engagement to determine scope
      const engagement = await tx.auditEngagement.findFirst({
        where: { id: parsed.data.engagementId, tenantId },
        include: {
          teamMembers: {
            select: { userId: true, roleInEngagement: true },
          },
        },
      });

      if (!engagement) {
        throw new Error("Engagement not found");
      }

      // Get test procedures to include (with safety limit)
      let testProcedures;
      if (
        parsed.data.testProcedureIds &&
        parsed.data.testProcedureIds.length > 0
      ) {
        // Use specified test procedures
        testProcedures = await tx.testProcedure.findMany({
          where: {
            tenantId,
            id: { in: parsed.data.testProcedureIds },
          },
          take: 500, // Safety guard — prevents memory explosion
        });
      } else {
        // Get all test procedures for key controls (with safety guard)
        testProcedures = await tx.testProcedure.findMany({
          where: {
            tenantId,
            control: {
              isKeyControl: true,
            },
          },
          take: 500, // Safety guard — prevents memory explosion
        });
      }

      if (testProcedures.length === 0) {
        throw new Error("No test procedures found to generate work program");
      }

      // Fetch all existing work program items for the engagement in one query
      const existingItems = await tx.workProgramItem.findMany({
        where: {
          tenantId,
          engagementId: parsed.data.engagementId,
        },
        select: { testProcedureId: true },
      });

      const existingProcedureIds = new Set(
        existingItems
          .map((i) => i.testProcedureId)
          .filter((id): id is string => !!id),
      );

      // Filter to only new procedures that need work program items
      const newProcedures = testProcedures.filter(
        (tp) => !existingProcedureIds.has(tp.id),
      );

      // Auto-assign to lead auditor if requested
      let assignedToId: string | undefined = undefined;
      if (parsed.data.autoAssign) {
        const leadAuditor = engagement.teamMembers.find(
          (tm: any) => tm.roleInEngagement === "LEAD_AUDITOR",
        );
        assignedToId = leadAuditor?.userId;
      }

      // Batch-create all new work program items with createMany
      if (newProcedures.length > 0) {
        await tx.workProgramItem.createMany({
          data: newProcedures.map((tp) => ({
            tenantId,
            engagementId: parsed.data.engagementId,
            testProcedureId: tp.id,
            assignedToId,
            status: "PENDING" as const,
          })),
          skipDuplicates: true,
        });
      }

      return {
        created: newProcedures.length,
        total: testProcedures.length,
        engagementId: parsed.data.engagementId,
      };
    });

    revalidatePath(`/audit-plans/${parsed.data.engagementId}/work-program`);
    revalidatePath("/work-program");

    return {
      success: true as const,
      data: result,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate work program.";
    logger.error({ error, action: "generate_work_program", tenantId }, message);
    return { success: false as const, error: message };
  }
}
