"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";

const ManageIssueSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  source: z.enum([
    "INTERNAL_AUDIT",
    "REGULATORY",
    "EXTERNAL_AUDIT",
    "SELF_ASSESSMENT",
    "CONCURRENT",
  ]),
  issueType: z.enum(["FINDING", "OBSERVATION", "EXCEPTION", "DEFICIENCY"]),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  rootCause: z.string().optional(),
  riskTheme: z
    .enum(["CREDIT", "OPERATIONAL", "COMPLIANCE", "IT", "GOVERNANCE"])
    .optional(),
  observationId: z.string().uuid().optional(),
  controlId: z.string().uuid().optional(),
  complianceItemId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  status: z
    .enum(["OPEN", "IN_PROGRESS", "CLOSED", "ACCEPTED_RISK"])
    .optional(),
});

type ManageIssueInput = z.infer<typeof ManageIssueSchema>;

/**
 * Create or update an issue from any source (R59-R60).
 * Security: Requires issue:manage permission.
 */
export async function manageIssue(input: ManageIssueInput) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "issue:manage")) {
    return {
      success: false as const,
      error: "You do not have permission to manage issues.",
    };
  }

  const parsed = ManageIssueSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const issue = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: parsed.data.id ? "issue.updated" : "issue.created",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      if (parsed.data.id) {
        // Update existing issue
        const existing = await tx.issue.findFirst({
          where: { id: parsed.data.id, tenantId },
        });
        if (!existing) {
          throw new Error("Issue not found");
        }
        return tx.issue.update({
          where: { id: parsed.data.id },
          data: {
            title: parsed.data.title,
            description: parsed.data.description,
            source: parsed.data.source,
            issueType: parsed.data.issueType,
            severity: parsed.data.severity,
            rootCause: parsed.data.rootCause,
            riskTheme: parsed.data.riskTheme,
            observationId: parsed.data.observationId,
            controlId: parsed.data.controlId,
            complianceItemId: parsed.data.complianceItemId,
            ownerId: parsed.data.ownerId,
            status: parsed.data.status ?? "OPEN",
          },
        });
      } else {
        // Create new issue
        return tx.issue.create({
          data: {
            tenantId,
            title: parsed.data.title,
            description: parsed.data.description,
            source: parsed.data.source,
            issueType: parsed.data.issueType,
            severity: parsed.data.severity,
            rootCause: parsed.data.rootCause,
            riskTheme: parsed.data.riskTheme,
            observationId: parsed.data.observationId,
            controlId: parsed.data.controlId,
            complianceItemId: parsed.data.complianceItemId,
            ownerId: parsed.data.ownerId,
            status: parsed.data.status ?? "OPEN",
          },
        });
      }
    });

    revalidatePath("/issues");
    revalidatePath(`/issues/${issue.id}`);
    if (parsed.data.observationId) {
      revalidatePath(`/observations/${parsed.data.observationId}`);
    }

    return {
      success: true as const,
      data: issue,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to manage issue.";
    logger.error({ error, action: "manage_issue", tenantId }, message);
    return { success: false as const, error: message };
  }
}

/**
 * Close an issue.
 * Security: Requires issue:manage permission.
 */
export async function closeIssue(issueId: string) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "issue:manage")) {
    return {
      success: false as const,
      error: "You do not have permission to close issues.",
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const issue = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "issue.closed",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Verify all action plans are completed
      const pendingActions = await tx.actionPlan.count({
        where: {
          tenantId,
          issueId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
      });

      if (pendingActions > 0) {
        throw new Error(
          `Cannot close issue: ${pendingActions} action plan(s) still pending`
        );
      }

      const existing = await tx.issue.findFirst({
        where: { id: issueId, tenantId },
      });
      if (!existing) {
        throw new Error("Issue not found");
      }

      return tx.issue.update({
        where: { id: issueId },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
        },
      });
    });

    revalidatePath("/issues");
    revalidatePath(`/issues/${issueId}`);

    return {
      success: true as const,
      data: issue,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to close issue.";
    logger.error({ error, action: "close_issue", tenantId }, message);
    return { success: false as const, error: message };
  }
}
