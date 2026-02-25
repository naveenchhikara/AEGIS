"use server";

import { revalidatePath } from "next/cache";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import {
  computeModuleScore,
  computeCompositeScore,
  getRatingBand,
  SCORE_VALUES,
  type ScoredNode,
} from "@/lib/rbia-scoring-engine";
import {
  FreezeRbiaScoreSchema,
  type FreezeRbiaScoreInput,
  type ActionResult,
} from "./schemas";

// ─── freezeRbiaScore (EXAM-10, FIND-02, BMRP-01) ───────────────────────────

/**
 * Freeze the RBIA score for an engagement — the culminating action of the RBIA
 * audit workflow. Orchestrates 6 sequential steps inside a single Prisma
 * $transaction:
 *
 *   Step 0: Load engagement + validate state
 *   Step 1: Load all ExaminationResponses
 *   Step 2: Build scored examination tree
 *   Step 3: Compute per-module scores, composite score, and rating band
 *   Step 4: Upsert BranchRbiaScore snapshot (immutable after freeze)
 *   Step 5: Issue all DRAFT ActionPoints (DRAFT -> ISSUED)
 *   Step 6: Upsert BmResponseBatch with 15-day deadline
 *
 * Security:
 * - Permission: rbia:score_freeze (CAE + AUDIT_MANAGER only)
 * - tenantId from session only
 * - Engagement ownership validated via tenantId WHERE clause
 *
 * Idempotency:
 * - Pre-check for frozenAt gives user-friendly error before DB trigger fires
 * - BmResponseBatch uses upsert for safe retry
 *
 * Error reporting:
 * - Step-specific error messages via currentStep tracking
 * - SCORE_FROZEN code when score already frozen (DB trigger + pre-check)
 *
 * @returns compositeScore, ratingBand, apCount on success
 */
export async function freezeRbiaScore(
  input: FreezeRbiaScoreInput,
): Promise<
  ActionResult<{ compositeScore: number; ratingBand: string; apCount: number }>
> {
  // 1. Auth
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  // 2. Permission
  if (!hasPermission(userRoles, "rbia:score_freeze")) {
    return {
      success: false,
      error: "You do not have permission to freeze RBIA scores.",
      code: "PERMISSION_DENIED",
    };
  }

  // 3. Validate
  const parsed = FreezeRbiaScoreSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: "VALIDATION_ERROR",
    };
  }

  const validated = parsed.data;

  // 4. Prisma client
  const db = prismaForTenant(tenantId);

  // 5. Transaction with step tracking
  let currentStep = "initializing";

  try {
    const result = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "rbia_score.frozen",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // ── Step 0: Load engagement + validate state ──
      currentStep = "loading_engagement";
      const engagement = await tx.auditEngagement.findFirst({
        where: { id: validated.engagementId, tenantId },
        select: {
          id: true,
          status: true,
          branchId: true,
          teamMembers: { select: { id: true } },
          meetings: { select: { meetingType: true, signedOff: true } },
          branchRbiaScore: { select: { id: true, frozenAt: true } },
        },
      });
      if (!engagement) throw new Error("Engagement not found");
      if (!engagement.branchId)
        throw new Error("Engagement has no branch assigned");

      // Check if already frozen — DB trigger will catch this too, but we can give a better error
      if (engagement.branchRbiaScore?.frozenAt) {
        throw Object.assign(
          new Error("Score has already been frozen for this engagement"),
          { code: "SCORE_FROZEN" },
        );
      }

      // ── Step 1: Load all ExaminationResponses for this engagement ──
      currentStep = "loading_responses";
      const responses = await tx.examinationResponse.findMany({
        where: { engagementId: validated.engagementId },
        select: {
          id: true,
          nodeId: true,
          score: true,
          scoreLabel: true,
        },
      });

      // ── Step 2: Load full examination node tree + build scored tree ──
      currentStep = "building_tree";
      const allNodes = await tx.examinationNode.findMany({
        where: { tenantId, isActive: true },
        select: {
          id: true,
          code: true,
          weight: true,
          isCritical: true,
          isLeaf: true,
          parentId: true,
          depth: true,
          name: true,
          path: true,
        },
      });

      // Build response lookup: nodeId -> { scoreLabel, score }
      const responseMap = new Map<
        string,
        { scoreLabel: string | null; score: number | null }
      >();
      for (const r of responses) {
        responseMap.set(r.nodeId, {
          scoreLabel: r.scoreLabel,
          score: r.score !== null ? Number(r.score) : null,
        });
      }

      // Build tree using same two-pass Map approach as buildTree in rbia-examination.ts
      const nodeMap = new Map<
        string,
        ScoredNode & { depth: number; parentId: string | null }
      >();
      for (const n of allNodes) {
        const resp = responseMap.get(n.id);
        nodeMap.set(n.id, {
          nodeId: n.id,
          code: n.code,
          weight: Number(n.weight),
          isCritical: n.isCritical,
          isLeaf: n.isLeaf,
          scoreLabel: (resp?.scoreLabel as any) ?? null,
          children: [],
          depth: n.depth,
          parentId: n.parentId,
        });
      }

      // Link children -> parents, collect module nodes (depth 1)
      const moduleNodes: ScoredNode[] = [];
      for (const node of nodeMap.values()) {
        if (node.depth === 1) {
          moduleNodes.push(node);
        } else if (node.parentId) {
          const parent = nodeMap.get(node.parentId);
          if (parent) parent.children.push(node);
        }
      }

      // ── Step 3: Compute per-module scores and composite score ──
      currentStep = "computing_scores";
      const moduleScoresMap: Record<string, number> = {};
      const moduleScoreInputs: Array<{ weight: number; score: number | null }> =
        [];

      for (const moduleNode of moduleNodes) {
        const moduleScore = computeModuleScore(moduleNode);
        if (moduleScore !== null) {
          moduleScoresMap[moduleNode.code] = moduleScore;
        }
        moduleScoreInputs.push({
          weight: moduleNode.weight,
          score: moduleScore,
        });
      }

      const compositeScore = computeCompositeScore(moduleScoreInputs);
      if (compositeScore === null) {
        throw new Error("Cannot freeze: no examination items have been scored");
      }
      const ratingBand = getRatingBand(compositeScore);

      // Build scoring tree snapshot — serialize the full ScoredNode[] tree
      // for historical drill-down (per research recommendation)
      const scoringTreeSnapshot = moduleNodes.map(function serializeNode(
        n: ScoredNode,
      ): any {
        return {
          nodeId: n.nodeId,
          code: n.code,
          weight: n.weight,
          isCritical: n.isCritical,
          isLeaf: n.isLeaf,
          scoreLabel: n.scoreLabel,
          children: n.children.map(serializeNode),
        };
      });

      // ── Step 4: Write/upsert BranchRbiaScore ──
      currentStep = "writing_score";
      await tx.branchRbiaScore.upsert({
        where: { engagementId: validated.engagementId },
        create: {
          tenantId,
          engagementId: validated.engagementId,
          branchId: engagement.branchId,
          compositeScore,
          ratingBand,
          moduleScores: moduleScoresMap,
          scoringTreeSnapshot,
          frozenAt: new Date(),
          frozenById: session.user.id,
        },
        update: {
          compositeScore,
          ratingBand,
          moduleScores: moduleScoresMap,
          scoringTreeSnapshot,
          frozenAt: new Date(),
          frozenById: session.user.id,
        },
      });

      // ── Step 5: Issue all DRAFT ActionPoints (DRAFT -> ISSUED) ──
      currentStep = "issuing_action_points";
      await tx.actionPoint.updateMany({
        where: {
          engagementId: validated.engagementId,
          tenantId,
          status: "DRAFT",
        },
        data: {
          status: "ISSUED",
        },
      });

      // Count total APs for the batch (all statuses — they're all now ISSUED or already past ISSUED)
      const apCount = await tx.actionPoint.count({
        where: { engagementId: validated.engagementId, tenantId },
      });

      // ── Step 6: Create BmResponseBatch ──
      currentStep = "creating_bm_batch";
      const deadlineDays = 15; // TODO Phase 23: read from tenant.settings.bmResponseDeadlineDays
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + deadlineDays);

      // Use upsert to handle idempotent retry (see Pitfall 3 in research)
      await tx.bmResponseBatch.upsert({
        where: { engagementId: validated.engagementId },
        create: {
          tenantId,
          engagementId: validated.engagementId,
          totalActionPoints: apCount,
          deadline,
          status: "PENDING",
        },
        update: {
          totalActionPoints: apCount,
          deadline,
        },
      });

      return { compositeScore, ratingBand, apCount };
    });

    // Revalidate multiple paths affected by freeze
    revalidatePath(`/audit-execution/${validated.engagementId}/rbia`);
    revalidatePath(`/audit-execution`);

    return { success: true as const, data: result };
  } catch (error) {
    // Step-specific error messages (per locked decision: "specific step that failed")
    const stepMessages: Record<string, string> = {
      initializing: "Failed to initialize freeze",
      loading_engagement: "Engagement not found or inaccessible",
      loading_responses: "Failed to load examination responses",
      building_tree: "Failed to build examination tree",
      computing_scores: "Failed to compute scores",
      writing_score: "Score snapshot failed",
      issuing_action_points: "Failed to issue action points",
      creating_bm_batch: "Failed to create response batch",
    };

    const isScoreFrozen =
      error instanceof Error && (error as any).code === "SCORE_FROZEN";
    const errorCode = isScoreFrozen ? "SCORE_FROZEN" : "INTERNAL_ERROR";
    const userMessage = isScoreFrozen
      ? "Score has already been frozen for this engagement"
      : (stepMessages[currentStep] ?? "Status transition blocked");

    logger.error(
      { error, currentStep, engagementId: validated.engagementId, tenantId },
      userMessage,
    );

    return {
      success: false as const,
      error: userMessage,
      code: errorCode,
    };
  }
}
