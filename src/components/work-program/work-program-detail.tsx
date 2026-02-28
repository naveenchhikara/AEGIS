"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Shield,
  UserPlus,
  FileText,
  Paperclip,
  Target,
} from "@/lib/icons";
import { toast } from "sonner";
import {
  executeWorkProgramItem,
  assignWorkProgramItem,
} from "@/actions/work-program/execute-item";
import { formatDate } from "@/lib/utils";

interface WorkProgramItemDetail {
  id: string;
  status: string;
  result: string | null;
  findings: string | null;
  evidence: string[];
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assignedToId: string | null;
  assignedTo: {
    id: string;
    name: string;
    email: string;
  } | null;
  engagement: {
    id: string;
    auditNumber: string | null;
    auditType: string | null;
    status: string;
    periodFrom: Date | null;
    periodTo: Date | null;
    branch: {
      code: string;
      name: string;
      city: string | null;
    } | null;
  };
  testProcedure: {
    id: string;
    name: string;
    description: string;
    sampleMethodology: string | null;
    sampleSize: number | null;
    expectedEvidence: string | null;
    passCriteria: string | null;
    control: {
      id: string;
      controlCode: string;
      processArea: string;
      controlType: string;
      frequency: string;
      description: string;
      isKeyControl: boolean;
      riskRegister: {
        id: string;
        riskStatement: string;
        riskCategory: string;
      } | null;
    };
  };
}

interface AssignableUser {
  id: string;
  name: string;
  email: string;
}

interface WorkProgramDetailProps {
  item: WorkProgramItemDetail;
  canExecute: boolean;
  assignableUsers: AssignableUser[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-800 border-gray-300",
  IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-300",
  COMPLETED: "bg-green-100 text-green-800 border-green-300",
  NOT_APPLICABLE: "bg-purple-100 text-purple-800 border-purple-300",
};

const RESULT_COLORS: Record<string, string> = {
  EFFECTIVE: "bg-green-100 text-green-800 border-green-300",
  PARTIALLY_EFFECTIVE: "bg-amber-100 text-amber-800 border-amber-300",
  INEFFECTIVE: "bg-red-100 text-red-800 border-red-300",
};

const CONTROL_TYPE_COLORS: Record<string, string> = {
  PREVENTIVE: "bg-blue-100 text-blue-800 border-blue-300",
  DETECTIVE: "bg-purple-100 text-purple-800 border-purple-300",
  CORRECTIVE: "bg-orange-100 text-orange-800 border-orange-300",
};

function formatProcessArea(area: string): string {
  return area.replace(/_/g, " ");
}

type FormState = {
  success?: boolean;
  error?: string;
};

async function submitExecuteAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const input = {
    workProgramItemId: formData.get("workProgramItemId") as string,
    status: formData.get("status") as any,
    result: (formData.get("result") as any) || undefined,
    findings: (formData.get("findings") as string) || undefined,
  };

  return executeWorkProgramItem(input);
}

export function WorkProgramDetail({
  item,
  canExecute,
  assignableUsers,
}: WorkProgramDetailProps) {
  const router = useRouter();
  const [executeDialogOpen, setExecuteDialogOpen] = React.useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = React.useState(false);
  const [selectedUserId, setSelectedUserId] = React.useState<string>("");
  const [isAssigning, setIsAssigning] = React.useState(false);
  const [selectedStatus, setSelectedStatus] = React.useState<string>(
    item.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS",
  );
  const [state, formAction, isPending] = useActionState(
    submitExecuteAction,
    {},
  );

  React.useEffect(() => {
    if (state.success) {
      toast.success("Work program item updated successfully");
      setExecuteDialogOpen(false);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  async function handleAssignSubmit() {
    if (!selectedUserId) return;

    setIsAssigning(true);
    try {
      const result = await assignWorkProgramItem(item.id, selectedUserId);
      if (result.success) {
        toast.success("Work program item assigned successfully");
        setAssignDialogOpen(false);
        setSelectedUserId("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to assign work program item");
    } finally {
      setIsAssigning(false);
    }
  }

  return (
    <div className="container max-w-6xl space-y-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Go back to work program"
            asChild
          >
            <Link href="/work-program">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{item.testProcedure.name}</h1>
              <Badge variant="outline" className={STATUS_COLORS[item.status]}>
                {item.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {item.testProcedure.control.controlCode} &middot;{" "}
              {formatProcessArea(item.testProcedure.control.processArea)}
            </p>
          </div>
        </div>
        {canExecute && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedUserId("");
                setAssignDialogOpen(true);
              }}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Assign
            </Button>
            <Button
              onClick={() => setExecuteDialogOpen(true)}
              disabled={item.status === "COMPLETED"}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Update Result
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - Left 2 cols */}
        <div className="space-y-6 lg:col-span-2">
          {/* Test Procedure Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Test Procedure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="mt-1 font-medium">{item.testProcedure.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="mt-1">{item.testProcedure.description}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {item.testProcedure.sampleMethodology && (
                  <div>
                    <Label className="text-muted-foreground">
                      Sample Methodology
                    </Label>
                    <p className="mt-1">
                      {item.testProcedure.sampleMethodology.replace(/_/g, " ")}
                    </p>
                  </div>
                )}
                {item.testProcedure.sampleSize && (
                  <div>
                    <Label className="text-muted-foreground">Sample Size</Label>
                    <p className="mt-1">{item.testProcedure.sampleSize}</p>
                  </div>
                )}
              </div>
              {item.testProcedure.expectedEvidence && (
                <div>
                  <Label className="text-muted-foreground">
                    Expected Evidence
                  </Label>
                  <p className="mt-1">{item.testProcedure.expectedEvidence}</p>
                </div>
              )}
              {item.testProcedure.passCriteria && (
                <div>
                  <Label className="text-muted-foreground">Pass Criteria</Label>
                  <p className="mt-1">{item.testProcedure.passCriteria}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Findings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Findings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {item.result && (
                <div>
                  <Label className="text-muted-foreground">Result</Label>
                  <div className="mt-1">
                    <Badge
                      variant="outline"
                      className={RESULT_COLORS[item.result]}
                    >
                      {item.result.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Findings Text</Label>
                {item.findings ? (
                  <p className="mt-1 whitespace-pre-wrap">{item.findings}</p>
                ) : (
                  <p className="text-muted-foreground mt-1 text-sm italic">
                    No findings recorded yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Evidence */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Evidence ({item.evidence.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {item.evidence.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">
                  No evidence files attached.
                </p>
              ) : (
                <ul className="space-y-2">
                  {item.evidence.map((key, index) => {
                    const fileName = key.split("/").pop() || key;
                    return (
                      <li
                        key={index}
                        className="flex items-center gap-2 rounded-md border p-2 text-sm"
                      >
                        <Paperclip className="text-muted-foreground h-4 w-4 shrink-0" />
                        <span className="truncate">{fileName}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Right col */}
        <div className="space-y-6">
          {/* Status & Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="mt-1">
                  <Badge
                    variant="outline"
                    className={STATUS_COLORS[item.status]}
                  >
                    {item.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              </div>
              <Separator />
              <div>
                <Label className="text-muted-foreground">Assigned To</Label>
                {item.assignedTo ? (
                  <div className="mt-1">
                    <p className="font-medium">{item.assignedTo.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {item.assignedTo.email}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground mt-1 text-sm italic">
                    Unassigned
                  </p>
                )}
              </div>
              <Separator />
              <div>
                <Label className="text-muted-foreground">Created</Label>
                <p className="mt-1 text-sm">
                  {formatDate(item.createdAt, "long")}
                </p>
              </div>
              {item.completedAt && (
                <div>
                  <Label className="text-muted-foreground">Completed</Label>
                  <p className="mt-1 text-sm">
                    {formatDate(item.completedAt, "long")}
                  </p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Last Updated</Label>
                <p className="mt-1 text-sm">
                  {formatDate(item.updatedAt, "long")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Engagement Info */}
          <Card>
            <CardHeader>
              <CardTitle>Engagement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-muted-foreground">Audit Number</Label>
                <p className="mt-1 font-medium">
                  {item.engagement.auditNumber || "—"}
                </p>
              </div>
              {item.engagement.auditType && (
                <div>
                  <Label className="text-muted-foreground">Audit Type</Label>
                  <p className="mt-1">
                    {item.engagement.auditType.replace(/_/g, " ")}
                  </p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <p className="mt-1">
                  {item.engagement.status.replace(/_/g, " ")}
                </p>
              </div>
              {item.engagement.branch && (
                <div>
                  <Label className="text-muted-foreground">Branch</Label>
                  <p className="mt-1">
                    {item.engagement.branch.name} ({item.engagement.branch.code}
                    )
                  </p>
                  {item.engagement.branch.city && (
                    <p className="text-muted-foreground text-sm">
                      {item.engagement.branch.city}
                    </p>
                  )}
                </div>
              )}
              {item.engagement.periodFrom && item.engagement.periodTo && (
                <div>
                  <Label className="text-muted-foreground">Audit Period</Label>
                  <p className="mt-1 text-sm">
                    {formatDate(item.engagement.periodFrom)} &ndash;{" "}
                    {formatDate(item.engagement.periodTo)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Control Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Control
                {item.testProcedure.control.isKeyControl && (
                  <Shield className="h-4 w-4 text-amber-600" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-muted-foreground">Control Code</Label>
                <p className="mt-1 font-medium">
                  {item.testProcedure.control.controlCode}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="mt-1 text-sm">
                  {item.testProcedure.control.description}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <div className="mt-1">
                    <Badge
                      variant="outline"
                      className={
                        CONTROL_TYPE_COLORS[
                          item.testProcedure.control.controlType
                        ]
                      }
                    >
                      {item.testProcedure.control.controlType}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Frequency</Label>
                  <p className="mt-1 text-sm">
                    {item.testProcedure.control.frequency}
                  </p>
                </div>
              </div>
              {item.testProcedure.control.riskRegister && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-muted-foreground">Linked Risk</Label>
                    <p className="mt-1 text-sm">
                      {item.testProcedure.control.riskRegister.riskStatement}
                    </p>
                    <Badge variant="outline" className="mt-1">
                      {item.testProcedure.control.riskRegister.riskCategory}
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Execute / Update Dialog */}
      <Dialog open={executeDialogOpen} onOpenChange={setExecuteDialogOpen}>
        <DialogContent className="max-w-2xl">
          <form action={formAction}>
            <input type="hidden" name="workProgramItemId" value={item.id} />
            <DialogHeader>
              <DialogTitle>Update Work Program Item</DialogTitle>
              <DialogDescription>
                Record the status and results of this test procedure execution.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-muted space-y-2 rounded-md p-4">
                <div>
                  <span className="text-sm font-medium">Test Procedure:</span>{" "}
                  <span className="text-sm">{item.testProcedure.name}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Control:</span>{" "}
                  <span className="text-sm">
                    {item.testProcedure.control.controlCode} -{" "}
                    {item.testProcedure.control.description}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  name="status"
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="NOT_APPLICABLE">
                      Not Applicable
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedStatus === "COMPLETED" && (
                <div className="space-y-2">
                  <Label htmlFor="result">Result</Label>
                  <Select
                    name="result"
                    defaultValue={item.result || undefined}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EFFECTIVE">Effective</SelectItem>
                      <SelectItem value="PARTIALLY_EFFECTIVE">
                        Partially Effective
                      </SelectItem>
                      <SelectItem value="INEFFECTIVE">Ineffective</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="findings">Findings / Observations</Label>
                <Textarea
                  id="findings"
                  name="findings"
                  rows={4}
                  defaultValue={item.findings || ""}
                  placeholder="Document your findings, observations, or reasons for the result..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setExecuteDialogOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Result
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Work Program Item</DialogTitle>
            <DialogDescription>
              Select a team member to assign this work program item to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="assignee">Assign To</Label>
              {assignableUsers.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No team members available for assignment.
                </p>
              ) : (
                <Select
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAssignDialogOpen(false);
                setSelectedUserId("");
              }}
              disabled={isAssigning}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAssignSubmit}
              disabled={isAssigning || !selectedUserId}
            >
              {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
