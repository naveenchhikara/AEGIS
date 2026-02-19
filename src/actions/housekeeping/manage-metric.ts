"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";

const ManageMetricSchema = z.object({
  id: z.string().uuid().optional(),
  branchId: z.string().uuid(),
  metricType: z.string().min(1),
  period: z.string().regex(/^\d{4}-Q[1-4]$/),
  openingBalance: z.number(),
  closingBalance: z.number(),
  entriesCount: z.number().int().min(0).optional(),
  agingDays: z.number().int().min(0).optional(),
  remarks: z.string().optional(),
});

export async function manageHousekeepingMetric(
  input: z.infer<typeof ManageMetricSchema>,
) {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (!hasPermission(userRoles, "regulatory:manage")) {
    return { success: false as const, error: "Permission denied." };
  }

  const parsed = ManageMetricSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }

  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: parsed.data.id
          ? "housekeeping.metric_updated"
          : "housekeeping.metric_created",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      if (parsed.data.id) {
        return tx.housekeepingMetric.update({
          where: { id: parsed.data.id },
          data: {
            openingBalance: parsed.data.openingBalance,
            closingBalance: parsed.data.closingBalance,
            entriesCount: parsed.data.entriesCount || 0,
            agingDays: parsed.data.agingDays,
            remarks: parsed.data.remarks,
          },
        });
      }

      return tx.housekeepingMetric.create({
        data: {
          tenantId,
          branchId: parsed.data.branchId,
          metricType: parsed.data.metricType,
          period: parsed.data.period,
          openingBalance: parsed.data.openingBalance,
          closingBalance: parsed.data.closingBalance,
          entriesCount: parsed.data.entriesCount || 0,
          agingDays: parsed.data.agingDays,
          remarks: parsed.data.remarks,
        },
      });
    });

    revalidatePath("/housekeeping");
    return { success: true as const, data: { id: result.id } };
  } catch (error) {
    logger.error(
      { error, action: "manage_housekeeping_metric", tenantId },
      "Failed to manage housekeeping metric",
    );
    return { success: false as const, error: "Failed to manage metric." };
  }
}
