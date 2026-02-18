"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2 } from "@/lib/icons";

interface ActionPlan {
  id: string;
  title: string;
  owner: string;
  dueDate: string;
  progress: number;
  status: string;
}

interface ActionPlanPanelProps {
  issueId: string;
  actionPlans: ActionPlan[];
  canManage: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-800 border-gray-300",
  IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-300",
  COMPLETED: "bg-green-100 text-green-800 border-green-300",
  OVERDUE: "bg-red-100 text-red-800 border-red-300",
};

export function ActionPlanPanel({ issueId, actionPlans, canManage }: ActionPlanPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Action Plans</h3>
        {canManage && (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Action Plan
          </Button>
        )}
      </div>

      {actionPlans.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No action plans yet.</p>
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
                      Owner: {plan.owner} • Due: {plan.dueDate}
                    </p>
                  </div>
                  <Badge variant="outline" className={STATUS_COLORS[plan.status] ?? ""}>
                    {plan.status.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{plan.progress}%</span>
                  </div>
                  <Progress value={plan.progress} className="h-2" />
                  {plan.status === "COMPLETED" && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Completed</span>
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
