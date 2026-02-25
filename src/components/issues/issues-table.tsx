"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
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
import {
  Plus,
  Loader2,
  FileText,
  ShieldAlert,
  MoreHorizontal,
} from "@/lib/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { manageIssue } from "@/actions/issues/manage-issue";
import { acceptRisk } from "@/actions/issues/accept-risk";
import { ActionPlanPanel } from "./action-plan-panel";
import { format } from "date-fns";
import Link from "next/link";

interface Issue {
  id: string;
  title: string;
  description: string;
  source: string;
  issueType: string;
  severity: string;
  status: string;
  riskTheme?: string | null;
  rootCause?: string | null;
  createdAt: Date;
  observation?: {
    id: string;
    title: string;
    severity: string;
    branch: {
      code: string;
      name: string;
    } | null;
  } | null;
  control?: {
    id: string;
    controlCode: string;
    processArea: string;
    description: string;
  } | null;
  actionPlans: Array<{
    id: string;
    title: string;
    status: string;
    dueDate: Date;
    completionPct: number;
  }>;
}

interface IssuesTableProps {
  issues: Issue[];
  canManage: boolean;
  canAcceptRisk: boolean;
  controls: Array<{ id: string; controlCode: string; description: string }>;
  complianceItems: Array<{
    id: string;
    observation: { id: string; title: string } | null;
  }>;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 border-red-300",
  HIGH: "bg-orange-100 text-orange-800 border-orange-300",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
  LOW: "bg-green-100 text-green-800 border-green-300",
};

const SOURCE_COLORS: Record<string, string> = {
  INTERNAL_AUDIT: "bg-blue-100 text-blue-800 border-blue-300",
  REGULATORY: "bg-purple-100 text-purple-800 border-purple-300",
  EXTERNAL_AUDIT: "bg-indigo-100 text-indigo-800 border-indigo-300",
  SELF_ASSESSMENT: "bg-green-100 text-green-800 border-green-300",
  CONCURRENT: "bg-teal-100 text-teal-800 border-teal-300",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-red-100 text-red-800 border-red-300",
  IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-300",
  CLOSED: "bg-green-100 text-green-800 border-green-300",
  ACCEPTED_RISK: "bg-amber-100 text-amber-800 border-amber-300",
};

type FormState = {
  success?: boolean;
  error?: string;
  data?: any;
};

async function createIssueAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const input = {
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    source: formData.get("source") as any,
    issueType: formData.get("issueType") as any,
    severity: formData.get("severity") as any,
    rootCause: (formData.get("rootCause") as string) || undefined,
    riskTheme: (formData.get("riskTheme") as any) || undefined,
    controlId: (formData.get("controlId") as string) || undefined,
    complianceItemId: (formData.get("complianceItemId") as string) || undefined,
  };

  return manageIssue(input);
}

async function acceptRiskAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const input = {
    issueId: formData.get("issueId") as string,
    acceptanceReason: formData.get("acceptanceReason") as string,
  };

  return acceptRisk(input);
}

export function IssuesTable({
  issues,
  canManage,
  canAcceptRisk,
  controls,
  complianceItems,
}: IssuesTableProps) {
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [acceptRiskDialogOpen, setAcceptRiskDialogOpen] = React.useState(false);
  const [selectedIssue, setSelectedIssue] = React.useState<Issue | null>(null);
  const [actionPlanIssueId, setActionPlanIssueId] = React.useState<
    string | null
  >(null);

  const [createState, createFormAction, isCreating] = useActionState(
    createIssueAction,
    {},
  );
  const [acceptRiskState, acceptRiskFormAction, isAcceptingRisk] =
    useActionState(acceptRiskAction, {});

  React.useEffect(() => {
    if (createState.success) {
      toast.success("Issue created successfully");
      setCreateDialogOpen(false);
      router.refresh();
    } else if (createState.error) {
      toast.error(createState.error);
    }
  }, [createState, router]);

  React.useEffect(() => {
    if (acceptRiskState.success) {
      toast.success("Risk accepted successfully");
      setAcceptRiskDialogOpen(false);
      setSelectedIssue(null);
      router.refresh();
    } else if (acceptRiskState.error) {
      toast.error(acceptRiskState.error);
    }
  }, [acceptRiskState, router]);

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Issue
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
              <form action={createFormAction}>
                <DialogHeader>
                  <DialogTitle>Create New Issue</DialogTitle>
                  <DialogDescription>
                    Log a new issue from any source for tracking and resolution.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="Brief description of the issue"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      name="description"
                      rows={3}
                      placeholder="Detailed description (min 10 characters)"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="source">Source *</Label>
                      <Select name="source" required>
                        <SelectTrigger id="source">
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INTERNAL_AUDIT">
                            Internal Audit
                          </SelectItem>
                          <SelectItem value="REGULATORY">Regulatory</SelectItem>
                          <SelectItem value="EXTERNAL_AUDIT">
                            External Audit
                          </SelectItem>
                          <SelectItem value="SELF_ASSESSMENT">
                            Self Assessment
                          </SelectItem>
                          <SelectItem value="CONCURRENT">
                            Concurrent Audit
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="issueType">Type *</Label>
                      <Select name="issueType" required>
                        <SelectTrigger id="issueType">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FINDING">Finding</SelectItem>
                          <SelectItem value="OBSERVATION">
                            Observation
                          </SelectItem>
                          <SelectItem value="EXCEPTION">Exception</SelectItem>
                          <SelectItem value="DEFICIENCY">Deficiency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="severity">Severity *</Label>
                      <Select name="severity" required>
                        <SelectTrigger id="severity">
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CRITICAL">Critical</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="LOW">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="riskTheme">Risk Theme</Label>
                      <Select name="riskTheme">
                        <SelectTrigger id="riskTheme">
                          <SelectValue placeholder="Select theme (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CREDIT">Credit</SelectItem>
                          <SelectItem value="OPERATIONAL">
                            Operational
                          </SelectItem>
                          <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                          <SelectItem value="IT">IT</SelectItem>
                          <SelectItem value="GOVERNANCE">Governance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rootCause">Root Cause</Label>
                    <Textarea
                      id="rootCause"
                      name="rootCause"
                      rows={2}
                      placeholder="Root cause analysis (optional)"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="controlId">Linked Control</Label>
                      <Select name="controlId">
                        <SelectTrigger id="controlId">
                          <SelectValue placeholder="Select control (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {controls.map((control) => (
                            <SelectItem key={control.id} value={control.id}>
                              {control.controlCode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-muted-foreground text-sm">
                        Link to a specific control if applicable
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="complianceItemId">
                        Linked Compliance Item
                      </Label>
                      <Select name="complianceItemId">
                        <SelectTrigger id="complianceItemId">
                          <SelectValue placeholder="Select item (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {complianceItems.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.observation?.title || item.id.slice(0, 8)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-muted-foreground text-sm">
                        Link to a compliance tracking item if applicable
                      </p>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Issue
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action Plans</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No issues found.
                </TableCell>
              </TableRow>
            ) : (
              issues.map((issue) => (
                <TableRow key={issue.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{issue.title}</div>
                      <div className="text-muted-foreground text-xs">
                        {format(new Date(issue.createdAt), "MMM d, yyyy")}
                      </div>
                      {issue.observation && (
                        <div className="text-muted-foreground text-xs">
                          From: {issue.observation.title}
                          {issue.observation.branch &&
                            ` (${issue.observation.branch.name})`}
                        </div>
                      )}
                      {issue.control && (
                        <div className="text-muted-foreground text-xs">
                          Control:{" "}
                          <Link
                            href={`/controls/${issue.control.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {issue.control.controlCode}
                          </Link>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={SOURCE_COLORS[issue.source] ?? ""}
                    >
                      {issue.source.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{issue.issueType}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={SEVERITY_COLORS[issue.severity] ?? ""}
                    >
                      {issue.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={STATUS_COLORS[issue.status] ?? ""}
                    >
                      {issue.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {issue.actionPlans.length > 0 ? (
                        <Badge variant="secondary">
                          {issue.actionPlans.length} plan(s)
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          None
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setActionPlanIssueId(issue.id)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Action Plans
                        </DropdownMenuItem>
                        {canAcceptRisk &&
                          issue.status !== "CLOSED" &&
                          issue.status !== "ACCEPTED_RISK" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedIssue(issue);
                                  setAcceptRiskDialogOpen(true);
                                }}
                              >
                                <ShieldAlert className="mr-2 h-4 w-4" />
                                Accept Risk
                              </DropdownMenuItem>
                            </>
                          )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Accept Risk Dialog */}
      <Dialog
        open={acceptRiskDialogOpen}
        onOpenChange={setAcceptRiskDialogOpen}
      >
        <DialogContent>
          <form action={acceptRiskFormAction}>
            <input
              type="hidden"
              name="issueId"
              value={selectedIssue?.id || ""}
            />
            <DialogHeader>
              <DialogTitle>Accept Risk</DialogTitle>
              <DialogDescription>
                Formally accept risk for:{" "}
                <strong>{selectedIssue?.title}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="acceptanceReason">
                  Acceptance Reason * (min 20 characters)
                </Label>
                <Textarea
                  id="acceptanceReason"
                  name="acceptanceReason"
                  rows={4}
                  placeholder="Provide detailed justification for accepting this risk..."
                  required
                />
              </div>
              <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                This action requires executive-level approval and will be logged
                in the audit trail.
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAcceptRiskDialogOpen(false);
                  setSelectedIssue(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isAcceptingRisk}>
                {isAcceptingRisk && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Accept Risk
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Action Plan Panel Dialog */}
      {actionPlanIssueId && (
        <Dialog
          open={!!actionPlanIssueId}
          onOpenChange={() => setActionPlanIssueId(null)}
        >
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Action Plans</DialogTitle>
              <DialogDescription>
                Manage action plans and milestones for this issue.
              </DialogDescription>
            </DialogHeader>
            <ActionPlanPanel
              issueId={actionPlanIssueId}
              actionPlans={
                (issues.find((i) => i.id === actionPlanIssueId)?.actionPlans ||
                  []) as any
              }
              canManage={canManage}
              canVerify={canManage}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
