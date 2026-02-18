"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";

const ManageEntitySchema = z.object({
  id: z.string().uuid().optional(),
  entityType: z.enum([
    "BRANCH",
    "DEPARTMENT",
    "PROCESS",
    "CHANNEL",
    "VENDOR",
  ]),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  branchId: z.string().uuid().optional(),
  riskScore: z.number().min(1).max(5).optional(),
  requiredFrequency: z.number().int().positive().optional(),
});

type ManageEntityInput = z.infer<typeof ManageEntitySchema>;

/**
 * Create or update an audit universe entity.
 * Security: Requires audit_universe:manage permission.
 */
export async function manageAuditUniverseEntity(input: ManageEntityInput) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "audit_universe:manage")) {
    return {
      success: false as const,
      error: "You do not have permission to manage audit universe entities.",
    };
  }

  const parsed = ManageEntitySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const entity = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: parsed.data.id
          ? "audit_universe.entity_updated"
          : "audit_universe.entity_created",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      if (parsed.data.id) {
        // Update existing entity
        return tx.auditUniverseEntity.update({
          where: { id: parsed.data.id, tenantId },
          data: {
            entityType: parsed.data.entityType,
            name: parsed.data.name,
            description: parsed.data.description,
            branchId: parsed.data.branchId,
            riskScore: parsed.data.riskScore,
            requiredFrequency: parsed.data.requiredFrequency,
          },
        });
      } else {
        // Create new entity
        return tx.auditUniverseEntity.create({
          data: {
            tenantId,
            entityType: parsed.data.entityType,
            name: parsed.data.name,
            description: parsed.data.description,
            branchId: parsed.data.branchId,
            riskScore: parsed.data.riskScore,
            requiredFrequency: parsed.data.requiredFrequency,
          },
        });
      }
    });

    revalidatePath("/risk-management/audit-universe");
    revalidatePath(`/risk-management/audit-universe/${entity.id}`);

    return {
      success: true as const,
      data: entity,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to manage audit universe entity.";
    logger.error(
      { error, action: "manage_audit_universe_entity", tenantId },
      message
    );
    return { success: false as const, error: message };
  }
}

/**
 * Delete an audit universe entity.
 * Security: Requires audit_universe:manage permission.
 */
export async function deleteAuditUniverseEntity(entityId: string) {
  if (!z.string().uuid().safeParse(entityId).success) return { success: false as const, error: "Invalid ID." };
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "audit_universe:manage")) {
    return {
      success: false as const,
      error: "You do not have permission to delete audit universe entities.",
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "audit_universe.entity_deleted",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      await tx.auditUniverseEntity.delete({
        where: { id: entityId, tenantId },
      });
    });

    revalidatePath("/risk-management/audit-universe");

    return {
      success: true as const,
      data: { id: entityId },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to delete audit universe entity.";
    logger.error(
      { error, action: "delete_audit_universe_entity", tenantId },
      message
    );
    return { success: false as const, error: message };
  }
}
