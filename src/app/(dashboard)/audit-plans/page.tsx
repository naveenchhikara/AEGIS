import { auditPlans } from "@/data";
import type { AuditData } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AUDIT_STATUS_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import {
  ClipboardList,
  CheckCircle2,
  Activity,
  Clock,
  Calendar,
  Users,
} from "@/lib/icons";

const data = auditPlans as unknown as AuditData;

const summaryCards = [
  {
    label: "Total Audits",
    count: data.summary.total,
    icon: ClipboardList,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    label: "Completed",
    count: data.summary.completed,
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    label: "In Progress",
    count: data.summary["in-progress"],
    icon: Activity,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    label: "Planned",
    count: data.summary.planned,
    icon: Clock,
    color: "text-slate-600",
    bg: "bg-slate-50",
  },
];

export default function AuditPlansPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Audit Planning
        </h1>
        <p className="text-sm text-muted-foreground">
          Annual audit plan and engagement tracking
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-4">
        {summaryCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`rounded-lg p-2 ${s.bg}`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold">{s.count}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Audit cards grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.auditPlans.map((audit) => (
          <Card key={audit.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm font-semibold">
                  {audit.name}
                </CardTitle>
                <Badge
                  variant="outline"
                  className={
                    AUDIT_STATUS_COLORS[
                      audit.status as keyof typeof AUDIT_STATUS_COLORS
                    ] ?? ""
                  }
                >
                  {audit.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(audit.plannedStartDate)} –{" "}
                  {formatDate(audit.plannedEndDate)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {audit.assignedTeam.length} members
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{audit.progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full transition-all ${
                      audit.progress === 100
                        ? "bg-emerald-500"
                        : audit.progress > 0
                          ? "bg-blue-500"
                          : "bg-slate-300"
                    }`}
                    style={{ width: `${audit.progress}%` }}
                  />
                </div>
              </div>

              <div className="flex gap-3 text-xs">
                <span className="text-muted-foreground">
                  {audit.findingsCount} findings
                </span>
                {audit.highFindings > 0 && (
                  <span className="text-orange-600">
                    {audit.highFindings} high
                  </span>
                )}
                {audit.criticalFindings > 0 && (
                  <span className="text-red-600">
                    {audit.criticalFindings} critical
                  </span>
                )}
              </div>

              <p className="line-clamp-2 text-xs text-muted-foreground">
                {audit.notes}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
