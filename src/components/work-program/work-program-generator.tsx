"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Zap, Loader2 } from "@/lib/icons";
import { toast } from "sonner";
import { generateWorkProgram } from "@/actions/work-program/generate-program";

interface WorkProgramGeneratorProps {
  engagements: Array<{
    id: string;
    auditNumber: string | null;
    status: string;
  }>;
  canExecute: boolean;
}

type FormState = {
  success?: boolean;
  error?: string;
  data?: {
    created: number;
    total: number;
  };
};

async function submitGenerateAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const input = {
    engagementId: formData.get("engagementId") as string,
    autoAssign: formData.get("autoAssign") === "on",
  };

  return generateWorkProgram(input);
}

export function WorkProgramGenerator({
  engagements,
  canExecute,
}: WorkProgramGeneratorProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [state, formAction, isPending] = useActionState(submitGenerateAction, {});

  // Handle success/error feedback
  React.useEffect(() => {
    if (state.success && state.data) {
      toast.success(
        `Work program generated: ${state.data.created} items created from ${state.data.total} test procedures`
      );
      setDialogOpen(false);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  if (!canExecute) {
    return null;
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <Zap className="mr-2 h-4 w-4" />
          Generate from Test Procedures
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Auto-Generate Work Program</DialogTitle>
            <DialogDescription>
              Automatically create work program items from test procedures linked to
              key controls for a selected audit engagement.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="engagementId">
                Audit Engagement <span className="text-destructive">*</span>
              </Label>
              <Select name="engagementId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select engagement" />
                </SelectTrigger>
                <SelectContent>
                  {engagements
                    .filter((e) => e.status === "PLANNED" || e.status === "IN_PROGRESS")
                    .map((engagement) => (
                      <SelectItem key={engagement.id} value={engagement.id}>
                        {engagement.auditNumber || engagement.id} ({engagement.status})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Only planned or in-progress engagements are shown
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="autoAssign" name="autoAssign" />
              <Label
                htmlFor="autoAssign"
                className="text-sm font-normal cursor-pointer"
              >
                Auto-assign to Lead Auditor
              </Label>
            </div>

            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm font-medium">What will be generated?</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Work program items for all test procedures linked to key controls</li>
                <li>Items will be created with "PENDING" status</li>
                <li>Duplicate items will be skipped automatically</li>
                <li>You can manually add more items later</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Work Program
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
