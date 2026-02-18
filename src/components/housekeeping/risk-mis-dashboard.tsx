"use client";

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
import { AlertTriangle, TrendingUp, TrendingDown, Info } from "lucide-react";

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

export function RiskMisDashboard({ metrics }: Props) {
  // Extract different metric types
  const crarMetrics = metrics.filter((m) =>
    ["CRAR_TIER1", "CRAR_TIER2", "CRAR_TOTAL", "RISK_WEIGHTED_ASSETS"].includes(
      m.metricType
    )
  );
  const assetQualityMetrics = metrics.filter((m) =>
    ["GROSS_NPA", "NET_NPA", "PROVISION_COVERAGE", "SLIPPAGE_RATIO"].includes(
      m.metricType
    )
  );
  const liquidityMetrics = metrics.filter((m) =>
    ["SLR_MAINTAINED", "CRR_MAINTAINED", "LCR", "CD_RATIO"].includes(
      m.metricType
    )
  );
  const operationalMetrics = metrics.filter((m) =>
    ["INTER_BRANCH", "SUSPENSE", "CLEARING", "SUNDRY"].includes(m.metricType)
  );

  // Helper to get latest metric by type
  const getLatestMetric = (metricType: string, metricsArray: HousekeepingMetric[]) => {
    return metricsArray
      .filter((m) => m.metricType === metricType)
      .sort((a, b) => b.period.localeCompare(a.period))[0];
  };

  // Helper to format percentage
  const formatPercent = (value: number | undefined) => {
    if (value === undefined) return "N/A";
    return `${value.toFixed(2)}%`;
  };

  // CRAR Dashboard
  const crarTotal = getLatestMetric("CRAR_TOTAL", crarMetrics);
  const crarTier1 = getLatestMetric("CRAR_TIER1", crarMetrics);
  const crarTier2 = getLatestMetric("CRAR_TIER2", crarMetrics);
  const regulatoryCrarMin = 9; // RBI minimum CRAR

  const crarValue = crarTotal ? Number(crarTotal.closingBalance) : undefined;
  const tier1Value = crarTier1 ? Number(crarTier1.closingBalance) : undefined;
  const tier2Value = crarTier2 ? Number(crarTier2.closingBalance) : undefined;

  // Asset Quality
  const grossNpa = getLatestMetric("GROSS_NPA", assetQualityMetrics);
  const netNpa = getLatestMetric("NET_NPA", assetQualityMetrics);
  const provisionCoverage = getLatestMetric(
    "PROVISION_COVERAGE",
    assetQualityMetrics
  );
  const slippageRatio = getLatestMetric("SLIPPAGE_RATIO", assetQualityMetrics);

  const grossNpaValue = grossNpa ? Number(grossNpa.closingBalance) : undefined;
  const netNpaValue = netNpa ? Number(netNpa.closingBalance) : undefined;
  const provisionValue = provisionCoverage
    ? Number(provisionCoverage.closingBalance)
    : undefined;
  const slippageValue = slippageRatio
    ? Number(slippageRatio.closingBalance)
    : undefined;

  // Liquidity
  const slr = getLatestMetric("SLR_MAINTAINED", liquidityMetrics);
  const crr = getLatestMetric("CRR_MAINTAINED", liquidityMetrics);
  const lcr = getLatestMetric("LCR", liquidityMetrics);
  const cdRatio = getLatestMetric("CD_RATIO", liquidityMetrics);

  const slrValue = slr ? Number(slr.closingBalance) : undefined;
  const crrValue = crr ? Number(crr.closingBalance) : undefined;
  const lcrValue = lcr ? Number(lcr.closingBalance) : undefined;
  const cdRatioValue = cdRatio ? Number(cdRatio.closingBalance) : undefined;

  const slrRequired = 18; // Current RBI SLR requirement
  const crrRequired = 4.5; // Current RBI CRR requirement
  const lcrRequired = 100; // Basel III LCR requirement

  // Operational Risk - aggregate aging by type
  const operationalSummary = ["INTER_BRANCH", "SUSPENSE", "CLEARING", "SUNDRY"]
    .map((type) => {
      const typeMetrics = operationalMetrics.filter(
        (m) => m.metricType === type
      );
      const totalBalance = typeMetrics.reduce(
        (sum, m) => sum + Number(m.closingBalance),
        0
      );
      const avgAging =
        typeMetrics.reduce((sum, m) => sum + (m.agingDays || 0), 0) /
          (typeMetrics.length || 1);
      const highRiskCount = typeMetrics.filter(
        (m) => m.agingDays && m.agingDays > 90
      ).length;

      return { type, totalBalance, avgAging, highRiskCount, count: typeMetrics.length };
    })
    .filter((s) => s.count > 0);

  return (
    <div className="space-y-6">
      {/* CRAR Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle>Capital Adequacy Ratio (CRAR)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {crarValue === undefined ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Data Not Available</AlertTitle>
              <AlertDescription>
                Enter CRAR metrics via the Metrics Capture tab. Use metric types:
                CRAR_TOTAL, CRAR_TIER1, CRAR_TIER2, RISK_WEIGHTED_ASSETS
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total CRAR</p>
                  <p className="text-3xl font-bold">
                    {formatPercent(crarValue)}
                  </p>
                  <div className="flex items-center gap-2">
                    {crarValue >= regulatoryCrarMin ? (
                      <Badge variant="default" className="bg-green-500">
                        Compliant
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Below Minimum</Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      Min: {regulatoryCrarMin}%
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Tier 1 Capital</p>
                  <p className="text-2xl font-bold">
                    {formatPercent(tier1Value)}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Tier 2 Capital</p>
                  <p className="text-2xl font-bold">
                    {formatPercent(tier2Value)}
                  </p>
                </div>
              </div>

              {crarValue < regulatoryCrarMin && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Regulatory Alert</AlertTitle>
                  <AlertDescription>
                    CRAR is below RBI minimum of {regulatoryCrarMin}%. Immediate
                    capital infusion required.
                  </AlertDescription>
                </Alert>
              )}

              {crarTotal && (
                <p className="text-sm text-muted-foreground">
                  Period: {crarTotal.period}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Asset Quality Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Quality</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {grossNpaValue === undefined && netNpaValue === undefined ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Data Not Available</AlertTitle>
              <AlertDescription>
                Enter asset quality metrics via Metrics Capture. Use metric types:
                GROSS_NPA, NET_NPA, PROVISION_COVERAGE, SLIPPAGE_RATIO
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Gross NPA %</p>
                  <p className="text-2xl font-bold">
                    {formatPercent(grossNpaValue)}
                  </p>
                  {grossNpaValue !== undefined && grossNpaValue > 4 && (
                    <Badge variant="destructive">High Risk</Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Net NPA %</p>
                  <p className="text-2xl font-bold">
                    {formatPercent(netNpaValue)}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Provision Coverage
                  </p>
                  <p className="text-2xl font-bold">
                    {formatPercent(provisionValue)}
                  </p>
                  {provisionValue !== undefined && provisionValue < 70 && (
                    <Badge variant="secondary">Below Industry Avg</Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Slippage Ratio</p>
                  <p className="text-2xl font-bold">
                    {formatPercent(slippageValue)}
                  </p>
                </div>
              </div>

              {grossNpaValue !== undefined && grossNpaValue > 6 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Asset Quality Alert</AlertTitle>
                  <AlertDescription>
                    Gross NPA exceeds 6%. Enhanced recovery measures and
                    provisioning required.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Liquidity Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle>Liquidity Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {slrValue === undefined && crrValue === undefined ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Data Not Available</AlertTitle>
              <AlertDescription>
                Enter liquidity metrics via Metrics Capture. Use metric types:
                SLR_MAINTAINED, CRR_MAINTAINED, LCR, CD_RATIO
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-4">
                {/* SLR */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">
                      SLR Maintained: {formatPercent(slrValue)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Required: {slrRequired}%
                    </span>
                  </div>
                  <Progress
                    value={slrValue ? (slrValue / slrRequired) * 100 : 0}
                    className="h-2"
                  />
                  {slrValue !== undefined && slrValue < slrRequired && (
                    <Badge variant="destructive" className="mt-2">
                      Below Requirement
                    </Badge>
                  )}
                </div>

                {/* CRR */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">
                      CRR Maintained: {formatPercent(crrValue)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Required: {crrRequired}%
                    </span>
                  </div>
                  <Progress
                    value={crrValue ? (crrValue / crrRequired) * 100 : 0}
                    className="h-2"
                  />
                  {crrValue !== undefined && crrValue < crrRequired && (
                    <Badge variant="destructive" className="mt-2">
                      Below Requirement
                    </Badge>
                  )}
                </div>

                {/* LCR */}
                {lcrValue !== undefined && (
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">
                        Liquidity Coverage Ratio: {formatPercent(lcrValue)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Min: {lcrRequired}%
                      </span>
                    </div>
                    <Progress
                      value={lcrValue ? (lcrValue / lcrRequired) * 100 : 0}
                      className="h-2"
                    />
                    {lcrValue < lcrRequired && (
                      <Badge variant="destructive" className="mt-2">
                        Below Basel III Requirement
                      </Badge>
                    )}
                  </div>
                )}

                {/* CD Ratio */}
                {cdRatioValue !== undefined && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">
                      Credit-Deposit Ratio
                    </p>
                    <p className="text-2xl font-bold">
                      {formatPercent(cdRatioValue)}
                    </p>
                    {cdRatioValue > 90 && (
                      <Badge variant="secondary" className="mt-2">
                        High Leverage
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {(slrValue !== undefined && slrValue < slrRequired) ||
              (crrValue !== undefined && crrValue < crrRequired) ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Liquidity Compliance Alert</AlertTitle>
                  <AlertDescription>
                    One or more statutory ratios are below RBI requirements.
                    Immediate corrective action required.
                  </AlertDescription>
                </Alert>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {/* Operational Risk Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle>Operational Risk - Housekeeping Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {operationalSummary.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Data Not Available</AlertTitle>
              <AlertDescription>
                Enter operational metrics (inter-branch, suspense, clearing,
                sundry) via Metrics Capture tab
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Type</TableHead>
                  <TableHead className="text-right">Total Balance</TableHead>
                  <TableHead className="text-right">Avg Aging (Days)</TableHead>
                  <TableHead className="text-right">High Risk (&gt;90d)</TableHead>
                  <TableHead className="text-right">Total Entries</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operationalSummary.map((item) => (
                  <TableRow key={item.type}>
                    <TableCell className="font-medium">
                      {item.type.replace("_", " ")}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{item.totalBalance.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          item.avgAging > 90
                            ? "text-red-600 font-semibold"
                            : item.avgAging > 30
                            ? "text-yellow-600"
                            : ""
                        }
                      >
                        {item.avgAging.toFixed(0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.highRiskCount > 0 ? (
                        <Badge variant="destructive">{item.highRiskCount}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{item.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
