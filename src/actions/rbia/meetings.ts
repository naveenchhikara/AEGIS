"use server";

import { revalidatePath } from "next/cache";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import {
  canTransitionEngagement,
  type EngagementContext,
} from "@/lib/engagement-state-machine";
import type { EngagementStatus } from "@/generated/prisma/enums";
import {
  RecordMeetingSchema,
  SignOffMeetingSchema,
  type ActionResult,
} from "./schemas";

// ─── recordMeeting ────────────────────────────────────────────────────────────

/**
 * Record (create or update) an OPENING or EXIT meeting for an engagement.
 *
 * ATOMIC: Upserts the EngagementMeeting record AND transitions the engagement
 * status in a single DB transaction to prevent partial state.
 *
 * Status transitions driven by meeting type:
 *   OPENING → OPENING_MEETING (from TEAM_ASSIGNED)
 *   EXIT    → EXIT_MEETING    (from IN_PROGRESS)
 *
 * Security: Requires audit_execution:manage_team permission.
 * Validation: Uses RecordMeetingSchema + canTransitionEngagement state machine.
 */
export async function recordMeeting(
  input: unknown,
): Promise<ActionResult<{ meetingId: string; engagementStatus: string }>> {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (!hasPermission(userRoles, "audit_execution:manage_team")) {
    return {
      success: false,
      error: "You do not have permission to record meetings.",
      code: "PERMISSION_DENIED",
    };
  }

  const parsed = RecordMeetingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: "VALIDATION_ERROR",
    };
  }

  const {
    engagementId,
    meetingType,
    meetingDate,
    attendees,
    minutesText,
    keyDiscussionPoints,
  } = parsed.data;

  // Determine the target engagement status based on meeting type
  const targetStatus: EngagementStatus =
    meetingType === "OPENING" ? "OPENING_MEETING" : "EXIT_MEETING";

  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx: any) => {
      // Load engagement with all prerequisite data for the state machine
      const engagement = await tx.auditEngagement.findFirst({
        where: { id: engagementId, tenantId },
        select: {
          id: true,
          status: true,
          teamMembers: { select: { id: true } },
          meetings: { select: { meetingType: true, signedOff: true } },
          branchRbiaScore: { select: { frozenAt: true } },
        },
      });

      if (!engagement) {
        throw new Error("Engagement not found");
      }

      // Build engagement context for the state machine
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
        hasFrozenScore:
          engagement.branchRbiaScore !== null &&
          engagement.branchRbiaScore?.frozenAt !== null,
      };

      // Validate the status transition via the state machine
      // Skip validation if the engagement is already in the target status
      // (re-recording a meeting after the status was already advanced)
      if (engagement.status !== targetStatus) {
        const transitionResult = canTransitionEngagement(
          engagement.status,
          targetStatus,
          userRoles,
          ctx,
        );

        if (!transitionResult.allowed) {
          throw new Error(transitionResult.reason);
        }
      }

      // Set audit context for trail logging
      await setAuditContext(tx, {
        actionType: "engagement.meeting_recorded",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Upsert the meeting record (compound unique: engagementId + meetingType)
      const meeting = await tx.engagementMeeting.upsert({
        where: {
          engagementId_meetingType: { engagementId, meetingType },
        },
        create: {
          tenantId,
          engagementId,
          meetingType,
          meetingDate: new Date(meetingDate),
          attendees: attendees as any, // JSONB — typed at DAL boundary
          minutesText,
          keyDiscussionPoints,
          signedOff: false,
        },
        update: {
          meetingDate: new Date(meetingDate),
          attendees: attendees as any, // JSONB — typed at DAL boundary
          minutesText,
          keyDiscussionPoints,
          // signedOff intentionally excluded — only sign-off action may set it
        },
      });

      // Advance the engagement status if not already at target
      let updatedStatus = engagement.status as string;
      if (engagement.status !== targetStatus) {
        const updated = await tx.auditEngagement.update({
          where: { id: engagementId },
          data: { status: targetStatus },
          select: { status: true },
        });
        updatedStatus = updated.status;
      }

      return { meeting, engagementStatus: updatedStatus };
    });

    revalidatePath("/audit-execution");
    revalidatePath(`/audit-execution/${engagementId}`);

    return {
      success: true,
      data: {
        meetingId: result.meeting.id,
        engagementStatus: result.engagementStatus,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to record meeting.";
    logger.error(
      { error, action: "record_meeting", tenantId, engagementId, meetingType },
      message,
    );
    return { success: false, error: message, code: "INTERNAL_ERROR" };
  }
}

// ─── signOffMeeting ───────────────────────────────────────────────────────────

/**
 * Sign off an existing meeting record.
 *
 * Sign-off is a prerequisite for the next engagement status transition:
 *   - Opening meeting sign-off unlocks transition to IN_PROGRESS
 *   - Exit meeting sign-off unlocks transition to REPORT_DRAFT
 *
 * The state machine enforces these prerequisites in canTransitionEngagement
 * by checking hasOpeningMeeting / hasExitMeeting (both require signedOff=true).
 *
 * Security: Requires audit_execution:manage_team permission.
 * Idempotent: Re-signing off an already signed-off meeting is a no-op success.
 */
export async function signOffMeeting(
  input: unknown,
): Promise<ActionResult<{ meetingId: string; signedOffAt: string }>> {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (!hasPermission(userRoles, "audit_execution:manage_team")) {
    return {
      success: false,
      error: "You do not have permission to sign off meetings.",
      code: "PERMISSION_DENIED",
    };
  }

  const parsed = SignOffMeetingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: "VALIDATION_ERROR",
    };
  }

  const { engagementId, meetingType } = parsed.data;
  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx: any) => {
      // Verify the meeting exists and belongs to the correct tenant
      const existing = await tx.engagementMeeting.findUnique({
        where: {
          engagementId_meetingType: { engagementId, meetingType },
        },
        select: {
          id: true,
          tenantId: true,
          signedOff: true,
          signedOffAt: true,
        },
      });

      if (!existing) {
        throw new Error(
          `No ${meetingType.toLowerCase()} meeting found for this engagement. Record the meeting first.`,
        );
      }

      // Belt-and-suspenders: tenant isolation check
      if (existing.tenantId !== tenantId) {
        throw new Error("Engagement not found");
      }

      // Idempotent: already signed off — return current values
      if (existing.signedOff) {
        return {
          id: existing.id,
          signedOffAt: existing.signedOffAt as Date,
        };
      }

      // Set audit context for trail logging
      await setAuditContext(tx, {
        actionType: "engagement.meeting_signed_off",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      const now = new Date();
      const updated = await tx.engagementMeeting.update({
        where: { id: existing.id },
        data: {
          signedOff: true,
          signedOffById: session.user.id,
          signedOffAt: now,
        },
        select: { id: true, signedOffAt: true },
      });

      return updated;
    });

    revalidatePath("/audit-execution");
    revalidatePath(`/audit-execution/${engagementId}`);

    return {
      success: true,
      data: {
        meetingId: result.id,
        signedOffAt: (result.signedOffAt as Date).toISOString(),
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to sign off meeting.";
    logger.error(
      {
        error,
        action: "sign_off_meeting",
        tenantId,
        engagementId,
        meetingType,
      },
      message,
    );
    return { success: false, error: message, code: "INTERNAL_ERROR" };
  }
}
