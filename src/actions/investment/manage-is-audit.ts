"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";

/**
 * Schema for IS audit checklist management (R98-R101).
 */
const ManageIsAuditChecklistSchema = z.object({
  checklistId: z.string().uuid().optional(),
  category: z.enum([
    "CBS",
    "CHANNELS",
    "ACCESS_CONTROL",
    "BCP_DR",
    "VENDOR",
    "CHANGE_MGMT",
    "CYBER_SECURITY",
  ]),
  checklistName: z.string().min(1),
  items: z.array(
    z.object({
      id: z.string().optional(),
      question: z.string(),
      response: z
        .enum(["COMPLIANT", "NON_COMPLIANT", "PARTIAL", "NOT_APPLICABLE"])
        .optional(),
      evidence: z.string().optional(),
      remarks: z.string().optional(),
    }),
  ),
  engagementId: z.string().uuid().optional(),
  completedById: z.string().uuid().optional(),
  overallRating: z
    .enum(["SATISFACTORY", "NEEDS_IMPROVEMENT", "UNSATISFACTORY"])
    .optional(),
});

const ManageApplicationInventorySchema = z.object({
  appId: z.string().uuid().optional(),
  appName: z.string().min(1),
  vendor: z.string().optional(),
  version: z.string().optional(),
  hostingType: z.enum(["ON_PREMISE", "CLOUD", "HYBRID"]),
  criticality: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  drTested: z.boolean().optional(),
  lastDrTestDate: z.coerce.date().optional(),
  lastIsAuditDate: z.coerce.date().optional(),
  dataClassification: z
    .enum(["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"])
    .optional(),
  description: z.string().optional(),
});

const ManageVendorRiskSchema = z.object({
  assessmentId: z.string().uuid().optional(),
  applicationId: z.string().uuid().optional(),
  vendorName: z.string().min(1),
  contractStart: z.coerce.date().optional(),
  contractEnd: z.coerce.date().optional(),
  slaCompliance: z.number().min(0).max(100).optional(),
  riskRating: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  lastAssessmentDate: z.coerce.date().optional(),
  findings: z.string().optional(),
  mitigations: z.string().optional(),
});

type ManageIsAuditChecklistInput = z.infer<typeof ManageIsAuditChecklistSchema>;
type ManageApplicationInventoryInput = z.infer<
  typeof ManageApplicationInventorySchema
>;
type ManageVendorRiskInput = z.infer<typeof ManageVendorRiskSchema>;

/**
 * Create or update IS audit checklist (R99, R101, R103).
 * Security: Requires IS_AUDITOR role or concurrent_audit:execute permission.
 */
export async function manageIsAuditChecklist(
  input: ManageIsAuditChecklistInput,
) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (
    !userRoles.includes("IS_AUDITOR") &&
    !hasPermission(userRoles, "concurrent_audit:execute")
  ) {
    return {
      success: false as const,
      error: "You do not have permission to manage IS audit checklists.",
    };
  }

  const parsed = ManageIsAuditChecklistSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: parsed.data.checklistId
          ? "is_audit.checklist_updated"
          : "is_audit.checklist_created",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      const completedAt = parsed.data.overallRating ? new Date() : null;

      if (parsed.data.checklistId) {
        const updated = await tx.isAuditChecklist.update({
          where: { id: parsed.data.checklistId },
          data: {
            items: parsed.data.items,
            completedById: parsed.data.completedById,
            completedAt,
            overallRating: parsed.data.overallRating,
          },
        });
        return updated;
      } else {
        const created = await tx.isAuditChecklist.create({
          data: {
            tenantId,
            category: parsed.data.category,
            checklistName: parsed.data.checklistName,
            items: parsed.data.items,
            engagementId: parsed.data.engagementId,
            completedById: parsed.data.completedById,
            completedAt,
            overallRating: parsed.data.overallRating,
          },
        });
        return created;
      }
    });

    revalidatePath("/is-audit/checklists");
    if (parsed.data.engagementId) {
      revalidatePath(`/audit-plans/${parsed.data.engagementId}`);
    }

    return {
      success: true as const,
      data: { id: result.id },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to manage IS audit checklist.";
    logger.error(
      { error, action: "manage_is_audit_checklist", tenantId },
      message,
    );
    return { success: false as const, error: message };
  }
}

/**
 * Create or update application inventory (R98).
 */
export async function manageApplicationInventory(
  input: ManageApplicationInventoryInput,
) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (
    !userRoles.includes("IS_AUDITOR") &&
    !hasPermission(userRoles, "concurrent_audit:execute")
  ) {
    return {
      success: false as const,
      error: "You do not have permission to manage application inventory.",
    };
  }

  const parsed = ManageApplicationInventorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: parsed.data.appId
          ? "is_audit.app_updated"
          : "is_audit.app_created",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      if (parsed.data.appId) {
        const updated = await tx.applicationInventory.update({
          where: { id: parsed.data.appId },
          data: {
            vendor: parsed.data.vendor,
            version: parsed.data.version,
            criticality: parsed.data.criticality,
            drTested: parsed.data.drTested,
            lastDrTestDate: parsed.data.lastDrTestDate,
            lastIsAuditDate: parsed.data.lastIsAuditDate,
            dataClassification: parsed.data.dataClassification,
            description: parsed.data.description,
          },
        });
        return updated;
      } else {
        const created = await tx.applicationInventory.create({
          data: {
            tenantId,
            appName: parsed.data.appName,
            vendor: parsed.data.vendor,
            version: parsed.data.version,
            hostingType: parsed.data.hostingType,
            criticality: parsed.data.criticality,
            drTested: parsed.data.drTested ?? false,
            lastDrTestDate: parsed.data.lastDrTestDate,
            lastIsAuditDate: parsed.data.lastIsAuditDate,
            dataClassification: parsed.data.dataClassification,
            description: parsed.data.description,
          },
        });
        return created;
      }
    });

    revalidatePath("/is-audit/applications");

    return {
      success: true as const,
      data: { id: result.id },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to manage application inventory.";
    logger.error({ error, action: "manage_app_inventory", tenantId }, message);
    return { success: false as const, error: message };
  }
}

/**
 * Create or update vendor risk assessment (R100).
 */
export async function manageVendorRiskAssessment(input: ManageVendorRiskInput) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (
    !userRoles.includes("IS_AUDITOR") &&
    !hasPermission(userRoles, "concurrent_audit:execute")
  ) {
    return {
      success: false as const,
      error: "You do not have permission to manage vendor risk assessments.",
    };
  }

  const parsed = ManageVendorRiskSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: parsed.data.assessmentId
          ? "is_audit.vendor_risk_updated"
          : "is_audit.vendor_risk_created",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      if (parsed.data.assessmentId) {
        const updated = await tx.vendorRiskAssessment.update({
          where: { id: parsed.data.assessmentId },
          data: {
            contractEnd: parsed.data.contractEnd,
            slaCompliance: parsed.data.slaCompliance,
            riskRating: parsed.data.riskRating,
            lastAssessmentDate: parsed.data.lastAssessmentDate,
            findings: parsed.data.findings,
            mitigations: parsed.data.mitigations,
          },
        });
        return updated;
      } else {
        const created = await tx.vendorRiskAssessment.create({
          data: {
            tenantId,
            applicationId: parsed.data.applicationId,
            vendorName: parsed.data.vendorName,
            contractStart: parsed.data.contractStart,
            contractEnd: parsed.data.contractEnd,
            slaCompliance: parsed.data.slaCompliance,
            riskRating: parsed.data.riskRating,
            lastAssessmentDate: parsed.data.lastAssessmentDate,
            findings: parsed.data.findings,
            mitigations: parsed.data.mitigations,
          },
        });
        return created;
      }
    });

    revalidatePath("/is-audit/vendors");
    if (parsed.data.applicationId) {
      revalidatePath(`/is-audit/applications/${parsed.data.applicationId}`);
    }

    return {
      success: true as const,
      data: { id: result.id },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to manage vendor risk assessment.";
    logger.error({ error, action: "manage_vendor_risk", tenantId }, message);
    return { success: false as const, error: message };
  }
}
