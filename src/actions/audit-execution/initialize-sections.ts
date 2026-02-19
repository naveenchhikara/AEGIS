"use server";

import { revalidatePath } from "next/cache";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import { InitializeSectionsSchema } from "./schemas";

/**
 * Initialize section instances for an engagement from active examination areas.
 * Creates one AuditSectionInstance per active ExaminationArea.
 * Idempotent: skips areas that already have a section instance.
 * Security: Requires audit_execution:manage_sections permission.
 */
export async function initializeSections(input: { engagementId: string }) {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (!hasPermission(userRoles, "audit_execution:manage_sections")) {
    return {
      success: false as const,
      error: "You do not have permission to manage audit sections.",
    };
  }

  const parsed = InitializeSectionsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }

  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "audit_sections.initialized",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Verify engagement
      const engagement = await tx.auditEngagement.findFirst({
        where: { id: parsed.data.engagementId, tenantId },
      });
      if (!engagement) {
        throw new Error("Engagement not found");
      }

      // Get all active examination areas
      const areas = await tx.examinationArea.findMany({
        where: { tenantId, isActive: true },
        orderBy: { displayOrder: "asc" },
      });

      // Get existing section instances to avoid duplicates
      const existingSections = await tx.auditSectionInstance.findMany({
        where: { engagementId: parsed.data.engagementId, tenantId },
        select: { sectionCode: true },
      });
      const existingCodes = new Set(
        existingSections.map((s: any) => s.sectionCode),
      );

      // Create section instances for areas that don't have one yet
      const newSections = [];
      for (const area of areas) {
        if (!existingCodes.has(area.code)) {
          const section = await tx.auditSectionInstance.create({
            data: {
              tenantId,
              engagementId: parsed.data.engagementId,
              sectionCode: area.code,
              sectionName: area.name,
              status: "NOT_STARTED",
            },
          });
          newSections.push(section);
        }
      }

      return {
        total: areas.length,
        created: newSections.length,
        skipped: existingCodes.size,
      };
    });

    revalidatePath("/audit-execution");
    return { success: true as const, data: result };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to initialize sections.";
    logger.error({ error, action: "initialize_sections", tenantId }, message);
    return { success: false as const, error: message };
  }
}
