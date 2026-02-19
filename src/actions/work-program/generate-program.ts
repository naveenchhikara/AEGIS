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
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

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

      // Get test procedures to include
      let testProcedures;
      if (parsed.data.testProcedureIds && parsed.data.testProcedureIds.length > 0) {
        // Use specified test procedures
        testProcedures = await tx.testProcedure.findMany({
          where: {
            tenantId,
            id: { in: parsed.data.testProcedureIds },
          },
        });
      } else {
        // Get all test procedures for key controls
        testProcedures = await tx.testProcedure.findMany({
          where: {
            tenantId,
            control: {
              isKeyControl: true,
            },
          },
        });
      }

      if (testProcedures.length === 0) {
        throw new Error("No test procedures found to generate work program");
      }

      // Create work program items
      const createdItems = [];
      for (const testProcedure of testProcedures) {
        // Check if work program item already exists
        const existing = await tx.workProgramItem.findFirst({
          where: {
            tenantId,
            engagementId: parsed.data.engagementId,
            testProcedureId: testProcedure.id,
          },
        });

        if (!existing) {
          // Auto-assign to lead auditor if requested
          let assignedToId = undefined;
          if (parsed.data.autoAssign) {
            const leadAuditor = engagement.teamMembers.find(
              (tm: any) => tm.roleInEngagement === "LEAD_AUDITOR"
            );
            assignedToId = leadAuditor?.userId;
          }

          const item = await tx.workProgramItem.create({
            data: {
              tenantId,
              engagementId: parsed.data.engagementId,
              testProcedureId: testProcedure.id,
              assignedToId,
              status: "PENDING",
            },
          });
          createdItems.push(item);
        }
      }

      return {
        created: createdItems.length,
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
