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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Pencil } from "@/lib/icons";
import { toast } from "sonner";
import { manageKRI } from "@/actions/risk-management/manage-risk";

interface KriFormDialogProps {
  riskRegisterId: string;
  kri?: {
    id: string;
    name: string;
    description?: string | null;
    currentValue?: number | null;
    thresholdLow?: number | null;
    thresholdHigh?: number | null;
    frequency: string;
  };
  trigger?: React.ReactNode;
}

type FormState = {
  success?: boolean;
  error?: string;
};

async function submitKriAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const input = {
    id: formData.get("id") as string | undefined,
    riskRegisterId: formData.get("riskRegisterId") as string,
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    currentValue: formData.get("currentValue")
      ? parseFloat(formData.get("currentValue") as string)
      : undefined,
    thresholdLow: formData.get("thresholdLow")
      ? parseFloat(formData.get("thresholdLow") as string)
      : undefined,
    thresholdHigh: formData.get("thresholdHigh")
      ? parseFloat(formData.get("thresholdHigh") as string)
      : undefined,
    frequency: (formData.get("frequency") as any) || undefined,
  };

  return manageKRI(input);
}

export function KriFormDialog({ riskRegisterId, kri, trigger }: KriFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [state, formAction, isPending] = useActionState(submitKriAction, {});

  // Handle success/error feedback
  React.useEffect(() => {
    if (state.success) {
      toast.success(kri ? "KRI updated successfully" : "KRI created successfully");
      setOpen(false);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router, kri]);

  const defaultTrigger = kri ? (
    <Button variant="ghost" size="sm">
      <Pencil className="mr-2 h-4 w-4" />
      Edit
    </Button>
  ) : (
    <Button>
      <Plus className="mr-2 h-4 w-4" />
      Add KRI
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <form action={formAction}>
          {kri?.id && <input type="hidden" name="id" value={kri.id} />}
          <input type="hidden" name="riskRegisterId" value={riskRegisterId} />
          
          <DialogHeader>
            <DialogTitle>{kri ? "Edit KRI" : "Create Key Risk Indicator"}</DialogTitle>
            <DialogDescription>
              {kri
                ? "Update the KRI details and thresholds."
                : "Define a new Key Risk Indicator for this risk."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                KRI Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={kri?.name}
                placeholder="e.g., NPA Ratio, Liquidity Coverage Ratio"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={kri?.description || ""}
                placeholder="Brief description of what this KRI measures..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="frequency">
                  Monitoring Frequency <span className="text-destructive">*</span>
                </Label>
                <Select name="frequency" defaultValue={kri?.frequency || "MONTHLY"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentValue">Current Value</Label>
                <Input
                  id="currentValue"
                  name="currentValue"
                  type="number"
                  step="0.0001"
                  defaultValue={kri?.currentValue ?? undefined}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="thresholdLow">Low Threshold</Label>
                <Input
                  id="thresholdLow"
                  name="thresholdLow"
                  type="number"
                  step="0.0001"
                  defaultValue={kri?.thresholdLow ?? undefined}
                  placeholder="Minimum acceptable value"
                />
                <p className="text-xs text-muted-foreground">
                  Values below this trigger a warning
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="thresholdHigh">High Threshold</Label>
                <Input
                  id="thresholdHigh"
                  name="thresholdHigh"
                  type="number"
                  step="0.0001"
                  defaultValue={kri?.thresholdHigh ?? undefined}
                  placeholder="Maximum acceptable value"
                />
                <p className="text-xs text-muted-foreground">
                  Values above this trigger a warning
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {kri ? "Update KRI" : "Create KRI"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
