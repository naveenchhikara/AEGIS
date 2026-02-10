"use server";

import { getRequiredSession } from "@/data-access/session";
import { hasPermission, type Role } from "@/lib/permissions";
import {
  createCustomRequirement,
  markRequirementNotApplicable,
  revertRequirementNotApplicable,
  getMasterDirectionsWithCounts,
  getMasterDirectionItems,
  searchRbiCirculars,
  getCustomRequirements,
} from "@/data-access/compliance-management";

/**
 * Server Actions for Compliance Management (CMPL-03, CMPL-04)
 *
 * Wraps DAL functions with session auth and permission checks.
 */

// ─── Custom Requirements (CMPL-04) ─────────────────────────────────────────

interface AddCustomRequirementInput {
  requirement: string;
  category: string;
  priority: string;
  frequency: string;
  title?: string;
  description?: string;
  rbiCircularId?: string;
}

export async function addCustomRequirement(input: AddCustomRequirementInput) {
  const session = await getRequiredSession();
  const userRoles = (session.user as any).roles as Role[];

  if (!hasPermission(userRoles, "compliance:update")) {
    return { success: false, error: "Insufficient permissions." };
  }

  try {
    const result = await createCustomRequirement(session, {
      ...input,
      ownerId: session.user.id,
    });
    return { success: true, error: null, data: result };
  } catch (error) {
    console.error("Failed to add custom requirement:", error);
    return { success: false, error: "Failed to add requirement." };
  }
}

// ─── N/A Marking (CMPL-03) ──────────────────────────────────────────────────

export async function markAsNotApplicable(
  requirementId: string,
  reason: string,
) {
  const session = await getRequiredSession();
  const userRoles = (session.user as any).roles as Role[];

  if (!hasPermission(userRoles, "compliance:update")) {
    return { success: false, error: "Insufficient permissions." };
  }

  try {
    await markRequirementNotApplicable(session, requirementId, reason);
    return { success: true, error: null };
  } catch (error) {
    console.error("Failed to mark as N/A:", error);
    return { success: false, error: "Failed to update requirement." };
  }
}

export async function revertNotApplicable(requirementId: string) {
  const session = await getRequiredSession();
  const userRoles = (session.user as any).roles as Role[];

  if (!hasPermission(userRoles, "compliance:update")) {
    return { success: false, error: "Insufficient permissions." };
  }

  try {
    await revertRequirementNotApplicable(session, requirementId);
    return { success: true, error: null };
  } catch (error) {
    console.error("Failed to revert N/A:", error);
    return { success: false, error: "Failed to update requirement." };
  }
}

// ─── Master Directions (Read-Only) ──────────────────────────────────────────

export async function fetchMasterDirections() {
  await getRequiredSession(); // Auth gate

  try {
    const directions = await getMasterDirectionsWithCounts();
    return { success: true, error: null, data: directions };
  } catch (error) {
    console.error("Failed to fetch master directions:", error);
    return { success: false, error: "Failed to load master directions." };
  }
}

export async function fetchMasterDirectionItems(masterDirectionId: string) {
  await getRequiredSession(); // Auth gate

  try {
    const items = await getMasterDirectionItems(masterDirectionId);
    return { success: true, error: null, data: items };
  } catch (error) {
    console.error("Failed to fetch checklist items:", error);
    return { success: false, error: "Failed to load checklist items." };
  }
}

// ─── RBI Circular Search ────────────────────────────────────────────────────

export async function searchCirculars(query: string) {
  await getRequiredSession(); // Auth gate

  try {
    const results = await searchRbiCirculars(query);
    return { success: true, error: null, data: results };
  } catch (error) {
    console.error("Failed to search circulars:", error);
    return { success: false, error: "Failed to search." };
  }
}

// ─── Get Custom Requirements ────────────────────────────────────────────────

export async function fetchCustomRequirements() {
  const session = await getRequiredSession();

  try {
    const requirements = await getCustomRequirements(session);
    return { success: true, error: null, data: requirements };
  } catch (error) {
    console.error("Failed to fetch custom requirements:", error);
    return { success: false, error: "Failed to load requirements." };
  }
}
