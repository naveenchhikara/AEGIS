import { StatusTimeline } from "./status-timeline";
import { ObservationActions } from "./observation-actions";
import { TaggingPanel } from "./tagging-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SEVERITY_COLORS, OBSERVATION_STATUS_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import {
  Eye,
  AlertTriangle,
  Shield,
  Clock,
  Calendar,
  ChevronLeft,
  CheckCircle2,
  FileText,
} from "@/lib/icons";

interface FindingDetailProps {
  observation: {
    id: string;
    title: string;
    condition: string;
    criteria: string;
    cause: string;
    effect: string;
    recommendation: string;
    severity: string;
    status: string;
    version: number;
    riskCategory?: string | null;
    dueDate?: Date | string | null;
    resolvedDuringFieldwork?: boolean;
    resolutionReason?: string | null;
    auditeeResponse?: string | null;
    actionPlan?: string | null;
    createdAt: Date | string;
    branch?: { id: string; name: string } | null;
    auditArea?: { id: string; name: string } | null;
    assignedTo?: { id: string; name: string } | null;
    createdBy?: { id: string; name: string } | null;
    timeline: Array<{
      id: string;
      event: string;
      oldValue: string | null;
      newValue: string | null;
      comment: string | null;
      createdBy: { name: string };
      createdAt: Date | string;
    }>;
  };
  session: {
    user: { id: string; [key: string]: unknown };
    session: { id: string; [key: string]: unknown };
  };
}

const POST_RESPONSE_STATUSES = new Set(["RESPONSE", "COMPLIANCE", "CLOSED"]);

export function FindingDetail({ observation, session }: FindingDetailProps) {
  const userRoles = ((session.user as any).roles as string[]) ?? [];
  const showResponseFields = POST_RESPONSE_STATUSES.has(observation.status);

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
            {observation.id}
          </p>
          <h1 className="text-2xl font-bold">{observation.title}</h1>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={
                SEVERITY_COLORS[
                  observation.severity.toLowerCase() as keyof typeof SEVERITY_COLORS
                ] ?? ""
              }
            >
              {observation.severity}
            </Badge>
            <Badge
              variant="outline"
              className={
                OBSERVATION_STATUS_COLORS[
                  observation.status as keyof typeof OBSERVATION_STATUS_COLORS
                ] ?? ""
              }
            >
              {observation.status}
            </Badge>
            {observation.resolvedDuringFieldwork && (
              <Badge
                variant="outline"
                className="border-amber-200 bg-amber-100 text-amber-800"
              >
                Resolved During Fieldwork
              </Badge>
            )}
          </div>

          <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
            {observation.assignedTo && (
              <span>
                Assigned: <strong>{observation.assignedTo.name}</strong>
              </span>
            )}
            {observation.createdBy && (
              <span>
                Created by: <strong>{observation.createdBy.name}</strong>
              </span>
            )}
            {observation.dueDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Due:{" "}
                {formatDate(
                  typeof observation.dueDate === "string"
                    ? observation.dueDate
                    : observation.dueDate.toISOString(),
                )}
              </span>
            )}
            <span>
              Created:{" "}
              {formatDate(
                typeof observation.createdAt === "string"
                  ? observation.createdAt
                  : observation.createdAt.toISOString(),
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <ObservationActions observation={observation} userRoles={userRoles} />

      {/* Resolution reason (shown when resolved during fieldwork) */}
      {observation.resolvedDuringFieldwork && observation.resolutionReason && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-amber-800">
              <CheckCircle2 className="h-4 w-4" />
              Fieldwork Resolution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base leading-relaxed">
              {observation.resolutionReason}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Condition — What was found */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="text-muted-foreground h-4 w-4" />
            Condition
            <span className="text-muted-foreground text-xs font-normal">
              What was found
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base leading-relaxed">{observation.condition}</p>
        </CardContent>
      </Card>

      {/* Criteria — What should be */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="text-muted-foreground h-4 w-4" />
            Criteria
            <span className="text-muted-foreground text-xs font-normal">
              What should be
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base leading-relaxed">{observation.criteria}</p>
        </CardContent>
      </Card>

      {/* Cause — Why it happened */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="text-muted-foreground h-4 w-4" />
            Cause
            <span className="text-muted-foreground text-xs font-normal">
              Why it happened
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base leading-relaxed">{observation.cause}</p>
        </CardContent>
      </Card>

      {/* Effect — Risk / Impact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="text-muted-foreground h-4 w-4" />
            Effect
            <span className="text-muted-foreground text-xs font-normal">
              Risk / Impact
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base leading-relaxed">{observation.effect}</p>
        </CardContent>
      </Card>

      {/* Recommendation — Suggested corrective action */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="text-muted-foreground h-4 w-4" />
            Recommendation
            <span className="text-muted-foreground text-xs font-normal">
              Suggested corrective action
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base leading-relaxed">
            {observation.recommendation}
          </p>
        </CardContent>
      </Card>

      {/* Auditee Response (only shown after RESPONSE state) */}
      {showResponseFields && observation.auditeeResponse && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="text-muted-foreground h-4 w-4" />
              Auditee Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base leading-relaxed">
              {observation.auditeeResponse}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action Plan (only shown after RESPONSE state) */}
      {showResponseFields && observation.actionPlan && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="text-muted-foreground h-4 w-4" />
              Action Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base leading-relaxed">
              {observation.actionPlan}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tags panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observation Details</CardTitle>
        </CardHeader>
        <CardContent>
          <TaggingPanel observation={observation} />
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="text-muted-foreground h-4 w-4" />
            Status Timeline
            <span className="text-muted-foreground text-xs font-normal">
              ({observation.timeline.length} events)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StatusTimeline entries={observation.timeline} />
        </CardContent>
      </Card>
    </div>
  );
}
