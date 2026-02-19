"use server";

import { revalidatePath } from "next/cache";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import {
  SubmitExaminationResponseSchema,
  type SubmitExaminationResponseInput,
} from "./schemas";

/**
 * Submit or update an examination response for a specific item.
 * If status is NON_COMPLIANT, auto-creates a linked Observation (R17).
 * Security: Requires examination:respond permission.
 * Atomicity: Response + observation creation in single transaction.
 */
export async function submitExaminationResponse(
  input: SubmitExaminationResponseInput,
) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "examination:respond")) {
    return {
      success: false as const,
      error: "You do not have permission to submit examination responses.",
    };
  }

  const parsed = SubmitExaminationResponseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }
  const validated = parsed.data;

  // NON_COMPLIANT requires observation text
  if (validated.status === "NON_COMPLIANT" && !validated.observation) {
    return {
      success: false as const,
      error: "Observation text is required for non-compliant items.",
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "examination_response.submitted",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Verify engagement and item exist
      const engagement = await tx.auditEngagement.findFirst({
        where: { id: validated.engagementId, tenantId },
        select: { id: true, branchId: true },
      });
      if (!engagement) {
        throw new Error("Engagement not found");
      }

      const item = await tx.examinationItem.findFirst({
        where: { id: validated.itemId, tenantId },
        include: { area: { select: { id: true, name: true, code: true } } },
      });
      if (!item) {
        throw new Error("Examination item not found");
      }

      // Check if response already exists
      const existingResponse = await tx.auditExaminationResponse.findFirst({
        where: {
          engagementId: validated.engagementId,
          itemId: validated.itemId,
        },
      });

      let observationId: string | null = null;

      // Auto-create observation for NON_COMPLIANT items (R17)
      if (validated.status === "NON_COMPLIANT") {
        // If there's already a linked observation, update it instead of creating new
        if (existingResponse?.observationId) {
          await tx.observation.update({
            where: { id: existingResponse.observationId },
            data: {
              condition: validated.observation!,
              severity:
                validated.riskRating === "CRITICAL"
                  ? "CRITICAL"
                  : validated.riskRating === "HIGH"
                    ? "HIGH"
                    : validated.riskRating === "MEDIUM"
                      ? "MEDIUM"
                      : "LOW",
            },
          });
          observationId = existingResponse.observationId;
        } else {
          // Create new observation
          const observation = await tx.observation.create({
            data: {
              tenantId,
              title: `[${item.itemNumber}] ${item.area.name} — Non-Compliant`,
              condition: validated.observation!,
              criteria: item.particulars,
              cause: "Identified during examination",
              effect: "Non-compliance with audit requirements",
              recommendation: "To be determined during review",
              severity:
                validated.riskRating === "CRITICAL"
                  ? "CRITICAL"
                  : validated.riskRating === "HIGH"
                    ? "HIGH"
                    : validated.riskRating === "MEDIUM"
                      ? "MEDIUM"
                      : "LOW",
              status: "DRAFT",
              branchId: engagement.branchId,
              auditAreaId: item.area.id,
              engagementId: validated.engagementId,
              createdById: session.user.id,
              riskCategory: item.riskCategory,
            },
          });
          observationId = observation.id;

          // Create timeline entry
          await tx.observationTimeline.create({
            data: {
              tenantId,
              observationId: observation.id,
              event: "created",
              comment: `Auto-created from examination item ${item.itemNumber}`,
              createdById: session.user.id,
            },
          });
        }
      }

      // Upsert examination response
      const response = await tx.auditExaminationResponse.upsert({
        where: {
          engagementId_itemId: {
            engagementId: validated.engagementId,
            itemId: validated.itemId,
          },
        },
        update: {
          status: validated.status,
          observation: validated.observation ?? null,
          riskRating: validated.riskRating ?? null,
          respondedById: session.user.id,
          respondedAt: new Date(),
          observationId,
        },
        create: {
          tenantId,
          engagementId: validated.engagementId,
          itemId: validated.itemId,
          status: validated.status,
          observation: validated.observation ?? null,
          riskRating: validated.riskRating ?? null,
          respondedById: session.user.id,
          respondedAt: new Date(),
          observationId,
        },
      });

      return {
        responseId: response.id,
        observationId,
        autoCreatedObservation:
          validated.status === "NON_COMPLIANT" &&
          !existingResponse?.observationId,
      };
    });

    revalidatePath("/audit-execution");
    revalidatePath("/findings");
    return { success: true as const, data: result };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to submit examination response.";
    logger.error(
      { error, action: "submit_examination_response", tenantId },
      message,
    );
    return { success: false as const, error: message };
  }
}
