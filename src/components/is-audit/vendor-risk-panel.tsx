"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, AlertTriangle, Pencil } from "@/lib/icons";
import { toast } from "sonner";
import { manageVendorRiskAssessment } from "@/actions/investment/manage-is-audit";
import { format, differenceInDays } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type VendorAssessment = {
  id: string;
  vendorName: string;
  contractStart: Date | null;
  contractEnd: Date | null;
  slaCompliance: number | null;
  riskRating: string | null;
  lastAssessmentDate: Date | null;
  findings: string | null;
  mitigations: string | null;
  application?: {
    appName: string;
    criticality: string;
  } | null;
};

type Application = {
  id: string;
  appName: string;
  criticality: string;
};

interface VendorRiskPanelProps {
  assessments: VendorAssessment[];
  applications: Application[];
}

const RISK_COLORS: Record<string, string> = {
  HIGH: "bg-red-100 text-red-800 border-red-300",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
  LOW: "bg-green-100 text-green-800 border-green-300",
};

const VendorRiskSchema = z.object({
  assessmentId: z.string().optional(),
  applicationId: z.string().optional(),
  vendorName: z.string().min(1, "Vendor name is required"),
  contractStart: z.string().optional(),
  contractEnd: z.string().optional(),
  slaCompliance: z.coerce.number().min(0).max(100).optional(),
  riskRating: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  lastAssessmentDate: z.string().optional(),
  findings: z.string().optional(),
  mitigations: z.string().optional(),
});

type VendorRiskValues = z.infer<typeof VendorRiskSchema>;

export function VendorRiskPanel({ assessments, applications }: VendorRiskPanelProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingAssessment, setEditingAssessment] = React.useState<VendorAssessment | null>(
    null
  );

  const form = useForm<VendorRiskValues>({
    resolver: zodResolver(VendorRiskSchema as any),
    defaultValues: {
      vendorName: "",
      riskRating: "MEDIUM",
    },
  });

  React.useEffect(() => {
    if (editingAssessment) {
      form.reset({
        assessmentId: editingAssessment.id,
        applicationId: editingAssessment.application?.appName,
        vendorName: editingAssessment.vendorName,
        contractStart: editingAssessment.contractStart
          ? format(editingAssessment.contractStart, "yyyy-MM-dd")
          : "",
        contractEnd: editingAssessment.contractEnd
          ? format(editingAssessment.contractEnd, "yyyy-MM-dd")
          : "",
        slaCompliance: editingAssessment.slaCompliance || undefined,
        riskRating: (editingAssessment.riskRating as any) || "MEDIUM",
        lastAssessmentDate: editingAssessment.lastAssessmentDate
          ? format(editingAssessment.lastAssessmentDate, "yyyy-MM-dd")
          : "",
        findings: editingAssessment.findings || "",
        mitigations: editingAssessment.mitigations || "",
      });
    } else {
      form.reset({
        vendorName: "",
        riskRating: "MEDIUM",
      });
    }
  }, [editingAssessment, form]);

  async function onSubmit(data: VendorRiskValues) {
    // Convert string dates to Date objects if present
    const submitData = {
      ...data,
      contractStart: data.contractStart ? new Date(data.contractStart) : undefined,
      contractEnd: data.contractEnd ? new Date(data.contractEnd) : undefined,
      lastAssessmentDate: data.lastAssessmentDate ? new Date(data.lastAssessmentDate) : undefined,
    } as any;

    const result = await manageVendorRiskAssessment(submitData);

    if (result.success) {
      toast.success(editingAssessment ? "Assessment updated" : "Assessment created");
      setDialogOpen(false);
      setEditingAssessment(null);
      form.reset();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  function handleEdit(assessment: VendorAssessment, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingAssessment(assessment);
    setDialogOpen(true);
  }

  function handleCreate() {
    setEditingAssessment(null);
    setDialogOpen(true);
  }

  // Calculate summary stats
  const totalVendors = new Set(assessments.map((a) => a.vendorName)).size;
  const highRiskCount = assessments.filter((a) => a.riskRating === "HIGH").length;
  const expiringContracts = assessments.filter((a) => {
    if (!a.contractEnd) return false;
    const daysUntilExpiry = differenceInDays(a.contractEnd, new Date());
    return daysUntilExpiry >= 0 && daysUntilExpiry <= 90;
  });
  const avgSlaCompliance =
    assessments.filter((a) => a.slaCompliance !== null).length > 0
      ? assessments.reduce((sum, a) => sum + (Number(a.slaCompliance) || 0), 0) /
        assessments.filter((a) => a.slaCompliance !== null).length
      : 0;

  const expiredContracts = assessments.filter((a) => {
    if (!a.contractEnd) return false;
    return differenceInDays(a.contractEnd, new Date()) < 0;
  });

  function getSlaColor(sla: number | null): string {
    if (sla === null) return "text-gray-600";
    if (sla >= 95) return "text-green-600";
    if (sla >= 80) return "text-amber-600";
    return "text-red-600";
  }

  function getContractStatus(contractEnd: Date | null): {
    status: string;
    color: string;
    daysRemaining: number | null;
  } {
    if (!contractEnd)
      return { status: "No expiry date", color: "text-gray-600", daysRemaining: null };

    const daysRemaining = differenceInDays(contractEnd, new Date());

    if (daysRemaining < 0) {
      return { status: "Expired", color: "text-red-600", daysRemaining };
    } else if (daysRemaining <= 30) {
      return { status: "Expiring soon", color: "text-red-600", daysRemaining };
    } else if (daysRemaining <= 90) {
      return { status: "Renewal due", color: "text-amber-600", daysRemaining };
    } else {
      return { status: "Active", color: "text-green-600", daysRemaining };
    }
  }

  return (
    <div className="space-y-4">
      {(expiringContracts.length > 0 || expiredContracts.length > 0) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Contract Alerts</AlertTitle>
          <AlertDescription>
            {expiredContracts.length > 0 && (
              <div>{expiredContracts.length} contract(s) have expired.</div>
            )}
            {expiringContracts.length > 0 && (
              <div>{expiringContracts.length} contract(s) expiring within 90 days.</div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Vendors</CardDescription>
            <CardTitle className="text-3xl">{totalVendors}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>High Risk Vendors</CardDescription>
            <CardTitle className="text-3xl text-red-600">{highRiskCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Expiring Contracts</CardDescription>
            <CardTitle className="text-3xl text-amber-600">
              {expiringContracts.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Avg SLA Compliance</CardDescription>
            <CardTitle className={`text-3xl ${getSlaColor(avgSlaCompliance)}`}>
              {avgSlaCompliance.toFixed(1)}%
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Assessment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAssessment ? "Edit Vendor Assessment" : "Add Vendor Risk Assessment"}
              </DialogTitle>
              <DialogDescription>
                {editingAssessment
                  ? "Update vendor risk assessment details"
                  : "Record vendor risk assessment and SLA compliance."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="vendorName">Vendor Name *</Label>
                  <Input id="vendorName" {...form.register("vendorName")} />
                  {form.formState.errors.vendorName && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.vendorName.message}
                    </p>
                  )}
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="applicationId">Linked Application</Label>
                  <Select
                    value={form.watch("applicationId") || ""}
                    onValueChange={(value) => form.setValue("applicationId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select application (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {applications.map((app) => (
                        <SelectItem key={app.id} value={app.id}>
                          {app.appName} ({app.criticality})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contractStart">Contract Start</Label>
                  <Input id="contractStart" type="date" {...form.register("contractStart")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contractEnd">Contract End</Label>
                  <Input id="contractEnd" type="date" {...form.register("contractEnd")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slaCompliance">SLA Compliance (%)</Label>
                  <Input
                    id="slaCompliance"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    {...form.register("slaCompliance")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="riskRating">Risk Rating</Label>
                  <Select
                    value={form.watch("riskRating") || ""}
                    onValueChange={(value) => form.setValue("riskRating", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="lastAssessmentDate">Last Assessment Date</Label>
                  <Input
                    id="lastAssessmentDate"
                    type="date"
                    {...form.register("lastAssessmentDate")}
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="findings">Findings</Label>
                  <Textarea id="findings" {...form.register("findings")} rows={3} />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="mitigations">Mitigations</Label>
                  <Textarea id="mitigations" {...form.register("mitigations")} rows={3} />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingAssessment(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingAssessment ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor Name</TableHead>
              <TableHead>Application</TableHead>
              <TableHead>Contract Period</TableHead>
              <TableHead>SLA Compliance</TableHead>
              <TableHead>Risk Rating</TableHead>
              <TableHead>Last Assessment</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assessments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No vendor risk assessments recorded.
                </TableCell>
              </TableRow>
            ) : (
              assessments.map((assessment) => {
                const contractStatus = getContractStatus(assessment.contractEnd);
                return (
                  <TableRow key={assessment.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{assessment.vendorName}</TableCell>
                    <TableCell>
                      {assessment.application ? (
                        <div>
                          <div>{assessment.application.appName}</div>
                          <Badge variant="outline" className="text-xs">
                            {assessment.application.criticality}
                          </Badge>
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {assessment.contractStart && assessment.contractEnd ? (
                        <div>
                          <div className="text-sm">
                            {format(assessment.contractStart, "dd MMM yyyy")} -{" "}
                            {format(assessment.contractEnd, "dd MMM yyyy")}
                          </div>
                          <div className={`text-xs ${contractStatus.color}`}>
                            {contractStatus.status}
                            {contractStatus.daysRemaining !== null &&
                              contractStatus.daysRemaining >= 0 &&
                              ` (${contractStatus.daysRemaining}d)`}
                          </div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {assessment.slaCompliance !== null ? (
                        <div className={`font-semibold ${getSlaColor(assessment.slaCompliance)}`}>
                          {assessment.slaCompliance.toFixed(1)}%
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {assessment.riskRating ? (
                        <Badge
                          variant="outline"
                          className={RISK_COLORS[assessment.riskRating] ?? ""}
                        >
                          {assessment.riskRating}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {assessment.lastAssessmentDate
                        ? format(assessment.lastAssessmentDate, "dd MMM yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleEdit(assessment, e)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
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
