"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getRequiredSession } from "@/data-access/session";
import {
  completeOnboardingTransaction,
  saveOnboardingProgress,
  getOnboardingProgressFromDb,
  type OnboardingCompletionData,
} from "@/data-access/onboarding";
import { checklistItems } from "@/data/rbi-master-directions";

/**
 * Server Actions for the Onboarding Wizard
 *
 * Actions:
 * - saveWizardStep: Save wizard step data to OnboardingProgress
 * - getWizardProgress: Retrieve saved wizard state
 * - completeOnboarding: Atomic completion (tenant + compliance + users)
 */

// ─── Save Wizard Step ───────────────────────────────────────────────────────

export async function saveWizardStep(
  step: number,
  data: Record<string, unknown>,
) {
  const session = await getRequiredSession();
  const tenantId = (session.user as any).tenantId as string;

  if (!tenantId) {
    return { success: false, error: "No tenant associated with this user." };
  }

  try {
    await saveOnboardingProgress(tenantId, step, data);
    return { success: true, error: null };
  } catch (error) {
    console.error("Failed to save onboarding step:", error);
    return { success: false, error: "Failed to save progress." };
  }
}

// ─── Get Wizard Progress ────────────────────────────────────────────────────

export async function getWizardProgress() {
  const session = await getRequiredSession();
  const tenantId = (session.user as any).tenantId as string;

  if (!tenantId) {
    return { success: false, data: null, error: "No tenant found." };
  }

  try {
    const progress = await getOnboardingProgressFromDb(tenantId);
    return { success: true, data: progress, error: null };
  } catch (error) {
    console.error("Failed to get onboarding progress:", error);
    return { success: false, data: null, error: "Failed to load progress." };
  }
}

// ─── Complete Onboarding ────────────────────────────────────────────────────

interface CompleteOnboardingInput {
  bankRegistration: OnboardingCompletionData["bankRegistration"];
  tierSelection: OnboardingCompletionData["tierSelection"];
  selectedDirections: {
    masterDirectionId: string;
    selected: boolean;
    items: {
      itemCode: string;
      selected: boolean;
      notApplicable: boolean;
      notApplicableReason?: string;
    }[];
  }[];
  departments: OnboardingCompletionData["departments"];
  branches: OnboardingCompletionData["branches"];
  invitedUsers: OnboardingCompletionData["invitedUsers"];
}

export async function completeOnboarding(input: CompleteOnboardingInput) {
  const session = await getRequiredSession();
  const tenantId = (session.user as any).tenantId as string;

  if (!tenantId) {
    return { success: false, error: "No tenant associated with this user." };
  }

  try {
    // Build selected items list from directions
    const selectedItems: OnboardingCompletionData["selectedItems"] = [];

    for (const dir of input.selectedDirections) {
      if (!dir.selected) continue;
      for (const item of dir.items) {
        if (item.notApplicable) {
          selectedItems.push({
            itemCode: item.itemCode,
            notApplicableReason: item.notApplicableReason,
          });
        } else if (item.selected) {
          // Enrich with checklist item data
          const template = checklistItems.find(
            (ci) => ci.itemCode === item.itemCode,
          );
          if (template) {
            selectedItems.push({ itemCode: item.itemCode });
          }
        }
      }
    }

    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") ?? "unknown";

    const completionData: OnboardingCompletionData = {
      tenantId,
      bankRegistration: input.bankRegistration,
      tierSelection: input.tierSelection,
      selectedItems,
      departments: input.departments,
      branches: input.branches,
      invitedUsers: input.invitedUsers,
      userId: session.user.id,
      sessionId: session.session.id,
      ipAddress,
    };

    const result = await completeOnboardingTransaction(completionData);

    revalidatePath("/dashboard");
    revalidatePath("/compliance");

    return {
      success: true,
      error: null,
      data: result,
    };
  } catch (error) {
    console.error("Failed to complete onboarding:", error);
    return {
      success: false,
      error: "Failed to complete onboarding. Please try again.",
    };
  }
}
