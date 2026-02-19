"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IrregularityEscalationDialog } from "./irregularity-escalation-dialog";
import { AlertTriangle, ShieldAlert } from "@/lib/icons";
import { format } from "date-fns";

type Observation = {
  id: string;
  title: string;
  condition: string;
  severity: string;
  status: string;
  createdAt: Date;
  branch: { name: string; id: string } | null;
};

interface EscalationPanelProps {
  observations: Observation[];
  canExecute: boolean;
}

export function EscalationPanel({
  observations,
  canExecute,
}: EscalationPanelProps) {
  const [escalateDialogOpen, setEscalateDialogOpen] = useState<string | null>(
    null,
  );

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "destructive";
      case "HIGH":
        return "default";
      case "MEDIUM":
        return "secondary";
      case "LOW":
        return "outline";
      default:
        return "secondary";
    }
  };

  // Filter to show HIGH and CRITICAL findings first (most likely to need escalation)
  const sortedObservations = [...observations].sort((a, b) => {
    const severityOrder: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
    };
    return (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4);
  });

  if (observations.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 opacity-50" />
          <p>No concurrent audit observations available for escalation.</p>
          <p className="mt-2 text-sm">
            Create observations via the Rapid Entry tab first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Irregularity Escalation</h2>
        <p className="text-muted-foreground text-sm">
          Escalate serious irregularities found during concurrent audit to
          management for immediate attention
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Observations</CardDescription>
            <CardTitle className="text-3xl">{observations.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Critical / High Severity</CardDescription>
            <CardTitle className="text-3xl">
              {
                observations.filter(
                  (o) => o.severity === "CRITICAL" || o.severity === "HIGH",
                ).length
              }
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Already Escalated</CardDescription>
            <CardTitle className="text-3xl">
              {observations.filter((o) => o.status === "SUBMITTED").length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Observations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Concurrent Audit Observations</CardTitle>
          <CardDescription>
            Select an observation to escalate as a serious irregularity to
            senior management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Observation</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedObservations.map((obs) => (
                <TableRow key={obs.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{obs.title}</div>
                      <div className="text-muted-foreground line-clamp-1 text-sm">
                        {obs.condition}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{obs.branch?.name || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant={getSeverityColor(obs.severity) as any}>
                      {obs.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{obs.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(obs.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={!canExecute || obs.status === "SUBMITTED"}
                      onClick={() => setEscalateDialogOpen(obs.id)}
                    >
                      <AlertTriangle className="mr-2 h-3 w-3" />
                      {obs.status === "SUBMITTED" ? "Escalated" : "Escalate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About Escalation</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>
            Concurrent auditors must immediately escalate serious irregularities
            (fraud, major deviations, regulatory breaches, critical risks) to
            the Chief Audit Executive, CEO, or Audit Committee of the Board as
            required by RBI guidelines.
          </p>
          <ul className="ml-2 list-inside list-disc space-y-1">
            <li>
              <strong>Auto-routing:</strong> Recipients are automatically
              selected based on the type of irregularity
            </li>
            <li>
              <strong>Severity upgrade:</strong> Escalated observations are
              automatically upgraded to CRITICAL severity
            </li>
            <li>
              <strong>Notifications:</strong> Selected recipients are notified
              immediately via the notification system
            </li>
            <li>
              <strong>Audit trail:</strong> All escalations are recorded in the
              observation timeline
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Escalation Dialog */}
      {escalateDialogOpen && (
        <IrregularityEscalationDialog
          observationId={escalateDialogOpen}
          open={!!escalateDialogOpen}
          onOpenChange={(open) => {
            if (!open) setEscalateDialogOpen(null);
          }}
        />
      )}
    </div>
  );
}
