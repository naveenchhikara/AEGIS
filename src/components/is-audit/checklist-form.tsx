"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Save,
  Loader2,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ClipboardList,
} from "@/lib/icons";
import { toast } from "sonner";
import { manageIsAuditChecklist } from "@/actions/investment/manage-is-audit";
import { format } from "date-fns";

type ChecklistItem = {
  id?: string;
  question: string;
  response?: "COMPLIANT" | "NON_COMPLIANT" | "PARTIAL" | "NOT_APPLICABLE";
  evidence?: string;
  remarks?: string;
};

type Checklist = {
  id: string;
  category: string;
  checklistName: string;
  items: ChecklistItem[];
  engagement?: {
    id: string;
    auditNumber: string | null;
    branch: { code: string; name: string } | null;
  } | null;
  completedById: string | null;
  completedAt: Date | null;
  overallRating: string | null;
  createdAt: Date;
};

interface ChecklistFormProps {
  userId: string;
  checklists: Checklist[];
}

const CATEGORIES = [
  { value: "CBS", label: "Core Banking System" },
  { value: "CHANNELS", label: "Channels (ATM, Mobile, Internet)" },
  { value: "ACCESS_CONTROL", label: "Access Control & Authentication" },
  { value: "BCP_DR", label: "Business Continuity & DR" },
  { value: "VENDOR", label: "Vendor Management" },
  { value: "CHANGE_MGMT", label: "Change Management" },
  { value: "CYBER_SECURITY", label: "Cyber Security" },
];

const RESPONSE_STATUS = [
  {
    value: "COMPLIANT",
    label: "Compliant",
    icon: CheckCircle2,
    color: "text-green-600",
  },
  {
    value: "NON_COMPLIANT",
    label: "Non-Compliant",
    icon: XCircle,
    color: "text-red-600",
  },
  {
    value: "PARTIAL",
    label: "Partial",
    icon: AlertCircle,
    color: "text-amber-600",
  },
  {
    value: "NOT_APPLICABLE",
    label: "N/A",
    icon: AlertCircle,
    color: "text-gray-600",
  },
];

const NewChecklistSchema = z.object({
  category: z.enum([
    "CBS",
    "CHANNELS",
    "ACCESS_CONTROL",
    "BCP_DR",
    "VENDOR",
    "CHANGE_MGMT",
    "CYBER_SECURITY",
  ]),
  checklistName: z.string().min(1, "Checklist name is required"),
});

type NewChecklistValues = z.infer<typeof NewChecklistSchema>;

const OVERALL_RATING_OPTIONS = [
  { value: "SATISFACTORY", label: "Satisfactory" },
  { value: "NEEDS_IMPROVEMENT", label: "Needs Improvement" },
  { value: "UNSATISFACTORY", label: "Unsatisfactory" },
] as const;

export function ChecklistForm({ checklists, userId }: ChecklistFormProps) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = React.useState<string>(
    CATEGORIES[0].value,
  );
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingChecklist, setEditingChecklist] =
    React.useState<Checklist | null>(null);
  const [selectedChecklistId, setSelectedChecklistId] = React.useState<
    string | undefined
  >(undefined);
  const [overallRating, setOverallRating] = React.useState<
    "SATISFACTORY" | "NEEDS_IMPROVEMENT" | "UNSATISFACTORY" | undefined
  >(undefined);
  const [responses, setResponses] = React.useState<
    Record<string, ChecklistItem>
  >({});
  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<NewChecklistValues>({
    resolver: zodResolver(NewChecklistSchema as any),
    defaultValues: {
      category: "CBS",
      checklistName: "",
    },
  });

  const filteredChecklists = checklists.filter(
    (c) => c.category === selectedCategory,
  );

  // Determine active checklist: explicit selection > editing > first in category
  const activeChecklist = React.useMemo(() => {
    if (selectedChecklistId) {
      return (
        filteredChecklists.find((c) => c.id === selectedChecklistId) ?? null
      );
    }
    return editingChecklist || filteredChecklists[0] || null;
  }, [selectedChecklistId, editingChecklist, filteredChecklists]);

  // Reset checklist selector when category changes
  React.useEffect(() => {
    setSelectedChecklistId(undefined);
    setEditingChecklist(null);
    setOverallRating(undefined);
  }, [selectedCategory]);

  React.useEffect(() => {
    if (activeChecklist) {
      const initialResponses: Record<string, ChecklistItem> = {};
      activeChecklist.items.forEach((item) => {
        const key = item.id || item.question;
        initialResponses[key] = { ...item };
      });
      setResponses(initialResponses);
      // Populate overall rating from saved checklist data
      if (
        activeChecklist.overallRating === "SATISFACTORY" ||
        activeChecklist.overallRating === "NEEDS_IMPROVEMENT" ||
        activeChecklist.overallRating === "UNSATISFACTORY"
      ) {
        setOverallRating(activeChecklist.overallRating);
      } else {
        setOverallRating(undefined);
      }
    }
  }, [activeChecklist?.id]);

  async function handleCreateChecklist(data: NewChecklistValues) {
    const result = await manageIsAuditChecklist({
      category: data.category,
      checklistName: data.checklistName,
      items: [],
    });

    if (result.success) {
      toast.success("Checklist created");
      setDialogOpen(false);
      form.reset();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function handleSaveResponses(markComplete: boolean = false) {
    if (!activeChecklist) return;

    setIsSaving(true);

    const items = Object.values(responses);

    // Use manually selected rating if available; otherwise auto-calculate on complete
    let resolvedRating:
      | "SATISFACTORY"
      | "NEEDS_IMPROVEMENT"
      | "UNSATISFACTORY"
      | undefined = overallRating;

    if (markComplete && !resolvedRating) {
      const compliantCount = items.filter(
        (i) => i.response === "COMPLIANT",
      ).length;
      const totalResponded = items.filter(
        (i) => i.response && i.response !== "NOT_APPLICABLE",
      ).length;

      if (totalResponded > 0) {
        const complianceRate = compliantCount / totalResponded;
        if (complianceRate >= 0.9) {
          resolvedRating = "SATISFACTORY";
        } else if (complianceRate >= 0.7) {
          resolvedRating = "NEEDS_IMPROVEMENT";
        } else {
          resolvedRating = "UNSATISFACTORY";
        }
      }
    }

    const result = await manageIsAuditChecklist({
      checklistId: activeChecklist.id,
      category: activeChecklist.category as any,
      checklistName: activeChecklist.checklistName,
      items,
      completedById: markComplete ? userId : undefined,
      overallRating: resolvedRating,
    });

    setIsSaving(false);

    if (result.success) {
      toast.success(markComplete ? "Checklist completed" : "Progress saved");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  function updateResponse(
    itemKey: string,
    field: keyof ChecklistItem,
    value: string,
  ) {
    setResponses((prev) => ({
      ...prev,
      [itemKey]: {
        ...prev[itemKey],
        [field]: value,
      },
    }));
  }

  function calculateStats(checklist: Checklist) {
    const items = checklist.items;
    const total = items.length;
    const compliant = items.filter((i) => i.response === "COMPLIANT").length;
    const nonCompliant = items.filter(
      (i) => i.response === "NON_COMPLIANT",
    ).length;
    const partial = items.filter((i) => i.response === "PARTIAL").length;
    const notApplicable = items.filter(
      (i) => i.response === "NOT_APPLICABLE",
    ).length;
    const unanswered =
      total - compliant - nonCompliant - partial - notApplicable;

    const responded = total - unanswered - notApplicable;
    const complianceRate = responded > 0 ? (compliant / responded) * 100 : 0;

    return {
      total,
      compliant,
      nonCompliant,
      partial,
      notApplicable,
      unanswered,
      complianceRate,
    };
  }

  const stats = activeChecklist ? calculateStats(activeChecklist) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const count = checklists.filter(
              (c) => c.category === cat.value,
            ).length;
            return (
              <Button
                key={cat.value}
                variant={selectedCategory === cat.value ? "default" : "outline"}
                onClick={() => setSelectedCategory(cat.value)}
              >
                {cat.label} ({count})
              </Button>
            );
          })}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Checklist
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create IS Audit Checklist</DialogTitle>
              <DialogDescription>
                Create a new checklist for a specific category.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={form.handleSubmit(handleCreateChecklist)}
              className="space-y-4 py-4"
            >
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={form.watch("category")}
                  onValueChange={(value) =>
                    form.setValue("category", value as any)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="checklistName">Checklist Name *</Label>
                <Input id="checklistName" {...form.register("checklistName")} />
                {form.formState.errors.checklistName && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.checklistName.message}
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {activeChecklist ? (
        <>
          {/* Checklist Selector */}
          {filteredChecklists.length > 1 && (
            <div className="flex items-center gap-3">
              <ClipboardList className="text-muted-foreground h-5 w-5" />
              <Label className="text-sm font-medium whitespace-nowrap">
                Select Checklist
              </Label>
              <Select
                value={activeChecklist.id}
                onValueChange={(value) => {
                  setSelectedChecklistId(value);
                  setEditingChecklist(null);
                }}
              >
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Choose a checklist" />
                </SelectTrigger>
                <SelectContent>
                  {filteredChecklists.map((cl) => (
                    <SelectItem key={cl.id} value={cl.id}>
                      <div className="flex items-center gap-2">
                        <span>{cl.checklistName}</span>
                        {cl.completedAt && (
                          <Badge
                            variant="outline"
                            className="border-green-300 bg-green-50 text-xs text-green-700"
                          >
                            Completed
                          </Badge>
                        )}
                        {cl.overallRating && (
                          <Badge variant="secondary" className="text-xs">
                            {cl.overallRating.replace("_", " ")}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{activeChecklist.checklistName}</CardTitle>
                  <CardDescription>
                    {
                      CATEGORIES.find(
                        (c) => c.value === activeChecklist.category,
                      )?.label
                    }
                    {activeChecklist.engagement && (
                      <> • {activeChecklist.engagement.branch?.name}</>
                    )}
                    {activeChecklist.completedAt && (
                      <>
                        {" "}
                        • Completed{" "}
                        {format(activeChecklist.completedAt, "dd MMM yyyy")}
                      </>
                    )}
                  </CardDescription>
                </div>
                {stats && (
                  <div className="text-right">
                    <div className="text-3xl font-bold">
                      {Math.round(stats.complianceRate)}%
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        stats.complianceRate >= 90
                          ? "border-green-300 bg-green-100 text-green-800"
                          : stats.complianceRate >= 70
                            ? "border-amber-300 bg-amber-100 text-amber-800"
                            : "border-red-300 bg-red-100 text-red-800"
                      }
                    >
                      {activeChecklist.overallRating?.replace("_", " ") ||
                        (stats.complianceRate >= 90
                          ? "Strong"
                          : stats.complianceRate >= 70
                            ? "Adequate"
                            : "Weak")}
                    </Badge>
                  </div>
                )}
              </div>
            </CardHeader>
            {stats && (
              <CardContent>
                <div className="grid grid-cols-5 gap-4 text-center text-sm">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {stats.compliant}
                    </div>
                    <div className="text-muted-foreground">Compliant</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {stats.nonCompliant}
                    </div>
                    <div className="text-muted-foreground">Non-Compliant</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-600">
                      {stats.partial}
                    </div>
                    <div className="text-muted-foreground">Partial</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-600">
                      {stats.notApplicable}
                    </div>
                    <div className="text-muted-foreground">N/A</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.unanswered}
                    </div>
                    <div className="text-muted-foreground">Unanswered</div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardContent className="space-y-6 pt-6">
              {activeChecklist.items.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">
                  No checklist items yet. Add items to this checklist.
                </div>
              ) : (
                activeChecklist.items.map((item, idx) => {
                  const itemKey = item.id || item.question;
                  const currentResponse = responses[itemKey] || item;

                  return (
                    <div
                      key={itemKey}
                      className="space-y-3 border-b pb-6 last:border-0 last:pb-0"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <Label className="flex-1 text-sm leading-relaxed font-medium">
                          {idx + 1}. {item.question}
                        </Label>
                        <Select
                          value={currentResponse.response || ""}
                          onValueChange={(value) =>
                            updateResponse(itemKey, "response", value)
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {RESPONSE_STATUS.map((status) => {
                              const Icon = status.icon;
                              return (
                                <SelectItem
                                  key={status.value}
                                  value={status.value}
                                >
                                  <div className="flex items-center gap-2">
                                    <Icon
                                      className={`h-4 w-4 ${status.color}`}
                                    />
                                    {status.label}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">
                            Evidence
                          </Label>
                          <Textarea
                            placeholder="Evidence reference or description"
                            value={currentResponse.evidence || ""}
                            onChange={(e) =>
                              updateResponse(
                                itemKey,
                                "evidence",
                                e.target.value,
                              )
                            }
                            rows={2}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">
                            Remarks
                          </Label>
                          <Textarea
                            placeholder="Comments, findings, or observations"
                            value={currentResponse.remarks || ""}
                            onChange={(e) =>
                              updateResponse(itemKey, "remarks", e.target.value)
                            }
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Overall Rating */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium whitespace-nowrap">
                  Overall Rating
                </Label>
                <Select
                  value={overallRating ?? ""}
                  onValueChange={(value) =>
                    setOverallRating(
                      value as
                        | "SATISFACTORY"
                        | "NEEDS_IMPROVEMENT"
                        | "UNSATISFACTORY",
                    )
                  }
                  disabled={activeChecklist.completedAt !== null}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Select rating (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {OVERALL_RATING_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground text-xs">
                  If not selected, rating is auto-calculated on completion
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => handleSaveResponses(false)}
              disabled={isSaving || activeChecklist.completedAt !== null}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save Progress
            </Button>
            <Button
              onClick={() => handleSaveResponses(true)}
              disabled={isSaving || activeChecklist.completedAt !== null}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark as Complete
            </Button>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center">
            No checklists found for this category. Create a new checklist to get
            started.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
