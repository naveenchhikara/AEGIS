"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";

const ManageRiskSchema = z.object({
  id: z.string().uuid().optional(),
  entityId: z.string().uuid(),
  riskStatement: z.string().min(10, "Risk statement must be at least 10 characters"),
  riskCategory: z.enum([
    "CREDIT",
    "OPERATIONAL",
    "MARKET",
    "LIQUIDITY",
    "COMPLIANCE",
    "IT",
  ]),
  inherentScore: z.number().min(1).max(5),
  controlScore: z.number().min(1).max(5),
  riskOwner: z.string().optional(),
  mitigationPlan: z.string().optional(),
  status: z.enum(["OPEN", "MITIGATED", "ACCEPTED", "CLOSED"]).optional(),
});

type ManageRiskInput = z.infer<typeof ManageRiskSchema>;

/**
 * Create or update a risk register entry.
 * Automatically calculates residual score.
 * Security: Requires risk_register:manage permission.
 */
export async function manageRisk(input: ManageRiskInput) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "risk_register:manage")) {
    return {
      success: false as const,
      error: "You do not have permission to manage risk register entries.",
    };
  }

  const parsed = ManageRiskSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const risk = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: parsed.data.id
          ? "risk_register.risk_updated"
          : "risk_register.risk_created",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Calculate residual score: (inherent + control) / 2
      const residualScore =
        (parsed.data.inherentScore + parsed.data.controlScore) / 2;

      if (parsed.data.id) {
        // Update existing risk
        return tx.riskRegister.update({
          where: { id: parsed.data.id, tenantId },
          data: {
            entityId: parsed.data.entityId,
            riskStatement: parsed.data.riskStatement,
            riskCategory: parsed.data.riskCategory,
            inherentScore: parsed.data.inherentScore,
            controlScore: parsed.data.controlScore,
            residualScore,
            riskOwner: parsed.data.riskOwner,
            mitigationPlan: parsed.data.mitigationPlan,
            status: parsed.data.status ?? "OPEN",
          },
        });
      } else {
        // Create new risk
        return tx.riskRegister.create({
          data: {
            tenantId,
            entityId: parsed.data.entityId,
            riskStatement: parsed.data.riskStatement,
            riskCategory: parsed.data.riskCategory,
            inherentScore: parsed.data.inherentScore,
            controlScore: parsed.data.controlScore,
            residualScore,
            riskOwner: parsed.data.riskOwner,
            mitigationPlan: parsed.data.mitigationPlan,
            status: parsed.data.status ?? "OPEN",
          },
        });
      }
    });

    revalidatePath("/risk-management/risk-register");
    revalidatePath(`/risk-management/risk-register/${risk.id}`);

    return {
      success: true as const,
      data: risk,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to manage risk.";
    logger.error({ error, action: "manage_risk", tenantId }, message);
    return { success: false as const, error: message };
  }
}

const ManageKRISchema = z.object({
  id: z.string().uuid().optional(),
  riskRegisterId: z.string().uuid(),
  name: z.string().min(1, "KRI name is required"),
  description: z.string().optional(),
  currentValue: z.number().optional(),
  thresholdLow: z.number().optional(),
  thresholdHigh: z.number().optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY"]).optional(),
});

type ManageKRIInput = z.infer<typeof ManageKRISchema>;

/**
 * Create or update a Key Risk Indicator.
 * Security: Requires risk_register:manage permission.
 */
export async function manageKRI(input: ManageKRIInput) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "risk_register:manage")) {
    return {
      success: false as const,
      error: "You do not have permission to manage KRIs.",
    };
  }

  const parsed = ManageKRISchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const kri = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: parsed.data.id ? "kri.updated" : "kri.created",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Determine breach status if thresholds and current value are set
      let breachStatus = "NORMAL";
      if (
        parsed.data.currentValue !== undefined &&
        parsed.data.thresholdLow !== undefined &&
        parsed.data.thresholdHigh !== undefined
      ) {
        if (
          parsed.data.currentValue < parsed.data.thresholdLow ||
          parsed.data.currentValue > parsed.data.thresholdHigh
        ) {
          breachStatus = "BREACH";
        } else if (
          parsed.data.currentValue <=
            parsed.data.thresholdLow * 1.1 ||
          parsed.data.currentValue >=
            parsed.data.thresholdHigh * 0.9
        ) {
          breachStatus = "WARNING";
        }
      }

      if (parsed.data.id) {
        // Update existing KRI
        return tx.keyRiskIndicator.update({
          where: { id: parsed.data.id, tenantId },
          data: {
            riskRegisterId: parsed.data.riskRegisterId,
            name: parsed.data.name,
            description: parsed.data.description,
            currentValue: parsed.data.currentValue,
            thresholdLow: parsed.data.thresholdLow,
            thresholdHigh: parsed.data.thresholdHigh,
            breachStatus,
            frequency: parsed.data.frequency ?? "MONTHLY",
            lastUpdated: parsed.data.currentValue !== undefined ? new Date() : undefined,
          },
        });
      } else {
        // Create new KRI
        return tx.keyRiskIndicator.create({
          data: {
            tenantId,
            riskRegisterId: parsed.data.riskRegisterId,
            name: parsed.data.name,
            description: parsed.data.description,
            currentValue: parsed.data.currentValue,
            thresholdLow: parsed.data.thresholdLow,
            thresholdHigh: parsed.data.thresholdHigh,
            breachStatus,
            frequency: parsed.data.frequency ?? "MONTHLY",
            lastUpdated: parsed.data.currentValue !== undefined ? new Date() : undefined,
          },
        });
      }
    });

    revalidatePath("/risk-management/risk-register");
    revalidatePath(`/risk-management/kri/${kri.id}`);

    return {
      success: true as const,
      data: kri,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to manage KRI.";
    logger.error({ error, action: "manage_kri", tenantId }, message);
    return { success: false as const, error: message };
  }
}
