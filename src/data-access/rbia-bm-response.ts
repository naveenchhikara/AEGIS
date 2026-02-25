import "server-only";

import { prismaForTenant } from "./prisma";
import type { AuthSession as Session } from "@/lib/auth";
import type {
  Severity,
  ActionPointStatus,
  BmBatchStatus,
} from "@/generated/prisma/enums";

/**
 * Data Access Layer for BM (Branch Manager) response batch and ActionPoint response data.
 *
 * Follows the canonical DAL 5-step pattern:
 * 1. Accept session object (tenantId source)
 * 2. Use prismaForTenant() for RLS isolation
 * 3. Add explicit WHERE tenantId (belt-and-suspenders)
 * 4. Runtime assertions where applicable
 * 5. Return typed data
 *
 * SECURITY: tenantId MUST come from session only, never from URL/body/query.
 *
 * Phase 22-04: BM response panel data access — batch progress + issued APs for response.
 */

function extractTenantId(session: Session): string {
  return session.user.tenantId;
}

// -- Types ------------------------------------------------------------------

export type BmResponseBatchData = {
  id: string;
  engagementId: string;
  totalActionPoints: number;
  respondedActionPoints: number;
  deadline: Date;
  status: BmBatchStatus;
  submittedAt: Date | null;
};

export type ActionPointForBmResponse = {
  id: string;
  serialNo: number;
  title: string;
  description: string;
  severity: Severity;
  moduleCode: string;
  status: ActionPointStatus;
  bmResponseText: string | null;
  bmResponseDate: Date | null;
  bmResponseDeadline: Date | null;
};

// -- getBmResponseBatch -----------------------------------------------------

/**
 * Get the BmResponseBatch for a given engagement, or null if none exists.
 *
 * Uses findUnique on engagementId (unique field in schema).
 * Verifies tenantId post-fetch for belt-and-suspenders isolation.
 *
 * @param session - Authenticated session (tenantId source)
 * @param engagementId - Audit engagement UUID
 * @returns BmResponseBatchData or null
 */
export async function getBmResponseBatch(
  session: Session,
  engagementId: string,
): Promise<BmResponseBatchData | null> {
  const tenantId = extractTenantId(session);
  const db = prismaForTenant(tenantId);

  const batch = await db.bmResponseBatch.findUnique({
    where: { engagementId },
    select: {
      id: true,
      tenantId: true,
      engagementId: true,
      totalActionPoints: true,
      respondedActionPoints: true,
      deadline: true,
      status: true,
      submittedAt: true,
    },
  });

  // Belt-and-suspenders: verify tenantId post-fetch
  if (!batch || batch.tenantId !== tenantId) {
    return null;
  }

  return {
    id: batch.id,
    engagementId: batch.engagementId,
    totalActionPoints: batch.totalActionPoints,
    respondedActionPoints: batch.respondedActionPoints,
    deadline: batch.deadline,
    status: batch.status,
    submittedAt: batch.submittedAt,
  };
}

// -- getIssuedActionPointsForBm ---------------------------------------------

/**
 * Get all ActionPoints for a BM to respond to — those with status in
 * ISSUED, BM_RESPONSE_DUE, or BM_RESPONDED. Ordered by serialNo ascending.
 *
 * Returns only the fields needed for the BM response panel UI.
 *
 * @param session - Authenticated session (tenantId source)
 * @param engagementId - Audit engagement UUID
 * @returns ActionPointForBmResponse[] ordered by serialNo
 */
export async function getIssuedActionPointsForBm(
  session: Session,
  engagementId: string,
): Promise<ActionPointForBmResponse[]> {
  const tenantId = extractTenantId(session);
  const db = prismaForTenant(tenantId);

  const rows = await db.actionPoint.findMany({
    where: {
      tenantId,
      engagementId,
      status: { in: ["ISSUED", "BM_RESPONSE_DUE", "BM_RESPONDED"] },
    },
    orderBy: { serialNo: "asc" },
    select: {
      id: true,
      serialNo: true,
      title: true,
      description: true,
      severity: true,
      moduleCode: true,
      status: true,
      bmResponseText: true,
      bmResponseDate: true,
      bmResponseDeadline: true,
    },
  });

  return rows;
}
