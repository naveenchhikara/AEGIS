import { getUsers } from "@/data-access/users";
import { getRequiredSession } from "@/data-access/session";
import { hasPermission, type Role } from "@/lib/permissions";
import { UserList } from "@/components/admin/user-list";
import AdminUsersClient from "./admin-users-client";

// TODO: Add requirePermission('admin:manage_users') in Task 4

export default async function AdminUsersPage() {
  const session = await getRequiredSession();
  const userRoles = (session.user as any).roles as Role[];
  const currentUserId = session.user.id;

  // Permission check (will be moved to requirePermission() in Task 4)
  if (!hasPermission(userRoles, "admin:manage_users")) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Access Denied</h1>
          <p className="text-muted-foreground">
            You do not have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  const users = await getUsers(session);

  return <AdminUsersClient users={users} currentUserId={currentUserId} />;
}
