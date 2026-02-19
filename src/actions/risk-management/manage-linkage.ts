"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";

const ManageRiskAuditLinkageSchema = z.object({
  id: z.string().uuid().optional(),
  entityId: z.string().uuid(),
  riskRegisterId: z.string().uuid(),
  engagementId: z.string().uuid().optional(),
  thematicArea: z.enum(["CREDIT", "OPERATIONS", "COMPLIANCE", "IT", "GOVERNANCE"]),
  linkageType: z.enum(["DIRECT", "THEMATIC", "COVERAGE"]).optional(),
});

type ManageRiskAuditLinkageInput = z.infer<typeof ManageRiskAuditLinkageSchema>;

/**
 * Create or update a risk-audit linkage.
 * Links enterprise risks to audit engagements for coverage tracking.
 * Security: Requires risk_register:manage permission.
 */
export async function manageRiskAuditLinkage(input: ManageRiskAuditLinkageInput) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "risk_register:manage")) {
    return {
      success: false as const,
      error: "You do not have permission to manage risk-audit linkages.",
    };
  }

  const parsed = ManageRiskAuditLinkageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const linkage = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: parsed.data.id
          ? "risk_audit_linkage.updated"
          : "risk_audit_linkage.created",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      if (parsed.data.id) {
        // Update existing linkage
        return tx.riskAuditLinkage.update({
          where: { id: parsed.data.id, tenantId },
          data: {
            entityId: parsed.data.entityId,
            riskRegisterId: parsed.data.riskRegisterId,
            engagementId: parsed.data.engagementId,
            thematicArea: parsed.data.thematicArea,
            linkageType: parsed.data.linkageType ?? "DIRECT",
          },
        });
      } else {
        // Create new linkage
        return tx.riskAuditLinkage.create({
          data: {
            tenantId,
            entityId: parsed.data.entityId,
            riskRegisterId: parsed.data.riskRegisterId,
            engagementId: parsed.data.engagementId,
            thematicArea: parsed.data.thematicArea,
            linkageType: parsed.data.linkageType ?? "DIRECT",
          },
        });
      }
    });

    revalidatePath("/risk-management");
    revalidatePath(`/risk-management/linkages`);

    return {
      success: true as const,
      data: linkage,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to manage risk-audit linkage.";
    logger.error({ error, action: "manage_risk_audit_linkage", tenantId }, message);
    return { success: false as const, error: message };
  }
}
