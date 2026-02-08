import { getUsers } from "@/data-access/users";
import { requirePermission } from "@/lib/guards";
import AdminUsersClient from "@/app/(dashboard)/admin-users-client";

/**
 * Admin users page - manage user accounts and assign roles.
 * Requires admin:manage_users permission.
 */
export default async function AdminUsersPage() {
  // Route guard: ensure user has admin:manage_users permission
  const session = await requirePermission("admin:manage_users");
  const currentUserId = session.user.id;

  // Fetch all users for the current tenant
  const users = await getUsers(session);

  return <AdminUsersClient users={users} currentUserId={currentUserId} />;
}
