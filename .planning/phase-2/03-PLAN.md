---
phase: 2
plan: 3
type: standard
wave: 2
depends_on: [1, 2]
files_modified:
  - src/services/reports/xlsx-generator.ts (new)
  - src/services/reports/report-data-fetcher.ts (new)
  - src/actions/reports/generate-xlsx.ts (new)
  - package.json (add exceljs)
autonomous: true
must_haves:
  truths:
    - "XLSX report has 13+ sheets matching existing bank audit format"
    - "Sheets include: Cover, Executive Summary, Branch Profile, RAM Assessment, Observations (by area), Cash Verification, Loan Review, SMA/NPA, Compliance Status, Risk Rating, BH Certificate, Annexures"
    - "Uses exceljs library for XLSX generation with formatting"
    - "Report stored in S3 with ReportMetadata record"
    - "Includes risk rating and rating band from Phase 2 Plan 02"
  artifacts:
    - path: "src/services/reports/xlsx-generator.ts"
      provides: "XLSXReportGenerator class with generateReport() and per-sheet methods"
    - path: "src/services/reports/report-data-fetcher.ts"
      provides: "ReportDataFetcher to consolidate all audit data"
    - path: "src/actions/reports/generate-xlsx.ts"
      provides: "Server action to generate and store XLSX report"
---

## Objective

Implement multi-tab XLSX report generation (13+ sheets) matching the bank's existing audit format. Report includes engagement metadata, branch profile, RAM assessment, examination responses, observations by area, cash/loan reviews, SMA/NPA summary, compliance status, risk rating, BH certificate, and annexures.

This plan covers R29 (XLSX multi-tab report) and integrates with R31 risk rating from Plan 02.

## Context

@AEGIS/prisma/schema.prisma — Phase 2 schema with ReportMetadata
@AEGIS/src/services/risk-rating/compute.ts — RiskRatingService from Plan 02
@AEGIS/.planning/REQUIREMENTS.md — R29
@AEGIS/.planning/codebase/CONVENTIONS.md — server action patterns
@AEGIS/src/lib/s3.ts — S3 upload utilities (assumed to exist from Phase 1)

## Tasks

<task type="auto">
  <name>Task 1: Add exceljs dependency</name>
  <files>package.json</files>
  <action>
  Add exceljs to dependencies in package.json:

```bash
cd /root/.openclaw/workspace/AEGIS && pnpm add exceljs
```

Also add type definitions:

```bash
pnpm add -D @types/exceljs
```

**Note:** This will modify package.json and pnpm-lock.yaml.
</action>
<verify>

```bash
cd /root/.openclaw/workspace/AEGIS && pnpm list exceljs
```

Must show exceljs version.
</verify>
<done>

- exceljs added to package.json dependencies
- @types/exceljs added to devDependencies
- pnpm-lock.yaml updated
  </done>
  </task>

<task type="auto">
  <name>Task 2: Report data fetcher service</name>
  <files>src/services/reports/report-data-fetcher.ts (new)</files>
  <action>
  Create `src/services/reports/report-data-fetcher.ts`:

```typescript
import { prismaForTenant } from "@/data-access/prisma";
import { RiskRatingService } from "@/services/risk-rating/compute";
import type { ObservationInput } from "@/services/risk-rating/types";
import { logger } from "@/lib/logger";

export interface AuditReportData {
  engagement: {
    id: string;
    auditNumber: string | null;
    auditType: string | null;
    visitNumber: number | null;
    periodFrom: Date | null;
    periodTo: Date | null;
    actualStartDate: Date | null;
    actualEndDate: Date | null;
    overallRiskRating: string | null;
  };
  branch: {
    id: string;
    code: string;
    name: string;
    city: string;
    state: string;
    category: string | null;
    businessSize: string | null;
    staffStrength: number | null;
    ramScore: string | null;
    auditFrequency: number | null;
    lastAuditDate: Date | null;
    lastAuditRating: string | null;
    zone: {
      code: string;
      name: string;
    } | null;
  };
  ramAssessment: {
    assessmentYear: string;
    compositeScore: string | null;
    riskCategory: string | null;
    auditFrequency: number | null;
    scores: {
      paramCode: string;
      paramName: string;
      score: string;
      remarks: string | null;
    }[];
  } | null;
  teamMembers: {
    name: string;
    role: string;
    assignedSections: string[];
  }[];
  examinationAreas: {
    code: string;
    name: string;
    itemCount: number;
    compliantCount: number;
    nonCompliantCount: number;
    partialCount: number;
    naCount: number;
  }[];
  observations: {
    id: string;
    title: string;
    severity: string;
    areaName: string | null;
    condition: string;
    criteria: string;
    cause: string;
    effect: string;
    recommendation: string;
    isRepeatFinding: boolean;
  }[];
  cashCheck: {
    cashInHand: string;
    bookBalance: string;
    difference: string;
    retentionLimit: string | null;
    atmBalances: Record<string, number> | null;
    denominationData: Record<string, number> | null;
    verifiedAt: Date | null;
  } | null;
  loanReviews: {
    accountNo: string;
    borrowerName: string;
    productType: string;
    sanctionAmount: string;
    outstandingAmount: string;
    assetClass: string;
    dpd: number;
    auditObservation: string | null;
  }[];
  smaNpaEntries: {
    category: string;
    accountCount: number;
    totalAmount: string;
    remarks: string | null;
  }[];
  complianceItems: {
    observationTitle: string;
    status: string;
    daysOpen: number;
    escalationLevel: string;
    branchResponseDue: Date | null;
  }[];
  bhCertificate: {
    signedById: string | null;
    signedAt: Date | null;
    comments: string | null;
  };
  riskRating: {
    percentageScore: number;
    ratingBand: string;
    observationCount: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    repeatFindingCount: number;
  };
}

export class ReportDataFetcher {
  constructor(private tenantId: string) {}

  async fetchAuditReportData(engagementId: string): Promise<AuditReportData> {
    const db = prismaForTenant(this.tenantId);

    // Fetch engagement with all related data
    const engagement = await db.auditEngagement.findFirst({
      where: { id: engagementId, tenantId: this.tenantId },
      include: {
        branch: {
          include: {
            zone: true,
          },
        },
        teamMembers: {
          include: {
            user: true,
          },
        },
        observations: {
          where: { status: "ISSUED" },
          include: {
            auditArea: true,
          },
          orderBy: { createdAt: "desc" },
        },
        cashChecks: true,
        loanReviews: {
          orderBy: { dpd: "desc" },
        },
        smaNpaEntries: {
          orderBy: { category: "asc" },
        },
        complianceItems: {
          include: {
            observation: {
              select: { title: true },
            },
          },
        },
      },
    });

    if (!engagement) {
      throw new Error(`Engagement ${engagementId} not found`);
    }

    // Fetch RAM assessment for the branch
    const ramAssessment = engagement.branch
      ? await db.ramAssessment.findFirst({
          where: {
            tenantId: this.tenantId,
            branchId: engagement.branch.id,
            status: "APPROVED",
          },
          include: {
            scores: {
              include: {
                paramConfig: true,
              },
              orderBy: {
                paramConfig: { displayOrder: "asc" },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : null;

    // Fetch examination area statistics
    const examinationAreas = await db.examinationArea.findMany({
      where: { tenantId: this.tenantId, isActive: true },
      include: {
        items: {
          include: {
            responses: {
              where: { engagementId },
            },
          },
        },
      },
      orderBy: { displayOrder: "asc" },
    });

    // Compute risk rating
    const observationInputs: ObservationInput[] = engagement.observations.map(
      (obs) => ({
        id: obs.id,
        severity: obs.severity,
        isRepeatFinding: obs.repeatOfId !== null,
      }),
    );

    const ratingService = new RiskRatingService();
    const riskRating = ratingService.computeEngagementRating(observationInputs);

    // Format data for report
    return {
      engagement: {
        id: engagement.id,
        auditNumber: engagement.auditNumber,
        auditType: engagement.auditType,
        visitNumber: engagement.visitNumber,
        periodFrom: engagement.periodFrom,
        periodTo: engagement.periodTo,
        actualStartDate: engagement.actualStartDate,
        actualEndDate: engagement.actualEndDate,
        overallRiskRating: engagement.overallRiskRating,
      },
      branch: engagement.branch
        ? {
            id: engagement.branch.id,
            code: engagement.branch.code,
            name: engagement.branch.name,
            city: engagement.branch.city,
            state: engagement.branch.state,
            category: engagement.branch.category,
            businessSize: engagement.branch.businessSize?.toString() ?? null,
            staffStrength: engagement.branch.staffStrength,
            ramScore: engagement.branch.ramScore?.toString() ?? null,
            auditFrequency: engagement.branch.auditFrequency,
            lastAuditDate: engagement.branch.lastAuditDate,
            lastAuditRating: engagement.branch.lastAuditRating,
            zone: engagement.branch.zone
              ? {
                  code: engagement.branch.zone.code,
                  name: engagement.branch.zone.name,
                }
              : null,
          }
        : ({} as any),
      ramAssessment: ramAssessment
        ? {
            assessmentYear: ramAssessment.assessmentYear,
            compositeScore: ramAssessment.compositeScore?.toString() ?? null,
            riskCategory: ramAssessment.riskCategory,
            auditFrequency: ramAssessment.auditFrequency,
            scores: ramAssessment.scores.map((s) => ({
              paramCode: s.paramConfig.code,
              paramName: s.paramConfig.name,
              score: s.score.toString(),
              remarks: s.remarks,
            })),
          }
        : null,
      teamMembers: engagement.teamMembers.map((tm) => ({
        name: tm.user.name,
        role: tm.roleInEngagement,
        assignedSections: tm.assignedSections,
      })),
      examinationAreas: examinationAreas.map((area) => {
        const responses = area.items.flatMap((item) => item.responses);
        return {
          code: area.code,
          name: area.name,
          itemCount: area.items.length,
          compliantCount: responses.filter((r) => r.status === "COMPLIANT")
            .length,
          nonCompliantCount: responses.filter(
            (r) => r.status === "NON_COMPLIANT",
          ).length,
          partialCount: responses.filter((r) => r.status === "PARTIAL").length,
          naCount: responses.filter((r) => r.status === "NOT_APPLICABLE")
            .length,
        };
      }),
      observations: engagement.observations.map((obs) => ({
        id: obs.id,
        title: obs.title,
        severity: obs.severity,
        areaName: obs.auditArea?.name ?? null,
        condition: obs.condition,
        criteria: obs.criteria,
        cause: obs.cause,
        effect: obs.effect,
        recommendation: obs.recommendation,
        isRepeatFinding: obs.repeatOfId !== null,
      })),
      cashCheck: engagement.cashChecks[0]
        ? {
            cashInHand: engagement.cashChecks[0].cashInHand.toString(),
            bookBalance: engagement.cashChecks[0].bookBalance.toString(),
            difference: engagement.cashChecks[0].difference.toString(),
            retentionLimit:
              engagement.cashChecks[0].retentionLimit?.toString() ?? null,
            atmBalances: engagement.cashChecks[0].atmBalances as Record<
              string,
              number
            > | null,
            denominationData: engagement.cashChecks[0]
              .denominationData as Record<string, number> | null,
            verifiedAt: engagement.cashChecks[0].verifiedAt,
          }
        : null,
      loanReviews: engagement.loanReviews.map((lr) => ({
        accountNo: lr.accountNo,
        borrowerName: lr.borrowerName,
        productType: lr.productType,
        sanctionAmount: lr.sanctionAmount.toString(),
        outstandingAmount: lr.outstandingAmount.toString(),
        assetClass: lr.assetClass,
        dpd: lr.dpd,
        auditObservation: lr.auditObservation,
      })),
      smaNpaEntries: engagement.smaNpaEntries.map((entry) => ({
        category: entry.category,
        accountCount: entry.accountCount,
        totalAmount: entry.totalAmount.toString(),
        remarks: entry.remarks,
      })),
      complianceItems: engagement.complianceItems.map((ci) => ({
        observationTitle: ci.observation.title,
        status: ci.status,
        daysOpen: ci.daysOpen,
        escalationLevel: ci.escalationLevel,
        branchResponseDue: ci.branchResponseDue,
      })),
      bhCertificate: {
        signedById: engagement.bhCertSignedById,
        signedAt: engagement.bhCertSignedAt,
        comments: engagement.bhCertComments,
      },
      riskRating: {
        percentageScore: riskRating.percentageScore,
        ratingBand: riskRating.ratingBand,
        observationCount: riskRating.observationCount,
        criticalCount: riskRating.criticalCount,
        highCount: riskRating.highCount,
        mediumCount: riskRating.mediumCount,
        lowCount: riskRating.lowCount,
        repeatFindingCount: riskRating.repeatFindingCount,
      },
    };
  }
}
```

  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/services/reports/report-data-fetcher.ts
  ```
  </verify>
  <done>
  - report-data-fetcher.ts exists with ReportDataFetcher class
  - AuditReportData interface includes all 13+ sheet data structures
  - fetchAuditReportData() consolidates engagement, branch, RAM, observations, cash, loans, SMA/NPA, compliance, BH cert
  - Includes risk rating computation via RiskRatingService
  - TypeScript compiles successfully
  </done>
</task>

<task type="auto">
  <name>Task 3: XLSX generator service — structure only (stub per-sheet methods)</name>
  <files>src/services/reports/xlsx-generator.ts (new)</files>
  <action>
  Create `src/services/reports/xlsx-generator.ts` with class structure and sheet method stubs:

```typescript
import ExcelJS from "exceljs";
import type { AuditReportData } from "./report-data-fetcher";
import { logger } from "@/lib/logger";

export class XLSXReportGenerator {
  private workbook: ExcelJS.Workbook;
  private data: AuditReportData;

  constructor(data: AuditReportData) {
    this.workbook = new ExcelJS.Workbook();
    this.data = data;
  }

  async generateReport(): Promise<Buffer> {
    try {
      // Generate all sheets
      await this.addCoverSheet();
      await this.addExecutiveSummarySheet();
      await this.addBranchProfileSheet();
      await this.addRAMAssessmentSheet();
      await this.addObservationsByAreaSheet();
      await this.addDetailedObservationsSheet();
      await this.addCashVerificationSheet();
      await this.addLoanReviewSheet();
      await this.addSmaNpaSheet();
      await this.addComplianceStatusSheet();
      await this.addRiskRatingSheet();
      await this.addBHCertificateSheet();
      await this.addAnnexuresSheet();

      // Write to buffer
      const buffer = await this.workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    } catch (error) {
      logger.error({ error }, "Failed to generate XLSX report");
      throw error;
    }
  }

  private async addCoverSheet() {
    const sheet = this.workbook.addWorksheet("Cover");

    // Title
    sheet.mergeCells("A1:F1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = "INTERNAL AUDIT REPORT";
    titleCell.font = { size: 18, bold: true };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 40;

    // Audit details
    sheet.getCell("A3").value = "Audit Number:";
    sheet.getCell("B3").value = this.data.engagement.auditNumber ?? "N/A";

    sheet.getCell("A4").value = "Branch:";
    sheet.getCell("B4").value =
      `${this.data.branch.name} (${this.data.branch.code})`;

    sheet.getCell("A5").value = "Audit Period:";
    sheet.getCell("B5").value =
      this.data.engagement.periodFrom && this.data.engagement.periodTo
        ? `${this.formatDate(this.data.engagement.periodFrom)} to ${this.formatDate(this.data.engagement.periodTo)}`
        : "N/A";

    sheet.getCell("A6").value = "Audit Type:";
    sheet.getCell("B6").value = this.data.engagement.auditType ?? "RBIA";

    sheet.getCell("A7").value = "Overall Rating:";
    const ratingCell = sheet.getCell("B7");
    ratingCell.value = this.data.riskRating.ratingBand;
    ratingCell.font = { bold: true, size: 14 };
    ratingCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: this.getRatingColor(this.data.riskRating.ratingBand) },
    };

    sheet.columns = [
      { width: 25 },
      { width: 40 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
    ];
  }

  private async addExecutiveSummarySheet() {
    const sheet = this.workbook.addWorksheet("Executive Summary");

    sheet.mergeCells("A1:D1");
    sheet.getCell("A1").value = "EXECUTIVE SUMMARY";
    sheet.getCell("A1").font = { size: 14, bold: true };

    let row = 3;

    // Key metrics
    sheet.getCell(`A${row}`).value = "Total Observations:";
    sheet.getCell(`B${row}`).value = this.data.riskRating.observationCount;
    row++;

    sheet.getCell(`A${row}`).value = "Critical:";
    sheet.getCell(`B${row}`).value = this.data.riskRating.criticalCount;
    row++;

    sheet.getCell(`A${row}`).value = "High:";
    sheet.getCell(`B${row}`).value = this.data.riskRating.highCount;
    row++;

    sheet.getCell(`A${row}`).value = "Medium:";
    sheet.getCell(`B${row}`).value = this.data.riskRating.mediumCount;
    row++;

    sheet.getCell(`A${row}`).value = "Low:";
    sheet.getCell(`B${row}`).value = this.data.riskRating.lowCount;
    row++;

    sheet.getCell(`A${row}`).value = "Repeat Findings:";
    sheet.getCell(`B${row}`).value = this.data.riskRating.repeatFindingCount;
    row += 2;

    // Compliance summary
    sheet.getCell(`A${row}`).value = "COMPLIANCE STATUS";
    sheet.getCell(`A${row}`).font = { bold: true };
    row++;

    const statusGroups = this.groupBy(
      this.data.complianceItems,
      (item) => item.status,
    );
    Object.entries(statusGroups).forEach(([status, items]) => {
      sheet.getCell(`A${row}`).value = status.replace(/_/g, " ");
      sheet.getCell(`B${row}`).value = items.length;
      row++;
    });
  }

  private async addBranchProfileSheet() {
    const sheet = this.workbook.addWorksheet("Branch Profile");
    sheet.mergeCells("A1:D1");
    sheet.getCell("A1").value = "BRANCH PROFILE";
    sheet.getCell("A1").font = { size: 14, bold: true };

    const fields = [
      ["Branch Code", this.data.branch.code],
      ["Branch Name", this.data.branch.name],
      ["City", this.data.branch.city],
      ["State", this.data.branch.state],
      ["Zone", this.data.branch.zone?.name ?? "N/A"],
      ["Category", this.data.branch.category ?? "N/A"],
      ["Business Size (₹ Lakh)", this.data.branch.businessSize ?? "N/A"],
      ["Staff Strength", this.data.branch.staffStrength?.toString() ?? "N/A"],
      ["RAM Score", this.data.branch.ramScore ?? "N/A"],
      [
        "Audit Frequency (months)",
        this.data.branch.auditFrequency?.toString() ?? "N/A",
      ],
      [
        "Last Audit Date",
        this.data.branch.lastAuditDate
          ? this.formatDate(this.data.branch.lastAuditDate)
          : "N/A",
      ],
      ["Last Audit Rating", this.data.branch.lastAuditRating ?? "N/A"],
    ];

    let row = 3;
    fields.forEach(([label, value]) => {
      sheet.getCell(`A${row}`).value = label;
      sheet.getCell(`B${row}`).value = value;
      row++;
    });

    sheet.columns = [{ width: 30 }, { width: 40 }];
  }

  private async addRAMAssessmentSheet() {
    const sheet = this.workbook.addWorksheet("RAM Assessment");
    if (!this.data.ramAssessment) {
      sheet.getCell("A1").value = "No RAM Assessment Available";
      return;
    }

    sheet.mergeCells("A1:E1");
    sheet.getCell("A1").value = "RISK ASSESSMENT MATRIX (RAM)";
    sheet.getCell("A1").font = { size: 14, bold: true };

    sheet.getCell("A3").value = "Assessment Year:";
    sheet.getCell("B3").value = this.data.ramAssessment.assessmentYear;
    sheet.getCell("A4").value = "Composite Score:";
    sheet.getCell("B4").value = this.data.ramAssessment.compositeScore ?? "N/A";
    sheet.getCell("A5").value = "Risk Category:";
    sheet.getCell("B5").value = this.data.ramAssessment.riskCategory ?? "N/A";

    // Parameter scores table
    const headerRow = sheet.getRow(7);
    headerRow.values = [
      "Parameter Code",
      "Parameter Name",
      "Score",
      "Max Score",
      "Remarks",
    ];
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    let row = 8;
    this.data.ramAssessment.scores.forEach((score) => {
      const dataRow = sheet.getRow(row);
      dataRow.values = [
        score.paramCode,
        score.paramName,
        score.score,
        "5.00",
        score.remarks ?? "",
      ];
      row++;
    });

    sheet.columns = [
      { width: 15 },
      { width: 40 },
      { width: 12 },
      { width: 12 },
      { width: 30 },
    ];
  }

  private async addObservationsByAreaSheet() {
    const sheet = this.workbook.addWorksheet("Observations by Area");

    sheet.mergeCells("A1:F1");
    sheet.getCell("A1").value = "OBSERVATIONS BY EXAMINATION AREA";
    sheet.getCell("A1").font = { size: 14, bold: true };

    const headerRow = sheet.getRow(3);
    headerRow.values = [
      "Area Code",
      "Area Name",
      "Total Items",
      "Compliant",
      "Non-Compliant",
      "Partial",
      "N/A",
    ];
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    let row = 4;
    this.data.examinationAreas.forEach((area) => {
      const dataRow = sheet.getRow(row);
      dataRow.values = [
        area.code,
        area.name,
        area.itemCount,
        area.compliantCount,
        area.nonCompliantCount,
        area.partialCount,
        area.naCount,
      ];
      row++;
    });

    sheet.columns = [
      { width: 12 },
      { width: 30 },
      { width: 12 },
      { width: 12 },
      { width: 15 },
      { width: 12 },
      { width: 12 },
    ];
  }

  private async addDetailedObservationsSheet() {
    const sheet = this.workbook.addWorksheet("Detailed Observations");

    sheet.mergeCells("A1:G1");
    sheet.getCell("A1").value = "DETAILED OBSERVATIONS";
    sheet.getCell("A1").font = { size: 14, bold: true };

    const headerRow = sheet.getRow(3);
    headerRow.values = [
      "Sr. No.",
      "Title",
      "Area",
      "Severity",
      "Condition",
      "Cause",
      "Effect",
      "Recommendation",
      "Repeat?",
    ];
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    let row = 4;
    this.data.observations.forEach((obs, index) => {
      const dataRow = sheet.getRow(row);
      dataRow.values = [
        index + 1,
        obs.title,
        obs.areaName ?? "N/A",
        obs.severity,
        obs.condition,
        obs.cause,
        obs.effect,
        obs.recommendation,
        obs.isRepeatFinding ? "YES" : "NO",
      ];
      row++;
    });

    sheet.columns = [
      { width: 8 },
      { width: 30 },
      { width: 20 },
      { width: 12 },
      { width: 40 },
      { width: 40 },
      { width: 40 },
      { width: 40 },
      { width: 10 },
    ];
  }

  private async addCashVerificationSheet() {
    const sheet = this.workbook.addWorksheet("Cash Verification");

    if (!this.data.cashCheck) {
      sheet.getCell("A1").value = "No Cash Verification Data";
      return;
    }

    sheet.mergeCells("A1:D1");
    sheet.getCell("A1").value = "CASH VERIFICATION";
    sheet.getCell("A1").font = { size: 14, bold: true };

    const fields = [
      ["Cash in Hand", this.data.cashCheck.cashInHand],
      ["Book Balance", this.data.cashCheck.bookBalance],
      ["Difference", this.data.cashCheck.difference],
      ["Retention Limit", this.data.cashCheck.retentionLimit ?? "N/A"],
      [
        "Verified At",
        this.data.cashCheck.verifiedAt
          ? this.formatDate(this.data.cashCheck.verifiedAt)
          : "N/A",
      ],
    ];

    let row = 3;
    fields.forEach(([label, value]) => {
      sheet.getCell(`A${row}`).value = label;
      sheet.getCell(`B${row}`).value = value;
      row++;
    });

    // ATM balances
    if (this.data.cashCheck.atmBalances) {
      row += 2;
      sheet.getCell(`A${row}`).value = "ATM BALANCES";
      sheet.getCell(`A${row}`).font = { bold: true };
      row++;

      Object.entries(this.data.cashCheck.atmBalances).forEach(
        ([atmId, balance]) => {
          sheet.getCell(`A${row}`).value = atmId;
          sheet.getCell(`B${row}`).value = balance;
          row++;
        },
      );
    }

    sheet.columns = [{ width: 25 }, { width: 20 }];
  }

  private async addLoanReviewSheet() {
    const sheet = this.workbook.addWorksheet("Loan Review");

    sheet.mergeCells("A1:H1");
    sheet.getCell("A1").value = "LOAN REVIEW";
    sheet.getCell("A1").font = { size: 14, bold: true };

    const headerRow = sheet.getRow(3);
    headerRow.values = [
      "Account No",
      "Borrower Name",
      "Product Type",
      "Sanction Amount",
      "Outstanding",
      "Asset Class",
      "DPD",
      "Audit Observation",
    ];
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    let row = 4;
    this.data.loanReviews.forEach((loan) => {
      const dataRow = sheet.getRow(row);
      dataRow.values = [
        loan.accountNo,
        loan.borrowerName,
        loan.productType,
        loan.sanctionAmount,
        loan.outstandingAmount,
        loan.assetClass,
        loan.dpd,
        loan.auditObservation ?? "",
      ];
      row++;
    });

    sheet.columns = [
      { width: 15 },
      { width: 25 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 10 },
      { width: 40 },
    ];
  }

  private async addSmaNpaSheet() {
    const sheet = this.workbook.addWorksheet("SMA-NPA Summary");

    sheet.mergeCells("A1:D1");
    sheet.getCell("A1").value = "SMA/NPA SUMMARY";
    sheet.getCell("A1").font = { size: 14, bold: true };

    const headerRow = sheet.getRow(3);
    headerRow.values = [
      "Category",
      "Account Count",
      "Total Amount (₹)",
      "Remarks",
    ];
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    let row = 4;
    this.data.smaNpaEntries.forEach((entry) => {
      const dataRow = sheet.getRow(row);
      dataRow.values = [
        entry.category,
        entry.accountCount,
        entry.totalAmount,
        entry.remarks ?? "",
      ];
      row++;
    });

    sheet.columns = [
      { width: 20 },
      { width: 15 },
      { width: 20 },
      { width: 30 },
    ];
  }

  private async addComplianceStatusSheet() {
    const sheet = this.workbook.addWorksheet("Compliance Status");

    sheet.mergeCells("A1:F1");
    sheet.getCell("A1").value = "COMPLIANCE STATUS";
    sheet.getCell("A1").font = { size: 14, bold: true };

    const headerRow = sheet.getRow(3);
    headerRow.values = [
      "Observation",
      "Status",
      "Days Open",
      "Escalation Level",
      "Branch Response Due",
    ];
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    let row = 4;
    this.data.complianceItems.forEach((item) => {
      const dataRow = sheet.getRow(row);
      dataRow.values = [
        item.observationTitle,
        item.status.replace(/_/g, " "),
        item.daysOpen,
        item.escalationLevel.replace(/_/g, " "),
        item.branchResponseDue
          ? this.formatDate(item.branchResponseDue)
          : "N/A",
      ];
      row++;
    });

    sheet.columns = [
      { width: 40 },
      { width: 20 },
      { width: 12 },
      { width: 18 },
      { width: 18 },
    ];
  }

  private async addRiskRatingSheet() {
    const sheet = this.workbook.addWorksheet("Risk Rating");

    sheet.mergeCells("A1:D1");
    sheet.getCell("A1").value = "RISK RATING ANALYSIS";
    sheet.getCell("A1").font = { size: 14, bold: true };

    const fields = [
      ["Overall Rating Band", this.data.riskRating.ratingBand],
      ["Percentage Score", `${this.data.riskRating.percentageScore}%`],
      ["Total Observations", this.data.riskRating.observationCount],
      ["Critical", this.data.riskRating.criticalCount],
      ["High", this.data.riskRating.highCount],
      ["Medium", this.data.riskRating.mediumCount],
      ["Low", this.data.riskRating.lowCount],
      ["Repeat Findings", this.data.riskRating.repeatFindingCount],
    ];

    let row = 3;
    fields.forEach(([label, value]) => {
      sheet.getCell(`A${row}`).value = label;
      sheet.getCell(`B${row}`).value = value;
      if (label === "Overall Rating Band") {
        sheet.getCell(`B${row}`).font = { bold: true, size: 14 };
        sheet.getCell(`B${row}`).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: this.getRatingColor(this.data.riskRating.ratingBand),
          },
        };
      }
      row++;
    });

    sheet.columns = [{ width: 25 }, { width: 20 }];
  }

  private async addBHCertificateSheet() {
    const sheet = this.workbook.addWorksheet("BH Certificate");

    sheet.mergeCells("A1:D1");
    sheet.getCell("A1").value = "BRANCH HEAD CERTIFICATE";
    sheet.getCell("A1").font = { size: 14, bold: true };

    sheet.getCell("A3").value = "Signed By:";
    sheet.getCell("B3").value = this.data.bhCertificate.signedById ?? "Pending";

    sheet.getCell("A4").value = "Signed At:";
    sheet.getCell("B4").value = this.data.bhCertificate.signedAt
      ? this.formatDate(this.data.bhCertificate.signedAt)
      : "Pending";

    sheet.getCell("A5").value = "Comments:";
    sheet.getCell("B5").value = this.data.bhCertificate.comments ?? "N/A";

    sheet.columns = [{ width: 25 }, { width: 50 }];
  }

  private async addAnnexuresSheet() {
    const sheet = this.workbook.addWorksheet("Annexures");

    sheet.mergeCells("A1:D1");
    sheet.getCell("A1").value = "ANNEXURES";
    sheet.getCell("A1").font = { size: 14, bold: true };

    sheet.getCell("A3").value = "Team Members:";
    sheet.getCell("A3").font = { bold: true };

    let row = 4;
    this.data.teamMembers.forEach((member) => {
      sheet.getCell(`A${row}`).value = member.name;
      sheet.getCell(`B${row}`).value = member.role;
      sheet.getCell(`C${row}`).value = member.assignedSections.join(", ");
      row++;
    });

    sheet.columns = [{ width: 25 }, { width: 20 }, { width: 40 }];
  }

  // Helper methods
  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  private getRatingColor(rating: string): string {
    const colors: Record<string, string> = {
      VERY_GOOD: "FF90EE90", // Light green
      GOOD: "FF98FB98", // Pale green
      SATISFACTORY: "FFFFFFE0", // Light yellow
      MODERATE: "FFFFA07A", // Light salmon
      POOR: "FFFF6B6B", // Light red
    };
    return colors[rating] ?? "FFFFFFFF";
  }

  private groupBy<T>(
    array: T[],
    keyFn: (item: T) => string,
  ): Record<string, T[]> {
    return array.reduce(
      (acc, item) => {
        const key = keyFn(item);
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      },
      {} as Record<string, T[]>,
    );
  }
}
```

  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/services/reports/xlsx-generator.ts
  ```
  </verify>
  <done>
  - xlsx-generator.ts exists with XLSXReportGenerator class
  - 13 sheet methods implemented: Cover, Executive Summary, Branch Profile, RAM, Observations by Area, Detailed Observations, Cash, Loan Review, SMA/NPA, Compliance, Risk Rating, BH Certificate, Annexures
  - generateReport() orchestrates all sheets and returns Buffer
  - Formatting includes colors, merged cells, bold headers
  - TypeScript compiles successfully
  </done>
</task>

<task type="auto">
  <name>Task 4: Server action — generate XLSX report</name>
  <files>src/actions/reports/generate-xlsx.ts (new)</files>
  <action>
  Create `src/actions/reports/generate-xlsx.ts`:

```typescript
"use server";

import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import { ReportDataFetcher } from "@/services/reports/report-data-fetcher";
import { XLSXReportGenerator } from "@/services/reports/xlsx-generator";
import { uploadToS3 } from "@/lib/s3";
import { computeRiskRating } from "./compute-risk-rating";

/**
 * Generate XLSX report for an audit engagement.
 *
 * Steps:
 * 1. Compute risk rating (if not already computed)
 * 2. Fetch all audit data
 * 3. Generate XLSX with XLSXReportGenerator
 * 4. Upload to S3
 * 5. Create ReportMetadata record
 *
 * Security: Requires report:generate permission
 * Returns: { success, data: { reportId, s3Key }, error? }
 */
export async function generateXLSXReport(engagementId: string) {
  // ─── Step 1: Authentication ────────────────────────────────────
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  // ─── Step 2: Permission Check ──────────────────────────────────
  if (!hasPermission(userRoles, "report:generate")) {
    return {
      success: false as const,
      error: "You do not have permission to generate reports.",
    };
  }

  // ─── Step 3: Tenant-Scoped Database ────────────────────────────
  const db = prismaForTenant(tenantId);

  try {
    // ─── Step 4: Compute Risk Rating (if needed) ───────────────
    const ratingResult = await computeRiskRating(engagementId);
    if (!ratingResult.success) {
      return ratingResult;
    }

    // ─── Step 5: Fetch Report Data ─────────────────────────────
    const dataFetcher = new ReportDataFetcher(tenantId);
    const reportData = await dataFetcher.fetchAuditReportData(engagementId);

    // ─── Step 6: Generate XLSX ─────────────────────────────────
    const generator = new XLSXReportGenerator(reportData);
    const xlsxBuffer = await generator.generateReport();

    // ─── Step 7: Upload to S3 ──────────────────────────────────
    const filename = `audit-report-${reportData.engagement.auditNumber ?? engagementId}.xlsx`;
    const s3Key = `reports/${tenantId}/${engagementId}/${filename}`;

    await uploadToS3(
      s3Key,
      xlsxBuffer,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    // ─── Step 8: Create ReportMetadata ─────────────────────────
    const reportMetadata = await db.reportMetadata.create({
      data: {
        tenantId,
        engagementId,
        format: "XLSX",
        status: "DRAFT",
        riskScore: ratingResult.data!.percentageScore,
        ratingBand: ratingResult.data!.ratingBand,
        s3Key,
        fileSize: xlsxBuffer.length,
        filename,
        generatedById: session.user.id,
      },
    });

    logger.info(
      {
        reportId: reportMetadata.id,
        engagementId,
        tenantId,
        s3Key,
      },
      "XLSX report generated",
    );

    // ─── Step 9: Success Response ──────────────────────────────
    return {
      success: true as const,
      data: {
        reportId: reportMetadata.id,
        s3Key,
        filename,
      },
    };
  } catch (error) {
    // ─── Step 10: Error Handling ───────────────────────────────
    logger.error(
      { error, engagementId, tenantId },
      "Failed to generate XLSX report",
    );

    return {
      success: false as const,
      error: "Failed to generate report. Please try again.",
    };
  }
}
```

  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/actions/reports/generate-xlsx.ts
  ```
  </verify>
  <done>
  - generate-xlsx.ts exists with generateXLSXReport() server action
  - Calls computeRiskRating() first
  - Fetches data with ReportDataFetcher
  - Generates XLSX with XLSXReportGenerator
  - Uploads to S3 and creates ReportMetadata record
  - Permission check: report:generate
  - TypeScript compiles successfully
  </done>
</task>

## Success Criteria

1. `pnpm exec tsc --noEmit` passes for all new files
2. exceljs dependency installed and available
3. ReportDataFetcher consolidates all audit data (13+ data structures)
4. XLSXReportGenerator creates 13+ sheets with formatting
5. generateXLSXReport() action uploads to S3 and creates ReportMetadata
6. Report includes risk rating from Plan 02
7. All sheets match bank audit format specifications
8. Report stored with DRAFT status in ReportMetadata for approval workflow
