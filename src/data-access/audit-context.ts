import "server-only";

/**
 * Audit context for tracking who did what and why.
 *
 * STUB: This will be fully implemented in plan 05-05 (Audit Trail System).
 * For now, it sets PostgreSQL session variables that the audit trigger can read.
 */

export interface AuditContext {
  actionType: string;
  userId: string;
  tenantId: string;
  ipAddress: string;
  sessionId: string;
}

/**
 * Set audit context in a Prisma transaction.
 *
 * Sets PostgreSQL session variables (transaction-scoped via SET LOCAL)
 * so the database audit trigger can capture actor info.
 *
 * @param tx - Prisma transaction client
 * @param context - Audit context with actor information
 */
export async function setAuditContext(
  tx: {
    $executeRaw: (
      query: TemplateStringsArray,
      ...args: unknown[]
    ) => Promise<unknown>;
  },
  context: AuditContext,
): Promise<void> {
  await tx.$executeRaw`SELECT set_config('app.current_action', ${context.actionType}, TRUE)`;
  await tx.$executeRaw`SELECT set_config('app.current_user_id', ${context.userId}, TRUE)`;
  await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${context.tenantId}, TRUE)`;
  await tx.$executeRaw`SELECT set_config('app.current_ip', ${context.ipAddress}, TRUE)`;
  await tx.$executeRaw`SELECT set_config('app.current_session_id', ${context.sessionId}, TRUE)`;
}
