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
import { Plus, Loader2, CheckCircle } from "@/lib/icons";
import { toast } from "sonner";
import { manageTestProcedure } from "@/actions/control-library/manage-control";

interface TestProcedureData {
  id: string;
  name: string;
  description: string | null;
  sampleMethodology: string | null;
  sampleSize: number | null;
  expectedEvidence: string | null;
  passCriteria: string | null;
  control: {
    id: string;
    controlCode: string;
    processArea: string;
    description: string;
  };
  workProgramItems: Array<{
    id: string;
    status: string;
    result: string | null;
  }>;
}

interface TestProceduresTabProps {
  testProcedures: TestProcedureData[];
  controls: Array<{ id: string; controlCode: string; description: string }>;
  canManage: boolean;
}

type FormState = {
  success?: boolean;
  error?: string;
};

async function submitTestProcedureAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const input = {
    controlId: formData.get("controlId") as string,
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    sampleMethodology: (formData.get("sampleMethodology") as any) || undefined,
    sampleSize: formData.get("sampleSize")
      ? parseInt(formData.get("sampleSize") as string)
      : undefined,
    expectedEvidence: (formData.get("expectedEvidence") as string) || undefined,
    passCriteria: (formData.get("passCriteria") as string) || undefined,
  };

  return manageTestProcedure(input);
}

export function TestProceduresTab({
  testProcedures,
  controls,
  canManage,
}: TestProceduresTabProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [state, formAction, isPending] = useActionState(submitTestProcedureAction, {});

  // Handle success/error feedback
  React.useEffect(() => {
    if (state.success) {
      toast.success("Test procedure created successfully");
      setDialogOpen(false);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Test Procedure
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <form action={formAction}>
                <DialogHeader>
                  <DialogTitle>Create Test Procedure</DialogTitle>
                  <DialogDescription>
                    Define a test procedure for control effectiveness testing.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
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
                            {control.controlCode} - {control.description.slice(0, 60)}...
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Test Procedure Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="e.g., Monthly Credit Approval Review"
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
                      placeholder="Detailed steps for executing this test procedure..."
                      rows={3}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sampleMethodology">Sample Methodology</Label>
                      <Select name="sampleMethodology">
                        <SelectTrigger>
                          <SelectValue placeholder="(Optional) Select methodology" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RANDOM">Random</SelectItem>
                          <SelectItem value="JUDGMENTAL">Judgmental</SelectItem>
                          <SelectItem value="SYSTEMATIC">Systematic</SelectItem>
                          <SelectItem value="MONETARY_UNIT">Monetary Unit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sampleSize">Sample Size</Label>
                      <Input
                        id="sampleSize"
                        name="sampleSize"
                        type="number"
                        min="1"
                        placeholder="e.g., 25"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expectedEvidence">Expected Evidence</Label>
                    <Textarea
                      id="expectedEvidence"
                      name="expectedEvidence"
                      placeholder="What evidence should be collected during testing?"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="passCriteria">Pass Criteria</Label>
                    <Textarea
                      id="passCriteria"
                      name="passCriteria"
                      placeholder="What criteria must be met for the control to be effective?"
                      rows={2}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Test Procedure
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Control</TableHead>
              <TableHead>Sample Method</TableHead>
              <TableHead>Sample Size</TableHead>
              <TableHead>Recent Results</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {testProcedures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="text-muted-foreground">
                    <CheckCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p>No test procedures found.</p>
                    {canManage && (
                      <p className="text-sm mt-1">
                        Click "Add Test Procedure" to create your first procedure.
                      </p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              testProcedures.map((tp) => {
                const completedItems = tp.workProgramItems.filter(
                  (item) => item.status === "COMPLETED"
                );
                const effectiveCount = completedItems.filter(
                  (item) => item.result === "EFFECTIVE"
                ).length;

                return (
                  <TableRow key={tp.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{tp.name}</div>
                        {tp.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1 max-w-md">
                            {tp.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm font-medium">
                          {tp.control.controlCode}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {tp.control.processArea.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {tp.sampleMethodology ? (
                        <Badge variant="secondary">
                          {tp.sampleMethodology.replace(/_/g, " ")}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {tp.sampleSize ? (
                        <span className="text-sm">{tp.sampleSize}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {completedItems.length > 0 ? (
                        <div className="text-sm">
                          <span
                            className={
                              effectiveCount === completedItems.length
                                ? "text-green-600"
                                : "text-amber-600"
                            }
                          >
                            {effectiveCount}/{completedItems.length} Effective
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Not tested
                        </span>
                      )}
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
