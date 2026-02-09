import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Compliance Management Data Access Layer
 *
 * Handles custom requirements (CMPL-04) and N/A marking (CMPL-03).
 * All functions require tenantId from session for tenant isolation.
 */

// ─── Custom Requirements (CMPL-04) ─────────────────────────────────────────

export interface CreateCustomRequirementInput {
  tenantId: string;
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
  input: CreateCustomRequirementInput,
) {
  return prisma.complianceRequirement.create({
    data: {
      tenantId: input.tenantId,
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
  tenantId: string,
  requirementId: string,
  reason: string,
) {
  // Verify ownership
  const requirement = await prisma.complianceRequirement.findFirst({
    where: { id: requirementId, tenantId },
  });

  if (!requirement) {
    throw new Error("Requirement not found");
  }

  return prisma.complianceRequirement.update({
    where: { id: requirementId },
    data: { notApplicableReason: reason },
  });
}

export async function revertRequirementNotApplicable(
  tenantId: string,
  requirementId: string,
) {
  const requirement = await prisma.complianceRequirement.findFirst({
    where: { id: requirementId, tenantId },
  });

  if (!requirement) {
    throw new Error("Requirement not found");
  }

  return prisma.complianceRequirement.update({
    where: { id: requirementId },
    data: {
      notApplicableReason: null,
      status: "PENDING",
    },
  });
}

// ─── Master Directions (Read-Only) ──────────────────────────────────────────

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

// ─── RBI Circular Autocomplete ──────────────────────────────────────────────

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

// ─── Get Custom Requirements ────────────────────────────────────────────────

export async function getCustomRequirements(tenantId: string) {
  return prisma.complianceRequirement.findMany({
    where: { tenantId, isCustom: true },
    orderBy: { createdAt: "desc" },
  });
}
