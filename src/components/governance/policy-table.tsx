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
import { Plus, Loader2, FileText, Download } from "@/lib/icons";
import { toast } from "sonner";

interface Policy {
  id: string;
  policyCode: string;
  title: string;
  category: string;
  version: string;
  approvedDate: string;
  reviewDate: string;
  status: string;
}

interface PolicyTableProps {
  policies: Policy[];
  canManage: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800 border-green-300",
  DRAFT: "bg-gray-100 text-gray-800 border-gray-300",
  UNDER_REVIEW: "bg-blue-100 text-blue-800 border-blue-300",
  ARCHIVED: "bg-red-100 text-red-800 border-red-300",
};

export function PolicyTable({ policies, canManage }: PolicyTableProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleCreate() {
    setIsSubmitting(true);
    // TODO: Implement create policy action
    toast.success("Policy created successfully");
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
                Add Policy
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Policy Document</DialogTitle>
                <DialogDescription>
                  Create a new policy in the governance framework.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="policyCode">Policy Code</Label>
                  <Input id="policyCode" placeholder="e.g., POL-001" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" />
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
              <TableHead>Policy Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Approved Date</TableHead>
              <TableHead>Next Review</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No policies found.
                </TableCell>
              </TableRow>
            ) : (
              policies.map((policy) => (
                <TableRow key={policy.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{policy.policyCode}</TableCell>
                  <TableCell>{policy.title}</TableCell>
                  <TableCell>{policy.category}</TableCell>
                  <TableCell>{policy.version}</TableCell>
                  <TableCell>{policy.approvedDate}</TableCell>
                  <TableCell>{policy.reviewDate}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_COLORS[policy.status] ?? ""}>
                      {policy.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost">
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
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
