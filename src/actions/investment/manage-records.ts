"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import {
  checkBrokerConcentration,
  checkNonSlrCap,
} from "@/lib/investment-compliance";

/**
 * Schema for investment record CRUD (R93-R94).
 */
const ManageInvestmentRecordSchema = z.object({
  recordId: z.string().uuid().optional(),
  securityType: z.enum(["SLR", "NON_SLR", "EQUITY", "MUTUAL_FUND"]),
  classification: z.enum(["HTM", "HFT", "AFS"]),
  isin: z.string().optional(),
  faceValue: z.number().positive(),
  bookValue: z.number().positive(),
  marketValue: z.number().positive().optional(),
  brokerName: z.string().optional(),
  brokerShare: z.number().min(0).max(1).optional(), // 0 to 1 (percentage)
  sglAccount: z.enum(["SGL", "CSGL"]).optional(),
  reconciled: z.boolean().optional(),
  period: z.string().regex(/^\d{4}-Q[1-4]$/), // e.g., "2025-Q4"
});

type ManageInvestmentRecordInput = z.infer<typeof ManageInvestmentRecordSchema>;

/**
 * Create or update investment record with broker monitoring (R93-R94).
 * Security: Requires concurrent_audit:execute or IS_AUDITOR role.
 * Side effects: Validates broker 5% cap and non-SLR 10% cap.
 */
export async function manageInvestmentRecord(
  input: ManageInvestmentRecordInput,
) {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (
    !hasPermission(userRoles, "concurrent_audit:execute") &&
    !userRoles.includes("IS_AUDITOR")
  ) {
    return {
      success: false as const,
      error: "You do not have permission to manage investment records.",
    };
  }

  const parsed = ManageInvestmentRecordSchema.safeParse(input);
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
        actionType: parsed.data.recordId
          ? "investment.record_updated"
          : "investment.record_created",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      let record;
      if (parsed.data.recordId) {
        // Update — include tenantId in WHERE to prevent IDOR cross-tenant mutation
        record = await tx.investmentRecord.update({
          where: { id: parsed.data.recordId, tenantId },
          data: {
            faceValue: parsed.data.faceValue,
            bookValue: parsed.data.bookValue,
            marketValue: parsed.data.marketValue,
            brokerShare: parsed.data.brokerShare,
            reconciled: parsed.data.reconciled,
          },
        });
      } else {
        // Create
        record = await tx.investmentRecord.create({
          data: {
            tenantId,
            securityType: parsed.data.securityType,
            classification: parsed.data.classification,
            isin: parsed.data.isin,
            faceValue: parsed.data.faceValue,
            bookValue: parsed.data.bookValue,
            marketValue: parsed.data.marketValue,
            brokerName: parsed.data.brokerName,
            brokerShare: parsed.data.brokerShare,
            sglAccount: parsed.data.sglAccount,
            reconciled: parsed.data.reconciled ?? false,
            period: parsed.data.period,
          },
        });
      }

      // Compliance checks after mutation
      const warnings: string[] = [];

      // Check broker concentration (R94 — 5% cap)
      if (parsed.data.brokerName) {
        const brokerCheck = await checkBrokerConcentration(
          tx,
          tenantId,
          parsed.data.period,
          parsed.data.brokerName,
        );
        if (!brokerCheck.compliant) {
          warnings.push(brokerCheck.message);
        }
      }

      // Check non-SLR cap (R95 — 10% of deposits)
      if (parsed.data.securityType === "NON_SLR") {
        const capCheck = await checkNonSlrCap(tx, tenantId, parsed.data.period);
        if (!capCheck.compliant) {
          warnings.push(capCheck.message);
        }
      }

      return {
        id: record.id,
        warnings,
      };
    });

    revalidatePath("/investment/records");

    return {
      success: true as const,
      data: result,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to manage investment record.";
    logger.error(
      { error, action: "manage_investment_record", tenantId },
      message,
    );
    return { success: false as const, error: message };
  }
}

/**
 * Mark investment record as reconciled.
 */
export async function markReconciled(recordId: string) {
  if (!z.string().uuid().safeParse(recordId).success)
    return { success: false as const, error: "Invalid ID." };
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (
    !hasPermission(userRoles, "concurrent_audit:execute") &&
    !userRoles.includes("IS_AUDITOR")
  ) {
    return {
      success: false as const,
      error: "You do not have permission to reconcile investments.",
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "investment.record_reconciled",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Include tenantId in WHERE to prevent IDOR cross-tenant mutation
      await tx.investmentRecord.update({
        where: { id: recordId, tenantId },
        data: { reconciled: true },
      });
    });

    revalidatePath("/investment/records");

    return {
      success: true as const,
      data: { reconciled: true },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to mark as reconciled.";
    logger.error({ error, action: "mark_reconciled", tenantId }, message);
    return { success: false as const, error: message };
  }
}
