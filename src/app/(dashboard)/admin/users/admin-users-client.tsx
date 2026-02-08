"use client";

import { useState } from "react";
import { UserList } from "@/components/admin/user-list";

interface AdminUsersClientProps {
  users: any[];
  currentUserId: string;
}

export default function AdminUsersClient({
  users,
  currentUserId,
}: AdminUsersClientProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          User Management
        </h1>
        <p className="text-muted-foreground">
          Manage users and their role assignments.
        </p>
      </div>
      <UserList
        users={users}
        currentUserId={currentUserId}
        onUserClick={(user) => setSelectedUserId(user.id)}
      />
    </div>
  );
}
