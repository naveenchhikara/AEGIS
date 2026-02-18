"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { rapidEntryObservations } from "@/actions/concurrent-audit/rapid-entry";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, X, FileText } from "lucide-react";

type Template = {
  id: string;
  scopeArea: string;
  name: string;
  checklistItems: any;
};

type Branch = {
  id: string;
  name: string;
  code: string | null;
};

type ObservationRow = {
  id: string;
  particulars: string;
  finding: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommendation: string;
};

interface RapidEntryWorkbenchProps {
  templates: Template[];
  branches: Branch[];
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

export function RapidEntryWorkbench({
  templates,
  branches,
  canExecute,
}: RapidEntryWorkbenchProps) {
  const [branchId, setBranchId] = useState<string>("");
  const [scopeArea, setScopeArea] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [observations, setObservations] = useState<ObservationRow[]>([
    {
      id: crypto.randomUUID(),
      particulars: "",
      finding: "",
      severity: "MEDIUM",
      recommendation: "",
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter templates by scope area
  const filteredTemplates = templates.filter((t) => t.scopeArea === scopeArea);

  // Load template checklist items when template is selected
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find((t) => t.id === selectedTemplateId);
      if (template && Array.isArray(template.checklistItems)) {
        const newObservations: ObservationRow[] = template.checklistItems.map(
          (item: any) => ({
            id: crypto.randomUUID(),
            particulars: item.particulars || "",
            finding: "",
            severity: "MEDIUM" as const,
            recommendation: "",
          })
        );
        setObservations(
          newObservations.length > 0
            ? newObservations
            : [
                {
                  id: crypto.randomUUID(),
                  particulars: "",
                  finding: "",
                  severity: "MEDIUM",
                  recommendation: "",
                },
              ]
        );
      }
    }
  }, [selectedTemplateId, templates]);

  const addObservationRow = () => {
    setObservations([
      ...observations,
      {
        id: crypto.randomUUID(),
        particulars: "",
        finding: "",
        severity: "MEDIUM",
        recommendation: "",
      },
    ]);
  };

  const removeObservationRow = (id: string) => {
    if (observations.length > 1) {
      setObservations(observations.filter((obs) => obs.id !== id));
    }
  };

  const updateObservation = (
    id: string,
    field: keyof ObservationRow,
    value: string
  ) => {
    setObservations(
      observations.map((obs) => (obs.id === id ? { ...obs, [field]: value } : obs))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!branchId) {
      toast.error("Please select a branch");
      return;
    }

    if (!scopeArea) {
      toast.error("Please select a scope area");
      return;
    }

    // Validate that at least one observation has content
    const validObservations = observations.filter(
      (obs) => obs.particulars.trim() && obs.finding.trim()
    );

    if (validObservations.length === 0) {
      toast.error("Please add at least one observation with particulars and finding");
      return;
    }

    setIsSubmitting(true);

    const result = await rapidEntryObservations({
      branchId,
      scopeArea,
      observations: validObservations.map((obs) => ({
        particulars: obs.particulars,
        finding: obs.finding,
        severity: obs.severity,
        recommendation: obs.recommendation || undefined,
      })),
    });

    setIsSubmitting(false);

    if (result.success) {
      toast.success(`Created ${result.data.created} observations successfully`);
      // Reset form
      setObservations([
        {
          id: crypto.randomUUID(),
          particulars: "",
          finding: "",
          severity: "MEDIUM",
          recommendation: "",
        },
      ]);
      setSelectedTemplateId("");
    } else {
      toast.error(result.error);
    }
  };

  if (!canExecute) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          You do not have permission to create concurrent audit observations.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Rapid Observation Entry</h2>
        <p className="text-sm text-muted-foreground">
          Batch entry for concurrent audit findings
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Section: Branch and Scope Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audit Context</CardTitle>
            <CardDescription>Select branch and scope area</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="branch">Branch *</Label>
                <Select value={branchId} onValueChange={setBranchId} required>
                  <SelectTrigger id="branch">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.code ? `${branch.code} - ` : ""}
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="scopeArea">Scope Area *</Label>
                <Select
                  value={scopeArea}
                  onValueChange={(value) => {
                    setScopeArea(value);
                    setSelectedTemplateId("");
                  }}
                  required
                >
                  <SelectTrigger id="scopeArea">
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
            </div>

            {scopeArea && filteredTemplates.length > 0 && (
              <div>
                <Label htmlFor="template">Template (Optional)</Label>
                <Select
                  value={selectedTemplateId}
                  onValueChange={setSelectedTemplateId}
                >
                  <SelectTrigger id="template">
                    <SelectValue placeholder="Use template to pre-fill checklist" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center">
                          <FileText className="mr-2 h-4 w-4" />
                          {template.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplateId && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Checklist items loaded. Fill in findings and severity for each item.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Observation Entry Rows */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-base">Observations</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addObservationRow}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Row
            </Button>
          </div>

          {observations.map((obs, index) => (
            <Card key={obs.id}>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-muted-foreground">
                      Observation #{index + 1}
                    </span>
                    {observations.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeObservationRow(obs.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label>Particulars *</Label>
                      <Input
                        value={obs.particulars}
                        onChange={(e) =>
                          updateObservation(obs.id, "particulars", e.target.value)
                        }
                        placeholder="What was checked/audited"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label>Finding *</Label>
                      <Textarea
                        value={obs.finding}
                        onChange={(e) =>
                          updateObservation(obs.id, "finding", e.target.value)
                        }
                        placeholder="Describe the observation/finding"
                        rows={3}
                        required
                      />
                    </div>

                    <div>
                      <Label>Severity *</Label>
                      <Select
                        value={obs.severity}
                        onValueChange={(value) =>
                          updateObservation(
                            obs.id,
                            "severity",
                            value as ObservationRow["severity"]
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="CRITICAL">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Recommendation (Optional)</Label>
                      <Input
                        value={obs.recommendation}
                        onChange={(e) =>
                          updateObservation(obs.id, "recommendation", e.target.value)
                        }
                        placeholder="Suggested action"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setObservations([
                {
                  id: crypto.randomUUID(),
                  particulars: "",
                  finding: "",
                  severity: "MEDIUM",
                  recommendation: "",
                },
              ]);
              setSelectedTemplateId("");
            }}
          >
            Reset
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : `Create ${observations.length} Observations`}
          </Button>
        </div>
      </form>
    </div>
  );
}
