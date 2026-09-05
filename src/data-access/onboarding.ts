import "server-only";

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { withAuditedMutation } from "./audited-mutation";
import { sendInvitationEmail } from "@/lib/invitation-mailer";

/**
 * Onboarding Data Access Layer
 *
 * Handles all database operations for the onboarding wizard.
 * The completion flow runs in a single $transaction for atomicity.
 *
 * DAL pattern:
 * - tenantId from session only (Skeptic S2)
 * - Explicit WHERE tenantId (belt-and-suspenders, Skeptic S1)
 * - Runtime assertions on returned data
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OnboardingCompletionData {
  tenantId: string;
  bankRegistration: {
    bankName: string;
    shortName: string;
    rbiLicenseNumber: string;
    state: string;
    city: string;
    registrationNo: string;
    registeredWith: string;
    ucbType: string;
    scheduledDate?: string;
    establishedDate: string;
    pan: string;
    cin?: string;
  };
  tierSelection: {
    tier: string;
    depositAmount?: number;
    multiStateLicense: boolean;
    lastDakshScore?: number;
    pcaStatus: string;
    lastRbiInspectionDate?: string;
  };
  selectedItems: {
    itemCode: string;
    notApplicableReason?: string;
  }[];
  departments: {
    name: string;
    code: string;
    headName: string;
    headEmail: string;
  }[];
  branches: {
    name: string;
    code: string;
    city: string;
    state: string;
    type: string;
    managerName: string;
    managerEmail: string;
  }[];
  invitedUsers: {
    name: string;
    email: string;
    roles: string[];
    branchAssignments: string[];
  }[];
  userId: string;
  sessionId: string;
  ipAddress: string;
}

export interface CompletionResult {
  tenantId: string;
  complianceCount: number;
  departmentCount: number;
  branchCount: number;
  invitedUserCount: number;
}

// ─── Save/Load Wizard Progress ──────────────────────────────────────────────

export async function saveOnboardingProgress(
  tenantId: string,
  step: number,
  stepData: Record<string, unknown>,
) {
  return prisma.onboardingProgress.upsert({
    where: { tenantId },
    create: {
      tenantId,
      currentStep: step,
      completedSteps: [step],
      stepData: stepData as Prisma.InputJsonValue,
      status: "in_progress",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    update: {
      currentStep: step,
      completedSteps: { push: step },
      stepData: stepData as Prisma.InputJsonValue,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
}

export async function getOnboardingProgressFromDb(tenantId: string) {
  return prisma.onboardingProgress.findUnique({
    where: { tenantId },
  });
}

// ─── Atomic Onboarding Completion ───────────────────────────────────────────

export async function completeOnboardingTransaction(
  data: OnboardingCompletionData,
): Promise<CompletionResult> {
  // Onboarding mints the tenant's first users. Like the standalone invite flow,
  // each needs an activation token so they can set a password — without one the
  // wizard would create users who can never log in. Hash the tokens up front
  // (bcrypt cost 12) so that work does not run while the transaction holds a DB
  // connection, and reuse the raw tokens for the post-commit emails.
  const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const preparedInvites = await Promise.all(
    data.invitedUsers.map(async (invite) => {
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = await bcrypt.hash(rawToken, 12);
      return { invite, rawToken, tokenHash };
    }),
  );

  // Every table touched below carries audit_trigger, so the whole onboarding
  // must run inside a session context — without it the first tenant.update
  // aborts and no bank can be onboarded at all.
  const result = await withAuditedMutation(
    {
      kind: "user",
      userId: data.userId,
      tenantId: data.tenantId,
      ipAddress: data.ipAddress,
      sessionId: data.sessionId,
    },
    "onboarding.completed",
    async (tx) => {
      // 1. Update the tenant, and use the update itself as the atomic replay
      // guard. Onboarding mints users and overwrites the bank profile, so it may
      // run at most once. The `onboardingCompleted: false` predicate means a
      // second concurrent completion matches zero rows; the count check below
      // then aborts the whole transaction, rolling back its user creation,
      // rather than both racers committing (a plain read-then-write would let
      // both observe false and proceed).
      const tenantUpdate = await tx.tenant.updateMany({
        where: { id: data.tenantId, onboardingCompleted: false },
        data: {
          name: data.bankRegistration.bankName,
          shortName: data.bankRegistration.shortName,
          rbiLicenseNo: data.bankRegistration.rbiLicenseNumber,
          state: data.bankRegistration.state,
          city: data.bankRegistration.city,
          registrationNo: data.bankRegistration.registrationNo,
          registeredWith: data.bankRegistration.registeredWith,
          scheduledBankStatus: data.bankRegistration.ucbType === "SCHEDULED",
          established: data.bankRegistration.establishedDate
            ? new Date(data.bankRegistration.establishedDate)
            : undefined,
          pan: data.bankRegistration.pan,
          cin: data.bankRegistration.cin || undefined,
          tier: data.tierSelection.tier as any,
          multiStateLicense: data.tierSelection.multiStateLicense,
          dakshScore: data.tierSelection.lastDakshScore
            ? new Prisma.Decimal(data.tierSelection.lastDakshScore)
            : undefined,
          pcaStatus: data.tierSelection.pcaStatus as any,
          lastRbiInspectionDate: data.tierSelection.lastRbiInspectionDate
            ? new Date(data.tierSelection.lastRbiInspectionDate)
            : undefined,
          onboardingCompleted: true,
          onboardingCompletedAt: new Date(),
        },
      });
      if (tenantUpdate.count !== 1) {
        throw new Error(
          "Onboarding has already been completed for this tenant.",
        );
      }

      // 2. Create departments (as AuditArea records)
      // AuditArea schema has: name, description, riskCategory
      // Store department metadata in description field
      const createdDepts = await Promise.all(
        data.departments.map((dept) =>
          tx.auditArea.create({
            data: {
              tenantId: data.tenantId,
              name: dept.name,
              description: `Code: ${dept.code} | Head: ${dept.headName} (${dept.headEmail})`,
            },
          }),
        ),
      );

      // 3. Create branches
      const createdBranches = await Promise.all(
        data.branches.map((branch) =>
          tx.branch.create({
            data: {
              tenantId: data.tenantId,
              name: branch.name,
              code: branch.code,
              city: branch.city,
              state: branch.state,
              type: branch.type,
            },
          }),
        ),
      );

      // Build branch code → ID map for user assignments
      const branchCodeToId = new Map(
        createdBranches.map((b) => [b.code, b.id]),
      );

      // 4. Seed compliance registry from selected checklist items
      const ninety_days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      const complianceRecords = await Promise.all(
        data.selectedItems.map((item) =>
          tx.complianceRequirement.create({
            data: {
              tenantId: data.tenantId,
              requirement: item.itemCode, // Will be enriched from template
              category: "RBI Compliance",
              status: "PENDING",
              sourceItemCode: item.itemCode,
              isCustom: false,
              notApplicableReason: item.notApplicableReason || null,
              nextReviewDate: ninety_days,
            },
          }),
        ),
      );

      // 5. Create invited users (if any), each with an activation token so the
      // wizard's invitees can accept exactly like standalone invites.
      const createdUsers = await Promise.all(
        preparedInvites.map(async ({ invite, tokenHash }) => {
          const user = await tx.user.create({
            data: {
              email: invite.email,
              name: invite.name,
              roles: invite.roles as any[],
              tenantId: data.tenantId,
              status: "INVITED",
              invitedAt: new Date(),
              invitedBy: data.userId,
              inviteTokenHash: tokenHash,
              inviteExpiry,
            },
          });

          // 6. Create branch assignments for AUDITEE users
          if (
            invite.roles.includes("AUDITEE") &&
            invite.branchAssignments.length > 0
          ) {
            await Promise.all(
              invite.branchAssignments.map((branchCode) => {
                const branchId = branchCodeToId.get(branchCode);
                if (branchId) {
                  return tx.userBranchAssignment.create({
                    data: {
                      userId: user.id,
                      branchId,
                      tenantId: data.tenantId,
                    },
                  });
                }
              }),
            );
          }

          return user;
        }),
      );

      // 7. Create audit log entries
      await tx.auditLog.create({
        data: {
          tenantId: data.tenantId,
          tableName: "Tenant",
          recordId: data.tenantId,
          operation: "UPDATE",
          actionType: "onboarding.completed",
          newData: {
            departments: createdDepts.length,
            branches: createdBranches.length,
            complianceItems: complianceRecords.length,
            invitedUsers: createdUsers.length,
          } as Prisma.InputJsonValue,
          userId: data.userId,
          ipAddress: data.ipAddress,
          sessionId: data.sessionId,
        },
      });

      // 8. Delete onboarding progress record
      await tx.onboardingProgress
        .delete({
          where: { tenantId: data.tenantId },
        })
        .catch(() => {
          // Ignore if no progress record exists
        });

      return {
        tenantId: data.tenantId,
        complianceCount: complianceRecords.length,
        departmentCount: createdDepts.length,
        branchCount: createdBranches.length,
        invitedUserCount: createdUsers.length,
      };
    },
  );

  // Deliver activation emails after the transaction commits: SES is network I/O
  // and a delivery failure must not roll back the completed onboarding. The
  // mailer never throws and logs failures, so an unconfigured SES leaves the
  // invitees in place to be re-sent from the admin users screen.
  if (preparedInvites.length > 0) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: data.tenantId },
      select: { shortName: true },
    });
    const bankName = tenant?.shortName ?? "AEGIS";

    for (const { invite, rawToken } of preparedInvites) {
      await sendInvitationEmail({
        to: invite.email,
        inviteeName: invite.name,
        bankName,
        rawToken,
        expiresAt: inviteExpiry,
      });
    }
  }

  return result;
}
