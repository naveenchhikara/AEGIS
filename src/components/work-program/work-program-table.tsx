"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "@/lib/icons";
import { toast } from "sonner";

interface WorkItem {
  id: string;
  taskCode: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: string;
  priority: string;
}

interface WorkProgramTableProps {
  workItems: WorkItem[];
  canExecute: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-800 border-gray-300",
  IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-300",
  COMPLETED: "bg-green-100 text-green-800 border-green-300",
  BLOCKED: "bg-red-100 text-red-800 border-red-300",
};

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "bg-red-100 text-red-800 border-red-300",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
  LOW: "bg-green-100 text-green-800 border-green-300",
};

export function WorkProgramTable({ workItems, canExecute }: WorkProgramTableProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleCreate() {
    setIsSubmitting(true);
    // TODO: Implement create work item action
    toast.success("Work item created successfully");
    setIsSubmitting(false);
    setDialogOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canExecute && (
        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Work Item</DialogTitle>
                <DialogDescription>
                  Create a new task in the work program.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="taskCode">Task Code</Label>
                  <Input id="taskCode" placeholder="e.g., WP-001" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No work items found.
                </TableCell>
              </TableRow>
            ) : (
              workItems.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/work-program/${item.id}`)}
                >
                  <TableCell className="font-medium">{item.taskCode}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.assignedTo}</TableCell>
                  <TableCell>{item.dueDate}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={PRIORITY_COLORS[item.priority]}>
                      {item.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_COLORS[item.status]}>
                      {item.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
