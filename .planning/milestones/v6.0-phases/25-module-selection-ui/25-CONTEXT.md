# Phase 25: Module Selection UI - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Provide UI controls for auditors to manually add or remove examination modules from the auto-selected set, completing the module management feature. DAL functions (`addModuleSelection`, `removeModuleSelection`) and server actions (`addModuleSelectionAction`, `removeModuleSelectionAction`) already exist from Phase 19/20 — this phase builds the UI consumers.

</domain>

<decisions>
## Implementation Decisions

### Add Module Flow

- Checklist dialog showing ALL modules (auto-selected ones pre-checked and disabled, unselected ones checkable)
- Per-module reason required — reason text field appears inline next to each newly-checked module
- Reason must be filled before saving (validated client-side and server-side via existing `AddModuleSelectionSchema`)
- Dialog triggered by an "Add Module" button positioned above the module grid

### Remove Module Flow

- Both auto-selected and manually-added modules can be removed
- Auto-selected modules show a warning explaining they were risk-selected before confirming removal
- Manually-added modules go straight to removal confirmation (no extra warning)
- **Block removal if module has scored items** — auditor must clear scores before removing
- Removal requires a documented reason (update `RemoveModuleSelectionSchema` and DAL to accept `reason` field)
- AlertDialog confirmation pattern (consistent with freeze button from Phase 24)

### Module Grid Controls

- "Add Module" button lives above the module grid (in the section header area)
- Always-visible remove icon on every module card (not hover-only)
- Card remains a clickable `<Link>` to module detail page — remove icon uses `stopPropagation` to handle its own click
- Auto-selected and manual cards both show the remove icon

### Status Gating

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

</decisions>

<specifics>
## Specific Ideas

- AlertDialog for removal should match the freeze confirmation pattern established in Phase 24
- The checklist dialog should show module names clearly — these are the depth-0 ExaminationNode entries
- Auto/Manual badges already exist on module cards (`Zap` icon for Auto, `Pencil` icon for Manual) — maintain visual consistency

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- `RbiaModuleGrid` (`src/components/rbia/rbia-module-grid.tsx`): Current read-only grid with Auto/Manual badges — extend with remove icon
- `AlertDialog` from shadcn/ui: Used in Phase 24 freeze confirmation — reuse for remove confirmation
- `addModuleSelectionAction` / `removeModuleSelectionAction` (`src/actions/rbia/examination.ts`): Existing server actions with permission guards
- `AddModuleSelectionSchema` / `RemoveModuleSelectionSchema` (`src/actions/rbia/schemas.ts`): Zod validation schemas
- `getModuleSelections` (`src/data-access/rbia-examination.ts`): Returns current selections with moduleNode info
- `useTransition` + `useRouter` pattern: Established in Phase 24 freeze button for async server action calls with optimistic UI

### Established Patterns

- Server action pattern: `getRequiredSession()` → permission check → Zod parse → DAL call → `revalidatePath()`
- Client component pattern: `useTransition` for pending state, `toast()` for feedback, `router.refresh()` for revalidation
- Status gating: `EngagementStatus` check in component render (e.g., freeze button checks REPORT_DRAFT/COMPLETED)
- Permission gating: `hasPermission(session.user.roles, "rbia:examine")` passed as prop from server component

### Integration Points

- RBIA page (`src/app/(dashboard)/audit-execution/[engagementId]/rbia/page.tsx`): Server component that fetches data and passes to grid — needs to pass engagement status and permissions for gating
- `RbiaModuleGrid`: Needs new props for `engagementStatus`, `canManageModules`, `isFrozen`, and callback handlers
- `RemoveModuleSelectionSchema`: Needs `reason` field added (currently only has `engagementId` + `moduleNodeId`)
- `removeModuleSelection` DAL function: Needs `reason` parameter and to store it (may need schema update or soft-delete pattern)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 25-module-selection-ui_
_Context gathered: 2026-02-28_
