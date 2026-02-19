"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { escalateIrregularity } from "@/actions/concurrent-audit/escalate-irregularity";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle } from "lucide-react";

interface IrregularityEscalationDialogProps {
  observationId: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type IrregularityType =
  | "FRAUD"
  | "MAJOR_DEVIATION"
  | "REGULATORY_BREACH"
  | "CRITICAL_RISK";
type Urgency = "IMMEDIATE" | "URGENT" | "HIGH";
type Recipient = "CAE" | "CEO" | "ACB_MEMBER";

const IRREGULARITY_TYPES: { value: IrregularityType; label: string }[] = [
  { value: "FRAUD", label: "Fraud" },
  { value: "MAJOR_DEVIATION", label: "Major Deviation" },
  { value: "REGULATORY_BREACH", label: "Regulatory Breach" },
  { value: "CRITICAL_RISK", label: "Critical Risk" },
];

const URGENCY_LEVELS: { value: Urgency; label: string }[] = [
  { value: "IMMEDIATE", label: "Immediate" },
  { value: "URGENT", label: "Urgent" },
  { value: "HIGH", label: "High" },
];

const RECIPIENTS: { value: Recipient; label: string }[] = [
  { value: "CAE", label: "Chief Audit Executive (CAE)" },
  { value: "CEO", label: "Chief Executive Officer (CEO)" },
  { value: "ACB_MEMBER", label: "Audit Committee of Board (ACB)" },
];

// Auto-routing rules based on irregularity type
const AUTO_ROUTING: Record<IrregularityType, Recipient[]> = {
  FRAUD: ["CAE", "CEO", "ACB_MEMBER"],
  REGULATORY_BREACH: ["CAE", "CEO"],
  MAJOR_DEVIATION: ["CAE"],
  CRITICAL_RISK: ["CAE", "CEO"],
};

export function IrregularityEscalationDialog({
  observationId,
  trigger,
  open,
  onOpenChange,
}: IrregularityEscalationDialogProps) {
  const [isOpen, setIsOpen] = useState(open || false);
  const [irregularityType, setIrregularityType] = useState<
    IrregularityType | ""
  >("");
  const [urgency, setUrgency] = useState<Urgency>("HIGH");
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle controlled open state
  useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

  // Auto-route recipients based on irregularity type
  useEffect(() => {
    if (irregularityType) {
      setSelectedRecipients(AUTO_ROUTING[irregularityType]);
    }
  }, [irregularityType]);

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    if (onOpenChange) {
      onOpenChange(newOpen);
    }
    if (!newOpen) {
      // Reset form when closing
      setIrregularityType("");
      setUrgency("HIGH");
      setSelectedRecipients([]);
      setRemarks("");
    }
  };

  const toggleRecipient = (recipient: Recipient) => {
    setSelectedRecipients((prev) =>
      prev.includes(recipient)
        ? prev.filter((r) => r !== recipient)
        : [...prev, recipient],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!irregularityType) {
      toast.error("Please select an irregularity type");
      return;
    }

    if (selectedRecipients.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    if (remarks.trim().length < 10) {
      toast.error("Remarks must be at least 10 characters");
      return;
    }

    setIsSubmitting(true);

    const result = await escalateIrregularity({
      observationId,
      irregularityType,
      urgency,
      escalateTo: selectedRecipients,
      remarks: remarks.trim(),
    });

    setIsSubmitting(false);

    if (result.success) {
      toast.success(
        `Escalated to ${result.data.notificationsSent} recipient${
          result.data.notificationsSent !== 1 ? "s" : ""
        }`,
      );
      handleOpenChange(false);
      // Optionally reload the page to reflect status changes
      setTimeout(() => window.location.reload(), 1000);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="text-destructive h-5 w-5" />
            Escalate Serious Irregularity
          </DialogTitle>
          <DialogDescription>
            Flag critical findings for immediate attention from senior
            management
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="irregularityType">Irregularity Type *</Label>
              <Select
                value={irregularityType}
                onValueChange={(value) =>
                  setIrregularityType(value as IrregularityType)
                }
                required
              >
                <SelectTrigger id="irregularityType">
                  <SelectValue placeholder="Select type of irregularity" />
                </SelectTrigger>
                <SelectContent>
                  {IRREGULARITY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {irregularityType && (
                <p className="text-muted-foreground mt-1 text-xs">
                  Auto-routing to:{" "}
                  {AUTO_ROUTING[irregularityType]
                    .map(
                      (r) => RECIPIENTS.find((rec) => rec.value === r)?.label,
                    )
                    .join(", ")}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="urgency">Urgency *</Label>
              <Select
                value={urgency}
                onValueChange={(value) => setUrgency(value as Urgency)}
                required
              >
                <SelectTrigger id="urgency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {URGENCY_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-3 block">Escalate To *</Label>
              <div className="space-y-3 rounded-md border p-4">
                {RECIPIENTS.map((recipient) => (
                  <div
                    key={recipient.value}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={recipient.value}
                      checked={selectedRecipients.includes(recipient.value)}
                      onCheckedChange={() => toggleRecipient(recipient.value)}
                    />
                    <label
                      htmlFor={recipient.value}
                      className="cursor-pointer text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {recipient.label}
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                You can modify auto-selected recipients if needed
              </p>
            </div>

            <div>
              <Label htmlFor="remarks">Remarks *</Label>
              <Textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Describe the irregularity and why it requires escalation (minimum 10 characters)"
                rows={4}
                required
                minLength={10}
              />
              <p className="text-muted-foreground mt-1 text-xs">
                {remarks.length} / 10 minimum characters
              </p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-md p-4 text-sm">
            <p className="mb-2 font-medium">What happens next:</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1">
              <li>Observation severity will be upgraded to CRITICAL</li>
              <li>Observation status will change to SUBMITTED</li>
              <li>Notifications will be sent to selected recipients</li>
              <li>Timeline entry will be created for audit trail</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} variant="destructive">
              {isSubmitting ? "Escalating..." : "Escalate Irregularity"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
