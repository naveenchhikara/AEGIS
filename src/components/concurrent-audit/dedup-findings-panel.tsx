"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Link2,
  CheckCircle2,
} from "lucide-react";
import { Loader2 } from "@/lib/icons";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  linkConcurrentToRbia,
  markFindingUnique,
} from "@/actions/concurrent-audit/link-to-rbia";

type RbiaDuplicate = {
  id: string;
  title: string;
  condition: string;
  branch: { id: string } | null;
};

type Finding = {
  id: string;
  title: string;
  condition: string;
  severity: string;
  status: string;
  createdAt: Date;
  branch: { name: string; id: string } | null;
  potentialRbiaDuplicates: RbiaDuplicate[];
};

interface DedupFindingsPanelProps {
  findings: Finding[];
}

export function DedupFindingsPanel({ findings }: DedupFindingsPanelProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [escalateDialogOpen, setEscalateDialogOpen] = useState<string | null>(
    null,
  );
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const router = useRouter();

  async function handleLinkToRbia(concurrentObsId: string, rbiaObsId: string) {
    setLoadingAction(`link-${concurrentObsId}-${rbiaObsId}`);
    try {
      const result = await linkConcurrentToRbia({ concurrentObsId, rbiaObsId });
      if (result.success) {
        toast.success("Finding linked to RBIA observation");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to link finding");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleMarkUnique(concurrentObsId: string) {
    setLoadingAction(`unique-${concurrentObsId}`);
    try {
      const result = await markFindingUnique({ concurrentObsId });
      if (result.success) {
        toast.success("Finding marked as unique");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to mark finding as unique");
    } finally {
      setLoadingAction(null);
    }
  }

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Findings now come with potentialRbiaDuplicates from DAL (R76)
  const findingsWithDuplicates = findings;

  const totalFindings = findings.length;
  const potentialDuplicates = findingsWithDuplicates.filter(
    (f) => f.potentialRbiaDuplicates.length > 0,
  ).length;

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

  if (findings.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center">
          <p>No concurrent audit findings to display.</p>
          <p className="mt-2 text-sm">
            Create observations via the Rapid Entry tab to see them here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Findings De-duplication</h2>
        <p className="text-muted-foreground text-sm">
          Review concurrent findings and identify potential RBIA duplicates
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Concurrent Findings</CardDescription>
            <CardTitle className="text-3xl">{totalFindings}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Potential RBIA Duplicates</CardDescription>
            <CardTitle className="text-3xl">{potentialDuplicates}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Unique Findings</CardDescription>
            <CardTitle className="text-3xl">
              {totalFindings - potentialDuplicates}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Findings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Concurrent Audit Findings</CardTitle>
          <CardDescription>
            Findings marked in yellow have potential duplicates in RBIA
            observations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Finding</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {findingsWithDuplicates.map((finding) => {
                const hasDuplicates =
                  finding.potentialRbiaDuplicates.length > 0;
                const isExpanded = expandedRows.has(finding.id);

                return (
                  <>
                    <TableRow
                      key={finding.id}
                      className={
                        hasDuplicates ? "bg-yellow-50 hover:bg-yellow-100" : ""
                      }
                    >
                      <TableCell>
                        {hasDuplicates && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRow(finding.id)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          {hasDuplicates && (
                            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />
                          )}
                          <div>
                            <div className="font-medium">{finding.title}</div>
                            <div className="text-muted-foreground line-clamp-1 text-sm">
                              {finding.condition}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{finding.branch?.name || "N/A"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={getSeverityColor(finding.severity) as any}
                        >
                          {finding.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{finding.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(finding.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEscalateDialogOpen(finding.id)}
                          >
                            <AlertTriangle className="mr-2 h-3 w-3" />
                            Escalate
                          </Button>
                          {hasDuplicates && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRow(finding.id)}
                              title="View potential RBIA duplicates"
                            >
                              <Link2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Row for Duplicates */}
                    {hasDuplicates && isExpanded && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/50">
                          <div className="px-6 py-4">
                            <h4 className="mb-3 text-sm font-semibold">
                              Potential RBIA Duplicates (
                              {finding.potentialRbiaDuplicates.length})
                            </h4>
                            <div className="space-y-2">
                              {finding.potentialRbiaDuplicates.map(
                                (duplicate: any) => (
                                  <div
                                    key={duplicate.id}
                                    className="bg-background flex items-start justify-between rounded-md border p-3"
                                  >
                                    <div className="flex-1">
                                      <div className="text-sm font-medium">
                                        {duplicate.title}
                                      </div>
                                      <div className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                                        {duplicate.condition}
                                      </div>
                                    </div>
                                    <div className="ml-4 flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={
                                          loadingAction ===
                                          `link-${finding.id}-${duplicate.id}`
                                        }
                                        onClick={() =>
                                          handleLinkToRbia(
                                            finding.id,
                                            duplicate.id,
                                          )
                                        }
                                      >
                                        {loadingAction ===
                                        `link-${finding.id}-${duplicate.id}` ? (
                                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                        ) : (
                                          <Link2 className="mr-2 h-3 w-3" />
                                        )}
                                        Link to RBIA
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={
                                          loadingAction ===
                                          `unique-${finding.id}`
                                        }
                                        onClick={() =>
                                          handleMarkUnique(finding.id)
                                        }
                                      >
                                        {loadingAction ===
                                        `unique-${finding.id}` ? (
                                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                        ) : (
                                          <CheckCircle2 className="mr-2 h-3 w-3" />
                                        )}
                                        Mark Unique
                                      </Button>
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About De-duplication</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>
            This panel identifies concurrent audit findings that may duplicate
            RBIA observations to avoid redundant work during annual planning.
          </p>
          <ul className="ml-2 list-inside list-disc space-y-1">
            <li>
              <strong>Yellow highlighting:</strong> Indicates potential
              duplicates based on title and branch similarity
            </li>
            <li>
              <strong>Link to RBIA:</strong> Associate concurrent finding with
              existing RBIA observation
            </li>
            <li>
              <strong>Mark Unique:</strong> Confirm finding is unique and should
              be planned separately
            </li>
            <li>
              <strong>Escalate:</strong> Flag serious irregularities for
              immediate management attention
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Escalation Dialogs */}
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
