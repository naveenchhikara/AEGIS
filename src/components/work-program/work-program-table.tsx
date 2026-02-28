"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Loader2, UserPlus, Plus } from "@/lib/icons";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { toast } from "sonner";
import {
  executeWorkProgramItem,
  assignWorkProgramItem,
} from "@/actions/work-program/execute-item";
import { createWorkProgramItem } from "@/actions/work-program/create-item";

interface WorkItem {
  id: string;
  status: string;
  result: string | null;
  findings: string | null;
  evidence: string[] | null;
  completedAt: Date | null;
  engagement: {
    id: string;
    auditNumber: string | null;
    status: string;
    branch: {
      code: string;
      name: string;
    } | null;
  };
  testProcedure: {
    id: string;
    name: string;
    description: string | null;
    sampleMethodology: string | null;
    sampleSize: number | null;
    control: {
      id: string;
      controlCode: string;
      processArea: string;
      description: string;
    };
  };
}

interface AssignableUser {
  id: string;
  name: string;
  email: string;
}

interface Engagement {
  id: string;
  auditNumber: string | null;
  status: string;
}

interface Control {
  id: string;
  controlCode: string;
  processArea: string;
  description: string;
}

interface WorkProgramTableProps {
  workItems: WorkItem[];
  canExecute: boolean;
  assignableUsers?: AssignableUser[];
  engagements?: Engagement[];
  controls?: Control[];
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

async function submitCreateAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const sampleSizeRaw = formData.get("sampleSize") as string;
  const input = {
    engagementId: formData.get("engagementId") as string,
    controlId: formData.get("controlId") as string,
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    sampleMethodology: (formData.get("sampleMethodology") as any) || undefined,
    sampleSize: sampleSizeRaw ? parseInt(sampleSizeRaw, 10) : undefined,
  };

  return createWorkProgramItem(input);
}

export function WorkProgramTable({
  workItems,
  canExecute,
  assignableUsers = [],
  engagements = [],
  controls = [],
}: WorkProgramTableProps) {
  const router = useRouter();
  const [executeDialogOpen, setExecuteDialogOpen] = React.useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = React.useState(false);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<WorkItem | null>(null);
  const [selectedUserId, setSelectedUserId] = React.useState<string>("");
  const [isAssigning, setIsAssigning] = React.useState(false);
  const [selectedStatus, setSelectedStatus] =
    React.useState<string>("COMPLETED");
  const [state, formAction, isPending] = useActionState(
    submitExecuteAction,
    {},
  );
  const [createState, createFormAction, isCreating] = useActionState(
    submitCreateAction,
    {},
  );

  // Handle execute success/error feedback
  React.useEffect(() => {
    if (state.success) {
      toast.success("Work program item executed successfully");
      setExecuteDialogOpen(false);
      setSelectedItem(null);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  // Handle create success/error feedback
  React.useEffect(() => {
    if (createState.success) {
      toast.success("Work program item created successfully");
      setCreateDialogOpen(false);
      router.refresh();
    } else if (createState.error) {
      toast.error(createState.error);
    }
  }, [createState, router]);

  function handleExecuteClick(item: WorkItem, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedItem(item);
    setExecuteDialogOpen(true);
  }

  function handleAssignClick(item: WorkItem, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedItem(item);
    setSelectedUserId("");
    setAssignDialogOpen(true);
  }

  async function handleAssignSubmit() {
    if (!selectedItem || !selectedUserId) return;

    setIsAssigning(true);
    try {
      const result = await assignWorkProgramItem(
        selectedItem.id,
        selectedUserId,
      );
      if (result.success) {
        toast.success("Work program item assigned successfully");
        setAssignDialogOpen(false);
        setSelectedItem(null);
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
    <div className="space-y-4">
      {canExecute && controls.length > 0 && engagements.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Engagement</TableHead>
              <TableHead>Test Procedure</TableHead>
              <TableHead>Control</TableHead>
              <TableHead>Process Area</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Result</TableHead>
              {canExecute && <TableHead>Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {workItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canExecute ? 7 : 6}>
                  <EmptyStateCard
                    variant="inline"
                    title="No work program items found"
                    message="Work program items are generated when you create an audit engagement."
                  />
                </TableCell>
              </TableRow>
            ) : (
              workItems.map((item) => (
                <TableRow
                  key={item.id}
                  className="hover:bg-muted/50 cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/work-program/${item.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/work-program/${item.id}`);
                    }
                  }}
                >
                  <TableCell className="font-medium">
                    <div>
                      <div>{item.engagement.auditNumber}</div>
                      {item.engagement.branch && (
                        <div className="text-muted-foreground text-xs">
                          {item.engagement.branch.name}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-md">
                      <div className="font-medium">
                        {item.testProcedure.name}
                      </div>
                      {item.testProcedure.description && (
                        <div className="text-muted-foreground line-clamp-2 text-xs">
                          {item.testProcedure.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {item.testProcedure.control.controlCode}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {formatProcessArea(
                        item.testProcedure.control.processArea,
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={STATUS_COLORS[item.status]}
                    >
                      {item.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.result ? (
                      <Badge
                        variant="outline"
                        className={RESULT_COLORS[item.result]}
                      >
                        {item.result.replace(/_/g, " ")}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  {canExecute && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => handleAssignClick(item, e)}
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Assign
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => handleExecuteClick(item, e)}
                          disabled={item.status === "COMPLETED"}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Execute
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Execute Dialog */}
      <Dialog open={executeDialogOpen} onOpenChange={setExecuteDialogOpen}>
        <DialogContent className="max-w-2xl">
          <form action={formAction}>
            <input
              type="hidden"
              name="workProgramItemId"
              value={selectedItem?.id || ""}
            />
            <DialogHeader>
              <DialogTitle>Execute Work Program Item</DialogTitle>
              <DialogDescription>
                Record the results of your test procedure execution.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedItem && (
                <div className="bg-muted space-y-2 rounded-md p-4">
                  <div>
                    <span className="text-sm font-medium">Test Procedure:</span>{" "}
                    <span className="text-sm">
                      {selectedItem.testProcedure.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Control:</span>{" "}
                    <span className="text-sm">
                      {selectedItem.testProcedure.control.controlCode} -{" "}
                      {selectedItem.testProcedure.control.description}
                    </span>
                  </div>
                  {selectedItem.testProcedure.sampleSize && (
                    <div>
                      <span className="text-sm font-medium">Sample Size:</span>{" "}
                      <span className="text-sm">
                        {selectedItem.testProcedure.sampleSize}
                      </span>
                    </div>
                  )}
                </div>
              )}

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
                  <Select name="result" required>
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
                  placeholder="Document your findings, observations, or reasons for the result..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setExecuteDialogOpen(false);
                  setSelectedItem(null);
                }}
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
            {selectedItem && (
              <div className="bg-muted space-y-2 rounded-md p-4">
                <div>
                  <span className="text-sm font-medium">Test Procedure:</span>{" "}
                  <span className="text-sm">
                    {selectedItem.testProcedure.name}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium">Control:</span>{" "}
                  <span className="text-sm">
                    {selectedItem.testProcedure.control.controlCode} -{" "}
                    {selectedItem.testProcedure.control.description}
                  </span>
                </div>
              </div>
            )}

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
                setSelectedItem(null);
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

      {/* Manual Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <form action={createFormAction}>
            <DialogHeader>
              <DialogTitle>Add Work Program Item</DialogTitle>
              <DialogDescription>
                Manually create a work program item by defining a test procedure
                and linking it to a control and engagement.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="engagementId">
                  Audit Engagement <span className="text-destructive">*</span>
                </Label>
                <Select name="engagementId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select engagement" />
                  </SelectTrigger>
                  <SelectContent>
                    {engagements
                      .filter(
                        (e) =>
                          e.status === "PLANNED" ||
                          e.status === "IN_PROGRESS" ||
                          e.status === "TEAM_ASSIGNED",
                      )
                      .map((engagement) => (
                        <SelectItem key={engagement.id} value={engagement.id}>
                          {engagement.auditNumber || engagement.id} (
                          {engagement.status.replace(/_/g, " ")})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="controlId">
                  Control <span className="text-destructive">*</span>
                </Label>
                <Select name="controlId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select control" />
                  </SelectTrigger>
                  <SelectContent>
                    {controls.map((control) => (
                      <SelectItem key={control.id} value={control.id}>
                        {control.controlCode} -{" "}
                        {control.description.length > 60
                          ? control.description.slice(0, 60) + "..."
                          : control.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">
                  Test Procedure Name{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Verify KYC documentation completeness"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  placeholder="Describe the test procedure steps..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sampleMethodology">Sample Methodology</Label>
                  <Select name="sampleMethodology">
                    <SelectTrigger>
                      <SelectValue placeholder="Select methodology" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RANDOM">Random</SelectItem>
                      <SelectItem value="JUDGMENTAL">Judgmental</SelectItem>
                      <SelectItem value="SYSTEMATIC">Systematic</SelectItem>
                      <SelectItem value="MONETARY_UNIT">
                        Monetary Unit
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sampleSize">Sample Size</Label>
                  <Input
                    id="sampleSize"
                    name="sampleSize"
                    type="number"
                    min={1}
                    placeholder="e.g., 25"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Item
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
