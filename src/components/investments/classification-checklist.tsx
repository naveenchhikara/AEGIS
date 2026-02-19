"use client";

import * as React from "react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Save, CheckCircle2, Loader2 } from "@/lib/icons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { saveClassificationChecklist } from "@/actions/investment/save-classification-checklist";
import { toast } from "sonner";

interface InvestmentRecord {
  id: string;
  securityType: string;
  classification: string;
  faceValue: any;
  bookValue: any;
}

interface ClassificationChecklistProps {
  investments: InvestmentRecord[];
  engagementId?: string;
}

interface ChecklistItem {
  id: string;
  question: string;
  category: string;
  compliant: boolean;
  evidence: string;
  remarks: string;
}

const CLASSIFICATION_CHECKS = [
  {
    id: "htmLimit",
    question: "HTM portfolio does not exceed 25% of total investments (or applicable limit)",
    category: "HTM",
  },
  {
    id: "htmSale",
    question: "No sale from HTM except with RBI approval or per policy",
    category: "HTM",
  },
  {
    id: "htmValuation",
    question: "HTM securities valued at acquisition cost (amortized)",
    category: "HTM",
  },
  {
    id: "hftIntent",
    question: "HFT securities held for trading, sold within 90 days",
    category: "HFT",
  },
  {
    id: "hftMtm",
    question: "HFT portfolio marked-to-market at monthly intervals",
    category: "HFT",
  },
  {
    id: "afsReclass",
    question: "AFS reclassification only at start of accounting year",
    category: "AFS",
  },
  {
    id: "afsValuation",
    question: "AFS securities marked-to-market quarterly",
    category: "AFS",
  },
  {
    id: "depreciationProvision",
    question: "Depreciation provision created for AFS/HFT net losses",
    category: "PROVISION",
  },
  {
    id: "shiftingNorms",
    question: "Inter-category shifting complies with RBI circular norms",
    category: "GENERAL",
  },
  {
    id: "boardApproval",
    question: "Board-approved investment policy reviewed annually",
    category: "GENERAL",
  },
];

export function ClassificationChecklist({ investments, engagementId }: ClassificationChecklistProps) {
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(
    CLASSIFICATION_CHECKS.map((check) => ({
      ...check,
      compliant: false,
      evidence: "",
      remarks: "",
    }))
  );
  const [isSaving, setIsSaving] = useState(false);

  // Calculate portfolio metrics
  const totalInvestment = investments.reduce((sum, inv) => sum + Number(inv.faceValue), 0);
  const htmTotal = investments
    .filter((inv) => inv.classification === "HTM")
    .reduce((sum, inv) => sum + Number(inv.faceValue), 0);
  const hftTotal = investments
    .filter((inv) => inv.classification === "HFT")
    .reduce((sum, inv) => sum + Number(inv.faceValue), 0);
  const afsTotal = investments
    .filter((inv) => inv.classification === "AFS")
    .reduce((sum, inv) => sum + Number(inv.faceValue), 0);

  const htmPercent = totalInvestment > 0 ? (htmTotal / totalInvestment) * 100 : 0;

  // Auto-populate HTM limit check
  React.useEffect(() => {
    setChecklistItems((prev) =>
      prev.map((item) => {
        if (item.id === "htmLimit") {
          const compliant = htmPercent <= 25;
          return {
            ...item,
            compliant,
            evidence: `HTM portfolio: ${htmPercent.toFixed(2)}% of total investments`,
          };
        }
        return item;
      })
    );
  }, [htmPercent]);

  const handleCheckChange = (id: string, checked: boolean) => {
    setChecklistItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, compliant: checked } : item))
    );
  };

  const handleEvidenceChange = (id: string, evidence: string) => {
    setChecklistItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, evidence } : item))
    );
  };

  const handleRemarksChange = (id: string, remarks: string) => {
    setChecklistItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, remarks } : item))
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await saveClassificationChecklist({
        engagementId,
        checklistItems,
        overallRating,
        period: `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
      });

      if (result.success) {
        toast.success("Classification checklist saved successfully");
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to save checklist. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const compliantCount = checklistItems.filter((item) => item.compliant).length;
  const overallRating =
    compliantCount === checklistItems.length
      ? "FULL_COMPLIANCE"
      : compliantCount >= checklistItems.length * 0.8
      ? "SUBSTANTIAL_COMPLIANCE"
      : compliantCount >= checklistItems.length * 0.5
      ? "PARTIAL_COMPLIANCE"
      : "NON_COMPLIANCE";

  const categories = ["HTM", "HFT", "AFS", "PROVISION", "GENERAL"];

  return (
    <div className="space-y-6">
      {/* Regulatory Reference */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>HTM/HFT/AFS Classification Norms</AlertTitle>
        <AlertDescription>
          Investment classification must comply with RBI Master Circular on Investments. This
          checklist covers key requirements for Held to Maturity (HTM), Held for Trading (HFT), and
          Available for Sale (AFS) categories, including valuation, shifting norms, and provisioning
          requirements.
        </AlertDescription>
      </Alert>

      {/* Portfolio Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">HTM Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(htmTotal / 10000000).toFixed(2)}Cr</div>
            <p className="text-xs text-muted-foreground">
              {htmPercent.toFixed(2)}% of total
              {htmPercent > 25 && <span className="text-red-600 font-semibold"> (Over limit)</span>}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">HFT Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(hftTotal / 10000000).toFixed(2)}Cr</div>
            <p className="text-xs text-muted-foreground">
              {totalInvestment > 0 ? ((hftTotal / totalInvestment) * 100).toFixed(2) : "0.00"}% of
              total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">AFS Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(afsTotal / 10000000).toFixed(2)}Cr</div>
            <p className="text-xs text-muted-foreground">
              {totalInvestment > 0 ? ((afsTotal / totalInvestment) * 100).toFixed(2) : "0.00"}% of
              total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Compliance Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {compliantCount}/{checklistItems.length}
            </div>
            <Badge
              variant="outline"
              className={
                overallRating === "FULL_COMPLIANCE"
                  ? "bg-green-100 text-green-800 border-green-300"
                  : overallRating === "SUBSTANTIAL_COMPLIANCE"
                  ? "bg-blue-100 text-blue-800 border-blue-300"
                  : overallRating === "PARTIAL_COMPLIANCE"
                  ? "bg-amber-100 text-amber-800 border-amber-300"
                  : "bg-red-100 text-red-800 border-red-300"
              }
            >
              {overallRating.replace("_", " ")}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Checklist by Category */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Classification Audit Checklist</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Review investment classification compliance with RBI norms
              </p>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isSaving ? "Saving..." : "Save Checklist"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {categories.map((category) => {
              const categoryItems = checklistItems.filter((item) => item.category === category);
              const categoryCompliant = categoryItems.filter((item) => item.compliant).length;

              return (
                <AccordionItem key={category} value={category}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-3 w-full">
                      <Badge
                        variant="outline"
                        className={
                          category === "HTM"
                            ? "bg-indigo-100 text-indigo-800 border-indigo-300"
                            : category === "HFT"
                            ? "bg-rose-100 text-rose-800 border-rose-300"
                            : category === "AFS"
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : category === "PROVISION"
                            ? "bg-purple-100 text-purple-800 border-purple-300"
                            : "bg-gray-100 text-gray-800 border-gray-300"
                        }
                      >
                        {category}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {categoryCompliant}/{categoryItems.length} compliant
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-6 pt-4">
                      {categoryItems.map((item) => (
                        <div key={item.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={item.id}
                              checked={item.compliant}
                              onCheckedChange={(checked) =>
                                handleCheckChange(item.id, checked === true)
                              }
                              className="mt-1"
                            />
                            <div className="flex-1 space-y-3">
                              <Label htmlFor={item.id} className="text-base font-medium cursor-pointer">
                                {item.question}
                              </Label>

                              <div className="space-y-2">
                                <Label htmlFor={`${item.id}-evidence`} className="text-sm">
                                  Evidence / Supporting Data
                                </Label>
                                <Textarea
                                  id={`${item.id}-evidence`}
                                  value={item.evidence}
                                  onChange={(e) => handleEvidenceChange(item.id, e.target.value)}
                                  placeholder="Enter evidence or supporting documentation"
                                  rows={2}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`${item.id}-remarks`} className="text-sm">
                                  Remarks / Action Items
                                </Label>
                                <Textarea
                                  id={`${item.id}-remarks`}
                                  value={item.remarks}
                                  onChange={(e) => handleRemarksChange(item.id, e.target.value)}
                                  placeholder="Any additional remarks or action items"
                                  rows={2}
                                />
                              </div>
                            </div>

                            {item.compliant && (
                              <CheckCircle2 className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Compliance Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-sm text-muted-foreground">Total Checks</div>
              <div className="text-2xl font-bold">{checklistItems.length}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Compliant</div>
              <div className="text-2xl font-bold text-green-600">{compliantCount}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Non-Compliant</div>
              <div className="text-2xl font-bold text-red-600">
                {checklistItems.length - compliantCount}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="font-medium">Overall Rating:</span>
              <Badge
                variant="outline"
                className={
                  overallRating === "FULL_COMPLIANCE"
                    ? "bg-green-100 text-green-800 border-green-300"
                    : overallRating === "SUBSTANTIAL_COMPLIANCE"
                    ? "bg-blue-100 text-blue-800 border-blue-300"
                    : overallRating === "PARTIAL_COMPLIANCE"
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-red-100 text-red-800 border-red-300"
                }
              >
                {overallRating.replace("_", " ")}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
