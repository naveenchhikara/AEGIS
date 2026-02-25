"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission } from "@/lib/permissions";
import { logger } from "@/lib/logger";

const CreateWorkProgramItemSchema = z.object({
  engagementId: z.string().uuid(),
  controlId: z.string().uuid(),
  name: z.string().min(1, "Test procedure name is required"),
  description: z.string().min(1, "Description is required"),
  sampleMethodology: z
    .enum(["RANDOM", "JUDGMENTAL", "SYSTEMATIC", "MONETARY_UNIT"])
    .optional(),
  sampleSize: z.number().int().positive().optional(),
});

type CreateWorkProgramItemInput = z.infer<typeof CreateWorkProgramItemSchema>;

/**
 * Manually create a work program item by creating a test procedure and linking it.
 * Security: Requires work_program:execute permission.
 */
export async function createWorkProgramItem(input: CreateWorkProgramItemInput) {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (!hasPermission(userRoles, "work_program:execute")) {
    return {
      success: false as const,
      error: "You do not have permission to create work program items.",
    };
  }

  const parsed = CreateWorkProgramItemSchema.safeParse(input);
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
        actionType: "work_program.item_created",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Verify the engagement exists and belongs to this tenant
      const engagement = await tx.auditEngagement.findFirst({
        where: { id: parsed.data.engagementId, tenantId },
        select: { id: true },
      });

      if (!engagement) {
        throw new Error("Engagement not found");
      }

      // Verify the control exists and belongs to this tenant
      const control = await tx.controlLibrary.findFirst({
        where: { id: parsed.data.controlId, tenantId },
        select: { id: true },
      });

      if (!control) {
        throw new Error("Control not found");
      }

      // Create the test procedure
      const testProcedure = await tx.testProcedure.create({
        data: {
          tenantId,
          controlId: parsed.data.controlId,
          name: parsed.data.name,
          description: parsed.data.description,
          sampleMethodology: parsed.data.sampleMethodology,
          sampleSize: parsed.data.sampleSize,
        },
      });

      // Create the work program item linked to the test procedure
      const workProgramItem = await tx.workProgramItem.create({
        data: {
          tenantId,
          engagementId: parsed.data.engagementId,
          testProcedureId: testProcedure.id,
          status: "PENDING",
        },
      });

      return workProgramItem;
    });

    revalidatePath("/work-program");
    revalidatePath(`/work-program/${result.id}`);

    return {
      success: true as const,
      data: result,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create work program item.";
    logger.error(
      { error, action: "create_work_program_item", tenantId },
      message,
    );
    return { success: false as const, error: message };
  }
}
