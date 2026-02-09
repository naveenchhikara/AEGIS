import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Application-level notification service.
 * Called from server actions to queue notifications.
 *
 * Checks user preferences before queueing to avoid unnecessary records.
 * Delegates actual queue insertion to the notification DAL.
 */

type Session = {
  user: { id: string; tenantId?: string; [key: string]: unknown };
  session: { id: string; [key: string]: unknown };
};

/**
 * Queue a notification for a user.
 * Checks the recipient's NotificationPreference before creating the queue entry.
 * If emailEnabled is false, the notification is skipped (except for WEEKLY_DIGEST
 * and OVERDUE_ESCALATION which are regulatory and cannot be opted out).
 *
 * @param session - Authenticated session of the actor (not the recipient)
 * @param recipientId - User ID of the notification recipient
 * @param type - NotificationType enum value
 * @param payload - Template variables for email rendering
 * @param batchKey - Optional key for grouping related notifications (NOTF-06)
 */
export async function queueNotification(
  session: Session,
  recipientId: string,
  type: string,
  payload: Record<string, unknown>,
  batchKey?: string,
): Promise<void> {
  const tenantId = (session.user as Record<string, unknown>).tenantId as string;
  if (!tenantId) {
    console.error("[notification-service] No tenantId in session, skipping");
    return;
  }

  // Regulatory notifications bypass preference check
  const MANDATORY_TYPES = ["WEEKLY_DIGEST", "OVERDUE_ESCALATION", "INVITATION"];

  if (!MANDATORY_TYPES.includes(type)) {
    // Check recipient's notification preferences
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId: recipientId },
    });

    if (prefs && !prefs.emailEnabled) {
      console.log(
        `[notification-service] Skipping ${type} for user ${recipientId} (email disabled)`,
      );
      return;
    }
  }

  // Import DAL dynamically to avoid circular dependency
  const { createNotification } = await import("@/data-access/notifications");

  await createNotification(session, {
    recipientId,
    type,
    payload,
    batchKey,
  });
}

/**
 * Queue notifications for multiple recipients (e.g., escalation to auditee + auditor + manager).
 */
export async function queueBulkNotifications(
  session: Session,
  recipientIds: string[],
  type: string,
  payload: Record<string, unknown>,
  batchKey?: string,
): Promise<void> {
  await Promise.all(
    recipientIds.map((recipientId) =>
      queueNotification(session, recipientId, type, payload, batchKey),
    ),
  );
}
