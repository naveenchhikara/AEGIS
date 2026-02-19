"use client";

import * as React from "react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { markReconciled } from "@/actions/investment/manage-records";
import { useRouter } from "next/navigation";
import { Check, X, CheckCircle2 } from "@/lib/icons";

interface InvestmentRecord {
  id: string;
  securityType: string;
  classification: string;
  isin: string | null;
  faceValue: any;
  bookValue: any;
  marketValue: any;
  sglAccount: string | null;
  reconciled: boolean;
  period: string;
}

interface SglReconciliationProps {
  investments: InvestmentRecord[];
  unreconciled: InvestmentRecord[];
}

export function SglReconciliation({
  investments,
  unreconciled,
}: SglReconciliationProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const sglRecords = investments.filter((inv) => inv.sglAccount === "SGL");
  const csglRecords = investments.filter((inv) => inv.sglAccount === "CSGL");

  const sglReconciled = sglRecords.filter((inv) => inv.reconciled).length;
  const csglReconciled = csglRecords.filter((inv) => inv.reconciled).length;

  const totalReconciled = investments.filter((inv) => inv.reconciled).length;
  const reconciliationPercent =
    investments.length > 0
      ? ((totalReconciled / investments.length) * 100).toFixed(1)
      : "0.0";

  // Group unreconciled by period
  const unreconciledByPeriod = unreconciled.reduce(
    (acc, inv) => {
      if (!acc[inv.period]) {
        acc[inv.period] = [];
      }
      acc[inv.period].push(inv);
      return acc;
    },
    {} as Record<string, InvestmentRecord[]>,
  );

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleToggleAll = () => {
    if (selectedIds.size === unreconciled.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unreconciled.map((inv) => inv.id)));
    }
  };

  const handleBulkReconcile = async () => {
    if (selectedIds.size === 0) {
      alert("Please select at least one record to reconcile");
      return;
    }

    setSubmitting(true);
    try {
      const promises = Array.from(selectedIds).map((id) => markReconciled(id));
      await Promise.all(promises);
      setSelectedIds(new Set());
      router.refresh();
    } catch (error) {
      alert("Failed to reconcile records");
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

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total SGL Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sglRecords.length}</div>
            <p className="text-muted-foreground text-xs">
              {sglReconciled} reconciled, {sglRecords.length - sglReconciled}{" "}
              pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total CSGL Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{csglRecords.length}</div>
            <p className="text-muted-foreground text-xs">
              {csglReconciled} reconciled, {csglRecords.length - csglReconciled}{" "}
              pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Overall Reconciliation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reconciliationPercent}%</div>
            <p className="text-muted-foreground text-xs">
              {totalReconciled} of {investments.length} records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Reconciliation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreconciled.length}</div>
            <p className="text-muted-foreground text-xs">
              Records awaiting reconciliation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Unreconciled Records */}
      {unreconciled.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Unreconciled Records</CardTitle>
                <p className="text-muted-foreground mt-1 text-sm">
                  Records pending SGL/CSGL reconciliation
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleAll}
                  disabled={unreconciled.length === 0}
                >
                  {selectedIds.size === unreconciled.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
                <Button
                  size="sm"
                  onClick={handleBulkReconcile}
                  disabled={selectedIds.size === 0 || submitting}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {submitting
                    ? "Reconciling..."
                    : `Mark ${selectedIds.size || ""} as Reconciled`}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          selectedIds.size === unreconciled.length &&
                          unreconciled.length > 0
                        }
                        onCheckedChange={handleToggleAll}
                      />
                    </TableHead>
                    <TableHead>Security Type</TableHead>
                    <TableHead>ISIN</TableHead>
                    <TableHead>Face Value</TableHead>
                    <TableHead>Book Value</TableHead>
                    <TableHead>SGL Account</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unreconciled.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(inv.id)}
                          onCheckedChange={() => handleToggle(inv.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{inv.securityType}</Badge>
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
                        <Badge
                          variant="outline"
                          className={
                            inv.sglAccount === "SGL"
                              ? "border-blue-300 bg-blue-100 text-blue-800"
                              : "border-purple-300 bg-purple-100 text-purple-800"
                          }
                        >
                          {inv.sglAccount}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {inv.period}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkReconciled(inv.id)}
                        >
                          <Check className="mr-1 h-4 w-4" />
                          Mark Reconciled
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reconciliation by Period */}
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation by Period</CardTitle>
          <p className="text-muted-foreground text-sm">
            SGL/CSGL reconciliation status across reporting periods
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Total Records</TableHead>
                  <TableHead>SGL Records</TableHead>
                  <TableHead>CSGL Records</TableHead>
                  <TableHead>Reconciled</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(
                  investments.reduce(
                    (acc, inv) => {
                      if (!acc[inv.period]) {
                        acc[inv.period] = {
                          total: 0,
                          sgl: 0,
                          csgl: 0,
                          reconciled: 0,
                        };
                      }
                      acc[inv.period].total += 1;
                      if (inv.sglAccount === "SGL") acc[inv.period].sgl += 1;
                      if (inv.sglAccount === "CSGL") acc[inv.period].csgl += 1;
                      if (inv.reconciled) acc[inv.period].reconciled += 1;
                      return acc;
                    },
                    {} as Record<
                      string,
                      {
                        total: number;
                        sgl: number;
                        csgl: number;
                        reconciled: number;
                      }
                    >,
                  ),
                )
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([period, stats]) => {
                    const pending = stats.total - stats.reconciled;
                    const percent =
                      stats.total > 0
                        ? (stats.reconciled / stats.total) * 100
                        : 0;
                    return (
                      <TableRow key={period}>
                        <TableCell className="font-medium">{period}</TableCell>
                        <TableCell>{stats.total}</TableCell>
                        <TableCell>{stats.sgl}</TableCell>
                        <TableCell>{stats.csgl}</TableCell>
                        <TableCell>{stats.reconciled}</TableCell>
                        <TableCell>{pending}</TableCell>
                        <TableCell>
                          {percent === 100 ? (
                            <Badge
                              variant="outline"
                              className="border-green-300 bg-green-100 text-green-800"
                            >
                              <Check className="mr-1 h-3 w-3" />
                              Complete
                            </Badge>
                          ) : percent >= 80 ? (
                            <Badge
                              variant="outline"
                              className="border-blue-300 bg-blue-100 text-blue-800"
                            >
                              {percent.toFixed(0)}%
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-amber-300 bg-amber-100 text-amber-800"
                            >
                              <X className="mr-1 h-3 w-3" />
                              {percent.toFixed(0)}%
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
