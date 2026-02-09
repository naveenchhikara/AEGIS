/**
 * Notification batcher (NOTF-06).
 * Groups notifications with the same batchKey and creates
 * a single digest email instead of individual notifications.
 *
 * Used by notification-processor.ts for batched groups.
 * The actual batching logic (grouping + rendering) is handled inline
 * in notification-processor.ts processBatchedNotifications().
 *
 * This module provides utility functions for batch key generation
 * to be used when creating notifications from server actions.
 */

/**
 * Generate a batch key for grouping notifications.
 * Same recipient + same action type within the batch window
 * will be combined into a single digest email.
 *
 * @param recipientId - User ID of the notification recipient
 * @param context - Additional context (e.g., "audit-plan-123")
 * @returns Batch key string
 */
export function generateBatchKey(recipientId: string, context: string): string {
  return `${recipientId}:${context}`;
}

/**
 * Generate a batch key for bulk observation imports.
 * When multiple observations are created for the same auditee,
 * they get batched into a single notification.
 */
export function generateBulkImportBatchKey(
  recipientId: string,
  importId: string,
): string {
  return `bulk-import:${recipientId}:${importId}`;
}
