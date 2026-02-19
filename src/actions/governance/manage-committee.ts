"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";

/**
 * Schema for committee management (R85).
 */
const ManageCommitteeSchema = z.object({
  committeeId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

const ManageCommitteeMemberSchema = z.object({
  committeeId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["CHAIRMAN", "MEMBER", "SECRETARY", "INVITEE"]),
});

const ManageCommitteeMeetingSchema = z.object({
  meetingId: z.string().uuid().optional(),
  committeeId: z.string().uuid(),
  meetingDate: z.coerce.date(),
  agendaItems: z
    .array(
      z.object({
        title: z.string(),
        description: z.string().optional(),
      }),
    )
    .optional(),
  minutesRef: z.string().optional(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).optional(),
  attendees: z.array(z.string().uuid()).optional(),
});

type ManageCommitteeInput = z.infer<typeof ManageCommitteeSchema>;
type ManageCommitteeMemberInput = z.infer<typeof ManageCommitteeMemberSchema>;
type ManageCommitteeMeetingInput = z.infer<typeof ManageCommitteeMeetingSchema>;

/**
 * Create or update committee (R85).
 * Security: Requires committee:manage permission.
 */
export async function manageCommittee(input: ManageCommitteeInput) {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (!hasPermission(userRoles, "committee:manage")) {
    return {
      success: false as const,
      error: "You do not have permission to manage committees.",
    };
  }

  const parsed = ManageCommitteeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: parsed.data.committeeId
          ? "governance.committee_updated"
          : "governance.committee_created",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      if (parsed.data.committeeId) {
        const updated = await tx.committee.update({
          where: { id: parsed.data.committeeId },
          data: {
            name: parsed.data.name,
            description: parsed.data.description,
            isActive: parsed.data.isActive,
          },
        });
        return updated;
      } else {
        const created = await tx.committee.create({
          data: {
            tenantId,
            name: parsed.data.name,
            description: parsed.data.description,
            isActive: parsed.data.isActive ?? true,
          },
        });
        return created;
      }
    });

    revalidatePath("/governance/committees");

    return {
      success: true as const,
      data: { id: result.id, name: result.name },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to manage committee.";
    logger.error({ error, action: "manage_committee", tenantId }, message);
    return { success: false as const, error: message };
  }
}

/**
 * Add or update committee member (R85).
 */
export async function manageCommitteeMember(input: ManageCommitteeMemberInput) {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (!hasPermission(userRoles, "committee:manage")) {
    return {
      success: false as const,
      error: "You do not have permission to manage committee members.",
    };
  }

  const parsed = ManageCommitteeMemberSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "governance.committee_member_added",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      const member = await tx.committeeMember.upsert({
        where: {
          committeeId_userId: {
            committeeId: parsed.data.committeeId,
            userId: parsed.data.userId,
          },
        },
        create: {
          committeeId: parsed.data.committeeId,
          userId: parsed.data.userId,
          role: parsed.data.role,
        },
        update: {
          role: parsed.data.role,
        },
      });

      return member;
    });

    revalidatePath("/governance/committees");
    revalidatePath(`/governance/committees/${parsed.data.committeeId}`);

    return {
      success: true as const,
      data: { id: result.id },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to manage committee member.";
    logger.error(
      { error, action: "manage_committee_member", tenantId },
      message,
    );
    return { success: false as const, error: message };
  }
}

/**
 * Remove committee member.
 */
export async function removeCommitteeMember(memberId: string) {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (!hasPermission(userRoles, "committee:manage")) {
    return {
      success: false as const,
      error: "You do not have permission to remove committee members.",
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "governance.committee_member_removed",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      await tx.committeeMember.delete({
        where: { id: memberId },
      });
    });

    revalidatePath("/governance/committees");

    return {
      success: true as const,
      data: { deleted: true },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to remove committee member.";
    logger.error(
      { error, action: "remove_committee_member", tenantId },
      message,
    );
    return { success: false as const, error: message };
  }
}

/**
 * Create or update committee meeting (R85).
 */
export async function manageCommitteeMeeting(
  input: ManageCommitteeMeetingInput,
) {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (!hasPermission(userRoles, "committee:manage")) {
    return {
      success: false as const,
      error: "You do not have permission to manage committee meetings.",
    };
  }

  const parsed = ManageCommitteeMeetingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: parsed.data.meetingId
          ? "governance.meeting_updated"
          : "governance.meeting_created",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      if (parsed.data.meetingId) {
        const updated = await tx.committeeMeeting.update({
          where: { id: parsed.data.meetingId },
          data: {
            meetingDate: parsed.data.meetingDate,
            agendaItems: parsed.data.agendaItems,
            minutesRef: parsed.data.minutesRef,
            status: parsed.data.status,
            attendees: parsed.data.attendees,
          },
        });
        return updated;
      } else {
        const created = await tx.committeeMeeting.create({
          data: {
            tenantId,
            committeeId: parsed.data.committeeId,
            meetingDate: parsed.data.meetingDate,
            agendaItems: parsed.data.agendaItems,
            status: parsed.data.status || "SCHEDULED",
            attendees: parsed.data.attendees || [],
          },
        });
        return created;
      }
    });

    revalidatePath("/governance/committees");
    revalidatePath(`/governance/committees/${parsed.data.committeeId}`);

    return {
      success: true as const,
      data: { id: result.id },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to manage committee meeting.";
    logger.error(
      { error, action: "manage_committee_meeting", tenantId },
      message,
    );
    return { success: false as const, error: message };
  }
}
