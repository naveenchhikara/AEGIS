"use server";

/**
 * RBIA Examination Server Actions (Phase 20 — 20-02)
 *
 * Covers:
 * - saveExaminationResponse   — upsert scored response + optional DRAFT ActionPoint
 * - autoSelectModules         — bulk-select applicable modules for an engagement
 * - addModuleSelection        — manually add a single module
 * - removeModuleSelection     — manually remove a single module
 *
 * Security:
 * - All actions require authentication via getRequiredSession()
 * - rbia:examine permission required for examination write actions
 * - tenantId ALWAYS sourced from session, never from request body
 */

import { revalidatePath } from "next/cache";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import { SCORE_VALUES } from "@/lib/rbia-scoring-engine";
import {
  SaveExaminationResponseSchema,
  AutoSelectModulesSchema,
  AddModuleSelectionSchema,
  RemoveModuleSelectionSchema,
  type ActionResult,
  type SaveExaminationResponseInput,
  type AutoSelectModulesInput,
  type AddModuleSelectionInput,
  type RemoveModuleSelectionInput,
} from "./schemas";

/** Map scoreLabel → default ActionPoint severity when auto-creating. */
const AP_SEVERITY_MAP: Record<
  string,
  "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
> = {
  FULLY_COMPLIANT: "LOW",
  LARGELY_COMPLIANT: "LOW",
  PARTIALLY_COMPLIANT: "MEDIUM",
  NON_COMPLIANT: "HIGH",
};

// ─── saveExaminationResponse ──────────────────────────────────────────────────

/**
 * Upsert an ExaminationResponse for a checklist node within an engagement.
 *
 * If flagForActionPoint=true and no ActionPoint yet links to this response,
 * a DRAFT ActionPoint is auto-created with the next serial number.
 * Serial is assigned atomically via _max aggregate inside the transaction.
 *
 * Security: Requires rbia:examine permission.
 * Atomicity: Response upsert + optional ActionPoint creation in one transaction.
 */
export async function saveExaminationResponse(
  input: SaveExaminationResponseInput,
): Promise<
  ActionResult<{
    responseId: string;
    actionPointId: string | null;
    autoCreatedActionPoint: boolean;
  }>
> {
  // ─── Auth ────────────────────────────────────────────────────────
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (!hasPermission(userRoles, "rbia:examine")) {
    return {
      success: false,
      error: "You do not have permission to save examination responses.",
      code: "PERMISSION_DENIED",
    };
  }

  // ─── Validate ────────────────────────────────────────────────────
  const parsed = SaveExaminationResponseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: "VALIDATION_ERROR",
    };
  }
  const validated = parsed.data;

  // Decimal score from canonical SCORE_VALUES map
  const score = SCORE_VALUES[validated.scoreLabel];

  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "examination_response.saved",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Verify engagement exists and load branchId
      const engagement = await tx.auditEngagement.findFirst({
        where: { id: validated.engagementId, tenantId },
        select: { id: true, branchId: true },
      });
      if (!engagement) {
        throw new Error("Engagement not found.");
      }

      // Upsert ExaminationResponse on compound unique (engagementId, nodeId)
      const response = await tx.examinationResponse.upsert({
        where: {
          engagementId_nodeId: {
            engagementId: validated.engagementId,
            nodeId: validated.nodeId,
          },
        },
        update: {
          score,
          scoreLabel: validated.scoreLabel,
          workingNotes: validated.workingNotes ?? null,
          flagForObservation: validated.flagForObservation,
          flagForActionPoint: validated.flagForActionPoint,
          respondedById: session.user.id,
          respondedAt: new Date(),
        },
        create: {
          tenantId,
          engagementId: validated.engagementId,
          nodeId: validated.nodeId,
          score,
          scoreLabel: validated.scoreLabel,
          workingNotes: validated.workingNotes ?? null,
          flagForObservation: validated.flagForObservation,
          flagForActionPoint: validated.flagForActionPoint,
          respondedById: session.user.id,
          respondedAt: new Date(),
        },
        select: {
          id: true,
          actionPoints: { select: { id: true }, take: 1 },
        },
      });

      // Auto-create DRAFT ActionPoint (silent — no extra notification)
      let actionPointId: string | null = null;
      let autoCreatedActionPoint = false;

      if (
        validated.flagForActionPoint &&
        response.actionPoints.length === 0 &&
        engagement.branchId
      ) {
        // Load node details for AP prefill
        const node = await tx.examinationNode.findUnique({
          where: { id: validated.nodeId },
          select: { code: true, name: true, path: true },
        });

        // Atomic serial: use _max to avoid race conditions
        const maxSerial = await tx.actionPoint.aggregate({
          where: { engagementId: validated.engagementId },
          _max: { serialNo: true },
        });
        const nextSerialNo = (maxSerial._max.serialNo ?? 0) + 1;

        const severity = AP_SEVERITY_MAP[validated.scoreLabel] ?? "MEDIUM";

        // moduleCode: depth-1 segment of the path (e.g. "OPS" from "ROOT.OPS.CASH")
        const moduleCode =
          node?.path?.split(".")[1] ?? node?.code ?? "UNKNOWN";

        const ap = await tx.actionPoint.create({
          data: {
            tenantId,
            engagementId: validated.engagementId,
            branchId: engagement.branchId,
            serialNo: nextSerialNo,
            title: node?.name ?? "Action Point",
            description:
              validated.workingNotes?.trim() ||
              `Action required for: ${node?.name ?? validated.nodeId}`,
            severity,
            moduleCode,
            sourceResponseId: response.id,
            status: "DRAFT",
            createdById: session.user.id,
          },
          select: { id: true },
        });

        actionPointId = ap.id;
        autoCreatedActionPoint = true;
      } else if (response.actionPoints.length > 0) {
        actionPointId = response.actionPoints[0].id;
      }

      return {
        responseId: response.id,
        actionPointId,
        autoCreatedActionPoint,
      };
    });

    revalidatePath(`/audit-execution/${validated.engagementId}/rbia`);
    return { success: true, data: result };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to save examination response.";
    logger.error(
      { error, action: "save_examination_response", tenantId },
      message,
    );
    return { success: false, error: message, code: "INTERNAL_ERROR" };
  }
}

// ─── autoSelectModules ────────────────────────────────────────────────────────

/**
 * Auto-select all ExaminationNode modules applicable to the engagement's branch type.
 *
 * Modules with empty applicableBranchTypes apply to all branches.
 * Modules with non-empty applicableBranchTypes apply only to matching branch categories.
 * Uses skipDuplicates so it is idempotent — safe to call multiple times.
 *
 * Security: Requires rbia:examine permission.
 */
export async function autoSelectModules(
  input: AutoSelectModulesInput,
): Promise<ActionResult<{ selectedCount: number }>> {
  // ─── Auth ────────────────────────────────────────────────────────
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (!hasPermission(userRoles, "rbia:examine")) {
    return {
      success: false,
      error: "You do not have permission to select examination modules.",
      code: "PERMISSION_DENIED",
    };
  }

  // ─── Validate ────────────────────────────────────────────────────
  const parsed = AutoSelectModulesSchema.safeParse(input);
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
    // Load engagement with branch category
    const engagement = await db.auditEngagement.findFirst({
      where: { id: validated.engagementId, tenantId },
      select: {
        id: true,
        branch: { select: { category: true } },
      },
    });
    if (!engagement) {
      return {
        success: false,
        error: "Engagement not found.",
        code: "NOT_FOUND",
      };
    }

    const branchCategory = engagement.branch?.category ?? null;

    // Load depth=1 modules (top-level modules only)
    const allModules = await db.examinationNode.findMany({
      where: { tenantId, isActive: true, depth: 1 },
      select: { id: true, code: true, applicableBranchTypes: true },
      orderBy: { displayOrder: "asc" },
    });

    // Filter: empty applicableBranchTypes = all branches; otherwise must match
    const applicableModules = allModules.filter(
      (m) =>
        m.applicableBranchTypes.length === 0 ||
        (branchCategory !== null &&
          m.applicableBranchTypes.includes(branchCategory)),
    );

    if (applicableModules.length === 0) {
      return { success: true, data: { selectedCount: 0 } };
    }

    const result = await db.engagementModuleSelection.createMany({
      data: applicableModules.map((m) => ({
        tenantId,
        engagementId: validated.engagementId,
        moduleNodeId: m.id,
        isAutoSelected: true,
        selectionReason: branchCategory
          ? `Auto-selected for branch category: ${branchCategory}`
          : "Applies to all branch types",
      })),
      skipDuplicates: true,
    });

    revalidatePath(`/audit-execution/${validated.engagementId}/rbia`);
    return { success: true, data: { selectedCount: result.count } };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to auto-select modules.";
    logger.error({ error, action: "auto_select_modules", tenantId }, message);
    return { success: false, error: message, code: "INTERNAL_ERROR" };
  }
}

// ─── addModuleSelection ───────────────────────────────────────────────────────

/**
 * Manually add a single examination module to an engagement.
 *
 * Looks up ExaminationNode by code (within the tenant).
 * Returns CONFLICT if the module is already selected.
 *
 * Security: Requires rbia:examine permission.
 */
export async function addModuleSelection(
  input: AddModuleSelectionInput,
): Promise<
  ActionResult<{
    selectionId: string;
    moduleCode: string;
    moduleName: string;
  }>
> {
  // ─── Auth ────────────────────────────────────────────────────────
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (!hasPermission(userRoles, "rbia:examine")) {
    return {
      success: false,
      error: "You do not have permission to manage module selections.",
      code: "PERMISSION_DENIED",
    };
  }

  // ─── Validate ────────────────────────────────────────────────────
  const parsed = AddModuleSelectionSchema.safeParse(input);
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
    // Look up ExaminationNode by code (depth=1: top-level modules only)
    const moduleNode = await db.examinationNode.findFirst({
      where: { tenantId, code: validated.moduleCode, isActive: true, depth: 1 },
      select: { id: true, code: true, name: true },
    });
    if (!moduleNode) {
      return {
        success: false,
        error: `Module with code "${validated.moduleCode}" not found.`,
        code: "NOT_FOUND",
      };
    }

    // Guard: conflict if already selected
    const existing = await db.engagementModuleSelection.findUnique({
      where: {
        engagementId_moduleNodeId: {
          engagementId: validated.engagementId,
          moduleNodeId: moduleNode.id,
        },
      },
    });
    if (existing) {
      return {
        success: false,
        error: `Module "${validated.moduleCode}" is already selected for this engagement.`,
        code: "CONFLICT",
      };
    }

    const selection = await db.engagementModuleSelection.create({
      data: {
        tenantId,
        engagementId: validated.engagementId,
        moduleNodeId: moduleNode.id,
        isAutoSelected: false,
        selectionReason: "Manually added by auditor",
      },
      select: { id: true },
    });

    revalidatePath(`/audit-execution/${validated.engagementId}/rbia`);
    return {
      success: true,
      data: {
        selectionId: selection.id,
        moduleCode: moduleNode.code,
        moduleName: moduleNode.name,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to add module.";
    logger.error({ error, action: "add_module_selection", tenantId }, message);
    return { success: false, error: message, code: "INTERNAL_ERROR" };
  }
}

// ─── removeModuleSelection ────────────────────────────────────────────────────

/**
 * Remove a module selection from an engagement.
 *
 * Looks up ExaminationNode by code, then deletes the EngagementModuleSelection.
 * Returns NOT_FOUND if the module is not currently selected.
 *
 * Security: Requires rbia:examine permission.
 */
export async function removeModuleSelection(
  input: RemoveModuleSelectionInput,
): Promise<ActionResult<{ removed: true }>> {
  // ─── Auth ────────────────────────────────────────────────────────
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (!hasPermission(userRoles, "rbia:examine")) {
    return {
      success: false,
      error: "You do not have permission to manage module selections.",
      code: "PERMISSION_DENIED",
    };
  }

  // ─── Validate ────────────────────────────────────────────────────
  const parsed = RemoveModuleSelectionSchema.safeParse(input);
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
    // Look up ExaminationNode by code
    const moduleNode = await db.examinationNode.findFirst({
      where: { tenantId, code: validated.moduleCode, isActive: true },
      select: { id: true, code: true },
    });
    if (!moduleNode) {
      return {
        success: false,
        error: `Module with code "${validated.moduleCode}" not found.`,
        code: "NOT_FOUND",
      };
    }

    // Verify selection exists before attempting delete
    const existing = await db.engagementModuleSelection.findUnique({
      where: {
        engagementId_moduleNodeId: {
          engagementId: validated.engagementId,
          moduleNodeId: moduleNode.id,
        },
      },
    });
    if (!existing) {
      return {
        success: false,
        error: `Module "${validated.moduleCode}" is not selected for this engagement.`,
        code: "NOT_FOUND",
      };
    }

    await db.engagementModuleSelection.delete({
      where: {
        engagementId_moduleNodeId: {
          engagementId: validated.engagementId,
          moduleNodeId: moduleNode.id,
        },
      },
    });

    revalidatePath(`/audit-execution/${validated.engagementId}/rbia`);
    return { success: true, data: { removed: true } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to remove module.";
    logger.error(
      { error, action: "remove_module_selection", tenantId },
      message,
    );
    return { success: false, error: message, code: "INTERNAL_ERROR" };
  }
}
