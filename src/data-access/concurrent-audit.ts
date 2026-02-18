import "server-only";
import { prismaForTenant } from "./prisma";
import type { Session } from "@/lib/auth";

/**
 * Get all concurrent audit templates for the tenant.
 */
export async function getConcurrentAuditTemplates(
  session: Session,
  options?: {
    scopeArea?: string;
    isActive?: boolean;
  }
) {
  const tenantId = (session.user as any).tenantId as string;
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
  templateId: string
) {
  const tenantId = (session.user as any).tenantId as string;
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
  }
) {
  const tenantId = (session.user as any).tenantId as string;
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
  }
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.concurrentAuditTemplate.update({
    where: { id: templateId },
    data,
  });
}

/**
 * Delete a concurrent audit template.
 */
export async function deleteConcurrentAuditTemplate(
  session: Session,
  templateId: string
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.concurrentAuditTemplate.delete({
    where: { id: templateId },
  });
}

/**
 * Get templates by scope area for rapid entry workbench.
 */
export async function getTemplatesByScopeArea(
  session: Session,
  scopeArea: string
) {
  const tenantId = (session.user as any).tenantId as string;
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
