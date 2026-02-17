---
phase: 2
plan: 4
type: standard
wave: 2
depends_on: [2]
files_modified:
  - src/components/pdf-report/audit-summary-document.tsx
  - src/actions/reports/generate-pdf.ts
  - package.json
autonomous: true
must_haves:
  truths:
    - "PDF summary report includes executive summary, key findings, risk rating, BH certificate"
    - "Uses @react-pdf/renderer for declarative PDF generation"
    - "PDF is styled to match professional audit report format"
    - "Generated PDF is uploaded to S3 and linked to engagement"
    - "PDF includes branch profile, audit team, severity breakdown"
  artifacts:
    - path: "src/components/pdf-report/audit-summary-document.tsx"
      provides: "React-PDF Document component for audit summary"
    - path: "src/actions/reports/generate-pdf.ts"
      provides: "Server action to render PDF and upload to S3"
  key_links:
    - from: "AuditSummaryDocument"
      to: "getAuditReportData"
      via: "Accepts audit data as props for rendering"
    - from: "generate-pdf action"
      to: "ReactPDF.renderToBuffer"
      via: "Renders component to PDF buffer for S3 upload"
---

## Objective

Build PDF summary report generator for audit engagements. Uses @react-pdf/renderer to create professional-looking summary reports with executive summary, key findings by severity, risk rating, branch profile, and BH certificate. Generated PDFs are uploaded to S3 for download and archival.

## Context

@AEGIS/src/components/pdf-report/audit-summary-document.tsx — NEW: React-PDF component
@AEGIS/src/actions/reports/generate-pdf.ts — NEW: server action
@AEGIS/src/data-access/reports.ts — getAuditReportData (from Plan 2)
@AEGIS/.planning/REQUIREMENTS.md — R30
@AEGIS/.planning/codebase/CONVENTIONS.md — component patterns, server action patterns

## Tasks

<task type="auto">
  <name>Task 1: Install @react-pdf/renderer + create PDF document component</name>
  <files>package.json, src/components/pdf-report/audit-summary-document.tsx</files>
  <action>
  **1a. Install @react-pdf/renderer:**

  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm add @react-pdf/renderer
  ```

  **1b. Create `src/components/pdf-report/audit-summary-document.tsx`:**

  ```typescript
  /**
   * Audit Summary PDF Document (Phase 2 — R30)
   *
   * React-PDF component for generating professional audit summary reports.
   */

  import React from "react";
  import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font,
  } from "@react-pdf/renderer";
  import type { Prisma } from "@/generated/prisma";

  // Type for audit data
  type AuditReportData = NonNullable<
    Prisma.PromiseReturnType<typeof import("@/data-access/reports").getAuditReportData>
  >;

  interface AuditSummaryDocumentProps {
    auditData: AuditReportData;
  }

  // PDF Styles
  const styles = StyleSheet.create({
    page: {
      padding: 40,
      fontSize: 10,
      fontFamily: "Helvetica",
    },
    header: {
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 20,
      textAlign: "center",
      borderBottom: "2 solid #000",
      paddingBottom: 10,
    },
    section: {
      marginBottom: 15,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "bold",
      marginBottom: 8,
      color: "#1e3a8a",
      borderBottom: "1 solid #cbd5e1",
      paddingBottom: 4,
    },
    row: {
      flexDirection: "row",
      marginBottom: 4,
    },
    label: {
      width: "40%",
      fontWeight: "bold",
    },
    value: {
      width: "60%",
    },
    table: {
      marginTop: 10,
    },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: "#e2e8f0",
      padding: 8,
      fontWeight: "bold",
      borderBottom: "1 solid #000",
    },
    tableRow: {
      flexDirection: "row",
      padding: 8,
      borderBottom: "1 solid #cbd5e1",
    },
    col1: { width: "10%" },
    col2: { width: "50%" },
    col3: { width: "20%" },
    col4: { width: "20%" },
    ratingBox: {
      marginTop: 10,
      padding: 15,
      backgroundColor: "#f0f9ff",
      border: "2 solid #3b82f6",
      borderRadius: 4,
    },
    ratingText: {
      fontSize: 16,
      fontWeight: "bold",
      textAlign: "center",
      color: "#1e3a8a",
    },
    footer: {
      position: "absolute",
      bottom: 30,
      left: 40,
      right: 40,
      textAlign: "center",
      fontSize: 8,
      color: "#64748b",
      borderTop: "1 solid #cbd5e1",
      paddingTop: 10,
    },
  });

  export const AuditSummaryDocument: React.FC<AuditSummaryDocumentProps> = ({
    auditData,
  }) => {
    const criticalObs = auditData.observations?.filter((o) => o.severity === "CRITICAL") || [];
    const highObs = auditData.observations?.filter((o) => o.severity === "HIGH") || [];
    const mediumObs = auditData.observations?.filter((o) => o.severity === "MEDIUM") || [];
    const lowObs = auditData.observations?.filter((o) => o.severity === "LOW") || [];

    return (
      <Document>
        <Page size="A4" style={styles.page}>
          {/* Header */}
          <Text style={styles.header}>Internal Audit Report - Summary</Text>

          {/* Audit Metadata */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Audit Details</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Audit Number:</Text>
              <Text style={styles.value}>{auditData.auditNumber || "N/A"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Branch:</Text>
              <Text style={styles.value}>{auditData.branch?.name || "N/A"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Branch Code:</Text>
              <Text style={styles.value}>{auditData.branch?.code || "N/A"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>City:</Text>
              <Text style={styles.value}>{auditData.branch?.city || "N/A"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Audit Type:</Text>
              <Text style={styles.value}>{auditData.auditType || "RBIA"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Period:</Text>
              <Text style={styles.value}>
                {auditData.periodFrom
                  ? new Date(auditData.periodFrom).toLocaleDateString()
                  : "N/A"}{" "}
                to{" "}
                {auditData.periodTo
                  ? new Date(auditData.periodTo).toLocaleDateString()
                  : "N/A"}
              </Text>
            </View>
          </View>

          {/* Risk Rating */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overall Risk Rating</Text>
            <View style={styles.ratingBox}>
              <Text style={styles.ratingText}>
                {auditData.overallRiskRating || "Not Computed"}
              </Text>
            </View>
          </View>

          {/* Executive Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Executive Summary</Text>
            <Text style={{ marginTop: 5, lineHeight: 1.5 }}>
              This audit was conducted at {auditData.branch?.name || "the branch"} covering the
              period from {auditData.periodFrom ? new Date(auditData.periodFrom).toLocaleDateString() : "N/A"} to{" "}
              {auditData.periodTo ? new Date(auditData.periodTo).toLocaleDateString() : "N/A"}. A total of{" "}
              {auditData.observations?.length || 0} observations were identified during the audit,
              comprising {criticalObs.length} critical, {highObs.length} high, {mediumObs.length} medium,
              and {lowObs.length} low severity findings.
            </Text>
          </View>

          {/* Severity Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observations by Severity</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={{ width: "30%" }}>Severity</Text>
                <Text style={{ width: "20%" }}>Count</Text>
                <Text style={{ width: "50%" }}>Percentage</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={{ width: "30%" }}>Critical</Text>
                <Text style={{ width: "20%" }}>{criticalObs.length}</Text>
                <Text style={{ width: "50%" }}>
                  {auditData.observations?.length
                    ? ((criticalObs.length / auditData.observations.length) * 100).toFixed(1)
                    : 0}
                  %
                </Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={{ width: "30%" }}>High</Text>
                <Text style={{ width: "20%" }}>{highObs.length}</Text>
                <Text style={{ width: "50%" }}>
                  {auditData.observations?.length
                    ? ((highObs.length / auditData.observations.length) * 100).toFixed(1)
                    : 0}
                  %
                </Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={{ width: "30%" }}>Medium</Text>
                <Text style={{ width: "20%" }}>{mediumObs.length}</Text>
                <Text style={{ width: "50%" }}>
                  {auditData.observations?.length
                    ? ((mediumObs.length / auditData.observations.length) * 100).toFixed(1)
                    : 0}
                  %
                </Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={{ width: "30%" }}>Low</Text>
                <Text style={{ width: "20%" }}>{lowObs.length}</Text>
                <Text style={{ width: "50%" }}>
                  {auditData.observations?.length
                    ? ((lowObs.length / auditData.observations.length) * 100).toFixed(1)
                    : 0}
                  %
                </Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            Generated by AEGIS Audit System on {new Date().toLocaleString()}
          </Text>
        </Page>

        {/* Page 2: Key Findings */}
        <Page size="A4" style={styles.page}>
          <Text style={styles.header}>Key Findings</Text>

          {/* Critical Findings */}
          {criticalObs.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Critical Severity Observations</Text>
              {criticalObs.slice(0, 5).map((obs, idx) => (
                <View key={obs.id} style={{ marginBottom: 10 }}>
                  <Text style={{ fontWeight: "bold" }}>
                    {idx + 1}. {obs.title}
                  </Text>
                  <Text style={{ marginTop: 3, fontSize: 9 }}>
                    Condition: {obs.condition.substring(0, 200)}
                    {obs.condition.length > 200 ? "..." : ""}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* High Findings */}
          {highObs.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>High Severity Observations</Text>
              {highObs.slice(0, 3).map((obs, idx) => (
                <View key={obs.id} style={{ marginBottom: 10 }}>
                  <Text style={{ fontWeight: "bold" }}>
                    {idx + 1}. {obs.title}
                  </Text>
                  <Text style={{ marginTop: 3, fontSize: 9 }}>
                    Condition: {obs.condition.substring(0, 150)}
                    {obs.condition.length > 150 ? "..." : ""}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* BH Certificate Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Branch Head Certificate</Text>
            {auditData.bhCertSignedAt ? (
              <>
                <View style={styles.row}>
                  <Text style={styles.label}>Signed At:</Text>
                  <Text style={styles.value}>
                    {new Date(auditData.bhCertSignedAt).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Comments:</Text>
                  <Text style={styles.value}>
                    {auditData.bhCertComments || "No comments provided"}
                  </Text>
                </View>
              </>
            ) : (
              <Text>Branch Head certificate pending</Text>
            )}
          </View>

          <Text style={styles.footer}>
            Generated by AEGIS Audit System on {new Date().toLocaleString()} | Page 2 of 2
          </Text>
        </Page>
      </Document>
    );
  };
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit --pretty 2>&1 | grep "audit-summary-document" | head -10
  ```
  No TypeScript errors.
  </verify>
  <done>
  - @react-pdf/renderer added to package.json
  - src/components/pdf-report/audit-summary-document.tsx exists
  - AuditSummaryDocument is a React-PDF Document component
  - PDF has 2 pages: Summary page + Key Findings page
  - Page 1 includes: audit metadata, risk rating box, executive summary, severity breakdown table
  - Page 2 includes: critical/high findings (top 5/3), BH certificate section
  - Professional styling with borders, colors, proper spacing
  - Footer with generation timestamp on both pages
  </done>
</task>

<task type="auto">
  <name>Task 2: Server action to generate and upload PDF</name>
  <files>src/actions/reports/generate-pdf.ts</files>
  <action>
  **Create `src/actions/reports/generate-pdf.ts`:**

  ```typescript
  "use server";

  import { revalidatePath } from "next/cache";
  import { renderToBuffer } from "@react-pdf/renderer";
  import { getRequiredSession } from "@/data-access/session";
  import { hasPermission, type Role } from "@/lib/permissions";
  import { logger } from "@/lib/logger";
  import { getAuditReportData } from "@/data-access/reports";
  import { AuditSummaryDocument } from "@/components/pdf-report/audit-summary-document";
  import { uploadToS3 } from "@/lib/s3";
  import { ComputeRiskRatingSchema } from "./schemas";

  /**
   * Generate PDF summary report and upload to S3.
   * Security: Requires report:generate permission.
   * Side effects: Uploads PDF to S3.
   */
  export async function generatePdfReport(input: { engagementId: string }) {
    const session = await getRequiredSession();
    const userRoles = ((session.user as any).roles ?? []) as Role[];
    const tenantId = (session.user as any).tenantId as string;

    if (!hasPermission(userRoles, "report:generate")) {
      return {
        success: false as const,
        error: "You do not have permission to generate reports.",
      };
    }

    const parsed = ComputeRiskRatingSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues[0].message,
      };
    }

    try {
      // Fetch audit data
      const auditData = await getAuditReportData(session, parsed.data.engagementId);

      if (!auditData) {
        return {
          success: false as const,
          error: "Audit engagement not found.",
        };
      }

      if (auditData.status !== "COMPLETED") {
        return {
          success: false as const,
          error: "Can only generate reports for completed audits.",
        };
      }

      // Render PDF
      logger.info(
        { engagementId: parsed.data.engagementId },
        "Generating PDF audit summary"
      );

      const buffer = await renderToBuffer(
        AuditSummaryDocument({ auditData })
      );

      // Upload to S3
      const filename = `audit-reports/${tenantId}/${auditData.auditNumber || auditData.id}_summary.pdf`;
      const s3Key = await uploadToS3({
        key: filename,
        body: Buffer.from(buffer),
        contentType: "application/pdf",
      });

      logger.info(
        { engagementId: parsed.data.engagementId, s3Key },
        "PDF summary uploaded to S3"
      );

      revalidatePath(`/audit-plans/${parsed.data.engagementId}`);
      revalidatePath("/reports");

      return {
        success: true as const,
        data: {
          engagementId: parsed.data.engagementId,
          s3Key,
          filename: `${auditData.auditNumber || auditData.id}_summary.pdf`,
        },
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to generate PDF report.";
      logger.error({ error, action: "generate_pdf_report", tenantId }, message);
      return { success: false as const, error: message };
    }
  }
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit --pretty 2>&1 | grep "generate-pdf" | head -10
  ```
  No TypeScript errors.
  </verify>
  <done>
  - src/actions/reports/generate-pdf.ts exists
  - generatePdfReport action follows AEGIS conventions
  - Action requires report:generate permission
  - Action only processes COMPLETED engagements
  - Action calls getAuditReportData() to fetch full data
  - Action uses renderToBuffer() to convert React-PDF component to buffer
  - Action uploads PDF buffer to S3 with application/pdf content type
  - Action returns S3 key + filename
  - Action logs generation + upload events
  </done>
</task>

## Success Criteria

1. `pnpm exec tsc --noEmit` has no errors in PDF generation files
2. @react-pdf/renderer dependency added to package.json
3. AuditSummaryDocument is a valid React-PDF Document component with 2 pages
4. Page 1 includes audit metadata, risk rating, executive summary, severity breakdown
5. Page 2 includes top critical/high findings and BH certificate section
6. PDF styling includes proper headers, tables, borders, colors
7. generatePdfReport action validates COMPLETED status
8. Action renders PDF using renderToBuffer()
9. Generated PDF uploaded to S3 with correct content type
10. Action returns S3 key and filename for download
