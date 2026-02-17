"use server";

import { revalidatePath } from "next/cache";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import {
  AssignTeamMemberSchema,
  RemoveTeamMemberSchema,
  type AssignTeamMemberInput,
  type RemoveTeamMemberInput,
} from "./schemas";

/**
 * Assign a user to an audit engagement team.
 * Security: Requires audit_execution:manage_team permission.
 */
export async function assignTeamMember(input: AssignTeamMemberInput) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "audit_execution:manage_team")) {
    return { success: false as const, error: "You do not have permission to manage audit teams." };
  }

  const parsed = AssignTeamMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }
  const validated = parsed.data;

  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "audit_team.member_assigned",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Verify engagement exists
      const engagement = await tx.auditEngagement.findFirst({
        where: { id: validated.engagementId, tenantId },
      });
      if (!engagement) {
        throw new Error("Engagement not found");
      }

      // Verify user exists and belongs to tenant
      const user = await tx.user.findFirst({
        where: { id: validated.userId, tenantId },
      });
      if (!user) {
        throw new Error("User not found");
      }

      // Upsert team member (allows updating role/sections)
      return tx.auditTeamMember.upsert({
        where: {
          engagementId_userId: {
            engagementId: validated.engagementId,
            userId: validated.userId,
          },
        },
        update: {
          roleInEngagement: validated.roleInEngagement,
          assignedSections: validated.assignedSections,
        },
        create: {
          tenantId,
          engagementId: validated.engagementId,
          userId: validated.userId,
          roleInEngagement: validated.roleInEngagement,
          assignedSections: validated.assignedSections,
        },
      });
    });

    revalidatePath("/audit-execution");
    return { success: true as const, data: { id: result.id } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to assign team member.";
    logger.error({ error, action: "assign_team_member", tenantId }, message);
    return { success: false as const, error: message };
  }
}

/**
 * Remove a user from an audit engagement team.
 * Security: Requires audit_execution:manage_team permission.
 */
export async function removeTeamMember(input: RemoveTeamMemberInput) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "audit_execution:manage_team")) {
    return { success: false as const, error: "You do not have permission to manage audit teams." };
  }

  const parsed = RemoveTeamMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }
  const validated = parsed.data;

  const db = prismaForTenant(tenantId);

  try {
    await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "audit_team.member_removed",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      const member = await tx.auditTeamMember.findFirst({
        where: {
          engagementId: validated.engagementId,
          userId: validated.userId,
          tenant: { id: tenantId },
        },
      });
      if (!member) {
        throw new Error("Team member not found");
      }

      await tx.auditTeamMember.delete({
        where: { id: member.id },
      });
    });

    revalidatePath("/audit-execution");
    return { success: true as const, data: {} };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove team member.";
    logger.error({ error, action: "remove_team_member", tenantId }, message);
    return { success: false as const, error: message };
  }
}
