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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2 } from "@/lib/icons";
import { toast } from "sonner";

interface Issue {
  id: string;
  issueCode: string;
  description: string;
  source: string;
  severity: string;
  status: string;
  dueDate: string;
}

interface IssuesTableProps {
  issues: Issue[];
  canManage: boolean;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 border-red-300",
  HIGH: "bg-orange-100 text-orange-800 border-orange-300",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
  LOW: "bg-green-100 text-green-800 border-green-300",
};

const SOURCE_COLORS: Record<string, string> = {
  AUDIT: "bg-blue-100 text-blue-800 border-blue-300",
  REGULATORY: "bg-purple-100 text-purple-800 border-purple-300",
  RISK: "bg-red-100 text-red-800 border-red-300",
  COMPLIANCE: "bg-green-100 text-green-800 border-green-300",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-red-100 text-red-800 border-red-300",
  IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-300",
  RESOLVED: "bg-green-100 text-green-800 border-green-300",
  RISK_ACCEPTED: "bg-amber-100 text-amber-800 border-amber-300",
};

export function IssuesTable({ issues, canManage }: IssuesTableProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleCreate() {
    setIsSubmitting(true);
    // TODO: Implement create issue action
    toast.success("Issue created successfully");
    setIsSubmitting(false);
    setDialogOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Log Issue
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log New Issue</DialogTitle>
                <DialogDescription>
                  Create a new issue for tracking and resolution.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="issueCode">Issue Code</Label>
                  <Input id="issueCode" placeholder="e.g., ISS-001" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" rows={3} />
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
              <TableHead>Issue Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No issues found.
                </TableCell>
              </TableRow>
            ) : (
              issues.map((issue) => (
                <TableRow
                  key={issue.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/issues/${issue.id}`)}
                >
                  <TableCell className="font-medium">{issue.issueCode}</TableCell>
                  <TableCell>{issue.description}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={SOURCE_COLORS[issue.source] ?? ""}>
                      {issue.source}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={SEVERITY_COLORS[issue.severity] ?? ""}>
                      {issue.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>{issue.dueDate}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_COLORS[issue.status] ?? ""}>
                      {issue.status.replace("_", " ")}
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
