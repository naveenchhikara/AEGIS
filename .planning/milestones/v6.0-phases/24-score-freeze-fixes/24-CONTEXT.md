# Phase 24: Score Freeze & Score Page Fixes - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the freeze score button to enable the BM response workflow end-to-end, fix any TypeScript compilation errors on the score page, verify gauge-to-drilldown wiring, and delete orphaned components. This is a gap closure phase — all backend code exists, only UI wiring and cleanup remain.

</domain>

<decisions>
## Implementation Decisions

### Freeze button enable condition

- Enable the freeze button when **all modules have at least one scored leaf** (all modules scored)
- Button remains visible only for REPORT_DRAFT and COMPLETED engagement statuses (existing behavior)
- Server action `freezeRbiaScore` already validates responses exist, so the UI condition is a UX guard, not a security gate

### Freeze confirmation UX

- Show an **AlertDialog with score summary** before freeze — display composite score, rating band, and action point count
- Use existing shadcn AlertDialog pattern (consistent with other confirmation dialogs in AEGIS)
- This is an irreversible action (DB trigger enforces immutability) — explicit confirmation is warranted

### Post-freeze feedback

- Show a **success toast** with composite score, rating band, and AP count after successful freeze
- Button transforms to a **"Frozen" badge** (already partially implemented — `RbiaScorePanel` shows frozen badge when `isFrozen=true`)
- Page revalidates via `revalidatePath` (already in the server action) to reflect new state

### Freeze button visibility (permissions)

- **Permission-gated**: only show the freeze button to users with `rbia:score_freeze` permission (CAE + AUDIT_MANAGER)
- Other users see the score panel without the freeze button
- Consistent with how other action buttons are permission-gated across AEGIS

### Freeze button placement

- Freeze button lives in **RbiaScorePanel only** (examination page sidebar)
- The dedicated score page (`score/page.tsx`) is for review/drill-down, not for triggering the freeze
- The score page's ScoreSection already handles gauge-to-drilldown wiring via shared `selectedModule` state

### Score page TS2322 fix approach

- **Verify first**, fix only if broken — the current `score-section.tsx` and `page.tsx` code appears to correctly handle `scoringTreeSnapshot` typed as `unknown`
- Attempt a build to confirm whether the TS2322 error from the audit still exists
- If resolved, no changes needed; if present, fix the type narrowing

### Claude's Discretion

- Orphaned `RbiaScoreGauge` (recharts donut in `rbia-score-gauge.tsx`) — Claude checks imports and deletes if truly unused
- Loading/pending state design during freeze transaction
- Error toast message wording for freeze failures
- Exact AlertDialog layout and content formatting

</decisions>

<specifics>
## Specific Ideas

- The freeze button should feel like a "finalize" action — clear, deliberate, not hidden
- The confirmation dialog should give the auditor confidence by showing them the exact scores being locked
- After freeze, the UI should clearly communicate the transition from "live scoring" to "frozen snapshot"

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- `freezeRbiaScore` server action (`src/actions/rbia/freeze.ts`) — 338-line, 6-step atomic transaction, fully implemented and tested
- `FreezeRbiaScoreSchema` (`src/actions/rbia/schemas.ts`) — Zod schema for input validation
- `RbiaScorePanel` (`src/components/rbia/rbia-score-panel.tsx`) — has disabled button at lines 140-148, needs onClick wiring
- `AlertDialog` from shadcn/ui — standard confirmation pattern used elsewhere
- `usePermissions` hook (`src/hooks/usePermissions.ts`) — for client-side permission checks
- `hasPermission` utility (`src/lib/permissions.ts`) — permission check function
- `toast` from sonner — standard toast pattern used across AEGIS

### Established Patterns

- Server actions return `ActionResult<T>` with `{ success, data?, error?, code? }` shape
- Permission-gated UI buttons: check permissions client-side to show/hide, server-side to enforce
- Confirmation dialogs: shadcn AlertDialog with title, description, cancel/confirm buttons
- Post-action feedback: toast notification + page revalidation via `revalidatePath`

### Integration Points

- `RbiaScorePanel` receives `moduleScores`, `branchScore`, `engagementStatus` as props — needs `engagementId` and `canFreeze` permission prop added
- `freezeRbiaScore` expects `{ engagementId }` input, returns `{ compositeScore, ratingBand, apCount }` on success
- `revalidatePath` already called in server action for `/audit-execution/${engagementId}/rbia`
- `ScoreSection` in `score/page.tsx` already wires `onModuleClick` through to `ScoreDrilldownWrapper` via `selectedModule` state

</code_context>

<deferred>
## Deferred Ideas

- Orphaned `bm-response-panel.tsx` (394 lines) — straight delete, no review needed. BM response already delivered via `bm-response-page-client.tsx`

</deferred>

---

_Phase: 24-score-freeze-fixes_
_Context gathered: 2026-02-28_
