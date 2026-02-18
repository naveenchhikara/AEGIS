"use server";

import React from "react";
import { revalidatePath } from "next/cache";
import { renderToBuffer } from "@react-pdf/renderer";
import { getRequiredSession } from "@/data-access/session";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import { getAuditReportData } from "@/data-access/reports";
import { AuditSummaryDocument } from "@/components/pdf-report/audit-summary-document";
import { uploadToS3 } from "@/lib/s3";
import { prismaForTenant } from "@/data-access/prisma";
import { GenerateReportSchema, type GenerateReportInput } from "./schemas";

/**
 * Generate PDF summary report and upload to S3.
 * Security: Requires report:generate permission.
 * R32: Supports optional templateId for custom report formatting.
 */
export async function generatePdfReport(input: GenerateReportInput) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "report:generate")) {
    return {
      success: false as const,
      error: "You do not have permission to generate reports.",
    };
  }

  const parsed = GenerateReportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }

  try {
    // Fetch template if specified (R32)
    let templateData: Record<string, any> | null = null;
    if (parsed.data.templateId) {
      const db = prismaForTenant(tenantId);
      const template = await db.reportTemplate.findFirst({
        where: { id: parsed.data.templateId, tenantId, isActive: true },
      });
      if (template) {
        templateData = template.templateData as Record<string, any>;
      }
    }

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(
      React.createElement(AuditSummaryDocument, { auditData }) as any
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
