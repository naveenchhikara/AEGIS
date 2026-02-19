"use client";

import * as React from "react";
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Download, AlertTriangle, CheckCircle2 } from "@/lib/icons";
import { toast } from "sonner";

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
  completedAt: Date | null;
  overallRating: string | null;
};

interface TechControlEvidenceProps {
  checklists: Checklist[];
}

type GapItem = {
  category: string;
  checklistName: string;
  item: string;
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  evidenceStatus: "COLLECTED" | "PENDING" | "NOT_AVAILABLE";
  remediationPlan?: string;
  targetDate?: string;
  owner?: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  CBS: "Core Banking System",
  CHANNELS: "Channels (ATM, Mobile, Internet)",
  ACCESS_CONTROL: "Access Control & Authentication",
  BCP_DR: "Business Continuity & DR",
  VENDOR: "Vendor Management",
  CHANGE_MGMT: "Change Management",
  CYBER_SECURITY: "Cyber Security",
};

const RISK_LEVEL_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 border-red-300",
  HIGH: "bg-orange-100 text-orange-800 border-orange-300",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
  LOW: "bg-green-100 text-green-800 border-green-300",
};

const EVIDENCE_STATUS_COLORS: Record<string, string> = {
  COLLECTED: "bg-green-100 text-green-800 border-green-300",
  PENDING: "bg-amber-100 text-amber-800 border-amber-300",
  NOT_AVAILABLE: "bg-red-100 text-red-800 border-red-300",
};

export function TechControlEvidence({ checklists }: TechControlEvidenceProps) {
  const [selectedCategory, setSelectedCategory] = React.useState<string>("ALL");
  const [gapItems, setGapItems] = React.useState<Record<string, GapItem>>({});

  // Extract gaps from checklists
  React.useEffect(() => {
    const gaps: Record<string, GapItem> = {};

    checklists.forEach((checklist) => {
      const items = Array.isArray(checklist.items) ? checklist.items : [];
      items.forEach((item: any, idx: number) => {
        if (item.response === "NON_COMPLIANT" || item.response === "PARTIAL") {
          const key = `${checklist.id}-${idx}`;

          // Determine risk level based on category and keywords
          let riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
          const lowerQuestion = item.question.toLowerCase();

          if (
            lowerQuestion.includes("critical") ||
            lowerQuestion.includes("maker-checker") ||
            lowerQuestion.includes("admin access") ||
            lowerQuestion.includes("encryption") ||
            checklist.category === "CBS"
          ) {
            riskLevel = "CRITICAL";
          } else if (
            lowerQuestion.includes("password") ||
            lowerQuestion.includes("authentication") ||
            lowerQuestion.includes("backup") ||
            checklist.category === "ACCESS_CONTROL"
          ) {
            riskLevel = "HIGH";
          }

          // Determine evidence status
          const evidenceStatus: "COLLECTED" | "PENDING" | "NOT_AVAILABLE" =
            item.evidence ? "COLLECTED" : "PENDING";

          gaps[key] = {
            category: checklist.category,
            checklistName: checklist.checklistName,
            item: item.question,
            riskLevel,
            evidenceStatus,
            remediationPlan: item.remarks || "",
            targetDate: "",
            owner: "",
          };
        }
      });
    });

    setGapItems(gaps);
  }, [checklists]);

  function updateGapItem(key: string, field: keyof GapItem, value: string) {
    setGapItems((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  }

  function calculateGapMatrix() {
    const matrix: Record<string, Record<string, number>> = {};

    Object.values(CATEGORY_LABELS).forEach((category) => {
      matrix[category] = {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
      };
    });

    Object.values(gapItems).forEach((gap) => {
      const categoryLabel = CATEGORY_LABELS[gap.category] || gap.category;
      matrix[categoryLabel][gap.riskLevel]++;
    });

    return matrix;
  }

  function calculateSummaryStats() {
    const allGaps = Object.values(gapItems);
    const totalGaps = allGaps.length;
    const gapsWithEvidence = allGaps.filter(
      (g) => g.evidenceStatus === "COLLECTED",
    ).length;
    const gapsWithoutEvidence = allGaps.filter(
      (g) =>
        g.evidenceStatus === "PENDING" || g.evidenceStatus === "NOT_AVAILABLE",
    ).length;
    const openGaps = allGaps.filter(
      (g) => !g.remediationPlan || g.remediationPlan === "",
    ).length;
    const inProgress = allGaps.filter(
      (g) => g.remediationPlan && g.remediationPlan !== "",
    ).length;

    return {
      totalGaps,
      gapsWithEvidence,
      gapsWithoutEvidence,
      openGaps,
      inProgress,
    };
  }

  function handleExportGapReport() {
    // Generate CSV-like data
    const reportData = Object.values(gapItems)
      .map(
        (gap) =>
          `${CATEGORY_LABELS[gap.category]},${gap.item},${gap.riskLevel},${gap.evidenceStatus},${gap.remediationPlan || ""},${gap.targetDate || ""},${gap.owner || ""}`,
      )
      .join("\n");

    const csvContent =
      "Category,Control Item,Risk Level,Evidence Status,Remediation Plan,Target Date,Owner\n" +
      reportData;

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gap-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success("Gap report exported");
  }

  const gapMatrix = calculateGapMatrix();
  const stats = calculateSummaryStats();

  const filteredGaps =
    selectedCategory === "ALL"
      ? Object.entries(gapItems)
      : Object.entries(gapItems).filter(
          ([_, gap]) => CATEGORY_LABELS[gap.category] === selectedCategory,
        );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Gaps Found</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {stats.totalGaps}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Gaps with Evidence</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {stats.gapsWithEvidence}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Evidence Pending</CardDescription>
            <CardTitle className="text-3xl text-amber-600">
              {stats.gapsWithoutEvidence}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Remediation In Progress</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              {stats.inProgress}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="evidence" className="space-y-4">
        <TabsList>
          <TabsTrigger value="evidence">Evidence Collection</TabsTrigger>
          <TabsTrigger value="gaps">Gap Analysis</TabsTrigger>
          <TabsTrigger value="matrix">Gap Matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="evidence" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Evidence Collection</CardTitle>
                  <CardDescription>
                    Attach evidence for non-compliant items
                  </CardDescription>
                </div>
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Categories</SelectItem>
                    {Object.values(CATEGORY_LABELS).map((label) => (
                      <SelectItem key={label} value={label}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredGaps.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">
                  <CheckCircle2 className="mx-auto mb-2 h-12 w-12 text-green-600" />
                  <div>No gaps found. All controls are compliant!</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredGaps.map(([key, gap]) => (
                    <div key={key} className="space-y-3 rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <Badge variant="outline">
                              {CATEGORY_LABELS[gap.category]}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={RISK_LEVEL_COLORS[gap.riskLevel]}
                            >
                              {gap.riskLevel}
                            </Badge>
                          </div>
                          <div className="text-sm font-medium">{gap.item}</div>
                          <div className="text-muted-foreground mt-1 text-xs">
                            {gap.checklistName}
                          </div>
                        </div>
                        <Select
                          value={gap.evidenceStatus}
                          onValueChange={(value) =>
                            updateGapItem(key, "evidenceStatus", value)
                          }
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="COLLECTED">Collected</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="NOT_AVAILABLE">
                              Not Available
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">
                          Evidence Reference / Notes
                        </Label>
                        <Textarea
                          placeholder="Enter evidence reference, file path, or notes"
                          value={gap.remediationPlan || ""}
                          onChange={(e) =>
                            updateGapItem(
                              key,
                              "remediationPlan",
                              e.target.value,
                            )
                          }
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gaps" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gap Detail & Remediation</CardTitle>
                  <CardDescription>
                    Track remediation plans and target dates
                  </CardDescription>
                </div>
                <Button onClick={handleExportGapReport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Gap Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Control Item</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Evidence</TableHead>
                    <TableHead>Remediation Plan</TableHead>
                    <TableHead>Target Date</TableHead>
                    <TableHead>Owner</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGaps.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No gaps to display.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredGaps.map(([key, gap]) => (
                      <TableRow key={key}>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {CATEGORY_LABELS[gap.category]}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="text-sm">{gap.item}</div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={RISK_LEVEL_COLORS[gap.riskLevel]}
                          >
                            {gap.riskLevel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              EVIDENCE_STATUS_COLORS[gap.evidenceStatus]
                            }
                          >
                            {gap.evidenceStatus.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <Textarea
                            placeholder="Remediation plan"
                            value={gap.remediationPlan || ""}
                            onChange={(e) =>
                              updateGapItem(
                                key,
                                "remediationPlan",
                                e.target.value,
                              )
                            }
                            rows={2}
                            className="text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={gap.targetDate || ""}
                            onChange={(e) =>
                              updateGapItem(key, "targetDate", e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Owner"
                            value={gap.owner || ""}
                            onChange={(e) =>
                              updateGapItem(key, "owner", e.target.value)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matrix" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gap Matrix</CardTitle>
              <CardDescription>
                Gap density by category and risk level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Critical</TableHead>
                    <TableHead className="text-center">High</TableHead>
                    <TableHead className="text-center">Medium</TableHead>
                    <TableHead className="text-center">Low</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(gapMatrix).map(([category, risks]) => {
                    const total =
                      risks.CRITICAL + risks.HIGH + risks.MEDIUM + risks.LOW;
                    return (
                      <TableRow key={category}>
                        <TableCell className="font-medium">
                          {category}
                        </TableCell>
                        <TableCell className="text-center">
                          {risks.CRITICAL > 0 ? (
                            <Badge className="bg-red-600">
                              {risks.CRITICAL}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {risks.HIGH > 0 ? (
                            <Badge className="bg-orange-600">
                              {risks.HIGH}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {risks.MEDIUM > 0 ? (
                            <Badge className="bg-amber-600">
                              {risks.MEDIUM}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {risks.LOW > 0 ? (
                            <Badge className="bg-green-600">{risks.LOW}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          {total > 0 ? total : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                High Priority Gaps
              </CardTitle>
              <CardDescription>
                Critical and high-risk items requiring immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(gapItems)
                  .filter(
                    ([_, gap]) =>
                      gap.riskLevel === "CRITICAL" || gap.riskLevel === "HIGH",
                  )
                  .map(([key, gap]) => (
                    <div
                      key={key}
                      className="rounded-r border-l-4 border-red-600 bg-red-50 py-2 pl-4"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={RISK_LEVEL_COLORS[gap.riskLevel]}
                        >
                          {gap.riskLevel}
                        </Badge>
                        <span className="text-sm font-medium">
                          {CATEGORY_LABELS[gap.category]}
                        </span>
                      </div>
                      <div className="text-sm">{gap.item}</div>
                      {gap.remediationPlan && (
                        <div className="text-muted-foreground mt-1 text-xs">
                          Plan: {gap.remediationPlan}
                        </div>
                      )}
                    </div>
                  ))}
                {Object.entries(gapItems).filter(
                  ([_, gap]) =>
                    gap.riskLevel === "CRITICAL" || gap.riskLevel === "HIGH",
                ).length === 0 && (
                  <div className="text-muted-foreground py-8 text-center">
                    <CheckCircle2 className="mx-auto mb-2 h-12 w-12 text-green-600" />
                    <div>No critical or high-risk gaps found!</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
