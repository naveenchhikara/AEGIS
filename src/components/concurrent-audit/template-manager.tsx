"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  manageTemplate,
  deleteTemplate,
} from "@/actions/concurrent-audit/manage-template";
import { Button } from "@/components/ui/button";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Plus, Pencil, Trash2, X } from "lucide-react";

type Template = {
  id: string;
  scopeArea: string;
  name: string;
  description: string | null;
  checklistItems: any;
  isActive: boolean;
};

type ChecklistItem = {
  id?: string;
  particulars: string;
  riskCategory?: string;
  regulatoryRef?: string;
};

interface TemplateManagerProps {
  templates: Template[];
  canExecute: boolean;
}

const SCOPE_AREAS = [
  { value: "CASH", label: "Cash Management" },
  { value: "INVESTMENTS", label: "Investments" },
  { value: "ADVANCES", label: "Advances" },
  { value: "OFF_BS", label: "Off Balance Sheet" },
  { value: "DEPOSITS", label: "Deposits" },
  { value: "KYC", label: "KYC/AML" },
  { value: "EDP", label: "EDP/IT Systems" },
];

export function TemplateManager({
  templates,
  canExecute,
}: TemplateManagerProps) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group templates by scope area
  const templatesByArea = SCOPE_AREAS.map((area) => ({
    ...area,
    templates: templates.filter((t) => t.scopeArea === area.value),
  }));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const scopeArea = formData.get("scopeArea") as string;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    // Parse checklist items from form
    const checklistItems: ChecklistItem[] = [];
    let index = 0;
    while (formData.has(`particulars-${index}`)) {
      const particulars = formData.get(`particulars-${index}`) as string;
      const riskCategory = formData.get(`riskCategory-${index}`) as string;
      const regulatoryRef = formData.get(`regulatoryRef-${index}`) as string;

      if (particulars.trim()) {
        checklistItems.push({
          particulars,
          riskCategory: riskCategory || undefined,
          regulatoryRef: regulatoryRef || undefined,
        });
      }
      index++;
    }

    const result = await manageTemplate({
      templateId: editingTemplate?.id,
      scopeArea: scopeArea as any,
      name,
      description: description || undefined,
      checklistItems,
      isActive: true,
    });

    setIsSubmitting(false);

    if (result.success) {
      toast.success(
        editingTemplate
          ? "Template updated successfully"
          : "Template created successfully",
      );
      setIsCreateOpen(false);
      setEditingTemplate(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async (templateId: string) => {
    const result = await deleteTemplate(templateId);

    if (result.success) {
      toast.success("Template deleted successfully");
      setDeleteConfirm(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            Concurrent Audit Scope Templates
          </h2>
          <p className="text-muted-foreground text-sm">
            Manage checklists for 7 concurrent audit areas
          </p>
        </div>
        {canExecute && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Scope Template</DialogTitle>
                <DialogDescription>
                  Define checklist items for concurrent audit scope
                </DialogDescription>
              </DialogHeader>
              <TemplateForm
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                template={null}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-6">
        {templatesByArea.map((area) => (
          <div key={area.value}>
            <h3 className="mb-3 text-lg font-semibold">{area.label}</h3>
            {area.templates.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No templates for {area.label}
                  </p>
                  {canExecute && (
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Template
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {area.templates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">
                            {template.name}
                          </CardTitle>
                          {template.description && (
                            <CardDescription className="mt-1">
                              {template.description}
                            </CardDescription>
                          )}
                        </div>
                        {canExecute && (
                          <div className="flex gap-2">
                            <Dialog
                              open={editingTemplate?.id === template.id}
                              onOpenChange={(open) => {
                                if (!open) setEditingTemplate(null);
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingTemplate(template)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Edit Template</DialogTitle>
                                  <DialogDescription>
                                    Update checklist items and details
                                  </DialogDescription>
                                </DialogHeader>
                                <TemplateForm
                                  onSubmit={handleSubmit}
                                  isSubmitting={isSubmitting}
                                  template={template}
                                />
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(template.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-muted-foreground text-sm">
                        {Array.isArray(template.checklistItems)
                          ? template.checklistItems.length
                          : 0}{" "}
                        checklist items
                      </div>
                      <div className="mt-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            template.isActive
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-50 text-gray-700"
                          }`}
                        >
                          {template.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TemplateForm({
  onSubmit,
  isSubmitting,
  template,
}: {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
  template: Template | null;
}) {
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(
    template?.checklistItems || [
      { particulars: "", riskCategory: "", regulatoryRef: "" },
    ],
  );

  const addChecklistItem = () => {
    setChecklistItems([
      ...checklistItems,
      { particulars: "", riskCategory: "", regulatoryRef: "" },
    ]);
  };

  const removeChecklistItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="scopeArea">Scope Area</Label>
        <Select
          name="scopeArea"
          defaultValue={template?.scopeArea}
          disabled={!!template}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select scope area" />
          </SelectTrigger>
          <SelectContent>
            {SCOPE_AREAS.map((area) => (
              <SelectItem key={area.value} value={area.value}>
                {area.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="name">Template Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={template?.name}
          placeholder="e.g., Cash Handling Checklist"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={template?.description || ""}
          placeholder="Brief description of this template..."
          rows={2}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Checklist Items</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addChecklistItem}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>

        {checklistItems.map((item, index) => (
          <Card key={index}>
            <CardContent className="pt-4">
              <div className="mb-3 flex gap-2">
                <div className="flex-1 space-y-2">
                  <Label>Particulars *</Label>
                  <Input
                    name={`particulars-${index}`}
                    defaultValue={item.particulars}
                    placeholder="What to check/audit"
                    required
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeChecklistItem(index)}
                  disabled={checklistItems.length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Risk Category</Label>
                  <Input
                    name={`riskCategory-${index}`}
                    defaultValue={item.riskCategory}
                    placeholder="e.g., Operational"
                  />
                </div>
                <div>
                  <Label>Regulatory Reference</Label>
                  <Input
                    name={`regulatoryRef-${index}`}
                    defaultValue={item.regulatoryRef}
                    placeholder="e.g., RBI/2023/45"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : template ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
