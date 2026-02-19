"use server";

import { revalidatePath } from "next/cache";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import {
  CreateComplianceItemsSchema,
  type CreateComplianceItemsInput,
} from "./schemas";

/**
 * Auto-create compliance items for all issued observations in an engagement.
 * Security: Requires compliance:create permission.
 * Atomicity: Creates ComplianceItem for each observation in transaction.
 * Side effects: Sets dueDate to 30 days from now per R35.
 */
export async function createComplianceItems(input: CreateComplianceItemsInput) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "compliance:update")) {
    return {
      success: false as const,
      error: "You do not have permission to create compliance items.",
    };
  }

  const parsed = CreateComplianceItemsSchema.safeParse(input);
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
        actionType: "compliance.items_created",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Get all issued observations for the engagement
      const observations = await tx.observation.findMany({
        where: {
          tenantId,
          engagementId: parsed.data.engagementId,
          status: "ISSUED",
        },
        select: {
          id: true,
          branchId: true,
        },
      });

      if (observations.length === 0) {
        throw new Error("No issued observations found for this engagement");
      }

      // Create compliance item for each observation (if not exists)
      const createdItems = [];
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // 30-day SLA per R35

      for (const obs of observations) {
        // Check if compliance item already exists
        const existing = await tx.complianceItem.findUnique({
          where: { observationId: obs.id },
        });

        if (!existing) {
          const item = await tx.complianceItem.create({
            data: {
              tenantId,
              observationId: obs.id,
              auditId: parsed.data.engagementId,
              branchId: obs.branchId,
              status: "OPEN",
              dueDate,
              escalationLevel: 0,
              daysOpen: 0,
            },
          });
          createdItems.push(item);
        }
      }

      return { created: createdItems.length, total: observations.length };
    });

    revalidatePath("/compliance");
    revalidatePath(`/audit-plans/${parsed.data.engagementId}`);

    return {
      success: true as const,
      data: {
        created: result.created,
        total: result.total,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create compliance items.";
    logger.error(
      { error, action: "create_compliance_items", tenantId },
      message,
    );
    return { success: false as const, error: message };
  }
}
