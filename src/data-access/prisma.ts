import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Tenant-scoped Prisma client with Row-Level Security (RLS) extension.
 *
 * CRITICAL SECURITY NOTES (Decision D6, Skeptic S1, S2):
 * - tenantId MUST come from authenticated session ONLY
 * - NEVER pass tenantId from URL params, request body, or query string
 * - DAL functions should accept a session object, not a raw tenantId string
 * - This function provides RLS-level isolation; DAL functions should ALSO
 *   add explicit WHERE tenantId clauses (belt-and-suspenders, Skeptic S1)
 *
 * SECURITY INVARIANTS:
 * - Every query through this client is wrapped in a transaction with tenant context
 * - app.current_tenant_id parameter is set transaction-scoped (safe for connection pooling)
 * - RLS policies in PostgreSQL will filter rows by tenantId automatically
 * - BUT: DAL functions MUST still add explicit WHERE tenantId for defense-in-depth
 *
 * @param tenantId - The tenant ID from authenticated session
 * @returns Prisma client extended with tenant-scoped RLS
 *
 * @example
 * ```typescript
 * // In DAL function:
 * const session = await getRequiredSession();
 * const db = prismaForTenant(session.user.tenantId);
 *
 * // Query with explicit WHERE (belt-and-suspenders)
 * const tenant = await db.tenant.findFirst({
 *   where: { id: session.user.tenantId },
 * });
 * ```
 */
export function prismaForTenant(tenantId: string) {
  return prisma.$extends({
    query: {
      $allOperations: async ({
        args,
        query,
      }: {
        operation: string;
        model?: string;
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => {
        // Wrap ALL queries in transaction with tenant context
        return prisma.$transaction(async (tx) => {
          // SET LOCAL parameter (transaction-scoped only — safe for connection pooling)
          await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, TRUE)`;
          return query(args);
        });
      },
    },
  });
}
