import "server-only";
import { prismaForTenant } from "./prisma";
import type { Session } from "@/lib/auth";

/**
 * Get all loan reviews for an engagement with optional filters.
 */
export async function getLoanReviewsForEngagement(
  session: Session,
  engagementId: string,
  options?: {
    assetClass?: string;
    productType?: string;
    skip?: number;
    take?: number;
  },
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  const where: any = {
    engagementId,
    tenantId,
  };

  if (options?.assetClass) {
    where.assetClass = options.assetClass;
  }

  if (options?.productType) {
    where.productType = options.productType;
  }

  return db.loanReview.findMany({
    where,
    orderBy: { accountNo: "asc" },
    skip: options?.skip,
    take: options?.take,
  });
}

/**
 * Get loan review summary by asset class for an engagement.
 */
export async function getLoanReviewSummary(
  session: Session,
  engagementId: string,
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  const summary = await db.loanReview.groupBy({
    by: ["assetClass"],
    where: { engagementId, tenantId },
    _count: true,
    _sum: {
      outstandingAmount: true,
      sanctionAmount: true,
    },
  });

  return summary;
}

/**
 * Get SMA/NPA entries for an engagement.
 */
export async function getSmaNpaEntriesForEngagement(
  session: Session,
  engagementId: string,
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  // Custom category order for display
  const categoryOrder = [
    "SMA0",
    "SMA1",
    "SMA2",
    "NPA_SUB_STANDARD",
    "NPA_DOUBTFUL",
    "NPA_LOSS",
  ];

  const entries = await db.smaNpaEntry.findMany({
    where: { engagementId, tenantId },
  });

  // Sort by category order
  return entries.sort((a, b) => {
    const indexA = categoryOrder.indexOf(a.category);
    const indexB = categoryOrder.indexOf(b.category);
    return indexA - indexB;
  });
}

/**
 * Get engagement context for loan review (branch info).
 */
export async function getEngagementForLoanReview(
  session: Session,
  engagementId: string,
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.auditEngagement.findFirst({
    where: { id: engagementId, tenantId },
    select: {
      id: true,
      status: true,
      branch: {
        select: {
          id: true,
          code: true,
          name: true,
          city: true,
        },
      },
    },
  });
}
