---
phase: 13
plan: 01
type: execution
subsystem: onboarding
tags: [persistence, zustand, server-actions, postgres, state-sync]
dependency_graph:
  requires: [10-07]
  provides: [server-side-onboarding-state, device-agnostic-resume]
  affects: [13-02]
tech_stack:
  added: []
  patterns: [optimistic-ui, server-client-sync, fire-and-forget]
decisions:
  - D30-server-wins-merge
  - D31-fire-and-forget-sync
key_files:
  created: []
  modified:
    - next.config.ts
    - src/types/onboarding.ts
    - src/stores/onboarding-store.ts
    - src/app/(onboarding)/onboarding/_components/onboarding-wizard.tsx
metrics:
  duration: 4m 30s
  completed: 2026-02-10
---

# Phase 13 Plan 01: Onboarding Server Persistence Summary

**One-liner:** Server-side onboarding progress saves to PostgreSQL on every step and Save & Exit, enabling cross-device resume

## What Was Built

Added server synchronization to the onboarding wizard flow, allowing users to save progress to PostgreSQL and resume from any device.

### Task 1: Configure body size limit and add server sync to Zustand store

- **Duration:** ~2 minutes
- **Commit:** `a7a1bdf`

Added server-side persistence infrastructure:

1. **next.config.ts**: Added `serverActions.bodySizeLimit: "5mb"` to handle large org structure data, and added `exceljs` to `serverExternalPackages` for Phase 13-02 Excel upload support.

2. **src/types/onboarding.ts**: Extended `OnboardingState` with `lastSyncedAt: string | null` and `isSyncing: boolean` for sync status tracking. Added `saveToServer()` and `loadFromServer()` methods to `OnboardingActions` interface.

3. **src/stores/onboarding-store.ts**: Implemented server sync actions:
   - **saveToServer()**: Gathers all step data (bankRegistration, tierSelection, selectedDirections, notApplicableItems, orgStructure, userInvites) and calls `saveWizardStep()` server action. Sets `isSyncing` flag during operation, updates `lastSyncedAt` on success.
   - **loadFromServer()**: Calls `getWizardProgress()` and merges server state if newer than local (compares `updatedAt` from server vs `lastSavedAt` from localStorage). Updates wizard position (currentStep, completedSteps) and all step data fields.
   - Updated `partialize` to include `lastSyncedAt` in localStorage persistence, excluded `isSyncing` (ephemeral UI state).
   - Updated `getInitialState()` and `reset()` to initialize sync fields.

**Key Decision (D30-server-wins-merge):** When both server and local state exist, server state wins if newer. This prevents device A from overwriting device B's progress if user switches between devices.

**Key Decision (D31-fire-and-forget-sync):** Server saves are non-blocking. If sync fails, user can continue working with localStorage state. Errors logged to console but don't interrupt UX.

### Task 2: Wire server save/load into onboarding wizard flow

- **Duration:** ~2 minutes
- **Commit:** `ad22c10`

Integrated server sync into wizard lifecycle:

1. **Server hydration on mount**: Modified `useEffect` to use async initialization pattern. Now calls `store.loadFromServer()` before checking `hasProgress()` for resume detection. This ensures server state (from another device) is loaded before showing resume prompt.

2. **Auto-save on step advancement**: Added `store.saveToServer().catch(console.error)` in `handleNext` after `markStepComplete` and `setStep`. Fire-and-forget pattern — doesn't block navigation if server is slow or unreachable.

3. **Save on Save & Exit**: Made `handleSaveAndExit` async, added `await store.saveToServer()` before `router.push("/dashboard")`. Waits for server save to complete (best-effort) but still exits if save fails.

4. **Sync status indicator**: Added UI below `StepIndicator`:
   - Shows "Saving..." with spinner when `isSyncing: true`
   - Shows "Last saved to cloud: [time]" when `lastSyncedAt` is set and not syncing
   - Time formatted using `toLocaleTimeString("en-IN")` for Indian locale

5. **Resume detection**: Now works with server state — loads server progress first, then checks if resume prompt should be shown.

## Deviations from Plan

None — plan executed exactly as written.

## Decisions Made

### D30: Server-wins merge strategy

**Context:** When user has progress in localStorage on Device A and also has server-saved progress from Device B, which state should win?

**Decision:** Server state wins if server's `updatedAt` is newer than local `lastSavedAt`.

**Rationale:**

- Prevents Device A from overwriting Device B's more recent work
- User explicitly saved on Device B (via step advance or Save & Exit)
- localStorage is device-specific; server state is canonical

**Implementation:** Compare timestamps in `loadFromServer()` before merging.

### D31: Fire-and-forget sync pattern

**Context:** Should server save failures block user from continuing the wizard?

**Decision:** No — server saves are non-blocking, use fire-and-forget with error logging.

**Rationale:**

- Server downtime or network issues shouldn't block onboarding UX
- localStorage still preserves state on current device
- User can complete wizard and data will sync when server is reachable
- Exception: Save & Exit awaits server save (best-effort) but still exits on failure

**Implementation:** Use `.catch(console.error)` for step advancement saves, `try/catch` with empty catch for Save & Exit.

## Files Modified

| File                                                               | Changes                                                                                             | Lines |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ----- |
| next.config.ts                                                     | Added serverActions.bodySizeLimit: "5mb", exceljs to serverExternalPackages                         | +3    |
| src/types/onboarding.ts                                            | Added lastSyncedAt, isSyncing to OnboardingState; saveToServer, loadFromServer to OnboardingActions | +5    |
| src/stores/onboarding-store.ts                                     | Implemented saveToServer() and loadFromServer(), updated partialize and getInitialState             | +90   |
| src/app/(onboarding)/onboarding/\_components/onboarding-wizard.tsx | Server hydration on mount, auto-save on step advance + Save & Exit, sync status indicator           | +43   |

**Total:** 4 files modified, 141 lines added

## Task Commits

| Task | Name                                                           | Commit    | Files                                                                   |
| ---- | -------------------------------------------------------------- | --------- | ----------------------------------------------------------------------- |
| 1    | Configure body size limit and add server sync to Zustand store | `a7a1bdf` | next.config.ts, src/types/onboarding.ts, src/stores/onboarding-store.ts |
| 2    | Wire server save/load into onboarding wizard flow              | `ad22c10` | src/app/(onboarding)/onboarding/\_components/onboarding-wizard.tsx      |

## Testing & Verification

### Automated Checks (Passed)

- ✅ `pnpm tsc --noEmit` — no new TypeScript errors (pre-existing test errors unrelated)
- ✅ `pnpm build` — production build succeeds
- ✅ `grep "saveToServer\|loadFromServer"` — methods exist in store and wizard
- ✅ `grep "bodySizeLimit"` — 5mb limit configured
- ✅ `grep "exceljs"` — added to serverExternalPackages

### Manual Testing (Recommended)

1. **Cross-device resume**: Start onboarding on Device A, Save & Exit at Step 3, resume on Device B → should load Step 3 state from server
2. **Auto-save indicator**: Advance from Step 1 to Step 2 → "Saving..." should briefly appear, then "Last saved to cloud: [time]"
3. **Offline resilience**: Disconnect network, advance steps → localStorage still works, no blocking errors
4. **Save & Exit**: Click Save & Exit → server save completes before redirect to dashboard

### Database Verification

Check `OnboardingProgress` table after step advancement:

```sql
SELECT tenantId, currentStep, completedSteps, updatedAt
FROM "OnboardingProgress"
WHERE tenantId = '<test-tenant-id>';
```

Expect:

- `currentStep` matches wizard position
- `completedSteps` array includes all completed steps
- `stepData` JSON contains all form data
- `updatedAt` timestamp matches `lastSyncedAt` in localStorage

## Next Phase Readiness

### Ready for 13-02 (Excel Org Structure Upload)

- ✅ Server-side onboarding state wired — Excel upload can now save directly to `OnboardingProgress.stepData.orgStructure`
- ✅ 5mb body size limit configured — can handle Excel files up to 5mb
- ✅ exceljs added to serverExternalPackages — ready for server-side parsing

### Tech Debt Closed

- ✅ **Phase 10 tech debt**: "Server-side onboarding save not wired" → RESOLVED
- Onboarding progress now persists to PostgreSQL and can be resumed from any device

### Outstanding Issues

None.

### Blockers for Next Plan

None. Phase 13-02 can proceed.

---

**Self-Check: PASSED**

All commits verified:

- ✅ `a7a1bdf` feat(13-01): add server sync to onboarding store
- ✅ `ad22c10` feat(13-01): wire server save/load into onboarding wizard

All modified files verified:

- ✅ next.config.ts
- ✅ src/types/onboarding.ts
- ✅ src/stores/onboarding-store.ts
- ✅ src/app/(onboarding)/onboarding/\_components/onboarding-wizard.tsx
