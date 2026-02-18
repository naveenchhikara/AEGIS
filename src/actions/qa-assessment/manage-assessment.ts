"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";

const ManageQaAssessmentSchema = z.object({
  id: z.string().uuid().optional(),
  assessmentYear: z.number().int().min(2020).max(2100),
  iiaStandard: z.string().min(1, "IIA Standard is required"),
  question: z.string().min(10, "Question must be at least 10 characters"),
  response: z
    .enum(["CONFORMS", "PARTIALLY_CONFORMS", "DOES_NOT_CONFORM", "NOT_APPLICABLE"])
    .optional(),
  evidence: z.string().optional(),
  gapIdentified: z.boolean().optional(),
});

type ManageQaAssessmentInput = z.infer<typeof ManageQaAssessmentSchema>;

/**
 * Submit or update QA self-assessment response (R64).
 * Security: Requires qa_assessment:manage permission.
 */
export async function manageQaAssessment(input: ManageQaAssessmentInput) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "qa_assessment:manage")) {
    return {
      success: false as const,
      error: "You do not have permission to manage QA assessments.",
    };
  }

  const parsed = ManageQaAssessmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const assessment = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: parsed.data.id
          ? "qa_assessment.updated"
          : "qa_assessment.created",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Auto-detect gap if response is non-conforming
      const gapIdentified =
        parsed.data.gapIdentified ??
        (parsed.data.response === "PARTIALLY_CONFORMS" ||
          parsed.data.response === "DOES_NOT_CONFORM");

      if (parsed.data.id) {
        // Update existing assessment
        return tx.qaSelfAssessment.update({
          where: { id: parsed.data.id, tenantId },
          data: {
            assessmentYear: parsed.data.assessmentYear,
            iiaStandard: parsed.data.iiaStandard,
            question: parsed.data.question,
            response: parsed.data.response,
            evidence: parsed.data.evidence,
            gapIdentified,
          },
        });
      } else {
        // Create new assessment
        return tx.qaSelfAssessment.create({
          data: {
            tenantId,
            assessmentYear: parsed.data.assessmentYear,
            iiaStandard: parsed.data.iiaStandard,
            question: parsed.data.question,
            response: parsed.data.response,
            evidence: parsed.data.evidence,
            gapIdentified,
          },
        });
      }
    });

    revalidatePath("/qa-assessment");
    revalidatePath(`/qa-assessment/${parsed.data.assessmentYear}`);

    return {
      success: true as const,
      data: assessment,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to manage QA assessment.";
    logger.error({ error, action: "manage_qa_assessment", tenantId }, message);
    return { success: false as const, error: message };
  }
}

/**
 * Bulk create QA assessments from IIA Standards template.
 * Security: Requires qa_assessment:manage permission.
 */
export async function createQaAssessmentsFromTemplate(
  assessmentYear: number,
  questions: Array<{ iiaStandard: string; question: string }>
) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "qa_assessment:manage")) {
    return {
      success: false as const,
      error: "You do not have permission to create QA assessments.",
    };
  }

  if (questions.length === 0) {
    return {
      success: false as const,
      error: "No questions provided.",
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "qa_assessment.bulk_created",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      const created = [];
      for (const q of questions) {
        // Check if already exists
        const existing = await tx.qaSelfAssessment.findFirst({
          where: {
            tenantId,
            assessmentYear,
            iiaStandard: q.iiaStandard,
            question: q.question,
          },
        });

        if (!existing) {
          const assessment = await tx.qaSelfAssessment.create({
            data: {
              tenantId,
              assessmentYear,
              iiaStandard: q.iiaStandard,
              question: q.question,
            },
          });
          created.push(assessment);
        }
      }

      return { created: created.length, total: questions.length };
    });

    revalidatePath("/qa-assessment");
    revalidatePath(`/qa-assessment/${assessmentYear}`);

    return {
      success: true as const,
      data: result,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create QA assessments from template.";
    logger.error(
      { error, action: "create_qa_assessments_from_template", tenantId },
      message
    );
    return { success: false as const, error: message };
  }
}
