"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Shield,
  TrendingUp,
  FileWarning,
  Clock,
  ShieldAlert,
} from "@/lib/icons";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { format } from "date-fns";

interface Issue {
  id: string;
  title: string;
  description: string;
  source: string;
  issueType: string;
  severity: string;
  status: string;
  riskTheme?: string | null;
  rootCause?: string | null;
  createdAt: Date;
  observation?: {
    id: string;
    title: string;
    severity: string;
    branch: {
      code: string;
      name: string;
    } | null;
  } | null;
  control?: {
    id: string;
    controlCode: string;
    processArea: string;
    description: string;
  } | null;
  actionPlans: Array<{
    id: string;
    title: string;
    status: string;
    dueDate: Date;
    completionPct: number;
  }>;
}

interface BoardViewProps {
  bySource: {
    INTERNAL_AUDIT: Issue[];
    REGULATORY: Issue[];
    EXTERNAL_AUDIT: Issue[];
    SELF_ASSESSMENT: Issue[];
    CONCURRENT: Issue[];
  };
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byRiskTheme: {
    CREDIT: number;
    OPERATIONAL: number;
    COMPLIANCE: number;
    IT: number;
    GOVERNANCE: number;
  };
  allActiveIssues: Issue[];
  overdueActionPlans: number;
  qaGaps: number;
  kriBreaches: number;
}

// Colors imported from central constants
import {
  SEVERITY_BADGE_COLORS as SEVERITY_COLORS,
  ISSUE_SOURCE_COLORS as SOURCE_COLORS,
  ISSUE_STATUS_COLORS as STATUS_COLORS,
} from "@/lib/constants";

export function BoardView({
  bySource,
  bySeverity,
  byRiskTheme,
  allActiveIssues,
  overdueActionPlans,
  qaGaps,
  kriBreaches,
}: BoardViewProps) {
  const router = useRouter();
  const [groupBy, setGroupBy] = React.useState<
    "source" | "severity" | "riskTheme"
  >("source");
  const [filterSource, setFilterSource] = React.useState<string>("all");
  const [filterSeverity, setFilterSeverity] = React.useState<string>("all");

  const totalIssues = allActiveIssues.length;
  const criticalHighCount = bySeverity.critical + bySeverity.high;

  // Filter issues based on selected filters
  const filteredIssues = allActiveIssues.filter((issue) => {
    if (filterSource !== "all" && issue.source !== filterSource) return false;
    if (filterSeverity !== "all" && issue.severity !== filterSeverity)
      return false;
    return true;
  });

  // Group filtered issues based on groupBy selection
  const groupedIssues = React.useMemo(() => {
    if (groupBy === "source") {
      return Object.entries(bySource).map(([source, issues]) => ({
        key: source,
        label: source.replace(/_/g, " "),
        issues: issues.filter((issue) => {
          if (filterSeverity !== "all" && issue.severity !== filterSeverity)
            return false;
          return true;
        }),
      }));
    } else if (groupBy === "severity") {
      return ["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((severity) => ({
        key: severity,
        label: severity,
        issues: allActiveIssues.filter((issue) => {
          if (issue.severity !== severity) return false;
          if (filterSource !== "all" && issue.source !== filterSource)
            return false;
          return true;
        }),
      }));
    } else {
      // groupBy === "riskTheme"
      return ["CREDIT", "OPERATIONAL", "COMPLIANCE", "IT", "GOVERNANCE"].map(
        (theme) => ({
          key: theme,
          label: theme,
          issues: allActiveIssues.filter((issue) => {
            if (issue.riskTheme !== theme) return false;
            if (filterSource !== "all" && issue.source !== filterSource)
              return false;
            if (filterSeverity !== "all" && issue.severity !== filterSeverity)
              return false;
            return true;
          }),
        }),
      );
    }
  }, [groupBy, filterSource, filterSeverity, allActiveIssues, bySource]);

  return (
    <div className="space-y-6">
      {/* Board Consolidated Stats (R63) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          className={
            totalIssues > 0
              ? "border-red-200 bg-red-50/40"
              : "border-green-200 bg-green-50/40"
          }
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
            <AlertTriangle
              className={`h-4 w-4 ${totalIssues > 0 ? "text-red-500" : "text-green-500"}`}
            />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${totalIssues > 0 ? "text-red-700" : "text-green-700"}`}
            >
              {totalIssues}
            </div>
            <p className="text-muted-foreground text-xs">
              {bySeverity.critical} Critical, {bySeverity.high} High
            </p>
          </CardContent>
        </Card>

        <Card
          className={
            overdueActionPlans > 0
              ? "border-red-200 bg-red-50/40"
              : "border-green-200 bg-green-50/40"
          }
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Overdue Actions
            </CardTitle>
            <Clock
              className={`h-4 w-4 ${overdueActionPlans > 0 ? "text-red-500" : "text-green-500"}`}
            />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${overdueActionPlans > 0 ? "text-red-700" : "text-green-700"}`}
            >
              {overdueActionPlans}
            </div>
            <p className="text-muted-foreground text-xs">
              Action plans past due date
            </p>
          </CardContent>
        </Card>

        <Card
          className={
            qaGaps > 0
              ? "border-red-200 bg-red-50/40"
              : "border-green-200 bg-green-50/40"
          }
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">QA Gaps</CardTitle>
            <ShieldAlert
              className={`h-4 w-4 ${qaGaps > 0 ? "text-red-500" : "text-green-500"}`}
            />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${qaGaps > 0 ? "text-red-700" : "text-green-700"}`}
            >
              {qaGaps}
            </div>
            <p className="text-muted-foreground text-xs">
              QA self-assessment gaps identified
            </p>
          </CardContent>
        </Card>

        <Card
          className={
            kriBreaches > 0
              ? "border-red-200 bg-red-50/40"
              : "border-green-200 bg-green-50/40"
          }
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KRI Breaches</CardTitle>
            <TrendingUp
              className={`h-4 w-4 ${kriBreaches > 0 ? "text-red-500" : "text-green-500"}`}
            />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${kriBreaches > 0 ? "text-red-700" : "text-green-700"}`}
            >
              {kriBreaches}
            </div>
            <p className="text-muted-foreground text-xs">
              Key risk indicators in warning/breach
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Critical / High Severity
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {criticalHighCount}
            </div>
            <p className="text-muted-foreground text-xs">
              {bySeverity.critical} Critical, {bySeverity.high} High
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Regulatory</CardTitle>
            <Shield className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bySource.REGULATORY.length}
            </div>
            <p className="text-muted-foreground text-xs">
              Regulatory inspection issues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Top Risk Theme
            </CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                Object.entries(byRiskTheme).sort(
                  ([, a], [, b]) => (b as number) - (a as number),
                )[0][0]
              }
            </div>
            <p className="text-muted-foreground text-xs">
              {
                Object.entries(byRiskTheme).sort(
                  ([, a], [, b]) => (b as number) - (a as number),
                )[0][1]
              }{" "}
              issues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medium / Low</CardTitle>
            <FileWarning className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bySeverity.medium + bySeverity.low}
            </div>
            <p className="text-muted-foreground text-xs">
              {bySeverity.medium} Medium, {bySeverity.low} Low
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Source Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Issues by Source</CardTitle>
          <CardDescription>
            Breakdown of open issues by audit source
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Object.entries(bySource).map(([source, issues]) => (
              <div key={source} className="rounded-lg border p-4">
                <div className="space-y-2">
                  <Badge
                    variant="outline"
                    className={SOURCE_COLORS[source] ?? ""}
                  >
                    {source.replace(/_/g, " ")}
                  </Badge>
                  <div className="text-2xl font-bold">{issues.length}</div>
                  <div className="text-muted-foreground text-xs">
                    {
                      issues.filter(
                        (i) =>
                          i.severity === "CRITICAL" || i.severity === "HIGH",
                      ).length
                    }{" "}
                    critical/high
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Drill-Down Table */}
      <Card>
        <CardHeader>
          <CardTitle>Issue Drill-Down</CardTitle>
          <CardDescription>
            Detailed view of all open issues with grouping and filtering
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-2">
              <Label htmlFor="groupBy">Group By</Label>
              <Select
                value={groupBy}
                onValueChange={(value: any) => setGroupBy(value)}
              >
                <SelectTrigger id="groupBy" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="source">Source</SelectItem>
                  <SelectItem value="severity">Severity</SelectItem>
                  <SelectItem value="riskTheme">Risk Theme</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filterSource">Filter Source</Label>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger id="filterSource" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="INTERNAL_AUDIT">Internal Audit</SelectItem>
                  <SelectItem value="REGULATORY">Regulatory</SelectItem>
                  <SelectItem value="EXTERNAL_AUDIT">External Audit</SelectItem>
                  <SelectItem value="SELF_ASSESSMENT">
                    Self Assessment
                  </SelectItem>
                  <SelectItem value="CONCURRENT">Concurrent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filterSeverity">Filter Severity</Label>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger id="filterSeverity" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grouped Tables */}
          <div className="space-y-6">
            {groupedIssues.map((group) => (
              <div key={group.key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold">{group.label}</h4>
                  <Badge variant="secondary">
                    {group.issues.length} issues
                  </Badge>
                </div>
                {group.issues.length === 0 ? (
                  <div className="text-muted-foreground rounded-md border p-4 text-center text-sm">
                    No issues in this group
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Risk Theme</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Action Plans</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.issues.map((issue) => (
                          <TableRow
                            key={issue.id}
                            className="hover:bg-muted/50 cursor-pointer"
                            onClick={() => router.push(`/issues/${issue.id}`)}
                          >
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{issue.title}</div>
                                <div className="text-muted-foreground text-xs">
                                  {format(
                                    new Date(issue.createdAt),
                                    "MMM d, yyyy",
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={SOURCE_COLORS[issue.source] ?? ""}
                              >
                                {issue.source.replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <SeverityBadge severity={issue.severity} />
                            </TableCell>
                            <TableCell>
                              {issue.riskTheme ? (
                                <Badge variant="outline">
                                  {issue.riskTheme}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  N/A
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={STATUS_COLORS[issue.status] ?? ""}
                              >
                                {issue.status.replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {issue.actionPlans.length > 0 ? (
                                <Badge variant="secondary">
                                  {issue.actionPlans.length} plan(s)
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  None
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
