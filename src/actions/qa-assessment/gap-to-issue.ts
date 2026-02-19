"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";

const ConvertGapToIssueSchema = z.object({
  assessmentId: z.string().uuid(),
  issueTitle: z.string().min(1, "Issue title is required"),
  issueDescription: z.string().optional(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
  ownerId: z.string().uuid().optional(),
});

type ConvertGapToIssueInput = z.infer<typeof ConvertGapToIssueSchema>;

/**
 * Convert identified gaps from QA self-assessment to issues (R65).
 * Security: Requires qa_assessment:manage and issue:manage permissions.
 */
export async function convertGapToIssue(input: ConvertGapToIssueInput) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (
    !hasPermission(userRoles, "qa_assessment:manage") ||
    !hasPermission(userRoles, "issue:manage")
  ) {
    return {
      success: false as const,
      error: "You do not have permission to convert QA gaps to issues.",
    };
  }

  const parsed = ConvertGapToIssueSchema.safeParse(input);
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
        actionType: "qa_assessment.gap_converted_to_issue",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Get the QA assessment
      const assessment = await tx.qaSelfAssessment.findUnique({
        where: { id: parsed.data.assessmentId, tenantId },
      });

      if (!assessment) {
        throw new Error("QA assessment not found");
      }

      if (!assessment.gapIdentified) {
        throw new Error("No gap identified for this assessment");
      }

      if (assessment.issueCreated) {
        throw new Error("Issue has already been created for this gap");
      }

      // Build issue description from QA assessment
      const description =
        parsed.data.issueDescription ||
        `QA Self-Assessment Gap Identified\n\n` +
          `IIA Standard: ${assessment.iiaStandard}\n` +
          `Question: ${assessment.question}\n` +
          `Response: ${assessment.response}\n` +
          `Evidence: ${assessment.evidence || "None provided"}`;

      // Determine severity based on response
      let severity = parsed.data.severity;
      if (!severity) {
        if (assessment.response === "DOES_NOT_CONFORM") {
          severity = "HIGH";
        } else if (assessment.response === "PARTIALLY_CONFORMS") {
          severity = "MEDIUM";
        } else {
          severity = "LOW";
        }
      }

      // Create issue
      const issue = await tx.issue.create({
        data: {
          tenantId,
          title: parsed.data.issueTitle,
          description,
          source: "SELF_ASSESSMENT",
          issueType: "DEFICIENCY",
          severity,
          riskTheme: "GOVERNANCE",
          ownerId: parsed.data.ownerId,
          status: "OPEN",
        },
      });

      // Mark assessment as issue created
      await tx.qaSelfAssessment.update({
        where: { id: parsed.data.assessmentId, tenantId },
        data: { issueCreated: true },
      });

      return { issue, assessment };
    });

    revalidatePath("/qa-assessment");
    revalidatePath(`/qa-assessment/${result.assessment.assessmentYear}`);
    revalidatePath("/issues");
    revalidatePath(`/issues/${result.issue.id}`);

    return {
      success: true as const,
      data: result,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to convert gap to issue.";
    logger.error({ error, action: "convert_gap_to_issue", tenantId }, message);
    return { success: false as const, error: message };
  }
}

/**
 * Bulk convert multiple gaps to issues.
 * Security: Requires qa_assessment:manage and issue:manage permissions.
 */
export async function bulkConvertGapsToIssues(
  assessmentIds: string[],
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  ownerId?: string,
) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (
    !hasPermission(userRoles, "qa_assessment:manage") ||
    !hasPermission(userRoles, "issue:manage")
  ) {
    return {
      success: false as const,
      error: "You do not have permission to convert QA gaps to issues.",
    };
  }

  if (assessmentIds.length === 0) {
    return {
      success: false as const,
      error: "No assessments selected.",
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "qa_assessment.bulk_gaps_converted_to_issues",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      const created = [];
      for (const assessmentId of assessmentIds) {
        const assessment = await tx.qaSelfAssessment.findUnique({
          where: { id: assessmentId, tenantId },
        });

        if (
          !assessment ||
          !assessment.gapIdentified ||
          assessment.issueCreated
        ) {
          continue; // Skip invalid/already converted
        }

        const description =
          `QA Self-Assessment Gap Identified\n\n` +
          `IIA Standard: ${assessment.iiaStandard}\n` +
          `Question: ${assessment.question}\n` +
          `Response: ${assessment.response}\n` +
          `Evidence: ${assessment.evidence || "None provided"}`;

        const issue = await tx.issue.create({
          data: {
            tenantId,
            title: `QA Gap: ${assessment.iiaStandard}`,
            description,
            source: "SELF_ASSESSMENT",
            issueType: "DEFICIENCY",
            severity,
            riskTheme: "GOVERNANCE",
            ownerId,
            status: "OPEN",
          },
        });

        await tx.qaSelfAssessment.update({
          where: { id: assessmentId, tenantId },
          data: { issueCreated: true },
        });

        created.push(issue);
      }

      return { created: created.length, total: assessmentIds.length };
    });

    revalidatePath("/qa-assessment");
    revalidatePath("/issues");

    return {
      success: true as const,
      data: result,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to bulk convert gaps to issues.";
    logger.error(
      { error, action: "bulk_convert_gaps_to_issues", tenantId },
      message,
    );
    return { success: false as const, error: message };
  }
}
