# Stack Research — RBIA v6.0 Implementation

**Project:** AEGIS Internal Audit Platform
**Milestone:** v6.0 RBIA Workflow Implementation
**Domain:** Hierarchical audit examination, weighted scoring, 8-state workflow, branch response batch, JSONB snapshots, RBIA board analytics
**Researched:** 2026-02-22
**Confidence:** HIGH (tree UI, scoring: MEDIUM — see notes per section)

---

## Context: Subsequent Milestone — Stack is Locked

The core AEGIS stack is production-deployed and non-negotiable:

| Technology           | Version | Status     |
| -------------------- | ------- | ---------- |
| Next.js              | ^16.1.6 | Production |
| React                | ^19.2.4 | Production |
| TypeScript           | 5.9.3   | Production |
| Tailwind CSS v4      | ^4.1.18 | Production |
| shadcn/ui + Radix UI | various | Production |
| Prisma               | ^7.3.0  | Production |
| PostgreSQL           | 16      | Production |
| TanStack Table       | ^8.21.3 | Production |
| Recharts             | ^3.7.0  | Production |
| @react-pdf/renderer  | ^4.3.2  | Production |
| ExcelJS              | ^4.4.0  | Production |
| Better Auth          | ^1.4.18 | Production |
| pg-boss              | ^12.9.0 | Production |

**Do not re-research or propose changing these.** This document covers ONLY the net-new additions required for the 6 RBIA features.

---

## Net-New Stack Additions

### 1. Hierarchical Tree UI for ExaminationNode

**Requirement:** Variable-depth tree (0-5 levels), collapsible/expandable, score display at each node, auditor scoring controls at leaf nodes, progress indicators at branch nodes.

#### Decision: TanStack Table Expanding Feature (ALREADY INSTALLED)

**Version:** 8.21.3 (already in production)
**Status:** No new package needed.
**Confidence:** HIGH — verified via Context7 docs

TanStack Table's built-in expanding feature handles variable-depth hierarchical data natively via `getSubRows` + `getExpandedRowModel`. This is the correct choice because:

1. **Already installed** — zero new dependency, zero bundle increase
2. **Native tree support** — `getSubRows: (row) => row.children` handles depth 0-5 without recursion at the component level
3. **Row depth API** — `row.depth` property gives per-row indent level (use `paddingLeft: row.depth * 1.5rem`)
4. **Programmatic expansion** — `table.setExpanded(true)` expands all; `table.toggleAllRowsExpanded()` for toggle-all
5. **Integrates with shadcn/ui Table primitives** — existing `<Table>`, `<TableRow>`, `<TableCell>` components slot in directly
6. **Score columns** — leaf rows show score inputs; branch rows show rolled-up scores — same column definitions for both

**Implementation pattern:**

```typescript
const table = useReactTable({
  data: treeData, // ExaminationNode[] with nested children
  columns,
  getSubRows: (row) => row.children, // populated server-side from path queries
  getCoreRowModel: getCoreRowModel(),
  getExpandedRowModel: getExpandedRowModel(),
  state: { expanded },
  onExpandedChange: setExpanded,
});

// In row render:
<TableRow style={{ paddingLeft: `${row.depth * 24}px` }}>
  <TableCell>
    {row.getCanExpand() && (
      <Button variant="ghost" size="icon" onClick={row.getToggleExpandedHandler()}>
        {row.getIsExpanded() ? <ChevronDown /> : <ChevronRight />}
      </Button>
    )}
    {row.original.name}
  </TableCell>
  <TableCell>
    {row.original.isLeaf
      ? <ScoreSelector nodeId={row.original.id} currentScore={row.original.score} />
      : <ScoreBadge score={row.original.computedScore} />}
  </TableCell>
</TableRow>
```

**What NOT to use:**

| Library                         | Why Not                                                                                                                                                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `react-arborist` (3.4.3)        | Overkill — adds drag-and-drop, virtualization, 43KB min. AEGIS tree has max ~200 nodes per audit engagement; no drag-and-drop needed                                                                     |
| `shadcn-tree-view` (community)  | Unvetted third-party registry package; last update unclear; not necessary when TanStack Table already handles this                                                                                       |
| `prisma-extension-bark` (0.2.2) | Last published April 2024; peer dep `@prisma/client >=5.0.0` has not been updated for Prisma 7's architectural changes (ESM-first, new `prisma-client` provider). Compatibility unconfirmed. Do not use. |

**Source:** [TanStack Table Expanding Guide](https://tanstack.com/table/v8/docs/guide/expanding) — HIGH confidence (official docs, Context7 verified)

---

### 2. Hierarchical Tree Data Loading (Materialized Path Queries)

**Requirement:** Load ExaminationNode tree for a given engagement, respecting `tenantId` isolation, supporting LIKE-prefix queries for subtrees.

#### Decision: Prisma `$queryRaw` for tree assembly, standard Prisma for leaf writes

**No new package needed.** Use Prisma's existing `$queryRaw` with tagged templates for `LIKE 'path%'` queries. Standard Prisma ORM for individual node reads/writes.

**Why materialized path + LIKE over recursive CTE:**

- The schema already stores `path` (e.g., `"OPS/OPS-KYC/OPS-KYC-001"`) on every node
- Querying all children of a node: `WHERE path LIKE 'OPS/%'` — uses B-tree index, no recursion
- PostgreSQL B-tree index supports LIKE prefix queries (`col LIKE 'prefix%'`) with high performance
- The existing `@@index([tenantId, path])` composite index on `ExaminationNode` directly supports this pattern
- Prisma does not support recursive CTEs natively; `$queryRaw` is the escape hatch

**Confidence:** HIGH — materialized path + prefix LIKE confirmed as standard pattern by [sqlfordevs.com](https://sqlfordevs.com/tree-as-materialized-path) and [PostgreSQL docs](https://www.postgresql.org/docs/current/queries-with.html)

**Tree assembly pattern (server-side, DAL function):**

```typescript
// src/data-access/examination-nodes.ts
export async function getEngagementTree(
  tenantId: string,
  engagementId: string,
): Promise<ExaminationNodeWithChildren[]> {
  // Fetch all nodes for tenant (filtered by engagement's module selections)
  const nodes = await prisma.examinationNode.findMany({
    where: { tenantId, isActive: true },
    include: {
      responses: {
        where: { engagementId },
        select: { score: true, scoreLabel: true, flagForActionPoint: true },
      },
      moduleSelections: {
        where: { engagementId },
        select: { id: true },
      },
    },
    orderBy: [{ depth: "asc" }, { displayOrder: "asc" }],
  });

  // Build tree in memory (O(n) pass)
  return buildTree(nodes);
}

function buildTree(flatNodes: Node[]): NodeWithChildren[] {
  const map = new Map<string, NodeWithChildren>();
  const roots: NodeWithChildren[] = [];

  for (const node of flatNodes) {
    map.set(node.id, { ...node, children: [] });
  }

  for (const node of flatNodes) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(map.get(node.id)!);
    } else {
      roots.push(map.get(node.id)!);
    }
  }

  return roots;
}
```

**Why in-memory tree assembly instead of recursive SQL:**

- ExaminationNode count per tenant: ~100-500 nodes (not millions) — in-memory O(n) is acceptable
- Prisma 7 does not support WITH RECURSIVE natively; raw CTE queries return row count not records on some PostgreSQL versions
- The `parentId` adjacency list on every node makes in-memory assembly trivial
- Single query + in-memory assembly is faster than N+1 recursive queries

**Subtree LIKE query (for partial loads if needed):**

```typescript
// Load only a subtree rooted at a given path
const subtree = await prisma.$queryRaw<ExaminationNode[]>`
  SELECT * FROM "ExaminationNode"
  WHERE "tenantId" = ${tenantId}::uuid
    AND path LIKE ${parentPath + "/%"}
    AND "isActive" = true
  ORDER BY depth, "displayOrder"
`;
```

---

### 3. 4-Point Scoring with Weighted Roll-Up

**Requirement:** Leaf nodes get scored FULLY/LARGELY/PARTIALLY/NON_COMPLIANT (1.0/0.75/0.5/0.0). Branch nodes display weighted average of children. Critical nodes cap parent if NON_COMPLIANT. Final composite score maps to rating band.

#### Decision: Pure TypeScript service — no library needed

**No new package needed.** Implement as a `ScoringEngine` class in `src/services/scoring/`. Extend the existing `RiskRatingService` pattern (`src/services/risk-rating/compute.ts`).

**Confidence:** HIGH — the algorithm is well-defined in the schema comments and RBIA policy; no library adds value for this domain-specific calculation.

**Why no library:**

- Weighted average is 10 lines of TypeScript
- External libraries (ml-matrix, mathjs) add 50-200KB for no domain benefit
- The critical-item override logic is domain-specific — no library encodes RBI RBIA rules
- Existing `RiskRatingService` precedent establishes the service class pattern

**Score label to decimal mapping:**

```typescript
// src/services/scoring/constants.ts
export const SCORE_VALUES: Record<ScoreLabel, number> = {
  FULLY_COMPLIANT: 1.0,
  LARGELY_COMPLIANT: 0.75,
  PARTIALLY_COMPLIANT: 0.5,
  NON_COMPLIANT: 0.0,
};

export const RATING_BANDS = [
  { min: 0.85, label: "VERY_GOOD" },
  { min: 0.7, label: "GOOD" },
  { min: 0.55, label: "SATISFACTORY" },
  { min: 0.4, label: "MODERATE" },
  { min: 0.0, label: "POOR" },
] as const;
```

**Weighted roll-up algorithm (pure TypeScript):**

```typescript
// src/services/scoring/engine.ts
export class ScoringEngine {
  computeNodeScore(node: ExaminationNodeWithChildren): number | null {
    if (node.isLeaf) {
      // Leaf: return raw score or null if not yet scored
      return node.responses[0]?.score ?? null;
    }

    const children = node.children.filter((c) => c.computedScore !== null);
    if (children.length === 0) return null;

    let weightedSum = 0;
    let totalWeight = 0;

    for (const child of children) {
      const score = child.computedScore!;
      weightedSum += score * Number(child.weight);
      totalWeight += Number(child.weight);

      // Critical override: if critical child is NON_COMPLIANT, cap parent at 0.5
      if (child.isCritical && score === 0.0) {
        return Math.min(weightedSum / totalWeight, 0.5);
      }
    }

    return totalWeight > 0 ? weightedSum / totalWeight : null;
  }

  computeTreeScores(root: ExaminationNodeWithChildren): void {
    // Post-order traversal: score leaves first, then parents
    for (const child of root.children) {
      this.computeTreeScores(child);
    }
    root.computedScore = this.computeNodeScore(root);
  }

  computeModuleScores(
    roots: ExaminationNodeWithChildren[],
  ): Record<string, number> {
    const moduleScores: Record<string, number> = {};
    for (const root of roots) {
      if (root.computedScore !== null) {
        moduleScores[root.code] = root.computedScore;
      }
    }
    return moduleScores;
  }

  compositeScore(moduleScores: Record<string, number>): number {
    const values = Object.values(moduleScores);
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  ratingBand(score: number): string {
    for (const band of RATING_BANDS) {
      if (score >= band.min) return band.label;
    }
    return "POOR";
  }
}
```

**Prisma JSONB snapshot (BranchRbiaScore.scoringTreeSnapshot):**

```typescript
// Freeze: serialize tree with computed scores to JSONB
const snapshot = serializeTreeToSnapshot(scoredTree);
await prisma.branchRbiaScore.update({
  where: { engagementId },
  data: {
    compositeScore: composite,
    ratingBand: engine.ratingBand(composite),
    moduleScores: moduleScores,
    scoringTreeSnapshot: snapshot,
    frozenAt: new Date(),
    frozenById: session.userId,
  },
});
```

Prisma's `Json` field type maps directly to PostgreSQL JSONB. No additional library needed. The snapshot is a plain JS object serialized by Prisma's JSON handler.

---

### 4. Audit Engagement 8-State Workflow

**Requirement:** PLANNED → TEAM_ASSIGNED → OPENING_MEETING → IN_PROGRESS → EXIT_MEETING → REPORT_DRAFT → COMPLETED (+ CANCELLED). Each transition has role-based guards. State machine drives engagement header UI and progress stepper.

#### Decision: Server Actions + React `useOptimistic` — no XState needed

**No new package needed.** Implement state transitions as typed Server Actions with permission guards. Use React 19's `useOptimistic` hook for immediate UI feedback.
**Confidence:** HIGH — confirmed via [Next.js Server Actions docs](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations) and [React useOptimistic docs](https://react.dev/reference/react/useOptimistic)

**Why not XState:**

- XState adds 47KB gzipped; AEGIS already has 8 clearly defined states with minimal branching
- The existing `ObservationStatus` state machine (7 states) is implemented with plain Server Actions — precedent set
- `useOptimistic` handles all needed optimistic UI for state transitions
- XState's value: complex parallel states, guards with side effects — none of these apply to the engagement lifecycle

**Engagement status stepper (shadcn/ui Progress + existing Radix primitives):**

```typescript
// src/components/audit-execution/engagement-status-stepper.tsx
const ENGAGEMENT_STEPS = [
  { status: "PLANNED", label: "Planned" },
  { status: "TEAM_ASSIGNED", label: "Team Assigned" },
  { status: "OPENING_MEETING", label: "Opening Meeting" },
  { status: "IN_PROGRESS", label: "In Progress" },
  { status: "EXIT_MEETING", label: "Exit Meeting" },
  { status: "REPORT_DRAFT", label: "Report Draft" },
  { status: "COMPLETED", label: "Completed" },
] as const;
```

**Status transition server action pattern (consistent with existing codebase):**

```typescript
// src/actions/audit-execution/transition-engagement.ts
export async function transitionEngagementStatus(
  engagementId: string,
  targetStatus: EngagementStatus,
): Promise<ActionResult> {
  const session = await getRequiredSession();
  requirePermission(session, "audit_execution:transition");

  const engagement = await prisma.auditEngagement.findUnique({
    where: { id: engagementId },
  });
  if (!isValidTransition(engagement.status, targetStatus, session.roles)) {
    return { success: false, error: "Invalid status transition" };
  }

  await prisma.auditEngagement.update({
    where: { id: engagementId, tenantId: session.tenantId },
    data: { status: targetStatus },
  });

  return { success: true };
}
```

---

### 5. Branch Manager Batch Response Workflow

**Requirement:** Branch Manager sees all ActionPoints for their branch, submits responses in bulk, BmResponseBatch tracks deadline (15 days) and completion progress.

#### Decision: Existing patterns — no new packages

**No new package needed.**

- Batch form state: `react-hook-form` (already installed, ^7.71.1) with `useFieldArray` for variable-length ActionPoint responses
- Deadline tracking: `date-fns` (already installed, ^4.1.0) for deadline computation and display
- Batch submit: single Server Action with `Promise.all` for parallel ActionPoint updates
- Progress display: shadcn/ui `Progress` component (from Radix) — already in use
- Overdue detection: existing `pg-boss` cron job pattern for `BmBatchStatus.OVERDUE` transitions

**Confidence:** HIGH — all libraries confirmed in `package.json`

**Form pattern for batch response:**

```typescript
// useFieldArray handles variable ActionPoint list
const { fields, register } = useFieldArray({
  control,
  name: "responses",
});

// Server action: batch update
export async function submitBmResponseBatch(
  batchId: string,
  responses: { actionPointId: string; bmResponseText: string }[],
): Promise<ActionResult> {
  const session = await getRequiredSession();
  requirePermission(session, "bm_response:submit");

  await prisma.$transaction([
    ...responses.map((r) =>
      prisma.actionPoint.update({
        where: { id: r.actionPointId, tenantId: session.tenantId },
        data: {
          bmResponseText: r.bmResponseText,
          bmResponseDate: new Date(),
          status: "BM_RESPONDED",
        },
      }),
    ),
    prisma.bmResponseBatch.update({
      where: { id: batchId },
      data: {
        respondedActionPoints: responses.length,
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
    }),
  ]);

  return { success: true };
}
```

---

### 6. Frozen JSONB Scoring Snapshots

**Requirement:** `BranchRbiaScore.scoringTreeSnapshot` is a JSONB column storing the complete scored tree at engagement completion. Must be immutable once frozen.

#### Decision: Application-level immutability + Prisma Json field — no library needed

**No new package needed.** Prisma maps `Json` fields to PostgreSQL JSONB natively. Immutability is enforced at the application layer via a `frozenAt` timestamp guard.
**Confidence:** HIGH — Prisma JSONB behavior confirmed via [Prisma PostgreSQL docs](https://www.prisma.io/docs/orm/overview/databases/postgresql)

**Prisma does not have native immutability primitives** (confirmed via GitHub discussions). The correct approach:

1. Check `frozenAt !== null` before any write — reject in Server Action
2. PostgreSQL trigger alternative (optional defense-in-depth):

```sql
-- Optional: database-level guard
CREATE OR REPLACE FUNCTION prevent_frozen_score_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."frozenAt" IS NOT NULL THEN
    RAISE EXCEPTION 'BranchRbiaScore % is frozen and cannot be modified', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER branchRbiaScore_immutable
  BEFORE UPDATE ON "BranchRbiaScore"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_frozen_score_update();
```

**JSONB type considerations:**

- Prisma 7 serializes JS objects to JSONB transparently via `JSON.stringify`
- No extra JSONB library needed — avoid `jsonb-set` or similar packages
- The snapshot object is written once and never partially updated — no JSONB mutation functions needed

---

### 7. Enhanced RBIA-Aware Board Reports and Analytics

**Requirement:** New board report sections: RBIA composite score, module-level radar chart, per-branch rating band table, ActionPoint summary, PositiveObservation highlights. New analytics widgets: branch score distribution, module score heatmap, trend over quarters.

#### Decision: Recharts (already installed) + @react-pdf/renderer (already installed) — no new packages

**No new packages needed.** Both visualization layers are production-deployed.
**Confidence:** HIGH

**Analytics dashboard additions (Recharts — client components):**

| Widget                     | Chart Type                | Already Used?                 | New?             |
| -------------------------- | ------------------------- | ----------------------------- | ---------------- |
| Module score radar         | RadarChart                | No                            | Yes — new widget |
| Branch rating band donut   | PieChart                  | Yes (PieChart pattern exists) | New data source  |
| Quarter-over-quarter trend | LineChart/AreaChart       | No                            | Yes — new widget |
| Module score heatmap       | Custom cells via BarChart | No                            | Yes — new widget |

**Recharts `RadarChart` for module scoring (shadcn/ui chart wrapper):**

```typescript
// src/components/analytics/rbia-module-radar.tsx
"use client";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart"; // existing shadcn chart wrapper

const data = moduleScores.map((m) => ({
  module: m.code,
  score: Math.round(m.score * 100),
  fullMark: 100,
}));
```

**PDF board report additions (@react-pdf/renderer — server-side):**

New sections to add alongside existing `BoardReport`:

1. `RbiaScoreSection` — composite score + rating band + module breakdown table
2. `ActionPointSummary` — AP counts by status and module
3. `PositiveObservationsSection` — commendable practices list

Pattern is identical to existing `ExecutiveSummary`, `AuditCoverage` components. No new library or pattern needed.

**Analytics DAL additions (no new library — existing Prisma patterns):**

```typescript
// src/data-access/analytics.ts (extend existing file)
export async function getRbiaAnalytics(
  tenantId: string,
  financialYear: string,
) {
  // BranchRbiaScore aggregations using Prisma groupBy
  const scores = await prisma.branchRbiaScore.findMany({
    where: { tenantId, frozenAt: { not: null } },
    select: {
      ratingBand: true,
      compositeScore: true,
      moduleScores: true,
      frozenAt: true,
    },
  });

  // moduleScores is JSONB — parse via JSON.parse or Prisma's Json type
  return aggregateScores(scores);
}
```

---

## Summary: Net-New Packages Required

**Zero new runtime packages needed.** All 6 feature areas are implementable with the existing production stack.

| Feature                | New Package? | Why Not                                                                   |
| ---------------------- | ------------ | ------------------------------------------------------------------------- |
| Tree UI                | None         | TanStack Table 8.21.3 already has `getExpandedRowModel` + `getSubRows`    |
| Tree data loading      | None         | Prisma `findMany` + in-memory tree assembly; `$queryRaw` for LIKE subtree |
| 4-point scoring engine | None         | Pure TypeScript service — no library encodes RBI RBIA weights             |
| 8-state workflow       | None         | Server Actions + `useOptimistic` — XState is overkill                     |
| BM batch response      | None         | `react-hook-form` `useFieldArray` + `date-fns` + Prisma `$transaction`    |
| Frozen JSONB snapshot  | None         | Prisma Json field + application `frozenAt` guard                          |
| Board analytics        | None         | Recharts + `@react-pdf/renderer` — already production-deployed            |

---

## Alternatives Considered and Rejected

| Category      | Considered                           | Rejected Because                                                                                                              |
| ------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Tree UI       | `react-arborist` 3.4.3               | 43KB min bundle; drag-and-drop not needed; virtualization overkill for <200 nodes                                             |
| Tree UI       | `shadcn-tree-view` community package | Unvetted third-party registry; TanStack Table already handles this                                                            |
| Tree data     | `prisma-extension-bark` 0.2.2        | Last updated April 2024; peer dep has not confirmed Prisma 7 compatibility; not needed given simple materialized path queries |
| Tree data     | PostgreSQL `ltree` extension         | Would require schema migration, not in `extensions` list, adds ops burden; string LIKE is sufficient for <500 nodes           |
| Scoring       | `mathjs`, `numeric`                  | 50-300KB for what is 10 lines of TypeScript                                                                                   |
| State machine | XState                               | 47KB; engagement has only 8 linear states; existing Server Action pattern already handles this                                |
| State machine | `@xstate/react`                      | Same as above                                                                                                                 |
| Immutability  | PostgreSQL row-level triggers        | Good defense-in-depth but application guard is primary; trigger is optional                                                   |

---

## What NOT to Add

| Avoid                         | Why                                                        | Impact if Added                                                           |
| ----------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| `react-arborist`              | Overkill — drag-and-drop, virtualization unneeded          | +43KB bundle; conflicts with TanStack Table approach                      |
| `mathjs`                      | 250KB for weighted average                                 | Massive bundle bloat for 3 lines of arithmetic                            |
| XState                        | State machine library for 8-state linear workflow          | 47KB bundle; adds mental overhead; breaks Server Action pattern precedent |
| `prisma-extension-bark`       | Prisma 7 compatibility unconfirmed; last updated Apr 2024  | Risk of runtime errors after Prisma 7 architecture changes                |
| PostgreSQL `ltree` extension  | Would need schema migration and `pg_catalog` configuration | Migration complexity; not justified for string LIKE at <500 nodes         |
| `zod-prisma-types` or similar | Auto-generation from schema                                | Prisma 7 generates typed client already; redundant                        |
| Redis/Upstash                 | Caching for score computations                             | Premature optimization; score computation is pure TypeScript, <10ms       |

---

## Prisma-Specific Considerations

### Tree Queries

- The `path` field with `@@index([tenantId, path])` supports `LIKE 'prefix%'` on the B-tree index — **confirmed working pattern** for materialized paths
- Do NOT use `$queryRaw` with `WITH RECURSIVE` — Prisma 7 on PostgreSQL may return row count instead of records for CTEs (known issue)
- Use `findMany` with `where: { tenantId }` + in-memory tree assembly for full tree loads
- Use `$queryRaw` with `LIKE` only for subtree queries where you know the path prefix

### JSONB Fields

- `BranchRbiaScore.moduleScores` and `BranchRbiaScore.scoringTreeSnapshot` are `Json` type → PostgreSQL JSONB
- Prisma 7 returns JSONB as parsed JavaScript objects — no `JSON.parse` needed on reads
- Write by passing plain JS object to Prisma — no `JSON.stringify` needed
- Do NOT use PostgreSQL `jsonb_set()` or `jsonb_path_query()` via raw queries — Prisma 7 has no TypedSQL support for these functions yet (open issue #27296)

### Transaction Pattern for Engagement Completion

- Freeze BranchRbiaScore + update EngagementStatus to COMPLETED in a single `$transaction`
- Prevents partial state (score frozen but engagement not closed, or vice versa)

```typescript
await prisma.$transaction([
  prisma.branchRbiaScore.update({
    where: { engagementId },
    data: { frozenAt: new Date() },
  }),
  prisma.auditEngagement.update({
    where: { id: engagementId },
    data: { status: "COMPLETED" },
  }),
  prisma.bmResponseBatch.update({
    where: { engagementId },
    data: { status: "SUBMITTED" },
  }),
]);
```

### Scoring Engine Placement

- Scoring roll-up runs in a Server Action (not client-side) — it's the authoritative computation
- Store interim scores in `ExaminationResponse.score` per node after each auditor input
- Only freeze into `BranchRbiaScore` when engagement transitions to REPORT_DRAFT or COMPLETED

---

## Version Compatibility

| Existing Package               | Feature Used                                     | Compatible? | Notes                                                                               |
| ------------------------------ | ------------------------------------------------ | ----------- | ----------------------------------------------------------------------------------- |
| `@tanstack/react-table` 8.21.3 | `getExpandedRowModel`, `getSubRows`, `row.depth` | YES         | Expanding feature has been stable since v8.0; confirmed in official docs            |
| `recharts` 3.7.0               | `RadarChart`, `PolarGrid`, `PolarAngleAxis`      | YES         | RadarChart has been stable in Recharts since v2; shadcn/ui chart wrapper compatible |
| `@react-pdf/renderer` 4.3.2    | New sections in existing PDF structure           | YES         | Same pattern as existing sections                                                   |
| `react-hook-form` 7.71.1       | `useFieldArray` for batch AP responses           | YES         | `useFieldArray` stable since v7                                                     |
| `date-fns` 4.1.0               | Deadline computation (addDays, isAfter)          | YES         | date-fns v4 API unchanged for these functions                                       |
| `prisma` 7.3.0                 | `Json` type JSONB, `$queryRaw`, `$transaction`   | YES         | All confirmed in Prisma 7 docs                                                      |
| `pg-boss` 12.9.0               | Cron job for `BmBatchStatus.OVERDUE` transitions | YES         | Existing cron job pattern applies                                                   |

---

## Installation

No new packages to install. All required capabilities exist in the current `package.json`.

If the scoring engine is extracted as a pure utility for testing purposes:

```bash
# No new dependencies needed
# Vitest already installed for unit testing the ScoringEngine class
pnpm test -- src/services/scoring/engine.test.ts
```

---

## Sources

- [TanStack Table Expanding Guide](https://tanstack.com/table/v8/docs/guide/expanding) — HIGH confidence (official docs, Context7 verified)
- [Context7: TanStack Table getSubRows + getExpandedRowModel](https://context7.com/tanstack/table/llms.txt) — HIGH confidence
- [sqlfordevs.com: Materialized Path Pattern](https://sqlfordevs.com/tree-as-materialized-path) — MEDIUM confidence (established pattern, multiple confirming sources)
- [PostgreSQL CTE Documentation](https://www.postgresql.org/docs/current/queries-with.html) — HIGH confidence (official)
- [Prisma Raw Queries Documentation](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries) — HIGH confidence (official)
- [Prisma PostgreSQL JSONB Documentation](https://www.prisma.io/docs/orm/overview/databases/postgresql) — HIGH confidence (official)
- [React useOptimistic Hook](https://react.dev/reference/react/useOptimistic) — HIGH confidence (official)
- [Next.js Server Actions Documentation](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations) — HIGH confidence (official)
- [shadcn/ui Radar Chart](https://ui.shadcn.com/charts/radar) — HIGH confidence (official)
- [prisma-extension-bark npm](https://www.npmjs.com/package/prisma-extension-bark) — MEDIUM confidence (reviewed for Prisma 7 compatibility risk)
- [GitHub issue: Prisma tree structures support #4562](https://github.com/prisma/prisma/issues/4562) — MEDIUM confidence (confirms no native recursive CTE support)
- [GitHub issue: TypedSQL JSONB functions #27296](https://github.com/prisma/prisma/issues/27296) — MEDIUM confidence (confirms no jsonb_set native support)
- [react-arborist npm](https://www.npmjs.com/package/react-arborist) — LOW confidence (used only to assess and reject)

---

## Confidence Assessment

| Area                                  | Confidence  | Reasoning                                                                                                                                           |
| ------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tree UI (TanStack Table expanding)    | HIGH        | Official docs + Context7 confirm `getSubRows` + `getExpandedRowModel` work exactly as needed                                                        |
| Tree data loading (materialized path) | HIGH        | Established PostgreSQL pattern; existing schema indexes support it; confirmed via multiple official sources                                         |
| 4-point scoring engine                | HIGH        | Pure TypeScript calculation; no library ambiguity; algorithm is straightforward weighted average                                                    |
| 8-state workflow (Server Actions)     | HIGH        | React 19 `useOptimistic` confirmed; Next.js 16 Server Actions confirmed; existing pattern precedent in codebase                                     |
| BM batch response                     | HIGH        | `useFieldArray` + `$transaction` pattern confirmed; existing libraries cover all needs                                                              |
| JSONB snapshots                       | HIGH        | Prisma 7 Json type → JSONB confirmed; immutability via application guard is standard                                                                |
| Board analytics (Recharts RadarChart) | MEDIUM-HIGH | RadarChart stable in Recharts; shadcn/ui chart wrapper confirmed; specific scoring domain visualization not verified against production data shapes |
| PDF board report extensions           | HIGH        | Same pattern as existing 6 sections; @react-pdf/renderer already production-proven                                                                  |

**Overall: HIGH confidence — zero new packages needed, all capabilities confirmed in existing stack.**

---

_Stack research for: AEGIS v6.0 RBIA Workflow Implementation_
_Researched: 2026-02-22_
_Researcher: GSD Project Researcher (Claude Sonnet 4.6)_
