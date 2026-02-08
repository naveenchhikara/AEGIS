import "server-only";

/**
 * Audit context utility for setting business-level action metadata.
 *
 * Sets PostgreSQL session variables (transaction-scoped via TRUE param)
 * that the audit_trigger_function() reads to populate AuditLog entries.
 *
 * MUST be called WITHIN a Prisma $transaction, BEFORE the mutation.
 *
 * Standard action types:
 * - observation.created, observation.updated, observation.status_changed, observation.approved
 * - user.created, user.role_changed, user.deactivated
 * - compliance.status_changed, compliance.marked_na
 * - finding.created, finding.closed, finding.severity_changed
 * - audit_plan.created, audit_plan.updated
 * - tenant.settings_updated
 * - evidence.uploaded
 *
 * Operations requiring justification (DE6):
 * - finding.closed
 * - user.role_changed
 * - compliance.marked_na
 * - observation.status_changed (to terminal states)
 */

export interface AuditContext {
  actionType: string; // e.g., 'observation.created', 'user.role_changed'
  justification?: string; // Required for sensitive operations (DE6)
  userId: string;
  tenantId: string;
  ipAddress?: string;
  sessionId?: string;
}

/**
 * Set audit context in a Prisma transaction.
 *
 * Sets PostgreSQL session variables (transaction-scoped via set_config TRUE)
 * so the database audit trigger can capture actor info and business context.
 *
 * @param tx - Prisma transaction client (must support $executeRaw)
 * @param context - Audit context with actor information and action metadata
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
  await tx.$executeRaw`SELECT set_config('app.current_justification', ${context.justification ?? ""}, TRUE)`;
  await tx.$executeRaw`SELECT set_config('app.current_user_id', ${context.userId}, TRUE)`;
  await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${context.tenantId}, TRUE)`;
  await tx.$executeRaw`SELECT set_config('app.current_ip_address', ${context.ipAddress ?? ""}, TRUE)`;
  await tx.$executeRaw`SELECT set_config('app.current_session_id', ${context.sessionId ?? ""}, TRUE)`;
}
