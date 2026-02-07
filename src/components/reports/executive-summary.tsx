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
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Building2,
} from "@/lib/icons";
import { getExecutiveSummary } from "@/lib/report-utils";
import { cn } from "@/lib/utils";

const RISK_LEVEL_STYLES = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-emerald-100 text-emerald-800 border-emerald-200",
} as const;

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

export function ExecutiveSummary() {
  const data = getExecutiveSummary();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Executive Summary</CardTitle>
            <CardDescription>{data.reportPeriod} | {data.bankName}</CardDescription>
          </div>
          <Badge
            className={cn(
              "text-sm px-3 py-1",
              RISK_LEVEL_STYLES[data.riskLevel],
            )}
          >
            <AlertTriangle className="mr-1 h-3.5 w-3.5" />
            {data.riskLevel.toUpperCase()} RISK
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Risk Factors */}
        {data.riskFactors.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-800 mb-1">
              Key Risk Areas
            </p>
            <ul className="list-disc list-inside text-sm text-amber-700 space-y-0.5">
              {data.riskFactors.map((factor) => (
                <li key={factor}>{factor}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Compliance Score */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <ShieldCheck className="h-4 w-4" />
              Compliance Score
            </div>
            <p
              className={cn(
                "text-3xl font-bold",
                getScoreColor(data.complianceScore),
              )}
            >
              {data.complianceScore}%
            </p>
          </div>

          {/* Total Findings */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertTriangle className="h-4 w-4" />
              Total Findings
            </div>
            <p className="text-3xl font-bold">{data.totalFindings}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {data.criticalFindings} critical, {data.highFindings} high
            </p>
          </div>

          {/* Open Findings */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              Open Findings
            </div>
            <p className="text-3xl font-bold">{data.openFindings}</p>
            {data.overdueFindings > 0 && (
              <p className="text-xs text-red-600 font-medium mt-1">
                {data.overdueFindings} overdue
              </p>
            )}
          </div>
        </div>

        {/* Audit Status */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Audit Completion</span>
            <span className="text-sm text-muted-foreground">
              {data.completedAudits}/{data.totalAudits} audits completed (
              {data.auditCompletionRate}%)
            </span>
          </div>
          <Progress value={data.auditCompletionRate} />
        </div>

        {/* Financial Position */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm font-medium mb-3">
            <Building2 className="h-4 w-4" />
            Financial Position
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">CRAR</p>
              <p className="text-xl font-semibold">{data.crar}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gross NPA</p>
              <p className="text-xl font-semibold">{data.npa}%</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
