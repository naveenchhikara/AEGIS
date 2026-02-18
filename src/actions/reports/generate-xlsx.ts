"use server";

import { revalidatePath } from "next/cache";
import { getRequiredSession } from "@/data-access/session";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import { getAuditReportData } from "@/data-access/reports";
import { generateAuditReportXLSX } from "@/lib/excel-export/audit-report-generator";
import { prismaForTenant } from "@/data-access/prisma";
import { uploadToS3 } from "@/lib/s3";
import { GenerateReportSchema, type GenerateReportInput } from "./schemas";

/**
 * Generate XLSX audit report and upload to S3.
 * Security: Requires report:generate permission.
 * Side effects: Uploads file to S3, stores S3 key in database (future: link to engagement).
 * R32: Supports optional templateId for custom report formatting.
 */
export async function generateXlsxReport(input: GenerateReportInput) {
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

    // Generate XLSX
    logger.info(
      { engagementId: parsed.data.engagementId },
      "Generating XLSX audit report"
    );

    // R32: Pass template data to generator for custom formatting
    const buffer = await generateAuditReportXLSX(auditData, templateData ?? undefined);

    // Upload to S3
    const filename = `audit-reports/${tenantId}/${auditData.auditNumber || auditData.id}_report.xlsx`;
    const s3Key = await uploadToS3({
      key: filename,
      body: buffer,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    logger.info(
      { engagementId: parsed.data.engagementId, s3Key },
      "XLSX report uploaded to S3"
    );

    // In a real implementation, you might store the S3 key in a GeneratedReport model
    // For now, just return the S3 key for download

    revalidatePath(`/audit-plans/${parsed.data.engagementId}`);
    revalidatePath("/reports");

    return {
      success: true as const,
      data: {
        engagementId: parsed.data.engagementId,
        s3Key,
        filename: `${auditData.auditNumber || auditData.id}_report.xlsx`,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate XLSX report.";
    logger.error({ error, action: "generate_xlsx_report", tenantId }, message);
    return { success: false as const, error: message };
  }
}
