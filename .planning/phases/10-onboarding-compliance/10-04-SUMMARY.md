# 10-04 Summary: Wizard Layout + Step Navigation

## Status: COMPLETE

- **Files:** 5 created, 1 modified (icons.ts)
- **TypeScript:** Clean (0 errors)
- **Build:** Passes (`pnpm build` — 22 routes)

## Files Created

| File                                                                | Lines | Purpose                                                                      |
| ------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------- |
| `src/app/(onboarding)/onboarding/layout.tsx`                        | ~25   | Minimal layout without sidebar — AEGIS header + centered content             |
| `src/app/(onboarding)/onboarding/page.tsx`                          | ~40   | Server component with auth guard + onboarding-completed redirect             |
| `src/app/(onboarding)/onboarding/_components/onboarding-wizard.tsx` | ~190  | Main wizard orchestrator with resume detection, welcome screen, step routing |
| `src/app/(onboarding)/onboarding/_components/step-indicator.tsx`    | ~93   | 5-step progress indicator with completed/current/upcoming states             |
| `src/app/(onboarding)/onboarding/_components/step-navigation.tsx`   | ~83   | Back/Next/Save & Exit navigation with validation loading states              |

## Files Modified

| File               | Change                             |
| ------------------ | ---------------------------------- |
| `src/lib/icons.ts` | Added `ArrowLeft`, `Check` exports |

## Must-Have Verification

| Requirement                                               | Status                                        |
| --------------------------------------------------------- | --------------------------------------------- |
| (onboarding) route group with minimal layout (no sidebar) | Done                                          |
| Auth guard (admin:manage_settings)                        | Done — `requirePermission`                    |
| Already-onboarded tenant redirect                         | Done — checks tenant.onboardingCompleted      |
| Wizard orchestrator via Zustand store state               | Done — reads currentStep from store           |
| Step indicator (completed/current/upcoming)               | Done — 5 circles with labels                  |
| Step navigation (Back/Next/Save & Exit)                   | Done — with disabled states                   |
| Validation via Zod before advancing                       | Done — STEP_SCHEMAS[currentStep].safeParse    |
| Save & Exit saves state and redirects                     | Done — Zustand localStorage auto-persist      |
| Resume detection for incomplete wizards                   | Done — "Resume where I left off" dialog       |
| Welcome screen on first visit                             | Done — Requirements checklist + "Begin Setup" |
| Step 5 shows "Complete Onboarding"                        | Done — StepNavigation detects isLastStep      |

## Architecture Notes

- `(onboarding)` route group provides clean layout without dashboard chrome
- Step forms are placeholder slots — actual forms created in 10-05 (Steps 1-3) and 10-06 (Steps 4-5)
- Zustand localStorage middleware handles persistence automatically — no explicit server save needed yet
- 30-day expiry check on mount resets abandoned wizards
- `getStepData()` extracts relevant store fields for per-step Zod validation
