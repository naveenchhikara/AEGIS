"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Plus, Users, Calendar, ChevronDown, Loader2, Edit } from "@/lib/icons";
import { toast } from "sonner";
import { manageCommittee, manageCommitteeMeeting } from "@/actions/governance/manage-committee";

interface Committee {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  members: {
    id: string;
    role: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }[];
  _count: {
    meetings: number;
  };
}

interface Meeting {
  id: string;
  committeeId: string;
  meetingDate: Date;
  status: string;
  agendaItems: any;
  minutesRef: string | null;
  committee: {
    name: string;
  };
}

interface CommitteePanelProps {
  committees: Committee[];
  meetings: Meeting[];
  canManage: boolean;
}

const committeeSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

const meetingSchema = z.object({
  committeeId: z.string().uuid(),
  meetingDate: z.string(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]),
});

type CommitteeFormValues = z.infer<typeof committeeSchema>;
type MeetingFormValues = z.infer<typeof meetingSchema>;

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800 border-blue-300",
  COMPLETED: "bg-green-100 text-green-800 border-green-300",
  CANCELLED: "bg-red-100 text-red-800 border-red-300",
};

export function CommitteePanel({ committees, meetings, canManage }: CommitteePanelProps) {
  const router = useRouter();
  const [committeeDialogOpen, setCommitteeDialogOpen] = React.useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = React.useState(false);
  const [editingCommittee, setEditingCommittee] = React.useState<Committee | null>(null);
  const [selectedCommitteeId, setSelectedCommitteeId] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [expandedCommittees, setExpandedCommittees] = React.useState<Set<string>>(new Set());

  const committeeForm = useForm<CommitteeFormValues>({
    resolver: zodResolver(committeeSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  });

  const meetingForm = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingSchema) as any,
    defaultValues: {
      status: "SCHEDULED",
    },
  });

  React.useEffect(() => {
    if (editingCommittee) {
      committeeForm.reset({
        name: editingCommittee.name,
        description: editingCommittee.description || "",
        isActive: editingCommittee.isActive,
      });
    } else {
      committeeForm.reset({
        name: "",
        description: "",
        isActive: true,
      });
    }
  }, [editingCommittee, committeeForm]);

  async function onCommitteeSubmit(values: CommitteeFormValues) {
    setIsSubmitting(true);
    const result = await manageCommittee({
      committeeId: editingCommittee?.id,
      name: values.name,
      description: values.description,
      isActive: values.isActive,
    });

    if (result.success) {
      toast.success(editingCommittee ? "Committee updated" : "Committee created");
      setCommitteeDialogOpen(false);
      setEditingCommittee(null);
      committeeForm.reset();
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setIsSubmitting(false);
  }

  async function onMeetingSubmit(values: MeetingFormValues) {
    setIsSubmitting(true);
    const result = await manageCommitteeMeeting({
      committeeId: values.committeeId,
      meetingDate: new Date(values.meetingDate),
      status: values.status,
    });

    if (result.success) {
      toast.success("Meeting scheduled");
      setMeetingDialogOpen(false);
      meetingForm.reset();
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setIsSubmitting(false);
  }

  function toggleExpanded(committeeId: string) {
    setExpandedCommittees((prev) => {
      const next = new Set(prev);
      if (next.has(committeeId)) {
        next.delete(committeeId);
      } else {
        next.add(committeeId);
      }
      return next;
    });
  }

  function openEditDialog(committee: Committee) {
    setEditingCommittee(committee);
    setCommitteeDialogOpen(true);
  }

  function openCreateDialog() {
    setEditingCommittee(null);
    setCommitteeDialogOpen(true);
  }

  function openMeetingDialog(committeeId: string) {
    setSelectedCommitteeId(committeeId);
    meetingForm.setValue("committeeId", committeeId);
    setMeetingDialogOpen(true);
  }

  function getCommitteeMeetings(committeeId: string) {
    return meetings
      .filter((m) => m.committeeId === committeeId)
      .sort((a, b) => b.meetingDate.getTime() - a.meetingDate.getTime())
      .slice(0, 5);
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end gap-2">
          <Dialog open={committeeDialogOpen} onOpenChange={setCommitteeDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Committee
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCommittee ? "Edit Committee" : "Add Committee"}
                </DialogTitle>
                <DialogDescription>
                  {editingCommittee
                    ? "Update committee details"
                    : "Create a new governance committee"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={committeeForm.handleSubmit(onCommitteeSubmit)} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Committee Name</Label>
                  <Input
                    id="name"
                    {...committeeForm.register("name")}
                    placeholder="e.g., Audit Committee of Board"
                  />
                  {committeeForm.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {committeeForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...committeeForm.register("description")}
                    placeholder="Brief description of committee purpose..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    {...committeeForm.register("isActive")}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="isActive" className="text-sm font-normal">
                    Active committee
                  </Label>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCommitteeDialogOpen(false);
                      setEditingCommittee(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingCommittee ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <Dialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Committee Meeting</DialogTitle>
            <DialogDescription>
              Add a new meeting to the calendar
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={meetingForm.handleSubmit(onMeetingSubmit)} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="meetingDate">Meeting Date</Label>
              <Input
                id="meetingDate"
                type="datetime-local"
                {...meetingForm.register("meetingDate")}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMeetingDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Schedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {committees.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              No committees found. Create one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {committees.map((committee) => {
            const committeeMeetings = getCommitteeMeetings(committee.id);
            const isExpanded = expandedCommittees.has(committee.id);

            return (
              <Card key={committee.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{committee.name}</CardTitle>
                        {!committee.isActive && (
                          <Badge variant="outline" className="bg-gray-100">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="mt-1">
                        {committee.description || "No description"}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline">
                        {committee.members.length} members
                      </Badge>
                      {canManage && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(committee)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(committee.id)}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between">
                        <span className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          View Members & Meetings
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4 space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Members</h4>
                        {committee.members.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No members yet</p>
                        ) : (
                          <ul className="space-y-2">
                            {committee.members.map((member) => (
                              <li key={member.id} className="text-sm flex justify-between">
                                <span>
                                  {member.user.name} ({member.user.email})
                                </span>
                                <Badge variant="outline" className="ml-2">
                                  {member.role}
                                </Badge>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium">Recent Meetings</h4>
                          {canManage && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openMeetingDialog(committee.id)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Schedule
                            </Button>
                          )}
                        </div>
                        {committeeMeetings.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No meetings scheduled</p>
                        ) : (
                          <ul className="space-y-2">
                            {committeeMeetings.map((meeting) => (
                              <li key={meeting.id} className="text-sm flex justify-between items-center">
                                <span className="flex items-center gap-2">
                                  <Calendar className="h-3 w-3" />
                                  {format(meeting.meetingDate, "PPP")}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={STATUS_COLORS[meeting.status] ?? ""}
                                >
                                  {meeting.status}
                                </Badge>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <div className="flex gap-2 pt-2 border-t">
                    <div className="text-sm text-muted-foreground">
                      {committee._count.meetings} total meetings
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
