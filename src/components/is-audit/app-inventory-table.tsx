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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Loader2, AlertTriangle, Pencil } from "@/lib/icons";
import { toast } from "sonner";
import { manageApplicationInventory } from "@/actions/investment/manage-is-audit";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Application = {
  id: string;
  appName: string;
  vendor: string | null;
  version: string | null;
  hostingType: string;
  criticality: string;
  drTested: boolean;
  lastDrTestDate: Date | null;
  lastIsAuditDate: Date | null;
  dataClassification: string | null;
  description: string | null;
  createdAt: Date;
};

interface AppInventoryTableProps {
  applications: Application[];
  pendingDr: Application[];
}

const CRITICALITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 border-red-300",
  HIGH: "bg-orange-100 text-orange-800 border-orange-300",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
  LOW: "bg-green-100 text-green-800 border-green-300",
};

const HOSTING_COLORS: Record<string, string> = {
  ON_PREMISE: "bg-blue-100 text-blue-800 border-blue-300",
  CLOUD: "bg-purple-100 text-purple-800 border-purple-300",
  HYBRID: "bg-indigo-100 text-indigo-800 border-indigo-300",
};

const AppFormSchema = z.object({
  appId: z.string().optional(),
  appName: z.string().min(1, "Application name is required"),
  vendor: z.string().optional(),
  version: z.string().optional(),
  hostingType: z.enum(["ON_PREMISE", "CLOUD", "HYBRID"]),
  criticality: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  drTested: z.boolean().default(false),
  lastDrTestDate: z.string().optional(),
  lastIsAuditDate: z.string().optional(),
  dataClassification: z.enum(["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"]).optional(),
  description: z.string().optional(),
});

type AppFormValues = z.infer<typeof AppFormSchema>;

export function AppInventoryTable({ applications, pendingDr }: AppInventoryTableProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingApp, setEditingApp] = React.useState<Application | null>(null);
  const [filterCriticality, setFilterCriticality] = React.useState<string>("ALL");
  const [filterHosting, setFilterHosting] = React.useState<string>("ALL");
  const [filterDrStatus, setFilterDrStatus] = React.useState<string>("ALL");

  const form = useForm<AppFormValues>({
    resolver: zodResolver(AppFormSchema as any),
    defaultValues: {
      appName: "",
      vendor: "",
      version: "",
      hostingType: "ON_PREMISE",
      criticality: "MEDIUM",
      drTested: false,
    },
  });

  React.useEffect(() => {
    if (editingApp) {
      form.reset({
        appId: editingApp.id,
        appName: editingApp.appName,
        vendor: editingApp.vendor || "",
        version: editingApp.version || "",
        hostingType: editingApp.hostingType as any,
        criticality: editingApp.criticality as any,
        drTested: editingApp.drTested,
        lastDrTestDate: editingApp.lastDrTestDate
          ? format(editingApp.lastDrTestDate, "yyyy-MM-dd")
          : "",
        lastIsAuditDate: editingApp.lastIsAuditDate
          ? format(editingApp.lastIsAuditDate, "yyyy-MM-dd")
          : "",
        dataClassification: editingApp.dataClassification as any,
        description: editingApp.description || "",
      });
    } else {
      form.reset({
        appName: "",
        vendor: "",
        version: "",
        hostingType: "ON_PREMISE",
        criticality: "MEDIUM",
        drTested: false,
      });
    }
  }, [editingApp, form]);

  async function onSubmit(data: AppFormValues) {
    // Convert string dates to Date objects if present
    const submitData = {
      ...data,
      lastDrTestDate: data.lastDrTestDate ? new Date(data.lastDrTestDate) : undefined,
      lastIsAuditDate: data.lastIsAuditDate ? new Date(data.lastIsAuditDate) : undefined,
    } as any;

    const result = await manageApplicationInventory(submitData);

    if (result.success) {
      toast.success(editingApp ? "Application updated" : "Application added to inventory");
      setDialogOpen(false);
      setEditingApp(null);
      form.reset();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  function handleEdit(app: Application, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingApp(app);
    setDialogOpen(true);
  }

  function handleCreate() {
    setEditingApp(null);
    setDialogOpen(true);
  }

  const filteredApps = applications.filter((app) => {
    if (filterCriticality !== "ALL" && app.criticality !== filterCriticality) return false;
    if (filterHosting !== "ALL" && app.hostingType !== filterHosting) return false;
    if (filterDrStatus === "TESTED" && !app.drTested) return false;
    if (filterDrStatus === "NOT_TESTED" && app.drTested) return false;
    return true;
  });

  const pendingDrIds = new Set(pendingDr.map((app) => app.id));

  return (
    <div className="space-y-4">
      {pendingDr.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>DR Testing Overdue</AlertTitle>
          <AlertDescription>
            {pendingDr.length} application{pendingDr.length > 1 ? "s" : ""} have not been DR tested
            in the last 12 months. Immediate action required.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center gap-4">
        <div className="flex gap-2">
          <Select value={filterCriticality} onValueChange={setFilterCriticality}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Criticality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Criticality</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterHosting} onValueChange={setFilterHosting}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Hosting" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Hosting</SelectItem>
              <SelectItem value="ON_PREMISE">On-Premise</SelectItem>
              <SelectItem value="CLOUD">Cloud</SelectItem>
              <SelectItem value="HYBRID">Hybrid</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterDrStatus} onValueChange={setFilterDrStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="DR Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All DR Status</SelectItem>
              <SelectItem value="TESTED">DR Tested</SelectItem>
              <SelectItem value="NOT_TESTED">Not Tested</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Application
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingApp ? "Edit Application" : "Add Application to Inventory"}
              </DialogTitle>
              <DialogDescription>
                {editingApp
                  ? "Update application details"
                  : "Register a new application for IS audit tracking."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="appName">Application Name *</Label>
                  <Input id="appName" {...form.register("appName")} />
                  {form.formState.errors.appName && (
                    <p className="text-sm text-red-600">{form.formState.errors.appName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendor">Vendor</Label>
                  <Input id="vendor" {...form.register("vendor")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="version">Version</Label>
                  <Input id="version" {...form.register("version")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hostingType">Hosting Type *</Label>
                  <Select
                    value={form.watch("hostingType")}
                    onValueChange={(value) => form.setValue("hostingType", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ON_PREMISE">On-Premise</SelectItem>
                      <SelectItem value="CLOUD">Cloud</SelectItem>
                      <SelectItem value="HYBRID">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="criticality">Criticality *</Label>
                  <Select
                    value={form.watch("criticality")}
                    onValueChange={(value) => form.setValue("criticality", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataClassification">Data Classification</Label>
                  <Select
                    value={form.watch("dataClassification") || ""}
                    onValueChange={(value) =>
                      form.setValue("dataClassification", value as any)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select classification" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUBLIC">Public</SelectItem>
                      <SelectItem value="INTERNAL">Internal</SelectItem>
                      <SelectItem value="CONFIDENTIAL">Confidential</SelectItem>
                      <SelectItem value="RESTRICTED">Restricted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastDrTestDate">Last DR Test Date</Label>
                  <Input id="lastDrTestDate" type="date" {...form.register("lastDrTestDate")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastIsAuditDate">Last IS Audit Date</Label>
                  <Input
                    id="lastIsAuditDate"
                    type="date"
                    {...form.register("lastIsAuditDate")}
                  />
                </div>

                <div className="col-span-2 flex items-center space-x-2">
                  <Checkbox
                    id="drTested"
                    checked={form.watch("drTested")}
                    onCheckedChange={(checked) => form.setValue("drTested", !!checked)}
                  />
                  <Label htmlFor="drTested" className="cursor-pointer">
                    DR Tested
                  </Label>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" {...form.register("description")} rows={3} />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingApp(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingApp ? "Update" : "Create"}
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
              <TableHead>App Name</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Hosting</TableHead>
              <TableHead>Criticality</TableHead>
              <TableHead>DR Tested</TableHead>
              <TableHead>Last DR Test</TableHead>
              <TableHead>Last IS Audit</TableHead>
              <TableHead>Data Class.</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  No applications in inventory.
                </TableCell>
              </TableRow>
            ) : (
              filteredApps.map((app) => {
                const isDrOverdue = pendingDrIds.has(app.id);
                return (
                  <TableRow
                    key={app.id}
                    className={`cursor-pointer hover:bg-muted/50 ${
                      isDrOverdue ? "bg-red-50" : ""
                    }`}
                  >
                    <TableCell className="font-medium">
                      {app.appName}
                      {isDrOverdue && (
                        <AlertTriangle className="inline ml-2 h-4 w-4 text-red-600" />
                      )}
                    </TableCell>
                    <TableCell>{app.vendor || "—"}</TableCell>
                    <TableCell>{app.version || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={HOSTING_COLORS[app.hostingType] ?? ""}>
                        {app.hostingType.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={CRITICALITY_COLORS[app.criticality] ?? ""}>
                        {app.criticality}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {app.drTested ? (
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-800">
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {app.lastDrTestDate ? format(app.lastDrTestDate, "dd MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      {app.lastIsAuditDate ? format(app.lastIsAuditDate, "dd MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      {app.dataClassification ? (
                        <Badge variant="outline">{app.dataClassification}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleEdit(app, e)}
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
