"use client";

import { type Role } from "@/lib/permissions";
import { UserList } from "@/components/admin/user-list";
import { RoleAssignmentForm } from "@/components/admin/role-assignment-form";
import { useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  lastLoginAt: Date | null;
  _count: {
    createdObservations: number;
  };
}

interface AdminUsersClientProps {
  users: User[];
  currentUserId: string;
}

export default function AdminUsersClient({
  users,
  currentUserId,
}: AdminUsersClientProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setShowRoleDialog(true);
  };

  const handleRoleUpdateSuccess = async () => {
    // In production, we'd revalidate the page
    // For now, close dialog and reload page
    setShowRoleDialog(false);
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          Manage user accounts and assign roles
        </p>
      </div>

      <UserList
        users={users}
        currentUserId={currentUserId}
        onUserClick={handleUserClick}
      />

      {selectedUser && (
        <RoleAssignmentForm
          userId={selectedUser.id}
          userName={selectedUser.name}
          currentRoles={selectedUser.roles}
          open={showRoleDialog}
          onOpenChange={setShowRoleDialog}
          onSuccess={handleRoleUpdateSuccess}
        />
      )}
    </div>
  );
}
