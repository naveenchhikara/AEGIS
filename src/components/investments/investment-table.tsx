"use client";

import * as React from "react";
import { useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  manageInvestmentRecord,
  markReconciled,
} from "@/actions/investment/manage-records";
import { Plus, Pencil, Check, X } from "@/lib/icons";
import { useRouter } from "next/navigation";

interface InvestmentRecord {
  id: string;
  securityType: string;
  classification: string;
  isin: string | null;
  faceValue: any;
  bookValue: any;
  marketValue: any;
  brokerName: string | null;
  brokerShare: any;
  sglAccount: string | null;
  reconciled: boolean;
  period: string;
}

interface InvestmentTableProps {
  investments: InvestmentRecord[];
}

const InvestmentFormSchema = z.object({
  securityType: z.enum(["SLR", "NON_SLR", "EQUITY", "MUTUAL_FUND"]),
  classification: z.enum(["HTM", "HFT", "AFS"]),
  isin: z.string().optional(),
  faceValue: z.string(),
  bookValue: z.string(),
  marketValue: z.string().optional(),
  brokerName: z.string().optional(),
  brokerShare: z.string().optional(),
  sglAccount: z.string().optional(),
  period: z.string(),
});

type InvestmentFormValues = z.infer<typeof InvestmentFormSchema>;

const SECURITY_TYPE_COLORS: Record<string, string> = {
  SLR: "bg-green-100 text-green-800 border-green-300",
  NON_SLR: "bg-blue-100 text-blue-800 border-blue-300",
  EQUITY: "bg-purple-100 text-purple-800 border-purple-300",
  MUTUAL_FUND: "bg-orange-100 text-orange-800 border-orange-300",
};

const CLASSIFICATION_COLORS: Record<string, string> = {
  HTM: "bg-indigo-100 text-indigo-800 border-indigo-300",
  HFT: "bg-rose-100 text-rose-800 border-rose-300",
  AFS: "bg-amber-100 text-amber-800 border-amber-300",
};

export function InvestmentTable({ investments }: InvestmentTableProps) {
  const router = useRouter();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<InvestmentRecord | null>(null);
  const [filterSecurityType, setFilterSecurityType] = useState<string>("ALL");
  const [filterClassification, setFilterClassification] =
    useState<string>("ALL");
  const [filterReconciled, setFilterReconciled] = useState<string>("ALL");
  const [filterPeriod, setFilterPeriod] = useState<string>("ALL");
  const [submitting, setSubmitting] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  const form = useForm<InvestmentFormValues>({
    resolver: zodResolver(InvestmentFormSchema as any),
    defaultValues: {
      securityType: "SLR",
      classification: "HTM",
      period: `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
    },
  });

  // Filter investments
  const filteredInvestments = investments.filter((inv) => {
    if (filterSecurityType !== "ALL" && inv.securityType !== filterSecurityType)
      return false;
    if (
      filterClassification !== "ALL" &&
      inv.classification !== filterClassification
    )
      return false;
    if (filterReconciled !== "ALL") {
      const isReconciled = inv.reconciled;
      if (filterReconciled === "RECONCILED" && !isReconciled) return false;
      if (filterReconciled === "UNRECONCILED" && isReconciled) return false;
    }
    if (filterPeriod !== "ALL" && inv.period !== filterPeriod) return false;
    return true;
  });

  // Calculate summary stats
  const totalFaceValue = filteredInvestments.reduce(
    (sum, inv) => sum + Number(inv.faceValue),
    0,
  );
  const totalBookValue = filteredInvestments.reduce(
    (sum, inv) => sum + Number(inv.bookValue),
    0,
  );
  const totalMarketValue = filteredInvestments.reduce(
    (sum, inv) =>
      sum + (inv.marketValue ? Number(inv.marketValue) : Number(inv.bookValue)),
    0,
  );
  const reconciledCount = filteredInvestments.filter(
    (inv) => inv.reconciled,
  ).length;
  const reconciliationPercent =
    filteredInvestments.length > 0
      ? ((reconciledCount / filteredInvestments.length) * 100).toFixed(1)
      : "0.0";

  // Get unique periods
  const periods = Array.from(new Set(investments.map((inv) => inv.period)))
    .sort()
    .reverse();

  const handleSubmit = async (values: InvestmentFormValues) => {
    setSubmitting(true);
    setWarnings([]);

    try {
      const result = await manageInvestmentRecord({
        recordId: editRecord?.id,
        securityType: values.securityType,
        classification: values.classification,
        isin: values.isin || undefined,
        faceValue: parseFloat(values.faceValue),
        bookValue: parseFloat(values.bookValue),
        marketValue: values.marketValue
          ? parseFloat(values.marketValue)
          : undefined,
        brokerName: values.brokerName || undefined,
        brokerShare: values.brokerShare
          ? parseFloat(values.brokerShare) / 100
          : undefined,
        sglAccount:
          values.sglAccount && values.sglAccount !== ""
            ? (values.sglAccount as any)
            : undefined,
        period: values.period,
      });

      if (result.success) {
        if (result.data.warnings && result.data.warnings.length > 0) {
          setWarnings(result.data.warnings);
        } else {
          setIsAddOpen(false);
          setEditRecord(null);
          form.reset();
          router.refresh();
        }
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert("Failed to save investment record");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkReconciled = async (recordId: string) => {
    const result = await markReconciled(recordId);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error);
    }
  };

  const handleEdit = (record: InvestmentRecord) => {
    setEditRecord(record);
    form.reset({
      securityType: record.securityType as any,
      classification: record.classification as any,
      isin: record.isin || undefined,
      faceValue: record.faceValue.toString(),
      bookValue: record.bookValue.toString(),
      marketValue: record.marketValue?.toString() || undefined,
      brokerName: record.brokerName || undefined,
      brokerShare: record.brokerShare
        ? (Number(record.brokerShare) * 100).toString()
        : undefined,
      sglAccount: (record.sglAccount as any) || "",
      period: record.period,
    });
    setIsAddOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Face Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(totalFaceValue / 10000000).toFixed(2)}Cr
            </div>
            <p className="text-muted-foreground text-xs">
              {filteredInvestments.length} records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Book Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(totalBookValue / 10000000).toFixed(2)}Cr
            </div>
            <p className="text-muted-foreground text-xs">Amortized cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Market Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(totalMarketValue / 10000000).toFixed(2)}Cr
            </div>
            <p className="text-muted-foreground text-xs">Mark-to-market</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Reconciliation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reconciliationPercent}%</div>
            <p className="text-muted-foreground text-xs">
              {reconciledCount} of {filteredInvestments.length} reconciled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Add Button */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 space-y-2">
          <Label>Security Type</Label>
          <Select
            value={filterSecurityType}
            onValueChange={setFilterSecurityType}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="SLR">SLR</SelectItem>
              <SelectItem value="NON_SLR">Non-SLR</SelectItem>
              <SelectItem value="EQUITY">Equity</SelectItem>
              <SelectItem value="MUTUAL_FUND">Mutual Fund</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 space-y-2">
          <Label>Classification</Label>
          <Select
            value={filterClassification}
            onValueChange={setFilterClassification}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Classifications</SelectItem>
              <SelectItem value="HTM">HTM</SelectItem>
              <SelectItem value="HFT">HFT</SelectItem>
              <SelectItem value="AFS">AFS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 space-y-2">
          <Label>Reconciliation</Label>
          <Select value={filterReconciled} onValueChange={setFilterReconciled}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="RECONCILED">Reconciled</SelectItem>
              <SelectItem value="UNRECONCILED">Unreconciled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 space-y-2">
          <Label>Period</Label>
          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Periods</SelectItem>
              {periods.map((period) => (
                <SelectItem key={period} value={period}>
                  {period}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog
          open={isAddOpen}
          onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) {
              setEditRecord(null);
              form.reset();
              setWarnings([]);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Investment Record
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editRecord
                  ? "Edit Investment Record"
                  : "Add Investment Record"}
              </DialogTitle>
              <DialogDescription>
                Record investment transaction with compliance checks
              </DialogDescription>
            </DialogHeader>

            {warnings.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                <h4 className="mb-2 text-sm font-semibold text-amber-900">
                  Compliance Warnings:
                </h4>
                <ul className="list-inside list-disc space-y-1">
                  {warnings.map((warning, idx) => (
                    <li key={idx} className="text-sm text-amber-800">
                      {warning}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsAddOpen(false);
                      setEditRecord(null);
                      form.reset();
                      setWarnings([]);
                      router.refresh();
                    }}
                  >
                    OK
                  </Button>
                </div>
              </div>
            )}

            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="securityType">Security Type *</Label>
                  <Select
                    value={form.watch("securityType")}
                    onValueChange={(value) =>
                      form.setValue("securityType", value as any)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SLR">SLR</SelectItem>
                      <SelectItem value="NON_SLR">Non-SLR</SelectItem>
                      <SelectItem value="EQUITY">Equity</SelectItem>
                      <SelectItem value="MUTUAL_FUND">Mutual Fund</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="classification">Classification *</Label>
                  <Select
                    value={form.watch("classification")}
                    onValueChange={(value) =>
                      form.setValue("classification", value as any)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HTM">
                        HTM (Held to Maturity)
                      </SelectItem>
                      <SelectItem value="HFT">
                        HFT (Held for Trading)
                      </SelectItem>
                      <SelectItem value="AFS">
                        AFS (Available for Sale)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="isin">ISIN</Label>
                  <Input
                    id="isin"
                    {...form.register("isin")}
                    placeholder="INE123A01012"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="period">Period *</Label>
                  <Input
                    id="period"
                    {...form.register("period")}
                    placeholder="2025-Q1"
                    pattern="^\d{4}-Q[1-4]$"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="faceValue">Face Value (₹) *</Label>
                  <Input
                    id="faceValue"
                    type="number"
                    step="0.01"
                    {...form.register("faceValue")}
                    placeholder="1000000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bookValue">Book Value (₹) *</Label>
                  <Input
                    id="bookValue"
                    type="number"
                    step="0.01"
                    {...form.register("bookValue")}
                    placeholder="1000000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marketValue">Market Value (₹)</Label>
                  <Input
                    id="marketValue"
                    type="number"
                    step="0.01"
                    {...form.register("marketValue")}
                    placeholder="1050000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brokerName">Broker Name</Label>
                  <Input
                    id="brokerName"
                    {...form.register("brokerName")}
                    placeholder="ICICI Securities"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brokerShare">Broker Share (%)</Label>
                  <Input
                    id="brokerShare"
                    type="number"
                    step="0.01"
                    max="100"
                    {...form.register("brokerShare")}
                    placeholder="2.5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sglAccount">SGL Account</Label>
                  <Select
                    value={form.watch("sglAccount")}
                    onValueChange={(value) =>
                      form.setValue("sglAccount", value as any)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      <SelectItem value="SGL">SGL</SelectItem>
                      <SelectItem value="CSGL">CSGL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditRecord(null);
                    form.reset();
                    setWarnings([]);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : editRecord ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Investment Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Security Type</TableHead>
              <TableHead>Classification</TableHead>
              <TableHead>ISIN</TableHead>
              <TableHead>Face Value</TableHead>
              <TableHead>Book Value</TableHead>
              <TableHead>Market Value</TableHead>
              <TableHead>Broker</TableHead>
              <TableHead>SGL</TableHead>
              <TableHead>Reconciled</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvestments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center">
                  No investment records found.
                </TableCell>
              </TableRow>
            ) : (
              filteredInvestments.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={SECURITY_TYPE_COLORS[inv.securityType]}
                    >
                      {inv.securityType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={CLASSIFICATION_COLORS[inv.classification]}
                    >
                      {inv.classification}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {inv.isin || "—"}
                  </TableCell>
                  <TableCell>
                    ₹{(Number(inv.faceValue) / 100000).toFixed(2)}L
                  </TableCell>
                  <TableCell>
                    ₹{(Number(inv.bookValue) / 100000).toFixed(2)}L
                  </TableCell>
                  <TableCell>
                    {inv.marketValue
                      ? `₹${(Number(inv.marketValue) / 100000).toFixed(2)}L`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {inv.brokerName || "—"}
                    {inv.brokerShare && (
                      <div className="text-muted-foreground text-xs">
                        {(Number(inv.brokerShare) * 100).toFixed(2)}%
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{inv.sglAccount || "—"}</TableCell>
                  <TableCell>
                    {inv.reconciled ? (
                      <Badge
                        variant="outline"
                        className="border-green-300 bg-green-100 text-green-800"
                      >
                        <Check className="mr-1 h-3 w-3" />
                        Yes
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-amber-300 bg-amber-100 text-amber-800"
                      >
                        <X className="mr-1 h-3 w-3" />
                        No
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{inv.period}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(inv)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!inv.reconciled && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkReconciled(inv.id)}
                        >
                          Mark Reconciled
                        </Button>
                      )}
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
