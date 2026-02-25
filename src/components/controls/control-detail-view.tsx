"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
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
import { Pencil, ArrowLeft, Loader2, Shield, ExternalLink } from "@/lib/icons";
import { toast } from "sonner";
import { updateControl } from "@/actions/control-library/update-control";
import Link from "next/link";

const EFFECTIVENESS_COLORS: Record<string, string> = {
  EFFECTIVE: "bg-green-100 text-green-800 border-green-300",
  PARTIALLY_EFFECTIVE: "bg-yellow-100 text-yellow-800 border-yellow-300",
  INEFFECTIVE: "bg-red-100 text-red-800 border-red-300",
};

function getEffectivenessLabel(
  score: number | null | undefined,
): string | null {
  if (score == null) return null;
  if (score >= 80) return "EFFECTIVE";
  if (score >= 50) return "PARTIALLY_EFFECTIVE";
  return "INEFFECTIVE";
}

function parseFrameworkMapping(mapping: any): {
  COSO: string;
  RBI: string;
  IIA: string;
} {
  const defaults = { COSO: "", RBI: "", IIA: "" };
  if (!mapping || typeof mapping !== "object") return defaults;
  return {
    COSO: mapping.COSO || "",
    RBI: mapping.RBI || "",
    IIA: mapping.IIA || "",
  };
}

interface Control {
  id: string;
  controlCode: string;
  description: string;
  processArea: string;
  controlType: string;
  frequency: string;
  owner: string | null;
  isKeyControl: boolean;
  frameworkMapping: any;
  effectivenessScore: any;
  lastTestedDate: Date | null;
  riskRegister?: {
    id: string;
    riskStatement: string;
    riskCategory: string;
    entity: {
      id: string;
      name: string;
      entityType: string;
    };
  } | null;
  testProcedures: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  issues: Array<{
    id: string;
    title: string;
    severity: string;
    status: string;
    actionPlans: Array<{
      id: string;
      title: string;
      status: string;
      dueDate: Date;
    }>;
  }>;
}

interface ControlDetailViewProps {
  control: Control;
  canManage: boolean;
}

const CONTROL_TYPE_COLORS: Record<string, string> = {
  PREVENTIVE: "bg-blue-100 text-blue-800 border-blue-300",
  DETECTIVE: "bg-purple-100 text-purple-800 border-purple-300",
  CORRECTIVE: "bg-orange-100 text-orange-800 border-orange-300",
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 border-red-300",
  HIGH: "bg-orange-100 text-orange-800 border-orange-300",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
  LOW: "bg-green-100 text-green-800 border-green-300",
};

type FormState = {
  success?: boolean;
  error?: string;
};

async function submitUpdateAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const coso = (formData.get("fw_COSO") as string)?.trim() || "";
  const rbi = (formData.get("fw_RBI") as string)?.trim() || "";
  const iia = (formData.get("fw_IIA") as string)?.trim() || "";
  let frameworkMapping: Record<string, string> | null = null;
  if (coso || rbi || iia) {
    frameworkMapping = {};
    if (coso) frameworkMapping.COSO = coso;
    if (rbi) frameworkMapping.RBI = rbi;
    if (iia) frameworkMapping.IIA = iia;
  }

  const input = {
    controlId: formData.get("controlId") as string,
    controlCode: formData.get("controlCode") as string,
    processArea: formData.get("processArea") as any,
    controlType: formData.get("controlType") as any,
    frequency: formData.get("frequency") as any,
    owner: (formData.get("owner") as string) || undefined,
    isKeyControl: formData.get("isKeyControl") === "true",
    description: formData.get("description") as string,
    frameworkMapping,
  };

  return updateControl(input);
}

export function ControlDetailView({
  control,
  canManage,
}: ControlDetailViewProps) {
  const router = useRouter();
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [state, formAction, isPending] = useActionState(submitUpdateAction, {});

  React.useEffect(() => {
    if (state.success) {
      toast.success("Control updated successfully");
      setEditDialogOpen(false);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  const formatProcessArea = (area: string) => area.replace(/_/g, " ");

  return (
    <div className="container max-w-6xl space-y-6 py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{control.controlCode}</h1>
              {control.isKeyControl && (
                <Shield className="h-5 w-5 text-amber-600" />
              )}
            </div>
            <p className="text-muted-foreground">
              {formatProcessArea(control.processArea)}
            </p>
          </div>
        </div>
        {canManage && (
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Control
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
              <form action={formAction}>
                <input type="hidden" name="controlId" value={control.id} />
                <DialogHeader>
                  <DialogTitle>Edit Control</DialogTitle>
                  <DialogDescription>
                    Update control details and framework mappings.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="controlCode">Control Code</Label>
                      <Input
                        id="controlCode"
                        name="controlCode"
                        defaultValue={control.controlCode}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="processArea">Process Area</Label>
                      <Select
                        name="processArea"
                        defaultValue={control.processArea}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue />
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
                      <Select
                        name="controlType"
                        defaultValue={control.controlType}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue />
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
                      <Select
                        name="frequency"
                        defaultValue={control.frequency}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue />
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
                      <Select
                        name="isKeyControl"
                        defaultValue={control.isKeyControl ? "true" : "false"}
                      >
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
                      defaultValue={control.owner || ""}
                      placeholder="e.g., Branch Manager"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      rows={3}
                      defaultValue={control.description}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Framework Mapping</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="fw_COSO" className="text-xs">
                          COSO
                        </Label>
                        <Input
                          id="fw_COSO"
                          name="fw_COSO"
                          defaultValue={
                            parseFrameworkMapping(control.frameworkMapping).COSO
                          }
                          placeholder="e.g., CC1.1"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="fw_RBI" className="text-xs">
                          RBI
                        </Label>
                        <Input
                          id="fw_RBI"
                          name="fw_RBI"
                          defaultValue={
                            parseFrameworkMapping(control.frameworkMapping).RBI
                          }
                          placeholder="e.g., DoS.1"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="fw_IIA" className="text-xs">
                          IIA
                        </Label>
                        <Input
                          id="fw_IIA"
                          name="fw_IIA"
                          defaultValue={
                            parseFrameworkMapping(control.frameworkMapping).IIA
                          }
                          placeholder="e.g., 2120.A1"
                        />
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Optional: Map control to framework codes
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditDialogOpen(false)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Update Control
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6">
        {/* Control Details */}
        <Card>
          <CardHeader>
            <CardTitle>Control Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">Control Type</Label>
                <div className="mt-1">
                  <Badge
                    variant="outline"
                    className={CONTROL_TYPE_COLORS[control.controlType]}
                  >
                    {control.controlType}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Frequency</Label>
                <p className="mt-1">{control.frequency}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Owner</Label>
                <p className="mt-1">{control.owner || "—"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">
                  Effectiveness Score
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  {control.effectivenessScore != null ? (
                    <>
                      <span className="font-medium">
                        {Number(control.effectivenessScore).toFixed(0)}%
                      </span>
                      {getEffectivenessLabel(
                        Number(control.effectivenessScore),
                      ) && (
                        <Badge
                          variant="outline"
                          className={
                            EFFECTIVENESS_COLORS[
                              getEffectivenessLabel(
                                Number(control.effectivenessScore),
                              )!
                            ]
                          }
                        >
                          {getEffectivenessLabel(
                            Number(control.effectivenessScore),
                          )!.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Not tested</span>
                  )}
                </div>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Description</Label>
              <p className="mt-1">{control.description}</p>
            </div>

            {control.frameworkMapping && (
              <div>
                <Label className="text-muted-foreground">
                  Framework Mapping
                </Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(
                    parseFrameworkMapping(control.frameworkMapping),
                  )
                    .filter(([, v]) => v)
                    .map(([framework, code]) => (
                      <Badge key={framework} variant="secondary">
                        {framework}: {code}
                      </Badge>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Linked Risk */}
        {control.riskRegister && (
          <Card>
            <CardHeader>
              <CardTitle>Linked Risk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <Label className="text-muted-foreground">Entity</Label>
                  <p className="mt-1">{control.riskRegister.entity.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">
                    Risk Statement
                  </Label>
                  <p className="mt-1">{control.riskRegister.riskStatement}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Category</Label>
                  <p className="mt-1">{control.riskRegister.riskCategory}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Procedures */}
        <Card>
          <CardHeader>
            <CardTitle>
              Test Procedures ({control.testProcedures.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {control.testProcedures.length === 0 ? (
              <p className="text-muted-foreground">
                No test procedures defined.
              </p>
            ) : (
              <ul className="space-y-3">
                {control.testProcedures.map((proc) => (
                  <li key={proc.id} className="border-l-2 border-blue-500 pl-3">
                    <p className="font-medium">{proc.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {proc.description}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Issues */}
        <Card>
          <CardHeader>
            <CardTitle>Related Issues ({control.issues.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {control.issues.length === 0 ? (
              <p className="text-muted-foreground">No issues found.</p>
            ) : (
              <ul className="space-y-3">
                {control.issues.map((issue) => (
                  <li
                    key={issue.id}
                    className="flex items-start justify-between"
                  >
                    <div>
                      <Link
                        href={`/issues?controlId=${control.id}`}
                        className="font-medium hover:underline"
                      >
                        {issue.title}
                        <ExternalLink className="ml-1 inline h-3 w-3" />
                      </Link>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={SEVERITY_COLORS[issue.severity]}
                        >
                          {issue.severity}
                        </Badge>
                        <span className="text-muted-foreground text-sm">
                          {issue.actionPlans.length} action plan(s)
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {issue.status.replace("_", " ")}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
