"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";

/**
 * Schema for ACB quarterly pack generation (R82).
 */
const BuildAcbAgendaSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  quarter: z.enum(["Q1_APR_JUN", "Q2_JUL_SEP", "Q3_OCT_DEC", "Q4_JAN_MAR"]),
  committeeId: z.string().uuid().optional(),
});

type BuildAcbAgendaInput = z.infer<typeof BuildAcbAgendaSchema>;

/**
 * Auto-generate quarterly ACB (Audit Committee of Board) packs (R82).
 * Aggregates:
 * - High/Critical open findings
 * - Compliance status summary
 * - Overdue observations
 * - Risk metrics
 * - Recent audit completion stats
 * Security: Requires board:agenda permission.
 */
export async function buildAcbAgenda(input: BuildAcbAgendaInput) {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (!hasPermission(userRoles, "board:agenda")) {
    return {
      success: false as const,
      error: "You do not have permission to build ACB agenda.",
    };
  }

  const parsed = BuildAcbAgendaSchema.safeParse(input);
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
        actionType: "governance.acb_agenda_built",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // 1. Get high/critical open observations
      const criticalObservations = await tx.observation.findMany({
        where: {
          tenantId,
          severity: { in: ["HIGH", "CRITICAL"] },
          status: { notIn: ["CLOSED"] },
        },
        select: {
          id: true,
          title: true,
          severity: true,
          status: true,
          branch: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      // 2. Compliance status summary
      const complianceStats = await tx.complianceItem.groupBy({
        by: ["status"],
        where: { tenantId },
        _count: true,
      });

      // 3. Overdue observations
      const overdueCount = await tx.complianceItem.count({
        where: {
          tenantId,
          status: { in: ["OPEN", "BRANCH_RESPONSE_DUE"] },
          dueDate: { lt: new Date() },
        },
      });

      // 4. Risk metrics (high-risk housekeeping)
      const housekeepingRisks = await tx.housekeepingMetric.findMany({
        where: {
          tenantId,
          agingDays: { gte: 90 },
        },
        select: {
          metricType: true,
          branch: { select: { name: true } },
          closingBalance: true,
          agingDays: true,
        },
        orderBy: { agingDays: "desc" },
        take: 10,
      });

      // 5. Recent audit completions (this quarter)
      const quarterDates = getQuarterDates(
        parsed.data.year,
        parsed.data.quarter,
      );
      const completedAudits = await tx.auditEngagement.count({
        where: {
          tenantId,
          status: "COMPLETED",
          completionDate: {
            gte: quarterDates.start,
            lte: quarterDates.end,
          },
        },
      });

      // 6. Find or create ACB committee
      let committee = parsed.data.committeeId
        ? await tx.committee.findFirst({
            where: { id: parsed.data.committeeId, tenantId },
          })
        : await tx.committee.findFirst({
            where: { tenantId, name: "ACB" },
          });

      if (!committee) {
        committee = await tx.committee.create({
          data: {
            tenantId,
            name: "ACB",
            description: "Audit Committee of Board",
            isActive: true,
          },
        });
      }

      // 7. Build agenda
      const agendaItems = [
        {
          title: "Review of High & Critical Observations",
          description: `${criticalObservations.length} high/critical findings require board attention`,
        },
        {
          title: "Compliance Status Dashboard",
          description: `Summary: ${JSON.stringify(complianceStats)}`,
        },
        {
          title: "Overdue Observations",
          description: `${overdueCount} observations are past due date`,
        },
        {
          title: "Housekeeping Risk Review",
          description: `${housekeepingRisks.length} accounts with aging > 90 days`,
        },
        {
          title: "Quarterly Audit Completion Report",
          description: `${completedAudits} audits completed in ${parsed.data.quarter}`,
        },
      ];

      // 8. Create meeting
      const meeting = await tx.committeeMeeting.create({
        data: {
          tenantId,
          committeeId: committee.id,
          meetingDate: quarterDates.end, // Schedule for end of quarter
          agendaItems,
          status: "SCHEDULED",
          attendees: [],
        },
      });

      return {
        meetingId: meeting.id,
        committeeId: committee.id,
        agendaItemsCount: agendaItems.length,
        criticalObservationsCount: criticalObservations.length,
        overdueCount,
      };
    });

    revalidatePath("/governance/committees");
    revalidatePath("/board/acb");

    return {
      success: true as const,
      data: result,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to build ACB agenda.";
    logger.error({ error, action: "build_acb_agenda", tenantId }, message);
    return { success: false as const, error: message };
  }
}

/**
 * Helper: Get quarter start and end dates.
 */
function getQuarterDates(year: number, quarter: string) {
  // Indian FY quarters: Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar
  const quarterMap: Record<string, { startMonth: number; endMonth: number }> = {
    Q1_APR_JUN: { startMonth: 3, endMonth: 5 }, // April (3) to June (5)
    Q2_JUL_SEP: { startMonth: 6, endMonth: 8 }, // July (6) to September (8)
    Q3_OCT_DEC: { startMonth: 9, endMonth: 11 }, // October (9) to December (11)
    Q4_JAN_MAR: { startMonth: 0, endMonth: 2 }, // January (0) to March (2)
  };

  const q = quarterMap[quarter];
  const start = new Date(year, q.startMonth, 1);
  const end = new Date(year, q.endMonth + 1, 0); // Last day of end month

  return { start, end };
}
