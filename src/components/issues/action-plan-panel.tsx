"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus, CheckCircle2, Loader2 } from "@/lib/icons";
import { toast } from "sonner";
import {
  manageActionPlan,
  updateActionPlanProgress,
} from "@/actions/issues/manage-action-plan";
import { format } from "date-fns";

interface ActionPlan {
  id: string;
  title: string;
  status: string;
  dueDate: Date;
  completionPct: number;
}

interface ActionPlanPanelProps {
  issueId: string;
  actionPlans: ActionPlan[];
  canManage: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-800 border-gray-300",
  IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-300",
  COMPLETED: "bg-green-100 text-green-800 border-green-300",
  OVERDUE: "bg-red-100 text-red-800 border-red-300",
};

type FormState = {
  success?: boolean;
  error?: string;
  data?: any;
};

async function createActionPlanAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const input = {
    issueId: formData.get("issueId") as string,
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    milestone: (formData.get("milestone") as string) || undefined,
    dueDate: new Date(formData.get("dueDate") as string),
  };

  return manageActionPlan(input);
}

export function ActionPlanPanel({
  issueId,
  actionPlans,
  canManage,
}: ActionPlanPanelProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [updatingProgress, setUpdatingProgress] = React.useState<string | null>(
    null
  );

  const [createState, createFormAction, isCreating] = useActionState(
    createActionPlanAction,
    {}
  );

  React.useEffect(() => {
    if (createState.success) {
      toast.success("Action plan created successfully");
      setDialogOpen(false);
      router.refresh();
    } else if (createState.error) {
      toast.error(createState.error);
    }
  }, [createState, router]);

  const handleUpdateProgress = async (
    actionPlanId: string,
    completionPct: number
  ) => {
    setUpdatingProgress(actionPlanId);
    const result = await updateActionPlanProgress(actionPlanId, completionPct);

    if (result.success) {
      toast.success("Progress updated");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setUpdatingProgress(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Action Plans</h3>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Action Plan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form action={createFormAction}>
                <input type="hidden" name="issueId" value={issueId} />
                <DialogHeader>
                  <DialogTitle>Create Action Plan</DialogTitle>
                  <DialogDescription>
                    Add a new action plan with milestones to resolve this issue.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="Action plan title"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      name="description"
                      rows={3}
                      placeholder="Detailed action plan description (min 10 characters)"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="milestone">Milestone</Label>
                    <Input
                      id="milestone"
                      name="milestone"
                      placeholder="e.g., Phase 1: Requirements gathering"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date *</Label>
                    <Input
                      id="dueDate"
                      name="dueDate"
                      type="date"
                      required
                      min={format(new Date(), "yyyy-MM-dd")}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {actionPlans.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No action plans yet.
              {canManage && " Click 'Add Action Plan' to create one."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {actionPlans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{plan.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Due: {format(new Date(plan.dueDate), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={STATUS_COLORS[plan.status] ?? ""}
                  >
                    {plan.status.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{plan.completionPct}%</span>
                    </div>
                    <Progress value={plan.completionPct} className="h-2" />
                  </div>

                  {canManage && plan.status !== "COMPLETED" && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        defaultValue={plan.completionPct}
                        className="w-24"
                        id={`progress-${plan.id}`}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const input = document.getElementById(
                            `progress-${plan.id}`
                          ) as HTMLInputElement;
                          const value = parseInt(input.value);
                          if (value >= 0 && value <= 100) {
                            handleUpdateProgress(plan.id, value);
                          }
                        }}
                        disabled={updatingProgress === plan.id}
                      >
                        {updatingProgress === plan.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Update"
                        )}
                      </Button>
                    </div>
                  )}

                  {plan.status === "COMPLETED" && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Completed</span>
                    </div>
                  )}

                  {plan.status === "OVERDUE" && (
                    <div className="rounded-md bg-red-50 p-2 text-xs text-red-800">
                      This action plan is overdue. Please update the status.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
