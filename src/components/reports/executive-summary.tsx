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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base md:text-lg">Executive Summary</CardTitle>
            <CardDescription className="text-xs md:text-sm">{data.reportPeriod} | {data.bankName}</CardDescription>
          </div>
          <Badge
            className={cn(
              "w-fit text-xs px-2 py-0.5 sm:text-sm sm:px-3 sm:py-1",
              RISK_LEVEL_STYLES[data.riskLevel],
            )}
          >
            <AlertTriangle className="mr-1 h-3.5 w-3.5" />
            {data.riskLevel.toUpperCase()} RISK
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 md:space-y-6">
        {/* Risk Factors */}
        {data.riskFactors.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-800 mb-1">
              Key Risk Areas
            </p>
            <ul className="list-disc list-inside text-xs text-amber-700 space-y-0.5 md:text-sm">
              {data.riskFactors.map((factor) => (
                <li key={factor}>{factor}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Metrics Grid — stacked on mobile, 3 cols on tablet+ */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
          {/* Compliance Score */}
          <div className="rounded-lg border p-3 md:p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 md:text-sm">
              <ShieldCheck className="h-4 w-4" />
              Compliance Score
            </div>
            <p
              className={cn(
                "text-2xl font-bold md:text-3xl",
                getScoreColor(data.complianceScore),
              )}
            >
              {data.complianceScore}%
            </p>
          </div>

          {/* Total Findings */}
          <div className="rounded-lg border p-3 md:p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 md:text-sm">
              <AlertTriangle className="h-4 w-4" />
              Total Findings
            </div>
            <p className="text-2xl font-bold md:text-3xl">{data.totalFindings}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {data.criticalFindings} critical, {data.highFindings} high
            </p>
          </div>

          {/* Open Findings */}
          <div className="rounded-lg border p-3 md:p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 md:text-sm">
              <TrendingUp className="h-4 w-4" />
              Open Findings
            </div>
            <p className="text-2xl font-bold md:text-3xl">{data.openFindings}</p>
            {data.overdueFindings > 0 && (
              <p className="text-xs text-red-600 font-medium mt-1">
                {data.overdueFindings} overdue
              </p>
            )}
          </div>
        </div>

        {/* Audit Status */}
        <div className="rounded-lg border p-3 md:p-4">
          <div className="flex flex-col gap-1 mb-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-medium md:text-sm">Audit Completion</span>
            <span className="text-xs text-muted-foreground md:text-sm">
              {data.completedAudits}/{data.totalAudits} audits completed (
              {data.auditCompletionRate}%)
            </span>
          </div>
          <Progress value={data.auditCompletionRate} />
        </div>

        {/* Financial Position */}
        <div className="rounded-lg border p-3 md:p-4">
          <div className="flex items-center gap-2 text-xs font-medium mb-3 md:text-sm">
            <Building2 className="h-4 w-4" />
            Financial Position
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground md:text-sm">CRAR</p>
              <p className="text-lg font-semibold md:text-xl">{data.crar}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground md:text-sm">Gross NPA</p>
              <p className="text-lg font-semibold md:text-xl">{data.npa}%</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
