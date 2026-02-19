"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";

const AcceptRiskSchema = z.object({
  issueId: z.string().uuid(),
  acceptanceReason: z
    .string()
    .min(20, "Acceptance reason must be at least 20 characters"),
});

type AcceptRiskInput = z.infer<typeof AcceptRiskSchema>;

/**
 * Accept risk for an issue with management sign-off (R62).
 * Requires explicit justification and executive-level permission.
 * Security: Requires issue:accept_risk permission (CAE, CEO, RISK_HEAD, ACE_OFFICER, etc.).
 */
export async function acceptRisk(input: AcceptRiskInput) {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (!hasPermission(userRoles, "issue:accept_risk")) {
    return {
      success: false as const,
      error:
        "You do not have permission to accept risk. This requires executive-level approval.",
    };
  }

  const parsed = AcceptRiskSchema.safeParse(input);
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
        actionType: "issue.risk_accepted",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
        justification: parsed.data.acceptanceReason, // Audit trail requirement
      });

      // Get issue to validate current state
      const existingIssue = await tx.issue.findUnique({
        where: { id: parsed.data.issueId, tenantId },
      });

      if (!existingIssue) {
        throw new Error("Issue not found");
      }

      if (existingIssue.status === "CLOSED") {
        throw new Error("Cannot accept risk for a closed issue");
      }

      if (existingIssue.status === "ACCEPTED_RISK") {
        throw new Error("Risk has already been accepted for this issue");
      }

      // Update issue to ACCEPTED_RISK status
      return tx.issue.update({
        where: { id: parsed.data.issueId, tenantId },
        data: {
          status: "ACCEPTED_RISK",
          acceptedById: session.user.id,
          acceptedAt: new Date(),
          acceptanceReason: parsed.data.acceptanceReason,
        },
      });
    });

    revalidatePath("/issues");
    revalidatePath(`/issues/${parsed.data.issueId}`);

    return {
      success: true as const,
      data: issue,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to accept risk.";
    logger.error({ error, action: "accept_risk", tenantId }, message);
    return { success: false as const, error: message };
  }
}

/**
 * Reopen a risk-accepted issue.
 * Security: Requires issue:accept_risk permission.
 */
export async function reopenAcceptedRisk(issueId: string, reason: string) {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (!hasPermission(userRoles, "issue:accept_risk")) {
    return {
      success: false as const,
      error: "You do not have permission to reopen accepted risks.",
    };
  }

  if (!reason || reason.length < 20) {
    return {
      success: false as const,
      error: "Reopening reason must be at least 20 characters.",
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const issue = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "issue.risk_acceptance_revoked",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
        justification: reason,
      });

      // Get issue to validate current state
      const existingIssue = await tx.issue.findUnique({
        where: { id: issueId, tenantId },
      });

      if (!existingIssue) {
        throw new Error("Issue not found");
      }

      if (existingIssue.status !== "ACCEPTED_RISK") {
        throw new Error("Only accepted risk issues can be reopened");
      }

      // Reopen issue
      return tx.issue.update({
        where: { id: issueId, tenantId },
        data: {
          status: "OPEN",
          acceptedById: null,
          acceptedAt: null,
          acceptanceReason: null,
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
      error instanceof Error
        ? error.message
        : "Failed to reopen accepted risk.";
    logger.error({ error, action: "reopen_accepted_risk", tenantId }, message);
    return { success: false as const, error: message };
  }
}
