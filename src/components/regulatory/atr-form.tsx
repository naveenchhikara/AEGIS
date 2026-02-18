"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Upload } from "@/lib/icons";
import { toast } from "sonner";

interface AtrFormProps {
  observationId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AtrForm({ observationId, onSuccess, onCancel }: AtrFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [actionsTaken, setActionsTaken] = React.useState("");
  const [evidence, setEvidence] = React.useState("");
  const [rootCause, setRootCause] = React.useState("");
  const [preventiveMeasures, setPreventiveMeasures] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!actionsTaken || !rootCause) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    // TODO: Implement submit ATR action
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
    toast.success("ATR submitted successfully");
    setIsSubmitting(false);
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="rootCause">
          Root Cause Analysis <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="rootCause"
          value={rootCause}
          onChange={(e) => setRootCause(e.target.value)}
          placeholder="Describe the root cause of the observation..."
          rows={3}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="actionsTaken">
          Actions Taken <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="actionsTaken"
          value={actionsTaken}
          onChange={(e) => setActionsTaken(e.target.value)}
          placeholder="Describe the corrective actions taken..."
          rows={4}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="preventiveMeasures">Preventive Measures</Label>
        <Textarea
          id="preventiveMeasures"
          value={preventiveMeasures}
          onChange={(e) => setPreventiveMeasures(e.target.value)}
          placeholder="Describe measures to prevent recurrence..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="evidence">Supporting Evidence / Documents</Label>
        <Textarea
          id="evidence"
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          placeholder="List supporting documents or evidence..."
          rows={2}
        />
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Upload Files
          </Button>
          <span className="text-xs text-muted-foreground">
            No files uploaded
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit ATR
        </Button>
      </div>
    </form>
  );
}
