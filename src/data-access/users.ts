import "server-only";
import { prisma, prismaForTenant } from "@/lib/prisma";
import { getRequiredSession } from "./session";
import type { Role } from "@/lib/permissions";
import type { AuthSession } from "@/lib/auth";

/**
 * Get all users for the current tenant.
 * Requires admin:manage_users permission.
 */
export async function getUsers(session?: AuthSession) {
  const s = session || (await getRequiredSession());
  const tenantId = s.user.tenantId;

  return prismaForTenant(tenantId).user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          createdObservations: true,
        },
      },
    },
  });
}

/**
 * Get a specific user by ID.
 * Requires admin:manage_users permission.
 */
export async function getUserById(userId: string, session?: AuthSession) {
  const s = session || (await getRequiredSession());
  const tenantId = s.user.tenantId;

  const user = await prismaForTenant(tenantId).user.findFirst({
    where: { id: userId, tenantId },
  });

  return user;
}

/**
 * Update a user's roles.
 * Requires admin:manage_roles permission.
 * Requires justification for audit trail (Decision DE6).
 */
export async function updateUserRoles(
  userId: string,
  roles: Role[],
  justification: string,
  session?: AuthSession,
) {
  const s = session || (await getRequiredSession());
  const tenantId = s.user.tenantId;

  // Security: Prevent self-role-change
  if (s.user.id === userId) {
    throw new Error(
      "Cannot change your own roles. Contact another administrator.",
    );
  }

  // Set audit context for role change
  await prisma.$executeRaw`SELECT set_config('app.current_action', 'user.role_changed', TRUE)`;

  const user = await prismaForTenant(tenantId).user.update({
    where: { id: userId, tenantId },
    data: {
      roles: roles,
    },
  });

  return user;
}
