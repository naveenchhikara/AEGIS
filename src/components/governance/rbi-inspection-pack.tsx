"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, FileText, Download, CheckCircle, AlertTriangle, Clock } from "@/lib/icons";
import { toast } from "sonner";
import { generateInspectionPack } from "@/actions/governance/generate-inspection-pack";
import { format } from "date-fns";

interface RbiInspectionPackProps {
  canView: boolean;
}

export function RbiInspectionPack({ canView }: RbiInspectionPackProps) {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [packData, setPackData] = React.useState<any>(null);
  const [selectedYear, setSelectedYear] = React.useState<number>(new Date().getFullYear());

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  async function handleGenerate() {
    if (!canView) {
      toast.error("You do not have permission to view inspection packs.");
      return;
    }

    setIsGenerating(true);
    setPackData(null);

    const result = await generateInspectionPack(selectedYear);

    if (result.success) {
      toast.success("Inspection pack generated successfully");
      setPackData(result.data);
    } else {
      toast.error(result.error);
    }

    setIsGenerating(false);
  }

  if (!canView) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            You do not have permission to view RBI inspection packs.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">RBI Inspection Support Pack</h2>
        <p className="text-muted-foreground">
          One-click 9-component comprehensive inspection readiness report
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Inspection Pack</CardTitle>
          <CardDescription>
            Select financial year to aggregate all inspection-ready data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="year">Financial Year</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger id="year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      FY {year}-{(year + 1).toString().slice(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <FileText className="mr-2 h-4 w-4" />
              Generate Pack
            </Button>
          </div>

          {packData && (
            <div className="mt-4 p-4 border rounded-lg bg-green-50 dark:bg-green-950 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                  <CheckCircle className="h-5 w-5" />
                  <h3 className="font-semibold">Pack Generated Successfully</h3>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled>
                    <Download className="mr-2 h-4 w-4" />
                    Export PDF
                  </Button>
                  <Button size="sm" variant="outline" disabled>
                    <Download className="mr-2 h-4 w-4" />
                    Export XLSX
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="p-2 bg-white dark:bg-gray-900 rounded">
                  <p className="text-muted-foreground text-xs">Total Branches</p>
                  <p className="font-bold text-lg">{packData.stats.totalBranches}</p>
                </div>
                <div className="p-2 bg-white dark:bg-gray-900 rounded">
                  <p className="text-muted-foreground text-xs">Audits Completed</p>
                  <p className="font-bold text-lg">
                    {packData.stats.completedAudits} / {packData.stats.totalAudits}
                  </p>
                </div>
                <div className="p-2 bg-white dark:bg-gray-900 rounded">
                  <p className="text-muted-foreground text-xs">Critical Findings</p>
                  <p className="font-bold text-lg text-red-600">
                    {packData.stats.criticalObservations}
                  </p>
                </div>
                <div className="p-2 bg-white dark:bg-gray-900 rounded">
                  <p className="text-muted-foreground text-xs">Active Risks</p>
                  <p className="font-bold text-lg text-orange-600">
                    {packData.stats.activeRisks}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {packData && (
        <Card>
          <CardHeader>
            <CardTitle>9-Component Inspection Pack</CardTitle>
            <CardDescription>
              Expand each section to view detailed data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {/* Component 1: Branch Audit Coverage */}
              <AccordionItem value="audit-coverage">
                <AccordionTrigger>
                  <div className="flex items-center justify-between w-full pr-4">
                    <span className="font-medium">1. Branch Audit Coverage Report</span>
                    <Badge variant="outline">{packData.auditCoverage.length} audits</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground mb-3">
                      Audit coverage across all branches for FY {selectedYear}-
                      {(selectedYear + 1).toString().slice(2)}
                    </p>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Branch</TableHead>
                            <TableHead>Audit Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>Completion Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {packData.auditCoverage.slice(0, 10).map((audit: any) => (
                            <TableRow key={audit.id}>
                              <TableCell>{audit.branch?.name || "—"}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{audit.auditType}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={audit.status === "COMPLETED" ? "default" : "outline"}
                                >
                                  {audit.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {audit.plannedStartDate
                                  ? format(new Date(audit.plannedStartDate), "PP")
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                {audit.completionDate
                                  ? format(new Date(audit.completionDate), "PP")
                                  : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Component 2: RAM Assessment Summary */}
              <AccordionItem value="ram-summary">
                <AccordionTrigger>
                  <div className="flex items-center justify-between w-full pr-4">
                    <span className="font-medium">2. RAM Assessment Summary</span>
                    <Badge variant="outline">{packData.ramSummary.length} assessments</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground mb-3">
                      Risk-based Internal Audit (RBIA) assessments by branch
                    </p>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Branch</TableHead>
                            <TableHead>Assessment Date</TableHead>
                            <TableHead>Risk Score</TableHead>
                            <TableHead>Category</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {packData.ramSummary.slice(0, 10).map((ram: any) => (
                            <TableRow key={ram.id}>
                              <TableCell>{ram.branch?.name || "—"}</TableCell>
                              <TableCell>
                                {ram.assessmentDate
                                  ? format(new Date(ram.assessmentDate), "PP")
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    ram.riskScore >= 75
                                      ? "destructive"
                                      : ram.riskScore >= 50
                                      ? "default"
                                      : "outline"
                                  }
                                >
                                  {ram.riskScore}
                                </Badge>
                              </TableCell>
                              <TableCell>{ram.category}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Component 3: Open Observations */}
              <AccordionItem value="open-obs">
                <AccordionTrigger>
                  <div className="flex items-center justify-between w-full pr-4">
                    <span className="font-medium">3. Open Observations Summary</span>
                    <div className="flex gap-2">
                      <Badge variant="destructive">
                        {packData.stats.criticalObservations} Critical
                      </Badge>
                      <Badge variant="outline">
                        {packData.stats.highObservations} High
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground mb-3">
                      All open audit observations requiring attention
                    </p>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Branch</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Target Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {packData.openObs.slice(0, 15).map((obs: any) => (
                            <TableRow key={obs.id}>
                              <TableCell className="font-medium">{obs.title}</TableCell>
                              <TableCell>{obs.branch?.name || "—"}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    obs.severity === "CRITICAL"
                                      ? "destructive"
                                      : obs.severity === "HIGH"
                                      ? "default"
                                      : "outline"
                                  }
                                >
                                  {obs.severity}
                                </Badge>
                              </TableCell>
                              <TableCell>{obs.status}</TableCell>
                              <TableCell>
                                {obs.targetDate
                                  ? format(new Date(obs.targetDate), "PP")
                                  : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Component 4: Compliance Status */}
              <AccordionItem value="compliance">
                <AccordionTrigger>
                  <div className="flex items-center justify-between w-full pr-4">
                    <span className="font-medium">4. Compliance Tracking Status</span>
                    <Badge variant="destructive">
                      {packData.stats.overdueCompliance} overdue
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground mb-3">
                      Compliance item tracking across all branches
                    </p>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Branch</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Due Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {packData.compliance.slice(0, 10).map((item: any) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.complianceType}</TableCell>
                              <TableCell>{item.branch?.name || "—"}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{item.status}</Badge>
                              </TableCell>
                              <TableCell>
                                {item.dueDate ? format(new Date(item.dueDate), "PP") : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Component 5: Regulatory Observation ATR */}
              <AccordionItem value="reg-obs">
                <AccordionTrigger>
                  <div className="flex items-center justify-between w-full pr-4">
                    <span className="font-medium">5. Regulatory ATR Status</span>
                    <Badge variant="outline">{packData.regObs.length} observations</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground mb-3">
                      Action Taken Report for regulatory observations
                    </p>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Observation</TableHead>
                            <TableHead>Branch</TableHead>
                            <TableHead>Inspection Date</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {packData.regObs.slice(0, 10).map((obs: any) => (
                            <TableRow key={obs.id}>
                              <TableCell>{obs.observationText}</TableCell>
                              <TableCell>{obs.branch?.name || "—"}</TableCell>
                              <TableCell>
                                {obs.inspectionDate
                                  ? format(new Date(obs.inspectionDate), "PP")
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{obs.status}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Component 6: Risk Register */}
              <AccordionItem value="risks">
                <AccordionTrigger>
                  <div className="flex items-center justify-between w-full pr-4">
                    <span className="font-medium">6. Risk Register Summary</span>
                    <Badge variant="outline">{packData.stats.activeRisks} active</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground mb-3">
                      Top risks by score from the enterprise risk register
                    </p>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Risk Description</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Risk Score</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {packData.risks.slice(0, 10).map((risk: any) => (
                            <TableRow key={risk.id}>
                              <TableCell>{risk.riskDescription}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{risk.riskCategory}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    risk.riskScore >= 15
                                      ? "destructive"
                                      : risk.riskScore >= 10
                                      ? "default"
                                      : "outline"
                                  }
                                >
                                  {risk.riskScore}
                                </Badge>
                              </TableCell>
                              <TableCell>{risk.status}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Component 7: KRI Breach Report */}
              <AccordionItem value="kri">
                <AccordionTrigger>
                  <div className="flex items-center justify-between w-full pr-4">
                    <span className="font-medium">7. KRI Breach Report</span>
                    <Badge variant="destructive">{packData.stats.kriBreach} breaches</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground mb-3">
                      Key Risk Indicators that have breached thresholds
                    </p>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>KRI Name</TableHead>
                            <TableHead>Actual Value</TableHead>
                            <TableHead>Threshold</TableHead>
                            <TableHead>Record Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {packData.kris.slice(0, 10).map((kri: any) => (
                            <TableRow key={kri.id}>
                              <TableCell className="font-medium">{kri.kriName}</TableCell>
                              <TableCell>
                                <Badge variant="destructive">{kri.actualValue}</Badge>
                              </TableCell>
                              <TableCell>{kri.threshold}</TableCell>
                              <TableCell>
                                {kri.recordDate
                                  ? format(new Date(kri.recordDate), "PP")
                                  : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Component 8: Policy Review Status */}
              <AccordionItem value="policies">
                <AccordionTrigger>
                  <div className="flex items-center justify-between w-full pr-4">
                    <span className="font-medium">8. Policy Review Status</span>
                    <Badge variant="outline">
                      {packData.stats.policiesDueReview} due for review
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground mb-3">
                      Policy framework and review compliance status
                    </p>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Policy Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Review Due</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {packData.policies.slice(0, 10).map((policy: any) => (
                            <TableRow key={policy.id}>
                              <TableCell className="font-medium">{policy.name}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{policy.category}</Badge>
                              </TableCell>
                              <TableCell>{policy.status}</TableCell>
                              <TableCell>
                                {policy.reviewDueDate
                                  ? format(new Date(policy.reviewDueDate), "PP")
                                  : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Component 9: IS Audit Status */}
              <AccordionItem value="is-audit">
                <AccordionTrigger>
                  <div className="flex items-center justify-between w-full pr-4">
                    <span className="font-medium">9. IS Audit Status</span>
                    <Badge variant="outline">{packData.isAudits.length} audits</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground mb-3">
                      Information Systems audit checklist compliance
                    </p>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Branch</TableHead>
                            <TableHead>Audit Date</TableHead>
                            <TableHead>Overall Score</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {packData.isAudits.slice(0, 10).map((audit: any) => (
                            <TableRow key={audit.id}>
                              <TableCell>{audit.branch?.name || "—"}</TableCell>
                              <TableCell>
                                {audit.auditDate
                                  ? format(new Date(audit.auditDate), "PP")
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    audit.overallScore >= 80
                                      ? "default"
                                      : audit.overallScore >= 60
                                      ? "outline"
                                      : "destructive"
                                  }
                                >
                                  {audit.overallScore}%
                                </Badge>
                              </TableCell>
                              <TableCell>{audit.status}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}

      {!packData && (
        <Card>
          <CardHeader>
            <CardTitle>What's Included?</CardTitle>
            <CardDescription>
              The 9-component pack aggregates critical data for RBI inspection readiness
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {[
                "Branch Audit Coverage Report — Complete audit trail by branch",
                "RAM Assessment Summary — Risk-based audit planning data",
                "Open Observations Summary — All pending audit findings",
                "Compliance Tracking Status — Regulatory compliance tracking",
                "Regulatory ATR Status — Action taken reports for RBI observations",
                "Risk Register Summary — Top enterprise risks",
                "KRI Breach Report — Key Risk Indicators exceeding thresholds",
                "Policy Review Status — Policy framework compliance",
                "IS Audit Status — Information Systems audit reports",
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-sm flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-sm">{item}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
