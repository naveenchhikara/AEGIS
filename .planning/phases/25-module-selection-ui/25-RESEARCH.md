# Phase 25: Module Selection UI - Research

**Researched:** 2026-02-28
**Domain:** React UI components, shadcn/ui Dialog + AlertDialog patterns, Next.js Server Actions with useTransition
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Add Module Flow**

- Checklist dialog showing ALL modules (auto-selected ones pre-checked and disabled, unselected ones checkable)
- Per-module reason required — reason text field appears inline next to each newly-checked module
- Reason must be filled before saving (validated client-side and server-side via existing `AddModuleSelectionSchema`)
- Dialog triggered by an "Add Module" button positioned above the module grid

**Remove Module Flow**

- Both auto-selected and manually-added modules can be removed
- Auto-selected modules show a warning explaining they were risk-selected before confirming removal
- Manually-added modules go straight to removal confirmation (no extra warning)
- Block removal if module has scored items — auditor must clear scores before removing
- Removal requires a documented reason (update `RemoveModuleSelectionSchema` and DAL to accept `reason` field)
- AlertDialog confirmation pattern (consistent with freeze button from Phase 24)

**Module Grid Controls**

- "Add Module" button lives above the module grid (in the section header area)
- Always-visible remove icon on every module card (not hover-only)
- Card remains a clickable `<Link>` to module detail page — remove icon uses `stopPropagation` to handle its own click
- Auto-selected and manual cards both show the remove icon

**Status Gating**

- Module add/remove allowed in: PLANNED, TEAM_ASSIGNED, OPENING_MEETING, IN_PROGRESS
- Locked from EXIT_MEETING onward (REPORT_DRAFT, COMPLETED, CANCELLED)
- Controls disabled with tooltip when gated (e.g., "Module changes locked after exit meeting")
- Frozen score also locks modules — if `BranchRbiaScore.frozenAt` is set, no module changes allowed regardless of engagement status
- Permission gate: `rbia:examine` (matches existing server actions, no new permissions needed)

### Claude's Discretion

- Icon choice for remove button (trash, X, minus)
- Dialog sizing and layout details
- Toast messages for success/error feedback
- Loading state animations during server action calls
- How to fetch and display the list of all available modules in the add dialog

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                              | Research Support                                                                                                                                                                                                                                                                                    |
| ------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ENGG-06 | Auditor can manually add or remove modules from auto-selected set with documented reason | Server actions (`addModuleSelectionAction`, `removeModuleSelectionAction`) + DAL (`addModuleSelection`, `removeModuleSelection`) already exist from Phase 19/20. This phase adds the UI layer: checklist dialog for add, AlertDialog + reason for remove. Schema update required for remove reason. |

</phase_requirements>

## Summary

Phase 25 is a pure UI consumer phase — all backend infrastructure was built in Phases 19/20. The DAL functions `addModuleSelection` and `removeModuleSelection` exist, as do the server actions `addModuleSelectionAction` and `removeModuleSelectionAction`. What's missing is: (1) a checklist dialog component for adding modules, (2) a remove button + AlertDialog with reason on each module card, (3) schema/DAL extension to record removal reason, (4) status/freeze gating propagated from the server component to the grid, and (5) a DAL query for "all available modules" to populate the add dialog.

The codebase has well-established patterns to follow directly: `RbiaScorePanel` (Phase 24) demonstrates the complete `useTransition` + `toast` + `router.refresh()` + `AlertDialog` flow. `RbiaModuleGrid` is the target component to extend with remove icons and the add button. The `Dialog` component from shadcn/ui (Radix UI `@radix-ui/react-dialog`) is used for non-destructive flows like the checklist add dialog; `AlertDialog` is reserved for destructive/irreversible confirmations like removal.

**Primary recommendation:** Build two new client sub-components (`AddModuleDialog` and `RemoveModuleAlertDialog`) keeping `RbiaModuleGrid` as the orchestrator. Extend `RemoveModuleSelectionSchema` and the `removeModuleSelection` DAL to accept a `reason` field. Add a `getAllModules` DAL function for the checklist population. Wire everything through the RBIA page server component which already controls data fetching.

## Standard Stack

### Core

| Library                        | Version          | Purpose                                  | Why Standard                                              |
| ------------------------------ | ---------------- | ---------------------------------------- | --------------------------------------------------------- |
| `@radix-ui/react-dialog`       | (via shadcn)     | Add Module checklist dialog              | Non-destructive, closable dialog                          |
| `@radix-ui/react-alert-dialog` | (via shadcn)     | Remove module confirmation               | Destructive action confirmation, Phase 24 pattern         |
| `react` `useTransition`        | React 18+        | Async server action with pending state   | Established pattern in Phase 24 freeze button             |
| `sonner` (toast)               | (via shadcn)     | Success/error feedback                   | Project standard toast provider                           |
| `next/navigation` `useRouter`  | Next.js 16       | Trigger revalidation after mutation      | Established pattern across codebase                       |
| `@hookform/resolvers` + `zod`  | Project standard | Client-side validation for reason fields | Consistent with all forms in project                      |
| `react-hook-form`              | Project standard | Form state management in add dialog      | Alternative: controlled state, acceptable for simple form |

### Supporting

| Library                        | Version        | Purpose                          | When to Use                                   |
| ------------------------------ | -------------- | -------------------------------- | --------------------------------------------- |
| `@/components/ui/dialog`       | shadcn local   | Dialog wrapper                   | Add Module flow (non-destructive)             |
| `@/components/ui/alert-dialog` | shadcn local   | Confirmation wrapper             | Remove Module flow (destructive)              |
| `@/components/ui/checkbox`     | shadcn local   | Module checklist items           | Add dialog module selection                   |
| `@/components/ui/textarea`     | shadcn local   | Reason input fields              | Both add (inline per module) and remove flows |
| `@/components/ui/scroll-area`  | shadcn local   | Scrollable module list in dialog | When module list exceeds dialog height        |
| `@/components/ui/tooltip`      | shadcn local   | Disabled-state explanation       | Status gating messaging                       |
| `@/lib/icons`                  | project barrel | Icons only from here             | Trash2, X, Loader2, Plus, AlertTriangle, Info |

### Alternatives Considered

| Instead of                             | Could Use                     | Tradeoff                                                                                                             |
| -------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Dialog` for add flow                  | `Sheet` (side panel)          | Sheet is heavier; Dialog is standard for modal selections. Dialog chosen for consistency with ComplianceDetailDialog |
| `react-hook-form` for reason fields    | Controlled `useState`         | For 1-2 fields, controlled state is simpler and avoids form overhead. Controlled state recommended for this phase.   |
| Inline reason per module in add dialog | Separate step after selection | Inline is more scannable; per CONTEXT.md decision, reason appears next to each checked module                        |

**Installation:**
No new packages needed — all required UI primitives are already installed.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/rbia/
│   ├── rbia-module-grid.tsx          # MODIFY: add remove icon, section header button, new props
│   ├── add-module-dialog.tsx         # CREATE: checklist dialog with inline reasons
│   └── remove-module-alert-dialog.tsx # CREATE: AlertDialog for removal with reason + scored-items guard
├── actions/rbia/
│   └── schemas.ts                    # MODIFY: add reason field to RemoveModuleSelectionSchema
├── data-access/
│   └── rbia-examination.ts           # MODIFY: add getAllModules() + update removeModuleSelection() signature
└── app/(dashboard)/audit-execution/[engagementId]/rbia/
    └── page.tsx                      # MODIFY: fetch allModules, pass engagementStatus, isFrozen, canManageModules
```

### Pattern 1: Module Grid with Remove Icon

**What:** Extend `RbiaModuleGrid` to accept management props and render a remove icon on each card using `stopPropagation` to prevent navigation.
**When to use:** When the card is a `<Link>` and an action button lives within it.

```typescript
// Source: existing rbia-module-grid.tsx + Phase 24 rbia-score-panel.tsx pattern
// Remove icon within a Link — stopPropagation prevents navigation

<Link
  key={mod.nodeId}
  href={`/audit-execution/${engagementId}/rbia/module/${mod.moduleCode}`}
  className="group relative"
>
  <Card className="h-full transition-shadow group-hover:shadow-md">
    {/* Card content ... */}

    {/* Always-visible remove icon — absolute position or in card header */}
    {canManageModules && !isLocked && (
      <button
        type="button"
        className="absolute top-3 right-3 text-muted-foreground hover:text-destructive"
        onClick={(e) => {
          e.preventDefault();      // prevent Link navigation
          e.stopPropagation();     // prevent Link navigation
          onRemoveClick(sel);
        }}
        aria-label={`Remove ${mod.moduleName} module`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    )}
  </Card>
</Link>
```

**Critical detail:** Use `e.preventDefault()` AND `e.stopPropagation()` on the button click inside a `<Link>`. Without `preventDefault()`, Next.js Link may still navigate.

### Pattern 2: AlertDialog for Removal with Reason (Phase 24 Pattern)

**What:** Mirror the freeze button AlertDialog from `rbia-score-panel.tsx` for module removal.
**When to use:** Destructive, low-reversibility actions.

```typescript
// Source: src/components/rbia/rbia-score-panel.tsx (Phase 24)
// Adapted for remove module with reason field

const [isPending, startTransition] = useTransition();
const [showConfirm, setShowConfirm] = useState(false);
const [targetModule, setTargetModule] = useState<ModuleSelectionRow | null>(
  null,
);
const [removeReason, setRemoveReason] = useState("");
const router = useRouter();

const handleRemove = () => {
  if (!targetModule || !removeReason.trim()) return;
  startTransition(async () => {
    const result = await removeModuleSelectionAction({
      engagementId,
      moduleNodeId: targetModule.moduleNodeId,
      reason: removeReason.trim(),
    });
    if (result.success) {
      toast.success(`Module "${targetModule.moduleNode.name}" removed`);
      setShowConfirm(false);
      setTargetModule(null);
      setRemoveReason("");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to remove module");
      setShowConfirm(false);
    }
  });
};
```

### Pattern 3: Add Module Checklist Dialog

**What:** Dialog with a scrollable checklist of all available modules. Auto-selected ones are pre-checked + disabled. Unchecked ones are selectable. When a module is newly checked, an inline reason textarea appears.
**When to use:** Non-destructive, multi-item selection action.

```typescript
// Source: src/components/ui/dialog.tsx + src/components/ui/checkbox.tsx project patterns

// State shape for add dialog
type ModuleCheckState = {
  checked: boolean;
  reason: string;
};

// allModules comes from new getAllModules() DAL — all depth-1 nodes regardless of branch type
// moduleSelections is the current selection (to determine pre-checked state)

const selectionNodeIds = new Set(moduleSelections.map((s) => s.moduleNodeId));

const [checkState, setCheckState] = useState<Record<string, ModuleCheckState>>(
  () =>
    Object.fromEntries(
      allModules.map((m) => [
        m.id,
        { checked: selectionNodeIds.has(m.id), reason: "" },
      ]),
    ),
);

// New modules = checked but not in existing selections
const newlyCheckedModules = allModules.filter(
  (m) => checkState[m.id]?.checked && !selectionNodeIds.has(m.id),
);

// Save enabled when all newly-checked modules have a non-empty reason
const saveEnabled =
  newlyCheckedModules.length > 0 &&
  newlyCheckedModules.every((m) => checkState[m.id]?.reason.trim().length > 0);

const handleSave = () => {
  // Call addModuleSelectionAction for each newly checked module
  // Use Promise.all or sequential calls
  startTransition(async () => {
    const results = await Promise.all(
      newlyCheckedModules.map((m) =>
        addModuleSelectionAction({
          engagementId,
          moduleNodeId: m.id,
          reason: checkState[m.id].reason.trim(),
        }),
      ),
    );
    const failures = results.filter((r) => !r.success);
    if (failures.length === 0) {
      toast.success(`${newlyCheckedModules.length} module(s) added`);
      setOpen(false);
      router.refresh();
    } else {
      toast.error(`${failures.length} module(s) failed to add`);
    }
  });
};
```

### Pattern 4: Status Gating Propagation

**What:** Server component computes gating, passes booleans to client component.
**When to use:** Consistent with Phase 24 `canFreeze` pattern.

```typescript
// Source: src/app/(dashboard)/audit-execution/[engagementId]/rbia/page.tsx (Phase 24 pattern)

const MODULE_MGMT_ALLOWED_STATUSES = new Set([
  "PLANNED",
  "TEAM_ASSIGNED",
  "OPENING_MEETING",
  "IN_PROGRESS",
]);

const canManageModules =
  hasPermission(session.user.roles, "rbia:examine") &&
  MODULE_MGMT_ALLOWED_STATUSES.has(engagement.status);

const isFrozen = branchScore !== null && branchScore.frozenAt !== null;

// Pass to RbiaModuleGrid:
<RbiaModuleGrid
  modules={moduleScores}
  engagementId={engagementId}
  moduleSelections={moduleSelections}
  allModules={allModules}          // NEW: all depth-1 nodes for add dialog
  canManageModules={canManageModules} // NEW: computed server-side
  isFrozen={isFrozen}              // NEW: from branchScore
/>
```

### Pattern 5: getAllModules DAL function

**What:** Returns all active depth-1 ExaminationNode rows regardless of branch type. Used to populate the Add Module checklist with all possible modules.
**When to use:** Add Module dialog needs to show ALL modules, not just branch-applicable ones.

```typescript
// Source: src/data-access/rbia-examination.ts — existing getApplicableModules pattern

export async function getAllModules(
  session: Session,
): Promise<{ id: string; code: string; name: string }[]> {
  const tenantId = extractTenantId(session);
  const db = prismaForTenant(tenantId);

  return db.examinationNode.findMany({
    where: { tenantId, isActive: true, depth: 1 },
    select: { id: true, code: true, name: true },
    orderBy: { displayOrder: "asc" },
  });
}
```

### Pattern 6: Schema and DAL update for removal reason

**What:** `RemoveModuleSelectionSchema` currently has only `engagementId` and `moduleNodeId`. Add `reason` field. Update `removeModuleSelection` DAL to log the reason (store in `selectionReason` on a soft-delete or in an audit field).

```typescript
// Source: src/actions/rbia/schemas.ts
// BEFORE:
export const RemoveModuleSelectionSchema = z.object({
  engagementId: z.string().uuid(),
  moduleNodeId: z.string().uuid(),
});

// AFTER:
export const RemoveModuleSelectionSchema = z.object({
  engagementId: z.string().uuid(),
  moduleNodeId: z.string().uuid(),
  reason: z.string().min(1, "Removal reason is required").max(500),
});
```

**DAL approach:** The `EngagementModuleSelection` model has a `selectionReason` field (String?) which is currently only used on creation. For removal, there is no direct "removal reason" field — the record is deleted. Two options:

1. **Log to audit trail only** — call `setAuditContext` with the reason in the server action before deleting. No schema change needed.
2. **Soft-delete** — add `removedAt DateTime?` + `removedReason String?` fields to the model and use update instead of delete. Requires Prisma schema change + `db push`.

**Recommendation: Option 1 (audit trail logging)** — simplest, no schema migration, reason is preserved in the audit log. The server action already calls `setAuditContext`; extend it to include `removalReason`. If the team wants the reason queryable from the DB directly, Option 2 is better but requires a schema migration.

**Re-evaluation of Option 1 limitations:** The `removeModuleSelection` DAL currently calls `db.engagementModuleSelection.delete()`. The audit context is set via a separate table. If the reason needs to be surfaced in a future "module change log" UI, Option 1 is insufficient. Given the CONTEXT.md explicitly states "Removal requires a documented reason (update `RemoveModuleSelectionSchema` and DAL to accept `reason` field)", Option 2 (schema update) is what the user intends. Keep schema change minimal: add only `removalReason String? @db.Text` to `EngagementModuleSelection`.

### Anti-Patterns to Avoid

- **Hover-only remove icon:** CONTEXT.md locks: always-visible, not hover-only.
- **Client-side permission checks:** Compute `canManageModules` server-side, pass as boolean prop (Phase 24 pattern).
- **Calling `addModuleSelectionAction` without reason validation:** `AddModuleSelectionSchema` enforces `reason: z.string().min(1)` — client must ensure reason is filled before calling.
- **Inline remove without confirmation:** All removes require AlertDialog, regardless of auto/manual type.
- **Navigating away from card via remove icon click:** Must use both `e.preventDefault()` and `e.stopPropagation()`.
- **Using `form` action on checklist dialog:** The add dialog submits multiple actions (one per newly-checked module); use `useTransition` + `Promise.all`, not form submission.

## Don't Hand-Roll

| Problem                    | Don't Build                      | Use Instead                               | Why                                                                       |
| -------------------------- | -------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| Confirmation dialog        | Custom modal                     | `AlertDialog` from shadcn                 | Phase 24 already uses it; Radix handles focus trap, a11y, close-on-Escape |
| Scrollable module list     | Custom scroll div                | `ScrollArea` from shadcn                  | Consistent look, handles overflow correctly                               |
| Toast notifications        | Custom notification              | `sonner` toast                            | Already wired as project standard                                         |
| Pending state during async | Custom loading flag + setTimeout | `useTransition`                           | React 18 concurrent-safe, already used in Phase 24                        |
| Disabled-state tooltips    | Custom tooltip div               | `Tooltip` + `TooltipProvider` from shadcn | Already used in freeze button; handles hover positioning                  |

**Key insight:** Everything needed for this phase exists in the project already — shadcn/ui primitives, server action patterns, and the `rbia-score-panel.tsx` (Phase 24) as the definitive reference implementation for the async action + dialog + toast pattern.

## Common Pitfalls

### Pitfall 1: Link + Button Click Conflict

**What goes wrong:** Clicking the remove icon inside a Next.js `<Link>` still navigates to the module detail page.
**Why it happens:** Next.js `<Link>` captures click events on all descendant elements.
**How to avoid:** Call both `e.preventDefault()` AND `e.stopPropagation()` in the button's `onClick` handler. A `<button type="button">` (not `type="submit"`) is required.
**Warning signs:** Navigating to module page instead of showing the AlertDialog.

### Pitfall 2: Add Dialog Reason Validation Race

**What goes wrong:** User checks a module, immediately clicks Save before typing a reason. `AddModuleSelectionSchema` rejects with a validation error from the server action, but the dialog shows no client-side error state.
**Why it happens:** No client-side guard on the Save button.
**How to avoid:** Compute `saveEnabled` as a derived boolean (all newly-checked modules have non-empty reasons). Disable Save button when `!saveEnabled || isPending`.
**Warning signs:** Server returning `VALIDATION_ERROR` for reason field.

### Pitfall 3: Scored Items Removal Guard

**What goes wrong:** Server action deletes the module selection even when the module has scored examination responses, orphaning those scores.
**Why it happens:** The existing `removeModuleSelection` DAL does a direct delete with no pre-check.
**How to avoid:** Add a pre-check in the server action: count `ExaminationResponse` records where `nodeId` is in the module's subtree and `engagementId` matches. Return a `CONFLICT` error if count > 0. The `EngagementModuleScoreRow` data already available in the RBIA page can be used client-side to show an early warning (disable remove if `scoredCount > 0`). Server-side guard is also required.
**Warning signs:** Orphaned ExaminationResponse records after module removal.

### Pitfall 4: isFrozen vs Status Gating Overlap

**What goes wrong:** Developer checks only engagement status for gating, forgetting the frozen score also locks module management.
**Why it happens:** Two separate gating conditions (status AND freeze) but only one is wired.
**How to avoid:** The server component computes: `canManageModules = statusAllowed AND !isFrozen`. Pass as single boolean. Never rely on client to re-derive from raw status string.
**Warning signs:** Remove button visible/active on a frozen-score engagement.

### Pitfall 5: Multiple addModuleSelectionAction calls not awaited

**What goes wrong:** `Promise.all` fires multiple server actions; if one fails, the others may have already succeeded. No rollback. User sees partial success.
**Why it happens:** `addModuleSelectionAction` creates one record per call; there's no batch add action.
**How to avoid:** Accept partial success — if some additions succeed and some fail, show a toast that counts successes vs failures. Call `router.refresh()` to update the grid regardless. User can retry failed ones.
**Warning signs:** Grid shows fewer modules than the user selected.

### Pitfall 6: RemoveModuleSelectionSchema lacks reason — existing callers

**What goes wrong:** Adding `reason` to `RemoveModuleSelectionSchema` as required breaks any existing callers of `removeModuleSelectionAction`.
**Why it happens:** Zod schema change is not backward compatible if `reason` is required.
**How to avoid:** Search for all callers of `removeModuleSelectionAction` before making `reason` required. Currently there are no UI consumers (that's the point of this phase), so it's safe to make `reason` required. Verify with grep before changing.
**Warning signs:** TypeScript compilation errors on existing action callers.

## Code Examples

### Example 1: Remove Module AlertDialog with Reason and Warning

```typescript
// src/components/rbia/remove-module-alert-dialog.tsx
// Pattern from: src/components/rbia/rbia-score-panel.tsx AlertDialog + Phase 24

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "@/lib/icons";
import { removeModuleSelectionAction } from "@/actions/rbia/examination";
import type { ModuleSelectionRow } from "./rbia-module-grid";

interface RemoveModuleAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: ModuleSelectionRow | null;
  engagementId: string;
  hasScoredItems: boolean;   // From EngagementModuleScoreRow.scoredCount > 0
}

export function RemoveModuleAlertDialog({
  open, onOpenChange, module, engagementId, hasScoredItems
}: RemoveModuleAlertDialogProps) {
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const canRemove = !hasScoredItems && reason.trim().length > 0;

  const handleRemove = () => {
    if (!module || !canRemove) return;
    startTransition(async () => {
      const result = await removeModuleSelectionAction({
        engagementId,
        moduleNodeId: module.moduleNodeId,
        reason: reason.trim(),
      });
      if (result.success) {
        toast.success(`Module "${module.moduleNode.name}" removed`);
        onOpenChange(false);
        setReason("");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to remove module");
      }
    });
  };

  const isAutoSelected = module?.isAutoSelected ?? false;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Module</AlertDialogTitle>
          <AlertDialogDescription>
            {isAutoSelected
              ? `"${module?.moduleNode.name}" was automatically selected based on branch risk profile. Are you sure you want to remove it?`
              : `Remove "${module?.moduleNode.name}" from this examination?`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {hasScoredItems && (
          <div className="flex gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>This module has scored items. Clear all scores before removing.</span>
          </div>
        )}

        {!hasScoredItems && (
          <div className="space-y-2">
            <Label htmlFor="remove-reason">Reason for removal</Label>
            <Textarea
              id="remove-reason"
              placeholder="Explain why this module is being removed..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={isPending}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRemove}
            disabled={!canRemove || isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {hasScoredItems ? "Cannot Remove" : "Remove Module"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### Example 2: Page server component — new data fetches and prop passing

```typescript
// src/app/(dashboard)/audit-execution/[engagementId]/rbia/page.tsx
// Add getAllModules fetch + compute canManageModules + isFrozen

import { getAllModules } from "@/data-access/rbia-examination";  // NEW

// In the parallel data fetch:
const [moduleScores, moduleSelections, branchScore, allModules] = await Promise.all([
  getEngagementModuleScores(session, engagementId),
  getModuleSelections(session, engagementId),
  getEngagementBranchScore(session, engagementId),
  getAllModules(session),                               // NEW
]);

// Gating logic
const MODULE_MGMT_ALLOWED_STATUSES = new Set([
  "PLANNED", "TEAM_ASSIGNED", "OPENING_MEETING", "IN_PROGRESS",
]);
const isFrozen = branchScore !== null && branchScore.frozenAt !== null;
const canManageModules =
  hasPermission(session.user.roles, "rbia:examine") &&
  MODULE_MGMT_ALLOWED_STATUSES.has(engagement.status) &&
  !isFrozen;

// Pass to RbiaModuleGrid:
<RbiaModuleGrid
  modules={moduleScores}
  engagementId={engagementId}
  moduleSelections={moduleSelections}
  allModules={allModules}           // NEW
  canManageModules={canManageModules} // NEW
/>
```

### Example 3: `RemoveModuleSelectionSchema` schema update

```typescript
// src/actions/rbia/schemas.ts
// CHANGE: add required reason field

export const RemoveModuleSelectionSchema = z.object({
  engagementId: z.string().uuid(),
  moduleNodeId: z.string().uuid(),
  reason: z.string().min(1, "Removal reason is required").max(500), // ADD
});
```

### Example 4: Server action update — scored-items guard

```typescript
// src/actions/rbia/examination.ts — removeModuleSelectionAction
// Add scored-items guard before calling removeModuleSelection DAL

// After Zod parse, before DAL call:
const db = prismaForTenant(session.user.tenantId);

// Check if any leaf nodes under this module have scored responses
const module = await db.examinationNode.findFirst({
  where: { id: validated.moduleNodeId, tenantId: session.user.tenantId },
  select: { id: true, path: true },
});

if (module) {
  // All descendants have paths starting with module.path + "."
  const descendantNodes = await db.examinationNode.findMany({
    where: {
      tenantId: session.user.tenantId,
      isLeaf: true,
      path: { startsWith: module.path + "." },
    },
    select: { id: true },
  });

  const nodeIds = descendantNodes.map((n) => n.id);
  const scoredCount = await db.examinationResponse.count({
    where: {
      engagementId: validated.engagementId,
      nodeId: { in: nodeIds },
    },
  });

  if (scoredCount > 0) {
    return {
      success: false,
      error: `Cannot remove module: ${scoredCount} item(s) have been scored. Clear scores before removing.`,
      code: "CONFLICT",
    };
  }
}
```

### Example 5: Prisma schema addition for removal reason (Option 2)

```prisma
// prisma/schema.prisma — EngagementModuleSelection model
// ADD: removalReason field

model EngagementModuleSelection {
  // ... existing fields ...
  isAutoSelected  Boolean @default(false)
  selectionReason String?  // Used on add
  removalReason   String? @db.Text  // ADD: populated on soft-delete (optional — see notes)
  // ... rest ...
}
```

**Note:** If using audit trail approach (Option 1) instead of schema change, skip this. The CONTEXT.md says "update RemoveModuleSelectionSchema and DAL to accept reason field" — this means passing the reason through, but does not mandate storing it in the module selection record. The audit trail approach is the minimal-change path. The planner should decide based on whether "removal reason queryable from DB" is needed.

## State of the Art

| Old Approach                                 | Current Approach                     | When Changed    | Impact                                  |
| -------------------------------------------- | ------------------------------------ | --------------- | --------------------------------------- |
| Hover-only action buttons on cards           | Always-visible (CONTEXT.md decision) | Phase 25 design | Improves discoverability, consistent UX |
| No remove UI for modules                     | Remove icon on every module card     | Phase 25        | Closes ENGG-06 gap                      |
| No add UI for modules                        | Checklist dialog                     | Phase 25        | Closes ENGG-06 gap                      |
| `RemoveModuleSelectionSchema` without reason | With required reason                 | Phase 25        | Audit compliance                        |

## Open Questions

1. **Removal reason storage: audit trail vs schema field**
   - What we know: CONTEXT.md says "update DAL to accept reason field" but doesn't say where to store it
   - What's unclear: Whether the reason needs to be queryable from the DB directly (e.g., for a future "module change log" feature)
   - Recommendation: Add `removalReason String? @db.Text` to `EngagementModuleSelection` and update DAL to pass it through. Run `pnpm db:push` after schema change. This is safer than audit-trail-only storage. Planner should include a schema migration task.

2. **Scored-items guard: client-side vs server-side**
   - What we know: `EngagementModuleScoreRow.scoredCount` is already fetched on the page; the remove button can check `scoredCount > 0` before even opening the dialog
   - What's unclear: Whether the server-side guard is also required (it is, as defense-in-depth)
   - Recommendation: Implement both — disable remove button client-side if `scoredCount > 0`, AND guard in the server action with the path-based descendant check shown in Example 4.

3. **Add dialog: "all modules" vs "unselected modules only"**
   - What we know: CONTEXT.md says "checklist dialog showing ALL modules (auto-selected ones pre-checked and disabled, unselected ones checkable)"
   - What's unclear: Whether modules not applicable to the branch type should be shown or hidden
   - Recommendation: Show ALL active depth-1 nodes (use `getAllModules`), not filtered by branch type. Applicability-based filtering was for auto-selection, not manual override. Showing all modules is consistent with CONTEXT.md ("manually add... modules from auto-selected set" implies ability to add any module).

## Sources

### Primary (HIGH confidence)

- `/Users/admin/Developer/AEGIS/src/components/rbia/rbia-score-panel.tsx` — Phase 24 AlertDialog + useTransition + toast pattern (verified by reading)
- `/Users/admin/Developer/AEGIS/src/components/rbia/rbia-module-grid.tsx` — current grid structure (verified by reading)
- `/Users/admin/Developer/AEGIS/src/actions/rbia/examination.ts` — existing server actions (verified by reading)
- `/Users/admin/Developer/AEGIS/src/actions/rbia/schemas.ts` — existing Zod schemas (verified by reading)
- `/Users/admin/Developer/AEGIS/src/data-access/rbia-examination.ts` — DAL functions (verified by reading)
- `/Users/admin/Developer/AEGIS/src/app/(dashboard)/audit-execution/[engagementId]/rbia/page.tsx` — server component (verified by reading)
- `/Users/admin/Developer/AEGIS/prisma/schema.prisma` — EngagementModuleSelection model (verified by reading)
- `/Users/admin/Developer/AEGIS/src/lib/icons.ts` — available icons barrel export (verified by reading)
- `/Users/admin/Developer/AEGIS/src/components/ui/dialog.tsx` — Dialog component structure (verified by reading)

### Secondary (MEDIUM confidence)

- Radix UI AlertDialog behavior (focus trap, close-on-Escape, disabled button interaction) — inferred from shadcn implementation + project usage in Phase 24

### Tertiary (LOW confidence)

- None

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries verified as already installed and used in project
- Architecture: HIGH — patterns verified by reading Phase 24 implementation directly
- Pitfalls: HIGH — derived from code reading + known Next.js Link + button interaction behavior

**Research date:** 2026-02-28
**Valid until:** 2026-03-30 (stable domain — shadcn/ui, React patterns)
