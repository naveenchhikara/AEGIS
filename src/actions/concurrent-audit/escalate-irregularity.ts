"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";

/**
 * Schema for serious irregularity escalation (R75).
 */
const EscalateIrregularitySchema = z.object({
  observationId: z.string().uuid(),
  irregularityType: z.enum(["FRAUD", "MAJOR_DEVIATION", "REGULATORY_BREACH", "CRITICAL_RISK"]),
  urgency: z.enum(["IMMEDIATE", "URGENT", "HIGH"]),
  escalateTo: z.array(z.enum(["CAE", "CEO", "ACB_MEMBER"])),
  remarks: z.string().min(10),
});

type EscalateIrregularityInput = z.infer<typeof EscalateIrregularitySchema>;

/**
 * Serious irregularity escalation with auto-routing (R75).
 * Concurrent auditors can flag critical findings for immediate escalation.
 * Security: Requires concurrent_audit:execute permission.
 * Side effects: 
 * - Upgrades observation severity to CRITICAL if not already
 * - Creates notification queue entries for escalation recipients
 * - Logs escalation in observation timeline
 */
export async function escalateIrregularity(input: EscalateIrregularityInput) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "concurrent_audit:execute")) {
    return {
      success: false as const,
      error: "You do not have permission to escalate irregularities.",
    };
  }

  const parsed = EscalateIrregularitySchema.safeParse(input);
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
        actionType: "concurrent_audit.irregularity_escalated",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Update observation to CRITICAL severity
      const observation = await tx.observation.update({
        where: { id: parsed.data.observationId },
        data: {
          severity: "CRITICAL",
          status: "SUBMITTED",
        },
        include: {
          branch: { select: { name: true } },
        },
      });

      // Create timeline entry
      await tx.observationTimeline.create({
        data: {
          tenantId,
          observationId: parsed.data.observationId,
          event: "IRREGULARITY_ESCALATED",
          newValue: `${parsed.data.irregularityType} - ${parsed.data.urgency}`,
          comment: parsed.data.remarks,
          createdById: session.user.id,
        },
      });

      // Find users with escalation roles
      const recipients = await tx.user.findMany({
        where: {
          tenantId,
          roles: {
            hasSome: parsed.data.escalateTo,
          },
        },
        select: { id: true },
      });

      // Create notification queue entries
      const notifications = await Promise.all(
        recipients.map((recipient: { id: string }) =>
          tx.notificationQueue.create({
            data: {
              tenantId,
              recipientId: recipient.id,
              type: "OVERDUE_ESCALATION",
              status: "PENDING",
              payload: {
                observationId: observation.id,
                observationTitle: observation.title,
                branchName: observation.branch?.name,
                irregularityType: parsed.data.irregularityType,
                urgency: parsed.data.urgency,
                remarks: parsed.data.remarks,
              },
            },
          })
        )
      );

      return {
        observationId: observation.id,
        notificationsSent: notifications.length,
      };
    });

    revalidatePath("/concurrent-audit/observations");
    revalidatePath(`/observations/${parsed.data.observationId}`);

    return {
      success: true as const,
      data: result,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to escalate irregularity.";
    logger.error({ error, action: "escalate_irregularity", tenantId }, message);
    return { success: false as const, error: message };
  }
}
