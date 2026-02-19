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
  Plus,
  FileText,
  Loader2,
  Link as LinkIcon,
  Pencil,
  Search,
} from "@/lib/icons";
import { toast } from "sonner";
import { manageRegulatoryObservation } from "@/actions/regulatory/manage-observation";
import { submitAtr } from "@/actions/regulatory/submit-atr";
import { format } from "date-fns";

interface RegulatoryObservation {
  id: string;
  source: string;
  referenceNo: string;
  paraNo: string | null;
  description: string;
  severity: string;
  atrStatus: string;
  atrText: string | null;
  submittedAt: Date | null;
  acceptedAt: Date | null;
  issueId: string | null;
  issue: { id: string; title: string; status: string } | null;
  createdAt: Date;
}

interface Issue {
  id: string;
  title: string;
  status: string;
}

interface RegulatoryTableProps {
  observations: RegulatoryObservation[];
  canManage: boolean;
  canSubmitAtr: boolean;
  issues: Issue[];
}

const SOURCE_LABELS: Record<string, string> = {
  RBI_INSPECTION: "RBI",
  NABARD: "NABARD",
  STATUTORY_AUDITOR: "Statutory",
  EXTERNAL: "External",
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 border-red-300",
  HIGH: "bg-orange-100 text-orange-800 border-orange-300",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
  LOW: "bg-green-100 text-green-800 border-green-300",
};

const ATR_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 border-gray-300",
  SUBMITTED: "bg-blue-100 text-blue-800 border-blue-300",
  ACCEPTED: "bg-green-100 text-green-800 border-green-300",
  FURTHER_INFO: "bg-orange-100 text-orange-800 border-orange-300",
  CLOSED: "bg-purple-100 text-purple-800 border-purple-300",
};

export function RegulatoryTable({
  observations,
  canManage,
  canSubmitAtr,
  issues,
}: RegulatoryTableProps) {
  const router = useRouter();
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [selectedObservation, setSelectedObservation] =
    React.useState<RegulatoryObservation | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Filter states
  const [sourceFilter, setSourceFilter] = React.useState<string>("all");
  const [severityFilter, setSeverityFilter] = React.useState<string>("all");
  const [atrStatusFilter, setAtrStatusFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Form states
  const [formData, setFormData] = React.useState({
    source: "RBI_INSPECTION",
    referenceNo: "",
    paraNo: "",
    description: "",
    severity: "MEDIUM",
    issueId: "",
  });

  // Filter observations
  const filteredObservations = React.useMemo(() => {
    return observations.filter((obs) => {
      if (sourceFilter !== "all" && obs.source !== sourceFilter) return false;
      if (severityFilter !== "all" && obs.severity !== severityFilter)
        return false;
      if (atrStatusFilter !== "all" && obs.atrStatus !== atrStatusFilter)
        return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          obs.referenceNo.toLowerCase().includes(query) ||
          obs.description.toLowerCase().includes(query) ||
          (obs.paraNo && obs.paraNo.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [
    observations,
    sourceFilter,
    severityFilter,
    atrStatusFilter,
    searchQuery,
  ]);

  function resetForm() {
    setFormData({
      source: "RBI_INSPECTION",
      referenceNo: "",
      paraNo: "",
      description: "",
      severity: "MEDIUM",
      issueId: "",
    });
  }

  function handleEdit(observation: RegulatoryObservation) {
    setSelectedObservation(observation);
    setFormData({
      source: observation.source,
      referenceNo: observation.referenceNo,
      paraNo: observation.paraNo || "",
      description: observation.description,
      severity: observation.severity,
      issueId: observation.issueId || "",
    });
    setEditDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.referenceNo || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    const result = await manageRegulatoryObservation({
      observationId: selectedObservation?.id,
      source: formData.source as any,
      referenceNo: formData.referenceNo,
      paraNo: formData.paraNo || undefined,
      description: formData.description,
      severity: formData.severity as any,
      issueId: formData.issueId || undefined,
    });

    setIsSubmitting(false);

    if (result.success) {
      toast.success(
        selectedObservation ? "Observation updated" : "Observation created",
      );
      setAddDialogOpen(false);
      setEditDialogOpen(false);
      resetForm();
      setSelectedObservation(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-[200px] flex-1">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
            <Input
              placeholder="Search by reference, para, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="RBI_INSPECTION">RBI</SelectItem>
            <SelectItem value="NABARD">NABARD</SelectItem>
            <SelectItem value="STATUTORY_AUDITOR">Statutory</SelectItem>
            <SelectItem value="EXTERNAL">External</SelectItem>
          </SelectContent>
        </Select>

        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={atrStatusFilter} onValueChange={setAtrStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="ATR Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="ACCEPTED">Accepted</SelectItem>
            <SelectItem value="FURTHER_INFO">Further Info</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>

        {canManage && (
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Observation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Regulatory Observation</DialogTitle>
                <DialogDescription>
                  Create a new regulatory observation from RBI, NABARD, or other
                  sources.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="source">Source *</Label>
                    <Select
                      value={formData.source}
                      onValueChange={(value) =>
                        setFormData({ ...formData, source: value })
                      }
                    >
                      <SelectTrigger id="source">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RBI_INSPECTION">
                          RBI Inspection
                        </SelectItem>
                        <SelectItem value="NABARD">NABARD</SelectItem>
                        <SelectItem value="STATUTORY_AUDITOR">
                          Statutory Auditor
                        </SelectItem>
                        <SelectItem value="EXTERNAL">External</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="severity">Severity *</Label>
                    <Select
                      value={formData.severity}
                      onValueChange={(value) =>
                        setFormData({ ...formData, severity: value })
                      }
                    >
                      <SelectTrigger id="severity">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="referenceNo">Reference Number *</Label>
                    <Input
                      id="referenceNo"
                      value={formData.referenceNo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          referenceNo: e.target.value,
                        })
                      }
                      placeholder="e.g., RBI/2024/123"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paraNo">Para Number</Label>
                    <Input
                      id="paraNo"
                      value={formData.paraNo}
                      onChange={(e) =>
                        setFormData({ ...formData, paraNo: e.target.value })
                      }
                      placeholder="e.g., 5.3.2"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe the regulatory observation..."
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="issueId">
                    Link to Existing Issue (Optional)
                  </Label>
                  <Select
                    value={formData.issueId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, issueId: value })
                    }
                  >
                    <SelectTrigger id="issueId">
                      <SelectValue placeholder="Select issue (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {issues.map((issue) => (
                        <SelectItem key={issue.id} value={issue.id}>
                          {issue.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Observation
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Results count */}
      <div className="text-muted-foreground text-sm">
        Showing {filteredObservations.length} of {observations.length}{" "}
        observations
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Reference / Para</TableHead>
              <TableHead className="max-w-md">Description</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>ATR Status</TableHead>
              <TableHead>Linked Issue</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredObservations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {observations.length === 0
                    ? "No regulatory observations found. Add one to get started."
                    : "No observations match the current filters."}
                </TableCell>
              </TableRow>
            ) : (
              filteredObservations.map((obs) => (
                <TableRow key={obs.id} className="hover:bg-muted/50">
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
                    <Badge
                      variant="outline"
                      className={SEVERITY_COLORS[obs.severity] ?? ""}
                    >
                      {obs.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge
                        variant="outline"
                        className={ATR_STATUS_COLORS[obs.atrStatus] ?? ""}
                      >
                        {obs.atrStatus.replace("_", " ")}
                      </Badge>
                      {obs.submittedAt && (
                        <div className="text-muted-foreground text-xs">
                          {format(new Date(obs.submittedAt), "MMM d, yyyy")}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {obs.issue ? (
                      <div className="space-y-1">
                        <div
                          className="line-clamp-1 text-sm font-medium"
                          title={obs.issue.title}
                        >
                          {obs.issue.title}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {obs.issue.status}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        Not mapped
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {canManage && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(obs)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      {selectedObservation && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Regulatory Observation</DialogTitle>
              <DialogDescription>
                Update the regulatory observation details.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-source">Source *</Label>
                  <Select
                    value={formData.source}
                    onValueChange={(value) =>
                      setFormData({ ...formData, source: value })
                    }
                  >
                    <SelectTrigger id="edit-source">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RBI_INSPECTION">
                        RBI Inspection
                      </SelectItem>
                      <SelectItem value="NABARD">NABARD</SelectItem>
                      <SelectItem value="STATUTORY_AUDITOR">
                        Statutory Auditor
                      </SelectItem>
                      <SelectItem value="EXTERNAL">External</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-severity">Severity *</Label>
                  <Select
                    value={formData.severity}
                    onValueChange={(value) =>
                      setFormData({ ...formData, severity: value })
                    }
                  >
                    <SelectTrigger id="edit-severity">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-referenceNo">Reference Number *</Label>
                  <Input
                    id="edit-referenceNo"
                    value={formData.referenceNo}
                    onChange={(e) =>
                      setFormData({ ...formData, referenceNo: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-paraNo">Para Number</Label>
                  <Input
                    id="edit-paraNo"
                    value={formData.paraNo}
                    onChange={(e) =>
                      setFormData({ ...formData, paraNo: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description *</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-issueId">Link to Issue</Label>
                <Select
                  value={formData.issueId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, issueId: value })
                  }
                >
                  <SelectTrigger id="edit-issueId">
                    <SelectValue placeholder="Select issue (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {issues.map((issue) => (
                      <SelectItem key={issue.id} value={issue.id}>
                        {issue.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditDialogOpen(false);
                    setSelectedObservation(null);
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Observation
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
