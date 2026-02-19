"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2, CheckCircle2, XCircle, AlertCircle } from "@/lib/icons";
import { toast } from "sonner";
import { manageIsAuditChecklist } from "@/actions/investment/manage-is-audit";

const CBS_PARAMETER_CHECKS = {
  INTEREST_RATES: [
    {
      id: "ir01",
      question: "Interest rates on deposits match approved rate chart",
      riskLevel: "HIGH",
    },
    {
      id: "ir02",
      question: "Interest rates on advances match sanction terms",
      riskLevel: "HIGH",
    },
    {
      id: "ir03",
      question: "Penal interest rates correctly configured",
      riskLevel: "MEDIUM",
    },
    {
      id: "ir04",
      question: "Interest calculation methodology (360/365 days) correct",
      riskLevel: "HIGH",
    },
    {
      id: "ir05",
      question: "NPA interest reversal/non-accrual configured per IRAC norms",
      riskLevel: "CRITICAL",
    },
  ],
  PRODUCT_MASTERS: [
    {
      id: "pm01",
      question: "Loan product codes match approved product menu",
      riskLevel: "HIGH",
    },
    {
      id: "pm02",
      question: "Deposit product parameters match policy",
      riskLevel: "HIGH",
    },
    {
      id: "pm03",
      question: "Tenor/maturity limits correctly set per product",
      riskLevel: "MEDIUM",
    },
    {
      id: "pm04",
      question: "Auto-renewal parameters for deposits correctly configured",
      riskLevel: "MEDIUM",
    },
    {
      id: "pm05",
      question: "Charge/fee master matches approved schedule",
      riskLevel: "MEDIUM",
    },
  ],
  PRIVILEGES: [
    {
      id: "pr01",
      question: "Maker-checker controls active for all financial transactions",
      riskLevel: "CRITICAL",
    },
    {
      id: "pr02",
      question: "User access matrix matches role-based access policy",
      riskLevel: "CRITICAL",
    },
    {
      id: "pr03",
      question: "Dormant user accounts disabled (>90 days inactive)",
      riskLevel: "HIGH",
    },
    {
      id: "pr04",
      question: "Super-user/admin access restricted and logged",
      riskLevel: "CRITICAL",
    },
    {
      id: "pr05",
      question: "Branch-level access controls prevent cross-branch operations",
      riskLevel: "HIGH",
    },
  ],
  DAY_END: [
    {
      id: "de01",
      question:
        "Day-end batch processes complete successfully with reconciliation",
      riskLevel: "HIGH",
    },
    {
      id: "de02",
      question: "EOD reports generated and reviewed daily",
      riskLevel: "MEDIUM",
    },
    {
      id: "de03",
      question: "Exception reports generated for out-of-policy transactions",
      riskLevel: "HIGH",
    },
    {
      id: "de04",
      question: "Backup procedures executed post day-end",
      riskLevel: "HIGH",
    },
    {
      id: "de05",
      question: "Inter-branch reconciliation automated and monitored",
      riskLevel: "MEDIUM",
    },
  ],
};

const RISK_LEVEL_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 border-red-300",
  HIGH: "bg-orange-100 text-orange-800 border-orange-300",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
};

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

type CheckItem = {
  id: string;
  question: string;
  response?: string;
  evidence?: string;
  remarks?: string;
  riskLevel: string;
};

export function CbsParameterAudit({ userId }: { userId: string }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = React.useState(false);
  const [responses, setResponses] = React.useState<Record<string, CheckItem>>(
    {},
  );
  const [activeCategory, setActiveCategory] = React.useState("INTEREST_RATES");

  // Initialize responses
  React.useEffect(() => {
    const initial: Record<string, CheckItem> = {};
    Object.entries(CBS_PARAMETER_CHECKS).forEach(([category, items]) => {
      items.forEach((item) => {
        initial[item.id] = { ...item };
      });
    });
    setResponses(initial);
  }, []);

  function updateResponse(
    itemId: string,
    field: keyof CheckItem,
    value: string,
  ) {
    setResponses((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  }

  function calculateCategoryStats(
    categoryKey: keyof typeof CBS_PARAMETER_CHECKS,
  ) {
    const items = CBS_PARAMETER_CHECKS[categoryKey];
    const total = items.length;
    const compliant = items.filter(
      (i) => responses[i.id]?.response === "COMPLIANT",
    ).length;
    const nonCompliant = items.filter(
      (i) => responses[i.id]?.response === "NON_COMPLIANT",
    ).length;
    const partial = items.filter(
      (i) => responses[i.id]?.response === "PARTIAL",
    ).length;
    const notApplicable = items.filter(
      (i) => responses[i.id]?.response === "NOT_APPLICABLE",
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

  function calculateOverallStats() {
    const allItems = Object.values(CBS_PARAMETER_CHECKS).flat();
    const total = allItems.length;
    const compliant = allItems.filter(
      (i) => responses[i.id]?.response === "COMPLIANT",
    ).length;
    const nonCompliant = allItems.filter(
      (i) => responses[i.id]?.response === "NON_COMPLIANT",
    ).length;
    const partial = allItems.filter(
      (i) => responses[i.id]?.response === "PARTIAL",
    ).length;
    const notApplicable = allItems.filter(
      (i) => responses[i.id]?.response === "NOT_APPLICABLE",
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

  async function handleSave(markComplete: boolean = false) {
    setIsSaving(true);

    const allItems = Object.values(responses).map((item) => ({
      id: item.id,
      question: item.question,
      response: item.response as any,
      evidence: item.evidence,
      remarks: item.remarks,
    }));

    // Calculate overall rating if marking complete
    let overallRating:
      | "SATISFACTORY"
      | "NEEDS_IMPROVEMENT"
      | "UNSATISFACTORY"
      | undefined;
    if (markComplete) {
      const stats = calculateOverallStats();
      if (stats.complianceRate >= 90) {
        overallRating = "SATISFACTORY";
      } else if (stats.complianceRate >= 70) {
        overallRating = "NEEDS_IMPROVEMENT";
      } else {
        overallRating = "UNSATISFACTORY";
      }
    }

    const result = await manageIsAuditChecklist({
      category: "CBS",
      checklistName: "CBS Parameter Audit",
      items: allItems,
      completedById: markComplete ? userId : undefined,
      overallRating,
    });

    setIsSaving(false);

    if (result.success) {
      toast.success(markComplete ? "CBS audit completed" : "Progress saved");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const overallStats = calculateOverallStats();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>CBS Parameter Audit</CardTitle>
              <CardDescription>
                Core Banking System parameter verification and compliance
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">
                {Math.round(overallStats.complianceRate)}%
              </div>
              <Badge
                variant="outline"
                className={
                  overallStats.complianceRate >= 90
                    ? "border-green-300 bg-green-100 text-green-800"
                    : overallStats.complianceRate >= 70
                      ? "border-amber-300 bg-amber-100 text-amber-800"
                      : "border-red-300 bg-red-100 text-red-800"
                }
              >
                {overallStats.complianceRate >= 90
                  ? "Satisfactory"
                  : overallStats.complianceRate >= 70
                    ? "Needs Improvement"
                    : "Unsatisfactory"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4 text-center text-sm">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {overallStats.compliant}
              </div>
              <div className="text-muted-foreground">Compliant</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {overallStats.nonCompliant}
              </div>
              <div className="text-muted-foreground">Non-Compliant</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">
                {overallStats.partial}
              </div>
              <div className="text-muted-foreground">Partial</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">
                {overallStats.notApplicable}
              </div>
              <div className="text-muted-foreground">N/A</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {overallStats.unanswered}
              </div>
              <div className="text-muted-foreground">Unanswered</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs
        value={activeCategory}
        onValueChange={setActiveCategory}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4">
          {Object.entries(CBS_PARAMETER_CHECKS).map(([key, items]) => {
            const stats = calculateCategoryStats(
              key as keyof typeof CBS_PARAMETER_CHECKS,
            );
            return (
              <TabsTrigger key={key} value={key} className="relative">
                {key.replace("_", " ")}
                <Badge
                  variant="outline"
                  className="ml-2 text-xs"
                  style={{
                    backgroundColor:
                      stats.complianceRate >= 90
                        ? "#dcfce7"
                        : stats.complianceRate >= 70
                          ? "#fef3c7"
                          : "#fee2e2",
                  }}
                >
                  {stats.compliant}/{stats.total}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.entries(CBS_PARAMETER_CHECKS).map(([categoryKey, items]) => (
          <TabsContent
            key={categoryKey}
            value={categoryKey}
            className="space-y-4"
          >
            <Card>
              <CardContent className="space-y-6 pt-6">
                {items.map((item, idx) => {
                  const currentResponse = responses[item.id] || item;

                  return (
                    <div
                      key={item.id}
                      className="space-y-3 border-b pb-6 last:border-0 last:pb-0"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm leading-relaxed font-medium">
                              {idx + 1}. {item.question}
                            </Label>
                          </div>
                          <Badge
                            variant="outline"
                            className={RISK_LEVEL_COLORS[item.riskLevel] ?? ""}
                          >
                            {item.riskLevel} RISK
                          </Badge>
                        </div>
                        <Select
                          value={currentResponse.response || ""}
                          onValueChange={(value) =>
                            updateResponse(item.id, "response", value)
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
                                item.id,
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
                              updateResponse(item.id, "remarks", e.target.value)
                            }
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => handleSave(false)}
          disabled={isSaving}
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Save Progress
        </Button>
        <Button onClick={() => handleSave(true)} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Complete CBS Audit
        </Button>
      </div>
    </div>
  );
}
