"use server";

/**
 * RBIA Score Freeze Server Action (Phase 20 — 20-05)
 *
 * freezeRbiaScore — atomic snapshot of the RBIA composite score for an engagement.
 *
 * Five sequential logical steps executed inside a single Prisma $transaction:
 *   1. Load ExaminationNode tree + ExaminationResponses
 *   2. Build ScoredNode tree and compute module/composite scores
 *   3. Write BranchRbiaScore snapshot (upsert — create or update draft)
 *   4. Bulk-issue all DRAFT ActionPoints → ISSUED
 *   5. Create BmResponseBatch (deadline: 15 days)
 *
 * After the transaction, transitions engagement to REPORT_DRAFT if currently
 * in EXIT_MEETING (uses canTransitionEngagement state machine).
 *
 * Security:
 * - Requires rbia:score_freeze permission
 * - tenantId sourced exclusively from session
 * - Engagement state guard: must be EXIT_MEETING or REPORT_DRAFT
 * - Application-layer guard: SCORE_FROZEN returned immediately if already frozen
 */

import { revalidatePath } from "next/cache";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import {
  getExaminationTree,
  type ExaminationTreeNode,
} from "@/data-access/rbia-examination";
import {
  computeNodeScore,
  computeModuleScore,
  computeCompositeScore,
  getRatingBand,
  toPercentage,
  type ScoredNode,
} from "@/lib/rbia-scoring-engine";
import {
  canTransitionEngagement,
  type EngagementContext,
} from "@/lib/engagement-state-machine";
import type { EngagementStatus } from "@/generated/prisma/enums";
import {
  FreezeRbiaScoreSchema,
  type ActionResult,
} from "./schemas";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Recursively convert an ExaminationTreeNode (DAL type) to a ScoredNode
 * (scoring engine type), threading in the response's scoreLabel for leaf nodes.
 */
function toScoredNode(node: ExaminationTreeNode): ScoredNode {
  return {
    nodeId: node.id,
    code: node.code,
    weight: node.weight,
    isCritical: node.isCritical,
    isLeaf: node.isLeaf,
    scoreLabel: node.response?.scoreLabel ?? null,
    children: node.children.map(toScoredNode),
  };
}

// ─── Module score shape stored in JSONB ───────────────────────────────────────

type ModuleScoreEntry = {
  moduleCode: string;
  moduleName: string;
  score: number | null;
  percentage: number | null;
  ratingBand: string | null;
  hasCriticalNonCompliant: boolean;
};

// ─── freezeRbiaScore ──────────────────────────────────────────────────────────

export async function freezeRbiaScore(input: unknown): Promise<
  ActionResult<{
    branchRbiaScoreId: string;
    compositeScore: number;
    ratingBand: string;
    issuedActionPoints: number;
    bmBatchId: string;
  }>
> {
  // ─── Auth ────────────────────────────────────────────────────────
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (!hasPermission(userRoles, "rbia:score_freeze")) {
    return {
      success: false,
      error: "You do not have permission to freeze RBIA scores.",
      code: "PERMISSION_DENIED",
    };
  }

  // ─── Validate ────────────────────────────────────────────────────
  const parsed = FreezeRbiaScoreSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: "VALIDATION_ERROR",
    };
  }
  const { engagementId } = parsed.data;

  const db = prismaForTenant(tenantId);

  try {
    // ─── Pre-transaction: quick engagement existence + state check ───
    // Loaded outside the transaction so we can bail early without locking.
    const engagementCheck = await db.auditEngagement.findFirst({
      where: { id: engagementId, tenantId },
      select: {
        id: true,
        branchId: true,
        status: true,
        branchRbiaScore: { select: { id: true, frozenAt: true } },
      },
    });

    if (!engagementCheck) {
      return {
        success: false,
        error: "Engagement not found.",
        code: "NOT_FOUND",
      };
    }

    // State guard: must be EXIT_MEETING or REPORT_DRAFT
    const validStates: EngagementStatus[] = ["EXIT_MEETING", "REPORT_DRAFT"];
    if (!validStates.includes(engagementCheck.status)) {
      return {
        success: false,
        error: `Cannot freeze score: engagement must be in EXIT_MEETING or REPORT_DRAFT state. Current: ${engagementCheck.status}`,
        code: "TRANSITION_BLOCKED",
      };
    }

    // Application-layer frozen guard (DB trigger is belt-and-suspenders)
    if (engagementCheck.branchRbiaScore?.frozenAt) {
      return {
        success: false,
        error: "RBIA score has already been frozen for this engagement.",
        code: "SCORE_FROZEN",
      };
    }

    if (!engagementCheck.branchId) {
      return {
        success: false,
        error: "Engagement has no associated branch — cannot freeze score.",
        code: "INTERNAL_ERROR",
      };
    }

    const branchId = engagementCheck.branchId;
    const currentStatus = engagementCheck.status;

    // ─── Step 1: Load ExaminationNode tree with responses ────────────
    // getExaminationTree uses its own Prisma client (not tx-aware);
    // this is a read-only operation so no atomicity concern here.
    const tree = await getExaminationTree(session, engagementId);

    // ─── Step 2: Build ScoredNode tree and compute scores ────────────

    // Full scored tree for the audit-trail JSONB snapshot
    const fullScoredTree: ScoredNode[] = tree.map(toScoredNode);

    // Collect module-level nodes (depth=1 → immediate children of the root)
    // The examination tree root is depth=0; modules live at depth=1.
    const moduleEntries: ModuleScoreEntry[] = [];
    const moduleWeights: Array<{ weight: number; score: number | null }> = [];

    for (const root of tree) {
      for (const moduleTreeNode of root.children) {
        const scoredModule = toScoredNode(moduleTreeNode);

        // computeNodeScore gives us hasCriticalNonCompliant propagated up
        const { hasCriticalNonCompliant } = computeNodeScore(scoredModule);

        // computeModuleScore applies the critical-item cap (ceiling at 0.5)
        const score = computeModuleScore(scoredModule);

        moduleEntries.push({
          moduleCode: moduleTreeNode.code,
          moduleName: moduleTreeNode.name,
          score,
          percentage: score !== null ? toPercentage(score) : null,
          ratingBand: score !== null ? getRatingBand(score) : null,
          hasCriticalNonCompliant,
        });

        moduleWeights.push({ weight: moduleTreeNode.weight, score });
      }
    }

    // Composite score across all modules (null if nothing scored yet)
    const compositeScore = computeCompositeScore(moduleWeights);

    if (compositeScore === null) {
      return {
        success: false,
        error:
          "Cannot freeze score: no examination items have been scored yet.",
        code: "TRANSITION_BLOCKED",
      };
    }

    const finalRatingBand = getRatingBand(compositeScore);

    // ─── Steps 3-5: Atomic write transaction ────────────────────────
    const deadline15d = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    const now = new Date();

    const txResult = await db.$transaction(async (tx: any) => {
      // Re-load engagement inside transaction for authoritative state
      const engagement = await tx.auditEngagement.findFirst({
        where: { id: engagementId, tenantId },
        select: {
          status: true,
          branchRbiaScore: { select: { id: true, frozenAt: true } },
          teamMembers: { select: { id: true } },
          meetings: { select: { meetingType: true, signedOff: true } },
        },
      });

      if (!engagement) {
        throw new Error("Engagement not found inside transaction.");
      }

      // Second frozen check inside tx (race condition guard)
      if (engagement.branchRbiaScore?.frozenAt) {
        throw Object.assign(new Error("SCORE_FROZEN"), { code: "SCORE_FROZEN" });
      }

      await setAuditContext(tx, {
        actionType: "rbia_score.frozen",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // ── Step 3: Write BranchRbiaScore snapshot ───────────────────
      const branchRbiaScore = await tx.branchRbiaScore.upsert({
        where: { engagementId },
        create: {
          tenantId,
          engagementId,
          branchId,
          compositeScore,
          ratingBand: finalRatingBand,
          moduleScores: moduleEntries,
          scoringTreeSnapshot: fullScoredTree,
          frozenAt: now,
          frozenById: session.user.id,
        },
        update: {
          compositeScore,
          ratingBand: finalRatingBand,
          moduleScores: moduleEntries,
          scoringTreeSnapshot: fullScoredTree,
          frozenAt: now,
          frozenById: session.user.id,
        },
        select: { id: true },
      });

      // ── Step 4: Issue all DRAFT ActionPoints ─────────────────────
      // Set bmResponseDeadline to 15 days (the response window for the BM).
      const updateResult = await tx.actionPoint.updateMany({
        where: {
          engagementId,
          tenantId,
          status: "DRAFT",
        },
        data: {
          status: "ISSUED",
          bmResponseDeadline: deadline15d,
        },
      });
      const issuedCount: number = updateResult.count;

      // ── Step 5: Create BmResponseBatch ───────────────────────────
      const bmBatch = await tx.bmResponseBatch.create({
        data: {
          tenantId,
          engagementId,
          totalActionPoints: issuedCount,
          respondedActionPoints: 0,
          deadline: deadline15d,
          status: "PENDING",
        },
        select: { id: true },
      });

      // ── Transition engagement to REPORT_DRAFT (inside tx) ────────
      // Only needed when coming from EXIT_MEETING; REPORT_DRAFT is a no-op.
      if (engagement.status === "EXIT_MEETING") {
        const ctx: EngagementContext = {
          teamMemberCount: engagement.teamMembers.length,
          hasOpeningMeeting: engagement.meetings.some(
            (m: { meetingType: string; signedOff: boolean }) =>
              m.meetingType === "OPENING" && m.signedOff,
          ),
          hasExitMeeting: engagement.meetings.some(
            (m: { meetingType: string; signedOff: boolean }) =>
              m.meetingType === "EXIT" && m.signedOff,
          ),
          hasFrozenScore: true, // we just froze it
        };

        const transitionResult = canTransitionEngagement(
          "EXIT_MEETING",
          "REPORT_DRAFT",
          userRoles,
          ctx,
        );

        if (transitionResult.allowed) {
          await tx.auditEngagement.update({
            where: { id: engagementId },
            data: { status: "REPORT_DRAFT" },
          });
        } else {
          // Log but don't fail the freeze — state transition is advisory here
          logger.warn(
            { engagementId, reason: transitionResult.reason },
            "rbia:freeze — could not auto-transition engagement to REPORT_DRAFT",
          );
        }
      }

      return {
        branchRbiaScoreId: branchRbiaScore.id as string,
        issuedCount,
        bmBatchId: bmBatch.id as string,
      };
    });

    revalidatePath(`/audit-execution/${engagementId}`);

    logger.info(
      {
        engagementId,
        branchRbiaScoreId: txResult.branchRbiaScoreId,
        compositeScore,
        ratingBand: finalRatingBand,
        issuedActionPoints: txResult.issuedCount,
        bmBatchId: txResult.bmBatchId,
        previousStatus: currentStatus,
      },
      "rbia:freeze — score snapshot created, APs issued, BM batch opened",
    );

    return {
      success: true,
      data: {
        branchRbiaScoreId: txResult.branchRbiaScoreId,
        compositeScore,
        ratingBand: finalRatingBand,
        issuedActionPoints: txResult.issuedCount,
        bmBatchId: txResult.bmBatchId,
      },
    };
  } catch (error: unknown) {
    // DB trigger rejection or in-tx SCORE_FROZEN throw
    if (
      error instanceof Error &&
      ((error as any).code === "SCORE_FROZEN" ||
        error.message === "SCORE_FROZEN" ||
        error.message.includes("SCORE_FROZEN"))
    ) {
      return {
        success: false,
        error: "RBIA score has already been frozen for this engagement.",
        code: "SCORE_FROZEN",
      };
    }

    logger.error({ engagementId, error }, "rbia:freeze — unexpected error");

    return {
      success: false,
      error: "An unexpected error occurred while freezing the RBIA score.",
      code: "INTERNAL_ERROR",
    };
  }
}
