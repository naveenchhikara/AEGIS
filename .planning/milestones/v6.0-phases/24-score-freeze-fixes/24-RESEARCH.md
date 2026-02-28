# Phase 24: Score Freeze & Score Page Fixes - Research

**Researched:** 2026-02-28
**Domain:** RBIA score freeze UI wiring, score page bug fixes, orphaned component cleanup
**Confidence:** HIGH

## Summary

Phase 24 is a UI wiring and cleanup phase. All backend infrastructure is fully implemented -- the `freezeRbiaScore` server action (338 lines, 6-step atomic transaction), the `FreezeRbiaScoreSchema`, the `BranchRbiaScore` Prisma model with immutability trigger, and the `rbia:score_freeze` permission (CAE + AUDIT_MANAGER) are all production-ready. The work is entirely in the presentation layer: wiring the disabled freeze button in `RbiaScorePanel` to the server action with confirmation dialog, fixing a snapshot shape mismatch in the score page drill-down, and deleting two orphaned components.

Research uncovered two previously unidentified bugs: (1) the `scoringTreeSnapshot` stored by `freeze.ts` is an ARRAY of module nodes, but `ScoreDrilldownWrapper` casts it as a single `ScoredNodeSnapshot` and accesses `.children` -- this means drill-down navigation is currently broken for frozen scores; (2) the `serializeNode` function in `freeze.ts` omits the `name` field, so module buttons in `ScoreDrilldownWrapper` fall back to `.code` instead of displaying human-readable names.

**Primary recommendation:** Wire the freeze button with AlertDialog confirmation, fix the scoringTreeSnapshot shape mismatch (wrap array in root node or adapt the wrapper), add `name` to snapshot serialization, and delete the two orphaned components.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- Enable the freeze button when **all modules have at least one scored leaf** (all modules scored)
- Button remains visible only for REPORT_DRAFT and COMPLETED engagement statuses (existing behavior)
- Server action `freezeRbiaScore` already validates responses exist, so the UI condition is a UX guard, not a security gate
- Show an **AlertDialog with score summary** before freeze -- display composite score, rating band, and action point count
- Use existing shadcn AlertDialog pattern (consistent with other confirmation dialogs in AEGIS)
- This is an irreversible action (DB trigger enforces immutability) -- explicit confirmation is warranted
- Show a **success toast** with composite score, rating band, and AP count after successful freeze
- Button transforms to a **"Frozen" badge** (already partially implemented -- `RbiaScorePanel` shows frozen badge when `isFrozen=true`)
- Page revalidates via `revalidatePath` (already in the server action) to reflect new state
- **Permission-gated**: only show the freeze button to users with `rbia:score_freeze` permission (CAE + AUDIT_MANAGER)
- Other users see the score panel without the freeze button
- Freeze button lives in **RbiaScorePanel only** (examination page sidebar)
- The dedicated score page (`score/page.tsx`) is for review/drill-down, not for triggering the freeze
- The score page's ScoreSection already wires `onModuleClick` through to `ScoreDrilldownWrapper` via `selectedModule` state
- **Verify first**, fix only if broken -- the current `score-section.tsx` and `page.tsx` code appears to correctly handle `scoringTreeSnapshot` typed as `unknown`
- Attempt a build to confirm whether the TS2322 error from the audit still exists
- If resolved, no changes needed; if present, fix the type narrowing

### Claude's Discretion

- Orphaned `RbiaScoreGauge` (recharts donut in `rbia-score-gauge.tsx`) -- Claude checks imports and deletes if truly unused
- Loading/pending state design during freeze transaction
- Error toast message wording for freeze failures
- Exact AlertDialog layout and content formatting

### Deferred Ideas (OUT OF SCOPE)

- Orphaned `bm-response-panel.tsx` (394 lines) -- straight delete, no review needed. BM response already delivered via `bm-response-page-client.tsx`
  </user_constraints>

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                                           | Research Support                                                                                                                                                                                                 |
| ------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EXAM-10 | HIA can freeze RBIA score at engagement completion, creating immutable BranchRbiaScore JSONB snapshot | Freeze button wiring in `RbiaScorePanel` to existing `freezeRbiaScore` server action with AlertDialog confirmation, permission gating, and post-freeze feedback. All backend code exists; only UI wiring needed. |
| REPT-03 | Score drill-down from composite to module to sub-module to leaf item level                            | Fix `scoringTreeSnapshot` shape mismatch (array vs root-node), add `name` field to snapshot serialization, verify `ScoreGauge` module click to `ScoreDrilldownWrapper` wiring.                                   |

</phase_requirements>

## Standard Stack

### Core

| Library               | Version | Purpose                                            | Why Standard                                                      |
| --------------------- | ------- | -------------------------------------------------- | ----------------------------------------------------------------- |
| Next.js               | 16      | App Router + server actions + revalidatePath       | Already in use; freeze action uses revalidatePath                 |
| shadcn/ui AlertDialog | latest  | Confirmation dialog for irreversible freeze action | Already used in team-assignment-panel and other AEGIS components  |
| sonner (toast)        | latest  | Success/error feedback after freeze                | Standard toast library across all RBIA components                 |
| React useTransition   | 19+     | Pending state during server action call            | Pattern used in StatusTransitionControl, MeetingForm, FindingForm |

### Supporting

| Library                           | Version | Purpose                                              | When to Use                                                 |
| --------------------------------- | ------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| @/lib/rbia-scoring-engine         | n/a     | getRatingBand, toPercentage for display computations | Already imported in RbiaScorePanel                          |
| @/lib/permissions (hasPermission) | n/a     | Server-side permission check for rbia:score_freeze   | Already used in rbia layout.tsx for canManageStatus pattern |

### Alternatives Considered

None -- this phase uses exclusively existing libraries and patterns. No new dependencies needed.

## Architecture Patterns

### Recommended Project Structure

No new files needed. All changes are modifications to existing files:

```
src/
├── components/rbia/
│   ├── rbia-score-panel.tsx    # MODIFY: wire freeze button with AlertDialog + permission
│   ├── rbia-score-gauge.tsx    # DELETE: orphaned recharts donut gauge
│   └── bm-response-panel.tsx   # DELETE: orphaned BM response panel
├── actions/rbia/
│   └── freeze.ts              # MODIFY: add `name` to serializeNode snapshot
├── app/(dashboard)/audit-execution/[engagementId]/rbia/
│   ├── page.tsx               # MODIFY: pass engagementId + canFreeze to RbiaScorePanel
│   └── score/
│       └── score-drilldown-wrapper.tsx  # MODIFY: fix scoringTree shape (array vs root node)
```

### Pattern 1: Permission Prop from Server to Client Component

**What:** Server page computes `canFreeze` boolean via `hasPermission()`, passes as prop to client component
**When to use:** Any time a client component needs permission-gated UI elements
**Example:**

```typescript
// In server page (rbia/page.tsx):
const canFreeze = hasPermission(session.user.roles, "rbia:score_freeze");
// Pass to client component:
<RbiaScorePanel
  moduleScores={moduleScores}
  branchScore={branchScore}
  engagementStatus={engagementStatus}
  engagementId={engagementId}  // NEW prop
  canFreeze={canFreeze}         // NEW prop
/>
```

**Source:** Established AEGIS pattern (see `canManageTeam` in audit-execution/[engagementId]/page.tsx line 42, `canEdit` in rbia/meetings/page.tsx line 43)

### Pattern 2: Server Action Call with useTransition + Toast

**What:** Client component calls server action inside `startTransition`, shows toast on success/error
**When to use:** All mutating user actions in RBIA components
**Example:**

```typescript
// In client component:
const [isPending, startTransition] = useTransition();

const handleFreeze = () => {
  startTransition(async () => {
    const result = await freezeRbiaScore({ engagementId });
    if (result.success) {
      toast.success(
        `Score frozen: ${toPercentage(result.data.compositeScore)}% (${result.data.ratingBand})`,
      );
      router.refresh();
    } else {
      toast.error(result.error);
    }
  });
};
```

**Source:** StatusTransitionControl (src/components/rbia/status-transition-control.tsx lines 58-73)

### Pattern 3: AlertDialog for Irreversible Actions

**What:** shadcn AlertDialog with title, description, cancel/confirm buttons
**When to use:** Before irreversible mutations (freeze cannot be undone due to DB trigger)
**Example:**

```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

<AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Freeze RBIA Score</AlertDialogTitle>
      <AlertDialogDescription>
        This action is irreversible. The following scores will be permanently frozen.
      </AlertDialogDescription>
    </AlertDialogHeader>
    {/* Score summary display */}
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleFreeze} disabled={isPending}>
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Freeze Score
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Source:** team-assignment-panel.tsx lines 42-51 (import pattern), lines 335-349 (usage pattern)

### Pattern 4: Freeze Enable Condition

**What:** Button enabled when all modules have at least one scored leaf
**When to use:** Freeze button enable/disable logic
**Example:**

```typescript
// All modules scored = every module has scoredCount > 0
const allModulesScored =
  moduleScores.length > 0 && moduleScores.every((mod) => mod.scoredCount > 0);
const canClickFreeze = allModulesScored && !isFrozen;
```

**Note:** This is a UX guard only. The server action independently validates that responses exist.

### Anti-Patterns to Avoid

- **Client-side permission enforcement as security:** Never rely solely on client `canFreeze` prop. The server action already checks `rbia:score_freeze` permission -- the client prop only controls visibility.
- **Direct Prisma calls in client components:** All DB mutations go through server actions. The freeze button must call `freezeRbiaScore` action, not access Prisma directly.
- **Missing router.refresh():** After server action success, always call `router.refresh()` to revalidate server components. The `revalidatePath` in the server action handles RSC cache, but `router.refresh()` ensures the client sees it.

## Don't Hand-Roll

| Problem             | Don't Build              | Use Instead                                    | Why                                                                  |
| ------------------- | ------------------------ | ---------------------------------------------- | -------------------------------------------------------------------- |
| Confirmation dialog | Custom modal with portal | shadcn AlertDialog                             | Accessible, keyboard-navigable, focus-trapped, already used in AEGIS |
| Toast notifications | Custom toast system      | sonner toast                                   | Already configured in providers, used across all RBIA components     |
| Permission checking | Custom role checks       | `hasPermission(roles, "rbia:score_freeze")`    | Centralized permission system with 60+ permissions already defined   |
| Score formatting    | Manual percentage calc   | `toPercentage()` from rbia-scoring-engine      | Handles rounding edge cases (Math.round, not floor)                  |
| Rating band display | Inline color mapping     | `RATING_BAND_DISPLAY` config in RbiaScorePanel | Already defined with className mappings                              |

**Key insight:** This phase has zero custom infrastructure to build. Every UI pattern (AlertDialog, toast, useTransition, permission props) is already established in the RBIA components. The work is purely wiring existing pieces together.

## Common Pitfalls

### Pitfall 1: scoringTreeSnapshot Shape Mismatch

**What goes wrong:** `ScoreDrilldownWrapper` casts `scoringTree as ScoredNodeSnapshot` and accesses `tree.children`, but `freezeRbiaScore` stores the snapshot as a flat ARRAY of module nodes (`moduleNodes.map(serializeNode)`), not as a root node with `children` property.
**Why it happens:** The freeze action maps module nodes directly into an array, while the wrapper expects a tree with a root node containing a `children` array.
**How to avoid:** Either (a) wrap the array in a synthetic root node during serialization in `freeze.ts`: `{ nodeId: "root", code: "ROOT", children: moduleNodes.map(serializeNode), ... }`, or (b) adapt `ScoreDrilldownWrapper` to handle the array directly.
**Recommendation:** Option (b) -- adapt the wrapper. Changing the freeze serialization format would break any existing frozen snapshots in the database. Cast as `ScoredNodeSnapshot[]` instead of `ScoredNodeSnapshot`, then iterate directly.
**Warning signs:** Drill-down shows "Click a module..." but no module buttons appear, because `tree?.children` is undefined on an array.

### Pitfall 2: Missing `name` Field in Snapshot

**What goes wrong:** `ScoreDrilldownWrapper` renders `child.name ?? child.code` for module buttons, but the `serializeNode` function in `freeze.ts` does not include `name` in the serialized output.
**Why it happens:** The `ScoredNode` type in the scoring engine only has `code`, not `name`. When building the tree in freeze.ts, nodes are loaded with `name` in the SELECT but it's not carried into the `ScoredNode` map or the serialization.
**How to avoid:** Add `name` field to the `serializeNode` function in `freeze.ts`. Need to also carry `name` through the `nodeMap` data structure.
**Warning signs:** Module buttons in drill-down show codes like "OPS", "CREDIT" instead of human-readable names like "Operations", "Credit Portfolio".

### Pitfall 3: Forgetting to Pass `engagementId` to RbiaScorePanel

**What goes wrong:** `RbiaScorePanel` currently receives `moduleScores`, `branchScore`, and `engagementStatus` but does NOT receive `engagementId`. The freeze server action requires `engagementId`.
**Why it happens:** The component was built as display-only; the freeze button was always `disabled`. Wiring it requires the engagement context.
**How to avoid:** Add `engagementId` prop to `RbiaScorePanelProps` and pass it from the server page.
**Warning signs:** TypeScript compile error on `freezeRbiaScore({ engagementId })` if `engagementId` is not in scope.

### Pitfall 4: Race Condition on Double-Click Freeze

**What goes wrong:** User clicks freeze button twice rapidly, causing two concurrent transactions.
**Why it happens:** Network latency between first click and response.
**How to avoid:** The `isPending` state from `useTransition` disables the button during the server action call. The server action also has idempotency via the pre-check for `frozenAt` and the DB trigger. Double-click is harmless (second attempt returns SCORE_FROZEN error) but disabling the button is better UX.
**Warning signs:** Error toast "Score has already been frozen" after apparently successful freeze.

### Pitfall 5: Stale Module Scores After Freeze

**What goes wrong:** After freeze, the panel still shows live progress indicators instead of frozen scores.
**Why it happens:** `revalidatePath` invalidates the RSC cache, but the client component needs `router.refresh()` to re-fetch.
**How to avoid:** Call `router.refresh()` in the client after successful freeze. The server action already calls `revalidatePath` for the RSC layer.
**Warning signs:** Composite score updates but module breakdown still shows live counts.

## Code Examples

### Freeze Button Enable Logic

```typescript
// Source: CONTEXT.md locked decision + existing RbiaScorePanel code
const allModulesScored =
  moduleScores.length > 0 && moduleScores.every((mod) => mod.scoredCount > 0);
const freezeEnabled = allModulesScored && !isFrozen;
```

### Server Action Call Pattern

```typescript
// Source: StatusTransitionControl pattern (src/components/rbia/status-transition-control.tsx)
const handleFreeze = () => {
  startTransition(async () => {
    const result = await freezeRbiaScore({ engagementId });
    if (result.success) {
      const { compositeScore, ratingBand, apCount } = result.data;
      toast.success(
        `Score frozen: ${toPercentage(compositeScore)}% — ${ratingBand.replace(/_/g, " ")} (${apCount} action points issued)`,
      );
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to freeze score");
    }
  });
};
```

### Fix scoringTreeSnapshot Shape in ScoreDrilldownWrapper

```typescript
// Current (broken):
const tree = scoringTree as ScoredNodeSnapshot;
// tree.children is undefined (scoringTree is an array, not a single node)

// Fixed:
const modules = scoringTree as ScoredNodeSnapshot[];
// Then iterate modules directly instead of tree.children
```

### Add `name` to Snapshot Serialization (freeze.ts)

```typescript
// Current (missing name):
const scoringTreeSnapshot = moduleNodes.map(function serializeNode(
  n: ScoredNode,
): any {
  return {
    nodeId: n.nodeId,
    code: n.code,
    weight: n.weight,
    isCritical: n.isCritical,
    isLeaf: n.isLeaf,
    scoreLabel: n.scoreLabel,
    children: n.children.map(serializeNode),
  };
});

// Fixed (needs name carried through nodeMap):
// 1. Add `name` to nodeMap entries alongside ScoredNode fields
// 2. Include name in serialization output
```

## State of the Art

| Old Approach                                           | Current Approach                                          | When Changed | Impact                                                            |
| ------------------------------------------------------ | --------------------------------------------------------- | ------------ | ----------------------------------------------------------------- |
| Recharts RadialBarChart gauge (`rbia-score-gauge.tsx`) | Custom SVG semi-circular gauge (`score-gauge.tsx`)        | Phase 22     | Recharts gauge is orphaned, can be deleted                        |
| `bm-response-panel.tsx` for BM responses               | `bm-response-page-client.tsx` + `bm-response-ap-card.tsx` | Phase 22/23  | Panel component orphaned, page-level client component replaced it |
| Flat `ExaminationArea` / `ExaminationItem`             | Hierarchical `ExaminationNode` tree (depth 0-5)           | Phase 18     | New scoring engine, new snapshot format                           |

**Deprecated/outdated:**

- `rbia-score-gauge.tsx`: Replaced by `score-gauge.tsx` (custom SVG). Zero imports. Safe to delete.
- `bm-response-panel.tsx`: Replaced by page-level `bm-response-page-client.tsx`. Zero imports. Safe to delete.

## Open Questions

1. **Existing frozen snapshots in production DB**
   - What we know: The `scoringTreeSnapshot` is stored as a JSON array of module nodes (not a root node with children). The `name` field is missing from serialized nodes.
   - What's unclear: Whether any production data has already been frozen with the current format.
   - Recommendation: Fix the wrapper to handle the array format (backward-compatible). For `name`, add it to future snapshots but handle missing `name` gracefully in display (fall back to `code`).

2. **TS2322 error existence**
   - What we know: The Phase 23 audit flagged a potential TS2322 error on the score page. Current code types `scoringTree` as `unknown | null` which is correct JSONB handling.
   - What's unclear: Whether the error still exists after subsequent changes.
   - Recommendation: Run `pnpm build` to verify. If no error, skip; if present, fix type narrowing.

3. **Action point count for confirmation dialog**
   - What we know: The freeze server action returns `apCount` AFTER the transaction (it counts APs post-ISSUED transition). The confirmation dialog needs to show AP count BEFORE freeze.
   - What's unclear: Whether a pre-fetch of draft AP count is needed for the confirmation dialog.
   - Recommendation: Show module scores and composite score in the AlertDialog (available from existing props). Show AP count only in the success toast (available from server action response). This avoids an extra server round-trip.

## Sources

### Primary (HIGH confidence)

- Codebase analysis: `src/actions/rbia/freeze.ts` -- full 338-line freeze server action reviewed
- Codebase analysis: `src/components/rbia/rbia-score-panel.tsx` -- current disabled button at lines 140-148
- Codebase analysis: `src/components/rbia/score-gauge.tsx` -- SVG gauge with onModuleClick wiring
- Codebase analysis: `src/components/rbia/score-drilldown.tsx` -- ScoredNodeSnapshot type definition
- Codebase analysis: `src/app/.../rbia/score/score-drilldown-wrapper.tsx` -- broken tree.children access
- Codebase analysis: `src/lib/permissions.ts` -- rbia:score_freeze assigned to AUDIT_MANAGER and CAE roles
- Codebase analysis: `src/components/audit-execution/team-assignment-panel.tsx` -- AlertDialog usage pattern
- Codebase analysis: `src/components/rbia/status-transition-control.tsx` -- useTransition + toast pattern

### Secondary (MEDIUM confidence)

- Import analysis via grep: `RbiaScoreGauge` has zero external imports (orphaned)
- Import analysis via grep: `BmResponsePanel` has zero external imports (orphaned)
- Import analysis via grep: `BmResponseApCard` has one import (NOT orphaned, used by bm-response-page-client.tsx)

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - all libraries already in use, no new dependencies
- Architecture: HIGH - all patterns established in adjacent RBIA components
- Pitfalls: HIGH - bugs verified by direct code reading (snapshot shape mismatch, missing name field)

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (stable -- no external dependency changes expected)
