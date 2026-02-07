import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTopFindings } from "@/lib/report-utils";
import type { TopFinding } from "@/lib/report-utils";
import { SEVERITY_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { AlertTriangle, Clock } from "@/lib/icons";

function groupBySeverity(
  findings: TopFinding[],
): Record<string, TopFinding[]> {
  const groups: Record<string, TopFinding[]> = {};
  for (const f of findings) {
    if (!groups[f.severity]) {
      groups[f.severity] = [];
    }
    groups[f.severity].push(f);
  }
  return groups;
}

const SEVERITY_LABELS: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const SEVERITY_SECTION_STYLES: Record<string, string> = {
  critical: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-yellow-500",
  low: "border-l-green-500",
};

export function KeyFindingsSummary() {
  const findings = getTopFindings(10);
  const grouped = groupBySeverity(findings);

  // Severity display order
  const severityOrder = ["critical", "high", "medium", "low"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Key Findings for Board Attention
        </CardTitle>
        <CardDescription>
          Top {findings.length} findings sorted by severity
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {severityOrder.map((severity) => {
          const group = grouped[severity];
          if (!group || group.length === 0) return null;

          return (
            <div key={severity} className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {SEVERITY_LABELS[severity]} ({group.length})
              </h3>

              <div className="space-y-2">
                {group.map((finding) => (
                  <div
                    key={finding.id}
                    className={`flex gap-3 rounded-lg border border-l-4 p-3 ${SEVERITY_SECTION_STYLES[finding.severity] || ""}`}
                  >
                    {/* Severity Badge */}
                    <div className="shrink-0 pt-0.5">
                      <Badge
                        className={
                          SEVERITY_COLORS[
                            finding.severity as keyof typeof SEVERITY_COLORS
                          ] || ""
                        }
                      >
                        {finding.severity.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm leading-tight">
                          {finding.title}
                        </p>
                        {finding.isOverdue && (
                          <Badge className="shrink-0 bg-red-600 text-white border-red-600 text-[10px]">
                            OVERDUE
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {finding.observation}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{finding.assignedAuditor}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(finding.targetDate)}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {finding.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
