# Phase 21: Examination UI - Research

**Researched:** 2026-02-23
**Domain:** TanStack Table v8 expanding rows, optimistic UI mutations, URL state, Next.js App Router server components
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Tree Navigation & Layout:**

- TanStack Table expanding rows — table with expand/collapse chevrons per row, each depth level indented, leaf rows show score buttons inline
- Module grid → per-module tree page — dashboard shows module cards with status badges; clicking a module navigates to its own page with the full expanded tree for that module only
- Default expand to depth 2 — modules → sub-areas expanded by default; categories and leaf items stay collapsed
- Module cards show: name, progress bar (12/24 items), current score percentage, and status badge (Not started / In progress / Complete)

**Score Picker Interaction:**

- Inline button group — 4 small buttons right-aligned in each leaf row: FC | LC | PC | NC; selected button is filled/highlighted; always visible on leaf rows, no extra click
- Inline expand for working notes — when auditor picks PARTIALLY or NON_COMPLIANT, the row expands downward revealing a textarea for working notes (500+ chars required) plus flag checkboxes (AP / Observation); saves without a modal
- Traffic-light gradient colors — FC=green, LC=yellow/amber, PC=orange, NC=red; unscored items are neutral/gray
- Immediate save with undo toast — score changes instantly (optimistic UI); brief toast: "Score updated — Undo"; no confirmation dialog

**Progress & Score Display:**

- Sticky header panel above the tree table — module name, progress bar (12/24 — 50%), current module score, rating band badge; stays visible while scrolling
- Score panel above module grid on the engagement dashboard — composite score across all modules, overall rating band (e.g., "Good — 72%"), total items scored/total, freeze button (read-only in Phase 21)
- Roll-up scores on parent rows — each parent row shows its weighted average score as a percentage badge (e.g., "68%") computed from children; instant sub-area health at a glance
- Critical items: red border + warning icon — critical leaf rows have a left red border accent and a small warning icon next to the item name; if scored NON_COMPLIANT, the row background turns light red

**Filtering & Tree State:**

- Toggle button bar above table — "Unscored" | "Flagged AP" | "Flagged Observation"; clicking toggles filter on/off; active filters highlighted; multiple can be active simultaneously
- Count badges on each filter toggle — "Unscored (18)" | "Flagged AP (3)" | "Flagged Obs (1)"; updates in real-time as items are scored
- Hide non-matching, keep parent chain — non-matching leaf items hidden; parent nodes with at least one matching child stay visible; clear visual indicator that filtered mode is active
- Tree expand state persisted in URL search params — expanded node IDs stored in URL; back/forward navigation and page refresh restore tree state; shareable links

### Claude's Discretion

- Exact spacing, typography, and responsive breakpoints
- Loading skeleton design while tree data fetches
- Error state handling (network failures, stale data)
- Keyboard navigation within the tree (tab/arrow key support)
- Toast implementation details (duration, position)
- Working notes textarea auto-grow behavior

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                                                  | Research Support                                                                                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| EXAM-01 | Auditor can view hierarchical examination tree with expand/collapse navigation at each depth level (0-5)     | TanStack Table v8 `getExpandedRowModel()` + `getSubRows` handles arbitrary depth; `ExpandedState` controls which rows open; depth-based indent via `row.depth`                 |
| EXAM-02 | Auditor can score leaf examination items using 4-button picker (FULLY / LARGELY / PARTIALLY / NON_COMPLIANT) | Inline `<ButtonGroup>` on leaf rows; optimistic update via `useOptimistic` (React 19) or local state + server action call; Phase 20 `saveExaminationResponse` action available |
| EXAM-07 | System displays progress indicator per module ("12/24 items scored" with percentage)                         | `getEngagementModuleScores()` DAL function returns `{scoredCount, totalLeafCount}` per module; sticky header panel + module card progress bars read from this data             |
| EXAM-08 | Auditor can filter examination items by: not yet scored, flagged for AP, flagged for observation             | Client-side filter applied to flattened tree; parent visibility rule: show parent if any descendant matches; toggle buttons update a filter state Set                          |

</phase_requirements>

---

## Summary

Phase 21 builds the examination UI on top of a complete server foundation. Phase 18 provides the scoring engine, Phase 19 provides all DAL functions (`getExaminationTree`, `getEngagementModuleScores`, `getModuleSelections`), and Phase 20 provides the server actions (`saveExaminationResponse`). This phase is a pure UI build — no new server infrastructure is needed.

The core technical challenge is the TanStack Table expanding tree with custom filtering. TanStack Table v8.21 is already installed in the project and used in `findings-table.tsx` for flat tables. For Phase 21, the same library is extended with `getExpandedRowModel()` and `getSubRows` to handle the hierarchical `ExaminationTreeNode[]` structure returned by the DAL. The tree data type is a recursive structure already defined in `src/data-access/rbia-examination.ts`.

The second challenge is optimistic UI for score updates. The Phase 20 CONTEXT locked "explicit Save button" for working notes but the Phase 21 CONTEXT locks "immediate save with undo toast" for score button clicks — these must coexist: clicking a score button saves immediately (optimistic), but notes+flags require the inline expanded row and its own save action. URL state for tree expansion is managed via `useSearchParams` / `useRouter` from Next.js (no external library needed).

**Primary recommendation:** Use TanStack Table v8 `getExpandedRowModel()` + recursive `getSubRows` for the tree; use `useOptimistic` (React 19 / Next.js 16) for score button saves; manage filter state in React `useState` with a client-side tree-walk for parent-chain visibility.

---

## Standard Stack

### Core

| Library                                           | Version               | Purpose                      | Why Standard                                                                             |
| ------------------------------------------------- | --------------------- | ---------------------------- | ---------------------------------------------------------------------------------------- |
| `@tanstack/react-table`                           | `^8.21.3` (installed) | Expanding row tree table     | Already in project; `getExpandedRowModel` + `getSubRows` handles n-depth trees natively  |
| `useOptimistic`                                   | React 19 built-in     | Optimistic score updates     | Ships with React 19 / Next.js 16; no extra package; perfect for immediate score feedback |
| `next/navigation` `useSearchParams` + `useRouter` | Next.js 16 built-in   | URL-persisted expand state   | Built-in; no external library needed for URL param read/write                            |
| `sonner`                                          | already in shadcn/ui  | "Score updated — Undo" toast | shadcn/ui uses sonner; `toast()` with action button for undo                             |

### Supporting

| Library              | Version   | Purpose                                            | When to Use                                                              |
| -------------------- | --------- | -------------------------------------------------- | ------------------------------------------------------------------------ |
| shadcn/ui `Progress` | installed | Progress bar in module cards + sticky header       | Use for `scoredCount/totalLeafCount` bar                                 |
| shadcn/ui `Badge`    | installed | Rating band badge, status badge                    | Status labels (Not started / In progress / Complete) + rating band color |
| shadcn/ui `Button`   | installed | Score picker buttons (FC/LC/PC/NC), filter toggles | Toggle variant for filter buttons; outline/filled for score buttons      |
| shadcn/ui `Textarea` | installed | Working notes inline expansion                     | Auto-grow via `field-sizing: content` CSS or `onInput` height recalc     |
| shadcn/ui `Checkbox` | installed | Flag for AP / Flag for Observation checkboxes      | Inside inline expanded notes row                                         |

### Alternatives Considered

| Instead of                      | Could Use                                         | Tradeoff                                                                                                                                                                             |
| ------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TanStack Table expanding rows   | `react-arborist`                                  | REQUIREMENTS.md Out of Scope: "react-arborist for tree UI — TanStack Table expanding is sufficient; 43KB extra not justified"                                                        |
| `useOptimistic`                 | React Query `useMutation` with optimistic updates | React Query already installed; either works — `useOptimistic` is simpler for this single-action pattern; React Query mutation cache is better if multiple components share same data |
| `useSearchParams` + `useRouter` | `nuqs` (type-safe URL state)                      | `nuqs` provides nicer API but adds a dependency; `useSearchParams` is sufficient for a Set of string IDs                                                                             |

**Installation:** No new packages required. All dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/(dashboard)/rbia/
│   ├── page.tsx                          # RBIA engagement dashboard (server component)
│   └── module/[moduleCode]/
│       └── page.tsx                      # Per-module examination tree (server component)
├── components/rbia/
│   ├── rbia-module-grid.tsx              # Plan 21-01: module selection grid
│   ├── rbia-examination-tree.tsx         # Plan 21-02: expanding tree with score picker
│   ├── rbia-score-panel.tsx              # Plan 21-03: composite score display
│   └── rbia-score-button-group.tsx       # Inline 4-button picker (FC/LC/PC/NC)
```

Note: `rbia-score-button-group.tsx` may be inlined into `rbia-examination-tree.tsx` — Claude's discretion.

The stub `/rbia/page.tsx` was created in Phase 19 (Plan 19-05). Phase 21 replaces that stub with the full dashboard page and adds the `module/[moduleCode]/page.tsx` route.

### Pattern 1: TanStack Table Expanding Tree

**What:** `useReactTable` with `getExpandedRowModel()` + `getSubRows` traverses the recursive `ExaminationTreeNode[]` structure. Depth-based indentation uses `row.depth * 20px` left padding. Default expand to depth 2 is set via initial `ExpandedState`.

**When to use:** Any time the data is already a recursive tree structure (which `getExaminationTree()` returns).

**Example:**

```typescript
// Source: TanStack Table v8 docs — expanding rows
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  type ExpandedState,
  type ColumnDef,
} from "@tanstack/react-table";
import type { ExaminationTreeNode } from "@/data-access/rbia-examination";

// Build initial expanded state: expand all rows at depth 0 and 1
function buildDefaultExpanded(nodes: ExaminationTreeNode[]): ExpandedState {
  const expanded: Record<string, boolean> = {};
  function walk(nodes: ExaminationTreeNode[], depth: number) {
    for (const node of nodes) {
      if (depth < 2) {
        expanded[node.id] = true;
        walk(node.children, depth + 1);
      }
    }
  }
  walk(nodes, 0);
  return expanded;
}

const [expanded, setExpanded] = React.useState<ExpandedState>(() =>
  buildDefaultExpanded(moduleTree),
);

const table = useReactTable({
  data: moduleTree, // ExaminationTreeNode[] (roots only)
  columns,
  state: { expanded },
  onExpandedChange: setExpanded,
  getSubRows: (row) => row.children, // recursive — TanStack handles any depth
  getCoreRowModel: getCoreRowModel(),
  getExpandedRowModel: getExpandedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
});
```

**Depth-based indentation in cell render:**

```typescript
// In column cell renderer:
cell: ({ row, getValue }) => (
  <div style={{ paddingLeft: `${row.depth * 20}px` }} className="flex items-center gap-2">
    {row.getCanExpand() && (
      <button onClick={row.getToggleExpandedHandler()}>
        {row.getIsExpanded() ? <ChevronDown /> : <ChevronRight />}
      </button>
    )}
    <span>{getValue<string>()}</span>
  </div>
)
```

### Pattern 2: Optimistic Score Updates with `useOptimistic`

**What:** Score button click triggers optimistic local state update immediately, then calls the Phase 20 `saveExaminationResponse` server action. If the action fails, the optimistic state is reverted automatically.

**When to use:** Single-field mutations where the server round-trip (200-500ms) would feel sluggish.

**Example:**

```typescript
// Source: React 19 docs — useOptimistic
"use client";
import { useOptimistic, useTransition } from "react";
import { saveExaminationResponse } from "@/actions/rbia/examination";
import type { ScoreLabel } from "@/generated/prisma/enums";

type ScoreState = { scoreLabel: ScoreLabel | null; score: number | null };

function ScoreButtonGroup({
  nodeId,
  engagementId,
  initial,
}: {
  nodeId: string;
  engagementId: string;
  initial: ScoreState;
}) {
  const [optimisticScore, setOptimisticScore] = useOptimistic(initial);
  const [isPending, startTransition] = useTransition();

  const handleScore = (label: ScoreLabel, score: number) => {
    startTransition(async () => {
      setOptimisticScore({ scoreLabel: label, score });
      await saveExaminationResponse({
        nodeId,
        engagementId,
        scoreLabel: label,
        score,
      });
      // revalidatePath in server action handles cache invalidation
    });
  };
  // ...
}
```

**Important:** `useOptimistic` requires the component to be a client component (`"use client"`). The parent page is a server component; the tree table must be a client component.

### Pattern 3: URL-Persisted Expand State

**What:** Expanded node IDs stored as a comma-separated `expanded` search param. On mount, parse URL to initialize `ExpandedState`. On change, update URL without full navigation.

**When to use:** Any tree expand state that must survive page refresh or be shareable.

**Example:**

```typescript
"use client";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

// Read from URL on mount
const searchParams = useSearchParams();
const expandedParam = searchParams.get("expanded") ?? "";
const initialExpanded: ExpandedState = Object.fromEntries(
  expandedParam
    .split(",")
    .filter(Boolean)
    .map((id) => [id, true]),
);

// Write to URL on change (replace, not push — no history spam)
const router = useRouter();
const pathname = usePathname();
const handleExpandedChange: OnChangeFn<ExpandedState> = (updater) => {
  const next = typeof updater === "function" ? updater(expanded) : updater;
  setExpanded(next);
  const ids = Object.entries(next)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(",");
  const params = new URLSearchParams(searchParams.toString());
  if (ids) params.set("expanded", ids);
  else params.delete("expanded");
  router.replace(`${pathname}?${params.toString()}`, { scroll: false });
};
```

### Pattern 4: Client-Side Tree Filter with Parent-Chain Visibility

**What:** Active filters (unscored / flagged AP / flagged observation) are a `Set<string>` in React state. Before passing data to TanStack Table, walk the tree and annotate each node with `_visible: boolean`. A parent is visible if at least one descendant is visible. TanStack Table's `getFilteredRowModel` can use a global filter function that reads this annotation.

**When to use:** Hierarchical filter where non-matching parent rows must stay visible if any child matches.

**Example:**

```typescript
type ActiveFilter = "unscored" | "flaggedAP" | "flaggedObs";

function matchesFilter(
  node: ExaminationTreeNode,
  filters: Set<ActiveFilter>,
): boolean {
  if (filters.size === 0) return true;
  if (!node.isLeaf) return false; // parent visibility computed from children
  return (
    (filters.has("unscored") && node.response?.scoreLabel == null) ||
    (filters.has("flaggedAP") && node.response?.flagForActionPoint === true) ||
    (filters.has("flaggedObs") && node.response?.flagForObservation === true)
  );
}

// Recursive: returns true if this node or any descendant matches
function isVisible(
  node: ExaminationTreeNode,
  filters: Set<ActiveFilter>,
): boolean {
  if (node.isLeaf) return matchesFilter(node, filters);
  return node.children.some((child) => isVisible(child, filters));
}

// Pass filterFns to TanStack Table, or pre-filter the data array before
// passing to useReactTable — pre-filtering is simpler for tree structures.
```

### Pattern 5: Roll-Up Score Display on Parent Rows

**What:** Each `ExaminationTreeNode` parent row shows a weighted average badge. The DAL `ExaminationTreeNode` already has `weight` on every node. Compute roll-up client-side from the in-memory tree (same data already fetched) — no extra server call.

**When to use:** Any time per-row aggregate badge is needed from already-loaded children.

**Example:**

```typescript
function computeRollUp(node: ExaminationTreeNode): number | null {
  if (node.isLeaf) return node.response?.score ?? null;
  const children = node.children;
  let totalWeight = 0;
  let weightedSum = 0;
  let hasAnyScore = false;
  for (const child of children) {
    const childScore = computeRollUp(child);
    if (childScore !== null) {
      weightedSum += childScore * child.weight;
      totalWeight += child.weight;
      hasAnyScore = true;
    }
  }
  if (!hasAnyScore) return null;
  return totalWeight > 0 ? weightedSum / totalWeight : null;
}
// Score is 0.0–1.0; multiply by 100 for percentage display.
```

### Anti-Patterns to Avoid

- **Fetching tree on every score save:** `revalidatePath` in the server action will cause a full server component re-fetch. For the tree page, use client-state-first: update local state optimistically, call server action, only let Next.js revalidate on page transitions or explicit refresh. The sticky header module score panel can be separately revalidated.
- **N+1 expansion queries:** Do not fetch a module's subtree on expand click. The full tree for a module (`/rbia/module/[moduleCode]/page.tsx`) is loaded once on page mount. This is safe at ~200-500 nodes per module.
- **Passing `row.id` as TanStack row ID without customization:** By default TanStack Table uses array index as row ID. For URL-persisted expand state, the `ExaminationNode.id` (UUID) must be the row ID. Set `getRowId: (row) => row.id` in `useReactTable` config.
- **Rendering score buttons on non-leaf rows:** Guard all score button rendering with `row.original.isLeaf === true`. Parent rows show only the roll-up badge.
- **Using `router.push` for URL expand state updates:** Use `router.replace` with `{ scroll: false }` to avoid polluting browser history with every expand/collapse click.

---

## Don't Hand-Roll

| Problem              | Don't Build                                                     | Use Instead                                                  | Why                                                                                                        |
| -------------------- | --------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Expanding tree table | Custom recursive `<ul>/<li>` component with manual expand state | `@tanstack/react-table` `getExpandedRowModel` + `getSubRows` | TanStack handles ExpandedState, row model, filter model, and getCanExpand automatically; already installed |
| Optimistic UI        | Manual "pending" state + rollback logic                         | `useOptimistic` (React 19 built-in)                          | Built-in rollback on action failure; no extra state management                                             |
| Toast with undo      | Custom toast component                                          | `sonner` (already in shadcn/ui project)                      | `toast()` with `action: { label: "Undo", onClick }` is the standard pattern                                |
| Progress bar         | Raw `<div>` with percentage width                               | shadcn/ui `<Progress>`                                       | Accessible, consistent with rest of UI                                                                     |

**Key insight:** The full data layer is already built. Phase 21 is purely assembling UI from existing primitives — resist the urge to add server-side filtering, pagination, or virtualization for 200-500 nodes.

---

## Common Pitfalls

### Pitfall 1: TanStack Table Row ID Must Be Set for URL State

**What goes wrong:** Default TanStack Table row IDs are array indices (`"0"`, `"0.1"`, `"0.1.2"`). These are positional and change if the tree data changes. URL-persisted `expanded` params break after any data mutation.

**Why it happens:** TanStack Table defaults to `index` for row ID when `getRowId` is not specified.

**How to avoid:** Always specify `getRowId: (row) => row.id` in `useReactTable`. The `ExaminationNode.id` UUIDs are stable across mutations.

**Warning signs:** Expanded state resets unexpectedly after a score save.

### Pitfall 2: `useSearchParams` Requires Suspense Boundary in Next.js App Router

**What goes wrong:** `useSearchParams()` in a client component causes the build to fail or the component to require a Suspense boundary in Next.js App Router.

**Why it happens:** Next.js App Router requires components that read search params dynamically to be wrapped in `<Suspense>` to avoid blocking static rendering.

**How to avoid:** Wrap the examination tree client component (or the page's client shell) in a `<Suspense fallback={<TreeSkeleton />}>` boundary. The server page component passes the initial `searchParams` prop to the client component as a prop (server components receive `searchParams` as a page prop in App Router).

**Correct pattern:**

```typescript
// app/(dashboard)/rbia/module/[moduleCode]/page.tsx  (server component)
export default async function ModuleExaminationPage({
  params,
  searchParams,
}: {
  params: { moduleCode: string };
  searchParams: { expanded?: string };
}) {
  const session = await getRequiredSession();
  const tree = await getExaminationTree(session, engagementId);
  // Pass initial expanded IDs as prop — avoids Suspense issue for SSR
  return (
    <RbiaExaminationTree
      tree={moduleTree}
      initialExpanded={searchParams.expanded ?? ""}
      engagementId={engagementId}
    />
  );
}
```

### Pitfall 3: Score State Must Live in Client Component, Not Server Component Cache

**What goes wrong:** After an optimistic score update, the server component re-renders with stale data from Next.js cache, overwriting the optimistic state.

**Why it happens:** `revalidatePath` in server action invalidates cache, triggering a server component re-fetch. If the entire tree is a server component, the re-fetch clobbers local optimistic state.

**How to avoid:** The examination tree (`rbia-examination-tree.tsx`) must be a fully client component. The server page fetches initial data and passes it as props. After that, all score state is managed client-side with `useOptimistic`. The server action uses `revalidatePath` only for the module card progress (which is a separate server component on the dashboard).

### Pitfall 4: Working Notes "Save" vs Score Button "Immediate Save" Are Different Actions

**What goes wrong:** The Phase 20 CONTEXT says "explicit Save button" for `saveExaminationResponse`. The Phase 21 CONTEXT says "immediate save with undo toast" for score button clicks. These are reconcilable but must be clearly separated in implementation.

**Why it happens:** Two different user decisions in two different phase contexts.

**How to reconcile:**

- Score button click → calls `saveExaminationResponse` immediately with just the score field (notes = existing notes, flags = existing flags) → optimistic update + undo toast.
- Notes/flags inline row → auditor edits freely → explicit "Save notes" button at bottom of inline row → calls `saveExaminationResponse` with all fields.
- Both call the same server action; the difference is timing and UX affordance.

### Pitfall 5: Filter Must Walk Entire Tree, Not Just Visible Rows

**What goes wrong:** Applying TanStack Table's built-in `globalFilter` to the tree only filters leaf rows that are currently visible (expanded). Hidden children under collapsed parents are not evaluated.

**Why it happens:** TanStack Table's filter functions operate on the row model after expansion, not the full data set.

**How to avoid:** Pre-process the tree data before passing to `useReactTable`. Apply the filter walk on the full `ExaminationTreeNode[]` structure to compute a `Set<string>` of visible node IDs, then pass a `globalFilterFn` that checks membership in this set. Alternatively, when any filter is active, force-expand all parent nodes so all rows are in the row model.

---

## Code Examples

Verified patterns from project codebase and official sources:

### Existing TanStack Table Import Pattern (from `findings-table.tsx`)

```typescript
// Source: /src/components/findings/findings-table.tsx (project codebase)
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
// For Phase 21, ADD:
import {
  getExpandedRowModel,
  type ExpandedState,
  type OnChangeFn,
} from "@tanstack/react-table";
```

### Icon Import Pattern (project convention)

```typescript
// Source: CLAUDE.md — always import from @/lib/icons
import { ChevronRight, ChevronDown, AlertTriangle } from "@/lib/icons";
// NOT: import { ChevronRight } from "lucide-react"
```

### Score Label to Score Value Map (from Phase 18 scoring engine)

```typescript
// Source: Phase 18 scoring engine (src/lib/rbia-scoring.ts or similar)
const SCORE_LABEL_VALUES: Record<ScoreLabel, number> = {
  FULLY_COMPLIANT: 1.0,
  LARGELY_COMPLIANT: 0.75,
  PARTIALLY_COMPLIANT: 0.5,
  NON_COMPLIANT: 0.0,
};

// Display abbreviations for the 4 buttons
const SCORE_LABEL_SHORT: Record<ScoreLabel, string> = {
  FULLY_COMPLIANT: "FC",
  LARGELY_COMPLIANT: "LC",
  PARTIALLY_COMPLIANT: "PC",
  NON_COMPLIANT: "NC",
};

// Traffic-light colors (Tailwind classes)
const SCORE_LABEL_COLORS: Record<ScoreLabel, string> = {
  FULLY_COMPLIANT: "bg-green-500 text-white",
  LARGELY_COMPLIANT: "bg-yellow-400 text-black",
  PARTIALLY_COMPLIANT: "bg-orange-500 text-white",
  NON_COMPLIANT: "bg-red-600 text-white",
};
```

### Module Card Status Derivation

```typescript
// Derive status badge from EngagementModuleScoreRow
function getModuleStatus(
  row: EngagementModuleScoreRow,
): "not_started" | "in_progress" | "complete" {
  if (row.scoredCount === 0) return "not_started";
  if (row.scoredCount >= row.totalLeafCount) return "complete";
  return "in_progress";
}
```

### DAL Functions Available from Phase 19

```typescript
// Source: /src/data-access/rbia-examination.ts
// Returns full hierarchical tree for an engagement
getExaminationTree(session, engagementId): Promise<ExaminationTreeNode[]>
// Returns module-level selections
getModuleSelections(session, engagementId): Promise<EngagementModuleSelection[]>

// Source: /src/data-access/rbia-scoring.ts
// Returns per-module scored/total counts
getEngagementModuleScores(session, engagementId): Promise<EngagementModuleScoreRow[]>
// Returns current or frozen BranchRbiaScore
getEngagementBranchScore(session, engagementId): Promise<BranchRbiaScoreData | null>
```

### Server Action Available from Phase 20

```typescript
// Source: /src/actions/rbia/examination.ts (Phase 20 output)
// Upserts ExaminationResponse — idempotent on engagementId+nodeId
saveExaminationResponse({
  engagementId,
  nodeId,
  scoreLabel,
  score,
  workingNotes?,
  flagForActionPoint?,
  flagForObservation?,
}): Promise<{ success: boolean; error?: string; code?: string }>
```

---

## State of the Art

| Old Approach                                     | Current Approach                                    | When Changed               | Impact                                                    |
| ------------------------------------------------ | --------------------------------------------------- | -------------------------- | --------------------------------------------------------- |
| Custom recursive tree components                 | TanStack Table `getExpandedRowModel` + `getSubRows` | TanStack Table v8 (stable) | Handles expand state, filter model, row IDs automatically |
| `useReducer` + manual rollback for optimistic UI | `useOptimistic` (React 19)                          | React 19 / Next.js 15+     | Built-in rollback; simpler code                           |
| `router.push` for URL state                      | `router.replace` + `useSearchParams`                | Next.js App Router         | No history spam on expand/collapse                        |

**Deprecated/outdated:**

- `react-arborist`: Explicitly out of scope in REQUIREMENTS.md — do not use.
- Manual `<ul>/<li>` recursive tree: Replaced by TanStack Table expanding rows per CONTEXT.md decision.

---

## Open Questions

1. **Phase 20 server action signatures are not yet executed**
   - What we know: Phase 20 plans exist (20-01 through 20-05) and are planned. The CONTEXT.md and RESEARCH.md for Phase 20 fully describe `saveExaminationResponse` signature.
   - What's unclear: Whether Phase 20 has been executed before Phase 21 planning. The stub `/rbia/page.tsx` from Phase 19 exists but no `src/actions/rbia/` directory was found.
   - Recommendation: Phase 21 plans should assume Phase 20 server actions exist (since Phase 21 depends on Phase 20). If Phase 20 is not yet executed, the planner should note this dependency explicitly in each plan. The exact import path will be `@/actions/rbia/examination` based on Phase 20 RESEARCH.md.

2. **ExaminationNode seed completeness**
   - What we know: STATE.md notes "ExaminationNode seed completeness unknown — node count, weights, and applicableBranchTypes for full production tree must be confirmed before Phase 21 can validate tree rendering."
   - What's unclear: How many nodes exist in the seeded tree; whether the full examination set matches the 568-item legacy structure.
   - Recommendation: Plan 21-04 (page implementation) should include a validation step — render the tree with seeded data and verify all 5 depth levels appear. If seed is incomplete, the tree will simply show fewer nodes without breaking the component.

3. **ScoreLabel enum values**
   - What we know: CLAUDE.md specifies `FULLY/LARGELY/PARTIALLY/NON_COMPLIANT`. Phase 18 defines the 4-point scale.
   - What's unclear: Whether the enum values are `FULLY_COMPLIANT` or `FULLY` — REQUIREMENTS.md uses "FULLY / LARGELY / PARTIALLY / NON_COMPLIANT" as display labels.
   - Recommendation: Check `src/generated/prisma/enums.ts` or `prisma/schema.prisma` for exact enum value names before implementing the score button group.

---

## Sources

### Primary (HIGH confidence)

- `/src/data-access/rbia-examination.ts` — `ExaminationTreeNode` type, `getExaminationTree()` signature, `buildTree()` internals
- `/src/data-access/rbia-scoring.ts` — `EngagementModuleScoreRow` type, `getEngagementModuleScores()` signature
- `/src/components/findings/findings-table.tsx` — existing TanStack Table import pattern in this codebase
- `package.json` — `@tanstack/react-table: ^8.21.3` confirmed installed
- `.planning/phases/21-examination-ui/21-CONTEXT.md` — all locked decisions
- `.planning/REQUIREMENTS.md` — EXAM-01, EXAM-02, EXAM-07, EXAM-08 descriptions; out-of-scope list
- `.planning/STATE.md` — accumulated decisions, known blockers
- `.planning/config.json` — `nyquist_validation` not set (false); Validation Architecture section omitted

### Secondary (MEDIUM confidence)

- `.planning/phases/20-server-actions/20-RESEARCH.md` — `saveExaminationResponse` action signature and Phase 20 locked decisions (explicit Save for notes vs immediate for scores)
- TanStack Table v8 docs pattern: `getExpandedRowModel` + `getSubRows` for hierarchical data — consistent with installed version

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries confirmed installed in `package.json`; existing usage in `findings-table.tsx` verified
- Architecture: HIGH — DAL types and return shapes read directly from Phase 19 output files; TanStack Table expanding pattern is the locked decision
- Pitfalls: HIGH — derived from known Next.js App Router constraints (`useSearchParams` + Suspense), TanStack Table row ID behavior, and Phase 20/21 CONTEXT reconciliation

**Research date:** 2026-02-23
**Valid until:** 2026-03-23 (stable libraries; re-check if TanStack Table major version bumps)
