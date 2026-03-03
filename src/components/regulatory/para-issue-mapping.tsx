"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Link as LinkIcon,
  Unlink,
  Loader2,
  Plus,
  AlertCircle,
} from "@/lib/icons";
import { toast } from "sonner";
import { manageRegulatoryObservation } from "@/actions/regulatory/manage-observation";
import { manageIssue } from "@/actions/issues/manage-issue";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { format } from "date-fns";

interface RegulatoryObservation {
  id: string;
  source: string;
  referenceNo: string;
  paraNo: string | null;
  description: string;
  severity: string;
  atrStatus: string;
  issueId: string | null;
  issue: { id: string; title: string; status: string } | null;
  createdAt: Date;
}

interface Issue {
  id: string;
  title: string;
  status: string;
}

interface ParaIssueMappingProps {
  observations: RegulatoryObservation[];
  allObservations: RegulatoryObservation[];
  issues: Issue[];
  canManage: boolean;
}

const SOURCE_LABELS: Record<string, string> = {
  RBI_INSPECTION: "RBI",
  STATUTORY_AUDITOR: "Statutory",
  EXTERNAL: "External",
};

// Colors imported from central constants
import { SEVERITY_BADGE_COLORS as SEVERITY_COLORS } from "@/lib/constants";

export function ParaIssueMapping({
  observations,
  allObservations,
  issues,
  canManage,
}: ParaIssueMappingProps) {
  const router = useRouter();
  const [mappingDialogOpen, setMappingDialogOpen] = React.useState(false);
  const [selectedObservation, setSelectedObservation] =
    React.useState<RegulatoryObservation | null>(null);
  const [mappingMode, setMappingMode] = React.useState<"existing" | "new">(
    "existing",
  );
  const [selectedIssueId, setSelectedIssueId] = React.useState("");
  const [newIssueForm, setNewIssueForm] = React.useState({
    title: "",
    description: "",
    issueType: "OBSERVATION",
    riskTheme: "COMPLIANCE",
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const unmappedObservations = allObservations.filter((obs) => !obs.issueId);

  function handleMapToIssue(observation: RegulatoryObservation) {
    setSelectedObservation(observation);
    setMappingMode("existing");
    setSelectedIssueId("");
    setNewIssueForm({
      title: `Regulatory: ${observation.referenceNo}${observation.paraNo ? ` Para ${observation.paraNo}` : ""}`,
      description: observation.description,
      issueType: "OBSERVATION",
      riskTheme: "COMPLIANCE",
    });
    setMappingDialogOpen(true);
  }

  async function handleUnlink(observation: RegulatoryObservation) {
    if (
      !confirm(
        "Are you sure you want to unlink this observation from the issue?",
      )
    ) {
      return;
    }

    setIsSubmitting(true);

    const result = await manageRegulatoryObservation({
      observationId: observation.id,
      source: observation.source as any,
      referenceNo: observation.referenceNo,
      paraNo: observation.paraNo || undefined,
      description: observation.description,
      severity: observation.severity as any,
      issueId: undefined, // Remove the link
    });

    setIsSubmitting(false);

    if (result.success) {
      toast.success("Observation unlinked from issue");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function handleSubmitMapping(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedObservation) return;

    setIsSubmitting(true);

    let issueId: string;

    if (mappingMode === "new") {
      // Create new issue first
      if (!newIssueForm.title || !newIssueForm.description) {
        toast.error("Please fill in all required fields");
        setIsSubmitting(false);
        return;
      }

      const issueResult = await manageIssue({
        title: newIssueForm.title,
        description: newIssueForm.description,
        source: "REGULATORY",
        issueType: newIssueForm.issueType as any,
        severity: selectedObservation.severity as any,
        riskTheme: newIssueForm.riskTheme as any,
        status: "OPEN",
      });

      if (!issueResult.success) {
        toast.error(issueResult.error);
        setIsSubmitting(false);
        return;
      }

      issueId = issueResult.data.id;
    } else {
      // Use existing issue
      if (!selectedIssueId) {
        toast.error("Please select an issue");
        setIsSubmitting(false);
        return;
      }
      issueId = selectedIssueId;
    }

    // Link observation to issue
    const result = await manageRegulatoryObservation({
      observationId: selectedObservation.id,
      source: selectedObservation.source as any,
      referenceNo: selectedObservation.referenceNo,
      paraNo: selectedObservation.paraNo || undefined,
      description: selectedObservation.description,
      severity: selectedObservation.severity as any,
      issueId,
    });

    setIsSubmitting(false);

    if (result.success) {
      toast.success(
        mappingMode === "new"
          ? "New issue created and linked to observation"
          : "Observation linked to issue",
      );
      setMappingDialogOpen(false);
      setSelectedObservation(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="mapped" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mapped">
            Mapped ({observations.length})
          </TabsTrigger>
          <TabsTrigger value="unmapped">
            Unmapped ({unmappedObservations.length})
          </TabsTrigger>
        </TabsList>

        {/* Mapped Observations */}
        <TabsContent value="mapped" className="space-y-4">
          {observations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="text-muted-foreground mb-4 h-12 w-12" />
                <h3 className="mb-2 text-lg font-semibold">
                  No Mapped Observations
                </h3>
                <p className="text-muted-foreground max-w-md text-center text-sm">
                  Regulatory observations that are linked to internal issues
                  will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Reference / Para</TableHead>
                    <TableHead className="max-w-md">Observation</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Linked Issue</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {observations.map((obs) => (
                    <TableRow key={obs.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {SOURCE_LABELS[obs.source] || obs.source}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{obs.referenceNo}</div>
                          {obs.paraNo && (
                            <div className="text-muted-foreground text-xs">
                              Para {obs.paraNo}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="line-clamp-2" title={obs.description}>
                          {obs.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <SeverityBadge severity={obs.severity} />
                      </TableCell>
                      <TableCell>
                        {obs.issue && (
                          <div className="space-y-1">
                            <div
                              className="line-clamp-1 font-medium"
                              title={obs.issue.title}
                            >
                              {obs.issue.title}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {obs.issue.status}
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {canManage && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUnlink(obs)}
                            disabled={isSubmitting}
                          >
                            <Unlink className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Unmapped Observations */}
        <TabsContent value="unmapped" className="space-y-4">
          {unmappedObservations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <LinkIcon className="text-muted-foreground mb-4 h-12 w-12" />
                <h3 className="mb-2 text-lg font-semibold">
                  All Observations Mapped
                </h3>
                <p className="text-muted-foreground max-w-md text-center text-sm">
                  Great! All regulatory observations are linked to internal
                  issues.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="text-muted-foreground text-sm">
                {unmappedObservations.length} observation
                {unmappedObservations.length !== 1 ? "s" : ""} not linked to
                internal issues
              </div>

              <div className="grid gap-4">
                {unmappedObservations.map((obs) => (
                  <Card key={obs.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {SOURCE_LABELS[obs.source] || obs.source}
                            </Badge>
                            <SeverityBadge severity={obs.severity} />
                          </div>
                          <CardTitle className="text-lg">
                            {obs.referenceNo}
                            {obs.paraNo && (
                              <span className="text-muted-foreground">
                                {" "}
                                - Para {obs.paraNo}
                              </span>
                            )}
                          </CardTitle>
                          <CardDescription>{obs.description}</CardDescription>
                        </div>
                        {canManage && (
                          <Button
                            onClick={() => handleMapToIssue(obs)}
                            size="sm"
                            variant="outline"
                          >
                            <LinkIcon className="mr-2 h-4 w-4" />
                            Map to Issue
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Mapping Dialog */}
      {selectedObservation && (
        <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Map to Issue</DialogTitle>
              <DialogDescription>
                Link regulatory observation to an internal issue for tracking
                and resolution.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitMapping} className="space-y-4 py-4">
              {/* Observation Summary */}
              <div className="bg-muted/50 rounded-md border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="outline">
                    {SOURCE_LABELS[selectedObservation.source] ||
                      selectedObservation.source}
                  </Badge>
                  <SeverityBadge severity={selectedObservation.severity} />
                </div>
                <p className="font-medium">
                  {selectedObservation.referenceNo}
                  {selectedObservation.paraNo &&
                    ` - Para ${selectedObservation.paraNo}`}
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {selectedObservation.description}
                </p>
              </div>

              {/* Mapping Mode Selection */}
              <div className="space-y-2">
                <Label>Mapping Option</Label>
                <Tabs
                  value={mappingMode}
                  onValueChange={(v) => setMappingMode(v as any)}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="existing">
                      Link to Existing Issue
                    </TabsTrigger>
                    <TabsTrigger value="new">Create New Issue</TabsTrigger>
                  </TabsList>

                  <TabsContent value="existing" className="mt-4 space-y-2">
                    <Label htmlFor="issueId">Select Issue *</Label>
                    <Select
                      value={selectedIssueId}
                      onValueChange={setSelectedIssueId}
                    >
                      <SelectTrigger id="issueId">
                        <SelectValue placeholder="Choose an issue..." />
                      </SelectTrigger>
                      <SelectContent>
                        {issues.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No issues available
                          </SelectItem>
                        ) : (
                          issues.map((issue) => (
                            <SelectItem key={issue.id} value={issue.id}>
                              {issue.title} ({issue.status})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </TabsContent>

                  <TabsContent value="new" className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-title">Issue Title *</Label>
                      <Input
                        id="new-title"
                        value={newIssueForm.title}
                        onChange={(e) =>
                          setNewIssueForm({
                            ...newIssueForm,
                            title: e.target.value,
                          })
                        }
                        placeholder="Enter issue title..."
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-description">Description *</Label>
                      <Textarea
                        id="new-description"
                        value={newIssueForm.description}
                        onChange={(e) =>
                          setNewIssueForm({
                            ...newIssueForm,
                            description: e.target.value,
                          })
                        }
                        rows={4}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-issueType">Issue Type</Label>
                        <Select
                          value={newIssueForm.issueType}
                          onValueChange={(value) =>
                            setNewIssueForm({
                              ...newIssueForm,
                              issueType: value,
                            })
                          }
                        >
                          <SelectTrigger id="new-issueType">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FINDING">Finding</SelectItem>
                            <SelectItem value="OBSERVATION">
                              Observation
                            </SelectItem>
                            <SelectItem value="EXCEPTION">Exception</SelectItem>
                            <SelectItem value="DEFICIENCY">
                              Deficiency
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new-riskTheme">Risk Theme</Label>
                        <Select
                          value={newIssueForm.riskTheme}
                          onValueChange={(value) =>
                            setNewIssueForm({
                              ...newIssueForm,
                              riskTheme: value,
                            })
                          }
                        >
                          <SelectTrigger id="new-riskTheme">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CREDIT">Credit Risk</SelectItem>
                            <SelectItem value="OPERATIONAL">
                              Operational Risk
                            </SelectItem>
                            <SelectItem value="COMPLIANCE">
                              Compliance Risk
                            </SelectItem>
                            <SelectItem value="IT">IT Risk</SelectItem>
                            <SelectItem value="GOVERNANCE">
                              Governance Risk
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="text-muted-foreground text-sm">
                      <strong>Note:</strong> Severity (
                      {selectedObservation.severity}) and source (REGULATORY)
                      will be inherited from the observation.
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMappingDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {mappingMode === "new"
                    ? "Create & Link Issue"
                    : "Link to Issue"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
