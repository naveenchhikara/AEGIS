"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";

const ManageActionPlanSchema = z.object({
  id: z.string().uuid().optional(),
  issueId: z.string().uuid(),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  milestone: z.string().optional(),
  dueDate: z.coerce.date(),
  assignedToId: z.string().uuid().optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "OVERDUE"]).optional(),
  evidence: z.array(z.string()).optional(), // S3 keys
  completionPct: z.number().int().min(0).max(100).optional(),
});

type ManageActionPlanInput = z.infer<typeof ManageActionPlanSchema>;

/**
 * Create or update an action plan with milestone tracking (R61).
 * Security: Requires issue:manage permission.
 */
export async function manageActionPlan(input: ManageActionPlanInput) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "issue:manage")) {
    return {
      success: false as const,
      error: "You do not have permission to manage action plans.",
    };
  }

  const parsed = ManageActionPlanSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const actionPlan = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: parsed.data.id
          ? "action_plan.updated"
          : "action_plan.created",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Auto-update status to OVERDUE if past due date
      const now = new Date();
      let status = parsed.data.status ?? "PENDING";
      if (
        parsed.data.dueDate < now &&
        status !== "COMPLETED" &&
        status !== "OVERDUE"
      ) {
        status = "OVERDUE";
      }

      if (parsed.data.id) {
        // Update existing action plan
        const existing = await tx.actionPlan.findFirst({
          where: { id: parsed.data.id, tenantId },
        });
        if (!existing) {
          throw new Error("Action plan not found");
        }
        return tx.actionPlan.update({
          where: { id: parsed.data.id },
          data: {
            issueId: parsed.data.issueId,
            title: parsed.data.title,
            description: parsed.data.description,
            milestone: parsed.data.milestone,
            dueDate: parsed.data.dueDate,
            assignedToId: parsed.data.assignedToId,
            status,
            evidence: parsed.data.evidence,
            completionPct: parsed.data.completionPct ?? 0,
          },
        });
      } else {
        // Create new action plan
        return tx.actionPlan.create({
          data: {
            tenantId,
            issueId: parsed.data.issueId,
            title: parsed.data.title,
            description: parsed.data.description,
            milestone: parsed.data.milestone,
            dueDate: parsed.data.dueDate,
            assignedToId: parsed.data.assignedToId,
            status,
            evidence: parsed.data.evidence,
            completionPct: parsed.data.completionPct ?? 0,
          },
        });
      }
    });

    revalidatePath("/issues");
    revalidatePath(`/issues/${parsed.data.issueId}`);
    revalidatePath(`/action-plans/${actionPlan.id}`);

    return {
      success: true as const,
      data: actionPlan,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to manage action plan.";
    logger.error({ error, action: "manage_action_plan", tenantId }, message);
    return { success: false as const, error: message };
  }
}

/**
 * Complete an action plan with verification.
 * Security: Requires issue:manage permission.
 */
export async function completeActionPlan(
  actionPlanId: string,
  evidence?: string[],
) {
  if (!z.string().uuid().safeParse(actionPlanId).success)
    return { success: false as const, error: "Invalid ID." };
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "issue:manage")) {
    return {
      success: false as const,
      error: "You do not have permission to complete action plans.",
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const actionPlan = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "action_plan.completed",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      const existing = await tx.actionPlan.findFirst({
        where: { id: actionPlanId, tenantId },
      });
      if (!existing) {
        throw new Error("Action plan not found");
      }

      return tx.actionPlan.update({
        where: { id: actionPlanId },
        data: {
          status: "COMPLETED",
          completionPct: 100,
          evidence,
          verifiedById: session.user.id,
          verifiedAt: new Date(),
        },
        include: {
          issue: {
            select: { id: true },
          },
        },
      });
    });

    revalidatePath("/action-plans");
    revalidatePath(`/action-plans/${actionPlanId}`);
    revalidatePath(`/issues/${actionPlan.issueId}`);

    return {
      success: true as const,
      data: actionPlan,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to complete action plan.";
    logger.error({ error, action: "complete_action_plan", tenantId }, message);
    return { success: false as const, error: message };
  }
}

/**
 * Update action plan completion percentage.
 * Security: Requires issue:manage permission.
 */
export async function updateActionPlanProgress(
  actionPlanId: string,
  completionPct: number,
) {
  if (!z.string().uuid().safeParse(actionPlanId).success)
    return { success: false as const, error: "Invalid ID." };
  if (completionPct < 0 || completionPct > 100)
    return { success: false as const, error: "Invalid percentage." };
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "issue:manage")) {
    return {
      success: false as const,
      error: "You do not have permission to update action plans.",
    };
  }

  if (completionPct < 0 || completionPct > 100) {
    return {
      success: false as const,
      error: "Completion percentage must be between 0 and 100.",
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const actionPlan = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "action_plan.progress_updated",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Auto-update status based on completion
      let status: string | undefined;
      if (completionPct === 100) {
        status = "COMPLETED";
      } else if (completionPct > 0) {
        status = "IN_PROGRESS";
      }

      const existing = await tx.actionPlan.findFirst({
        where: { id: actionPlanId, tenantId },
      });
      if (!existing) {
        throw new Error("Action plan not found");
      }

      return tx.actionPlan.update({
        where: { id: actionPlanId },
        data: {
          completionPct,
          ...(status && { status }),
          ...(completionPct === 100 && {
            verifiedById: session.user.id,
            verifiedAt: new Date(),
          }),
        },
      });
    });

    revalidatePath(`/action-plans/${actionPlanId}`);
    revalidatePath(`/issues/${actionPlan.issueId}`);

    return {
      success: true as const,
      data: actionPlan,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update action plan progress.";
    logger.error(
      { error, action: "update_action_plan_progress", tenantId },
      message,
    );
    return { success: false as const, error: message };
  }
}

/**
 * Add evidence reference to an action plan (R61).
 * Security: Requires issue:manage permission.
 */
export async function addActionPlanEvidence(
  actionPlanId: string,
  evidenceRef: string,
) {
  if (!z.string().uuid().safeParse(actionPlanId).success)
    return { success: false as const, error: "Invalid ID." };
  if (!evidenceRef || evidenceRef.trim().length === 0)
    return {
      success: false as const,
      error: "Evidence reference is required.",
    };

  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "issue:manage")) {
    return {
      success: false as const,
      error: "You do not have permission to add evidence.",
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const actionPlan = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "action_plan.evidence_added",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Get current evidence array
      const current = await tx.actionPlan.findFirst({
        where: { id: actionPlanId, tenantId },
        select: { evidence: true },
      });

      if (!current) {
        throw new Error("Action plan not found");
      }

      const updatedEvidence = [...(current.evidence || []), evidenceRef.trim()];

      return tx.actionPlan.update({
        where: { id: actionPlanId },
        data: { evidence: updatedEvidence },
      });
    });

    revalidatePath(`/action-plans/${actionPlanId}`);
    revalidatePath(`/issues/${actionPlan.issueId}`);

    return {
      success: true as const,
      data: actionPlan,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to add evidence.";
    logger.error(
      { error, action: "add_action_plan_evidence", tenantId },
      message,
    );
    return { success: false as const, error: message };
  }
}
