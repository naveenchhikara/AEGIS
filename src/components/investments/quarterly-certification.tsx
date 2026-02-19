"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Info, CheckCircle2, Clock, FileText } from "@/lib/icons";
import {
  submitQuarterlyCertification,
  getInvestmentCertifications,
} from "@/actions/investment/quarterly-certification";
import { useRouter } from "next/navigation";

interface CertificationCheck {
  checkId: string;
  question: string;
  compliant: boolean;
  remarks: string;
}

const CERTIFICATION_CHECKS = [
  {
    checkId: "sglReconciliation",
    question: "SGL/CSGL reconciliation completed for the quarter?",
  },
  {
    checkId: "brokerConcentration",
    question: "Broker concentration within 5% regulatory limit?",
  },
  {
    checkId: "nonSlrCap",
    question: "Non-SLR investments within 10% of deposits cap?",
  },
  {
    checkId: "htmHftAfsNorms",
    question: "HTM/HFT/AFS classification per RBI norms?",
  },
  {
    checkId: "mtmProvisions",
    question: "Mark-to-market provisions created for AFS/HFT?",
  },
  {
    checkId: "investmentPolicy",
    question: "Investment policy reviewed by board within last 12 months?",
  },
  {
    checkId: "valuationMethods",
    question: "Valuation methods comply with RBI guidelines?",
  },
  {
    checkId: "riskManagement",
    question: "Investment risk management controls adequate?",
  },
];

export function QuarterlyCertification() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const currentQuarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}` as
    | "Q1"
    | "Q2"
    | "Q3"
    | "Q4";

  const [year, setYear] = useState<number>(currentYear);
  const [quarter, setQuarter] = useState<"Q1" | "Q2" | "Q3" | "Q4">(
    currentQuarter,
  );
  const [checks, setChecks] = useState<CertificationCheck[]>(
    CERTIFICATION_CHECKS.map((c) => ({ ...c, compliant: false, remarks: "" })),
  );
  const [overallOpinion, setOverallOpinion] = useState<
    "SATISFACTORY" | "QUALIFIED" | "ADVERSE"
  >("SATISFACTORY");
  const [remarks, setRemarks] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [previousCerts, setPreviousCerts] = useState<any[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(true);

  useEffect(() => {
    const loadCertifications = async () => {
      const result = await getInvestmentCertifications();
      if (result.success) {
        setPreviousCerts(result.data);
      }
      setLoadingCerts(false);
    };
    loadCertifications();
  }, []);

  const handleCheckChange = (checkId: string, compliant: boolean) => {
    setChecks((prev) =>
      prev.map((c) => (c.checkId === checkId ? { ...c, compliant } : c)),
    );
  };

  const handleRemarksChange = (checkId: string, remarks: string) => {
    setChecks((prev) =>
      prev.map((c) => (c.checkId === checkId ? { ...c, remarks } : c)),
    );
  };

  const handleSubmit = async () => {
    const compliantCount = checks.filter((c) => c.compliant).length;
    if (compliantCount < checks.length * 0.5) {
      if (
        !confirm(
          "Less than 50% of checks are compliant. Are you sure you want to submit this certification?",
        )
      ) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const result = await submitQuarterlyCertification({
        year,
        quarter,
        certificationChecks: checks.map((c) => ({
          checkId: c.checkId,
          compliant: c.compliant,
          remarks: c.remarks || undefined,
        })),
        overallOpinion,
        remarks: remarks || undefined,
      });

      if (result.success) {
        alert("Quarterly certification submitted successfully");
        // Reset form
        setChecks(
          CERTIFICATION_CHECKS.map((c) => ({
            ...c,
            compliant: false,
            remarks: "",
          })),
        );
        setOverallOpinion("SATISFACTORY");
        setRemarks("");
        // Reload certifications
        const refreshResult = await getInvestmentCertifications();
        if (refreshResult.success) {
          setPreviousCerts(refreshResult.data);
        }
        router.refresh();
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert("Failed to submit certification");
    } finally {
      setSubmitting(false);
    }
  };

  const compliantCount = checks.filter((c) => c.compliant).length;
  const compliancePercent = (compliantCount / checks.length) * 100;

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Quarterly Investment Certification</AlertTitle>
        <AlertDescription>
          Quarterly certification of investment portfolio compliance with RBI
          norms, to be completed by ACB members or authorized auditors. This
          certification tracks key compliance areas including SGL
          reconciliation, broker concentration, non-SLR cap, and classification
          norms.
        </AlertDescription>
      </Alert>

      {/* Certification Form */}
      <Card>
        <CardHeader>
          <CardTitle>New Certification</CardTitle>
          <p className="text-muted-foreground text-sm">
            Complete investment compliance checklist for the quarter
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Period Selection */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="year">Financial Year</Label>
              <Select
                value={year.toString()}
                onValueChange={(v) => setYear(parseInt(v))}
              >
                <SelectTrigger id="year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quarter">Quarter</Label>
              <Select
                value={quarter}
                onValueChange={(v) => setQuarter(v as any)}
              >
                <SelectTrigger id="quarter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Q1">Q1 (Apr-Jun)</SelectItem>
                  <SelectItem value="Q2">Q2 (Jul-Sep)</SelectItem>
                  <SelectItem value="Q3">Q3 (Oct-Dec)</SelectItem>
                  <SelectItem value="Q4">Q4 (Jan-Mar)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Compliance Progress */}
          <div className="bg-muted rounded-lg p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Compliance Progress</span>
              <span className="text-sm font-semibold">
                {compliantCount}/{checks.length} ({compliancePercent.toFixed(0)}
                %)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className={`h-2 rounded-full transition-all ${
                  compliancePercent === 100
                    ? "bg-green-500"
                    : compliancePercent >= 80
                      ? "bg-blue-500"
                      : compliancePercent >= 50
                        ? "bg-amber-500"
                        : "bg-red-500"
                }`}
                style={{ width: `${compliancePercent}%` }}
              />
            </div>
          </div>

          {/* Certification Checklist */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">
              Certification Checklist
            </Label>
            {checks.map((check, idx) => (
              <div
                key={check.checkId}
                className="space-y-3 rounded-lg border p-4"
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={check.checkId}
                    checked={check.compliant}
                    onCheckedChange={(checked) =>
                      handleCheckChange(check.checkId, checked === true)
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={check.checkId}
                      className="cursor-pointer font-medium"
                    >
                      {idx + 1}. {check.question}
                    </Label>
                    <Textarea
                      value={check.remarks}
                      onChange={(e) =>
                        handleRemarksChange(check.checkId, e.target.value)
                      }
                      placeholder="Remarks or evidence (optional)"
                      rows={2}
                      className="mt-2"
                    />
                  </div>
                  {check.compliant && (
                    <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-green-600" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Overall Opinion */}
          <div className="space-y-2">
            <Label htmlFor="overallOpinion">Overall Opinion *</Label>
            <Select
              value={overallOpinion}
              onValueChange={(v) => setOverallOpinion(v as any)}
            >
              <SelectTrigger id="overallOpinion">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SATISFACTORY">
                  Satisfactory (Full Compliance)
                </SelectItem>
                <SelectItem value="QUALIFIED">
                  Qualified (Minor Issues Noted)
                </SelectItem>
                <SelectItem value="ADVERSE">
                  Adverse (Significant Non-Compliance)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* General Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks">General Remarks</Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Additional remarks or observations"
              rows={4}
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="text-muted-foreground text-sm">
              <Clock className="mr-1 inline h-4 w-4" />
              Certification will be timestamped and recorded
            </div>
            <Button onClick={handleSubmit} disabled={submitting} size="lg">
              <FileText className="mr-2 h-5 w-5" />
              {submitting ? "Submitting..." : "Submit Certification"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Previous Certifications */}
      <Card>
        <CardHeader>
          <CardTitle>Previous Certifications</CardTitle>
          <p className="text-muted-foreground text-sm">
            Historical quarterly investment certifications
          </p>
        </CardHeader>
        <CardContent>
          {loadingCerts ? (
            <p className="text-muted-foreground py-8 text-center">
              Loading certifications...
            </p>
          ) : previousCerts.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No previous certifications found.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Opinion</TableHead>
                    <TableHead>Compliance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previousCerts.map((cert) => {
                    const certData = cert.items as any;
                    const checks = certData?.checks || [];
                    const compliantChecks = checks.filter(
                      (c: any) => c.compliant,
                    ).length;
                    const totalChecks = checks.length;

                    return (
                      <TableRow key={cert.id}>
                        <TableCell className="font-medium">
                          {cert.checklistName}
                        </TableCell>
                        <TableCell>{cert.completedById || "—"}</TableCell>
                        <TableCell>
                          {cert.completedAt
                            ? new Date(cert.completedAt).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              cert.overallRating === "SATISFACTORY"
                                ? "border-green-300 bg-green-100 text-green-800"
                                : cert.overallRating === "QUALIFIED"
                                  ? "border-amber-300 bg-amber-100 text-amber-800"
                                  : "border-red-300 bg-red-100 text-red-800"
                            }
                          >
                            {cert.overallRating}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {totalChecks > 0 ? (
                            <span>
                              {compliantChecks}/{totalChecks} (
                              {((compliantChecks / totalChecks) * 100).toFixed(
                                0,
                              )}
                              %)
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
