"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission } from "@/lib/permissions";
import { logger } from "@/lib/logger";

const VerifyEvidenceSchema = z.object({
  actionPlanId: z.string().uuid("Invalid action plan ID"),
});

/**
 * Verify/approve evidence on an action plan (R61).
 * Sets verifiedById and verifiedAt on the ActionPlan record.
 * Security: Requires issue:manage permission.
 */
export async function verifyEvidence(input: { actionPlanId: string }) {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  const parsed = VerifyEvidenceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }

  if (!hasPermission(userRoles, "issue:manage")) {
    return {
      success: false as const,
      error: "You do not have permission to verify evidence.",
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const actionPlan = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "action_plan.evidence_verified",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      const existing = await tx.actionPlan.findFirst({
        where: { id: parsed.data.actionPlanId, tenantId },
      });

      if (!existing) {
        throw new Error("Action plan not found");
      }

      if (existing.verifiedAt) {
        throw new Error("Evidence has already been verified");
      }

      return tx.actionPlan.update({
        where: { id: parsed.data.actionPlanId },
        data: {
          verifiedById: session.user.id,
          verifiedAt: new Date(),
        },
        include: {
          issue: { select: { id: true } },
        },
      });
    });

    revalidatePath("/issues");
    revalidatePath(`/issues/${actionPlan.issue?.id}`);

    return {
      success: true as const,
      data: actionPlan,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to verify evidence.";
    logger.error({ error, action: "verify_evidence", tenantId }, message);
    return { success: false as const, error: message };
  }
}
