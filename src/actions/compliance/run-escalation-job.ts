"use server";

/**
 * Compliance Escalation Job (Phase 2 — R39)
 *
 * Full escalation pipeline: compute levels → route notifications → create queue entries.
 * Can be triggered manually (via session) or by cron (via tenantId).
 */

import { prismaForTenant } from "@/data-access/prisma";
import { getRequiredSession } from "@/data-access/session";
import { hasPermission } from "@/lib/permissions";
import {
  computeBatchEscalation,
  type ComplianceItemForEscalation,
} from "@/lib/escalation-engine";
import { getEscalationRoute } from "@/lib/escalation-router";
import {
  getOpenComplianceItemsWithContext,
  getEscalationRecipients,
} from "@/data-access/compliance-items";
import { logger } from "@/lib/logger";

/**
 * Run escalation job (session-based, for manual trigger).
 * Requires CAE/AUDIT_MANAGER permission.
 */
export async function runEscalationJob() {
  const session = await getRequiredSession();

  if (!hasPermission(session.user.roles as any, "escalation:compute")) {
    throw new Error("Unauthorized: escalation:compute permission required");
  }

  const tenantId = session.user.tenantId;

  return runEscalationJobInternal(tenantId);
}

/**
 * Run escalation job (internal, for cron).
 * No session requirement — called by cron route with tenantId.
 */
export async function runEscalationJobInternal(tenantId: string) {
  const db = prismaForTenant(tenantId);

  try {
    logger.info({ tenantId }, "Starting escalation job");

    // Step 1: Fetch all open compliance items with context
    const items = await db.complianceItem.findMany({
      where: {
        tenantId,
        status: {
          notIn: ["CLOSED"],
        },
      },
      select: {
        id: true,
        createdAt: true,
        dueDate: true,
        escalationLevel: true,
        branchId: true,
        observation: {
          select: {
            id: true,
            title: true,
            severity: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    logger.info(
      { tenantId, count: items.length },
      "Fetched open compliance items",
    );

    // Step 2: Compute batch escalation
    const escalationInput: ComplianceItemForEscalation[] = items.map(
      (item) => ({
        id: item.id,
        createdAt: item.createdAt,
        dueDate: item.dueDate,
        escalationLevel:
          item.escalationLevel as ComplianceItemForEscalation["escalationLevel"],
      }),
    );

    const updates = computeBatchEscalation(escalationInput);

    logger.info(
      { tenantId, updates: updates.length },
      "Computed escalation updates",
    );

    // Step 3: Process each escalation update
    let notificationsSent = 0;

    for (const update of updates) {
      if (!update.shouldNotify) continue; // Only notify on level increase

      const item = items.find((i) => i.id === update.id);
      if (!item) continue;

      const itemContext = {
        observationTitle: item.observation.title,
        branchName: item.branch?.name || "Unknown Branch",
        daysOverdue: update.daysOverdue,
      };

      // Get escalation route for this level
      const route = getEscalationRoute(update.newEscalationLevel, itemContext);

      if (!route) continue; // L0 or no route

      // Resolve recipients for this escalation level
      const recipients = await db.user.findMany({
        where: {
          tenantId,
          roles: { hasSome: route.recipientRoles as any },
        },
        select: { id: true, email: true, name: true },
      });

      // For BRANCH_HEAD, also include branch-specific users
      if (route.recipientRoles.includes("BRANCH_HEAD") && item.branchId) {
        const branchUsers = await db.user.findMany({
          where: {
            tenantId,
            roles: { has: "BRANCH_HEAD" },
            branchAssignments: { some: { branchId: item.branchId } },
          },
          select: { id: true, email: true, name: true },
        });

        // Deduplicate
        const map = new Map(recipients.map((r) => [r.id, r]));
        branchUsers.forEach((u) => map.set(u.id, u));
        recipients.splice(0, recipients.length, ...Array.from(map.values()));
      }

      logger.info(
        {
          tenantId,
          complianceItemId: item.id,
          level: update.newEscalationLevel,
          recipients: recipients.length,
        },
        "Routing escalation notification",
      );

      // Create NotificationQueue entries
      for (const recipient of recipients) {
        await db.notificationQueue.create({
          data: {
            tenantId,
            recipientId: recipient.id,
            type: route.notificationType,
            payload: {
              subject: route.subject,
              message: route.messageTemplate,
              complianceItemId: item.id,
              escalationLevel: route.level,
              branchName: itemContext.branchName,
              observationTitle: itemContext.observationTitle,
              daysOverdue: update.daysOverdue,
              urgency: route.urgency,
            } as object,
          },
        });

        notificationsSent++;
      }

      // Update ComplianceItem with new escalation level
      await db.complianceItem.update({
        where: { id: item.id },
        data: {
          escalationLevel: update.newEscalationLevel,
          daysOpen: update.daysOpen,
        },
      });
    }

    const summary = {
      processed: items.length,
      escalated: updates.length,
      notificationsSent,
    };

    logger.info({ tenantId, ...summary }, "Escalation job completed");

    return {
      success: true,
      data: summary,
    };
  } catch (error) {
    logger.error({ error, tenantId }, "Escalation job failed");
    throw error;
  }
}
