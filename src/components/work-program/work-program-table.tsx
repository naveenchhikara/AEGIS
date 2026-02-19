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
  DialogTrigger,
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
import { CheckCircle2, Loader2 } from "@/lib/icons";
import { toast } from "sonner";
import { executeWorkProgramItem } from "@/actions/work-program/execute-item";

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

interface WorkProgramTableProps {
  workItems: WorkItem[];
  canExecute: boolean;
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

export function WorkProgramTable({
  workItems,
  canExecute,
}: WorkProgramTableProps) {
  const router = useRouter();
  const [executeDialogOpen, setExecuteDialogOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<WorkItem | null>(null);
  const [selectedStatus, setSelectedStatus] =
    React.useState<string>("COMPLETED");
  const [state, formAction, isPending] = useActionState(
    submitExecuteAction,
    {},
  );

  // Handle success/error feedback
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

  function handleExecuteClick(item: WorkItem, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedItem(item);
    setExecuteDialogOpen(true);
  }

  return (
    <div className="space-y-4">
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
                <TableCell
                  colSpan={canExecute ? 7 : 6}
                  className="h-24 text-center"
                >
                  <div className="text-muted-foreground">
                    No work program items found.
                    <p className="mt-2 text-sm">
                      Work program items are generated when you create an audit
                      engagement.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              workItems.map((item) => (
                <TableRow
                  key={item.id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => router.push(`/work-program/${item.id}`)}
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => handleExecuteClick(item, e)}
                        disabled={item.status === "COMPLETED"}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Execute
                      </Button>
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
    </div>
  );
}
