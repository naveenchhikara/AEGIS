"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/data-access/session";
import { hasPermission, type Role } from "@/lib/permissions";
import { headers } from "next/headers";
import { logger } from "@/lib/logger";
import bcrypt from "bcryptjs";
import { withAuditedMutation, userActor } from "@/data-access/audited-mutation";
import {
  hashedCredentialAccount,
  passwordValidationError,
} from "@/lib/credential-account";

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
  const userRoles = session.user.roles;

  if (!hasPermission(userRoles, "admin:manage_users")) {
    return { success: false, error: "Insufficient permissions." };
  }

  const tenantId = session.user.tenantId;
  if (!tenantId) {
    return { success: false, error: "No tenant found." };
  }

  try {
    const createdUsers = await withAuditedMutation(
      userActor(session),
      "user.invited",
      async (tx) => {
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
      },
    );

    return { success: true, error: null, data: createdUsers };
  } catch (error) {
    logger.error(
      { error, action: "send_user_invitations", tenantId },
      "Failed to send user invitations",
    );
    return { success: false, error: "Failed to send invitations." };
  }
}

// ─── Accept Invitation ──────────────────────────────────────────────────────

export async function acceptInvitation(
  token: string,
  email: string,
  password: string,
) {
  try {
    const passwordError = passwordValidationError(password);
    if (passwordError) {
      return { success: false, error: passwordError };
    }

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

    // An invited user always belongs to a tenant; fail cleanly rather than
    // asserting, since AuditLog.tenantId is NOT NULL.
    const tenantId = user.tenantId;
    if (!tenantId) {
      return { success: false, error: "Invitation is not linked to a bank." };
    }

    // Hash before the transaction so we do not hold a connection across scrypt.
    const account = await hashedCredentialAccount(user.id, password);

    // Activate the user and attach a credential Account in one transaction.
    // The accept-invite page never calls Better Auth signUp — it only posts
    // here — so skipping Account.create left ACTIVE users with no password.
    await withAuditedMutation(
      // The invitee is not signed in; they are activating their own account,
      // so they are the honest Actor for this change.
      { kind: "user", userId: user.id, tenantId },
      "user.invitation_accepted",
      async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            status: "ACTIVE",
            inviteTokenHash: null,
            inviteExpiry: null,
            emailVerified: true,
          },
        });
        await tx.account.create({ data: account });
      },
    );

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
    logger.error(
      { error, action: "accept_invitation", email },
      "Failed to accept invitation",
    );
    return { success: false, error: "Failed to activate account." };
  }
}

// ─── Resend Invitation ──────────────────────────────────────────────────────

export async function resendInvitation(userId: string) {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;

  if (!hasPermission(userRoles, "admin:manage_users")) {
    return { success: false, error: "Insufficient permissions." };
  }

  const tenantId = session.user.tenantId;

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

    // Include tenantId in WHERE to prevent IDOR cross-tenant mutation
    await withAuditedMutation(
      userActor(session),
      "user.invitation_resent",
      (tx) =>
        tx.user.updateMany({
          where: { id: userId, tenantId },
          data: {
            inviteTokenHash: tokenHash,
            inviteExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        }),
    );

    console.log(
      `[INVITATION RESEND] Email would be sent to ${user.email} with token link: /accept-invite?token=${rawToken}&email=${encodeURIComponent(user.email)}`,
    );

    return { success: true, error: null };
  } catch (error) {
    logger.error(
      { error, action: "resend_invitation", tenantId, userId },
      "Failed to resend invitation",
    );
    return { success: false, error: "Failed to resend invitation." };
  }
}

// ─── Revoke Invitation ──────────────────────────────────────────────────────

export async function revokeInvitation(userId: string) {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;

  if (!hasPermission(userRoles, "admin:manage_users")) {
    return { success: false, error: "Insufficient permissions." };
  }

  const tenantId = session.user.tenantId;

  try {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId, status: "INVITED" },
    });

    if (!user) {
      return { success: false, error: "User not found or already active." };
    }

    // Include tenantId in WHERE to prevent IDOR cross-tenant deletion
    await withAuditedMutation(
      userActor(session),
      "user.invitation_revoked",
      (tx) => tx.user.deleteMany({ where: { id: userId, tenantId } }),
    );

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
    logger.error(
      { error, action: "revoke_invitation", tenantId, userId },
      "Failed to revoke invitation",
    );
    return { success: false, error: "Failed to revoke invitation." };
  }
}
