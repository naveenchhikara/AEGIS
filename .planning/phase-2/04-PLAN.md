---
phase: 2
plan: 4
type: standard
wave: 2
depends_on: [1, 2, 3]
files_modified:
  - src/services/reports/pdf-generator.ts (new)
  - src/actions/reports/generate-pdf.ts (new)
  - src/actions/reports/transition-report.ts (new)
  - package.json (add puppeteer)
autonomous: true
must_haves:
  truths:
    - "PDF summary report with executive summary, key findings, risk rating, BH certificate"
    - "Uses puppeteer for PDF generation from HTML template"
    - "Report workflow: DRAFT → UNDER_REVIEW → APPROVED → ISSUED"
    - "Transition actions check permissions: review requires report:review, approve requires report:approve, issue requires report:issue"
    - "Status history tracked in ReportMetadata (reviewedBy/At, approvedBy/At, issuedAt)"
  artifacts:
    - path: "src/services/reports/pdf-generator.ts"
      provides: "PDFReportGenerator class with generateSummaryReport()"
    - path: "src/actions/reports/generate-pdf.ts"
      provides: "Server action to generate PDF summary report"
    - path: "src/actions/reports/transition-report.ts"
      provides: "Server action for report workflow transitions"
---

## Objective

Implement PDF summary report generation with executive summary, key findings, risk rating, and BH certificate. Implement report routing workflow (draft → reviewed → approved → issued) with permission checks and status tracking.

This plan covers R30 (PDF report) and R33 (report routing workflow).

## Context

@AEGIS/prisma/schema.prisma — ReportMetadata model with workflow fields
@AEGIS/src/services/reports/report-data-fetcher.ts — Report data fetcher from Plan 03
@AEGIS/.planning/REQUIREMENTS.md — R30, R33
@AEGIS/.planning/codebase/CONVENTIONS.md — server action patterns

## Tasks

<task type="auto">
  <name>Task 1: Add puppeteer dependency</name>
  <files>package.json</files>
  <action>
  Add puppeteer to dependencies:

```bash
cd /root/.openclaw/workspace/AEGIS && pnpm add puppeteer
```

**Note:** Puppeteer includes Chrome binary, ~300MB download.
</action>
<verify>

```bash
cd /root/.openclaw/workspace/AEGIS && pnpm list puppeteer
```

  </verify>
  <done>
  - puppeteer added to package.json dependencies
  - pnpm-lock.yaml updated
  </done>
</task>

<task type="auto">
  <name>Task 2: PDF generator service</name>
  <files>src/services/reports/pdf-generator.ts (new)</files>
  <action>
  Create `src/services/reports/pdf-generator.ts`:

```typescript
import puppeteer from "puppeteer";
import type { AuditReportData } from "./report-data-fetcher";
import { logger } from "@/lib/logger";

export class PDFReportGenerator {
  private data: AuditReportData;

  constructor(data: AuditReportData) {
    this.data = data;
  }

  async generateSummaryReport(): Promise<Buffer> {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();

      const html = this.buildHTML();
      await page.setContent(html, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "20mm",
          right: "15mm",
          bottom: "20mm",
          left: "15mm",
        },
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      logger.error({ error }, "Failed to generate PDF report");
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private buildHTML(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .cover {
            text-align: center;
            padding: 50px 0;
            page-break-after: always;
          }
          .cover h1 {
            font-size: 32px;
            margin-bottom: 40px;
          }
          .cover .details {
            text-align: left;
            margin: 0 auto;
            width: 80%;
            font-size: 16px;
          }
          .cover .details p {
            margin: 10px 0;
          }
          .section {
            margin: 30px 0;
            page-break-inside: avoid;
          }
          .section h2 {
            color: #0066cc;
            border-bottom: 2px solid #0066cc;
            padding-bottom: 5px;
            margin-bottom: 15px;
          }
          .rating-badge {
            display: inline-block;
            padding: 10px 20px;
            border-radius: 5px;
            font-weight: bold;
            font-size: 18px;
            color: white;
          }
          .rating-VERY_GOOD { background-color: #28a745; }
          .rating-GOOD { background-color: #5cb85c; }
          .rating-SATISFACTORY { background-color: #ffc107; }
          .rating-MODERATE { background-color: #fd7e14; }
          .rating-POOR { background-color: #dc3545; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          table th, table td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
          }
          table th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          .observation {
            margin: 15px 0;
            padding: 15px;
            border-left: 4px solid #dc3545;
            background-color: #f8f9fa;
          }
          .observation.CRITICAL { border-left-color: #dc3545; }
          .observation.HIGH { border-left-color: #fd7e14; }
          .observation.MEDIUM { border-left-color: #ffc107; }
          .observation.LOW { border-left-color: #17a2b8; }
          .observation h4 {
            margin: 0 0 10px 0;
            color: #333;
          }
          .observation p {
            margin: 5px 0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        ${this.buildCoverPage()}
        ${this.buildExecutiveSummary()}
        ${this.buildBranchProfile()}
        ${this.buildRiskRating()}
        ${this.buildObservations()}
        ${this.buildBHCertificate()}
        ${this.buildFooter()}
      </body>
      </html>
    `;
  }

  private buildCoverPage(): string {
    return `
      <div class="cover">
        <h1>INTERNAL AUDIT REPORT</h1>
        <div class="details">
          <p><strong>Audit Number:</strong> ${this.data.engagement.auditNumber ?? "N/A"}</p>
          <p><strong>Branch:</strong> ${this.data.branch.name} (${this.data.branch.code})</p>
          <p><strong>City:</strong> ${this.data.branch.city}, ${this.data.branch.state}</p>
          <p><strong>Audit Period:</strong> ${this.formatDateRange(this.data.engagement.periodFrom, this.data.engagement.periodTo)}</p>
          <p><strong>Audit Type:</strong> ${this.data.engagement.auditType ?? "RBIA"}</p>
          <p><strong>Overall Rating:</strong> 
            <span class="rating-badge rating-${this.data.riskRating.ratingBand}">
              ${this.data.riskRating.ratingBand.replace(/_/g, " ")}
            </span>
          </p>
        </div>
      </div>
    `;
  }

  private buildExecutiveSummary(): string {
    return `
      <div class="section">
        <h2>Executive Summary</h2>
        <p>
          This report presents the findings of the ${this.data.engagement.auditType ?? "Risk-Based Internal Audit"} 
          conducted at ${this.data.branch.name} branch for the period 
          ${this.formatDateRange(this.data.engagement.periodFrom, this.data.engagement.periodTo)}.
        </p>
        
        <h3>Key Highlights</h3>
        <table>
          <tr>
            <th>Metric</th>
            <th>Value</th>
          </tr>
          <tr>
            <td>Total Observations</td>
            <td>${this.data.riskRating.observationCount}</td>
          </tr>
          <tr>
            <td>Critical Findings</td>
            <td>${this.data.riskRating.criticalCount}</td>
          </tr>
          <tr>
            <td>High Severity</td>
            <td>${this.data.riskRating.highCount}</td>
          </tr>
          <tr>
            <td>Medium Severity</td>
            <td>${this.data.riskRating.mediumCount}</td>
          </tr>
          <tr>
            <td>Low Severity</td>
            <td>${this.data.riskRating.lowCount}</td>
          </tr>
          <tr>
            <td>Repeat Findings</td>
            <td>${this.data.riskRating.repeatFindingCount}</td>
          </tr>
          <tr>
            <td><strong>Overall Rating</strong></td>
            <td><strong>${this.data.riskRating.ratingBand.replace(/_/g, " ")} (${this.data.riskRating.percentageScore}%)</strong></td>
          </tr>
        </table>
      </div>
    `;
  }

  private buildBranchProfile(): string {
    return `
      <div class="section">
        <h2>Branch Profile</h2>
        <table>
          <tr><td><strong>Branch Code</strong></td><td>${this.data.branch.code}</td></tr>
          <tr><td><strong>Branch Name</strong></td><td>${this.data.branch.name}</td></tr>
          <tr><td><strong>Location</strong></td><td>${this.data.branch.city}, ${this.data.branch.state}</td></tr>
          <tr><td><strong>Zone</strong></td><td>${this.data.branch.zone?.name ?? "N/A"}</td></tr>
          <tr><td><strong>Category</strong></td><td>${this.data.branch.category ?? "N/A"}</td></tr>
          <tr><td><strong>Business Size</strong></td><td>₹ ${this.data.branch.businessSize ?? "N/A"} Lakh</td></tr>
          <tr><td><strong>Staff Strength</strong></td><td>${this.data.branch.staffStrength ?? "N/A"}</td></tr>
          <tr><td><strong>RAM Score</strong></td><td>${this.data.branch.ramScore ?? "N/A"}</td></tr>
          <tr><td><strong>Last Audit Date</strong></td><td>${this.data.branch.lastAuditDate ? this.formatDate(this.data.branch.lastAuditDate) : "N/A"}</td></tr>
          <tr><td><strong>Last Audit Rating</strong></td><td>${this.data.branch.lastAuditRating ?? "N/A"}</td></tr>
        </table>
      </div>
    `;
  }

  private buildRiskRating(): string {
    return `
      <div class="section">
        <h2>Risk Rating Analysis</h2>
        <p>
          The overall risk rating is calculated based on the severity and frequency of observations, 
          with repeat findings weighted at 1.5×. The rating scale ranges from Poor (≤40%) to Very Good (&gt;80%).
        </p>
        <table>
          <tr><th>Parameter</th><th>Value</th></tr>
          <tr><td>Percentage Score</td><td><strong>${this.data.riskRating.percentageScore}%</strong></td></tr>
          <tr><td>Rating Band</td><td><strong class="rating-badge rating-${this.data.riskRating.ratingBand}">${this.data.riskRating.ratingBand.replace(/_/g, " ")}</strong></td></tr>
        </table>
      </div>
    `;
  }

  private buildObservations(): string {
    let html = `
      <div class="section">
        <h2>Detailed Observations</h2>
    `;

    if (this.data.observations.length === 0) {
      html += `<p>No observations recorded.</p>`;
    } else {
      this.data.observations.forEach((obs, index) => {
        html += `
          <div class="observation ${obs.severity}">
            <h4>${index + 1}. ${obs.title} ${obs.isRepeatFinding ? "(REPEAT)" : ""}</h4>
            <p><strong>Area:</strong> ${obs.areaName ?? "N/A"}</p>
            <p><strong>Severity:</strong> ${obs.severity}</p>
            <p><strong>Condition:</strong> ${obs.condition}</p>
            <p><strong>Cause:</strong> ${obs.cause}</p>
            <p><strong>Effect:</strong> ${obs.effect}</p>
            <p><strong>Recommendation:</strong> ${obs.recommendation}</p>
          </div>
        `;
      });
    }

    html += `</div>`;
    return html;
  }

  private buildBHCertificate(): string {
    return `
      <div class="section">
        <h2>Branch Head Certificate</h2>
        <p><strong>Status:</strong> ${this.data.bhCertificate.signedAt ? "Signed" : "Pending"}</p>
        ${
          this.data.bhCertificate.signedAt
            ? `
          <p><strong>Signed At:</strong> ${this.formatDate(this.data.bhCertificate.signedAt)}</p>
          ${this.data.bhCertificate.comments ? `<p><strong>Comments:</strong> ${this.data.bhCertificate.comments}</p>` : ""}
        `
            : ""
        }
      </div>
    `;
  }

  private buildFooter(): string {
    return `
      <div class="footer">
        <p>Generated on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>
        <p>Internal Audit Department</p>
      </div>
    `;
  }

  private formatDate(date: Date | null): string {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  private formatDateRange(from: Date | null, to: Date | null): string {
    if (!from || !to) return "N/A";
    return `${this.formatDate(from)} to ${this.formatDate(to)}`;
  }
}
```

  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/services/reports/pdf-generator.ts
  ```
  </verify>
  <done>
  - pdf-generator.ts exists with PDFReportGenerator class
  - generateSummaryReport() uses puppeteer to render HTML to PDF
  - Includes cover, executive summary, branch profile, risk rating, observations, BH certificate
  - Professional styling with rating colors
  - TypeScript compiles successfully
  </done>
</task>

<task type="auto">
  <name>Task 3: Server action — generate PDF</name>
  <files>src/actions/reports/generate-pdf.ts (new)</files>
  <action>
  Create `src/actions/reports/generate-pdf.ts`:

```typescript
"use server";

import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import { ReportDataFetcher } from "@/services/reports/report-data-fetcher";
import { PDFReportGenerator } from "@/services/reports/pdf-generator";
import { uploadToS3 } from "@/lib/s3";
import { computeRiskRating } from "./compute-risk-rating";

export async function generatePDFReport(engagementId: string) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "report:generate")) {
    return {
      success: false as const,
      error: "You do not have permission to generate reports.",
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const ratingResult = await computeRiskRating(engagementId);
    if (!ratingResult.success) {
      return ratingResult;
    }

    const dataFetcher = new ReportDataFetcher(tenantId);
    const reportData = await dataFetcher.fetchAuditReportData(engagementId);

    const generator = new PDFReportGenerator(reportData);
    const pdfBuffer = await generator.generateSummaryReport();

    const filename = `audit-summary-${reportData.engagement.auditNumber ?? engagementId}.pdf`;
    const s3Key = `reports/${tenantId}/${engagementId}/${filename}`;

    await uploadToS3(s3Key, pdfBuffer, "application/pdf");

    const reportMetadata = await db.reportMetadata.create({
      data: {
        tenantId,
        engagementId,
        format: "PDF",
        status: "DRAFT",
        riskScore: ratingResult.data!.percentageScore,
        ratingBand: ratingResult.data!.ratingBand,
        s3Key,
        fileSize: pdfBuffer.length,
        filename,
        generatedById: session.user.id,
      },
    });

    logger.info(
      { reportId: reportMetadata.id, engagementId, tenantId, s3Key },
      "PDF report generated",
    );

    return {
      success: true as const,
      data: {
        reportId: reportMetadata.id,
        s3Key,
        filename,
      },
    };
  } catch (error) {
    logger.error(
      { error, engagementId, tenantId },
      "Failed to generate PDF report",
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
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/actions/reports/generate-pdf.ts
  ```
  </verify>
  <done>
  - generate-pdf.ts exists with generatePDFReport() action
  - Similar flow to XLSX generation
  - Creates ReportMetadata with PDF format and DRAFT status
  - TypeScript compiles successfully
  </done>
</task>

<task type="auto">
  <name>Task 4: Server action — report workflow transitions</name>
  <files>src/actions/reports/transition-report.ts (new)</files>
  <action>
  Create `src/actions/reports/transition-report.ts`:

```typescript
"use server";

import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import { z } from "zod";
import type { ReportStatus } from "@/generated/prisma/enums";

const ReviewReportSchema = z.object({
  reportId: z.string().uuid(),
  comments: z.string().optional(),
});

const ApproveReportSchema = z.object({
  reportId: z.string().uuid(),
  comments: z.string().optional(),
});

const IssueReportSchema = z.object({
  reportId: z.string().uuid(),
});

/**
 * Transition report to UNDER_REVIEW status.
 * Security: Requires report:review permission
 */
export async function reviewReport(input: z.infer<typeof ReviewReportSchema>) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "report:review")) {
    return {
      success: false as const,
      error: "You do not have permission to review reports.",
    };
  }

  const parsed = ReviewReportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const report = await db.reportMetadata.findFirst({
      where: { id: parsed.data.reportId, tenantId },
    });

    if (!report) {
      return {
        success: false as const,
        error: "Report not found.",
      };
    }

    if (report.status !== "DRAFT") {
      return {
        success: false as const,
        error: `Cannot review report in ${report.status} status.`,
      };
    }

    const updated = await db.reportMetadata.update({
      where: { id: parsed.data.reportId },
      data: {
        status: "UNDER_REVIEW",
        reviewedById: session.user.id,
        reviewedAt: new Date(),
        reviewComments: parsed.data.comments,
      },
    });

    logger.info({ reportId: updated.id, tenantId }, "Report reviewed");

    return {
      success: true as const,
      data: { reportId: updated.id },
    };
  } catch (error) {
    logger.error(
      { error, reportId: input.reportId, tenantId },
      "Failed to review report",
    );
    return {
      success: false as const,
      error: "Failed to review report. Please try again.",
    };
  }
}

/**
 * Transition report to APPROVED status.
 * Security: Requires report:approve permission
 */
export async function approveReport(
  input: z.infer<typeof ApproveReportSchema>,
) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "report:approve")) {
    return {
      success: false as const,
      error: "You do not have permission to approve reports.",
    };
  }

  const parsed = ApproveReportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const report = await db.reportMetadata.findFirst({
      where: { id: parsed.data.reportId, tenantId },
    });

    if (!report) {
      return {
        success: false as const,
        error: "Report not found.",
      };
    }

    if (report.status !== "UNDER_REVIEW") {
      return {
        success: false as const,
        error: `Cannot approve report in ${report.status} status.`,
      };
    }

    const updated = await db.reportMetadata.update({
      where: { id: parsed.data.reportId },
      data: {
        status: "APPROVED",
        approvedById: session.user.id,
        approvedAt: new Date(),
        approvalComments: parsed.data.comments,
      },
    });

    logger.info({ reportId: updated.id, tenantId }, "Report approved");

    return {
      success: true as const,
      data: { reportId: updated.id },
    };
  } catch (error) {
    logger.error(
      { error, reportId: input.reportId, tenantId },
      "Failed to approve report",
    );
    return {
      success: false as const,
      error: "Failed to approve report. Please try again.",
    };
  }
}

/**
 * Transition report to ISSUED status.
 * Security: Requires report:issue permission
 */
export async function issueReport(input: z.infer<typeof IssueReportSchema>) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "report:issue")) {
    return {
      success: false as const,
      error: "You do not have permission to issue reports.",
    };
  }

  const parsed = IssueReportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const report = await db.reportMetadata.findFirst({
      where: { id: parsed.data.reportId, tenantId },
    });

    if (!report) {
      return {
        success: false as const,
        error: "Report not found.",
      };
    }

    if (report.status !== "APPROVED") {
      return {
        success: false as const,
        error: `Cannot issue report in ${report.status} status. Must be APPROVED first.`,
      };
    }

    const updated = await db.reportMetadata.update({
      where: { id: parsed.data.reportId },
      data: {
        status: "ISSUED",
        issuedAt: new Date(),
      },
    });

    logger.info({ reportId: updated.id, tenantId }, "Report issued");

    return {
      success: true as const,
      data: { reportId: updated.id },
    };
  } catch (error) {
    logger.error(
      { error, reportId: input.reportId, tenantId },
      "Failed to issue report",
    );
    return {
      success: false as const,
      error: "Failed to issue report. Please try again.",
    };
  }
}
```

  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/actions/reports/transition-report.ts
  ```
  </verify>
  <done>
  - transition-report.ts exists with 3 workflow actions
  - reviewReport() transitions DRAFT → UNDER_REVIEW (requires report:review)
  - approveReport() transitions UNDER_REVIEW → APPROVED (requires report:approve)
  - issueReport() transitions APPROVED → ISSUED (requires report:issue)
  - Each action validates current status and permission
  - TypeScript compiles successfully
  </done>
</task>

## Success Criteria

1. `pnpm exec tsc --noEmit` passes for all new files
2. puppeteer dependency installed
3. PDFReportGenerator creates professional PDF with executive summary, findings, risk rating
4. generatePDFReport() action uploads to S3 and creates ReportMetadata
5. Report workflow actions enforce status transitions: DRAFT → UNDER_REVIEW → APPROVED → ISSUED
6. Permission checks: report:review, report:approve, report:issue
7. Workflow history tracked in ReportMetadata (reviewedBy/At, approvedBy/At, issuedAt)
