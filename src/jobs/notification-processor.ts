import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/ses-client";
import { renderEmailTemplate } from "@/emails/render";
import {
  getPendingNotifications,
  markNotificationSent,
  markNotificationFailed,
} from "@/data-access/notifications";

/**
 * Notification processor job handler.
 * Runs every minute via pg-boss to dequeue and send pending notifications.
 *
 * Flow:
 * 1. Fetch pending notifications (sendAfter <= now, status = PENDING)
 * 2. Group by batchKey (null = individual, non-null = batched)
 * 3. Render email template based on notification type
 * 4. Send via SES
 * 5. Mark as SENT (creates EmailLog) or FAILED (with retry backoff)
 */

// ─── Template type mapping ──────────────────────────────────────────────────

const TEMPLATE_MAP: Record<string, string> = {
  OBSERVATION_ASSIGNED: "assignment",
  RESPONSE_SUBMITTED: "response",
  DEADLINE_REMINDER_7D: "reminder",
  DEADLINE_REMINDER_3D: "reminder",
  DEADLINE_REMINDER_1D: "reminder",
  OVERDUE_ESCALATION: "escalation",
  WEEKLY_DIGEST: "weekly-digest",
  BULK_DIGEST: "bulk-digest",
  INVITATION: "invitation",
};

// ─── Email rendering ────────────────────────────────────────────────────────

interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Render a notification to email HTML using React Email templates (08-02).
 */
async function renderNotificationEmail(
  type: string,
  payload: Record<string, unknown>,
): Promise<RenderedEmail> {
  const templateName = TEMPLATE_MAP[type] ?? "assignment";
  return renderEmailTemplate(templateName, payload);
}

// ─── Main processor ─────────────────────────────────────────────────────────

/**
 * Process pending notifications.
 * Called by pg-boss worker on cron schedule (every minute).
 */
export async function processNotifications(): Promise<void> {
  const notifications = await getPendingNotifications(50);

  if (notifications.length === 0) return;

  console.log(
    `[notification-processor] Processing ${notifications.length} notifications`,
  );

  // Mark all as PROCESSING to prevent double-pickup
  await prisma.notificationQueue.updateMany({
    where: { id: { in: notifications.map((n) => n.id) } },
    data: { status: "PROCESSING" },
  });

  // Separate batched vs individual
  const individual = notifications.filter((n) => !n.batchKey);
  const batched = new Map<string, typeof notifications>();

  for (const n of notifications.filter((n) => n.batchKey)) {
    const key = n.batchKey!;
    if (!batched.has(key)) batched.set(key, []);
    batched.get(key)!.push(n);
  }

  // Process individual notifications
  for (const notification of individual) {
    await processOneNotification(notification);
  }

  // Process batched groups
  for (const [batchKey, group] of batched) {
    await processBatchedNotifications(batchKey, group);
  }
}

// ─── Process single notification ────────────────────────────────────────────

async function processOneNotification(
  notification: Awaited<ReturnType<typeof getPendingNotifications>>[number],
): Promise<void> {
  try {
    const payload = notification.payload as Record<string, unknown>;
    const rendered = await renderNotificationEmail(notification.type, payload);

    const result = await sendEmail({
      to: notification.recipient.email,
      subject: rendered.subject,
      htmlBody: rendered.html,
      textBody: rendered.text,
    });

    if (result.success) {
      await markNotificationSent(notification.id, {
        sesMessageId: result.messageId,
        recipientEmail: notification.recipient.email,
        recipientName: notification.recipient.name,
        subject: rendered.subject,
        templateName: TEMPLATE_MAP[notification.type] ?? "unknown",
        tenantId: notification.tenantId,
      });
    } else {
      await markNotificationFailed(notification.id, result.error);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown processing error";
    console.error(
      `[notification-processor] Failed to process ${notification.id}:`,
      message,
    );
    await markNotificationFailed(notification.id, message);
  }
}

// ─── Process batched notifications ──────────────────────────────────────────

async function processBatchedNotifications(
  _batchKey: string,
  notifications: Awaited<ReturnType<typeof getPendingNotifications>>,
): Promise<void> {
  if (notifications.length === 0) return;

  // All notifications in a batch go to the same recipient
  const recipient = notifications[0].recipient;
  const tenantId = notifications[0].tenantId;

  try {
    const payload = {
      recipientName: recipient.name,
      observations: notifications.map((n) => n.payload),
      count: notifications.length,
    };

    const rendered = await renderNotificationEmail("BULK_DIGEST", payload);

    const result = await sendEmail({
      to: recipient.email,
      subject: rendered.subject,
      htmlBody: rendered.html,
      textBody: rendered.text,
    });

    if (result.success) {
      // Mark all notifications in the batch as sent
      for (const n of notifications) {
        await markNotificationSent(n.id, {
          sesMessageId: result.messageId,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          subject: rendered.subject,
          templateName: "bulk-digest",
          tenantId,
        });
      }
    } else {
      for (const n of notifications) {
        await markNotificationFailed(n.id, result.error);
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown batch processing error";
    console.error(
      `[notification-processor] Batch ${_batchKey} failed:`,
      message,
    );
    for (const n of notifications) {
      await markNotificationFailed(n.id, message);
    }
  }
}
