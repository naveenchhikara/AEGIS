"use server";

import { revalidatePath } from "next/cache";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import { computeRam, type RamScoreInput } from "@/lib/ram-engine";
import { AssessmentIdSchema } from "./schemas";

/**
 * Compute composite score for a RAM assessment.
 * Reads all saved scores, runs computation engine, updates assessment + branch.
 * Security: Requires ram:create permission.
 * Side effects: Updates Branch.ramScore and Branch.auditFrequency.
 */
export async function computeRamAssessment(input: { assessmentId: string }) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "ram:create")) {
    return { success: false as const, error: "You do not have permission to compute RAM assessments." };
  }

  const parsed = AssessmentIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }

  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "ram_assessment.computed",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Load assessment with scores and param configs
      const assessment = await tx.ramAssessment.findFirst({
        where: { id: parsed.data.assessmentId, tenantId },
        include: {
          scores: {
            include: {
              paramConfig: { select: { code: true, weight: true } },
            },
          },
        },
      });

      if (!assessment) {
        throw new Error("Assessment not found");
      }
      if (assessment.status === "APPROVED") {
        throw new Error("Cannot re-compute an approved assessment");
      }
      if (assessment.scores.length === 0) {
        throw new Error("No scores entered. Please score all parameters before computing.");
      }

      // Prepare score inputs for engine
      const scoreInputs: RamScoreInput[] = assessment.scores.map((s: any) => ({
        paramCode: s.paramConfig.code,
        score: Number(s.score),
        weight: Number(s.paramConfig.weight),
      }));

      // Compute
      const { compositeScore, riskCategory, auditFrequency } = computeRam(scoreInputs);

      // Update assessment
      const updated = await tx.ramAssessment.update({
        where: { id: assessment.id },
        data: {
          compositeScore,
          riskCategory,
          auditFrequency,
          status: "COMPUTED",
          computedById: session.user.id,
          computedAt: new Date(),
        },
      });

      // Update branch cached fields
      await tx.branch.update({
        where: { id: assessment.branchId },
        data: {
          ramScore: compositeScore,
          auditFrequency,
        },
      });

      return updated;
    });

    revalidatePath("/ram");
    return {
      success: true as const,
      data: {
        id: result.id,
        compositeScore: Number(result.compositeScore),
        riskCategory: result.riskCategory,
        auditFrequency: result.auditFrequency,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to compute RAM assessment.";
    logger.error({ error, action: "compute_ram_assessment", tenantId }, message);
    return { success: false as const, error: message };
  }
}
