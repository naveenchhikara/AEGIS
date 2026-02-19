import { getAuditEffectivenessKpis } from "@/data-access/qa-assessment";
import type { AuthSession as Session } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Activity,
} from "@/lib/icons";

interface EffectivenessKpisProps {
  session: Session;
}

export async function EffectivenessKpis({ session }: EffectivenessKpisProps) {
  const kpis = await getAuditEffectivenessKpis(session);

  const kpiCards = [
    {
      name: "Audit Plan Coverage",
      value: `${kpis.auditCoverage}%`,
      description: "Planned audits vs audit universe",
      icon: Target,
      target: 80,
      actual: kpis.auditCoverage,
      unit: "%",
      reverse: false,
    },
    {
      name: "Plan Completion Rate",
      value: `${kpis.planCompletionRate}%`,
      description: "Completed vs planned audits",
      icon: CheckCircle2,
      target: 90,
      actual: kpis.planCompletionRate,
      unit: "%",
      reverse: false,
    },
    {
      name: "Finding Closure Rate",
      value: `${kpis.findingClosureRate}%`,
      description: "Closed vs total findings",
      icon: FileText,
      target: 85,
      actual: kpis.findingClosureRate,
      unit: "%",
      reverse: false,
    },
    {
      name: "Repeat Finding Rate",
      value: `${kpis.repeatFindingRate}%`,
      description: "Repeat vs total findings",
      icon: AlertCircle,
      target: 10,
      actual: kpis.repeatFindingRate,
      unit: "%",
      reverse: true, // Lower is better
    },
    {
      name: "Avg Days to Close",
      value: `${kpis.avgDaysToClose}`,
      description: "Average finding closure time",
      icon: Clock,
      target: 30,
      actual: kpis.avgDaysToClose,
      unit: "days",
      reverse: true, // Lower is better
    },
    {
      name: "High/Critical Ratio",
      value: `${kpis.highCriticalRatio}%`,
      description: "High/critical findings ratio",
      icon: AlertCircle,
      target: 20,
      actual: kpis.highCriticalRatio,
      unit: "%",
      reverse: true, // Lower is better
    },
    {
      name: "QA Conformance Rate",
      value: `${kpis.qaConformanceRate}%`,
      description: "IIA standards conformance",
      icon: CheckCircle2,
      target: 90,
      actual: kpis.qaConformanceRate,
      unit: "%",
      reverse: false,
    },
    {
      name: "Compliance Overdue Rate",
      value: `${kpis.overdueRate}%`,
      description: "Overdue compliance items",
      icon: Clock,
      target: 10,
      actual: kpis.overdueRate,
      unit: "%",
      reverse: true, // Lower is better
    },
    {
      name: "Staff Utilization",
      value: `${kpis.staffUtilization}`,
      description: "Audits per auditor",
      icon: Users,
      target: 4,
      actual: kpis.staffUtilization,
      unit: "audits",
      reverse: false,
    },
    {
      name: "First-Pass Rate",
      value: `${kpis.firstPassRate}%`,
      description: "Stakeholder satisfaction",
      icon: Activity,
      target: 75,
      actual: kpis.firstPassRate,
      unit: "%",
      reverse: false,
    },
  ];

  const getStatusColor = (kpi: (typeof kpiCards)[0]) => {
    const { actual, target, reverse } = kpi;

    let performance: number;
    if (reverse) {
      // For reverse metrics (lower is better)
      performance = (target / Math.max(actual, 0.1)) * 100;
    } else {
      // For normal metrics (higher is better)
      performance = (actual / Math.max(target, 0.1)) * 100;
    }

    if (performance >= 100) return "green";
    if (performance >= 70) return "yellow";
    return "red";
  };

  const getTrendIcon = (kpi: (typeof kpiCards)[0]) => {
    const color = getStatusColor(kpi);
    if (color === "green") return TrendingUp;
    if (color === "yellow") return Minus;
    return TrendingDown;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-lg font-semibold">
          Internal Audit Effectiveness KPIs
        </h2>
        <p className="text-muted-foreground text-sm">
          10 key performance indicators measuring internal audit function
          effectiveness
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon;
          const TrendIcon = getTrendIcon(kpi);
          const statusColor = getStatusColor(kpi);

          return (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-medium">
                      {kpi.name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {kpi.description}
                    </CardDescription>
                  </div>
                  <Icon className="text-muted-foreground h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-bold">{kpi.value}</div>
                    <TrendIcon
                      className={`h-5 w-5 ${
                        statusColor === "green"
                          ? "text-green-600"
                          : statusColor === "yellow"
                            ? "text-amber-600"
                            : "text-red-600"
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Target: {kpi.target}
                      {kpi.unit === "%" ? "%" : ` ${kpi.unit}`}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        statusColor === "green"
                          ? "border-green-300 bg-green-100 text-green-800"
                          : statusColor === "yellow"
                            ? "border-amber-300 bg-amber-100 text-amber-800"
                            : "border-red-300 bg-red-100 text-red-800"
                      }
                    >
                      {statusColor === "green"
                        ? "On Target"
                        : statusColor === "yellow"
                          ? "Needs Attention"
                          : "Below Target"}
                    </Badge>
                  </div>

                  {/* Progress bar */}
                  <div className="bg-secondary h-2 w-full rounded-full">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        statusColor === "green"
                          ? "bg-green-600"
                          : statusColor === "yellow"
                            ? "bg-amber-600"
                            : "bg-red-600"
                      }`}
                      style={{
                        width: `${Math.min(
                          kpi.reverse
                            ? Math.max(0, 100 - (kpi.actual / kpi.target) * 100)
                            : Math.min(100, (kpi.actual / kpi.target) * 100),
                          100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">KPI Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-green-700">On Target</p>
              <p className="text-2xl font-bold text-green-700">
                {kpiCards.filter((k) => getStatusColor(k) === "green").length}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-amber-700">
                Needs Attention
              </p>
              <p className="text-2xl font-bold text-amber-700">
                {kpiCards.filter((k) => getStatusColor(k) === "yellow").length}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-red-700">Below Target</p>
              <p className="text-2xl font-bold text-red-700">
                {kpiCards.filter((k) => getStatusColor(k) === "red").length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
