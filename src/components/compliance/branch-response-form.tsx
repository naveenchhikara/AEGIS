"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { submitBranchResponse } from "@/actions/compliance/submit-branch-response";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "@/lib/icons";
import { toast } from "sonner";

interface BranchResponseFormProps {
  complianceItemId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BranchResponseForm({
  complianceItemId,
  open,
  onOpenChange,
}: BranchResponseFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [responseText, setResponseText] = React.useState("");

  const handleSubmit = async () => {
    if (!responseText.trim()) {
      toast.error("Please provide a response");
      return;
    }

    setIsSubmitting(true);
    const result = await submitBranchResponse({
      complianceItemId,
      responseText,
      evidenceS3Keys: [], // TODO: Add file upload support
    });
    setIsSubmitting(false);

    if (result.success) {
      toast.success("Branch response submitted successfully");
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Submit Branch Response</DialogTitle>
          <DialogDescription>
            Provide your response to the compliance item. This will be forwarded to ZAC for review.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="response">Response</Label>
            <Textarea
              id="response"
              placeholder="Describe the corrective actions taken, evidence, and timeline..."
              rows={8}
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Your response will be reviewed by the Zonal Audit Committee (ZAC) before closure.
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Response
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
