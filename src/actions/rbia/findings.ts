"use server";

/**
 * RBIA Findings Server Actions (Phase 20-04)
 *
 * Implements the ActionPoint lifecycle:
 *  - createActionPoint     (FIND-01, FIND-06) — create with atomic serial number
 *  - updateActionPoint     (FIND-02) — DRAFT-only edits
 *  - deleteActionPoint     (FIND-02) — DRAFT-only deletion
 *  - promoteToObservation  (FIND-03) — promote AP to formal 5C Observation
 *  - submitBmResponse      (FIND-02) — Branch Head responds to issued AP
 *
 * Security:
 *  - action_point:manage      → LEAD_AUDITOR, AUDIT_MANAGER, CAE
 *  - action_point:bm_respond  → BRANCH_HEAD
 *  - tenantId always from session (S2)
 */

import { revalidatePath } from "next/cache";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import {
  CreateActionPointSchema,
  UpdateActionPointSchema,
  DeleteActionPointSchema,
  PromoteToObservationSchema,
  SubmitBmResponseSchema,
  type CreateActionPointInput,
  type UpdateActionPointInput,
  type DeleteActionPointInput,
  type PromoteToObservationInput,
  type SubmitBmResponseInput,
  type ActionResult,
} from "./schemas";

// ─── createActionPoint ────────────────────────────────────────────────────────

/**
 * Create a new DRAFT ActionPoint for an engagement.
 *
 * Auto-generates a sequential serial number within the engagement (FIND-06).
 * The serial number is assigned atomically inside the transaction to avoid races.
 *
 * @param input - CreateActionPointInput (engagementId, branchId, title, description, severity, moduleCode, sourceResponseId?)
 * @returns ActionResult<{ id: string; serialNo: number }>
 */
export async function createActionPoint(
  input: CreateActionPointInput,
): Promise<ActionResult<{ id: string; serialNo: number }>> {
  // Step 1: Auth
  const session = await getRequiredSession();
  const tenantId = session.user.tenantId;

  // Step 2: Permission
  if (!hasPermission(session.user.roles, "action_point:manage")) {
    return {
      success: false,
      error: "You do not have permission to manage action points.",
      code: "PERMISSION_DENIED",
    };
  }

  // Step 3: Validate
  const parsed = CreateActionPointSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: "VALIDATION_ERROR",
    };
  }

  const validated = parsed.data;
  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "action_point.created",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Verify engagement exists and belongs to tenant
      const engagement = await tx.auditEngagement.findFirst({
        where: { id: validated.engagementId, tenantId },
        select: { id: true, status: true },
      });
      if (!engagement) throw new Error("NOT_FOUND:Engagement not found");

      // Only allow creation during active audit phases
      const allowedStatuses = ["IN_PROGRESS", "EXIT_MEETING", "REPORT_DRAFT"];
      if (!allowedStatuses.includes(engagement.status)) {
        throw new Error(
          "CONFLICT:Action Points can only be created during active audit phases",
        );
      }

      // Atomic serial number assignment (FIND-06) — use max + 1 inside transaction
      const maxSerial = await tx.actionPoint.aggregate({
        where: { engagementId: validated.engagementId },
        _max: { serialNo: true },
      });
      const nextSerialNo = (maxSerial._max.serialNo ?? 0) + 1;

      return tx.actionPoint.create({
        data: {
          tenantId,
          engagementId: validated.engagementId,
          branchId: validated.branchId,
          serialNo: nextSerialNo,
          title: validated.title,
          description: validated.description,
          severity: validated.severity,
          moduleCode: validated.moduleCode,
          sourceResponseId: validated.sourceResponseId ?? null,
          status: "DRAFT",
          createdById: session.user.id,
        },
        select: { id: true, serialNo: true },
      });
    });

    revalidatePath(
      `/audit-execution/${validated.engagementId}/rbia/findings`,
    );

    return {
      success: true,
      data: { id: result.id, serialNo: result.serialNo },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(
      { error, action: "create_action_point", tenantId },
      "Failed to create action point",
    );
    if (msg.startsWith("NOT_FOUND:")) {
      return { success: false, error: msg.slice(10), code: "NOT_FOUND" };
    }
    if (msg.startsWith("CONFLICT:")) {
      return { success: false, error: msg.slice(9), code: "CONFLICT" };
    }
    return {
      success: false,
      error: "Failed to create action point. Please try again.",
      code: "INTERNAL_ERROR",
    };
  }
}

// ─── updateActionPoint ────────────────────────────────────────────────────────

/**
 * Update a DRAFT ActionPoint's mutable fields.
 *
 * Only DRAFT status APs can be edited. Non-DRAFT APs are locked (FIND-02).
 *
 * @param input - UpdateActionPointInput (actionPointId, title?, description?, severity?, moduleCode?)
 * @returns ActionResult<{ id: string }>
 */
export async function updateActionPoint(
  input: UpdateActionPointInput,
): Promise<ActionResult<{ id: string }>> {
  // Step 1: Auth
  const session = await getRequiredSession();
  const tenantId = session.user.tenantId;

  // Step 2: Permission
  if (!hasPermission(session.user.roles, "action_point:manage")) {
    return {
      success: false,
      error: "You do not have permission to manage action points.",
      code: "PERMISSION_DENIED",
    };
  }

  // Step 3: Validate
  const parsed = UpdateActionPointSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: "VALIDATION_ERROR",
    };
  }

  const validated = parsed.data;
  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "action_point.updated",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Verify AP exists and belongs to tenant
      const ap = await tx.actionPoint.findFirst({
        where: { id: validated.actionPointId, tenantId },
        select: { id: true, status: true, engagementId: true },
      });
      if (!ap) throw new Error("NOT_FOUND:Action Point not found");
      if (ap.status !== "DRAFT") {
        throw new Error("CONFLICT:Only DRAFT Action Points can be edited");
      }

      // Build update payload — only include provided fields
      const updateData: Record<string, unknown> = {};
      if (validated.title !== undefined) updateData.title = validated.title;
      if (validated.description !== undefined)
        updateData.description = validated.description;
      if (validated.severity !== undefined)
        updateData.severity = validated.severity;
      if (validated.moduleCode !== undefined)
        updateData.moduleCode = validated.moduleCode;

      const updated = await tx.actionPoint.update({
        where: { id: ap.id },
        data: updateData,
        select: { id: true, engagementId: true },
      });

      return updated;
    });

    revalidatePath(
      `/audit-execution/${result.engagementId}/rbia/findings`,
    );

    return { success: true, data: { id: result.id } };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(
      { error, action: "update_action_point", tenantId },
      "Failed to update action point",
    );
    if (msg.startsWith("NOT_FOUND:")) {
      return { success: false, error: msg.slice(10), code: "NOT_FOUND" };
    }
    if (msg.startsWith("CONFLICT:")) {
      return { success: false, error: msg.slice(9), code: "CONFLICT" };
    }
    return {
      success: false,
      error: "Failed to update action point. Please try again.",
      code: "INTERNAL_ERROR",
    };
  }
}

// ─── deleteActionPoint ────────────────────────────────────────────────────────

/**
 * Delete a DRAFT ActionPoint.
 *
 * Only DRAFT status APs can be deleted. Non-DRAFT APs are locked (FIND-02).
 *
 * @param input - DeleteActionPointInput (actionPointId)
 * @returns ActionResult<{ deleted: true }>
 */
export async function deleteActionPoint(
  input: DeleteActionPointInput,
): Promise<ActionResult<{ deleted: true }>> {
  // Step 1: Auth
  const session = await getRequiredSession();
  const tenantId = session.user.tenantId;

  // Step 2: Permission
  if (!hasPermission(session.user.roles, "action_point:manage")) {
    return {
      success: false,
      error: "You do not have permission to manage action points.",
      code: "PERMISSION_DENIED",
    };
  }

  // Step 3: Validate
  const parsed = DeleteActionPointSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: "VALIDATION_ERROR",
    };
  }

  const validated = parsed.data;
  const db = prismaForTenant(tenantId);

  try {
    let engagementId: string | null = null;

    await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "action_point.deleted",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Verify AP exists and belongs to tenant
      const ap = await tx.actionPoint.findFirst({
        where: { id: validated.actionPointId, tenantId },
        select: { id: true, status: true, engagementId: true },
      });
      if (!ap) throw new Error("NOT_FOUND:Action Point not found");
      if (ap.status !== "DRAFT") {
        throw new Error("CONFLICT:Only DRAFT Action Points can be deleted");
      }

      engagementId = ap.engagementId;

      await tx.actionPoint.delete({ where: { id: ap.id } });
    });

    if (engagementId) {
      revalidatePath(
        `/audit-execution/${engagementId}/rbia/findings`,
      );
    }

    return { success: true, data: { deleted: true } };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(
      { error, action: "delete_action_point", tenantId },
      "Failed to delete action point",
    );
    if (msg.startsWith("NOT_FOUND:")) {
      return { success: false, error: msg.slice(10), code: "NOT_FOUND" };
    }
    if (msg.startsWith("CONFLICT:")) {
      return { success: false, error: msg.slice(9), code: "CONFLICT" };
    }
    return {
      success: false,
      error: "Failed to delete action point. Please try again.",
      code: "INTERNAL_ERROR",
    };
  }
}

// ─── promoteToObservation ─────────────────────────────────────────────────────

/**
 * Promote an ActionPoint to a formal 5C Observation (FIND-03).
 *
 * Creates a NEW Observation with sourceActionPointId linking back to the AP.
 * The AP itself remains unchanged (dual findings model — both coexist per locked decision).
 *
 * @param input - PromoteToObservationInput (actionPointId, engagementId, 5C fields, severity)
 * @returns ActionResult<{ id: string }> — id of the created Observation
 */
export async function promoteToObservation(
  input: PromoteToObservationInput,
): Promise<ActionResult<{ id: string }>> {
  // Step 1: Auth
  const session = await getRequiredSession();
  const tenantId = session.user.tenantId;

  // Step 2: Permission
  if (!hasPermission(session.user.roles, "action_point:manage")) {
    return {
      success: false,
      error: "You do not have permission to promote action points.",
      code: "PERMISSION_DENIED",
    };
  }

  // Step 3: Validate
  const parsed = PromoteToObservationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: "VALIDATION_ERROR",
    };
  }

  const validated = parsed.data;
  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "action_point.promoted_to_observation",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Verify the ActionPoint exists and belongs to tenant
      const ap = await tx.actionPoint.findFirst({
        where: { id: validated.actionPointId, tenantId },
        select: { id: true, engagementId: true, branchId: true },
      });
      if (!ap) throw new Error("NOT_FOUND:Action Point not found");

      // Load engagement for branchId
      const engagement = await tx.auditEngagement.findFirst({
        where: { id: validated.engagementId, tenantId },
        select: { id: true, branchId: true },
      });
      if (!engagement) throw new Error("NOT_FOUND:Engagement not found");

      // Create the formal Observation with 5C fields + sourceActionPointId link
      const observation = await tx.observation.create({
        data: {
          tenantId,
          title: validated.title,
          condition: validated.condition,
          criteria: validated.criteria,
          cause: validated.cause,
          effect: validated.effect,
          recommendation: validated.recommendation,
          severity: validated.severity,
          status: "DRAFT",
          observationType: "AUDIT",
          engagementId: validated.engagementId,
          branchId: engagement.branchId ?? ap.branchId,
          sourceActionPointId: ap.id,
          createdById: session.user.id,
          version: 1,
        },
        select: { id: true },
      });

      // Create initial timeline entry for the new Observation
      await tx.observationTimeline.create({
        data: {
          observationId: observation.id,
          tenantId,
          event: "created",
          newValue: "DRAFT",
          comment: `Promoted from Action Point (AP-${ap.id})`,
          createdById: session.user.id,
        },
      });

      return observation;
    });

    revalidatePath(
      `/audit-execution/${validated.engagementId}/rbia/findings`,
    );
    revalidatePath("/findings");

    return { success: true, data: { id: result.id } };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(
      { error, action: "promote_to_observation", tenantId },
      "Failed to promote action point to observation",
    );
    if (msg.startsWith("NOT_FOUND:")) {
      return { success: false, error: msg.slice(10), code: "NOT_FOUND" };
    }
    if (msg.startsWith("CONFLICT:")) {
      return { success: false, error: msg.slice(9), code: "CONFLICT" };
    }
    return {
      success: false,
      error: "Failed to promote action point. Please try again.",
      code: "INTERNAL_ERROR",
    };
  }
}

// ─── submitBmResponse ─────────────────────────────────────────────────────────

/**
 * Submit Branch Manager response to an issued ActionPoint (FIND-02).
 *
 * Transitions AP: ISSUED | BM_RESPONSE_DUE → BM_RESPONDED.
 * Also increments the BmResponseBatch counter if one exists.
 *
 * Permission: action_point:bm_respond (BRANCH_HEAD only per locked decision).
 *
 * @param input - SubmitBmResponseInput (actionPointId, responseText)
 * @returns ActionResult<{ id: string; status: "BM_RESPONDED" }>
 */
export async function submitBmResponse(
  input: SubmitBmResponseInput,
): Promise<ActionResult<{ id: string; status: "BM_RESPONDED" }>> {
  // Step 1: Auth
  const session = await getRequiredSession();
  const tenantId = session.user.tenantId;

  // Step 2: Permission
  if (!hasPermission(session.user.roles, "action_point:bm_respond")) {
    return {
      success: false,
      error: "You do not have permission to submit a branch manager response.",
      code: "PERMISSION_DENIED",
    };
  }

  // Step 3: Validate
  const parsed = SubmitBmResponseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: "VALIDATION_ERROR",
    };
  }

  const validated = parsed.data;
  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "action_point.bm_responded",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Load AP + verify tenant + verify respondable status
      const ap = await tx.actionPoint.findFirst({
        where: { id: validated.actionPointId, tenantId },
        select: { id: true, status: true, engagementId: true },
      });
      if (!ap) throw new Error("NOT_FOUND:Action Point not found");

      // BM can respond when AP is ISSUED or BM_RESPONSE_DUE
      const respondableStatuses = ["ISSUED", "BM_RESPONSE_DUE"];
      if (!respondableStatuses.includes(ap.status)) {
        throw new Error(
          "CONFLICT:Action Point is not in a respondable state (must be ISSUED or BM_RESPONSE_DUE)",
        );
      }

      // Update AP with BM response
      const updated = await tx.actionPoint.update({
        where: { id: ap.id },
        data: {
          bmResponseText: validated.responseText,
          bmResponseDate: new Date(),
          status: "BM_RESPONDED",
        },
        select: { id: true, engagementId: true },
      });

      // Increment BmResponseBatch counter if batch exists
      const batch = await tx.bmResponseBatch.findUnique({
        where: { engagementId: ap.engagementId },
        select: { id: true },
      });
      if (batch) {
        await tx.bmResponseBatch.update({
          where: { id: batch.id },
          data: {
            respondedActionPoints: { increment: 1 },
          },
        });
      }

      return updated;
    });

    revalidatePath(
      `/audit-execution/${result.engagementId}/rbia/findings`,
    );

    return {
      success: true,
      data: { id: result.id, status: "BM_RESPONDED" },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(
      { error, action: "submit_bm_response", tenantId },
      "Failed to submit BM response",
    );
    if (msg.startsWith("NOT_FOUND:")) {
      return { success: false, error: msg.slice(10), code: "NOT_FOUND" };
    }
    if (msg.startsWith("CONFLICT:")) {
      return { success: false, error: msg.slice(9), code: "CONFLICT" };
    }
    return {
      success: false,
      error: "Failed to submit branch manager response. Please try again.",
      code: "INTERNAL_ERROR",
    };
  }
}
