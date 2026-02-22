# Architecture Research: AEGIS v6.0 RBIA Implementation

**Domain:** RBIA audit workflow integration — Next.js 16 App Router, multi-tenant SaaS
**Researched:** 2026-02-22
**Confidence:** HIGH (based on direct codebase inspection; all patterns verified against existing src/)

---

## Standard Architecture

The existing codebase already establishes a mature layered architecture. v6.0 adds new models but does not change the architecture — it extends it. Every new piece must follow the patterns already in production.

### System Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                       BROWSER (Client Layer)                          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │  "use client" │  │ Client       │  │ Zustand      │                 │
│  │  components  │  │ event handlers│  │ stores       │                 │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘                │
│         │ props            │ server actions                            │
└─────────┼────────────────┬┘───────────────────────────────────────────┘
          │                │
┌─────────▼────────────────▼───────────────────────────────────────────┐
│                   NEXT.JS APP ROUTER (Server Layer)                   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  middleware.ts — cookie check only (edge-compatible)          │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │  src/app/(dashboard)/ — Server Components (Pages)            │     │
│  │  Every page: getRequiredSession() → DAL → pass props         │     │
│  └──────────────────────┬──────────────────────────────────────┘     │
│                         │                                             │
│  ┌──────────────────────▼──────────────────────────────────────┐     │
│  │  src/actions/ — Server Actions ("use server")                │     │
│  │  Auth → Permission → Zod validate → DB transaction           │     │
│  └──────────────────────┬──────────────────────────────────────┘     │
│                         │                                             │
│  ┌──────────────────────▼──────────────────────────────────────┐     │
│  │  src/data-access/ — DAL ("server-only")                      │     │
│  │  All queries: prismaForTenant(tenantId) + WHERE tenantId     │     │
│  └──────────────────────┬──────────────────────────────────────┘     │
│                         │                                             │
│  ┌──────────────────────▼──────────────────────────────────────┐     │
│  │  src/lib/ — Pure business logic engines                      │     │
│  │  state-machine.ts, ram-engine.ts, escalation-engine.ts       │     │
│  │  rbia-scoring-engine.ts (NEW v6.0)                           │     │
│  └──────────────────────┬──────────────────────────────────────┘     │
└────────────────────────┬┘───────────────────────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────────────────────┐
│               PostgreSQL 16 (Data Layer)                            │
│  prisma/schema.prisma — 71 models, 20 enums                        │
│  Application-level tenant isolation via WHERE tenantId             │
│  Audit triggers via setAuditContext() + PL/pgSQL                   │
└────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component                             | Responsibility                                                        | Communicates With                                          |
| ------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Page (server component)**           | Auth check, permission gate, data fetch, compose layout               | DAL functions, client components via props                 |
| **Client component**                  | Interactive UI: forms, trees, tabs, modals                            | Server actions (mutations), Zustand stores (local state)   |
| **DAL function** (`data-access/*.ts`) | Tenant-scoped DB queries, joins, aggregations                         | `prismaForTenant()`, returns typed result to page          |
| **Server action** (`actions/**/*.ts`) | Mutations: auth → permissions → Zod → DB transaction → revalidatePath | DAL helpers, `prismaForTenant()`, `setAuditContext()`      |
| **Pure engine** (`lib/*.ts`)          | Stateless computation: scoring, state transitions, escalation logic   | Called from server actions and DAL functions; no DB access |
| **Prisma client**                     | Singleton pool (max 25 connections), application-level tenant filter  | PostgreSQL 16                                              |

---

## Recommended Project Structure (v6.0 additions)

The existing structure is sound. v6.0 adds files alongside existing ones — no restructuring needed.

```
src/
├── data-access/
│   ├── audit-execution.ts          # EXISTS — add v6.0 queries here (ExaminationNode, ExaminationResponse)
│   ├── rbia-examination.ts         # NEW — ExaminationNode tree queries
│   ├── rbia-scoring.ts             # NEW — ExaminationResponse + BranchRbiaScore queries
│   ├── rbia-findings.ts            # NEW — ActionPoint + PositiveObservation queries
│   ├── rbia-meetings.ts            # NEW — EngagementMeeting queries
│   └── rbia-module-selection.ts    # NEW — EngagementModuleSelection queries
│
├── actions/
│   ├── audit-execution/
│   │   ├── update-engagement-status.ts  # MODIFY — expand VALID_TRANSITIONS for 8 states
│   │   ├── create-engagement.ts         # EXISTS — no change needed
│   │   └── rbia/                        # NEW subfolder for v6.0 actions
│   │       ├── schemas.ts               # NEW — Zod schemas for all v6.0 mutations
│   │       ├── save-examination-response.ts  # NEW — upsert ExaminationResponse
│   │       ├── select-modules.ts             # NEW — EngagementModuleSelection CRUD
│   │       ├── record-meeting.ts             # NEW — EngagementMeeting create/update
│   │       ├── create-action-point.ts        # NEW — ActionPoint create/update lifecycle
│   │       ├── submit-bm-response.ts         # NEW — BM batch response
│   │       ├── freeze-rbia-score.ts          # NEW — BranchRbiaScore freeze
│   │       ├── create-positive-observation.ts # NEW
│   │       └── promote-to-observation.ts     # NEW — flagForObservation → Observation
│   │
├── lib/
│   ├── state-machine.ts            # EXISTS (Observation lifecycle) — DO NOT MODIFY
│   ├── ram-engine.ts               # EXISTS — DO NOT MODIFY
│   ├── escalation-engine.ts        # EXISTS — DO NOT MODIFY
│   ├── rbia-scoring-engine.ts      # NEW — weighted roll-up from leaf to root
│   └── engagement-state-machine.ts # NEW — 8-state engagement lifecycle rules
│
├── app/(dashboard)/
│   ├── audit-execution/
│   │   ├── [engagementId]/
│   │   │   ├── page.tsx            # MODIFY — detect v6.0 vs legacy mode
│   │   │   ├── sections/           # EXISTS (legacy) — preserve during transition
│   │   │   ├── rbia/               # NEW subfolder for v6.0 execution pages
│   │   │   │   ├── page.tsx        # NEW — RBIA engagement dashboard (module grid)
│   │   │   │   ├── module/
│   │   │   │   │   └── [moduleCode]/
│   │   │   │   │       └── page.tsx  # NEW — examination tree + scoring within a module
│   │   │   │   ├── findings/
│   │   │   │   │   └── page.tsx    # NEW — ActionPoints list for this engagement
│   │   │   │   ├── meetings/
│   │   │   │   │   └── page.tsx    # NEW — Opening/Exit meeting forms
│   │   │   │   └── score/
│   │   │   │       └── page.tsx    # NEW — composite score dashboard + freeze
│   │   │   └── report/
│   │   │       └── page.tsx        # MODIFY — add RBIA score section to report
│
├── components/
│   ├── audit-execution/            # EXISTS — add alongside existing files
│   │   ├── examination-form.tsx    # EXISTS (legacy AuditExaminationResponse)
│   │   ├── rbia-module-grid.tsx    # NEW — module selection checklist with status badges
│   │   ├── rbia-examination-tree.tsx  # NEW — recursive tree with 4-point scoring
│   │   ├── rbia-score-panel.tsx    # NEW — per-module score + composite score display
│   │   ├── action-points-table.tsx # NEW — ActionPoint list + status transitions
│   │   ├── action-point-form.tsx   # NEW — create/edit ActionPoint
│   │   ├── bm-response-panel.tsx   # NEW — BM batch response UI
│   │   ├── meeting-form.tsx        # NEW — Opening/Exit meeting record form
│   │   └── score-freeze-dialog.tsx # NEW — confirm BranchRbiaScore freeze
│   │
│   └── reports/                   # EXISTS
│       └── rbia-score-section.tsx  # NEW — RBIA score breakdown for board report PDF
```

### Structure Rationale

- **`data-access/rbia-*.ts`:** Separate files per domain concern (examination tree, scoring, findings, meetings) rather than one fat file. Mirrors existing pattern (`audit-execution.ts`, `observations.ts`, `compliance.ts`).
- **`actions/audit-execution/rbia/`:** New subfolder keeps v6.0 mutations isolated from existing audit-execution actions. Avoids polluting existing `schemas.ts` with 10+ new schemas.
- **`lib/rbia-scoring-engine.ts`:** Pure function engine (no DB access) matching the pattern of `ram-engine.ts` and `escalation-engine.ts`. Can be unit-tested without DB.
- **`lib/engagement-state-machine.ts`:** Separate from `state-machine.ts` (Observation lifecycle). The Engagement lifecycle is a different entity with different roles and guards — keeping them in separate files prevents confusion and merge conflicts.
- **`app/(dashboard)/audit-execution/[engagementId]/rbia/`:** New sub-routes under the same engagement URL prefix. The existing `[engagementId]/page.tsx` routes to `/rbia/` for RBIA-type engagements and to `/sections/` for legacy RBIA types.

---

## Architectural Patterns

### Pattern 1: Weighted Score Roll-Up Engine (Pure Function)

**What:** A pure TypeScript function that accepts a flat list of `{nodeId, parentId, weight, isCritical, score}` records and computes the composite score tree bottom-up from leaf nodes to the root.

**When to use:** Called from server actions after each `ExaminationResponse` save, and at report generation time to produce `BranchRbiaScore.scoringTreeSnapshot`.

**Trade-offs:** Pure function is testable and portable. DB query to fetch the full tree must happen before calling the engine — the engine itself does no DB work.

**Example:**

```typescript
// src/lib/rbia-scoring-engine.ts

export const SCORE_VALUES: Record<string, number> = {
  FULLY_COMPLIANT: 1.0,
  LARGELY_COMPLIANT: 0.75,
  PARTIALLY_COMPLIANT: 0.5,
  NON_COMPLIANT: 0.0,
};

export const RATING_BANDS = [
  { min: 0.9, max: 1.0, label: "VERY_GOOD" },
  { min: 0.75, max: 0.89, label: "GOOD" },
  { min: 0.6, max: 0.74, label: "SATISFACTORY" },
  { min: 0.45, max: 0.59, label: "MODERATE" },
  { min: 0.0, max: 0.44, label: "POOR" },
] as const;

export interface ScoringNode {
  id: string;
  parentId: string | null;
  weight: number; // Within parent group (Decimal from DB, parsed to number)
  isCritical: boolean;
  score: number | null; // NULL = not yet scored (leaf only)
  isLeaf: boolean;
  depth: number;
  code: string;
  name: string;
}

export interface ComputedNode extends ScoringNode {
  computedScore: number | null; // NULL if any leaf in subtree is unscored
  completionPct: number; // 0-100, % of leaves scored
}

/**
 * Roll up scores from leaf to root.
 * Algorithm:
 *   - Leaf: computedScore = SCORE_VALUES[scoreLabel] (from DB) or null if not scored
 *   - Non-leaf: computedScore = Σ(child.computedScore × child.weight) / Σ(child.weight)
 *     where child.computedScore is non-null (partial scoring supported)
 *   - Critical item: if NON_COMPLIANT, cap parent score to min(parent_computed, 0.5)
 * Returns map of nodeId → ComputedNode.
 */
export function computeScoringTree(
  nodes: ScoringNode[],
): Map<string, ComputedNode> {
  const nodeMap = new Map<string, ComputedNode>(
    nodes.map((n) => [n.id, { ...n, computedScore: null, completionPct: 0 }]),
  );

  // Process bottom-up via depth-first post-order
  const sorted = [...nodes].sort((a, b) => b.depth - a.depth);

  for (const node of sorted) {
    const computed = nodeMap.get(node.id)!;

    if (node.isLeaf) {
      computed.computedScore = node.score;
      computed.completionPct = node.score !== null ? 100 : 0;
    } else {
      const children = [...nodeMap.values()].filter(
        (n) => n.parentId === node.id,
      );
      const scored = children.filter((c) => c.computedScore !== null);

      if (scored.length === 0) {
        computed.computedScore = null;
        computed.completionPct = 0;
      } else {
        const totalWeight = scored.reduce((s, c) => s + c.weight, 0);
        let rollup =
          scored.reduce((s, c) => s + c.computedScore! * c.weight, 0) /
          totalWeight;

        // Critical override: NON_COMPLIANT critical child caps parent at 0.5
        const criticalNonCompliant = scored.find(
          (c) => c.isCritical && c.computedScore === 0,
        );
        if (criticalNonCompliant) rollup = Math.min(rollup, 0.5);

        computed.computedScore = Math.round(rollup * 10000) / 10000;
        const allLeaves = getTotalLeaves(node.id, nodeMap);
        const scoredLeaves = getScoredLeaves(node.id, nodeMap);
        computed.completionPct =
          allLeaves > 0 ? Math.round((scoredLeaves / allLeaves) * 100) : 0;
      }
    }
  }

  return nodeMap;
}

export function computeCompositeScore(
  moduleScores: { moduleCode: string; score: number | null; weight: number }[],
): { compositeScore: number; ratingBand: string } | null {
  const scored = moduleScores.filter((m) => m.score !== null);
  if (scored.length === 0) return null;
  const totalWeight = scored.reduce((s, m) => s + m.weight, 0);
  const composite =
    scored.reduce((s, m) => s + m.score! * m.weight, 0) / totalWeight;
  const rounded = Math.round(composite * 10000) / 10000;
  const band =
    RATING_BANDS.find((b) => rounded >= b.min && rounded <= b.max)?.label ??
    "POOR";
  return { compositeScore: rounded, ratingBand: band };
}
```

### Pattern 2: Engagement State Machine (Separate from Observation SM)

**What:** A new pure TypeScript state machine for the 8-state `EngagementStatus` lifecycle, following the exact same structure as the existing `src/lib/state-machine.ts` (array of `TransitionDef`, `canTransition()`, `getAvailableTransitions()` exports).

**When to use:** Called from `update-engagement-status.ts` server action before any DB write. Replaces the current `VALID_TRANSITIONS` record in that action.

**Trade-offs:** Keeping it separate from `state-machine.ts` (Observation lifecycle) prevents the observation state machine from accumulating unrelated logic. Same API contract means the executor action follows the same pattern.

**Example:**

```typescript
// src/lib/engagement-state-machine.ts

import type { EngagementStatus, Role } from "@/generated/prisma/enums";

export type EngagementTransitionDef = {
  from: EngagementStatus;
  to: EngagementStatus;
  allowedRoles: Role[];
  label: string;
  // Optional guard: e.g., require opening meeting signed off before IN_PROGRESS
  guard?: (context: EngagementContext) => boolean;
};

export type EngagementContext = {
  hasOpeningMeeting: boolean; // EngagementMeeting OPENING exists and signedOff
  hasExitMeeting: boolean; // EngagementMeeting EXIT exists and signedOff
  hasTeam: boolean; // At least one AuditTeamMember
};

export const ENGAGEMENT_TRANSITIONS: EngagementTransitionDef[] = [
  {
    from: "PLANNED",
    to: "TEAM_ASSIGNED",
    allowedRoles: ["CAE", "AUDIT_MANAGER", "LEAD_AUDITOR"],
    label: "Assign Team",
    guard: (ctx) => ctx.hasTeam,
  },
  {
    from: "TEAM_ASSIGNED",
    to: "OPENING_MEETING",
    allowedRoles: ["CAE", "AUDIT_MANAGER", "LEAD_AUDITOR"],
    label: "Record Opening Meeting",
  },
  {
    from: "OPENING_MEETING",
    to: "IN_PROGRESS",
    allowedRoles: ["CAE", "AUDIT_MANAGER", "LEAD_AUDITOR"],
    label: "Start Examination",
    guard: (ctx) => ctx.hasOpeningMeeting,
  },
  {
    from: "IN_PROGRESS",
    to: "EXIT_MEETING",
    allowedRoles: ["CAE", "AUDIT_MANAGER", "LEAD_AUDITOR"],
    label: "Record Exit Meeting",
  },
  {
    from: "EXIT_MEETING",
    to: "REPORT_DRAFT",
    allowedRoles: ["CAE", "AUDIT_MANAGER", "LEAD_AUDITOR"],
    label: "Proceed to Report",
    guard: (ctx) => ctx.hasExitMeeting,
  },
  {
    from: "REPORT_DRAFT",
    to: "COMPLETED",
    allowedRoles: ["CAE"],
    label: "Complete Engagement",
  },
  // CANCELLED from any non-terminal state
  ...[
    "PLANNED",
    "TEAM_ASSIGNED",
    "OPENING_MEETING",
    "IN_PROGRESS",
    "EXIT_MEETING",
    "REPORT_DRAFT",
  ].map((from) => ({
    from: from as EngagementStatus,
    to: "CANCELLED" as EngagementStatus,
    allowedRoles: ["CAE"] as Role[],
    label: "Cancel Engagement",
  })),
];
```

### Pattern 3: Hierarchical Tree UI with Server Component Parent

**What:** The `ExaminationNode` tree is fetched server-side (DAL function) and passed as a pre-flattened list to a recursive client component. The server component performs one query returning all nodes for the module — no client-side DB access.

**When to use:** The RBIA module examination page `/audit-execution/[id]/rbia/module/[moduleCode]/page.tsx`.

**Trade-offs:** Passing a flat list to the client (vs a nested tree) is simpler for serialization (no circular refs). The client component reconstructs the tree in memory via a `buildTree(flat, parentId)` helper. This also means no deep prop drilling of nested arrays.

**Example:**

```typescript
// Server component (page.tsx) — fetches flat list
const { nodes, responses } = await getRbiaModuleNodes(session, engagementId, moduleCode);
// nodes: ExaminationNode[], responses: Map<nodeId, ExaminationResponse>

return <RbiaExaminationTree nodes={nodes} responses={responses} engagementId={engagementId} />;

// Client component — reconstructs tree, renders recursively
"use client";
export function RbiaExaminationTree({ nodes, responses, engagementId }) {
  const tree = buildTree(nodes, null);  // Build nested structure in client memory
  return <TreeLevel nodes={tree} responses={responses} depth={0} engagementId={engagementId} />;
}

function buildTree(flat: ExaminationNode[], parentId: string | null) {
  return flat
    .filter(n => n.parentId === parentId)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(n => ({ ...n, children: buildTree(flat, n.id) }));
}
```

### Pattern 4: Dual Coexistence During Transition

**What:** Old models (`ExaminationArea` / `ExaminationItem` / `AuditExaminationResponse`) and new models (`ExaminationNode` / `ExaminationResponse`) both exist in the schema. The `AuditEngagement.auditType` field ("RBIA" vs "CONCURRENT" etc.) determines which model set a given engagement uses.

**When to use:** During v6.0 transition. The `[engagementId]/page.tsx` gateway checks `engagement.auditType` and routes to either `/sections/` (legacy) or `/rbia/` (v6.0).

**Trade-offs:** No data migration needed during development. Clean removal of old models deferred to Phase 6 cleanup (as stated in CLAUDE.md). This avoids breaking existing engagements already in production.

**Example:**

```typescript
// src/app/(dashboard)/audit-execution/[engagementId]/page.tsx
// After fetching engagement:
const isRbia =
  engagement.auditType === "RBIA" ||
  engagement.examinationResponsesV2.length > 0;

if (isRbia) {
  redirect(`/audit-execution/${engagementId}/rbia`);
}
// Otherwise: render existing SectionTabs (legacy path)
```

---

## Data Flow

### Full RBIA Engagement Lifecycle Data Flow

```
1. Engagement Creation
   createEngagement() server action
     → AuditEngagement { status: PLANNED, auditType: "RBIA" }
     → Auto-generate WorkProgram (existing hook, unchanged)
     → redirect → /audit-execution/[id]/rbia

2. Team Assignment
   [id]/rbia/page.tsx
     → getRbiaEngagementDashboard(session, engagementId)   [DAL]
     → TeamPanel (existing component, unchanged)
     → selectModules server action → EngagementModuleSelection records
     → updateEngagementStatus("TEAM_ASSIGNED") via engagement-state-machine

3. Module Selection
   [id]/rbia/page.tsx renders RbiaModuleGrid client component
     → moduleSelections fetched server-side (getRbiaModuleSelections DAL)
     → selectModules() server action → upsert EngagementModuleSelection
     → revalidatePath triggers server re-render

4. Opening Meeting
   [id]/rbia/meetings/page.tsx
     → recordMeeting() server action
       → EngagementMeeting { meetingType: OPENING, signedOff: false }
     → sign-off: updateMeetingSignOff() → EngagementMeeting.signedOff = true
     → updateEngagementStatus("OPENING_MEETING" → "IN_PROGRESS")

5. Examination (per module)
   [id]/rbia/module/[moduleCode]/page.tsx
     → getRbiaModuleNodes(session, engagementId, moduleCode)   [DAL]
       → ExaminationNode[] (flat, all depths for this module)
       → ExaminationResponse[] for this engagement + module (left join)
     → RbiaExaminationTree client component (reconstructs tree in memory)
     → User selects 4-point score → saveExaminationResponse() server action
       → upsert ExaminationResponse { nodeId, engagementId, scoreLabel, score }
       → if flagForActionPoint: auto-create ActionPoint draft
       → if flagForObservation: auto-create Observation (existing 5C model)
       → revalidatePath → server re-renders with updated completionPct

6. Scoring (live + frozen)
   [id]/rbia/score/page.tsx
     → getRbiaEngagementScore(session, engagementId)   [DAL]
       → All ExaminationResponse for engagement + all ExaminationNode metadata
     → computeScoringTree(nodes) [pure engine in lib/rbia-scoring-engine.ts]
       → ComputedNode map with per-node computedScore + completionPct
     → computeCompositeScore(moduleScores) → composite + ratingBand
     → RbiaScorePanel client component (displays module bar chart + composite gauge)
     → freezeRbiaScore() server action:
       → BranchRbiaScore.create { moduleScores: JSON, scoringTreeSnapshot: JSON, frozenAt }
       → AuditEngagement.overallRiskRating = ratingBand
       → updateEngagementStatus("COMPLETED")

7. Action Point Lifecycle
   [id]/rbia/findings/page.tsx
     → getRbiaActionPoints(session, engagementId)   [DAL]
     → ActionPointsTable client component
     → issueActionPoints() server action → ActionPoint.status = ISSUED
     → BmResponseBatch.create { deadline: now + 15 days }
     → BM responds via /auditee/[id] portal (separate route)
       → submitBmResponse() server action
         → ActionPoint.bmResponseText, bmResponseDate
         → BmResponseBatch.respondedActionPoints++
     → verifyActionPoint() → status = VERIFIED
     → closeActionPoint() → status = CLOSED

8. Exit Meeting + Report
   Same pattern as Opening Meeting (step 4)
   updateEngagementStatus("EXIT_MEETING" → "REPORT_DRAFT")
   [id]/report/page.tsx — MODIFIED to include RBIA score section
     → aggregateRbiaReportData() DAL → pulls BranchRbiaScore.scoringTreeSnapshot
```

### Score Computation Data Flow (Step 6 detailed)

```
DB Query (DAL: getRbiaEngagementScore)
  → SELECT ExaminationNode WHERE tenantId + code starts with module
  → SELECT ExaminationResponse WHERE engagementId + nodeId IN [above nodes]
  ↓
Pure Engine (lib/rbia-scoring-engine.ts: computeScoringTree)
  Input:  ScoringNode[] { id, parentId, weight, isCritical, score, isLeaf, depth }
  Process: Bottom-up: leaf scores → parent weighted average → critical override
  Output: Map<nodeId, ComputedNode> { computedScore, completionPct }
  ↓
Module-level aggregation
  computeCompositeScore([ {moduleCode, score, weight} ]) → { compositeScore, ratingBand }
  ↓
Display (RbiaScorePanel client component)
  Props: { moduleScores, compositeScore, ratingBand, completionPct, canFreeze }
  ↓
On freeze (freezeRbiaScore server action)
  scoringTreeSnapshot = JSON.stringify([...nodeMap.values()])
  BranchRbiaScore.create({ moduleScores, scoringTreeSnapshot, frozenAt: new Date() })
```

### State Management

```
Server State (React Query / server components):
  Page render → DAL query → props → client components
  Mutation → server action → revalidatePath → automatic re-render

Local UI State (React useState / Zustand):
  Tree expand/collapse state — client component local state
  Module filter/sort — client component local state
  Form fields (before save) — react-hook-form local state

No client-side fetching of RBIA data:
  All ExaminationNode / ExaminationResponse data is server-fetched
  Client only calls server actions for mutations, not queries
```

---

## Build Order

Dependencies cascade strictly. Build in this order within each phase.

### Phase Dependencies

```
Phase 1: Pure Engines (no dependencies)
├── src/lib/rbia-scoring-engine.ts
│     depends on: nothing (pure functions)
└── src/lib/engagement-state-machine.ts
      depends on: Prisma enums (already generated)

Phase 2: DAL Functions (depend on Prisma schema being in DB)
├── src/data-access/rbia-examination.ts   → getExaminationNodeTree, getRbiaModuleList
├── src/data-access/rbia-scoring.ts       → getRbiaEngagementScore, getBranchRbiaHistory
├── src/data-access/rbia-findings.ts      → getActionPoints, getPositiveObservations
├── src/data-access/rbia-meetings.ts      → getMeetings
└── src/data-access/rbia-module-selection.ts → getModuleSelections

Phase 3: Server Actions (depend on DAL + engines)
├── actions/audit-execution/rbia/schemas.ts          (Zod, no deps)
├── actions/audit-execution/rbia/select-modules.ts   (deps: rbia-module-selection DAL)
├── actions/audit-execution/rbia/save-examination-response.ts (deps: rbia-scoring DAL, scoring engine)
├── actions/audit-execution/rbia/record-meeting.ts   (deps: rbia-meetings DAL)
├── actions/audit-execution/rbia/create-action-point.ts (deps: rbia-findings DAL)
├── actions/audit-execution/rbia/submit-bm-response.ts  (deps: rbia-findings DAL)
├── actions/audit-execution/rbia/freeze-rbia-score.ts   (deps: rbia-scoring DAL, scoring engine)
├── actions/audit-execution/rbia/promote-to-observation.ts (deps: existing observations DAL)
└── actions/audit-execution/update-engagement-status.ts  MODIFY (deps: engagement-state-machine)

Phase 4: Components (depend on server actions + props shape from DAL)
├── rbia-module-grid.tsx       (deps: select-modules action)
├── rbia-examination-tree.tsx  (deps: save-examination-response action)
├── rbia-score-panel.tsx       (deps: freeze-rbia-score action)
├── action-points-table.tsx    (deps: create-action-point action)
├── action-point-form.tsx      (deps: create-action-point action)
├── bm-response-panel.tsx      (deps: submit-bm-response action)
├── meeting-form.tsx           (deps: record-meeting action)
└── score-freeze-dialog.tsx    (deps: freeze-rbia-score action)

Phase 5: Pages (depend on DAL functions + components)
├── [engagementId]/rbia/page.tsx              (deps: rbia-examination + rbia-module-selection DAL)
├── [engagementId]/rbia/module/[code]/page.tsx (deps: rbia-examination + rbia-scoring DAL)
├── [engagementId]/rbia/findings/page.tsx     (deps: rbia-findings DAL)
├── [engagementId]/rbia/meetings/page.tsx     (deps: rbia-meetings DAL)
└── [engagementId]/rbia/score/page.tsx        (deps: rbia-scoring DAL + scoring engine)

Phase 6: Modifications to Existing Files
├── [engagementId]/page.tsx     — add routing fork (RBIA vs legacy)
├── [engagementId]/report/page.tsx — add RBIA score section
├── update-engagement-status.ts — replace VALID_TRANSITIONS with engagement-state-machine
└── permissions.ts              — add new permissions (rbia:score_freeze, action_point:manage)
```

### Items That Can Be Built in Parallel

- `rbia-scoring-engine.ts` and `engagement-state-machine.ts` are independent
- All DAL files in Phase 2 are independent of each other
- All server action files in Phase 3 are independent after schemas.ts is done
- All components in Phase 4 are independent of each other
- All new pages in Phase 5 are independent of each other

### Items That Must Be Sequential

- DB schema must be pushed (`pnpm db:push`) before any DAL function can be tested
- `schemas.ts` before all server action files (shared Zod types)
- DAL functions before server actions (actions import from DAL)
- Server actions before components (components call actions)
- Components before pages (pages import components)
- ExaminationNode seed data must exist before module selection page renders

---

## Integration Points

### Existing Files That Need Modification

| File                                                                 | Type   | Change Required                                                                                                                                                                                              |
| -------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/actions/audit-execution/update-engagement-status.ts`            | Modify | Replace hard-coded `VALID_TRANSITIONS` dict with `engagement-state-machine.ts` `canTransition()`. Add guard context (hasTeam, hasOpeningMeeting, hasExitMeeting) fetched from DB before calling the machine. |
| `src/app/(dashboard)/audit-execution/[engagementId]/page.tsx`        | Modify | Add routing fork: if `engagement.auditType === "RBIA"` redirect to `/rbia/`. Existing section tabs remain untouched for non-RBIA engagements.                                                                |
| `src/app/(dashboard)/audit-execution/[engagementId]/report/page.tsx` | Modify | Add RBIA score section: fetch `BranchRbiaScore` if present, render `RbiaScoreSection` component. Gracefully hide if no frozen score exists.                                                                  |
| `src/lib/permissions.ts`                                             | Modify | Add new permissions: `"rbia:examine"`, `"rbia:score_freeze"`, `"action_point:manage"`, `"action_point:bm_respond"`. Add to appropriate role permission arrays (AUDITOR, LEAD_AUDITOR, CAE).                  |
| `src/data-access/audit-execution.ts`                                 | Modify | Update `getEngagementSummary()` to handle the 8 new `EngagementStatus` values (currently only accounts for 4 states).                                                                                        |
| `prisma/seed.ts`                                                     | Modify | Add seed for `ExaminationNode` tree (canonical UCB RBIA structure). Required before any RBIA engagement can be created.                                                                                      |
| `messages/en.json` (and hi/mr/gu)                                    | Modify | Add i18n keys for new RBIA UI labels (ScoreLabel values, status names, ActionPoint lifecycle labels).                                                                                                        |

### Existing Files That Stay Unchanged

| File                                                  | Reason                                                                                                     |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `src/lib/state-machine.ts`                            | Observation lifecycle is separate from engagement lifecycle                                                |
| `src/lib/ram-engine.ts`                               | RAM scoring (pre-audit) is separate from RBIA examination scoring (in-audit)                               |
| `src/lib/escalation-engine.ts`                        | Observation escalation is separate from ActionPoint deadline tracking                                      |
| `src/data-access/observations.ts`                     | Observation model unchanged; `promote-to-observation.ts` action calls existing `createObservation` pattern |
| `src/actions/audit-execution/create-engagement.ts`    | Engagement creation unchanged; RBIA type determined by form field                                          |
| `src/components/audit-execution/examination-form.tsx` | Legacy component for old `AuditExaminationResponse` model — leave intact until cleanup phase               |
| `src/components/audit-execution/section-tabs.tsx`     | Legacy component — leave intact during transition                                                          |

### New Internal Boundaries

| Boundary                                                      | Communication                             | Notes                                                                                                                     |
| ------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `rbia-scoring-engine.ts` ↔ `save-examination-response.ts`     | Direct function call                      | Engine called after each response save to compute updated module score for return value                                   |
| `rbia-scoring-engine.ts` ↔ `freeze-rbia-score.ts`             | Direct function call                      | Engine called once during freeze to produce `scoringTreeSnapshot` JSON                                                    |
| `engagement-state-machine.ts` ↔ `update-engagement-status.ts` | Direct function call                      | Machine validates transition, action writes to DB                                                                         |
| `save-examination-response.ts` ↔ `create-action-point.ts`     | Sequential calls within one server action | If `flagForActionPoint=true`, `saveExaminationResponse` calls a shared internal helper that creates the ActionPoint draft |
| `promote-to-observation.ts` ↔ existing `observations` DAL     | Import and call                           | Reuses existing `prisma.observation.create` pattern rather than duplicating                                               |

### External Service Integration (Unchanged)

| Service | Integration                                 | RBIA Impact                                                                                                                              |
| ------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| AWS S3  | `upload-examination-evidence.ts` (existing) | RBIA responses can attach evidence same way as old responses — use `newExaminationResponseId` FK on `Evidence` model (already in schema) |
| AWS SES | `notification-service.ts` (existing)        | ActionPoint issuance triggers BM notification; uses existing email templates                                                             |
| pg-boss | `src/jobs/` (existing)                      | Add BM response deadline reminder job (similar to existing compliance reminder jobs)                                                     |

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Computing Scores in the DAL

**What people do:** Put weighted roll-up logic inside the DAL function that fetches `ExaminationResponse`.
**Why it's wrong:** DAL functions are for queries, not business logic. Score computation depends on tree structure (all nodes + weights), not just responses — mixing DB access and computation makes it hard to test and reuse.
**Do this instead:** DAL fetches raw data (nodes + responses), passes flat lists to the pure `computeScoringTree()` engine in `lib/rbia-scoring-engine.ts`.

### Anti-Pattern 2: Fetching the Tree Node-by-Node on Each Score Interaction

**What people do:** Each time a leaf node score is saved, re-fetch the entire tree from DB and recompute.
**Why it's wrong:** The examination tree for a module can have 50-200 nodes. Fetching on each save is wasteful, and the tree structure doesn't change during an engagement (nodes are static; only responses change).
**Do this instead:** The page fetches all nodes once on render (server component). Score saves return only the updated per-node `computedScore` from the action's return value. The client component updates its local tree state without re-rendering the full page.

### Anti-Pattern 3: Storing Computed Scores in ExaminationResponse

**What people do:** Save the rolled-up parent score into `ExaminationResponse` records.
**Why it's wrong:** Parent scores are derived — they change when any child score changes. Storing derived values creates consistency problems (stale data if a child is re-scored).
**Do this instead:** `ExaminationResponse` stores only leaf-level `score` + `scoreLabel`. All roll-up scores are computed on-the-fly by the engine from the raw leaf scores. Only `BranchRbiaScore` stores pre-computed scores, and only when frozen (immutable at that point).

### Anti-Pattern 4: Accepting EngagementStatus Transitions Without Context Guards

**What people do:** Allow status transitions purely based on the from→to pair without checking prerequisite conditions (e.g., allowing IN_PROGRESS without a signed-off opening meeting).
**Why it's wrong:** The 8-state lifecycle has preconditions (team assigned, meeting signed off) that enforce RBI process compliance. Skipping guards undermines audit integrity.
**Do this instead:** The `engagement-state-machine.ts` guard functions receive `EngagementContext` (fetched from DB in the server action before calling the machine) and block invalid transitions at the application layer.

### Anti-Pattern 5: Bypassing the DAL in Pages for v6.0 Models

**What people do:** Call `prisma.examinationNode.findMany()` directly in a page component instead of using a DAL function.
**Why it's wrong:** Direct DB calls in pages bypass tenant isolation enforcement. The DAL pattern guarantees every query includes `WHERE tenantId = ?`.
**Do this instead:** Always go through a DAL function in `data-access/rbia-*.ts`. The page calls the DAL function, the DAL function calls `prismaForTenant(tenantId)`.

---

## Scaling Considerations

| Scale                     | Architecture Adjustments                                                                                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0-50 UCBs (current pilot) | Single VPS, no caching beyond Next.js ISR, current pool of 25 connections sufficient                                                                                                           |
| 50-200 UCBs               | Scoring engine remains server-side (compute is fast for 200-node trees); consider Redis cache for `ExaminationNode` tree (static per tenant, rarely changes)                                   |
| 200+ UCBs                 | `BranchRbiaScore.scoringTreeSnapshot` JSONB becomes primary read path (no re-computation needed for historical scores); index `BranchRbiaScore(branchId, frozenAt)` for branch history queries |

### Scaling Priorities for v6.0

1. **First bottleneck:** `ExaminationNode` tree queries. A tenant with 500+ nodes across all modules will generate large query result sets. Mitigation: fetch only the specific module's subtree using the materialized `path` field prefix query (`WHERE path LIKE 'OPS%'`).
2. **Second bottleneck:** Score computation during report generation. The scoring engine runs synchronously on the Node.js thread. Mitigation: `BranchRbiaScore` frozen snapshots mean report generation reads from JSONB, not from recomputing.

---

## Sources

- Codebase inspection: `/Users/admin/Developer/AEGIS/src/lib/state-machine.ts` — established pattern for pure TypeScript state machines
- Codebase inspection: `/Users/admin/Developer/AEGIS/src/lib/ram-engine.ts` — established pattern for pure scoring engines
- Codebase inspection: `/Users/admin/Developer/AEGIS/src/data-access/audit-execution.ts` — DAL pattern with tenant isolation
- Codebase inspection: `/Users/admin/Developer/AEGIS/src/actions/audit-execution/create-engagement.ts` — server action pattern (auth → permission → Zod → transaction → revalidatePath)
- Codebase inspection: `/Users/admin/Developer/AEGIS/prisma/schema.prisma` lines 2063-2307 — v6.0 model definitions
- Codebase inspection: `/Users/admin/Developer/AEGIS/prisma/schema.prisma` lines 123-168 — `EngagementStatus` and `ScoreLabel` enums
- Codebase inspection: `/Users/admin/Developer/AEGIS/src/lib/permissions.ts` — permission/role structure
- CLAUDE.md (project): v6.0 RBIA Redesign section — dual model coexistence strategy, 8-state engagement lifecycle
- CLAUDE.md (project): Data Layer Pattern — the authoritative layering rule

---

_Architecture research for: AEGIS v6.0 RBIA Workflow Implementation_
_Researched: 2026-02-22_
_Confidence: HIGH — all patterns verified against existing production codebase_
