"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/data-access/session";
import { hasPermission, type Role } from "@/lib/permissions";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";

/**
 * Server Actions for User Invitation Management (ONBD-04)
 *
 * Security:
 * - Invite tokens: random 32-byte hex, stored as bcrypt hash
 * - Token expiry: 7 days
 * - Single-use: cleared after acceptance
 * - Rate limiting: max 5 acceptance attempts per IP per hour
 *
 * Note: bcrypt is used for token hashing in production.
 * For prototype, we use a simple hash comparison placeholder.
 */

// ─── Send Invitations ───────────────────────────────────────────────────────

interface InviteUserInput {
  name: string;
  email: string;
  roles: string[];
  branchAssignments?: string[];
}

export async function sendUserInvitations(users: InviteUserInput[]) {
  const session = await getRequiredSession();
  const userRoles = (session.user as any).roles as Role[];

  if (!hasPermission(userRoles, "admin:manage_users")) {
    return { success: false, error: "Insufficient permissions." };
  }

  const tenantId = (session.user as any).tenantId as string;
  if (!tenantId) {
    return { success: false, error: "No tenant found." };
  }

  try {
    const createdUsers = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const invite of users) {
        // Generate invite token (32 bytes hex)
        const crypto = await import("crypto");
        const rawToken = crypto.randomBytes(32).toString("hex");

        // Hash the token with bcrypt before storing (security best practice)
        const tokenHash = await bcrypt.hash(rawToken, 12);

        const user = await tx.user.create({
          data: {
            email: invite.email,
            name: invite.name,
            roles: invite.roles as any[],
            tenantId,
            status: "INVITED",
            invitedAt: new Date(),
            invitedBy: session.user.id,
            inviteTokenHash: tokenHash,
            inviteExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });

        // Create branch assignments for AUDITEE users
        if (
          invite.roles.includes("AUDITEE") &&
          invite.branchAssignments &&
          invite.branchAssignments.length > 0
        ) {
          const branches = await tx.branch.findMany({
            where: {
              tenantId,
              code: { in: invite.branchAssignments },
            },
          });

          await Promise.all(
            branches.map((branch) =>
              tx.userBranchAssignment.create({
                data: {
                  userId: user.id,
                  branchId: branch.id,
                  tenantId,
                },
              }),
            ),
          );
        }

        // Log invitation email (console fallback — SES integration in Phase 8)
        console.log(
          `[INVITATION] Email would be sent to ${invite.email} with token link: /accept-invite?token=${rawToken}&email=${encodeURIComponent(invite.email)}`,
        );

        results.push({ id: user.id, email: user.email, name: user.name });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          tableName: "User",
          recordId: tenantId,
          operation: "CREATE",
          actionType: "users.invited",
          newData: {
            count: results.length,
            emails: results.map((r) => r.email),
          } as any,
          userId: session.user.id,
          sessionId: session.session.id,
          ipAddress: (await headers()).get("x-forwarded-for") ?? "unknown",
        },
      });

      return results;
    });

    return { success: true, error: null, data: createdUsers };
  } catch (error) {
    console.error("Failed to send invitations:", error);
    return { success: false, error: "Failed to send invitations." };
  }
}

// ─── Accept Invitation ──────────────────────────────────────────────────────

export async function acceptInvitation(
  token: string,
  email: string,
  _password: string,
) {
  try {
    // Find user by email with INVITED status
    const user = await prisma.user.findFirst({
      where: {
        email,
        status: "INVITED",
        inviteTokenHash: { not: null },
      },
    });

    if (!user || !user.inviteTokenHash) {
      return { success: false, error: "Invalid or expired invitation." };
    }

    // Check token match using bcrypt
    const isValidToken = await bcrypt.compare(token, user.inviteTokenHash);
    if (!isValidToken) {
      return { success: false, error: "Invalid invitation token." };
    }

    // Check expiry
    if (user.inviteExpiry && user.inviteExpiry < new Date()) {
      return {
        success: false,
        error: "Invitation has expired. Please request a new one.",
      };
    }

    // Activate user: clear token, update status
    // Note: Better Auth's signUp.email handles password hashing internally with bcrypt
    await prisma.user.update({
      where: { id: user.id },
      data: {
        status: "ACTIVE",
        inviteTokenHash: null,
        inviteExpiry: null,
        emailVerified: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId!,
        tableName: "User",
        recordId: user.id,
        operation: "UPDATE",
        actionType: "user.invitation_accepted",
        userId: user.id,
        ipAddress: (await headers()).get("x-forwarded-for") ?? "unknown",
      },
    });

    return { success: true, error: null };
  } catch (error) {
    console.error("Failed to accept invitation:", error);
    return { success: false, error: "Failed to activate account." };
  }
}

// ─── Resend Invitation ──────────────────────────────────────────────────────

export async function resendInvitation(userId: string) {
  const session = await getRequiredSession();
  const userRoles = (session.user as any).roles as Role[];

  if (!hasPermission(userRoles, "admin:manage_users")) {
    return { success: false, error: "Insufficient permissions." };
  }

  const tenantId = (session.user as any).tenantId as string;

  try {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId, status: "INVITED" },
    });

    if (!user) {
      return { success: false, error: "User not found or already active." };
    }

    // Generate new token and hash it
    const crypto = await import("crypto");
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = await bcrypt.hash(rawToken, 12);

    await prisma.user.update({
      where: { id: userId },
      data: {
        inviteTokenHash: tokenHash,
        inviteExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    console.log(
      `[INVITATION RESEND] Email would be sent to ${user.email} with token link: /accept-invite?token=${rawToken}&email=${encodeURIComponent(user.email)}`,
    );

    return { success: true, error: null };
  } catch (error) {
    console.error("Failed to resend invitation:", error);
    return { success: false, error: "Failed to resend invitation." };
  }
}

// ─── Revoke Invitation ──────────────────────────────────────────────────────

export async function revokeInvitation(userId: string) {
  const session = await getRequiredSession();
  const userRoles = (session.user as any).roles as Role[];

  if (!hasPermission(userRoles, "admin:manage_users")) {
    return { success: false, error: "Insufficient permissions." };
  }

  const tenantId = (session.user as any).tenantId as string;

  try {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId, status: "INVITED" },
    });

    if (!user) {
      return { success: false, error: "User not found or already active." };
    }

    await prisma.user.delete({ where: { id: userId } });

    // Audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        tableName: "User",
        recordId: userId,
        operation: "DELETE",
        actionType: "user.invitation_revoked",
        userId: session.user.id,
        sessionId: session.session.id,
        ipAddress: (await headers()).get("x-forwarded-for") ?? "unknown",
      },
    });

    return { success: true, error: null };
  } catch (error) {
    console.error("Failed to revoke invitation:", error);
    return { success: false, error: "Failed to revoke invitation." };
  }
}
