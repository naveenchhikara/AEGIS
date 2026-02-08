import { redirect } from "next/navigation";
import { getRequiredSession } from "@/data-access/session";
import { hasPermission, type Permission, type Role } from "@/lib/permissions";

/**
 * Require specific permission to access a page.
 *
 * Call at the top of server component pages.
 * Returns session if authorized.
 * Redirects to /dashboard?unauthorized=true if user lacks permission.
 *
 * @param permission - Required permission to access the page
 * @returns Session if user has the permission
 * @throws Redirects to /dashboard if not authenticated or lacks permission
 *
 * @example
 * ```tsx
 * export default async function CompliancePage() {
 *   const session = await requirePermission('compliance:read');
 *   // ... fetch data and render
 * }
 * ```
 */
export async function requirePermission(permission: Permission) {
  const session = await getRequiredSession();
  const userRoles = (session.user as any).roles as Role[];

  if (!hasPermission(userRoles, permission)) {
    redirect("/dashboard?unauthorized=true");
  }

  return session;
}

/**
 * Require any of the specified permissions.
 *
 * Useful for pages accessible by multiple roles.
 * Returns session if authorized for ANY of the permissions.
 * Redirects to /dashboard?unauthorized=true if user lacks ALL permissions.
 *
 * @param permissions - Array of permissions, user needs at least one
 * @returns Session if user has any of the permissions
 * @throws Redirects to /dashboard if not authenticated or lacks all permissions
 *
 * @example
 * ```tsx
 * export default async function ReportsPage() {
 *   const session = await requireAnyPermission([
 *     'report:read',
 *     'dashboard:cae',
 *     'dashboard:cco',
 *   ]);
 *   // ... fetch data and render
 * }
 * ```
 */
export async function requireAnyPermission(permissions: Permission[]) {
  const session = await getRequiredSession();
  const userRoles = (session.user as any).roles as Role[];

  const hasAny = permissions.some((perm) => hasPermission(userRoles, perm));
  if (!hasAny) {
    redirect("/dashboard?unauthorized=true");
  }

  return session;
}
