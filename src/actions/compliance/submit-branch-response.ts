"use server";

import { revalidatePath } from "next/cache";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import { SubmitBranchResponseSchema, type SubmitBranchResponseInput } from "./schemas";

/**
 * Submit branch response to a compliance item.
 * Security: Requires compliance:branch_response permission (BRANCH_HEAD, AUDITEE).
 * Atomicity: Updates ComplianceItem with response + evidence in transaction.
 * Side effects: Transitions status to BRANCH_RESPONSE_SUBMITTED.
 */
export async function submitBranchResponse(input: SubmitBranchResponseInput) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "compliance:branch_response")) {
    return {
      success: false as const,
      error: "You do not have permission to submit branch responses.",
    };
  }

  const parsed = SubmitBranchResponseSchema.safeParse(input);
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
        actionType: "compliance.branch_response_submitted",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Verify compliance item exists and is open
      const item = await tx.complianceItem.findFirst({
        where: { id: parsed.data.complianceItemId, tenantId },
      });

      if (!item) {
        throw new Error("Compliance item not found");
      }

      if (item.status !== "OPEN" && item.status !== "BRANCH_RESPONSE_DUE") {
        throw new Error("Can only respond to open compliance items");
      }

      // Update compliance item
      return tx.complianceItem.update({
        where: { id: item.id },
        data: {
          branchResponseText: parsed.data.responseText,
          branchResponseDate: new Date(),
          branchResponseEvidence: parsed.data.evidenceS3Keys || [],
          status: "BRANCH_RESPONSE_SUBMITTED",
        },
      });
    });

    revalidatePath("/compliance");
    revalidatePath(`/compliance/${result.id}`);

    return {
      success: true as const,
      data: { id: result.id, status: "BRANCH_RESPONSE_SUBMITTED" },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to submit branch response.";
    logger.error({ error, action: "submit_branch_response", tenantId }, message);
    return { success: false as const, error: message };
  }
}
