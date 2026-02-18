"use client";

import * as React from "react";
import { assignTeamMember, removeTeamMember } from "@/actions/audit-execution/assign-team";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, X } from "@/lib/icons";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type AvailableUser = {
  id: string;
  name: string;
  email: string;
};

interface TeamPanelProps {
  engagementId: string;
  teamMembers: Array<{
    id: string;
    userId: string;
    roleInEngagement: string;
    assignedSections: string[];
    user: { id: string; name: string; email: string; roles: string[] };
  }>;
  canManageTeam: boolean;
  availableUsers?: AvailableUser[];
}

const ROLE_COLORS: Record<string, string> = {
  LEAD_AUDITOR: "bg-blue-100 text-blue-800 border-blue-300",
  FIELD_AUDITOR: "bg-green-100 text-green-800 border-green-300",
};

export function TeamPanel({
  engagementId,
  teamMembers,
  canManageTeam,
  availableUsers = [],
}: TeamPanelProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [removing, setRemoving] = React.useState<Record<string, boolean>>({});

  // For simplicity, we'll use a minimal add member form
  // In production, you'd fetch available users from an API
  const [selectedUserId, setSelectedUserId] = React.useState("");
  const [selectedRole, setSelectedRole] = React.useState<string>("FIELD_AUDITOR");

  async function handleAddMember() {
    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }

    setIsSubmitting(true);
    const result = await assignTeamMember({
      engagementId,
      userId: selectedUserId,
      roleInEngagement: selectedRole as "LEAD_AUDITOR" | "FIELD_AUDITOR",
      assignedSections: [],
    });
    setIsSubmitting(false);

    if (result.success) {
      toast.success("Team member added successfully");
      setDialogOpen(false);
      setSelectedUserId("");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function handleRemoveMember(userId: string, memberName: string) {
    if (!confirm(`Remove ${memberName} from the team?`)) {
      return;
    }

    setRemoving({ ...removing, [userId]: true });
    const result = await removeTeamMember({ engagementId, userId });
    setRemoving({ ...removing, [userId]: false });

    if (result.success) {
      toast.success("Team member removed");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Team</CardTitle>
          {canManageTeam && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <UserPlus className="mr-1 h-3 w-3" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Team Member</DialogTitle>
                  <DialogDescription>
                    Assign a user to this audit engagement.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="user">User</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger id="user">
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers
                          .filter((u) => !teamMembers.some((m) => m.userId === u.id))
                          .map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name} ({user.email})
                            </SelectItem>
                          ))}
                        {availableUsers.filter(
                          (u) => !teamMembers.some((m) => m.userId === u.id)
                        ).length === 0 && (
                          <SelectItem value="" disabled>
                            No available users
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger id="role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LEAD_AUDITOR">Lead Auditor</SelectItem>
                        <SelectItem value="FIELD_AUDITOR">Field Auditor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddMember} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Member
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {teamMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No team members assigned yet.
            </p>
          ) : (
            teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-start justify-between rounded-lg border p-3"
              >
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{member.user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.user.email}
                  </p>
                  <Badge
                    variant="outline"
                    className={ROLE_COLORS[member.roleInEngagement] ?? ""}
                  >
                    {member.roleInEngagement.replace(/_/g, " ")}
                  </Badge>
                  {member.assignedSections.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Sections: {member.assignedSections.join(", ")}
                    </p>
                  )}
                </div>
                {canManageTeam && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      handleRemoveMember(member.userId, member.user.name)
                    }
                    disabled={removing[member.userId]}
                  >
                    {removing[member.userId] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
