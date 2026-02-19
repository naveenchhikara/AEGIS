"use server";

import { revalidatePath } from "next/cache";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import { z } from "zod";

// ─── Schema ──────────────────────────────────────────────────────

const ChecklistItemSchema = z.object({
  id: z.string(),
  question: z.string(),
  category: z.string(),
  compliant: z.boolean(),
  evidence: z.string(),
  remarks: z.string(),
});

export const SaveClassificationChecklistSchema = z.object({
  engagementId: z.string().uuid("Invalid engagement ID").optional(),
  checklistItems: z.array(ChecklistItemSchema),
  overallRating: z.enum([
    "FULL_COMPLIANCE",
    "SUBSTANTIAL_COMPLIANCE",
    "PARTIAL_COMPLIANCE",
    "NON_COMPLIANCE",
  ]),
  period: z.string().optional(),
});

export type SaveClassificationChecklistInput = z.infer<
  typeof SaveClassificationChecklistSchema
>;

/**
 * Save investment classification checklist (R96).
 *
 * Security:
 * - Requires risk_mis:write permission
 * - tenantId sourced from authenticated session
 *
 * Atomicity:
 * - Creates or updates IsAuditChecklist record
 * - Sets audit context for AuditLog trigger
 *
 * @param input - Classification checklist data
 * @returns Success with checklist ID or error message
 */
export async function saveClassificationChecklist(
  input: SaveClassificationChecklistInput,
) {
  // ─── Step 1: Authentication ────────────────────────────────────
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  // ─── Step 2: Permission Check ──────────────────────────────────
  // R96: Investment classification — accessible to IS_AUDITOR, RISK_HEAD, AUDIT_MANAGER
  if (
    !hasPermission(userRoles, "risk_mis:read") &&
    !hasPermission(userRoles, "report:generate")
  ) {
    return {
      success: false as const,
      error: "You do not have permission to save classification checklists.",
    };
  }

  // ─── Step 3: Input Validation ──────────────────────────────────
  const parsed = SaveClassificationChecklistSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }
  const validated = parsed.data;

  // ─── Step 4: Tenant-Scoped Database ────────────────────────────
  const db = prismaForTenant(tenantId);

  // ─── Step 5: Transaction (Atomic Operation) ────────────────────
  try {
    const result = await db.$transaction(async (tx: any) => {
      // Set audit context for AuditLog trigger
      await setAuditContext(tx, {
        actionType: "investment.classification_checklist_saved",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Prepare checklist data
      const checklistData = {
        category: "CLASSIFICATION",
        checklistName: "HTM/HFT/AFS Classification Compliance",
        items: validated.checklistItems,
        overallRating: validated.overallRating,
        completedById: session.user.id,
        completedAt: new Date(),
        ...(validated.engagementId && { engagementId: validated.engagementId }),
      };

      // Check if a checklist already exists for this engagement or period
      const existingChecklist = validated.engagementId
        ? await tx.isAuditChecklist.findFirst({
            where: {
              tenantId,
              engagementId: validated.engagementId,
              category: "CLASSIFICATION",
            },
          })
        : null;

      let checklist;
      if (existingChecklist) {
        // Update existing checklist
        checklist = await tx.isAuditChecklist.update({
          where: { id: existingChecklist.id },
          data: checklistData,
        });
      } else {
        // Create new checklist
        checklist = await tx.isAuditChecklist.create({
          data: {
            tenantId,
            ...checklistData,
          },
        });
      }

      return checklist;
    });

    // ─── Step 6: Cache Revalidation ────────────────────────────
    revalidatePath("/investments");
    if (validated.engagementId) {
      revalidatePath(`/audit-execution/${validated.engagementId}`);
    }

    // ─── Step 7: Success Response ──────────────────────────────
    return {
      success: true as const,
      data: { id: result.id },
    };
  } catch (error) {
    // ─── Step 8: Error Handling ────────────────────────────────
    logger.error(
      { error, action: "save_classification_checklist", tenantId },
      "Failed to save classification checklist",
    );

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to save classification checklist. Please try again.";

    return {
      success: false as const,
      error: errorMessage,
    };
  }
}
