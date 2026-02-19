import "server-only";
import { prismaForTenant } from "./prisma";
import type { AuthSession as Session } from "@/lib/auth";

/**
 * Get all concurrent audit templates for the tenant.
 */
export async function getConcurrentAuditTemplates(
  session: Session,
  options?: {
    scopeArea?: string;
    isActive?: boolean;
  },
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.concurrentAuditTemplate.findMany({
    where: {
      tenantId,
      ...(options?.scopeArea && { scopeArea: options.scopeArea }),
      ...(options?.isActive !== undefined && { isActive: options.isActive }),
    },
    orderBy: [{ scopeArea: "asc" }, { name: "asc" }],
  });
}

/**
 * Get a single concurrent audit template by ID.
 */
export async function getConcurrentAuditTemplate(
  session: Session,
  templateId: string,
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.concurrentAuditTemplate.findFirst({
    where: { id: templateId, tenantId },
  });
}

/**
 * Create a concurrent audit template.
 */
export async function createConcurrentAuditTemplate(
  session: Session,
  data: {
    scopeArea: string;
    name: string;
    description?: string;
    checklistItems: any;
  },
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.concurrentAuditTemplate.create({
    data: {
      tenantId,
      ...data,
      isActive: true,
    },
  });
}

/**
 * Update a concurrent audit template.
 */
export async function updateConcurrentAuditTemplate(
  session: Session,
  templateId: string,
  data: {
    name?: string;
    description?: string;
    checklistItems?: any;
    isActive?: boolean;
  },
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.concurrentAuditTemplate.update({
    where: { id: templateId, tenantId },
    data,
  });
}

/**
 * Delete a concurrent audit template.
 */
export async function deleteConcurrentAuditTemplate(
  session: Session,
  templateId: string,
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.concurrentAuditTemplate.delete({
    where: { id: templateId, tenantId },
  });
}

/**
 * Get templates by scope area for rapid entry workbench.
 */
export async function getTemplatesByScopeArea(
  session: Session,
  scopeArea: string,
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.concurrentAuditTemplate.findMany({
    where: {
      tenantId,
      scopeArea,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      checklistItems: true,
    },
  });
}

/**
 * Get concurrent audit findings with potential RBIA duplicates for de-duplication panel (R76).
 */
export async function getConcurrentFindingsForDedup(session: Session) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  // Get concurrent audit observations (capped at 500)
  const concurrentObs = await db.observation.findMany({
    where: { tenantId, criteria: { startsWith: "Concurrent Audit" } },
    select: {
      id: true,
      title: true,
      condition: true,
      severity: true,
      branch: { select: { id: true, name: true } },
      createdAt: true,
      status: true,
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  // Get RBIA observations for comparison (capped at 2000, most recent first)
  const rbiaObs = await db.observation.findMany({
    where: { tenantId, criteria: { not: { startsWith: "Concurrent Audit" } } },
    select: {
      id: true,
      title: true,
      condition: true,
      branch: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });

  // Simple title-based duplicate detection
  const potentialDuplicates = concurrentObs.map((co) => {
    const matches = rbiaObs.filter((ro) => {
      // Same branch check
      if (ro.branch?.id !== co.branch?.id) return false;

      // Title similarity check (simple substring match)
      const coTitle = co.title.toLowerCase();
      const roTitle = ro.title.toLowerCase();
      const searchLen = Math.min(20, coTitle.length);

      return (
        roTitle.includes(coTitle.substring(0, searchLen)) ||
        coTitle.includes(roTitle.substring(0, searchLen))
      );
    });

    return { ...co, potentialRbiaDuplicates: matches };
  });

  return potentialDuplicates;
}
