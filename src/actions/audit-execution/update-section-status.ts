"use server";

import { revalidatePath } from "next/cache";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import {
  UpdateSectionStatusSchema,
  type UpdateSectionStatusInput,
} from "./schemas";

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  NOT_STARTED: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: ["REVIEWED", "IN_PROGRESS"], // Can reopen
  REVIEWED: [], // Terminal
};

/**
 * Update the status of an audit section instance.
 * Enforces valid status transitions.
 * Security: Requires audit_execution:manage_sections permission.
 */
export async function updateSectionStatus(input: UpdateSectionStatusInput) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "audit_execution:manage_sections")) {
    return {
      success: false as const,
      error: "You do not have permission to update section status.",
    };
  }

  const parsed = UpdateSectionStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }
  const validated = parsed.data;

  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "audit_section.status_updated",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      const section = await tx.auditSectionInstance.findFirst({
        where: {
          engagementId: validated.engagementId,
          sectionCode: validated.sectionCode,
          tenantId,
        },
      });

      if (!section) {
        throw new Error("Section not found");
      }

      // Validate transition
      const allowed = VALID_TRANSITIONS[section.status] ?? [];
      if (!allowed.includes(validated.status)) {
        throw new Error(
          `Cannot transition from ${section.status} to ${validated.status}. Allowed: ${allowed.join(", ") || "none"}`,
        );
      }

      const updateData: any = { status: validated.status };
      if (validated.status === "COMPLETED") {
        updateData.completedAt = new Date();
      }
      if (validated.status === "REVIEWED") {
        updateData.reviewedAt = new Date();
      }

      return tx.auditSectionInstance.update({
        where: { id: section.id },
        data: updateData,
      });
    });

    revalidatePath("/audit-execution");
    return {
      success: true as const,
      data: { id: result.id, status: result.status },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update section status.";
    logger.error({ error, action: "update_section_status", tenantId }, message);
    return { success: false as const, error: message };
  }
}
