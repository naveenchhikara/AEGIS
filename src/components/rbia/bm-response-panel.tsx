"use client";

import { useState, useTransition, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
  Paperclip,
  Send,
} from "@/lib/icons";
import { formatDate } from "@/lib/utils";
import { submitBmResponse } from "@/actions/rbia/findings";
import type {
  BmResponseBatchData,
  BmResponseActionPointData,
} from "@/data-access/rbia-bm-response";

// -- Props ------------------------------------------------------------------

interface BmResponsePanelProps {
  batch: BmResponseBatchData;
  actionPoints: BmResponseActionPointData[];
  engagementId: string;
  canRespond: boolean; // action_point:bm_respond permission
}

// -- Deadline Helpers -------------------------------------------------------

function getDeadlineInfo(deadline: Date) {
  const now = new Date();
  const daysRemaining = Math.ceil(
    (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysRemaining < 0)
    return {
      label: "OVERDUE",
      color: "text-red-600 bg-red-100",
      urgent: true,
    };
  if (daysRemaining <= 2)
    return {
      label: `${daysRemaining}d remaining`,
      color: "text-red-600 bg-red-50",
      urgent: true,
    };
  if (daysRemaining <= 5)
    return {
      label: `${daysRemaining}d remaining`,
      color: "text-yellow-700 bg-yellow-50",
      urgent: false,
    };
  return {
    label: `${daysRemaining}d remaining`,
    color: "text-green-700 bg-green-50",
    urgent: false,
  };
}

function getBatchStatusBadge(status: string) {
  switch (status) {
    case "PENDING":
      return (
        <Badge className="border-blue-200 bg-blue-50 text-blue-700">
          Pending
        </Badge>
      );
    case "SUBMITTED":
      return (
        <Badge className="border-green-200 bg-green-50 text-green-700">
          Submitted
        </Badge>
      );
    case "OVERDUE":
      return (
        <Badge className="border-red-200 bg-red-50 text-red-700">Overdue</Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getSeverityBadge(severity: string) {
  switch (severity) {
    case "CRITICAL":
      return (
        <Badge className="border-red-200 bg-red-50 text-red-700">
          Critical
        </Badge>
      );
    case "HIGH":
      return (
        <Badge className="border-orange-200 bg-orange-50 text-orange-700">
          High
        </Badge>
      );
    case "MEDIUM":
      return (
        <Badge className="border-yellow-200 bg-yellow-50 text-yellow-700">
          Medium
        </Badge>
      );
    case "LOW":
      return (
        <Badge className="border-green-200 bg-green-50 text-green-700">
          Low
        </Badge>
      );
    default:
      return <Badge variant="outline">{severity}</Badge>;
  }
}

// -- Component --------------------------------------------------------------

export function BmResponsePanel({
  batch,
  actionPoints,
  engagementId,
  canRespond,
}: BmResponsePanelProps) {
  // Track response text per AP
  const [responses, setResponses] = useState<Map<string, string>>(() => {
    const initial = new Map<string, string>();
    for (const ap of actionPoints) {
      if (ap.bmResponseText) {
        initial.set(ap.id, ap.bmResponseText);
      }
    }
    return initial;
  });

  // Track which APs have been responded to (start from server data, update optimistically)
  const [respondedIds, setRespondedIds] = useState<Set<string>>(() => {
    return new Set(
      actionPoints
        .filter((ap) => ap.status === "BM_RESPONDED" && ap.bmResponseText)
        .map((ap) => ap.id),
    );
  });

  // Track pending states per AP for loading indicators
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  // Derived counts
  const respondedCount = respondedIds.size;
  const totalCount = actionPoints.length;
  const remainingCount = totalCount - respondedCount;
  const progressPercent =
    totalCount > 0 ? Math.round((respondedCount / totalCount) * 100) : 0;

  // Deadline info
  const deadlineInfo = useMemo(
    () => getDeadlineInfo(batch.deadline),
    [batch.deadline],
  );

  // Handle response text change
  const handleResponseChange = useCallback((apId: string, text: string) => {
    setResponses((prev) => {
      const next = new Map(prev);
      next.set(apId, text);
      return next;
    });
  }, []);

  // Submit individual AP response
  const handleSubmitResponse = useCallback(
    (apId: string) => {
      const responseText = responses.get(apId)?.trim();
      if (!responseText || responseText.length < 10) {
        toast.error("Response must be at least 10 characters");
        return;
      }

      setPendingIds((prev) => new Set(prev).add(apId));

      startTransition(async () => {
        try {
          const result = await submitBmResponse({
            actionPointId: apId,
            responseText,
          });

          if (result.success) {
            // Optimistically mark as responded
            setRespondedIds((prev) => new Set(prev).add(apId));
            toast.success("Response saved successfully");
          } else {
            toast.error(result.error || "Failed to save response");
          }
        } catch {
          toast.error("An unexpected error occurred");
        } finally {
          setPendingIds((prev) => {
            const next = new Set(prev);
            next.delete(apId);
            return next;
          });
        }
      });
    },
    [responses],
  );

  return (
    <div className="relative space-y-4">
      {/* Sticky Progress Header */}
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 rounded-lg border p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold">BM Response Progress</h3>
            {getBatchStatusBadge(batch.status)}
          </div>

          <div className="flex items-center gap-3">
            {/* Deadline countdown */}
            <div
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${deadlineInfo.color}`}
            >
              {deadlineInfo.urgent ? (
                <AlertTriangle className="h-3.5 w-3.5" />
              ) : (
                <Clock className="h-3.5 w-3.5" />
              )}
              {deadlineInfo.label}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {respondedCount} / {totalCount} responded
            </span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Batch submit button */}
        {canRespond && (
          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              disabled={remainingCount > 0}
              className={
                remainingCount === 0
                  ? "bg-green-600 hover:bg-green-700"
                  : undefined
              }
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {remainingCount > 0
                ? `Submit All Responses (${remainingCount} remaining)`
                : "Submit All Responses"}
            </Button>
          </div>
        )}
      </div>

      {/* Stacked AP Cards */}
      <div className="space-y-3">
        {actionPoints.map((ap) => {
          const isResponded = respondedIds.has(ap.id);
          const isPending = pendingIds.has(ap.id);
          const responseText = responses.get(ap.id) ?? "";

          return (
            <Card
              key={ap.id}
              className={
                isResponded ? "border-green-200 bg-green-50/30" : undefined
              }
            >
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-semibold">
                      AP-{String(ap.serialNo).padStart(3, "0")}
                    </CardTitle>
                    <span className="text-foreground text-sm font-medium">
                      {ap.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {getSeverityBadge(ap.severity)}
                    <Badge variant="outline" className="text-xs">
                      {ap.moduleCode}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Description */}
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {ap.description}
                </p>

                {/* Response Section */}
                {isResponded ? (
                  // Already responded - show read-only response
                  <div className="rounded-md border border-green-200 bg-green-50/50 p-3">
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-medium text-green-700">
                        Responded
                        {ap.bmResponseDate
                          ? ` on ${formatDate(ap.bmResponseDate)}`
                          : ""}
                      </span>
                    </div>
                    <p className="text-sm">
                      {responses.get(ap.id) || ap.bmResponseText}
                    </p>
                  </div>
                ) : canRespond ? (
                  // Not responded + has permission - show textarea
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Enter your response to this action point (min 10 characters)..."
                      value={responseText}
                      onChange={(e) =>
                        handleResponseChange(ap.id, e.target.value)
                      }
                      disabled={isPending}
                      rows={3}
                      className="resize-y"
                    />

                    <div className="flex items-center justify-between gap-2">
                      {/* Evidence upload placeholder */}
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        disabled
                        title="Evidence upload will be available in a future update"
                      >
                        <Paperclip className="mr-1.5 h-3.5 w-3.5" />
                        Attach Evidence
                      </Button>

                      {/* Save response button */}
                      <Button
                        size="sm"
                        disabled={
                          isPending || !responseText || responseText.length < 10
                        }
                        onClick={() => handleSubmitResponse(ap.id)}
                      >
                        {isPending ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        {isPending ? "Saving..." : "Save Response"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Not responded + no permission - show muted text
                  <div className="text-muted-foreground rounded-md border border-dashed p-3 text-center text-sm">
                    Awaiting BM response
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty state */}
      {actionPoints.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              No action points have been issued for this engagement yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
