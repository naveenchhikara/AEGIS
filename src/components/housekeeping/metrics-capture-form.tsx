"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus, Pencil, AlertTriangle } from "lucide-react";
import { manageHousekeepingMetric } from "@/actions/housekeeping/manage-metric";
import { toast } from "sonner";

const metricSchema = z.object({
  id: z.string().uuid().optional(),
  branchId: z.string().uuid({ message: "Branch is required" }),
  metricType: z.enum(["INTER_BRANCH", "SUSPENSE", "CLEARING", "SUNDRY"], {
    message: "Metric type is required",
  }),
  period: z.string().regex(/^\d{4}-Q[1-4]$/, {
    message: "Period must be in format YYYY-Q[1-4]",
  }),
  openingBalance: z.coerce.number().min(0, "Must be >= 0"),
  closingBalance: z.coerce.number().min(0, "Must be >= 0"),
  entriesCount: z.coerce.number().int().min(0).optional(),
  agingDays: z.coerce.number().int().min(0).optional(),
  remarks: z.string().optional(),
});

type MetricFormValues = z.infer<typeof metricSchema>;

type Branch = {
  id: string;
  name: string;
  code: string;
};

type HousekeepingMetric = {
  id: string;
  branchId: string;
  branch: { name: string };
  metricType: string;
  period: string;
  openingBalance: number;
  closingBalance: number;
  entriesCount: number;
  agingDays: number | null;
  remarks: string | null;
};

type Props = {
  metrics: HousekeepingMetric[];
  highRiskMetrics: HousekeepingMetric[];
  branches: Branch[];
  canManage: boolean;
};

export function MetricsCaptureForm({
  metrics,
  highRiskMetrics,
  branches,
  canManage,
}: Props) {
  const [open, setOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<HousekeepingMetric | null>(
    null
  );
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState({
    branchId: "",
    metricType: "",
    period: "",
  });

  const form = useForm<MetricFormValues>({
    resolver: zodResolver(metricSchema as any),
    defaultValues: {
      branchId: "",
      metricType: "INTER_BRANCH",
      period: "",
      openingBalance: 0,
      closingBalance: 0,
      entriesCount: 0,
      agingDays: 0,
      remarks: "",
    },
  });

  const handleOpenDialog = (metric?: HousekeepingMetric) => {
    if (metric) {
      setEditingMetric(metric);
      form.reset({
        id: metric.id,
        branchId: metric.branchId,
        metricType: metric.metricType as any,
        period: metric.period,
        openingBalance: Number(metric.openingBalance),
        closingBalance: Number(metric.closingBalance),
        entriesCount: metric.entriesCount,
        agingDays: metric.agingDays || undefined,
        remarks: metric.remarks || "",
      });
    } else {
      setEditingMetric(null);
      form.reset({
        branchId: "",
        metricType: "INTER_BRANCH",
        period: "",
        openingBalance: 0,
        closingBalance: 0,
        entriesCount: 0,
        agingDays: 0,
        remarks: "",
      });
    }
    setOpen(true);
  };

  const onSubmit = (values: MetricFormValues) => {
    startTransition(async () => {
      const result = await manageHousekeepingMetric(values);
      if (result.success) {
        toast.success(
          editingMetric ? "Metric updated successfully" : "Metric created successfully"
        );
        setOpen(false);
        form.reset();
      } else {
        toast.error(result.error);
      }
    });
  };

  const getAgingBadge = (agingDays: number | null) => {
    if (!agingDays) return null;
    if (agingDays > 180)
      return (
        <Badge variant="destructive" className="ml-2">
          {agingDays}d
        </Badge>
      );
    if (agingDays > 90)
      return (
        <Badge variant="default" className="ml-2 bg-orange-500">
          {agingDays}d
        </Badge>
      );
    if (agingDays > 30)
      return (
        <Badge variant="secondary" className="ml-2 bg-yellow-500">
          {agingDays}d
        </Badge>
      );
    return (
      <Badge variant="outline" className="ml-2">
        {agingDays}d
      </Badge>
    );
  };

  const filteredMetrics = metrics.filter((metric) => {
    if (filters.branchId && metric.branchId !== filters.branchId) return false;
    if (filters.metricType && metric.metricType !== filters.metricType)
      return false;
    if (filters.period && metric.period !== filters.period) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* High Risk Alerts */}
      {highRiskMetrics.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>High Risk Housekeeping Metrics Detected</AlertTitle>
          <AlertDescription>
            {highRiskMetrics.length} metric(s) with aging &gt; 90 days require
            immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Capture Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button onClick={() => handleOpenDialog()} disabled={!canManage}>
            <Plus className="mr-2 h-4 w-4" />
            Add Metric
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingMetric ? "Edit Metric" : "Add Housekeeping Metric"}
            </DialogTitle>
            <DialogDescription>
              Capture housekeeping risk metrics (inter-branch, suspense,
              clearing, sundry accounts)
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select branch" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name} ({branch.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="metricType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Metric Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="INTER_BRANCH">
                            Inter-Branch
                          </SelectItem>
                          <SelectItem value="SUSPENSE">Suspense</SelectItem>
                          <SelectItem value="CLEARING">Clearing</SelectItem>
                          <SelectItem value="SUNDRY">Sundry</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="2025-Q4"
                        {...field}
                        disabled={!!editingMetric}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="openingBalance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opening Balance</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="closingBalance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Closing Balance</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="entriesCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entries Count</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="agingDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aging Days</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remarks</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes..."
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving..." : editingMetric ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <Select
              value={filters.branchId}
              onValueChange={(value) =>
                setFilters((f) => ({ ...f, branchId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Branches</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.metricType}
              onValueChange={(value) =>
                setFilters((f) => ({ ...f, metricType: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="INTER_BRANCH">Inter-Branch</SelectItem>
                <SelectItem value="SUSPENSE">Suspense</SelectItem>
                <SelectItem value="CLEARING">Clearing</SelectItem>
                <SelectItem value="SUNDRY">Sundry</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Period (e.g., 2025-Q4)"
              value={filters.period}
              onChange={(e) =>
                setFilters((f) => ({ ...f, period: e.target.value }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Housekeeping Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Opening</TableHead>
                <TableHead className="text-right">Closing</TableHead>
                <TableHead className="text-right">Entries</TableHead>
                <TableHead>Aging</TableHead>
                <TableHead>Remarks</TableHead>
                {canManage && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMetrics.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canManage ? 9 : 8}
                    className="text-center text-muted-foreground"
                  >
                    No metrics found
                  </TableCell>
                </TableRow>
              ) : (
                filteredMetrics.map((metric) => (
                  <TableRow key={metric.id}>
                    <TableCell>{metric.branch.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {metric.metricType.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{metric.period}</TableCell>
                    <TableCell className="text-right">
                      ₹{Number(metric.openingBalance).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{Number(metric.closingBalance).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {metric.entriesCount}
                    </TableCell>
                    <TableCell>{getAgingBadge(metric.agingDays)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {metric.remarks}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(metric)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
