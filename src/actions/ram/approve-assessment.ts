"use server";

import { revalidatePath } from "next/cache";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import { AssessmentIdSchema } from "./schemas";

/**
 * Approve a computed RAM assessment.
 * Security: Requires ram:approve permission (CAE only).
 * Maker-checker: Approver cannot be the same as the computer.
 */
export async function approveRamAssessment(input: { assessmentId: string }) {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (!hasPermission(userRoles, "ram:approve")) {
    return {
      success: false as const,
      error: "You do not have permission to approve RAM assessments.",
    };
  }

  const parsed = AssessmentIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }

  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "ram_assessment.approved",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      const assessment = await tx.ramAssessment.findFirst({
        where: { id: parsed.data.assessmentId, tenantId },
      });

      if (!assessment) {
        throw new Error("Assessment not found");
      }
      if (assessment.status !== "COMPUTED") {
        throw new Error("Only computed assessments can be approved");
      }
      // Maker-checker: approver ≠ computer
      if (assessment.computedById === session.user.id) {
        throw new Error(
          "The person who computed the assessment cannot approve it",
        );
      }

      return tx.ramAssessment.update({
        where: { id: assessment.id },
        data: {
          status: "APPROVED",
          approvedById: session.user.id,
          approvedAt: new Date(),
        },
      });
    });

    revalidatePath("/ram");
    return {
      success: true as const,
      data: { id: result.id, status: "APPROVED" },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to approve RAM assessment.";
    logger.error(
      { error, action: "approve_ram_assessment", tenantId },
      message,
    );
    return { success: false as const, error: message };
  }
}
