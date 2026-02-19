"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";

/**
 * Schema for ATR (Action Taken Report) workflow (R78).
 */
const SubmitAtrSchema = z.object({
  observationId: z.string().uuid(),
  atrText: z.string().min(50).max(5000),
  action: z.enum(["SUBMIT", "MARK_ACCEPTED", "REQUEST_INFO"]),
  remarks: z.string().optional(),
});

type SubmitAtrInput = z.infer<typeof SubmitAtrSchema>;

/**
 * ATR workflow: draft → submitted → accepted (R78).
 * Security:
 * - SUBMIT: Requires regulatory:manage permission
 * - MARK_ACCEPTED: Requires regulatory:atr_submit permission (typically CAE/CEO)
 * - REQUEST_INFO: Requires regulatory:atr_submit permission
 * State transitions:
 * - DRAFT → SUBMITTED (action: SUBMIT)
 * - SUBMITTED → ACCEPTED (action: MARK_ACCEPTED)
 * - SUBMITTED → FURTHER_INFO (action: REQUEST_INFO)
 */
export async function submitAtr(input: SubmitAtrInput) {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  const parsed = SubmitAtrSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }

  // Permission check based on action
  if (parsed.data.action === "SUBMIT") {
    if (!hasPermission(userRoles, "regulatory:manage")) {
      return {
        success: false as const,
        error: "You do not have permission to submit ATR.",
      };
    }
  } else {
    // MARK_ACCEPTED or REQUEST_INFO
    if (!hasPermission(userRoles, "regulatory:atr_submit")) {
      return {
        success: false as const,
        error: "You do not have permission to accept or request info on ATR.",
      };
    }
  }

  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: `regulatory.atr_${parsed.data.action.toLowerCase()}`,
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Get current observation
      const current = await tx.regulatoryObservation.findUnique({
        where: { id: parsed.data.observationId },
      });

      if (!current) {
        throw new Error("Regulatory observation not found");
      }

      let newStatus: string;
      let timestamps: Record<string, Date | undefined> = {};

      switch (parsed.data.action) {
        case "SUBMIT":
          if (
            current.atrStatus !== "DRAFT" &&
            current.atrStatus !== "FURTHER_INFO"
          ) {
            throw new Error(
              "Can only submit ATR from DRAFT or FURTHER_INFO status",
            );
          }
          newStatus = "SUBMITTED";
          timestamps.submittedAt = new Date();
          break;

        case "MARK_ACCEPTED":
          if (current.atrStatus !== "SUBMITTED") {
            throw new Error("Can only accept ATR from SUBMITTED status");
          }
          newStatus = "ACCEPTED";
          timestamps.acceptedAt = new Date();
          break;

        case "REQUEST_INFO":
          if (current.atrStatus !== "SUBMITTED") {
            throw new Error("Can only request info from SUBMITTED status");
          }
          newStatus = "FURTHER_INFO";
          break;

        default:
          throw new Error("Invalid action");
      }

      // Update observation
      const updated = await tx.regulatoryObservation.update({
        where: { id: parsed.data.observationId },
        data: {
          atrText: parsed.data.atrText,
          atrStatus: newStatus,
          ...timestamps,
        },
      });

      return {
        id: updated.id,
        newStatus,
      };
    });

    revalidatePath("/regulatory/observations");
    revalidatePath(`/regulatory/observations/${parsed.data.observationId}`);

    return {
      success: true as const,
      data: result,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to process ATR.";
    logger.error({ error, action: "submit_atr", tenantId }, message);
    return { success: false as const, error: message };
  }
}
