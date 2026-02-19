import { getRequiredSession } from "@/data-access/session";
import { getAcbDashboardData } from "@/data-access/governance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  FileText,
} from "@/lib/icons";
import Link from "next/link";

interface AcbWorkspaceProps {
  canManageAgenda: boolean;
}

export async function AcbWorkspace({ canManageAgenda }: AcbWorkspaceProps) {
  const session = await getRequiredSession();
  const dashboardData = await getAcbDashboardData(session);

  const totalCompliance = dashboardData.complianceStats.reduce(
    (acc, stat) => acc + stat._count,
    0,
  );

  const closedCompliance =
    dashboardData.complianceStats.find(
      (stat) => stat.status === "CLOSED" || stat.status === "ZAC_APPROVED",
    )?._count ?? 0;

  const compliancePercentage =
    totalCompliance > 0
      ? Math.round((closedCompliance / totalCompliance) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">ACB Workspace</h2>
          <p className="text-muted-foreground">
            Consolidated dashboard for Audit Committee of the Board
          </p>
        </div>
        {canManageAgenda && (
          <Button asChild>
            <Link href="#agenda-builder">
              <FileText className="mr-2 h-4 w-4" />
              Generate Quarterly Pack
            </Link>
          </Button>
        )}
      </div>

      {/* Executive Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Critical Findings
            </CardTitle>
            <AlertTriangle className="text-destructive h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.criticalObs}
            </div>
            <p className="text-muted-foreground text-xs">
              High & Critical observations open
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Items</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.overdueItems}
            </div>
            <p className="text-muted-foreground text-xs">
              Past due compliance items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Audits Completed
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.recentAudits}
            </div>
            <p className="text-muted-foreground text-xs">
              Total completed audits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Alerts</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.riskMetrics.length}
            </div>
            <p className="text-muted-foreground text-xs">
              High-aging housekeeping items
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Status Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Overall Compliance</span>
              <span className="text-muted-foreground">
                {closedCompliance} / {totalCompliance} items closed
              </span>
            </div>
            <Progress value={compliancePercentage} className="h-2" />
            <p className="text-muted-foreground text-xs">
              {compliancePercentage}% compliance achieved
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            {dashboardData.complianceStats.map((stat) => (
              <div
                key={stat.status}
                className="flex items-center justify-between"
              >
                <span className="text-sm">{stat.status.replace("_", " ")}</span>
                <Badge variant="outline">{stat._count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Alerts */}
      {dashboardData.riskMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>High-Risk Housekeeping Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.riskMetrics.map((metric) => (
                <div
                  key={metric.id}
                  className="flex items-center justify-between border-l-4 border-orange-500 py-2 pl-4"
                >
                  <div>
                    <p className="text-sm font-medium">{metric.metricType}</p>
                    <p className="text-muted-foreground text-xs">
                      {metric.branch.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      ₹{metric.closingBalance.toLocaleString()}
                    </p>
                    <Badge
                      variant="outline"
                      className="bg-orange-100 text-orange-800"
                    >
                      {metric.agingDays} days
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/compliance">View Full Compliance Report</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/findings">View All Observations</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/risk-register">View Risk Register</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
