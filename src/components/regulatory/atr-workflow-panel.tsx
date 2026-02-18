"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle, Clock, AlertCircle, ArrowRight } from "@/lib/icons";
import { toast } from "sonner";
import { submitAtr } from "@/actions/regulatory/submit-atr";
import { format } from "date-fns";

interface RegulatoryObservation {
  id: string;
  source: string;
  referenceNo: string;
  paraNo: string | null;
  description: string;
  severity: string;
  atrStatus: string;
  atrText: string | null;
  submittedAt: Date | null;
  acceptedAt: Date | null;
  createdAt: Date;
}

interface AtrWorkflowPanelProps {
  observations: RegulatoryObservation[];
  canManage: boolean;
  canSubmitAtr: boolean;
}

const SOURCE_LABELS: Record<string, string> = {
  RBI_INSPECTION: "RBI",
  NABARD: "NABARD",
  STATUTORY_AUDITOR: "Statutory",
  EXTERNAL: "External",
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 border-red-300",
  HIGH: "bg-orange-100 text-orange-800 border-orange-300",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
  LOW: "bg-green-100 text-green-800 border-green-300",
};

type WorkflowAction = "SUBMIT" | "MARK_ACCEPTED" | "REQUEST_INFO";

export function AtrWorkflowPanel({ observations, canManage, canSubmitAtr }: AtrWorkflowPanelProps) {
  const router = useRouter();
  const [selectedObservation, setSelectedObservation] = React.useState<RegulatoryObservation | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [workflowAction, setWorkflowAction] = React.useState<WorkflowAction>("SUBMIT");
  const [atrText, setAtrText] = React.useState("");
  const [remarks, setRemarks] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  function handleWorkflowAction(observation: RegulatoryObservation, action: WorkflowAction) {
    setSelectedObservation(observation);
    setWorkflowAction(action);
    setAtrText(observation.atrText || "");
    setRemarks("");
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedObservation) return;

    if (!atrText || atrText.length < 50) {
      toast.error("ATR text must be at least 50 characters");
      return;
    }

    setIsSubmitting(true);

    const result = await submitAtr({
      observationId: selectedObservation.id,
      atrText,
      action: workflowAction,
      remarks,
    });

    setIsSubmitting(false);

    if (result.success) {
      const actionMessages: Record<WorkflowAction, string> = {
        SUBMIT: "ATR submitted successfully",
        MARK_ACCEPTED: "ATR accepted successfully",
        REQUEST_INFO: "Further information requested",
      };
      toast.success(actionMessages[workflowAction]);
      setDialogOpen(false);
      setSelectedObservation(null);
      setAtrText("");
      setRemarks("");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  function getWorkflowStage(status: string): number {
    const stages: Record<string, number> = {
      DRAFT: 0,
      SUBMITTED: 1,
      ACCEPTED: 2,
      FURTHER_INFO: 1, // Back to submitted stage for resubmission
      CLOSED: 3,
    };
    return stages[status] ?? 0;
  }

  if (observations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Pending ATRs</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            All regulatory observations have been processed. New observations will appear here when they require ATR action.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {observations.length} observation{observations.length !== 1 ? "s" : ""} require ATR action
      </div>

      <div className="grid gap-4">
        {observations.map((obs) => (
          <Card key={obs.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {SOURCE_LABELS[obs.source] || obs.source}
                    </Badge>
                    <Badge variant="outline" className={SEVERITY_COLORS[obs.severity] ?? ""}>
                      {obs.severity}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">
                    {obs.referenceNo}
                    {obs.paraNo && <span className="text-muted-foreground"> - Para {obs.paraNo}</span>}
                  </CardTitle>
                </div>
              </div>
              <CardDescription>{obs.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Workflow Stepper */}
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-2 ${getWorkflowStage(obs.atrStatus) >= 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>
                  {getWorkflowStage(obs.atrStatus) >= 1 ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <Clock className="h-5 w-5" />
                  )}
                  <span className="text-sm font-medium">Draft</span>
                </div>

                <ArrowRight className="h-4 w-4 text-muted-foreground" />

                <div className={`flex items-center gap-2 ${getWorkflowStage(obs.atrStatus) >= 1 ? 'text-blue-600' : 'text-muted-foreground'}`}>
                  {getWorkflowStage(obs.atrStatus) >= 2 ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : obs.atrStatus === "SUBMITTED" || obs.atrStatus === "FURTHER_INFO" ? (
                    <Clock className="h-5 w-5" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-current" />
                  )}
                  <span className="text-sm font-medium">Submitted</span>
                </div>

                <ArrowRight className="h-4 w-4 text-muted-foreground" />

                <div className={`flex items-center gap-2 ${getWorkflowStage(obs.atrStatus) >= 2 ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {getWorkflowStage(obs.atrStatus) >= 2 ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-current" />
                  )}
                  <span className="text-sm font-medium">Accepted</span>
                </div>

                {obs.atrStatus === "FURTHER_INFO" && (
                  <>
                    <div className="flex items-center gap-2 ml-4 text-orange-600">
                      <AlertCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">Further Info Required</span>
                    </div>
                  </>
                )}
              </div>

              {/* ATR Text Preview */}
              {obs.atrText && (
                <div className="border rounded-md p-3 bg-muted/50">
                  <Label className="text-xs text-muted-foreground mb-1 block">Current ATR Text</Label>
                  <p className="text-sm line-clamp-3">{obs.atrText}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="flex gap-4 text-xs text-muted-foreground">
                <div>
                  Created: {format(new Date(obs.createdAt), "MMM d, yyyy")}
                </div>
                {obs.submittedAt && (
                  <div>
                    Submitted: {format(new Date(obs.submittedAt), "MMM d, yyyy")}
                  </div>
                )}
                {obs.acceptedAt && (
                  <div>
                    Accepted: {format(new Date(obs.acceptedAt), "MMM d, yyyy")}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {obs.atrStatus === "DRAFT" && canManage && (
                  <Button
                    onClick={() => handleWorkflowAction(obs, "SUBMIT")}
                    size="sm"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Submit ATR
                  </Button>
                )}

                {obs.atrStatus === "FURTHER_INFO" && canManage && (
                  <Button
                    onClick={() => handleWorkflowAction(obs, "SUBMIT")}
                    size="sm"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Resubmit ATR
                  </Button>
                )}

                {obs.atrStatus === "SUBMITTED" && canSubmitAtr && (
                  <>
                    <Button
                      onClick={() => handleWorkflowAction(obs, "MARK_ACCEPTED")}
                      size="sm"
                      variant="default"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Accept ATR
                    </Button>
                    <Button
                      onClick={() => handleWorkflowAction(obs, "REQUEST_INFO")}
                      size="sm"
                      variant="outline"
                    >
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Request Further Info
                    </Button>
                  </>
                )}

                {obs.atrStatus === "ACCEPTED" && (
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Accepted
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Workflow Action Dialog */}
      {selectedObservation && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {workflowAction === "SUBMIT" && "Submit ATR"}
                {workflowAction === "MARK_ACCEPTED" && "Accept ATR"}
                {workflowAction === "REQUEST_INFO" && "Request Further Information"}
              </DialogTitle>
              <DialogDescription>
                {selectedObservation.referenceNo}
                {selectedObservation.paraNo && ` - Para ${selectedObservation.paraNo}`}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="atrText">
                  Action Taken Report (ATR) *
                  {workflowAction === "MARK_ACCEPTED" && " - Review"}
                </Label>
                <Textarea
                  id="atrText"
                  value={atrText}
                  onChange={(e) => setAtrText(e.target.value)}
                  placeholder={
                    workflowAction === "SUBMIT"
                      ? "Describe the actions taken to address this observation (minimum 50 characters)..."
                      : "Review the ATR text..."
                  }
                  rows={8}
                  required
                  disabled={workflowAction === "MARK_ACCEPTED"}
                  className={workflowAction === "MARK_ACCEPTED" ? "bg-muted" : ""}
                />
                <div className="text-xs text-muted-foreground">
                  {atrText.length} characters (minimum 50 required)
                </div>
              </div>

              {(workflowAction === "MARK_ACCEPTED" || workflowAction === "REQUEST_INFO") && (
                <div className="space-y-2">
                  <Label htmlFor="remarks">
                    {workflowAction === "MARK_ACCEPTED" ? "Approval Remarks (Optional)" : "Remarks *"}
                  </Label>
                  <Textarea
                    id="remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder={
                      workflowAction === "REQUEST_INFO"
                        ? "Specify what additional information is needed..."
                        : "Add any approval comments..."
                    }
                    rows={3}
                    required={workflowAction === "REQUEST_INFO"}
                  />
                </div>
              )}

              <div className="rounded-md border p-3 bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  <strong>Observation:</strong> {selectedObservation.description}
                </p>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {workflowAction === "SUBMIT" && "Submit ATR"}
                  {workflowAction === "MARK_ACCEPTED" && "Accept ATR"}
                  {workflowAction === "REQUEST_INFO" && "Request Info"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
