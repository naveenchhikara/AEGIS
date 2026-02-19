"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type RiskMisData = {
  assetQuality: Array<{
    category: string;
    count: number;
    totalAmount: number;
  }>;
  investment: {
    totalFaceValue: number;
    totalMarketValue: number;
    depreciation: number;
    unreconciledCount: number;
    totalRecords: number;
  };
  housekeeping: {
    totalBalance: number;
    highAgingCount: number;
    totalMetrics: number;
  };
  operationalRisk: Array<{
    category: string;
    count: number;
    avgResidualScore: number;
  }>;
  totalRisks: number;
  openRisks: number;
};

interface RiskMisDashboardProps {
  data: RiskMisData;
}

function formatLakhs(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

/**
 * Risk Management MIS Dashboard (R87).
 * CRAR-lite, asset quality, liquidity (investments), operational risk overview.
 */
export function RiskMisDashboard({ data }: RiskMisDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Top-level KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{data.totalRisks}</div>
            <p className="text-xs text-muted-foreground">Total Risks</p>
            <Badge variant={data.openRisks > 0 ? "destructive" : "secondary"} className="mt-1">
              {data.openRisks} open
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {formatLakhs(data.investment.totalMarketValue)}
            </div>
            <p className="text-xs text-muted-foreground">Investment Portfolio</p>
            {data.investment.depreciation > 0 && (
              <Badge variant="outline" className="mt-1 text-red-600">
                ↓ {data.investment.depreciation.toFixed(1)}% depreciation
              </Badge>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-600">
              {data.housekeeping.highAgingCount}
            </div>
            <p className="text-xs text-muted-foreground">High-Aging Items (90d+)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {data.investment.unreconciledCount}
            </div>
            <p className="text-xs text-muted-foreground">Unreconciled Investments</p>
          </CardContent>
        </Card>
      </div>

      {/* Asset Quality */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Quality</CardTitle>
          <CardDescription>SMA/NPA classification breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          {data.assetQuality.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No SMA/NPA data captured yet
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Accounts</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.assetQuality.map((aq) => (
                    <TableRow key={aq.category}>
                      <TableCell>
                        <Badge
                          variant={aq.category === "NPA" ? "destructive" : "outline"}
                        >
                          {aq.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{aq.count}</TableCell>
                      <TableCell className="text-right">
                        {formatLakhs(aq.totalAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Operational Risk Register */}
      <Card>
        <CardHeader>
          <CardTitle>Operational Risk by Category</CardTitle>
          <CardDescription>Average residual risk scores from the risk register</CardDescription>
        </CardHeader>
        <CardContent>
          {data.operationalRisk.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No risk register entries
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Avg Residual Score</TableHead>
                    <TableHead>Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.operationalRisk.map((or) => (
                    <TableRow key={or.category}>
                      <TableCell className="font-medium">{or.category}</TableCell>
                      <TableCell className="text-right">{or.count}</TableCell>
                      <TableCell className="text-right">
                        {or.avgResidualScore.toFixed(1)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            or.avgResidualScore > 3.5
                              ? "destructive"
                              : or.avgResidualScore > 2
                                ? "default"
                                : "secondary"
                          }
                        >
                          {or.avgResidualScore > 3.5
                            ? "HIGH"
                            : or.avgResidualScore > 2
                              ? "MEDIUM"
                              : "LOW"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
