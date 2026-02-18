"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";

/**
 * Schema for rapid observation entry workbench (R74).
 */
const RapidEntrySchema = z.object({
  branchId: z.string().uuid(),
  scopeArea: z.string(),
  observations: z.array(z.object({
    particulars: z.string(),
    finding: z.string(),
    severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    recommendation: z.string().optional(),
  })),
});

type RapidEntryInput = z.infer<typeof RapidEntrySchema>;

/**
 * Rapid observation entry workbench for concurrent auditors (R74).
 * Allows batch creation of multiple observations at once during concurrent audit.
 * Security: Requires concurrent_audit:execute permission.
 * Atomicity: Creates all observations in one transaction.
 */
export async function rapidEntryObservations(input: RapidEntryInput) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "concurrent_audit:execute")) {
    return {
      success: false as const,
      error: "You do not have permission to create concurrent audit observations.",
    };
  }

  const parsed = RapidEntrySchema.safeParse(input);
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
        actionType: "concurrent_audit.rapid_entry",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      const createdObservations = [];

      for (const obs of parsed.data.observations) {
        const observation = await tx.observation.create({
          data: {
            tenantId,
            branchId: parsed.data.branchId,
            title: obs.particulars,
            condition: obs.finding,
            criteria: `Concurrent Audit - ${parsed.data.scopeArea}`,
            cause: "To be determined",
            effect: "To be determined",
            recommendation: obs.recommendation || "Branch to provide corrective action plan",
            severity: obs.severity,
            status: "DRAFT",
            createdById: session.user.id,
          },
        });

        createdObservations.push(observation);
      }

      return { count: createdObservations.length };
    });

    revalidatePath("/concurrent-audit/observations");
    revalidatePath(`/branches/${parsed.data.branchId}`);

    return {
      success: true as const,
      data: {
        created: result.count,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create observations.";
    logger.error({ error, action: "rapid_entry_observations", tenantId }, message);
    return { success: false as const, error: message };
  }
}
