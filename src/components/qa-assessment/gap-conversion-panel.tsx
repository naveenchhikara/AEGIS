"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, CheckCircle2, Loader2 } from "@/lib/icons";
import { toast } from "sonner";
import {
  convertGapToIssue,
  bulkConvertGapsToIssues,
} from "@/actions/qa-assessment/gap-to-issue";

interface GapConversionPanelProps {
  gaps: Array<{
    id: string;
    assessmentYear: number;
    iiaStandard: string;
    question: string;
    response: string | null;
    evidence: string | null;
    gapIdentified: boolean;
    issueCreated: boolean;
  }>;
  canManage: boolean;
}

export function GapConversionPanel({
  gaps,
  canManage,
}: GapConversionPanelProps) {
  const [selectedGaps, setSelectedGaps] = React.useState<Set<string>>(
    new Set(),
  );
  const [isConverting, setIsConverting] = React.useState(false);
  const [isBulkConverting, setIsBulkConverting] = React.useState(false);
  const [singleGapId, setSingleGapId] = React.useState<string | null>(null);

  // Single conversion dialog state
  const [issueTitle, setIssueTitle] = React.useState("");
  const [issueDescription, setIssueDescription] = React.useState("");
  const [severity, setSeverity] = React.useState<
    "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  >("HIGH");

  // Bulk conversion state
  const [bulkSeverity, setBulkSeverity] = React.useState<
    "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  >("MEDIUM");

  const toggleGapSelection = (gapId: string) => {
    const newSelected = new Set(selectedGaps);
    if (newSelected.has(gapId)) {
      newSelected.delete(gapId);
    } else {
      newSelected.add(gapId);
    }
    setSelectedGaps(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedGaps.size === gaps.length) {
      setSelectedGaps(new Set());
    } else {
      setSelectedGaps(new Set(gaps.map((g) => g.id)));
    }
  };

  const openSingleConversionDialog = (gap: (typeof gaps)[0]) => {
    setSingleGapId(gap.id);
    setIssueTitle(`QA Gap: ${gap.iiaStandard}`);
    setIssueDescription(
      `QA Self-Assessment Gap Identified\n\n` +
        `IIA Standard: ${gap.iiaStandard}\n` +
        `Question: ${gap.question}\n` +
        `Response: ${gap.response}\n` +
        `Evidence: ${gap.evidence || "None provided"}`,
    );

    // Auto-determine severity
    if (gap.response === "DOES_NOT_CONFORM") {
      setSeverity("HIGH");
    } else if (gap.response === "PARTIALLY_CONFORMS") {
      setSeverity("MEDIUM");
    } else {
      setSeverity("LOW");
    }
  };

  const handleSingleConversion = async () => {
    if (!singleGapId) return;

    setIsConverting(true);
    const result = await convertGapToIssue({
      assessmentId: singleGapId,
      issueTitle,
      issueDescription,
      severity,
    });

    if (result.success) {
      toast.success("Gap converted to issue successfully");
      setSingleGapId(null);
    } else {
      toast.error(result.error);
    }
    setIsConverting(false);
  };

  const handleBulkConversion = async () => {
    if (selectedGaps.size === 0) {
      toast.error("Please select at least one gap to convert");
      return;
    }

    setIsBulkConverting(true);
    const result = await bulkConvertGapsToIssues(
      Array.from(selectedGaps),
      bulkSeverity,
    );

    if (result.success) {
      toast.success(
        `Created ${result.data.created} issues from ${result.data.total} selected gaps`,
      );
      setSelectedGaps(new Set());
    } else {
      toast.error(result.error);
    }
    setIsBulkConverting(false);
  };

  if (gaps.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-500" />
          <h3 className="mb-2 text-lg font-semibold">No Unconverted Gaps</h3>
          <p className="text-muted-foreground mb-4">
            All identified gaps have been converted to issues.
          </p>
          <Button variant="outline" asChild>
            <a href="#assessment">Go to Self-Assessment</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gaps.length}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              Awaiting conversion to issues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedGaps.size}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              Ready for bulk conversion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            {canManage && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full"
                    disabled={selectedGaps.size === 0}
                  >
                    Bulk Convert ({selectedGaps.size})
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Bulk Convert Gaps to Issues</DialogTitle>
                    <DialogDescription>
                      Convert {selectedGaps.size} selected gap(s) to issues
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="bulk-severity">Default Severity</Label>
                      <Select
                        value={bulkSeverity}
                        onValueChange={(v) => setBulkSeverity(v as any)}
                      >
                        <SelectTrigger id="bulk-severity">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CRITICAL">Critical</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="LOW">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleBulkConversion}
                      disabled={isBulkConverting}
                    >
                      {isBulkConverting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Convert {selectedGaps.size} Gaps
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gap Conversion Table */}
      <Card>
        <CardHeader>
          <CardTitle>Identified Gaps</CardTitle>
          <CardDescription>
            Select gaps to convert to issues for tracking and remediation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {canManage && (
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={
                        selectedGaps.size === gaps.length && gaps.length > 0
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                )}
                <TableHead className="w-[100px]">Standard</TableHead>
                <TableHead>Question</TableHead>
                <TableHead className="w-[180px]">Response</TableHead>
                <TableHead className="w-[200px]">Evidence</TableHead>
                {canManage && (
                  <TableHead className="w-[120px]">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {gaps.map((gap) => (
                <TableRow key={gap.id}>
                  {canManage && (
                    <TableCell>
                      <Checkbox
                        checked={selectedGaps.has(gap.id)}
                        onCheckedChange={() => toggleGapSelection(gap.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-mono text-xs">
                    {gap.iiaStandard}
                  </TableCell>
                  <TableCell className="text-sm">{gap.question}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        gap.response === "DOES_NOT_CONFORM"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {gap.response?.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {gap.evidence || "—"}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openSingleConversionDialog(gap)}
                          >
                            Convert
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Convert Gap to Issue</DialogTitle>
                            <DialogDescription>
                              Create a trackable issue from this QA gap
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="issue-title">Issue Title</Label>
                              <Input
                                id="issue-title"
                                value={issueTitle}
                                onChange={(e) => setIssueTitle(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="issue-description">
                                Description
                              </Label>
                              <Textarea
                                id="issue-description"
                                value={issueDescription}
                                onChange={(e) =>
                                  setIssueDescription(e.target.value)
                                }
                                rows={6}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="issue-severity">Severity</Label>
                              <Select
                                value={severity}
                                onValueChange={(v) => setSeverity(v as any)}
                              >
                                <SelectTrigger id="issue-severity">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="CRITICAL">
                                    Critical
                                  </SelectItem>
                                  <SelectItem value="HIGH">High</SelectItem>
                                  <SelectItem value="MEDIUM">Medium</SelectItem>
                                  <SelectItem value="LOW">Low</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              onClick={handleSingleConversion}
                              disabled={isConverting}
                            >
                              {isConverting && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              Create Issue
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
