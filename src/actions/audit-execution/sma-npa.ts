"use server";

import { revalidatePath } from "next/cache";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import {
  SaveSmaNpaEntriesSchema,
  type SaveSmaNpaEntriesInput,
} from "./schemas";

/**
 * Save SMA/NPA entries for an engagement.
 * Uses upsert to update existing entries or create new ones.
 * Security: Requires examination:respond permission.
 * Atomicity: All upserts in single transaction.
 */
export async function saveSmaNpaEntries(input: SaveSmaNpaEntriesInput) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "examination:respond")) {
    return {
      success: false as const,
      error: "You do not have permission to save SMA/NPA entries.",
    };
  }

  const parsed = SaveSmaNpaEntriesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }
  const validated = parsed.data;

  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "sma_npa.saved",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Verify engagement exists and belongs to tenant
      const engagement = await tx.auditEngagement.findFirst({
        where: { id: validated.engagementId, tenantId },
        select: { id: true },
      });

      if (!engagement) {
        throw new Error("Engagement not found");
      }

      // Upsert each entry using compound unique key
      for (const entry of validated.entries) {
        await tx.smaNpaEntry.upsert({
          where: {
            engagementId_category: {
              engagementId: validated.engagementId,
              category: entry.category,
            },
          },
          update: {
            accountCount: entry.accountCount,
            totalAmount: entry.totalAmount,
            remarks: entry.remarks ?? null,
          },
          create: {
            tenantId,
            engagementId: validated.engagementId,
            category: entry.category,
            accountCount: entry.accountCount,
            totalAmount: entry.totalAmount,
            remarks: entry.remarks ?? null,
          },
        });
      }

      return { saved: validated.entries.length };
    });

    revalidatePath("/audit-execution");
    return { success: true as const, data: result };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to save SMA/NPA entries.";
    logger.error({ error, action: "save_sma_npa_entries", tenantId }, message);
    return { success: false as const, error: message };
  }
}
