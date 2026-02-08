import type { Finding } from "@/types";
import { StatusTimeline } from "./status-timeline";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SEVERITY_COLORS, FINDING_STATUS_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import {
  FileText,
  AlertTriangle,
  Shield,
  Clock,
  Eye,
  Calendar,
  ChevronLeft,
  CheckCircle2,
} from "@/lib/icons";

interface FindingDetailProps {
  finding: Finding;
}

export function FindingDetail({ finding }: FindingDetailProps) {
  const isPendingResponse =
    finding.auditeeResponse === "Awaiting management response";
  const isPendingActionPlan =
    finding.actionPlan === "Pending management response";

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="space-y-4">
        <a
          href="/findings"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Findings
        </a>

        <div className="space-y-2">
          <p className="text-muted-foreground font-mono text-sm">
            {finding.id}
          </p>
          <h1 className="text-2xl font-bold">{finding.title}</h1>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={
                SEVERITY_COLORS[
                  finding.severity as keyof typeof SEVERITY_COLORS
                ] ?? ""
              }
            >
              {finding.severity}
            </Badge>
            <Badge
              variant="outline"
              className={
                FINDING_STATUS_COLORS[
                  finding.status as keyof typeof FINDING_STATUS_COLORS
                ] ?? ""
              }
            >
              {finding.status}
            </Badge>
            <span className="text-muted-foreground text-sm">
              {finding.category}
            </span>
          </div>

          <div className="text-muted-foreground flex flex-wrap gap-4 text-base">
            <span>
              Assigned: <strong>{finding.assignedAuditor}</strong>
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Target: {formatDate(finding.targetDate)}
            </span>
            <span>Created: {formatDate(finding.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Observation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="text-muted-foreground h-4 w-4" />
            Observation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base leading-relaxed">{finding.observation}</p>
        </CardContent>
      </Card>

      {/* Root Cause Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="text-muted-foreground h-4 w-4" />
            Root Cause Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base leading-relaxed">{finding.rootCause}</p>
        </CardContent>
      </Card>

      {/* Risk Impact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="text-muted-foreground h-4 w-4" />
            Risk Impact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base leading-relaxed">{finding.riskImpact}</p>
        </CardContent>
      </Card>

      {/* Auditee Response */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="text-muted-foreground h-4 w-4" />
            Auditee Response
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isPendingResponse ? (
            <p className="text-muted-foreground text-sm italic">
              {finding.auditeeResponse}
            </p>
          ) : (
            <p className="text-base leading-relaxed">
              {finding.auditeeResponse}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Action Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="text-muted-foreground h-4 w-4" />
            Action Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isPendingActionPlan ? (
            <p className="text-muted-foreground text-sm italic">
              {finding.actionPlan}
            </p>
          ) : (
            <p className="text-base leading-relaxed">{finding.actionPlan}</p>
          )}
        </CardContent>
      </Card>

      {/* Related Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Related Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground mb-1 text-sm">
                Related RBI Circular
              </p>
              <p className="text-primary font-mono text-base">
                {finding.relatedCircular}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1 text-sm">
                Related Requirement
              </p>
              <p className="font-mono text-base">
                {finding.relatedRequirement}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="text-muted-foreground h-4 w-4" />
            Status Timeline
            <span className="text-muted-foreground text-xs font-normal">
              ({finding.timeline.length} events)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StatusTimeline events={finding.timeline} />
        </CardContent>
      </Card>
    </div>
  );
}
