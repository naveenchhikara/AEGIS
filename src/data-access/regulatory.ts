import "server-only";
import { prismaForTenant } from "./prisma";
import type { Session } from "@/lib/auth";

/**
 * Get all regulatory observations for the tenant.
 */
export async function getRegulatoryObservations(
  session: Session,
  options?: {
    source?: string;
    atrStatus?: string;
    severity?: string;
  },
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.regulatoryObservation.findMany({
    where: {
      tenantId,
      ...(options?.source && { source: options.source }),
      ...(options?.atrStatus && { atrStatus: options.atrStatus }),
      ...(options?.severity && { severity: options.severity }),
    },
    include: {
      issue: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get a single regulatory observation by ID.
 */
export async function getRegulatoryObservation(
  session: Session,
  observationId: string,
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.regulatoryObservation.findFirst({
    where: { id: observationId, tenantId },
    include: {
      issue: {
        include: {
          actionPlans: {
            orderBy: { dueDate: "asc" },
          },
        },
      },
    },
  });
}

/**
 * Create a regulatory observation.
 */
export async function createRegulatoryObservation(
  session: Session,
  data: {
    source: string;
    referenceNo: string;
    paraNo?: string;
    description: string;
    severity: string;
    atrStatus?: string;
    issueId?: string;
  },
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.regulatoryObservation.create({
    data: {
      tenantId,
      ...data,
      atrStatus: data.atrStatus || "DRAFT",
    },
  });
}

/**
 * Update a regulatory observation.
 */
export async function updateRegulatoryObservation(
  session: Session,
  observationId: string,
  data: {
    description?: string;
    severity?: string;
    atrStatus?: string;
    atrText?: string;
    submittedAt?: Date;
    acceptedAt?: Date;
    issueId?: string;
  },
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.regulatoryObservation.update({
    where: { id: observationId },
    data,
  });
}

/**
 * Get observations pending ATR submission.
 */
export async function getPendingAtrObservations(session: Session) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.regulatoryObservation.findMany({
    where: {
      tenantId,
      atrStatus: "DRAFT",
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Get observations by reference number.
 */
export async function getObservationByReference(
  session: Session,
  referenceNo: string,
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.regulatoryObservation.findFirst({
    where: {
      tenantId,
      referenceNo,
    },
    include: {
      issue: true,
    },
  });
}
