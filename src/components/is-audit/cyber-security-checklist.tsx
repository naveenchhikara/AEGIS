"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Save, Loader2, CheckCircle2, XCircle, AlertCircle } from "@/lib/icons";
import { toast } from "sonner";
import { manageIsAuditChecklist } from "@/actions/investment/manage-is-audit";
import { Progress } from "@/components/ui/progress";

// 25 baseline controls with questions (~122 total)
const CYBER_BASELINE_CONTROLS = [
  {
    id: "BC01",
    control: "Inventory of Business Assets",
    questions: [
      "Maintain updated inventory of authorized hardware/software",
      "Identify and document data classification for all critical systems",
      "Track asset lifecycle from procurement to disposal",
      "Periodic verification of inventory accuracy (at least annually)",
      "Maintain configuration management database (CMDB)",
    ],
  },
  {
    id: "BC02",
    control: "Access Control Management",
    questions: [
      "Role-based access control (RBAC) implemented across all systems",
      "Multi-factor authentication for critical systems and privileged users",
      "Privileged access management with centralized logging",
      "Access review conducted quarterly with documented sign-offs",
      "Vendor/third-party access through secure gateway with time-bound permissions",
      "Automated account provisioning and de-provisioning process",
    ],
  },
  {
    id: "BC03",
    control: "Network Security",
    questions: [
      "Firewall rules reviewed and updated quarterly",
      "IDS/IPS deployed and monitored 24x7",
      "Network segmentation between critical/non-critical zones",
      "Wireless network security controls (WPA2/3, separate SSID for guests)",
      "VPN for remote access with strong encryption (AES-256)",
    ],
  },
  {
    id: "BC04",
    control: "Secure Configuration",
    questions: [
      "Hardening standards defined and applied for all platforms",
      "Default passwords changed on all systems and devices",
      "Unnecessary services/ports disabled on servers",
      "Security baselines documented and enforced via automation",
    ],
  },
  {
    id: "BC05",
    control: "Patch Management",
    questions: [
      "Critical patches applied within 30 days of vendor release",
      "Patch testing performed in non-production environment",
      "Patch deployment tracked with centralized tool",
      "Emergency patch process documented for zero-day vulnerabilities",
      "Patch compliance reporting to management monthly",
    ],
  },
  {
    id: "BC06",
    control: "Anti-Malware Protection",
    questions: [
      "Endpoint protection deployed on all workstations and servers",
      "Anti-malware signatures updated daily",
      "Malware detection events escalated to SOC/security team",
      "Email gateway anti-spam/anti-phishing controls active",
    ],
  },
  {
    id: "BC07",
    control: "Email Security",
    questions: [
      "Email filtering for spam, malware, and phishing enabled",
      "SPF, DKIM, DMARC configured for domain protection",
      "User awareness training on email phishing conducted quarterly",
      "Email encryption for sensitive communications",
    ],
  },
  {
    id: "BC08",
    control: "Data Loss Prevention (DLP)",
    questions: [
      "DLP policies defined for sensitive data (PII, financial data)",
      "DLP controls implemented on endpoints and email gateways",
      "USB/removable media usage restricted or monitored",
      "Data classification labels applied to critical documents",
    ],
  },
  {
    id: "BC09",
    control: "Encryption",
    questions: [
      "Data at rest encrypted (AES-256 or equivalent) for databases and file storage",
      "Data in transit encrypted (TLS 1.2+) for all communication channels",
      "Full disk encryption enabled on laptops and mobile devices",
      "Key management practices follow industry standards (rotation, escrow)",
    ],
  },
  {
    id: "BC10",
    control: "Vulnerability Assessment",
    questions: [
      "Vulnerability scans performed quarterly (internal and external)",
      "Critical vulnerabilities remediated within 30 days",
      "Scan reports reviewed by IT security committee",
      "Vulnerability management process integrated with patch management",
    ],
  },
  {
    id: "BC11",
    control: "Penetration Testing",
    questions: [
      "Annual penetration testing of critical systems by qualified third party",
      "Penetration test findings remediated based on risk priority",
      "Retest performed after remediation to verify fixes",
      "Executive summary of pen-test results presented to board/ACB",
    ],
  },
  {
    id: "BC12",
    control: "Log Management & Monitoring",
    questions: [
      "Centralized logging (SIEM) for all critical systems",
      "Log retention policy defined (minimum 1 year for audit logs)",
      "Real-time monitoring and alerting for security events",
      "Log review performed weekly by security team",
      "Log integrity protection (tamper-proof/immutable logs)",
    ],
  },
  {
    id: "BC13",
    control: "Incident Response",
    questions: [
      "Incident response plan documented and approved by management",
      "Incident response team (CSIRT) designated with defined roles",
      "Incident classification and escalation matrix defined",
      "Incident drills/tabletop exercises conducted annually",
      "Post-incident review and lessons learned documented",
    ],
  },
  {
    id: "BC14",
    control: "Business Continuity Planning",
    questions: [
      "BCP/DR plan documented and approved by board",
      "RTO/RPO defined for all critical systems",
      "BCP plan tested annually with documented results",
      "Alternate processing site identified and operational",
    ],
  },
  {
    id: "BC15",
    control: "Disaster Recovery Testing",
    questions: [
      "DR drills conducted annually for critical applications",
      "DR test results documented with gaps identified",
      "DR plan updated based on test findings",
      "Third-party DR site SLA compliance monitored",
    ],
  },
  {
    id: "BC16",
    control: "Mobile Device Security",
    questions: [
      "Mobile device management (MDM) solution deployed",
      "Corporate data separated from personal data (containerization)",
      "Remote wipe capability enabled for lost/stolen devices",
      "Mobile device usage policy defined and communicated",
    ],
  },
  {
    id: "BC17",
    control: "Social Engineering Awareness",
    questions: [
      "Phishing simulation exercises conducted quarterly",
      "Users who fail phishing tests provided additional training",
      "Reporting mechanism for suspected phishing emails available",
    ],
  },
  {
    id: "BC18",
    control: "Security Awareness Training",
    questions: [
      "Annual security awareness training for all employees",
      "Training covers phishing, password security, data handling, clean desk",
      "Training completion tracked and reported to management",
      "Specialized training for IT/security staff on emerging threats",
    ],
  },
  {
    id: "BC19",
    control: "Change Management",
    questions: [
      "Change approval process documented and followed",
      "Emergency change procedures defined and authorized",
      "Testing in non-production environment mandatory before production deployment",
      "Rollback procedures documented and tested",
      "Change advisory board (CAB) reviews high-risk changes",
    ],
  },
  {
    id: "BC20",
    control: "Physical Security",
    questions: [
      "Data center access restricted with biometric/card-based controls",
      "CCTV surveillance of server rooms and entry/exit points",
      "Visitor access log maintained with escort policy",
      "Environmental controls (fire suppression, UPS, HVAC) tested regularly",
    ],
  },
  {
    id: "BC21",
    control: "Vendor Risk Management",
    questions: [
      "Vendor security assessments performed before onboarding",
      "SLA includes security and data protection clauses",
      "Vendor access monitored and restricted to least privilege",
      "Annual vendor security review and audit rights exercised",
    ],
  },
  {
    id: "BC22",
    control: "Outsourcing Security",
    questions: [
      "Third-party audits (SOC 2, ISO 27001) reviewed for outsourced services",
      "Data residency and sovereignty requirements met",
      "Right-to-audit clause included in outsourcing contracts",
      "Exit/transition plan documented with data return procedures",
    ],
  },
  {
    id: "BC23",
    control: "Regulatory Compliance",
    questions: [
      "Compliance with RBI cyber security framework for UCBs",
      "Annual IS audit conducted and findings remediated",
      "Cyber security policy approved by board and reviewed annually",
      "Cyber incident reporting to RBI within prescribed timelines",
    ],
  },
  {
    id: "BC24",
    control: "Security Audit & Assessment",
    questions: [
      "Annual information security audit by qualified IS auditor",
      "Audit findings presented to Audit Committee of Board",
      "Remediation action plans tracked with timelines",
      "Self-assessment against ISO 27001 or NIST framework conducted",
    ],
  },
  {
    id: "BC25",
    control: "Board-Level Cyber Reporting",
    questions: [
      "Quarterly cyber security metrics presented to board/ACB",
      "Board-approved cyber security strategy and budget",
      "Chief Information Security Officer (CISO) designated",
      "Cyber insurance coverage evaluated and obtained as appropriate",
    ],
  },
];

const RESPONSE_STATUS = [
  { value: "COMPLIANT", label: "Compliant", icon: CheckCircle2, color: "text-green-600" },
  { value: "NON_COMPLIANT", label: "Non-Compliant", icon: XCircle, color: "text-red-600" },
  { value: "PARTIAL", label: "Partial", icon: AlertCircle, color: "text-amber-600" },
  { value: "NOT_APPLICABLE", label: "N/A", icon: AlertCircle, color: "text-gray-600" },
];

type QuestionResponse = {
  controlId: string;
  questionIdx: number;
  question: string;
  response?: string;
  evidence?: string;
  remarks?: string;
};

export function CyberSecurityChecklist({ userId }: { userId: string }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = React.useState(false);
  const [responses, setResponses] = React.useState<Record<string, QuestionResponse>>({});

  // Initialize responses
  React.useEffect(() => {
    const initial: Record<string, QuestionResponse> = {};
    CYBER_BASELINE_CONTROLS.forEach((control) => {
      control.questions.forEach((question, idx) => {
        const key = `${control.id}-${idx}`;
        initial[key] = {
          controlId: control.id,
          questionIdx: idx,
          question,
        };
      });
    });
    setResponses(initial);
  }, []);

  function updateResponse(key: string, field: keyof QuestionResponse, value: string) {
    setResponses((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  }

  function calculateControlStats(controlId: string) {
    const controlResponses = Object.entries(responses).filter(
      ([key, _]) => key.startsWith(controlId)
    );
    const total = controlResponses.length;
    const compliant = controlResponses.filter(
      ([_, r]) => r.response === "COMPLIANT"
    ).length;
    const nonCompliant = controlResponses.filter(
      ([_, r]) => r.response === "NON_COMPLIANT"
    ).length;
    const partial = controlResponses.filter(([_, r]) => r.response === "PARTIAL").length;
    const notApplicable = controlResponses.filter(
      ([_, r]) => r.response === "NOT_APPLICABLE"
    ).length;
    const unanswered = total - compliant - nonCompliant - partial - notApplicable;

    const responded = total - unanswered - notApplicable;
    const complianceRate = responded > 0 ? (compliant / responded) * 100 : 0;

    return { total, compliant, nonCompliant, partial, notApplicable, unanswered, complianceRate };
  }

  function calculateOverallStats() {
    const allResponses = Object.values(responses);
    const total = allResponses.length;
    const compliant = allResponses.filter((r) => r.response === "COMPLIANT").length;
    const nonCompliant = allResponses.filter((r) => r.response === "NON_COMPLIANT").length;
    const partial = allResponses.filter((r) => r.response === "PARTIAL").length;
    const notApplicable = allResponses.filter((r) => r.response === "NOT_APPLICABLE").length;
    const unanswered = total - compliant - nonCompliant - partial - notApplicable;

    const responded = total - unanswered - notApplicable;
    const complianceRate = responded > 0 ? (compliant / responded) * 100 : 0;

    return { total, compliant, nonCompliant, partial, notApplicable, unanswered, complianceRate };
  }

  function getNonCompliantItems() {
    return Object.entries(responses)
      .filter(([_, r]) => r.response === "NON_COMPLIANT")
      .map(([key, r]) => {
        const control = CYBER_BASELINE_CONTROLS.find((c) => c.id === r.controlId);
        return {
          control: control?.control || "Unknown",
          question: r.question,
          remarks: r.remarks || "No remarks provided",
        };
      });
  }

  async function handleSave(markComplete: boolean = false) {
    setIsSaving(true);

    const allItems = Object.values(responses).map((item) => ({
      id: `${item.controlId}-${item.questionIdx}`,
      question: item.question,
      response: item.response as any,
      evidence: item.evidence,
      remarks: item.remarks,
    }));

    // Calculate overall rating if marking complete
    let overallRating: "SATISFACTORY" | "NEEDS_IMPROVEMENT" | "UNSATISFACTORY" | undefined;
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
      category: "CYBER_SECURITY",
      checklistName: "Cyber Security Baseline Controls (25 Controls)",
      items: allItems,
      completedById: markComplete ? userId : undefined,
      overallRating,
    });

    setIsSaving(false);

    if (result.success) {
      toast.success(markComplete ? "Cyber security audit completed" : "Progress saved");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const overallStats = calculateOverallStats();
  const nonCompliantItems = getNonCompliantItems();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cyber Security Checklist</CardTitle>
              <CardDescription>
                25 Baseline Controls • {overallStats.total} Questionnaires
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{Math.round(overallStats.complianceRate)}%</div>
              <Badge
                variant="outline"
                className={
                  overallStats.complianceRate >= 90
                    ? "bg-green-100 text-green-800 border-green-300"
                    : overallStats.complianceRate >= 70
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : "bg-red-100 text-red-800 border-red-300"
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
              <div className="text-2xl font-bold text-green-600">{overallStats.compliant}</div>
              <div className="text-muted-foreground">Compliant</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{overallStats.nonCompliant}</div>
              <div className="text-muted-foreground">Non-Compliant</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">{overallStats.partial}</div>
              <div className="text-muted-foreground">Partial</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">{overallStats.notApplicable}</div>
              <div className="text-muted-foreground">N/A</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{overallStats.unanswered}</div>
              <div className="text-muted-foreground">Unanswered</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Accordion type="multiple" className="space-y-2">
        {CYBER_BASELINE_CONTROLS.map((control) => {
          const stats = calculateControlStats(control.id);
          return (
            <AccordionItem key={control.id} value={control.id} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{control.id}</Badge>
                    <span className="font-medium">{control.control}</span>
                    <Badge variant="secondary" className="text-xs">
                      {control.questions.length} items
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-muted-foreground">
                      {stats.compliant}/{stats.total - stats.notApplicable}
                    </div>
                    <div className="w-24">
                      <Progress value={stats.complianceRate} className="h-2" />
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-6 pt-4">
                {control.questions.map((question, idx) => {
                  const key = `${control.id}-${idx}`;
                  const currentResponse = responses[key];

                  return (
                    <div key={key} className="space-y-3 pb-6 border-b last:border-0 last:pb-0">
                      <div className="flex items-start justify-between gap-4">
                        <Label className="text-sm font-normal leading-relaxed flex-1">
                          {idx + 1}. {question}
                        </Label>
                        <Select
                          value={currentResponse?.response || ""}
                          onValueChange={(value) => updateResponse(key, "response", value)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {RESPONSE_STATUS.map((status) => {
                              const Icon = status.icon;
                              return (
                                <SelectItem key={status.value} value={status.value}>
                                  <div className="flex items-center gap-2">
                                    <Icon className={`h-4 w-4 ${status.color}`} />
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
                          <Label className="text-xs text-muted-foreground">Evidence</Label>
                          <Textarea
                            placeholder="Evidence reference or description"
                            value={currentResponse?.evidence || ""}
                            onChange={(e) => updateResponse(key, "evidence", e.target.value)}
                            rows={2}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Remarks</Label>
                          <Textarea
                            placeholder="Comments, findings, or observations"
                            value={currentResponse?.remarks || ""}
                            onChange={(e) => updateResponse(key, "remarks", e.target.value)}
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {nonCompliantItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-red-600">
              Gap Summary ({nonCompliantItems.length} Non-Compliant Items)
            </CardTitle>
            <CardDescription>
              Items requiring immediate remediation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {nonCompliantItems.map((item, idx) => (
                <div key={idx} className="border-l-4 border-red-600 pl-4 py-2">
                  <div className="font-medium">{item.control}</div>
                  <div className="text-sm text-muted-foreground">{item.question}</div>
                  <div className="text-sm mt-1">
                    <span className="font-medium">Remarks:</span> {item.remarks}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Save Progress
        </Button>
        <Button onClick={() => handleSave(true)} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Complete Cyber Security Audit
        </Button>
      </div>
    </div>
  );
}
