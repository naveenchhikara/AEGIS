"use server";

import { revalidatePath } from "next/cache";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/lib/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import { CreateEngagementSchema, type CreateEngagementInput } from "./schemas";

/**
 * Create a new audit engagement.
 *
 * Security:
 * - Requires audit_execution:create permission
 * - tenantId sourced from authenticated session
 *
 * Atomicity:
 * - Creates AuditEngagement record
 * - Sets audit context for AuditLog trigger
 *
 * @param input - Engagement creation data
 * @returns Success with engagement ID or error message
 */
export async function createEngagement(input: CreateEngagementInput) {
  // ─── Step 1: Authentication ────────────────────────────────────
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  // ─── Step 2: Permission Check ──────────────────────────────────
  if (!hasPermission(userRoles, "audit_execution:create")) {
    return {
      success: false as const,
      error: "You do not have permission to create audit engagements.",
    };
  }

  // ─── Step 3: Input Validation ──────────────────────────────────
  const parsed = CreateEngagementSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }
  const validated = parsed.data;

  // ─── Step 4: Tenant-Scoped Database ────────────────────────────
  const db = prismaForTenant(tenantId);

  // ─── Step 5: Transaction (Atomic Operation) ────────────────────
  try {
    const result = await db.$transaction(async (tx: any) => {
      // Set audit context for AuditLog trigger
      await setAuditContext(tx, {
        actionType: "audit_engagement.created",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Create AuditEngagement
      const engagement = await tx.auditEngagement.create({
        data: {
          tenantId,
          auditPlanId: validated.auditPlanId,
          branchId: validated.branchId,
          auditAreaId: validated.auditAreaId,
          auditNumber: validated.auditNumber,
          auditType: validated.auditType,
          visitNumber: validated.visitNumber,
          periodFrom: new Date(validated.periodFrom),
          periodTo: new Date(validated.periodTo),
          scheduledStartDate: validated.scheduledStartDate
            ? new Date(validated.scheduledStartDate)
            : undefined,
          status: "PLANNED",
        },
      });

      return engagement;
    });

    // ─── Step 6: Cache Revalidation ────────────────────────────
    revalidatePath("/audit-execution");

    // ─── Step 7: Success Response ──────────────────────────────
    return {
      success: true as const,
      data: { id: result.id },
    };
  } catch (error) {
    // ─── Step 8: Error Handling ────────────────────────────────
    logger.error(
      { error, action: "create_engagement", tenantId },
      "Failed to create audit engagement"
    );

    return {
      success: false as const,
      error: "Failed to create audit engagement. Please try again.",
    };
  }
}
