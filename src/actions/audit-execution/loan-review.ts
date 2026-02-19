"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import {
  CreateLoanReviewSchema,
  UpdateLoanReviewSchema,
  type CreateLoanReviewInput,
  type UpdateLoanReviewInput,
} from "./schemas";

/**
 * Create a new loan review record.
 * Security: Requires examination:respond permission.
 */
export async function createLoanReview(input: CreateLoanReviewInput) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "examination:respond")) {
    return {
      success: false as const,
      error: "You do not have permission to create loan reviews.",
    };
  }

  const parsed = CreateLoanReviewSchema.safeParse(input);
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
        actionType: "loan_review.created",
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

      // Create loan review record
      const loanReview = await tx.loanReview.create({
        data: {
          tenantId,
          engagementId: validated.engagementId,
          accountNo: validated.accountNo,
          borrowerName: validated.borrowerName,
          productType: validated.productType,
          sanctionAmount: validated.sanctionAmount,
          outstandingAmount: validated.outstandingAmount,
          assetClass: validated.assetClass,
          dpd: validated.dpd,
          auditObservation: validated.auditObservation ?? null,
        },
      });

      return loanReview;
    });

    revalidatePath("/audit-execution");
    return { success: true as const, data: { id: result.id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create loan review.";
    logger.error({ error, action: "create_loan_review", tenantId }, message);
    return { success: false as const, error: message };
  }
}

/**
 * Update an existing loan review record.
 * Security: Requires examination:respond permission.
 */
export async function updateLoanReview(input: UpdateLoanReviewInput) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "examination:respond")) {
    return {
      success: false as const,
      error: "You do not have permission to update loan reviews.",
    };
  }

  const parsed = UpdateLoanReviewSchema.safeParse(input);
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
        actionType: "loan_review.updated",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Verify record exists and belongs to tenant
      const existing = await tx.loanReview.findFirst({
        where: { id: validated.id, tenantId },
        select: { id: true },
      });

      if (!existing) {
        throw new Error("Loan review not found");
      }

      // Update record
      const loanReview = await tx.loanReview.update({
        where: { id: validated.id },
        data: {
          accountNo: validated.accountNo,
          borrowerName: validated.borrowerName,
          productType: validated.productType,
          sanctionAmount: validated.sanctionAmount,
          outstandingAmount: validated.outstandingAmount,
          assetClass: validated.assetClass,
          dpd: validated.dpd,
          auditObservation: validated.auditObservation ?? null,
        },
      });

      return loanReview;
    });

    revalidatePath("/audit-execution");
    return { success: true as const, data: { id: result.id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update loan review.";
    logger.error({ error, action: "update_loan_review", tenantId }, message);
    return { success: false as const, error: message };
  }
}

/**
 * Delete a loan review record.
 * Security: Requires examination:respond permission.
 */
const DeleteLoanReviewSchema = z.object({
  id: z.string().uuid(),
  engagementId: z.string().uuid(),
});

export async function deleteLoanReview(input: {
  id: string;
  engagementId: string;
}) {
  const parsed = DeleteLoanReviewSchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, error: "Invalid input." };
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "examination:respond")) {
    return {
      success: false as const,
      error: "You do not have permission to delete loan reviews.",
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "loan_review.deleted",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Verify record exists and belongs to tenant
      const existing = await tx.loanReview.findFirst({
        where: { id: input.id, tenantId },
        select: { id: true },
      });

      if (!existing) {
        throw new Error("Loan review not found");
      }

      // Delete record
      await tx.loanReview.delete({
        where: { id: input.id },
      });
    });

    revalidatePath("/audit-execution");
    return { success: true as const };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete loan review.";
    logger.error({ error, action: "delete_loan_review", tenantId }, message);
    return { success: false as const, error: message };
  }
}
