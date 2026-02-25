"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Users,
  Calendar,
  ChevronDown,
  Loader2,
  Edit,
  X,
  Upload,
  CheckCircle2,
  XCircle,
  Paperclip,
} from "@/lib/icons";
import { toast } from "sonner";
import {
  manageCommittee,
  manageCommitteeMeeting,
  manageCommitteeMember,
  removeCommitteeMember,
} from "@/actions/governance/manage-committee";
import {
  requestMinutesUpload,
  confirmMinutesUpload,
} from "@/actions/governance/upload-minutes";

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

type AvailableUser = {
  id: string;
  name: string;
  email: string;
};

interface CommitteePanelProps {
  committees: Committee[];
  meetings: Meeting[];
  canManage: boolean;
  availableUsers?: AvailableUser[];
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

const memberSchema = z.object({
  userId: z.string().uuid("Please select a user"),
  role: z
    .enum(["CHAIRMAN", "MEMBER", "SECRETARY", "INVITEE"])
    .describe("Role is required"),
});

type CommitteeFormValues = z.infer<typeof committeeSchema>;
type MeetingFormValues = z.infer<typeof meetingSchema>;
type MemberFormValues = z.infer<typeof memberSchema>;

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800 border-blue-300",
  COMPLETED: "bg-green-100 text-green-800 border-green-300",
  CANCELLED: "bg-red-100 text-red-800 border-red-300",
};

export function CommitteePanel({
  committees,
  meetings,
  canManage,
  availableUsers = [],
}: CommitteePanelProps) {
  const router = useRouter();
  const [committeeDialogOpen, setCommitteeDialogOpen] = React.useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = React.useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = React.useState(false);
  const [editingCommittee, setEditingCommittee] =
    React.useState<Committee | null>(null);
  const [selectedCommitteeId, setSelectedCommitteeId] =
    React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [expandedCommittees, setExpandedCommittees] = React.useState<
    Set<string>
  >(new Set());
  const [minutesUpload, setMinutesUpload] = React.useState<{
    [meetingId: string]: {
      status: "uploading" | "confirming" | "complete" | "error";
      progress: number;
      fileName?: string;
      error?: string;
    };
  }>({});

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

  const memberForm = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema) as any,
    defaultValues: {
      userId: "",
      role: "MEMBER",
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
      toast.success(
        editingCommittee ? "Committee updated" : "Committee created",
      );
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

  async function onMemberSubmit(values: MemberFormValues) {
    if (!selectedCommitteeId) return;

    setIsSubmitting(true);
    const result = await manageCommitteeMember({
      committeeId: selectedCommitteeId,
      userId: values.userId,
      role: values.role,
    });

    if (result.success) {
      toast.success("Member added");
      setMemberDialogOpen(false);
      memberForm.reset();
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setIsSubmitting(false);
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm("Remove this member from the committee?")) return;

    const result = await removeCommitteeMember(memberId);

    if (result.success) {
      toast.success("Member removed");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function handleMinutesFileUpload(meeting: Meeting, file: File) {
    const meetingId = meeting.id;

    // Read file header for magic byte validation
    const chunk = file.slice(0, 4096);
    const buffer = await chunk.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const fileHeader = btoa(binary);

    setMinutesUpload((prev) => ({
      ...prev,
      [meetingId]: { status: "uploading", progress: 0, fileName: file.name },
    }));

    try {
      // Step 1: Request presigned URL
      const requestResult = await requestMinutesUpload({
        meetingId,
        fileHeader,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type || "application/octet-stream",
      });

      if (!requestResult.success) {
        setMinutesUpload((prev) => ({
          ...prev,
          [meetingId]: {
            status: "error",
            progress: 0,
            fileName: file.name,
            error: requestResult.error,
          },
        }));
        toast.error(requestResult.error);
        return;
      }

      const { uploadUrl, s3Key, contentType } = requestResult.data;

      // Step 2: Upload to S3 via XHR
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setMinutesUpload((prev) => ({
              ...prev,
              [meetingId]: {
                ...prev[meetingId],
                status: "uploading",
                progress: pct,
              },
            }));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", contentType);
        xhr.send(file);
      });

      // Step 3: Confirm upload
      setMinutesUpload((prev) => ({
        ...prev,
        [meetingId]: {
          ...prev[meetingId],
          status: "confirming",
          progress: 100,
        },
      }));

      const confirmResult = await confirmMinutesUpload({
        meetingId,
        s3Key,
        fileName: file.name,
      });

      if (!confirmResult.success) {
        setMinutesUpload((prev) => ({
          ...prev,
          [meetingId]: {
            status: "error",
            progress: 0,
            fileName: file.name,
            error: confirmResult.error,
          },
        }));
        toast.error(confirmResult.error);
        return;
      }

      // Success
      setMinutesUpload((prev) => ({
        ...prev,
        [meetingId]: {
          status: "complete",
          progress: 100,
          fileName: file.name,
        },
      }));
      toast.success("Minutes uploaded successfully");

      // Clear after 2 seconds and refresh
      setTimeout(() => {
        setMinutesUpload((prev) => {
          const next = { ...prev };
          delete next[meetingId];
          return next;
        });
        router.refresh();
      }, 2000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      setMinutesUpload((prev) => ({
        ...prev,
        [meetingId]: {
          status: "error",
          progress: 0,
          fileName: file.name,
          error: errorMessage,
        },
      }));
      toast.error(errorMessage);
    }
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

  function openMemberDialog(committeeId: string) {
    setSelectedCommitteeId(committeeId);
    memberForm.reset();
    setMemberDialogOpen(true);
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
          <Dialog
            open={committeeDialogOpen}
            onOpenChange={setCommitteeDialogOpen}
          >
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
              <form
                onSubmit={committeeForm.handleSubmit(onCommitteeSubmit)}
                className="space-y-4 py-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Committee Name</Label>
                  <Input
                    id="name"
                    {...committeeForm.register("name")}
                    placeholder="e.g., Audit Committee of Board"
                  />
                  {committeeForm.formState.errors.name && (
                    <p className="text-destructive text-sm">
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
                    {isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
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
          <form
            onSubmit={meetingForm.handleSubmit(onMeetingSubmit)}
            className="space-y-4 py-4"
          >
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
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Schedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Committee Member</DialogTitle>
            <DialogDescription>
              Add a new member to this committee
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={memberForm.handleSubmit(onMemberSubmit)}
            className="space-y-4 py-4"
          >
            <div className="space-y-2">
              <Label htmlFor="userId">User</Label>
              <Select
                value={memberForm.watch("userId") || ""}
                onValueChange={(value: string) =>
                  memberForm.setValue("userId", value, {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="userId">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers
                    .filter((u) => {
                      // Exclude users already in this committee
                      const committee = committees.find(
                        (c) => c.id === selectedCommitteeId,
                      );
                      if (!committee) return true;
                      return !committee.members.some((m) => m.user.id === u.id);
                    })
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  {availableUsers.filter((u) => {
                    const committee = committees.find(
                      (c) => c.id === selectedCommitteeId,
                    );
                    if (!committee) return true;
                    return !committee.members.some((m) => m.user.id === u.id);
                  }).length === 0 && (
                    <SelectItem value="" disabled>
                      No available users
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {memberForm.formState.errors.userId && (
                <p className="text-destructive text-sm">
                  {memberForm.formState.errors.userId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={memberForm.watch("role") || "MEMBER"}
                onValueChange={(value: string) =>
                  memberForm.setValue(
                    "role",
                    value as "CHAIRMAN" | "MEMBER" | "SECRETARY" | "INVITEE",
                  )
                }
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CHAIRMAN">Chairman</SelectItem>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="SECRETARY">Secretary</SelectItem>
                  <SelectItem value="INVITEE">Invitee</SelectItem>
                </SelectContent>
              </Select>
              {memberForm.formState.errors.role && (
                <p className="text-destructive text-sm">
                  {memberForm.formState.errors.role.message}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMemberDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add Member
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {committees.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-center">
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
                        <CardTitle className="text-base">
                          {committee.name}
                        </CardTitle>
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
                  <Collapsible
                    open={isExpanded}
                    onOpenChange={() => toggleExpanded(committee.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between"
                      >
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
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="text-sm font-medium">Members</h4>
                          {canManage && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openMemberDialog(committee.id)}
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              Add Member
                            </Button>
                          )}
                        </div>
                        {committee.members.length === 0 ? (
                          <p className="text-muted-foreground text-sm">
                            No members yet
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {committee.members.map((member) => (
                              <li
                                key={member.id}
                                className="flex items-center justify-between text-sm"
                              >
                                <span>
                                  {member.user.name} ({member.user.email})
                                </span>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{member.role}</Badge>
                                  {canManage && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        handleRemoveMember(member.id)
                                      }
                                      className="h-6 w-6 p-0"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="text-sm font-medium">
                            Recent Meetings
                          </h4>
                          {canManage && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openMeetingDialog(committee.id)}
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              Schedule
                            </Button>
                          )}
                        </div>
                        {committeeMeetings.length === 0 ? (
                          <p className="text-muted-foreground text-sm">
                            No meetings scheduled
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {committeeMeetings.map((meeting) => (
                              <li
                                key={meeting.id}
                                className="space-y-2 text-sm"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-2">
                                    <Calendar className="h-3 w-3" />
                                    {format(meeting.meetingDate, "PPP")}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={
                                      STATUS_COLORS[meeting.status] ?? ""
                                    }
                                  >
                                    {meeting.status}
                                  </Badge>
                                </div>
                                {canManage && (
                                  <div className="space-y-2 pl-5">
                                    {/* Show existing minutes reference */}
                                    {meeting.minutesRef && (
                                      <div className="flex items-center gap-1.5 text-xs text-green-700">
                                        <Paperclip className="h-3 w-3" />
                                        <span>Minutes uploaded</span>
                                      </div>
                                    )}

                                    {/* Upload state indicator */}
                                    {minutesUpload[meeting.id] && (
                                      <div className="space-y-1">
                                        {(minutesUpload[meeting.id].status ===
                                          "uploading" ||
                                          minutesUpload[meeting.id].status ===
                                            "confirming") && (
                                          <>
                                            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                              <span>
                                                {minutesUpload[meeting.id]
                                                  .status === "confirming"
                                                  ? "Confirming..."
                                                  : `Uploading ${minutesUpload[meeting.id].progress}%`}
                                              </span>
                                            </div>
                                            <Progress
                                              value={
                                                minutesUpload[meeting.id]
                                                  .progress
                                              }
                                              className="h-1"
                                            />
                                          </>
                                        )}
                                        {minutesUpload[meeting.id].status ===
                                          "complete" && (
                                          <div className="flex items-center gap-1.5 text-xs text-green-600">
                                            <CheckCircle2 className="h-3 w-3" />
                                            <span>Upload complete</span>
                                          </div>
                                        )}
                                        {minutesUpload[meeting.id].status ===
                                          "error" && (
                                          <div className="text-destructive flex items-center gap-1.5 text-xs">
                                            <XCircle className="h-3 w-3" />
                                            <span>
                                              {minutesUpload[meeting.id]
                                                .error || "Upload failed"}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* File upload button */}
                                    {(!minutesUpload[meeting.id] ||
                                      minutesUpload[meeting.id].status ===
                                        "error") && (
                                      <div className="flex items-center gap-2">
                                        <label className="cursor-pointer">
                                          <input
                                            type="file"
                                            accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
                                            className="hidden"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) {
                                                if (
                                                  file.size >
                                                  10 * 1024 * 1024
                                                ) {
                                                  toast.error(
                                                    "File must be under 10MB",
                                                  );
                                                  return;
                                                }
                                                void handleMinutesFileUpload(
                                                  meeting,
                                                  file,
                                                );
                                              }
                                              // Reset so same file can be re-selected
                                              e.target.value = "";
                                            }}
                                          />
                                          <span className="hover:bg-accent inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs">
                                            <Upload className="h-3 w-3" />
                                            {meeting.minutesRef
                                              ? "Replace Minutes"
                                              : "Upload Minutes"}
                                          </span>
                                        </label>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <div className="flex gap-2 border-t pt-2">
                    <div className="text-muted-foreground text-sm">
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
