"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { AlertCircle, CheckCircle2, TrendingUp, Activity } from "@/lib/icons";

interface AuditHealthDashboardProps {
  progress: {
    year: number;
    total: number;
    completed: number;
    pending: number;
    completionPct: number;
  };
  standardSummary: Array<{
    standard: string;
    total: number;
    conforms: number;
    partiallyConforms: number;
    doesNotConform: number;
    notApplicable: number;
    gaps: number;
  }>;
}

export function AuditHealthDashboard({
  progress,
  standardSummary,
}: AuditHealthDashboardProps) {
  // Calculate overall health score
  const totalResponses = standardSummary.reduce(
    (sum, s) => sum + s.conforms + s.partiallyConforms + s.doesNotConform,
    0,
  );
  const weightedScore = standardSummary.reduce(
    (sum, s) => sum + s.conforms * 100 + s.partiallyConforms * 50,
    0,
  );
  const healthScore =
    totalResponses > 0 ? Math.round(weightedScore / totalResponses) : 0;

  // Count total gaps
  const totalGaps = standardSummary.reduce((sum, s) => sum + s.gaps, 0);

  // Gap conversion status (we'll assume issueCreated is tracked elsewhere)
  const gapsConverted = 0; // This would come from actual data
  const gapsPending = totalGaps - gapsConverted;

  // Generate recommendations
  const recommendations = [];
  if (healthScore < 70) {
    recommendations.push({
      severity: "high",
      text: "Consider scheduling an external quality assessment review",
    });
  }
  if (totalGaps > 5) {
    recommendations.push({
      severity: "medium",
      text: "Prioritize gap remediation to improve conformance",
    });
  }
  if (progress.completionPct < 50) {
    recommendations.push({
      severity: "medium",
      text: "Assessment is incomplete - schedule completion with audit team",
    });
  }
  if (healthScore >= 90) {
    recommendations.push({
      severity: "low",
      text: "Excellent conformance - maintain current quality standards",
    });
  }

  const getHealthColor = (score: number) => {
    if (score >= 90) return "green";
    if (score >= 70) return "yellow";
    return "red";
  };

  const healthColor = getHealthColor(healthScore);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-lg font-semibold">
          Audit Function Health Dashboard
        </h2>
        <p className="text-muted-foreground text-sm">
          Overall health metrics and IIA Standards conformance analysis
        </p>
      </div>

      {/* Health Score */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Overall Health Score
            </CardTitle>
            <CardDescription>Weighted conformance score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <div className="relative h-32 w-32">
                <svg className="h-32 w-32 -rotate-90 transform">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-secondary"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${(healthScore / 100) * 351.86} 351.86`}
                    className={
                      healthColor === "green"
                        ? "text-green-600"
                        : healthColor === "yellow"
                          ? "text-amber-600"
                          : "text-red-600"
                    }
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">{healthScore}</span>
                  <span className="text-muted-foreground text-xs">/ 100</span>
                </div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <Badge
                variant="outline"
                className={
                  healthColor === "green"
                    ? "border-green-300 bg-green-100 text-green-800"
                    : healthColor === "yellow"
                      ? "border-amber-300 bg-amber-100 text-amber-800"
                      : "border-red-300 bg-red-100 text-red-800"
                }
              >
                {healthColor === "green"
                  ? "Healthy"
                  : healthColor === "yellow"
                    ? "Needs Improvement"
                    : "Critical"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Assessment Progress
            </CardTitle>
            <CardDescription>
              FY {progress.year} completion status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Completed</span>
                <span className="font-semibold">
                  {progress.completed} / {progress.total} (
                  {progress.completionPct}%)
                </span>
              </div>
              <Progress value={progress.completionPct} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Completed</p>
                <p className="text-xl font-bold text-green-600">
                  {progress.completed}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Pending</p>
                <p className="text-xl font-bold text-amber-600">
                  {progress.pending}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gap Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Total Gaps Identified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGaps}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              Across all IIA standards
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Gaps Converted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {gapsConverted}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Converted to issues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Pending Conversion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {gapsPending}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Awaiting action
            </p>
          </CardContent>
        </Card>
      </div>

      {/* IIA Standard Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>IIA Standard Category Breakdown</CardTitle>
          <CardDescription>
            Conformance analysis by standard category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Standard</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Conforms</TableHead>
                <TableHead className="text-right">Partial</TableHead>
                <TableHead className="text-right">Non-Conform</TableHead>
                <TableHead className="text-right">N/A</TableHead>
                <TableHead className="text-right">Gaps</TableHead>
                <TableHead className="text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standardSummary.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-muted-foreground text-center"
                  >
                    No assessment data available
                  </TableCell>
                </TableRow>
              ) : (
                standardSummary.map((summary) => {
                  const categoryScore =
                    summary.conforms +
                      summary.partiallyConforms +
                      summary.doesNotConform >
                    0
                      ? Math.round(
                          ((summary.conforms * 100 +
                            summary.partiallyConforms * 50) /
                            (summary.conforms +
                              summary.partiallyConforms +
                              summary.doesNotConform)) *
                            100,
                        ) / 100
                      : 0;

                  return (
                    <TableRow key={summary.standard}>
                      <TableCell className="font-mono font-semibold">
                        {summary.standard}
                      </TableCell>
                      <TableCell className="text-right">
                        {summary.total}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {summary.conforms}
                      </TableCell>
                      <TableCell className="text-right text-amber-600">
                        {summary.partiallyConforms}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {summary.doesNotConform}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right">
                        {summary.notApplicable}
                      </TableCell>
                      <TableCell className="text-right">
                        {summary.gaps > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {summary.gaps}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            categoryScore >= 90
                              ? "border-green-300 bg-green-100 text-green-800"
                              : categoryScore >= 70
                                ? "border-amber-300 bg-amber-100 text-amber-800"
                                : "border-red-300 bg-red-100 text-red-800"
                          }
                        >
                          {categoryScore}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
          <CardDescription>
            Based on current health metrics and conformance data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recommendations.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No specific recommendations at this time.
              </p>
            ) : (
              recommendations.map((rec, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${
                    rec.severity === "high"
                      ? "border-red-200 bg-red-50"
                      : rec.severity === "medium"
                        ? "border-amber-200 bg-amber-50"
                        : "border-green-200 bg-green-50"
                  }`}
                >
                  {rec.severity === "high" ? (
                    <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
                  ) : rec.severity === "medium" ? (
                    <Activity className="mt-0.5 h-5 w-5 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{rec.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
