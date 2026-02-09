"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/stores/onboarding-store";
import type { OnboardingStep } from "@/types/onboarding";
import { STEP_SCHEMAS } from "@/lib/onboarding-validation";
import { StepIndicator } from "./step-indicator";
import { StepNavigation } from "./step-navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ─── Props ──────────────────────────────────────────────────────────────────

interface OnboardingWizardProps {
  tenantId: string | null;
  userName: string;
}

// ─── Step data extraction for validation ────────────────────────────────────

function getStepData(
  step: OnboardingStep,
  store: ReturnType<typeof useOnboardingStore.getState>,
) {
  switch (step) {
    case 1:
      return store.bankRegistration ?? {};
    case 2:
      return store.tierSelection ?? {};
    case 3:
      return { selectedDirections: store.selectedDirections };
    case 4:
      return store.orgStructure ?? { departments: [], branches: [] };
    case 5:
      return { userInvites: store.userInvites };
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function OnboardingWizard({
  tenantId,
  userName,
}: OnboardingWizardProps) {
  const router = useRouter();
  const store = useOnboardingStore();
  const [showResume, setShowResume] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Check for expired or resumable state on mount
  useEffect(() => {
    if (store.isExpired()) {
      store.reset();
      return;
    }
    if (store.hasProgress() && store.currentStep > 1) {
      setShowResume(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Navigation handlers ──────────────────────────────────────────────

  const handleNext = useCallback(async () => {
    setIsValidating(true);
    setValidationErrors([]);

    try {
      const schema = STEP_SCHEMAS[store.currentStep];
      const data = getStepData(store.currentStep, store);
      const result = schema.safeParse(data);

      if (!result.success) {
        const errors = result.error.issues.map((i) => i.message);
        setValidationErrors(errors);
        return;
      }

      store.markStepComplete(store.currentStep);

      if (store.currentStep < 5) {
        store.setStep((store.currentStep + 1) as OnboardingStep);
      }
      // Step 5 completion is handled by the completion flow (10-07)
    } finally {
      setIsValidating(false);
    }
  }, [store]);

  const handleBack = useCallback(() => {
    setValidationErrors([]);
    if (store.currentStep > 1) {
      store.setStep((store.currentStep - 1) as OnboardingStep);
    }
  }, [store]);

  const handleSaveAndExit = useCallback(() => {
    // State is automatically persisted via Zustand localStorage middleware
    // Future: POST to server to sync OnboardingProgress record
    router.push("/dashboard");
  }, [router]);

  const handleResume = useCallback(() => {
    setShowResume(false);
  }, []);

  const handleStartFresh = useCallback(() => {
    store.reset();
    setShowResume(false);
  }, [store]);

  // ─── Resume detection prompt ──────────────────────────────────────────

  if (showResume) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Resume Onboarding?</CardTitle>
          <CardDescription>
            You have an onboarding session in progress (Step {store.currentStep}{" "}
            of 5).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={handleResume} className="flex-1">
            Resume where I left off
          </Button>
          <Button
            variant="outline"
            onClick={handleStartFresh}
            className="flex-1"
          >
            Start fresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ─── Welcome screen (first visit) ────────────────────────────────────

  if (store.currentStep === 1 && !store.hasProgress()) {
    return (
      <div className="space-y-6">
        <Card className="mx-auto max-w-lg">
          <CardHeader>
            <CardTitle>Welcome to AEGIS, {userName}!</CardTitle>
            <CardDescription>
              Let&apos;s set up your bank&apos;s audit management system. This
              wizard will guide you through 5 steps.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-muted-foreground space-y-2 text-sm">
              <p>You&apos;ll need:</p>
              <ul className="list-inside list-disc space-y-1">
                <li>Bank registration details (RBI license, PAN)</li>
                <li>UCB tier classification</li>
                <li>Branch and department information</li>
                <li>Email addresses for key staff</li>
              </ul>
              <p className="pt-2">
                Typical setup takes 15-20 minutes. You can save and return at
                any time.
              </p>
            </div>
            <Button
              onClick={() => {
                store.setStep(1);
                // Force re-render to show step 1 form
                store.markStepComplete(0 as OnboardingStep); // No-op but triggers re-render
                store.unmarkStepComplete(0 as OnboardingStep);
              }}
              className="w-full"
            >
              Begin Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Main wizard view ─────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <StepIndicator
        currentStep={store.currentStep}
        completedSteps={store.completedSteps}
      />

      {/* Step content placeholder — actual step forms are created in 10-05 and 10-06 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Step {store.currentStep} of 5
          </CardTitle>
          <CardDescription>
            {store.currentStep === 1 &&
              "Enter your bank's registration details"}
            {store.currentStep === 2 && "Select your UCB tier classification"}
            {store.currentStep === 3 &&
              "Choose applicable RBI Master Directions"}
            {store.currentStep === 4 && "Set up branches and departments"}
            {store.currentStep === 5 && "Invite team members"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground py-8 text-center text-sm">
            Step {store.currentStep} form will be rendered here.
          </p>
        </CardContent>
      </Card>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
          <ul className="space-y-1 text-sm text-red-700 dark:text-red-300">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <StepNavigation
        currentStep={store.currentStep}
        isValidating={isValidating}
        isSubmitting={false}
        onNext={handleNext}
        onBack={handleBack}
        onSaveAndExit={handleSaveAndExit}
      />
    </div>
  );
}
