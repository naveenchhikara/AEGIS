import { prismaForTenant } from "./prisma";
import type { Session } from "@/lib/auth";
import { logger } from "@/lib/logger";

/**
 * Create ComplianceItem for an observation (R34).
 * Called when observation transitions to ISSUED status.
 */
export async function createComplianceItem(
  session: Session,
  observationId: string,
  auditId: string,
  branchId: string | null
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  try {
    // Check if ComplianceItem already exists
    const existing = await db.complianceItem.findUnique({
      where: { observationId },
    });

    if (existing) {
      logger.warn(
        { observationId, tenantId },
        "ComplianceItem already exists for observation"
      );
      return existing;
    }

    // Compute due date: 30 days from now (R35 — branch response SLA)
    const now = new Date();
    const branchResponseDue = new Date(now);
    branchResponseDue.setDate(branchResponseDue.getDate() + 30);

    const complianceItem = await db.complianceItem.create({
      data: {
        tenantId,
        observationId,
        auditId,
        branchId,
        status: "OPEN",
        escalationLevel: 0,
        daysOpen: 0,
        dueDate: branchResponseDue,
      },
    });

    logger.info(
      { complianceItemId: complianceItem.id, observationId, tenantId },
      "ComplianceItem created"
    );

    return complianceItem;
  } catch (error) {
    logger.error(
      { error, observationId, tenantId },
      "Failed to create ComplianceItem"
    );
    throw error;
  }
}

/**
 * Get ComplianceItem for an observation.
 */
export async function getComplianceItemByObservation(
  session: Session,
  observationId: string
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.complianceItem.findUnique({
    where: { observationId },
    include: {
      observation: {
        select: {
          id: true,
          title: true,
          severity: true,
          status: true,
        },
      },
      branch: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });
}

/**
 * Get all ComplianceItems for an engagement.
 */
export async function getComplianceItemsByEngagement(
  session: Session,
  auditId: string
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.complianceItem.findMany({
    where: {
      tenantId,
      auditId,
    },
    include: {
      observation: {
        select: {
          id: true,
          title: true,
          severity: true,
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Update daysOpen for all open compliance items (cron job).
 */
export async function updateDaysOpenForOpenItems(tenantId: string) {
  const db = prismaForTenant(tenantId);

  try {
    const openItems = await db.complianceItem.findMany({
      where: {
        tenantId,
        status: {
          notIn: ["CLOSED"],
        },
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    const now = new Date();

    for (const item of openItems) {
      const daysOpen = Math.floor(
        (now.getTime() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      await db.complianceItem.update({
        where: { id: item.id },
        data: { daysOpen },
      });
    }

    logger.info(
      { tenantId, count: openItems.length },
      "Updated daysOpen for compliance items"
    );
  } catch (error) {
    logger.error(
      { error, tenantId },
      "Failed to update daysOpen for compliance items"
    );
    throw error;
  }
}
