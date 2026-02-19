"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";

/**
 * Schema for policy document CRUD (R84).
 */
const ManagePolicySchema = z.object({
  policyId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  category: z.enum([
    "LENDING",
    "INVESTMENT",
    "KYC_AML",
    "IT_SECURITY",
    "HR",
    "AUDIT",
    "RISK_MANAGEMENT",
  ]),
  approvalDate: z.coerce.date().optional(),
  reviewDueDate: z.coerce.date().optional(),
  version: z.string().optional(),
  status: z
    .enum(["DRAFT", "APPROVED", "UNDER_REVIEW", "SUPERSEDED"])
    .optional(),
  documentUrl: z.string().optional(),
  summary: z.string().optional(),
});

type ManagePolicyInput = z.infer<typeof ManagePolicySchema>;

/**
 * Create or update policy document (R84).
 * Security: Requires policy:manage permission.
 * Atomicity: Single transaction with audit context.
 */
export async function managePolicy(input: ManagePolicyInput) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "policy:manage")) {
    return {
      success: false as const,
      error: "You do not have permission to manage policies.",
    };
  }

  const parsed = ManagePolicySchema.safeParse(input);
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
        actionType: parsed.data.policyId
          ? "governance.policy_updated"
          : "governance.policy_created",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      if (parsed.data.policyId) {
        // Update existing policy
        const updated = await tx.policyDocument.update({
          where: { id: parsed.data.policyId },
          data: {
            name: parsed.data.name,
            approvalDate: parsed.data.approvalDate,
            reviewDueDate: parsed.data.reviewDueDate,
            version: parsed.data.version,
            status: parsed.data.status,
            documentUrl: parsed.data.documentUrl,
            summary: parsed.data.summary,
          },
        });
        return updated;
      } else {
        // Create new policy
        const created = await tx.policyDocument.create({
          data: {
            tenantId,
            name: parsed.data.name,
            category: parsed.data.category,
            approvalDate: parsed.data.approvalDate,
            reviewDueDate: parsed.data.reviewDueDate,
            version: parsed.data.version || "1.0",
            status: parsed.data.status || "DRAFT",
            documentUrl: parsed.data.documentUrl,
            summary: parsed.data.summary,
          },
        });
        return created;
      }
    });

    revalidatePath("/governance/policies");

    return {
      success: true as const,
      data: {
        id: result.id,
        name: result.name,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to manage policy.";
    logger.error({ error, action: "manage_policy", tenantId }, message);
    return { success: false as const, error: message };
  }
}

/**
 * Delete policy document.
 */
export async function deletePolicy(policyId: string) {
  if (!z.string().uuid().safeParse(policyId).success) return { success: false as const, error: "Invalid ID." };
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "policy:manage")) {
    return {
      success: false as const,
      error: "You do not have permission to delete policies.",
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "governance.policy_deleted",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      await tx.policyDocument.delete({
        where: { id: policyId },
      });
    });

    revalidatePath("/governance/policies");

    return {
      success: true as const,
      data: { deleted: true },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete policy.";
    logger.error({ error, action: "delete_policy", tenantId }, message);
    return { success: false as const, error: message };
  }
}
