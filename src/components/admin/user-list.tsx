"use client";

import { type Role, getRoleDisplayName } from "@/lib/permissions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Shield } from "@/lib/icons";

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

interface UserListProps {
  /** Users to display */
  users: User[];
  /** Current user ID (to prevent self-role-change) */
  currentUserId?: string;
  /** Callback when user row is clicked */
  onUserClick: (user: User) => void;
}

export function UserList({ users, currentUserId, onUserClick }: UserListProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleString();
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead>Observations</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow
              key={user.id}
              className="hover:bg-muted/50 cursor-pointer"
              onClick={() => onUserClick(user)}
            >
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {user.roles.map((role) => (
                    <div
                      key={role}
                      className="bg-primary/10 text-primary inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                    >
                      <Shield className="mr-1 h-3 w-3" />
                      {getRoleDisplayName(role)}
                    </div>
                  ))}
                  {user.roles.length === 0 && (
                    <span className="text-muted-foreground text-sm">
                      No roles
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>{formatDate(user.lastLoginAt)}</TableCell>
              <TableCell>{user._count.createdObservations}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm">
                  Manage Roles
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {users.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-muted-foreground h-24 text-center"
              >
                No users found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
