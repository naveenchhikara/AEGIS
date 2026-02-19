"use client";

import * as React from "react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, AlertCircle, Info } from "@/lib/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface InvestmentRecord {
  id: string;
  securityType: string;
  classification: string;
  isin: string | null;
  faceValue: any;
  bookValue: any;
  marketValue: any;
  period: string;
}

interface NonSlrMonitorProps {
  investments: InvestmentRecord[];
  defaultDeposits?: number;
}

export function NonSlrMonitor({
  investments,
  defaultDeposits,
}: NonSlrMonitorProps) {
  // Use TOTAL_DEPOSITS from HousekeepingMetric if available, otherwise fall back to 10Cr default.
  // User can still override via manual input.
  const [totalDeposits, setTotalDeposits] = useState<string>(
    defaultDeposits ? String(defaultDeposits) : "100000000",
  );

  // Calculate non-SLR totals
  const nonSlrInvestments = investments.filter(
    (inv) => inv.securityType === "NON_SLR",
  );
  const nonSlrTotal = nonSlrInvestments.reduce(
    (sum, inv) => sum + Number(inv.faceValue),
    0,
  );

  // Calculate by classification
  const htmNonSlr = nonSlrInvestments
    .filter((inv) => inv.classification === "HTM")
    .reduce((sum, inv) => sum + Number(inv.faceValue), 0);
  const hftNonSlr = nonSlrInvestments
    .filter((inv) => inv.classification === "HFT")
    .reduce((sum, inv) => sum + Number(inv.faceValue), 0);
  const afsNonSlr = nonSlrInvestments
    .filter((inv) => inv.classification === "AFS")
    .reduce((sum, inv) => sum + Number(inv.faceValue), 0);

  const deposits = parseFloat(totalDeposits) || 0;
  const capLimit = deposits * 0.1; // 10% of deposits
  const capUtilization = capLimit > 0 ? (nonSlrTotal / capLimit) * 100 : 0;

  const getCapStatus = () => {
    if (capUtilization >= 100) {
      return {
        label: "BREACH",
        color: "bg-red-100 text-red-800 border-red-300",
        severity: "critical",
        message:
          "Non-SLR investments exceed 10% regulatory cap. Immediate action required.",
      };
    } else if (capUtilization >= 90) {
      return {
        label: "WARNING",
        color: "bg-amber-100 text-amber-800 border-amber-300",
        severity: "warning",
        message: "Non-SLR investments approaching 10% limit. Monitor closely.",
      };
    } else {
      return {
        label: "COMPLIANT",
        color: "bg-green-100 text-green-800 border-green-300",
        severity: "ok",
        message: "Non-SLR investments within regulatory limit.",
      };
    }
  };

  const status = getCapStatus();

  return (
    <div className="space-y-6">
      {/* Regulatory Reference */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Regulatory Requirement</AlertTitle>
        <AlertDescription>
          As per RBI norms for UCBs, non-SLR investments (equity, mutual funds,
          corporate bonds, etc.) must not exceed 10% of total deposits. This
          ensures adequate liquidity and risk management.
        </AlertDescription>
      </Alert>

      {/* Compliance Status Alert */}
      {status.severity === "critical" && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Non-SLR Cap Breach</AlertTitle>
          <AlertDescription>
            <p className="mb-2">{status.message}</p>
            <p className="font-semibold">
              Current: ₹{(nonSlrTotal / 10000000).toFixed(2)}Cr (
              {capUtilization.toFixed(2)}%)
            </p>
            <p className="font-semibold">
              Limit: ₹{(capLimit / 10000000).toFixed(2)}Cr (10% of deposits)
            </p>
            <p className="mt-2 font-semibold">
              Excess: ₹{((nonSlrTotal - capLimit) / 10000000).toFixed(2)}Cr
            </p>
          </AlertDescription>
        </Alert>
      )}

      {status.severity === "warning" && (
        <Alert className="border-amber-500 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900">
            Approaching Non-SLR Cap
          </AlertTitle>
          <AlertDescription className="text-amber-800">
            <p>{status.message}</p>
            <p className="mt-2">
              Utilization: {capUtilization.toFixed(2)}% of 10% limit
            </p>
          </AlertDescription>
        </Alert>
      )}

      {status.severity === "ok" && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900">
            Non-SLR Compliance: All Clear
          </AlertTitle>
          <AlertDescription className="text-green-800">
            {status.message} Current utilization: {capUtilization.toFixed(2)}%
          </AlertDescription>
        </Alert>
      )}

      {/* Manual Deposit Input */}
      <Card>
        <CardHeader>
          <CardTitle>Total Deposits Configuration</CardTitle>
          <p className="text-muted-foreground text-sm">
            {defaultDeposits
              ? "Pre-filled from Housekeeping Metrics (TOTAL_DEPOSITS). You may override below."
              : "Enter total deposits to calculate 10% non-SLR cap. Add a TOTAL_DEPOSITS housekeeping metric for automatic pre-fill."}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="totalDeposits">Total Deposits (₹)</Label>
              <Input
                id="totalDeposits"
                type="number"
                step="0.01"
                value={totalDeposits}
                onChange={(e) => setTotalDeposits(e.target.value)}
                placeholder="100000000"
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label>10% Cap Limit</Label>
              <div className="text-2xl font-bold">
                ₹{(capLimit / 10000000).toFixed(2)}Cr
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Non-SLR Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Non-SLR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(nonSlrTotal / 10000000).toFixed(2)}Cr
            </div>
            <p className="text-muted-foreground text-xs">
              {nonSlrInvestments.length} investments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Cap Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {capUtilization.toFixed(2)}%
            </div>
            <p className="text-muted-foreground text-xs">of 10% limit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Available Headroom
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{Math.max(0, (capLimit - nonSlrTotal) / 10000000).toFixed(2)}Cr
            </div>
            <p className="text-muted-foreground text-xs">Remaining capacity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Compliance Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className={status.color}>
              {status.severity === "critical" && (
                <AlertTriangle className="mr-1 h-3 w-3" />
              )}
              {status.severity === "warning" && (
                <AlertCircle className="mr-1 h-3 w-3" />
              )}
              {status.severity === "ok" && (
                <CheckCircle2 className="mr-1 h-3 w-3" />
              )}
              {status.label}
            </Badge>
            <p className="text-muted-foreground mt-1 text-xs">
              {status.severity === "critical"
                ? "Excess exposure"
                : status.severity === "warning"
                  ? "Monitor closely"
                  : "Within limits"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cap Utilization Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Non-SLR Cap Utilization</CardTitle>
          <p className="text-muted-foreground text-sm">
            Visual representation of non-SLR investment against 10% regulatory
            cap
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Current Utilization</span>
              <span className="font-semibold">
                {capUtilization.toFixed(2)}% of 10% cap
              </span>
            </div>
            <Progress
              value={Math.min(capUtilization, 120)}
              max={120}
              className={
                status.severity === "critical"
                  ? "[&>div]:bg-red-500"
                  : status.severity === "warning"
                    ? "[&>div]:bg-amber-500"
                    : "[&>div]:bg-green-500"
              }
            />
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>0%</span>
              <span className="font-semibold text-red-600">10% Cap Limit</span>
              <span>12%</span>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-muted-foreground text-sm">
                  Non-SLR Total
                </div>
                <div className="text-lg font-bold">
                  ₹{(nonSlrTotal / 10000000).toFixed(2)}Cr
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-sm">
                  10% Cap Limit
                </div>
                <div className="text-lg font-bold">
                  ₹{(capLimit / 10000000).toFixed(2)}Cr
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-sm">
                  {capUtilization >= 100 ? "Excess" : "Headroom"}
                </div>
                <div
                  className={`text-lg font-bold ${capUtilization >= 100 ? "text-red-600" : ""}`}
                >
                  ₹{Math.abs((capLimit - nonSlrTotal) / 10000000).toFixed(2)}Cr
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Classification Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Non-SLR by Classification</CardTitle>
          <p className="text-muted-foreground text-sm">
            Breakdown of non-SLR investments by HTM/HFT/AFS classification
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Classification</TableHead>
                  <TableHead>Investment Value</TableHead>
                  <TableHead>% of Non-SLR</TableHead>
                  <TableHead>% of Total Deposits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="border-indigo-300 bg-indigo-100 text-indigo-800"
                    >
                      HTM
                    </Badge>
                  </TableCell>
                  <TableCell>₹{(htmNonSlr / 10000000).toFixed(2)}Cr</TableCell>
                  <TableCell>
                    {nonSlrTotal > 0
                      ? ((htmNonSlr / nonSlrTotal) * 100).toFixed(2)
                      : "0.00"}
                    %
                  </TableCell>
                  <TableCell>
                    {deposits > 0
                      ? ((htmNonSlr / deposits) * 100).toFixed(2)
                      : "0.00"}
                    %
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="border-rose-300 bg-rose-100 text-rose-800"
                    >
                      HFT
                    </Badge>
                  </TableCell>
                  <TableCell>₹{(hftNonSlr / 10000000).toFixed(2)}Cr</TableCell>
                  <TableCell>
                    {nonSlrTotal > 0
                      ? ((hftNonSlr / nonSlrTotal) * 100).toFixed(2)
                      : "0.00"}
                    %
                  </TableCell>
                  <TableCell>
                    {deposits > 0
                      ? ((hftNonSlr / deposits) * 100).toFixed(2)
                      : "0.00"}
                    %
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="border-amber-300 bg-amber-100 text-amber-800"
                    >
                      AFS
                    </Badge>
                  </TableCell>
                  <TableCell>₹{(afsNonSlr / 10000000).toFixed(2)}Cr</TableCell>
                  <TableCell>
                    {nonSlrTotal > 0
                      ? ((afsNonSlr / nonSlrTotal) * 100).toFixed(2)
                      : "0.00"}
                    %
                  </TableCell>
                  <TableCell>
                    {deposits > 0
                      ? ((afsNonSlr / deposits) * 100).toFixed(2)
                      : "0.00"}
                    %
                  </TableCell>
                </TableRow>
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell>Total Non-SLR</TableCell>
                  <TableCell>
                    ₹{(nonSlrTotal / 10000000).toFixed(2)}Cr
                  </TableCell>
                  <TableCell>100.00%</TableCell>
                  <TableCell>
                    {deposits > 0
                      ? ((nonSlrTotal / deposits) * 100).toFixed(2)
                      : "0.00"}
                    %
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
