"use server";

import { revalidatePath } from "next/cache";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { type Role } from "@/lib/permissions";
import {
  canTransition,
  type ObservationStatus,
  type Severity,
} from "@/lib/state-machine";
import { TransitionObservationSchema } from "./schemas";
import type { TransitionObservationInput } from "./schemas";
import { createNotification } from "@/data-access/notifications";

/**
 * Generic state transition action for observations (OBS-02 through OBS-06).
 *
 * Handles all 8 transitions (6 forward + 2 return) through the state machine.
 * Each transition:
 * 1. Validates auth and roles via canTransition()
 * 2. Uses optimistic locking (version field)
 * 3. Atomically updates status + creates timeline entry
 *
 * @returns { success, data?, error? } — never throws
 */
export async function transitionObservation(input: TransitionObservationInput) {
  // Step 1: Auth
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  // Step 2: Validate input
  const parsed = TransitionObservationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }

  const validated = parsed.data;
  const db = prismaForTenant(tenantId);

  try {
    // Fetch current observation with tenant scope (belt-and-suspenders)
    const observation = await db.observation.findFirst({
      where: {
        id: validated.observationId,
        tenantId,
      },
      select: {
        id: true,
        status: true,
        severity: true,
        version: true,
        createdById: true,
      },
    });

    if (!observation) {
      return {
        success: false as const,
        error: "Observation not found.",
      };
    }

    // Step 3: Validate transition via state machine
    const currentStatus = observation.status as ObservationStatus;
    const targetStatus = validated.targetStatus as ObservationStatus;
    const severity = observation.severity as Severity;

    const transitionResult = canTransition(
      currentStatus,
      targetStatus,
      userRoles,
      severity,
    );

    if (!transitionResult.allowed) {
      return {
        success: false as const,
        error: transitionResult.reason,
      };
    }

    // Step 4: Optimistic lock check
    if (observation.version !== validated.version) {
      return {
        success: false as const,
        error:
          "Observation was modified by another user. Please refresh and try again.",
      };
    }

    // Step 5: Atomic transaction — update status + create timeline entry
    await db.$transaction(async (tx: any) => {
      // Set audit context
      await setAuditContext(tx, {
        actionType: "observation.status_changed",
        justification: validated.comment,
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Build update data
      const updateData: Record<string, unknown> = {
        status: targetStatus,
        statusUpdatedAt: new Date(),
        version: { increment: 1 },
      };

      // If transitioning to RESPONSE, also update auditee response fields
      if (targetStatus === "RESPONSE") {
        if (validated.auditeeResponse) {
          updateData.auditeeResponse = validated.auditeeResponse;
        }
        if (validated.actionPlan) {
          updateData.actionPlan = validated.actionPlan;
        }
      }

      // Update observation with tenant scope
      await tx.observation.update({
        where: {
          id: validated.observationId,
          tenantId,
        },
        data: updateData,
      });

      // Create timeline entry
      await tx.observationTimeline.create({
        data: {
          observationId: validated.observationId,
          tenantId,
          event: "status_changed",
          oldValue: currentStatus,
          newValue: targetStatus,
          comment: validated.comment,
          createdById: session.user.id,
        },
      });
    });

    revalidatePath("/findings");
    revalidatePath(`/findings/${validated.observationId}`);

    // Queue notification when observation is issued (NOTF-01)
    if (targetStatus === "ISSUED") {
      try {
        const obs = await db.observation.findFirst({
          where: { id: validated.observationId, tenantId },
          select: {
            title: true,
            severity: true,
            assignedToId: true,
            dueDate: true,
            condition: true,
            branch: { select: { name: true } },
          },
        });
        if (obs?.assignedToId) {
          await createNotification(session, {
            recipientId: obs.assignedToId,
            type: "OBSERVATION_ASSIGNED",
            payload: {
              observationId: validated.observationId,
              observationTitle: obs.title,
              severity: obs.severity,
              branchName: obs.branch?.name ?? "",
              dueDate: obs.dueDate?.toISOString() ?? "",
              conditionExcerpt: (obs.condition ?? "").slice(0, 200),
            },
          });
        }
      } catch (e) {
        // Non-blocking: log but don't fail the transition
        console.error("Failed to queue assignment notification:", e);
      }
    }

    return {
      success: true as const,
      data: { id: validated.observationId, newStatus: targetStatus },
    };
  } catch (error) {
    console.error("Failed to transition observation:", error);
    return {
      success: false as const,
      error: "Failed to update observation status. Please try again.",
    };
  }
}
