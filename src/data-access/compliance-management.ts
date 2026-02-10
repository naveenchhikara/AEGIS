import "server-only";

import { prisma } from "@/lib/prisma";
import { prismaForTenant } from "./prisma";
import { extractTenantId, type DalSession } from "./helpers";

/**
 * Compliance Management Data Access Layer
 *
 * Tenant-scoped operations use prismaForTenant() + explicit WHERE tenantId
 * (belt-and-suspenders). Global reference data (master directions, circulars)
 * uses bare prisma since these are shared across tenants.
 */

// ─── Custom Requirements (CMPL-04) ─────────────────────────────────────────

export interface CreateCustomRequirementInput {
  requirement: string;
  category: string;
  priority: string;
  frequency: string;
  title?: string;
  description?: string;
  rbiCircularId?: string;
  ownerId?: string;
}

export async function createCustomRequirement(
  session: DalSession,
  input: CreateCustomRequirementInput,
) {
  const tenantId = extractTenantId(session);
  const db = prismaForTenant(tenantId);

  return db.complianceRequirement.create({
    data: {
      tenantId,
      requirement: input.requirement,
      category: input.category,
      status: "PENDING",
      title: input.title,
      description: input.description,
      priority: input.priority,
      frequency: input.frequency,
      isCustom: true,
      rbiCircularId: input.rbiCircularId || undefined,
      ownerId: input.ownerId || undefined,
      nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  });
}

// ─── N/A Marking (CMPL-03) ──────────────────────────────────────────────────

export async function markRequirementNotApplicable(
  session: DalSession,
  requirementId: string,
  reason: string,
) {
  const tenantId = extractTenantId(session);
  const db = prismaForTenant(tenantId);

  const requirement = await db.complianceRequirement.findFirst({
    where: { id: requirementId, tenantId },
  });

  if (!requirement) {
    throw new Error("Requirement not found");
  }

  return db.complianceRequirement.update({
    where: { id: requirementId },
    data: { notApplicableReason: reason },
  });
}

export async function revertRequirementNotApplicable(
  session: DalSession,
  requirementId: string,
) {
  const tenantId = extractTenantId(session);
  const db = prismaForTenant(tenantId);

  const requirement = await db.complianceRequirement.findFirst({
    where: { id: requirementId, tenantId },
  });

  if (!requirement) {
    throw new Error("Requirement not found");
  }

  return db.complianceRequirement.update({
    where: { id: requirementId },
    data: {
      notApplicableReason: null,
      status: "PENDING",
    },
  });
}

// ─── Get Custom Requirements ────────────────────────────────────────────────

export async function getCustomRequirements(session: DalSession) {
  const tenantId = extractTenantId(session);
  const db = prismaForTenant(tenantId);

  return db.complianceRequirement.findMany({
    where: { tenantId, isCustom: true },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Master Directions (Read-Only, Global Reference Data) ───────────────────

export async function getMasterDirectionsWithCounts() {
  const directions = await prisma.rbiMasterDirection.findMany({
    orderBy: { shortId: "asc" },
    include: {
      _count: { select: { checklistItems: true } },
    },
  });

  return directions.map((d) => ({
    id: d.id,
    shortId: d.shortId,
    title: d.title,
    description: d.description,
    category: d.category,
    rbiRef: d.rbiRef,
    itemCount: d._count.checklistItems,
  }));
}

export async function getMasterDirectionItems(masterDirectionId: string) {
  return prisma.rbiChecklistItem.findMany({
    where: { masterDirectionId },
    orderBy: { itemCode: "asc" },
  });
}

// ─── RBI Circular Autocomplete (Global Reference Data) ──────────────────────

export async function searchRbiCirculars(query: string) {
  return prisma.rbiCircular.findMany({
    where: {
      OR: [
        { circularNumber: { contains: query, mode: "insensitive" } },
        { title: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 10,
    orderBy: { issuedDate: "desc" },
    select: {
      id: true,
      circularNumber: true,
      title: true,
    },
  });
}
