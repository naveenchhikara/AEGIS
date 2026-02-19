"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";

/**
 * Schema for creating/updating concurrent audit scope templates (R73).
 */
const ManageTemplateSchema = z.object({
  templateId: z.string().uuid().optional(),
  scopeArea: z.enum([
    "CASH",
    "INVESTMENTS",
    "ADVANCES",
    "OFF_BS",
    "DEPOSITS",
    "KYC",
    "EDP",
  ]),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  checklistItems: z.array(
    z.object({
      id: z.string().optional(),
      particulars: z.string(),
      riskCategory: z.string().optional(),
      regulatoryRef: z.string().optional(),
    }),
  ),
  isActive: z.boolean().optional(),
});

type ManageTemplateInput = z.infer<typeof ManageTemplateSchema>;

/**
 * Create or update concurrent audit scope template (R73).
 * Security: Requires concurrent_audit:execute permission.
 * Atomicity: Single transaction with audit context.
 */
export async function manageTemplate(input: ManageTemplateInput) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "concurrent_audit:execute")) {
    return {
      success: false as const,
      error: "You do not have permission to manage concurrent audit templates.",
    };
  }

  const parsed = ManageTemplateSchema.safeParse(input);
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
        actionType: parsed.data.templateId
          ? "concurrent_audit.template_updated"
          : "concurrent_audit.template_created",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      if (parsed.data.templateId) {
        // Update existing template
        const updated = await tx.concurrentAuditTemplate.update({
          where: { id: parsed.data.templateId },
          data: {
            name: parsed.data.name,
            description: parsed.data.description,
            checklistItems: parsed.data.checklistItems,
            isActive: parsed.data.isActive,
          },
        });
        return updated;
      } else {
        // Create new template
        const created = await tx.concurrentAuditTemplate.create({
          data: {
            tenantId,
            scopeArea: parsed.data.scopeArea,
            name: parsed.data.name,
            description: parsed.data.description,
            checklistItems: parsed.data.checklistItems,
            isActive: true,
          },
        });
        return created;
      }
    });

    revalidatePath("/concurrent-audit/templates");

    return {
      success: true as const,
      data: {
        id: result.id,
        name: result.name,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to manage concurrent audit template.";
    logger.error(
      { error, action: "manage_concurrent_template", tenantId },
      message,
    );
    return { success: false as const, error: message };
  }
}

/**
 * Delete concurrent audit template.
 */
export async function deleteTemplate(templateId: string) {
  if (!z.string().uuid().safeParse(templateId).success) return { success: false as const, error: "Invalid ID." };
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "concurrent_audit:execute")) {
    return {
      success: false as const,
      error: "You do not have permission to delete concurrent audit templates.",
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "concurrent_audit.template_deleted",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      await tx.concurrentAuditTemplate.delete({
        where: { id: templateId },
      });
    });

    revalidatePath("/concurrent-audit/templates");

    return {
      success: true as const,
      data: { deleted: true },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete template.";
    logger.error(
      { error, action: "delete_concurrent_template", tenantId },
      message,
    );
    return { success: false as const, error: message };
  }
}
