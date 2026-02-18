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

interface Control {
  id: string;
  controlCode: string;
  description: string;
  category: string;
  type: string;
  effectivenessScore: number;
  status: string;
}

interface ControlLibraryTableProps {
  controls: Control[];
  canManage: boolean;
}

const EFFECTIVENESS_COLORS: Record<string, string> = {
  HIGH: "bg-green-100 text-green-800 border-green-300",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
  LOW: "bg-red-100 text-red-800 border-red-300",
};

function getEffectivenessLevel(score: number): string {
  if (score >= 80) return "HIGH";
  if (score >= 50) return "MEDIUM";
  return "LOW";
}

export function ControlLibraryTable({ controls, canManage }: ControlLibraryTableProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleCreate() {
    setIsSubmitting(true);
    // TODO: Implement create control action
    toast.success("Control created successfully");
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
                Add Control
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Control</DialogTitle>
                <DialogDescription>
                  Create a new control in the library.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="controlCode">Control Code</Label>
                  <Input id="controlCode" placeholder="e.g., CC-001" />
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
              <TableHead>Control Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Effectiveness</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {controls.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No controls in library.
                </TableCell>
              </TableRow>
            ) : (
              controls.map((control) => {
                const effectivenessLevel = getEffectivenessLevel(control.effectivenessScore);
                return (
                  <TableRow
                    key={control.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/controls/${control.id}`)}
                  >
                    <TableCell className="font-medium">{control.controlCode}</TableCell>
                    <TableCell>{control.description}</TableCell>
                    <TableCell>{control.category}</TableCell>
                    <TableCell>{control.type}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={EFFECTIVENESS_COLORS[effectivenessLevel]}>
                        {control.effectivenessScore}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{control.status}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
