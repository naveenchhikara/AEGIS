"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, TrendingUp, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type HousekeepingMetric = {
  id: string;
  branchId: string;
  branch?: { name: string };
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
};

type ExposureEntry = {
  counterpartyBank: string;
  exposureAmount: number;
  period: string;
};

export function InterbankExposureMonitor({ metrics }: Props) {
  // Default net worth (can be overridden)
  const [netWorth, setNetWorth] = useState<number>(100000000); // Default: 10 crores

  // Extract inter-bank exposure metrics
  const exposureMetrics = metrics.filter(
    (m) => m.metricType === "INTERBANK_EXPOSURE",
  );

  // Parse exposure data from metrics
  const exposureEntries: ExposureEntry[] = exposureMetrics.map((m) => ({
    counterpartyBank: m.remarks || "Unknown Bank",
    exposureAmount: Number(m.closingBalance),
    period: m.period,
  }));

  // Calculate totals
  const totalExposure = exposureEntries.reduce(
    (sum, entry) => sum + entry.exposureAmount,
    0,
  );

  // Regulatory limits
  const totalLimitPercent = 20;
  const perBankLimitPercent = 5;

  const totalLimit = (netWorth * totalLimitPercent) / 100;
  const perBankLimit = (netWorth * perBankLimitPercent) / 100;

  const totalUtilizationPercent = (totalExposure / totalLimit) * 100;

  // Per-bank aggregation
  const perBankExposure = exposureEntries.reduce(
    (acc, entry) => {
      const existing = acc.find((e) => e.bank === entry.counterpartyBank);
      if (existing) {
        existing.exposure += entry.exposureAmount;
      } else {
        acc.push({
          bank: entry.counterpartyBank,
          exposure: entry.exposureAmount,
        });
      }
      return acc;
    },
    [] as { bank: string; exposure: number }[],
  );

  // Sort by exposure (descending)
  perBankExposure.sort((a, b) => b.exposure - a.exposure);

  // Status helpers
  const getTotalStatus = () => {
    if (totalUtilizationPercent > 100) return "BREACH";
    if (totalUtilizationPercent > 90) return "WARNING";
    return "WITHIN_LIMIT";
  };

  const getPerBankStatus = (exposure: number) => {
    const utilization = (exposure / perBankLimit) * 100;
    if (utilization > 100) return "BREACH";
    if (utilization > 80) return "WARNING";
    return "WITHIN_LIMIT";
  };

  const totalStatus = getTotalStatus();

  return (
    <div className="space-y-6">
      {/* Net Worth Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-md space-y-2">
            <Label htmlFor="netWorth">Net Worth (₹)</Label>
            <Input
              id="netWorth"
              type="number"
              value={netWorth}
              onChange={(e) => setNetWorth(Number(e.target.value))}
              placeholder="Enter net worth"
            />
            <p className="text-muted-foreground text-sm">
              Used to calculate exposure limits. Update this value to reflect
              current net worth.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Total Exposure Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Total Inter-bank Exposure</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {exposureEntries.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No Exposure Data</AlertTitle>
              <AlertDescription>
                Add inter-bank exposure entries via Metrics Capture. Use metric
                type: INTERBANK_EXPOSURE. Bank name goes in Remarks field,
                exposure amount in Closing Balance.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <p className="text-muted-foreground text-sm">
                    Total Exposure
                  </p>
                  <p className="text-2xl font-bold">
                    ₹{totalExposure.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Total Limit</p>
                  <p className="text-2xl font-bold">
                    ₹{totalLimit.toLocaleString()}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    ({totalLimitPercent}% of net worth)
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Utilization</p>
                  <p className="text-2xl font-bold">
                    {totalUtilizationPercent.toFixed(2)}%
                  </p>
                  {totalStatus === "BREACH" && (
                    <Badge variant="destructive">BREACH</Badge>
                  )}
                  {totalStatus === "WARNING" && (
                    <Badge variant="default" className="bg-yellow-500">
                      WARNING
                    </Badge>
                  )}
                  {totalStatus === "WITHIN_LIMIT" && (
                    <Badge variant="default" className="bg-green-500">
                      COMPLIANT
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-2 flex justify-between">
                  <span className="text-sm font-medium">
                    Total Exposure Utilization
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {totalUtilizationPercent.toFixed(1)}% of {totalLimitPercent}
                    % limit
                  </span>
                </div>
                <Progress
                  value={Math.min(totalUtilizationPercent, 100)}
                  className={`h-3 ${
                    totalStatus === "BREACH"
                      ? "[&>div]:bg-red-500"
                      : totalStatus === "WARNING"
                        ? "[&>div]:bg-yellow-500"
                        : "[&>div]:bg-green-500"
                  }`}
                />
              </div>

              {totalStatus === "BREACH" && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Regulatory Breach</AlertTitle>
                  <AlertDescription>
                    Total inter-bank exposure exceeds 20% of net worth.
                    Immediate reduction required to comply with RBI Master
                    Circular on Exposure Norms.
                  </AlertDescription>
                </Alert>
              )}

              {totalStatus === "WARNING" && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    Total inter-bank exposure is nearing the 20% limit. Monitor
                    closely and consider reducing exposure.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Per-Bank Exposure Table */}
      {perBankExposure.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Per-Bank Exposure Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted mb-4 rounded-md p-4">
              <p className="text-sm">
                <strong>Regulatory Reference:</strong> Total inter-bank exposure
                shall not exceed 20% of net worth. Exposure to any single bank
                shall not exceed 5% of net worth (RBI Master Circular on
                Exposure Norms).
              </p>
              <p className="mt-2 text-sm">
                Per-bank limit: ₹{perBankLimit.toLocaleString()} (
                {perBankLimitPercent}% of net worth)
              </p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Counterparty Bank</TableHead>
                  <TableHead className="text-right">Exposure Amount</TableHead>
                  <TableHead className="text-right">Limit</TableHead>
                  <TableHead className="text-right">Utilization %</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perBankExposure.map((entry, idx) => {
                  const utilization = (entry.exposure / perBankLimit) * 100;
                  const status = getPerBankStatus(entry.exposure);

                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {entry.bank}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{entry.exposure.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{perBankLimit.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            status === "BREACH"
                              ? "font-semibold text-red-600"
                              : status === "WARNING"
                                ? "font-semibold text-yellow-600"
                                : ""
                          }
                        >
                          {utilization.toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        {status === "BREACH" && (
                          <Badge variant="destructive">BREACH</Badge>
                        )}
                        {status === "WARNING" && (
                          <Badge variant="default" className="bg-yellow-500">
                            WARNING
                          </Badge>
                        )}
                        {status === "WITHIN_LIMIT" && (
                          <Badge variant="outline">WITHIN LIMIT</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {perBankExposure.some(
              (e) => getPerBankStatus(e.exposure) === "BREACH",
            ) && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Per-Bank Limit Breach</AlertTitle>
                <AlertDescription>
                  One or more banks exceed the 5% per-bank exposure limit.
                  Immediate diversification or reduction required.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
