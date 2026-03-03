"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";

/**
 * Schema for creating/updating regulatory observations (R77).
 */
const ManageRegulatoryObservationSchema = z.object({
  observationId: z.string().uuid().optional(),
  source: z.enum(["RBI_INSPECTION", "STATUTORY_AUDITOR", "EXTERNAL"]),
  referenceNo: z.string().min(1),
  paraNo: z.string().optional(),
  description: z.string().min(10),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  atrStatus: z
    .enum(["DRAFT", "SUBMITTED", "ACCEPTED", "FURTHER_INFO", "CLOSED"])
    .optional(),
  issueId: z.string().uuid().optional(),
});

type ManageRegulatoryObservationInput = z.infer<
  typeof ManageRegulatoryObservationSchema
>;

/**
 * Create or update regulatory observation (R77).
 * Security: Requires regulatory:manage permission.
 * Atomicity: Single transaction with audit context.
 */
export async function manageRegulatoryObservation(
  input: ManageRegulatoryObservationInput,
) {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (!hasPermission(userRoles, "regulatory:manage")) {
    return {
      success: false as const,
      error: "You do not have permission to manage regulatory observations.",
    };
  }

  const parsed = ManageRegulatoryObservationSchema.safeParse(input);
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
        actionType: parsed.data.observationId
          ? "regulatory.observation_updated"
          : "regulatory.observation_created",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      if (parsed.data.observationId) {
        // Update existing observation — include tenantId in WHERE to prevent IDOR
        const updated = await tx.regulatoryObservation.update({
          where: { id: parsed.data.observationId, tenantId },
          data: {
            description: parsed.data.description,
            severity: parsed.data.severity,
            paraNo: parsed.data.paraNo,
            atrStatus: parsed.data.atrStatus,
            issueId: parsed.data.issueId,
          },
        });
        return updated;
      } else {
        // Create new observation
        const created = await tx.regulatoryObservation.create({
          data: {
            tenantId,
            source: parsed.data.source,
            referenceNo: parsed.data.referenceNo,
            paraNo: parsed.data.paraNo,
            description: parsed.data.description,
            severity: parsed.data.severity,
            atrStatus: "DRAFT",
            issueId: parsed.data.issueId,
          },
        });
        return created;
      }
    });

    revalidatePath("/regulatory/observations");

    return {
      success: true as const,
      data: {
        id: result.id,
        referenceNo: result.referenceNo,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to manage regulatory observation.";
    logger.error(
      { error, action: "manage_regulatory_observation", tenantId },
      message,
    );
    return { success: false as const, error: message };
  }
}
