"use server";

import { revalidatePath } from "next/cache";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import { getOpenComplianceItemsForEscalation } from "@/data-access/compliance";
import {
  computeBatchEscalation,
  type ComplianceItemForEscalation,
  type EscalationLevel,
} from "@/lib/escalation-engine";

/**
 * Compute and update escalation levels for all open compliance items.
 * Security: Requires compliance:read permission (intended for cron/admin).
 * Atomicity: Updates all items in a single transaction.
 * Side effects: Updates ComplianceItem.escalationLevel and daysOpen.
 *
 * This action is designed to be called by:
 * 1. Daily cron job (automated)
 * 2. Manual trigger from admin panel
 */
export async function computeEscalationForAllItems() {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  // Require at least compliance:read (typically CAE, AUDIT_MANAGER)
  if (!hasPermission(userRoles, "compliance:read")) {
    return {
      success: false as const,
      error: "You do not have permission to compute escalations.",
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    // Fetch all open compliance items
    const items = await getOpenComplianceItemsForEscalation(session);

    if (items.length === 0) {
      return {
        success: true as const,
        data: { processed: 0, updated: 0 },
      };
    }

    // Compute escalation updates
    const now = new Date();
    const updates = computeBatchEscalation(
      items as ComplianceItemForEscalation[],
      now
    );

    if (updates.length === 0) {
      logger.info(
        { tenantId, itemCount: items.length },
        "Escalation computation: no changes"
      );
      return {
        success: true as const,
        data: { processed: items.length, updated: 0 },
      };
    }

    // Apply updates in transaction
    await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "compliance.escalation_computed",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      for (const update of updates) {
        await tx.complianceItem.update({
          where: { id: update.id },
          data: {
            escalationLevel: update.newEscalationLevel,
            daysOpen: update.daysOpen,
            // If escalated to OVERDUE status
            ...(update.daysOverdue > 0 && {
              status: "OVERDUE",
            }),
          },
        });
      }
    });

    logger.info(
      {
        tenantId,
        processed: items.length,
        updated: updates.length,
        escalations: updates.map((u) => ({
          id: u.id.substring(0, 8),
          level: u.newEscalationLevel,
        })),
      },
      "Escalation computation completed"
    );

    revalidatePath("/compliance");

    return {
      success: true as const,
      data: {
        processed: items.length,
        updated: updates.length,
        escalations: updates.map((u) => ({
          id: u.id,
          level: u.newEscalationLevel,
          daysOverdue: u.daysOverdue,
        })),
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to compute escalations.";
    logger.error({ error, action: "compute_escalation", tenantId }, message);
    return { success: false as const, error: message };
  }
}
