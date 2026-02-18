"use client";

import * as React from "react";
import { submitExaminationResponse } from "@/actions/audit-execution/submit-examination-response";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertTriangle, FileText } from "@/lib/icons";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { EvidenceUploadPanel } from "./evidence-upload-panel";
import { ExaminationEvidenceList } from "./examination-evidence-list";

type ExaminationStatus =
  | "COMPLIANT"
  | "NON_COMPLIANT"
  | "PARTIAL"
  | "NOT_APPLICABLE";
type RiskRating = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

interface ExaminationFormProps {
  engagementId: string;
  areaCode: string;
  items: Array<{
    id: string;
    itemNumber: string;
    particulars: string;
    riskCategory: string | null;
    regulatoryRef: string | null;
    displayOrder: number;
    responses: Array<{
      id: string;
      status: string;
      observation: string | null;
      riskRating: string | null;
      respondedById: string | null;
      respondedAt: Date | null;
      observationId: string | null;
      evidence?: Array<{
        id: string;
        filename: string;
        fileSize: number;
        contentType: string;
        description: string | null;
        createdAt: Date;
        uploadedBy: { id: string; name: string };
      }>;
    }>;
  }>;
  canRespond: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  COMPLIANT: "bg-green-100 text-green-800 border-green-300",
  NON_COMPLIANT: "bg-red-100 text-red-800 border-red-300",
  PARTIAL: "bg-amber-100 text-amber-800 border-amber-300",
  NOT_APPLICABLE: "bg-gray-100 text-gray-800 border-gray-300",
};

interface ExaminationItemFormProps {
  item: ExaminationFormProps["items"][0];
  engagementId: string;
  canRespond: boolean;
  onSubmitSuccess: () => void;
}

function ExaminationItemForm({
  item,
  engagementId,
  canRespond,
  onSubmitSuccess,
}: ExaminationItemFormProps) {
  const existingResponse = item.responses[0];
  const [status, setStatus] = React.useState<ExaminationStatus | "">(
    (existingResponse?.status as ExaminationStatus) || "",
  );
  const [observation, setObservation] = React.useState<string>(
    existingResponse?.observation || "",
  );
  const [riskRating, setRiskRating] = React.useState<RiskRating | "">(
    (existingResponse?.riskRating as RiskRating) || "",
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isNonCompliant = status === "NON_COMPLIANT";
  const hasResponse = item.responses.length > 0;

  async function handleSubmit() {
    if (!canRespond) {
      toast.error("You do not have permission to submit responses");
      return;
    }

    if (!status) {
      toast.error("Please select a status");
      return;
    }

    if (status === "NON_COMPLIANT" && !observation) {
      toast.error("Observation text is required for non-compliant items");
      return;
    }

    setIsSubmitting(true);
    const result = await submitExaminationResponse({
      engagementId,
      itemId: item.id,
      status,
      observation: observation || undefined,
      riskRating: riskRating || undefined,
    });
    setIsSubmitting(false);

    if (result.success) {
      if (result.data.autoCreatedObservation) {
        toast.success("Response saved and observation auto-created");
      } else {
        toast.success("Response saved successfully");
      }
      onSubmitSuccess();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base">
              Item {item.itemNumber}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.particulars}
            </p>
            {item.regulatoryRef && (
              <p className="mt-1 text-xs text-muted-foreground">
                Ref: {item.regulatoryRef}
              </p>
            )}
          </div>
          {hasResponse && (
            <Badge
              variant="outline"
              className={STATUS_COLORS[existingResponse.status] ?? ""}
            >
              {existingResponse.status.replace(/_/g, " ")}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status selector */}
        <div className="space-y-2">
          <Label>Status</Label>
          <RadioGroup
            value={status}
            onValueChange={(value) => setStatus(value as ExaminationStatus)}
            disabled={!canRespond}
          >
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="COMPLIANT" id={`${item.id}-compliant`} />
                <Label
                  htmlFor={`${item.id}-compliant`}
                  className="cursor-pointer font-normal"
                >
                  Compliant
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="NON_COMPLIANT"
                  id={`${item.id}-non-compliant`}
                />
                <Label
                  htmlFor={`${item.id}-non-compliant`}
                  className="cursor-pointer font-normal"
                >
                  Non-Compliant
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="PARTIAL" id={`${item.id}-partial`} />
                <Label
                  htmlFor={`${item.id}-partial`}
                  className="cursor-pointer font-normal"
                >
                  Partial
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="NOT_APPLICABLE"
                  id={`${item.id}-na`}
                />
                <Label
                  htmlFor={`${item.id}-na`}
                  className="cursor-pointer font-normal"
                >
                  Not Applicable
                </Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Observation textarea (required for NON_COMPLIANT) */}
        <div className="space-y-2">
          <Label htmlFor={`observation-${item.id}`}>
            Observation{" "}
            {isNonCompliant && <span className="text-red-500">*</span>}
          </Label>
          <Textarea
            id={`observation-${item.id}`}
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            disabled={!canRespond}
            placeholder={
              isNonCompliant
                ? "Describe the non-compliance (required)"
                : "Add notes or observations (optional)"
            }
            rows={3}
          />
        </div>

        {/* Risk rating (shown for NON_COMPLIANT) */}
        {isNonCompliant && (
          <div className="space-y-2">
            <Label htmlFor={`risk-${item.id}`}>Risk Rating</Label>
            <Select
              value={riskRating}
              onValueChange={(value) => setRiskRating(value as RiskRating)}
            >
              <SelectTrigger id={`risk-${item.id}`} disabled={!canRespond}>
                <SelectValue placeholder="Select risk level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Auto-created observation indicator */}
        {existingResponse?.observationId && (
          <div className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            <span>Auto-created observation linked to this response</span>
          </div>
        )}

        {/* Save button */}
        {canRespond && (
          <Button onClick={handleSubmit} disabled={!status || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!isSubmitting && hasResponse && (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            {hasResponse ? "Update Response" : "Save Response"}
          </Button>
        )}

        {/* Evidence section - only shown if response exists */}
        {hasResponse && existingResponse && (
          <div className="mt-4 border-t pt-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Evidence ({existingResponse.evidence?.length ?? 0})</span>
            </div>

            {/* Evidence list */}
            <ExaminationEvidenceList
              evidence={existingResponse.evidence ?? []}
              engagementId={engagementId}
              responseId={existingResponse.id}
            />

            {/* Evidence upload panel */}
            {canRespond && (
              <div className="mt-3">
                <EvidenceUploadPanel
                  engagementId={engagementId}
                  responseId={existingResponse.id}
                  onUploadComplete={onSubmitSuccess}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ExaminationForm({
  engagementId,
  areaCode,
  items,
  canRespond,
}: ExaminationFormProps) {
  const router = useRouter();

  // Calculate progress
  const totalItems = items.length;
  const respondedItems = items.filter((item) => item.responses.length > 0)
    .length;
  const progressPercent =
    totalItems > 0 ? (respondedItems / totalItems) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progress</span>
              <span className="text-muted-foreground">
                {respondedItems} of {totalItems} items responded
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Examination items */}
      <div className="space-y-4">
        {items.map((item) => (
          <ExaminationItemForm
            key={item.id}
            item={item}
            engagementId={engagementId}
            canRespond={canRespond}
            onSubmitSuccess={() => router.refresh()}
          />
        ))}
      </div>
    </div>
  );
}
