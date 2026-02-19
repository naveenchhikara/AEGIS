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
import { Plus, Loader2, Shield } from "@/lib/icons";
import { toast } from "sonner";
import { manageControl } from "@/actions/control-library/manage-control";

interface Control {
  id: string;
  controlCode: string;
  description: string;
  processArea: string;
  controlType: string;
  frequency: string;
  owner: string | null;
  isKeyControl: boolean;
  effectivenessScore: any; // Prisma Decimal type
  testProcedures: Array<{ id: string; name: string }>;
  issues: Array<{ id: string; title: string; severity: string }>;
  riskRegister?: {
    id: string;
    riskStatement: string;
    entity: { name: string };
  } | null;
}

interface ControlLibraryTableProps {
  controls: Control[];
  canManage: boolean;
}

const EFFECTIVENESS_COLORS: Record<string, string> = {
  HIGH: "bg-green-100 text-green-800 border-green-300",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
  LOW: "bg-red-100 text-red-800 border-red-300",
  UNTESTED: "bg-gray-100 text-gray-800 border-gray-300",
};

const CONTROL_TYPE_COLORS: Record<string, string> = {
  PREVENTIVE: "bg-blue-100 text-blue-800 border-blue-300",
  DETECTIVE: "bg-purple-100 text-purple-800 border-purple-300",
  CORRECTIVE: "bg-orange-100 text-orange-800 border-orange-300",
};

function getEffectivenessLevel(score: any): string {
  if (score === null || score === undefined) return "UNTESTED";
  const numScore = typeof score === "number" ? score : Number(score);
  if (numScore >= 80) return "HIGH";
  if (numScore >= 50) return "MEDIUM";
  return "LOW";
}

function formatProcessArea(area: string): string {
  return area.replace(/_/g, " ");
}

type FormState = {
  success?: boolean;
  error?: string;
};

async function submitControlAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const frameworkMappingRaw = formData.get("frameworkMapping") as string;
  let frameworkMapping = undefined;
  
  if (frameworkMappingRaw && frameworkMappingRaw.trim()) {
    try {
      frameworkMapping = JSON.parse(frameworkMappingRaw);
    } catch (e) {
      return { error: "Invalid JSON in Framework Mapping field" };
    }
  }

  const input = {
    controlCode: formData.get("controlCode") as string,
    processArea: formData.get("processArea") as any,
    controlType: formData.get("controlType") as any,
    frequency: formData.get("frequency") as any,
    owner: formData.get("owner") as string,
    isKeyControl: formData.get("isKeyControl") === "true",
    description: formData.get("description") as string,
    frameworkMapping,
  };

  return manageControl(input);
}

export function ControlLibraryTable({
  controls,
  canManage,
}: ControlLibraryTableProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [state, formAction, isPending] = useActionState(
    submitControlAction,
    {},
  );

  // Handle success/error feedback
  React.useEffect(() => {
    if (state.success) {
      toast.success("Control created successfully");
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
                Add Control
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <form action={formAction}>
                <DialogHeader>
                  <DialogTitle>Add Control</DialogTitle>
                  <DialogDescription>
                    Create a new control in the library.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="controlCode">Control Code</Label>
                      <Input
                        id="controlCode"
                        name="controlCode"
                        placeholder="e.g., CTRL-LEND-001"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="processArea">Process Area</Label>
                      <Select name="processArea" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select area" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LENDING">Lending</SelectItem>
                          <SelectItem value="DEPOSITS">Deposits</SelectItem>
                          <SelectItem value="TREASURY">Treasury</SelectItem>
                          <SelectItem value="KYC_AML">KYC/AML</SelectItem>
                          <SelectItem value="IT_OPERATIONS">
                            IT Operations
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="controlType">Control Type</Label>
                      <Select name="controlType" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PREVENTIVE">Preventive</SelectItem>
                          <SelectItem value="DETECTIVE">Detective</SelectItem>
                          <SelectItem value="CORRECTIVE">Corrective</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="frequency">Frequency</Label>
                      <Select name="frequency" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TRANSACTION">
                            Transaction
                          </SelectItem>
                          <SelectItem value="DAILY">Daily</SelectItem>
                          <SelectItem value="WEEKLY">Weekly</SelectItem>
                          <SelectItem value="MONTHLY">Monthly</SelectItem>
                          <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                          <SelectItem value="ANNUAL">Annual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="isKeyControl">Key Control</Label>
                      <Select name="isKeyControl" defaultValue="false">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false">No</SelectItem>
                          <SelectItem value="true">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="owner">Control Owner</Label>
                    <Input
                      id="owner"
                      name="owner"
                      placeholder="e.g., Branch Manager"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      rows={3}
                      placeholder="Describe the control objective and procedure..."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="frameworkMapping">Framework Mapping (JSON)</Label>
                    <Textarea
                      id="frameworkMapping"
                      name="frameworkMapping"
                      rows={3}
                      placeholder='{"COSO": "CC1.1", "RBI": "DoS.1", "IIA": "2120.A1"}'
                    />
                    <p className="text-sm text-muted-foreground">
                      Optional: Map control to frameworks (COSO, RBI, IIA, etc.)
                    </p>
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
                    {isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Control
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
              <TableHead>Control Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Process Area</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Test Procedures</TableHead>
              <TableHead>Effectiveness</TableHead>
              <TableHead>Issues</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {controls.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No controls in library. Create your first control to get
                  started.
                </TableCell>
              </TableRow>
            ) : (
              controls.map((control) => {
                const effectivenessLevel = getEffectivenessLevel(
                  control.effectivenessScore,
                );
                const openIssuesCount = control.issues.filter(
                  (i) => i.severity === "HIGH" || i.severity === "CRITICAL",
                ).length;

                return (
                  <TableRow
                    key={control.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => router.push(`/controls/${control.id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {control.isKeyControl && (
                          <Shield className="h-4 w-4 text-amber-600" />
                        )}
                        {control.controlCode}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {control.description}
                    </TableCell>
                    <TableCell>
                      {formatProcessArea(control.processArea)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={CONTROL_TYPE_COLORS[control.controlType]}
                      >
                        {control.controlType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-sm">
                        {control.testProcedures.length} procedure
                        {control.testProcedures.length !== 1 ? "s" : ""}
                      </span>
                    </TableCell>
                    <TableCell>
                      {control.effectivenessScore !== null &&
                      control.effectivenessScore !== undefined ? (
                        <Badge
                          variant="outline"
                          className={EFFECTIVENESS_COLORS[effectivenessLevel]}
                        >
                          {Number(control.effectivenessScore).toFixed(0)}%
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className={EFFECTIVENESS_COLORS.UNTESTED}
                        >
                          Not tested
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {openIssuesCount > 0 ? (
                        <Badge variant="destructive">{openIssuesCount}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
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
