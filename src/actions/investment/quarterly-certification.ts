"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";

/**
 * Schema for quarterly investment certification (R97).
 */
const CertificationSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]),
  certificationChecks: z.array(
    z.object({
      checkId: z.string(),
      compliant: z.boolean(),
      remarks: z.string().optional(),
    }),
  ),
  overallOpinion: z.enum(["SATISFACTORY", "QUALIFIED", "ADVERSE"]),
  remarks: z.string().optional(),
});

type CertificationInput = z.infer<typeof CertificationSchema>;

/**
 * Submit quarterly investment certification (R97).
 * Security: Requires ACB_MEMBER or IS_AUDITOR role.
 * Side effects: Creates IsAuditChecklist record for tracking.
 */
export async function submitQuarterlyCertification(input: CertificationInput) {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (!userRoles.includes("ACB_MEMBER") && !userRoles.includes("IS_AUDITOR")) {
    return {
      success: false as const,
      error: "You do not have permission to submit investment certifications.",
    };
  }

  const parsed = CertificationSchema.safeParse(input);
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
        actionType: "investment.quarterly_certification_submitted",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Create certification checklist record
      const checklist = await tx.isAuditChecklist.create({
        data: {
          tenantId,
          category: "INVESTMENT_CERTIFICATION",
          checklistName: `Investment Certification ${parsed.data.year}-${parsed.data.quarter}`,
          items: {
            checks: parsed.data.certificationChecks,
            overallOpinion: parsed.data.overallOpinion,
            remarks: parsed.data.remarks,
          },
          completedById: session.user.id,
          completedAt: new Date(),
          overallRating: parsed.data.overallOpinion,
        },
      });

      // TODO: Create notification to ACB members
      // await tx.notification.create({ ... });

      return { id: checklist.id };
    });

    revalidatePath("/investments");

    return {
      success: true as const,
      data: result,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to submit quarterly certification.";
    logger.error(
      { error, action: "submit_quarterly_certification", tenantId },
      message,
    );
    return { success: false as const, error: message };
  }
}

/**
 * Get previous certifications for display.
 */
export async function getInvestmentCertifications() {
  const session = await getRequiredSession();
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  try {
    const certifications = await db.isAuditChecklist.findMany({
      where: {
        tenantId,
        category: "INVESTMENT_CERTIFICATION",
      },
      orderBy: { completedAt: "desc" },
      take: 20,
    });

    return {
      success: true as const,
      data: certifications,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch certifications.";
    logger.error(
      { error, action: "get_investment_certifications", tenantId },
      message,
    );
    return { success: false as const, error: message };
  }
}
