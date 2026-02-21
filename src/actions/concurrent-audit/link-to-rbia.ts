"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission } from "@/lib/permissions";
import { logger } from "@/lib/logger";

const LinkToRbiaSchema = z.object({
  concurrentObsId: z.string().uuid(),
  rbiaObsId: z.string().uuid(),
});

/**
 * Link a concurrent audit finding to an existing RBIA observation (R76).
 * Sets repeatOfId on the concurrent observation to reference the RBIA observation.
 * Security: Requires concurrent_audit:execute permission.
 */
export async function linkConcurrentToRbia(
  input: z.infer<typeof LinkToRbiaSchema>,
) {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (!hasPermission(userRoles, "concurrent_audit:execute")) {
    return {
      success: false as const,
      error: "You do not have permission to link concurrent audit findings.",
    };
  }

  const parsed = LinkToRbiaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }

  const db = prismaForTenant(tenantId);

  try {
    await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "concurrent_audit.linked_to_rbia",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Verify both observations belong to the tenant
      const [concurrent, rbia] = await Promise.all([
        tx.observation.findFirst({
          where: { id: parsed.data.concurrentObsId, tenantId },
        }),
        tx.observation.findFirst({
          where: { id: parsed.data.rbiaObsId, tenantId },
        }),
      ]);

      if (!concurrent) throw new Error("Concurrent observation not found");
      if (!rbia) throw new Error("RBIA observation not found");

      await tx.observation.update({
        where: { id: parsed.data.concurrentObsId },
        data: { repeatOfId: parsed.data.rbiaObsId },
      });
    });

    revalidatePath("/concurrent-audit");

    return { success: true as const };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to link finding.";
    logger.error(
      { error, action: "link_concurrent_to_rbia", tenantId },
      message,
    );
    return { success: false as const, error: message };
  }
}

const MarkUniqueSchema = z.object({
  concurrentObsId: z.string().uuid(),
});

/**
 * Mark a concurrent audit finding as unique (R76).
 * Clears any existing repeatOfId and sets a metadata flag.
 * Security: Requires concurrent_audit:execute permission.
 */
export async function markFindingUnique(
  input: z.infer<typeof MarkUniqueSchema>,
) {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (!hasPermission(userRoles, "concurrent_audit:execute")) {
    return {
      success: false as const,
      error: "You do not have permission to manage concurrent audit findings.",
    };
  }

  const parsed = MarkUniqueSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }

  const db = prismaForTenant(tenantId);

  try {
    await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "concurrent_audit.marked_unique",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      const obs = await tx.observation.findFirst({
        where: { id: parsed.data.concurrentObsId, tenantId },
      });

      if (!obs) throw new Error("Observation not found");

      await tx.observation.update({
        where: { id: parsed.data.concurrentObsId },
        data: { repeatOfId: null },
      });
    });

    revalidatePath("/concurrent-audit");

    return { success: true as const };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to mark finding as unique.";
    logger.error({ error, action: "mark_finding_unique", tenantId }, message);
    return { success: false as const, error: message };
  }
}
