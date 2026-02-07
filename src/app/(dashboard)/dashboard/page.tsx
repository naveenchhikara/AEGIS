import {
  demoComplianceRequirements,
  findings,
  auditPlans,
} from "@/data";
import type {
  ComplianceData,
  FindingsData,
  AuditData,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEVERITY_COLORS } from "@/lib/constants";
import {
  ShieldCheck,
  AlertTriangle,
  ClipboardList,
  XCircle,
  Activity,
  TrendingUp,
} from "@/lib/icons";

const compData = demoComplianceRequirements as unknown as ComplianceData;
const findData = findings as unknown as FindingsData;
const auditData = auditPlans as unknown as AuditData;

const complianceScore = Math.round(
  (compData.summary.compliant / compData.summary.total) * 100,
);
const openFindings = findData.findings.filter(
  (f) => f.status !== "closed",
).length;
const auditsInProgress = auditData.auditPlans.filter(
  (a) => a.status === "in-progress",
).length;
const nonCompliantCount =
  compData.summary["non-compliant"] + (compData.summary.pending ?? 0);

const metrics = [
  {
    title: "Compliance Score",
    value: `${complianceScore}%`,
    subtitle: `${compData.summary.compliant} of ${compData.summary.total} compliant`,
    icon: ShieldCheck,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    title: "Open Findings",
    value: openFindings,
    subtitle: `${findData.summary.bySeverity.critical ?? 0} critical, ${findData.summary.bySeverity.high ?? 0} high`,
    icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    title: "Audits In Progress",
    value: auditsInProgress,
    subtitle: `${auditData.summary.total} total planned`,
    icon: ClipboardList,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    title: "Non-Compliant Items",
    value: nonCompliantCount,
    subtitle: `${compData.summary.partial} partially compliant`,
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-50",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Audit & compliance overview for Apex Sahakari Bank Ltd
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.title}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{m.title}</p>
                  <p className="text-2xl font-bold">{m.value}</p>
                  <p className="text-xs text-muted-foreground">{m.subtitle}</p>
                </div>
                <div className={`rounded-lg p-2.5 ${m.bg}`}>
                  <m.icon className={`h-5 w-5 ${m.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent findings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Recent Findings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {findData.findings.slice(0, 5).map((f) => (
                <div
                  key={f.id}
                  className="flex items-start justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{f.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.category} &middot; {f.assignedAuditor}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Badge
                      variant="outline"
                      className={
                        SEVERITY_COLORS[
                          f.severity as keyof typeof SEVERITY_COLORS
                        ] ?? ""
                      }
                    >
                      {f.severity}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {f.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Compliance distribution placeholder */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Compliance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(
                [
                  ["Compliant", compData.summary.compliant, "bg-emerald-500"],
                  ["Partial", compData.summary.partial, "bg-amber-500"],
                  [
                    "Non-Compliant",
                    compData.summary["non-compliant"],
                    "bg-red-500",
                  ],
                  ["Pending", compData.summary.pending, "bg-slate-400"],
                ] as const
              ).map(([label, count, color]) => (
                <div key={label} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span>{label}</span>
                    <span className="font-medium">
                      {count} of {compData.summary.total}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{
                        width: `${(count / compData.summary.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              Charts & analytics coming in Phase 2
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
