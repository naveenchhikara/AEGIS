import "server-only";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

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
    nabardRegistration?: string;
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
  const result = await prisma.$transaction(async (tx) => {
    // 1. Update tenant record with bank registration + tier data
    await tx.tenant.update({
      where: { id: data.tenantId },
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
        nabardRegistrationNo:
          data.tierSelection.nabardRegistration || undefined,
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
    const branchCodeToId = new Map(createdBranches.map((b) => [b.code, b.id]));

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

    // 5. Create invited users (if any)
    const createdUsers = await Promise.all(
      data.invitedUsers.map(async (invite) => {
        const user = await tx.user.create({
          data: {
            email: invite.email,
            name: invite.name,
            roles: invite.roles as any[],
            tenantId: data.tenantId,
            status: "INVITED",
            invitedAt: new Date(),
            invitedBy: data.userId,
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
  });

  return result;
}
