"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Plus, Loader2, FileText, AlertTriangle, Edit, Trash2 } from "@/lib/icons";
import { toast } from "sonner";
import { managePolicy, deletePolicy } from "@/actions/governance/manage-policy";

interface Policy {
  id: string;
  name: string;
  category: string;
  status: string;
  version: string;
  approvalDate: Date | null;
  reviewDueDate: Date | null;
  documentUrl?: string | null;
  summary?: string | null;
}

interface PolicyTableProps {
  policies: Policy[];
  policiesDueReview: Policy[];
  canManage: boolean;
}

const policySchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  category: z.enum([
    "LENDING",
    "INVESTMENT",
    "KYC_AML",
    "IT_SECURITY",
    "HR",
    "AUDIT",
    "RISK_MANAGEMENT",
  ]),
  status: z.enum(["DRAFT", "APPROVED", "UNDER_REVIEW", "SUPERSEDED"]),
  version: z.string().optional(),
  approvalDate: z.string().optional(),
  reviewDueDate: z.string().optional(),
  documentUrl: z.string().optional(),
  summary: z.string().optional(),
});

type PolicyFormValues = z.infer<typeof policySchema>;

const CATEGORY_LABELS: Record<string, string> = {
  LENDING: "Lending",
  INVESTMENT: "Investment",
  KYC_AML: "KYC/AML",
  IT_SECURITY: "IT Security",
  HR: "HR",
  AUDIT: "Audit",
  RISK_MANAGEMENT: "Risk Management",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 border-gray-300",
  APPROVED: "bg-green-100 text-green-800 border-green-300",
  UNDER_REVIEW: "bg-blue-100 text-blue-800 border-blue-300",
  SUPERSEDED: "bg-red-100 text-red-800 border-red-300",
};

export function PolicyTable({ policies, policiesDueReview, canManage }: PolicyTableProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingPolicy, setEditingPolicy] = React.useState<Policy | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema) as any,
    defaultValues: {
      name: "",
      category: "LENDING",
      status: "DRAFT",
      version: "1.0",
    },
  });

  React.useEffect(() => {
    if (editingPolicy) {
      form.reset({
        name: editingPolicy.name,
        category: editingPolicy.category as any,
        status: editingPolicy.status as any,
        version: editingPolicy.version || "1.0",
        approvalDate: editingPolicy.approvalDate
          ? format(editingPolicy.approvalDate, "yyyy-MM-dd")
          : undefined,
        reviewDueDate: editingPolicy.reviewDueDate
          ? format(editingPolicy.reviewDueDate, "yyyy-MM-dd")
          : undefined,
        documentUrl: editingPolicy.documentUrl || "",
        summary: editingPolicy.summary || "",
      });
    } else {
      form.reset({
        name: "",
        category: "LENDING",
        status: "DRAFT",
        version: "1.0",
      });
    }
  }, [editingPolicy, form]);

  async function onSubmit(values: PolicyFormValues) {
    setIsSubmitting(true);
    const result = await managePolicy({
      policyId: editingPolicy?.id,
      name: values.name,
      category: values.category,
      status: values.status,
      version: values.version,
      approvalDate: values.approvalDate ? new Date(values.approvalDate) : undefined,
      reviewDueDate: values.reviewDueDate ? new Date(values.reviewDueDate) : undefined,
      documentUrl: values.documentUrl,
      summary: values.summary,
    });

    if (result.success) {
      toast.success(editingPolicy ? "Policy updated" : "Policy created");
      setDialogOpen(false);
      setEditingPolicy(null);
      form.reset();
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(policyId: string) {
    if (!confirm("Are you sure you want to delete this policy?")) return;

    const result = await deletePolicy(policyId);
    if (result.success) {
      toast.success("Policy deleted");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  function openEditDialog(policy: Policy) {
    setEditingPolicy(policy);
    setDialogOpen(true);
  }

  function openCreateDialog() {
    setEditingPolicy(null);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      {policiesDueReview.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Policies Due for Review</AlertTitle>
          <AlertDescription>
            {policiesDueReview.length} {policiesDueReview.length === 1 ? "policy" : "policies"}{" "}
            due for review within 30 days. Please update review dates.
          </AlertDescription>
        </Alert>
      )}

      {canManage && (
        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Policy
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPolicy ? "Edit Policy" : "Add Policy Document"}
                </DialogTitle>
                <DialogDescription>
                  {editingPolicy
                    ? "Update policy document details"
                    : "Create a new policy in the governance framework"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Policy Name</Label>
                  <Input
                    id="name"
                    {...form.register("name")}
                    placeholder="e.g., Lending Policy for Priority Sector"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      onValueChange={(value) => form.setValue("category", value as any)}
                      defaultValue={form.watch("category")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      onValueChange={(value) => form.setValue("status", value as any)}
                      defaultValue={form.watch("status")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                        <SelectItem value="SUPERSEDED">Superseded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="version">Version</Label>
                    <Input
                      id="version"
                      {...form.register("version")}
                      placeholder="1.0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="approvalDate">Approval Date</Label>
                    <Input
                      id="approvalDate"
                      type="date"
                      {...form.register("approvalDate")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reviewDueDate">Review Due Date</Label>
                    <Input
                      id="reviewDueDate"
                      type="date"
                      {...form.register("reviewDueDate")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="documentUrl">Document URL</Label>
                  <Input
                    id="documentUrl"
                    {...form.register("documentUrl")}
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="summary">Summary</Label>
                  <Textarea
                    id="summary"
                    {...form.register("summary")}
                    placeholder="Brief summary of the policy..."
                    rows={3}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      setEditingPolicy(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingPolicy ? "Update" : "Create"}
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
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Approval Date</TableHead>
              <TableHead>Review Due</TableHead>
              <TableHead>Version</TableHead>
              {canManage && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 7 : 6} className="h-24 text-center">
                  No policies found.
                </TableCell>
              </TableRow>
            ) : (
              policies.map((policy) => (
                <TableRow key={policy.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{policy.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {CATEGORY_LABELS[policy.category] || policy.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_COLORS[policy.status] ?? ""}>
                      {policy.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {policy.approvalDate
                      ? format(policy.approvalDate, "PP")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {policy.reviewDueDate
                      ? format(policy.reviewDueDate, "PP")
                      : "—"}
                  </TableCell>
                  <TableCell>{policy.version}</TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(policy)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(policy.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {policy.documentUrl && (
                          <Button
                            size="sm"
                            variant="ghost"
                            asChild
                          >
                            <a href={policy.documentUrl} target="_blank" rel="noopener noreferrer">
                              <FileText className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
