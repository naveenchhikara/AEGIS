# Phase 19: Data Access Layer - Research

**Researched:** 2026-02-23
**Domain:** Prisma DAL patterns, hierarchical tree queries, PostgreSQL, Next.js server-side redirect
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Tree loading strategy:**

- Module selection: DAL auto-selects applicable modules based on branch type (filter to only modules where `applicableBranchTypes` includes the branch's type). Auditor sees pre-selected set, can optionally add/remove.

**Engagement gateway fork:**

- New `/rbia/` route group under `audit-execution/[engagementId]/rbia/` — clean separation from legacy pages
- Auto-redirect: if someone lands on `/audit-execution/[id]` for an RBIA engagement, server-side redirect to `/audit-execution/[id]/rbia/`
- Separate RBIA DAL: new `rbia-engagement.ts` handles RBIA-specific queries. Existing `audit-execution.ts` untouched for legacy.

**Findings data contract:**

- ActionPoints include source link: `examinationResponseId` + node path/code for "flagged from: Cash > Vault Handling > Item 3.2" display
- BM response status inline with AP: each ActionPoint includes its response status (responded/pending/overdue) and response text if available
- Promote-to-observation is link-only: Observation references source AP via `sourceActionPointId`, AP data is NOT copied. Observation extends AP with 5C fields.

**Carry-forward ActionPoints:**

- Scope: immediately preceding engagement for the same branch only (not all past engagements)
- Status filter: OPEN + PARTIALLY_RESOLVED APs qualify for carry-forward. Fully resolved APs don't carry.
- Display: read-only references with link to original. Auditor can create new APs inspired by them but can't modify originals.
- Placement: integrated into the ActionPoints list with a "Carried Forward" badge (not a separate tab)

### Claude's Discretion

- Tree loading approach (all-at-once vs per-module lazy load)
- Tree return shape (flat + buildTree vs pre-built nested)
- Scores join strategy (with tree vs separate fetch)
- Engagement routing key (auditType field vs ExaminationNode presence)
- Findings return shape (discriminated union vs two arrays)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                                                              | Research Support                                                                                                                           |
| ------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| ENGG-05 | System auto-selects applicable examination modules based on branch type (LARGE/MEDIUM/SMALL) using applicableBranchTypes | DAL filters ExaminationNode at depth=1 (module level) where `applicableBranchTypes` contains branch.category OR array is empty (all types) |
| ENGG-06 | Auditor can manually add or remove modules from auto-selected set with documented reason                                 | DAL reads/writes `EngagementModuleSelection` table; `isAutoSelected` flag distinguishes auto vs manual; `selectionReason` stores rationale |
| ENGG-07 | Engagement gateway routes RBIA engagements to v6.0 UI while legacy engagements continue using existing sections path     | `auditType === "RBIA"` is the discriminant on AuditEngagement; Next.js `redirect()` in page.tsx is server-side; no client JS needed        |
| FIND-05 | System detects carry-forward ActionPoints from previous engagement and surfaces them at new engagement start             | Query: find APs on the last engagement for same branch with status IN (OPEN, PARTIALLY_RESOLVED) then sort by serialNo                     |

</phase_requirements>

---

## Summary

Phase 19 is a pure DAL phase — four new TypeScript files in `src/data-access/`, one modification to `src/app/(dashboard)/audit-execution/[engagementId]/page.tsx`, and no UI work. The phase creates the data contract that Phase 20 (server actions) and Phase 21+ (UI) consume. All five deliverables follow patterns already established by the 39 existing DAL files.

The critical architectural decision for this phase is tree loading strategy. The ExaminationNode tree has ~200-500 nodes (variable depth 0-5). A single `findMany` with the full tree loaded into memory and reconstructed via `buildTree()` is correct for this size — it avoids N+1 traversal without requiring recursive CTEs or raw SQL. The flat-load + buildTree approach is also the most testable: the DAL function returns a flat array, the `buildTree()` utility is a pure function that can be unit-tested without a database, and consumers can traverse the tree without round-trips.

The engagement gateway fork uses `auditType === "RBIA"` on the `AuditEngagement` model as the routing key — this field already exists in the schema with a default of `"RBIA"`, and using it is more reliable than detecting ExaminationNode presence (which requires a DB query just to route). The gateway modification is a surgical change to `page.tsx`: read the engagement's `auditType` and `redirect()` to `/rbia/` if it is RBIA.

One schema gap exists: the CONTEXT.md decision mentions "Observation references source AP via `sourceActionPointId`" but this field is NOT in the current `Observation` model in `schema.prisma`. The findings DAL (`rbia-findings.ts`) can still be written without this field — the link is from Observation to AP, and Observations are queried by `engagementId` anyway. However, Plan 19-03 (rbia-findings.ts) must note this gap for Phase 20 (server actions) to add the schema field when implementing promote-to-observation.

**Primary recommendation:** Use flat `findMany` + `buildTree()` utility for tree loading; use `auditType === "RBIA"` as the routing key; return two typed arrays (not discriminated union) for findings since Phase 22 has separate tabs for APs and Observations.

---

## Standard Stack

### Core

| Library    | Version    | Purpose                                              | Why Standard                                   |
| ---------- | ---------- | ---------------------------------------------------- | ---------------------------------------------- |
| Prisma 7   | (existing) | All DB queries via generated client                  | Project ORM — all 39 existing DAL files use it |
| TypeScript | 5.9        | Typed return shapes, discriminated types             | Project language                               |
| Next.js 16 | (existing) | `redirect()` from `next/navigation` for gateway fork | Server component redirect — no client JS       |

### Supporting

| Library       | Version    | Purpose                                  | When to Use                                          |
| ------------- | ---------- | ---------------------------------------- | ---------------------------------------------------- |
| `server-only` | (existing) | Guards DAL files from client bundle      | Required on every DAL file — enforced by ESLint rule |
| `date-fns`    | (existing) | Date arithmetic for overdue AP detection | Used in `audit-plans.ts` already — consistent        |

### Alternatives Considered

| Instead of                         | Could Use                                 | Tradeoff                                                                                              |
| ---------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Flat `findMany` + `buildTree()`    | Recursive CTE raw SQL                     | Raw SQL bypasses Prisma type safety; for 200-500 nodes, `findMany` is fast enough (single round-trip) |
| `auditType === "RBIA"` routing key | Check ExaminationNode presence            | Node presence check requires extra DB query just to route; `auditType` is already on the engagement   |
| Two typed arrays for findings      | Discriminated union `type: "AP" \| "OBS"` | Discriminated union adds complexity; Phase 22 uses separate tabs, so two arrays map directly to UI    |
| Scores loaded with tree (joined)   | Separate `getEngagementScores()` call     | Joined load reduces round-trips and is simpler for Phase 21 UI                                        |

**Installation:** No new dependencies required for this phase.

---

## Architecture Patterns

### Recommended Project Structure

```
src/data-access/
├── rbia-examination.ts          # NEW: Plan 19-01 — flat tree load + buildTree() + module selection
├── rbia-scoring.ts              # NEW: Plan 19-02 — BranchRbiaScore queries
├── rbia-findings.ts             # NEW: Plan 19-03 — ActionPoints + Observations + carry-forward
├── rbia-meetings.ts             # NEW: Plan 19-04 — EngagementMeeting query + upsert
src/app/(dashboard)/audit-execution/[engagementId]/
├── page.tsx                     # MODIFIED: Plan 19-05 — RBIA vs legacy fork with redirect()
├── rbia/                        # NEW directory (empty placeholder route — UI in Phase 21)
│   └── page.tsx                 # NEW: minimal stub page that renders for RBIA engagements
```

### Pattern 1: DAL 5-Step Pattern (from existing src/data-access/observations.ts)

**What:** Every DAL file follows: (1) import "server-only", (2) accept Session, (3) call `prismaForTenant(tenantId)`, (4) query with explicit `WHERE tenantId`, (5) return typed data.

**When to use:** All new DAL functions in this phase.

```typescript
// Source: src/data-access/observations.ts (canonical pattern)
import "server-only";
import { prismaForTenant } from "./prisma";
import type { AuthSession as Session } from "@/lib/auth";

export async function getExaminationTree(
  session: Session,
  engagementId: string,
): Promise<ExaminationTreeNode[]> {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  const nodes = await db.examinationNode.findMany({
    where: { tenantId, isActive: true },
    orderBy: [{ depth: "asc" }, { displayOrder: "asc" }],
    // ... select/include
  });

  return buildTree(nodes);
}
```

### Pattern 2: Flat Load + buildTree() for ExaminationNode Hierarchy

**What:** Load all `ExaminationNode` rows for a tenant in a single query, then reconstruct the hierarchy in memory using a map-based `buildTree()` utility. This is the standard approach for trees with <10,000 nodes.

**When to use:** `rbia-examination.ts` for the tree query; `buildTree()` is a pure utility exported from the same file.

**Why flat load is correct here:**

- ExaminationNodes are tenant-scoped master data (~200-500 nodes per tenant)
- Single `findMany` with `orderBy depth asc` loads the whole tree in one round-trip
- `buildTree()` reconstructs the tree in O(n) using a parentId map
- ExaminationResponse scores are joined via `include` on the same query (no second round-trip)

```typescript
// Source: Derived from ExaminationNode schema (parentId self-relation)

export type ExaminationTreeNode = {
  id: string;
  code: string;
  name: string;
  path: string;
  depth: number;
  isLeaf: boolean;
  parentId: string | null;
  weight: number; // Converted from Prisma Decimal to number at DAL boundary
  isCritical: boolean;
  riskCategory: string | null;
  regulatoryRef: string | null;
  applicableBranchTypes: string[];
  description: string | null;
  displayOrder: number;
  response?: ExaminationResponseData | null; // Joined for this engagement
  children: ExaminationTreeNode[]; // Empty array for leaf nodes, populated by buildTree()
};

export type ExaminationResponseData = {
  id: string;
  score: number | null; // Decimal → number conversion
  scoreLabel: ScoreLabel | null;
  workingNotes: string | null;
  flagForObservation: boolean;
  flagForActionPoint: boolean;
  respondedById: string | null;
  respondedAt: Date | null;
};

/**
 * Reconstruct tree hierarchy from flat array.
 * O(n) using parentId → children map.
 * Nodes without parentId are roots (depth=0).
 */
export function buildTree(
  flatNodes: FlatExaminationNode[],
): ExaminationTreeNode[] {
  const nodeMap = new Map<string, ExaminationTreeNode>();
  const roots: ExaminationTreeNode[] = [];

  // First pass: create all nodes with empty children arrays
  for (const node of flatNodes) {
    nodeMap.set(node.id, { ...node, children: [] });
  }

  // Second pass: link children to parents
  for (const node of flatNodes) {
    const treeNode = nodeMap.get(node.id)!;
    if (node.parentId) {
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.children.push(treeNode);
      }
    } else {
      roots.push(treeNode);
    }
  }

  return roots;
}
```

### Pattern 3: Module Selection with Branch Type Auto-Selection (ENGG-05, ENGG-06)

**What:** Load module-level nodes (depth=1) and filter to those where `applicableBranchTypes` is empty (applies to all) OR contains the branch's `category`. Persist the result as `EngagementModuleSelection` rows.

**Key schema facts:**

- `ExaminationNode.applicableBranchTypes: String[]` — PostgreSQL array, empty means all branch types
- `ExaminationNode.depth: Int` — depth=1 is module level (directly under root area nodes at depth=0)
- `Branch.category: String?` — values are `"LARGE"`, `"MEDIUM"`, `"SMALL"`, `"VERY_SMALL"`
- `EngagementModuleSelection.isAutoSelected: Boolean` — tracks auto vs manual selection

```typescript
// Module auto-selection query pattern
// Source: schema.prisma ExaminationNode + Branch models

export async function autoSelectModules(
  session: Session,
  engagementId: string,
  branchCategory: string | null,
): Promise<void> {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  // Load all module-level nodes (depth=1)
  const allModules = await db.examinationNode.findMany({
    where: { tenantId, depth: 1, isActive: true },
    select: { id: true, code: true, applicableBranchTypes: true },
  });

  // Filter: empty applicableBranchTypes = applies to all; otherwise must include branch category
  const applicableModules = allModules.filter(
    (m) =>
      m.applicableBranchTypes.length === 0 ||
      (branchCategory && m.applicableBranchTypes.includes(branchCategory)),
  );

  // Upsert selections (idempotent — can be called on engagement creation)
  await db.engagementModuleSelection.createMany({
    data: applicableModules.map((m) => ({
      tenantId,
      engagementId,
      moduleNodeId: m.id,
      isAutoSelected: true,
      selectionReason: branchCategory
        ? `Branch type: ${branchCategory}`
        : "Applies to all branch types",
    })),
    skipDuplicates: true, // Safe to call multiple times
  });
}
```

### Pattern 4: Engagement Gateway Fork (ENGG-07)

**What:** Read `auditType` from the AuditEngagement record in `page.tsx` and call Next.js `redirect()` to the RBIA route if it matches `"RBIA"`.

**Why `auditType` over ExaminationNode presence:**

- `auditType` is already on `AuditEngagement` — no extra query needed
- `auditType` defaults to `"RBIA"` in schema — all new engagements created in v6.0 will route correctly
- ExaminationNode presence check would require a second DB query and adds coupling

```typescript
// Source: src/app/(dashboard)/audit-execution/[engagementId]/page.tsx (modified)
// Pattern from: Next.js App Router redirect() from next/navigation

import { redirect, notFound } from "next/navigation";

export default async function AuditExecutionPage({ params }: PageProps) {
  const { engagementId } = await params;
  const session = await getRequiredSession();

  // ... permission check ...

  const engagement = await getEngagementWithTeam(session, engagementId);
  if (!engagement) notFound();

  // Gateway fork: RBIA engagements go to v6.0 UI
  if (engagement.auditType === "RBIA") {
    redirect(`/audit-execution/${engagementId}/rbia`);
    // redirect() throws — code after this line is never reached
  }

  // Legacy engagements: continue existing rendering
  // ... existing page content unchanged ...
}
```

**RBIA stub page** (`/rbia/page.tsx`): minimal placeholder needed for the redirect target to exist in Phase 19. Will be replaced with full UI in Phase 21.

### Pattern 5: Unified Findings Query (FIND-05)

**What:** `getEngagementFindings()` returns both ActionPoints and Observations as two typed arrays. Carry-forward APs from the preceding engagement are surfaced as a separate array with `isCarriedForward: true` metadata.

**Recommended shape: two typed arrays** (not discriminated union)

- Phase 22 has separate tabs for APs and Observations — two arrays map directly to tab data
- Discriminated union adds complexity without benefit for this use case
- Phase 20 server actions operate on APs and Observations independently

```typescript
// Source: schema.prisma ActionPoint + Observation models

export type ActionPointData = {
  id: string;
  serialNo: number;
  title: string;
  description: string;
  severity: Severity;
  moduleCode: string;
  status: ActionPointStatus;
  // Source link: "flagged from: Cash > Vault Handling > Item 3.2"
  sourceResponse: {
    id: string;
    node: { code: string; path: string; name: string };
  } | null;
  // BM response status inline
  bmResponseText: string | null;
  bmResponseDate: Date | null;
  bmResponseDeadline: Date | null;
  isCarriedForward: false;
  createdAt: Date;
};

export type CarryForwardActionPointData = Omit<
  ActionPointData,
  "isCarriedForward"
> & {
  isCarriedForward: true;
  originalEngagementId: string;
};

export type ObservationData = {
  id: string;
  title: string;
  condition: string;
  criteria: string;
  cause: string;
  effect: string;
  recommendation: string;
  severity: Severity;
  status: ObservationStatus;
  engagementId: string | null;
  branchId: string | null;
  createdAt: Date;
};

export type EngagementFindings = {
  actionPoints: ActionPointData[];
  carryForwardActionPoints: CarryForwardActionPointData[];
  observations: ObservationData[];
};
```

### Pattern 6: Carry-Forward ActionPoint Detection (FIND-05)

**What:** Find APs from the immediately preceding engagement for the same branch that have status OPEN or PARTIALLY_RESOLVED.

**Key schema facts:**

- `ActionPoint.status: ActionPointStatus` — OPEN and PARTIALLY_RESOLVED qualify (DRAFT, ISSUED, BM_RESPONSE_DUE, BM_RESPONDED, VERIFIED, CLOSED, CARRIED_FORWARD are excluded)
- `ActionPoint.carriedForwardToEngagementId: String?` — if set, AP was already forwarded; use this to avoid re-surfacing
- `AuditEngagement.branchId: String?` — match same branch
- `AuditEngagement.createdAt` — "immediately preceding" = most recent engagement for same branch before current one

**IMPORTANT:** The `ActionPointStatus` enum values are: DRAFT, ISSUED, BM_RESPONSE_DUE, BM_RESPONDED, VERIFIED, CLOSED, CARRIED_FORWARD. The context mentions "OPEN + PARTIALLY_RESOLVED" but those are NOT in the schema enum. The closest matches are `ISSUED` (issued, awaiting response) and `BM_RESPONDED` (partially addressed). The planner should resolve this discrepancy — OPEN likely maps to `ISSUED` or `BM_RESPONSE_DUE`, and PARTIALLY_RESOLVED to `BM_RESPONDED`. Plan 19-03 must clarify which statuses qualify.

```typescript
// Source: schema.prisma ActionPoint model + AuditEngagement model

export async function getCarryForwardActionPoints(
  session: Session,
  currentEngagementId: string,
  branchId: string,
): Promise<CarryForwardActionPointData[]> {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  // Find the immediately preceding engagement for the same branch
  const precedingEngagement = await db.auditEngagement.findFirst({
    where: {
      tenantId,
      branchId,
      id: { not: currentEngagementId },
      status: "COMPLETED",
    },
    orderBy: { completionDate: "desc" },
    select: { id: true },
  });

  if (!precedingEngagement) return [];

  // Fetch open/unresolved APs from the preceding engagement
  // Note: carriedForwardToEngagementId = null means not already forwarded
  const aps = await db.actionPoint.findMany({
    where: {
      tenantId,
      engagementId: precedingEngagement.id,
      status: { in: ["ISSUED", "BM_RESPONSE_DUE"] }, // "OPEN" equivalent
      carriedForwardToEngagementId: null, // Not already forwarded
    },
    orderBy: { serialNo: "asc" },
    include: {
      sourceResponse: {
        include: { node: { select: { code: true, path: true, name: true } } },
      },
    },
  });

  return aps.map((ap) => ({
    ...ap,
    isCarriedForward: true as const,
    originalEngagementId: precedingEngagement.id,
  }));
}
```

### Pattern 7: BranchRbiaScore History Query (Plan 19-02)

**What:** Query all frozen BranchRbiaScore records for a branch, ordered by freeze date descending (most recent first). Used for the RBIA score history panel.

```typescript
// Source: schema.prisma BranchRbiaScore model

export async function getBranchScoreHistory(
  session: Session,
  branchId: string,
): Promise<BranchRbiaScoreData[]> {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.branchRbiaScore.findMany({
    where: {
      tenantId,
      branchId,
      frozenAt: { not: null }, // Only frozen (finalized) scores
    },
    orderBy: { frozenAt: "desc" },
    select: {
      id: true,
      compositeScore: true, // Decimal — convert to number
      ratingBand: true,
      moduleScores: true, // Json JSONB
      frozenAt: true,
      frozenById: true,
    },
  });
}
```

### Pattern 8: EngagementMeeting Upsert (Plan 19-04)

**What:** The `EngagementMeeting` model has a `@@unique([engagementId, meetingType])` constraint — only one OPENING and one EXIT meeting per engagement. DAL should expose both `getMeeting()` and `upsertMeeting()`.

```typescript
// Source: schema.prisma EngagementMeeting model

export async function upsertEngagementMeeting(
  session: Session,
  engagementId: string,
  data: UpsertMeetingInput,
): Promise<EngagementMeeting> {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.engagementMeeting.upsert({
    where: {
      engagementId_meetingType: {
        // Prisma compound unique name
        engagementId,
        meetingType: data.meetingType,
      },
    },
    create: {
      tenantId,
      engagementId,
      meetingType: data.meetingType,
      meetingDate: data.meetingDate,
      attendees: data.attendees,
      minutesText: data.minutesText,
      keyDiscussionPoints: data.keyDiscussionPoints,
      signedOff: false,
    },
    update: {
      meetingDate: data.meetingDate,
      attendees: data.attendees,
      minutesText: data.minutesText,
      keyDiscussionPoints: data.keyDiscussionPoints,
    },
  });
}
```

### Anti-Patterns to Avoid

- **Don't load the full tree recursively with N+1 queries** — one `findMany` for all nodes, then `buildTree()` in memory. Never load a node's children in a loop.
- **Don't accept engagementId from URL params for tenantId** — the gateway modification reads `auditType` from a DB query with `WHERE tenantId = session.user.tenantId`. Never trust params directly.
- **Don't query ExaminationNode without `isActive: true`** — inactive nodes exist in the tree but must not appear in audit views.
- **Don't store `applicableBranchTypes` filtering logic in the UI** — the DAL handles it; the component receives only applicable modules.
- **Don't convert `Decimal` fields to `number` inside deep includes** — do the conversion at the DAL boundary in a mapping step after the query.
- **Don't mix the new `ExaminationResponse` (v6.0) with the legacy `AuditExaminationResponse`** — the new model is `examinationResponsesV2` on `AuditEngagement`. All RBIA DAL files use `examinationResponse` (the v6.0 model), not `auditExaminationResponse`.

---

## Don't Hand-Roll

| Problem                     | Don't Build                             | Use Instead                                                                  | Why                                                                        |
| --------------------------- | --------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Tree reconstruction         | Custom recursive DB traversal           | Flat `findMany` + `buildTree()` pure function                                | Single query + O(n) memory reconstruction is fastest and most testable     |
| Server-side redirect        | `Response.redirect()` or manual headers | `redirect()` from `next/navigation`                                          | Next.js App Router convention; works correctly in Server Components        |
| Meeting uniqueness          | Custom check-then-insert logic          | Prisma `upsert` with compound unique `@@unique([engagementId, meetingType])` | Atomic — eliminates race condition between check and insert                |
| Decimal → number conversion | Custom formatter                        | `Number(decimalValue)` at DAL boundary                                       | Prisma Decimal is a wrapper; `.toNumber()` or `Number()` gives plain float |

---

## Common Pitfalls

### Pitfall 1: ExaminationResponse Join on Wrong Model

**What goes wrong:** Querying `examinationResponse` on `ExaminationNode` returns the v6.0 responses, but the schema also has legacy `AuditExaminationResponse` — mixing them up breaks scoring.

**Why it happens:** The codebase has two examination response models: `AuditExaminationResponse` (v1 legacy, linked to `ExaminationItem`) and `ExaminationResponse` (v6.0, linked to `ExaminationNode`). They're different tables with different schemas.

**How to avoid:** Always import from the correct Prisma model. Use `db.examinationResponse` (camelCase, v6.0) for RBIA. The v6.0 model has `scoreLabel: ScoreLabel?` and `flagForActionPoint: Boolean`.

**Warning signs:** TypeScript errors on `scoreLabel` or `flagForActionPoint` indicate you're using the wrong model.

### Pitfall 2: applicableBranchTypes Array Filtering in Prisma

**What goes wrong:** Trying to use `applicableBranchTypes: { has: branchCategory }` to filter in Prisma for PostgreSQL arrays — but the Prisma array filter `has` on `String[]` fields requires the array operation.

**Why it happens:** Prisma 7 supports `hasSome`, `hasEvery`, `has` for array scalar fields in PostgreSQL. The empty-array-means-all-types case cannot be expressed in a single Prisma `where` clause efficiently.

**How to avoid:** Fetch all module-level nodes with a simple `where: { depth: 1, isActive: true }` and filter in TypeScript:

```typescript
const applicable = allModules.filter(
  (m) =>
    m.applicableBranchTypes.length === 0 ||
    m.applicableBranchTypes.includes(branchCategory),
);
```

This is cleaner than raw SQL and handles the empty-array edge case correctly. For ~200-500 nodes the in-memory filter is trivial.

### Pitfall 3: Preceding Engagement Query Returning Wrong Engagement

**What goes wrong:** The carry-forward query finds `"immediately preceding"` by ordering by `completionDate DESC` — but non-completed engagements (CANCELLED, IN_PROGRESS) may also have `completionDate` null.

**Why it happens:** `completionDate` is nullable on `AuditEngagement`. Cancelled engagements don't have a `completionDate`.

**How to avoid:** Filter to `status: "COMPLETED"` AND `id: { not: currentEngagementId }` before ordering by `completionDate: "desc"`. This ensures only finalized audits contribute carry-forward APs.

### Pitfall 4: buildTree() With Orphaned Nodes

**What goes wrong:** If `ExaminationNode` rows have a `parentId` pointing to an inactive/deleted parent, `buildTree()` silently drops the node (parent not found in map).

**Why it happens:** The schema uses `onDelete: Cascade` on the parent relation — but if a parent is soft-deleted (`isActive: false`), its children remain in the DB with a valid `parentId` that won't be in the `findMany` result (since we filter `isActive: true`).

**How to avoid:** When loading the tree for `buildTree()`, either (a) load ALL nodes regardless of `isActive` and mark inactive ones, or (b) load only `isActive: true` nodes but also include any parent that has active children. The simplest safe approach: load `isActive: true` only (context says active nodes form the audit scope). Log a warning in `buildTree()` if a `parentId` is not found in the map.

### Pitfall 5: Decimal Fields Not Converted at DAL Boundary

**What goes wrong:** `ExaminationNode.weight` is `Decimal` in Prisma — passing it directly to the scoring engine fails type checks since `ScoredNode.weight` expects `number`.

**Why it happens:** Prisma wraps PostgreSQL `DECIMAL` as a `Decimal` class object, not a plain JS number.

**How to avoid:** In the `buildTree()` or post-query mapping step, convert: `weight: Number(node.weight)`. Similarly for `BranchRbiaScore.compositeScore: Decimal` — convert in the DAL return shape.

### Pitfall 6: Routing Key Selection — auditType Defaults

**What goes wrong:** Legacy engagements created before v6.0 may have `auditType = "RBIA"` (the default) even though they use the legacy examination model.

**Why it happens:** `auditType` defaults to `"RBIA"` on the `AuditEngagement` model. Legacy engagements (created via the old workflow) would have inherited this default.

**How to avoid:** The gateway should use a compound check: `auditType === "RBIA"` AND `status` being one of the 8 new EngagementStatus values. OR — more reliably — check whether `EngagementModuleSelection` records exist for the engagement (presence indicates v6.0 RBIA flow was used). The planner must decide which routing key to use. Recommendation: use `auditType === "RBIA"` as the primary key but add a fallback: if the engagement has `sectionInstances` (legacy indicator), route to legacy even if `auditType === "RBIA"`. This handles the transition period.

### Pitfall 7: sourceActionPointId Missing from Observation Schema

**What goes wrong:** The CONTEXT.md decision states "Observation references source AP via `sourceActionPointId`" but this field does not exist in the current `Observation` model in `schema.prisma`.

**Why it happens:** The field was designed for Phase 20 (promote-to-observation server action) but not yet added to the schema.

**How to avoid:** The findings DAL (`rbia-findings.ts`) can query Observations by `engagementId` without needing this field. The DAL returns Observations from `db.observation.findMany({ where: { engagementId, tenantId } })`. The `sourceActionPointId` link is needed only in Phase 20 (create observation from AP). Plan 19-03 should add a comment noting this schema gap for Phase 20.

---

## Code Examples

Verified patterns from codebase analysis:

### Full getExaminationTree() DAL Function

```typescript
// src/data-access/rbia-examination.ts
import "server-only";
import { prismaForTenant } from "./prisma";
import type { AuthSession as Session } from "@/lib/auth";
import type { ScoreLabel } from "@/generated/prisma/enums";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ExaminationResponseData = {
  id: string;
  score: number | null;
  scoreLabel: ScoreLabel | null;
  workingNotes: string | null;
  flagForObservation: boolean;
  flagForActionPoint: boolean;
  respondedAt: Date | null;
};

export type ExaminationTreeNode = {
  id: string;
  code: string;
  name: string;
  path: string;
  depth: number;
  isLeaf: boolean;
  parentId: string | null;
  weight: number; // Converted from Decimal to number
  isCritical: boolean;
  riskCategory: string | null;
  regulatoryRef: string | null;
  applicableBranchTypes: string[];
  description: string | null;
  displayOrder: number;
  response: ExaminationResponseData | null;
  children: ExaminationTreeNode[];
};

// Internal flat type (pre-buildTree)
type FlatNode = Omit<ExaminationTreeNode, "children" | "response"> & {
  responses: ExaminationResponseData[];
};

// ─── buildTree utility ───────────────────────────────────────────────────────

/**
 * Reconstruct tree hierarchy from flat array.
 * Pure function — no DB access. O(n) using parentId map.
 * @param flatNodes - Flat array from DB query (all nodes for one tenant)
 * @param engagementId - Used to pick the correct response from responses[]
 */
export function buildTree(flatNodes: FlatNode[]): ExaminationTreeNode[] {
  const nodeMap = new Map<string, ExaminationTreeNode>();
  const roots: ExaminationTreeNode[] = [];

  for (const node of flatNodes) {
    nodeMap.set(node.id, {
      ...node,
      response: node.responses[0] ?? null, // At most one response per node per engagement
      children: [],
    });
  }

  for (const node of flatNodes) {
    const treeNode = nodeMap.get(node.id)!;
    if (node.parentId) {
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.children.push(treeNode);
      }
      // else: orphaned node (parent not in active set) — silently skipped
    } else {
      roots.push(treeNode);
    }
  }

  // Sort children by displayOrder within each parent
  function sortChildren(node: ExaminationTreeNode): void {
    node.children.sort((a, b) => a.displayOrder - b.displayOrder);
    node.children.forEach(sortChildren);
  }
  roots.sort((a, b) => a.displayOrder - b.displayOrder);
  roots.forEach(sortChildren);

  return roots;
}

// ─── DAL functions ──────────────────────────────────────────────────────────

/**
 * Load the full ExaminationNode tree for a tenant, with responses for a
 * specific engagement joined. Returns reconstructed tree hierarchy.
 *
 * Single query — no N+1. For ~200-500 nodes this is fast enough.
 */
export async function getExaminationTree(
  session: Session,
  engagementId: string,
): Promise<ExaminationTreeNode[]> {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  const nodes = await db.examinationNode.findMany({
    where: { tenantId, isActive: true },
    orderBy: [{ depth: "asc" }, { displayOrder: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      path: true,
      depth: true,
      isLeaf: true,
      parentId: true,
      weight: true, // Decimal — converted below
      isCritical: true,
      riskCategory: true,
      regulatoryRef: true,
      applicableBranchTypes: true,
      description: true,
      displayOrder: true,
      responses: {
        where: { engagementId },
        select: {
          id: true,
          score: true, // Decimal — converted below
          scoreLabel: true,
          workingNotes: true,
          flagForObservation: true,
          flagForActionPoint: true,
          respondedAt: true,
        },
      },
    },
  });

  // Convert Decimal fields to number at DAL boundary
  const flatNodes: FlatNode[] = nodes.map((n) => ({
    ...n,
    weight: Number(n.weight),
    responses: n.responses.map((r) => ({
      ...r,
      score: r.score !== null ? Number(r.score) : null,
    })),
  }));

  return buildTree(flatNodes);
}
```

### Engagement Gateway Fork in page.tsx

```typescript
// src/app/(dashboard)/audit-execution/[engagementId]/page.tsx (modified section only)
// Source: Next.js App Router pattern — redirect() from "next/navigation"

import { redirect, notFound } from "next/navigation";
import { getEngagementWithTeam } from "@/data-access/audit-execution";
import { getRequiredSession } from "@/data-access/session";

export default async function AuditExecutionPage({ params }: PageProps) {
  const { engagementId } = await params;
  const session = await getRequiredSession();

  const engagement = await getEngagementWithTeam(session, engagementId);
  if (!engagement) notFound();

  // ENGG-07: Fork RBIA engagements to v6.0 UI
  // Check: auditType === "RBIA" AND no sectionInstances (legacy indicator)
  const isRbiaEngagement =
    engagement.auditType === "RBIA" &&
    (engagement.sectionInstances?.length ?? 0) === 0;

  if (isRbiaEngagement) {
    redirect(`/audit-execution/${engagementId}/rbia`);
    // redirect() throws — never reaches here
  }

  // Legacy engagements: continue with existing page rendering
  // ... (unchanged) ...
}
```

### EngagementMeeting Upsert in rbia-meetings.ts

```typescript
// src/data-access/rbia-meetings.ts
import "server-only";
import { prismaForTenant } from "./prisma";
import type { AuthSession as Session } from "@/lib/auth";
import type { MeetingType } from "@/generated/prisma/enums";

export type MeetingAttendee = {
  name: string;
  role: string;
  designation: string;
};

export type UpsertMeetingInput = {
  meetingType: MeetingType;
  meetingDate: Date;
  attendees: MeetingAttendee[];
  minutesText: string | null;
  keyDiscussionPoints: string | null;
};

export async function getEngagementMeeting(
  session: Session,
  engagementId: string,
  meetingType: MeetingType,
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.engagementMeeting.findUnique({
    where: {
      engagementId_meetingType: { engagementId, meetingType },
    },
  });
}

export async function upsertEngagementMeeting(
  session: Session,
  engagementId: string,
  data: UpsertMeetingInput,
) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  return db.engagementMeeting.upsert({
    where: {
      engagementId_meetingType: {
        engagementId,
        meetingType: data.meetingType,
      },
    },
    create: {
      tenantId,
      engagementId,
      meetingType: data.meetingType,
      meetingDate: data.meetingDate,
      attendees: data.attendees as any, // Json field — attendees is plain object array
      minutesText: data.minutesText,
      keyDiscussionPoints: data.keyDiscussionPoints,
      signedOff: false,
    },
    update: {
      meetingDate: data.meetingDate,
      attendees: data.attendees as any,
      minutesText: data.minutesText,
      keyDiscussionPoints: data.keyDiscussionPoints,
    },
  });
}
```

---

## State of the Art

| Old Approach                                             | Current Approach                                       | When Changed | Impact                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------ |
| Flat ExaminationArea + ExaminationItem (2-level, legacy) | Hierarchical ExaminationNode (variable depth 0-5)      | Phase 18+    | RBIA DAL uses ExaminationNode; legacy DAL uses ExaminationArea/ExaminationItem |
| AuditExaminationResponse (legacy v1 model)               | ExaminationResponse (v6.0, with ScoreLabel + flagging) | Phase 18+    | rbia-examination.ts uses `examinationResponsesV2` relation name                |
| 3-state engagement (PLANNED/IN_PROGRESS/COMPLETED)       | 8-state engagement with prerequisite guards            | Phase 18     | Gateway must handle all 8 EngagementStatus values correctly                    |
| No RBIA route group                                      | `/audit-execution/[id]/rbia/` route group (Phase 19+)  | Phase 19     | Clean URL separation between legacy and RBIA UI                                |

**Deprecated/outdated:**

- `src/data-access/audit-execution.ts::getExaminationResponsesForSection()`: Uses legacy `ExaminationArea` model. RBIA DAL uses `ExaminationNode`. Do not call from RBIA pages.
- `update-engagement-status.ts`: Deprecated (marked with `@deprecated` JSDoc). Replaced by Phase 18's `transition-engagement-status.ts` (to be created in Phase 20). Phase 19 does not touch either file.

---

## Open Questions

1. **ActionPointStatus enum mismatch for carry-forward**
   - What we know: CONTEXT.md says "OPEN + PARTIALLY_RESOLVED APs qualify for carry-forward" but the `ActionPointStatus` enum values are DRAFT, ISSUED, BM_RESPONSE_DUE, BM_RESPONDED, VERIFIED, CLOSED, CARRIED_FORWARD — no OPEN or PARTIALLY_RESOLVED values exist.
   - What's unclear: Which enum values map to "OPEN" (probably ISSUED + BM_RESPONSE_DUE) and "PARTIALLY_RESOLVED" (probably BM_RESPONDED)?
   - Recommendation: Plan 19-03 should define: OPEN = `[ISSUED, BM_RESPONSE_DUE]`, PARTIALLY_RESOLVED = `[BM_RESPONDED]`. The carry-forward query uses `status: { in: ["ISSUED", "BM_RESPONSE_DUE", "BM_RESPONDED"] }`. Document the mapping in a code comment.

2. **Gateway routing key for legacy-vs-RBIA engagements created pre-v6.0**
   - What we know: `auditType` defaults to `"RBIA"` on `AuditEngagement`. Legacy engagements created before Phase 18 may have `auditType = "RBIA"` even though they use the legacy examination model (with `sectionInstances`).
   - What's unclear: Should the gateway use `auditType` alone, or a compound check with `sectionInstances` presence?
   - Recommendation: Use compound check: `auditType === "RBIA" && sectionInstances.length === 0`. This safely handles the transition period. `getEngagementWithTeam()` already includes `sectionInstances` in its query — no extra DB hit needed. Plan 19-05 should document this decision.

3. **RBIA stub page content**
   - What we know: Phase 19 creates the redirect target `/rbia/page.tsx` as a placeholder. Phase 21 replaces it with full UI.
   - What's unclear: Should the stub render a "Coming Soon" message, a loading skeleton, or simply show the engagement header?
   - Recommendation: Render the engagement header (same data already loaded by the gateway query) with a "RBIA Examination — Under Construction" placeholder. This gives navigational context without loading any RBIA-specific data.

4. **getEngagementWithTeam() needs auditType in select**
   - What we know: The existing `getEngagementWithTeam()` in `audit-execution.ts` doesn't currently select `auditType`.
   - What's unclear: Should Plan 19-05 modify `getEngagementWithTeam()` to add `auditType` to the select, or should the gateway use a separate lightweight query?
   - Recommendation: Add `auditType: true` to the `getEngagementWithTeam()` select — it's a single field addition to an existing query. Do NOT create a separate gateway query. This is a minimal change to the existing DAL that the CONTEXT.md says is "untouched for legacy."

---

## Sources

### Primary (HIGH confidence)

- `/Users/admin/Developer/AEGIS/prisma/schema.prisma` — ExaminationNode, ExaminationResponse, BranchRbiaScore, EngagementModuleSelection, EngagementMeeting, ActionPoint, AuditEngagement, Branch models
- `/Users/admin/Developer/AEGIS/src/data-access/audit-execution.ts` — Existing engagement DAL (5-step pattern, getEngagementWithTeam)
- `/Users/admin/Developer/AEGIS/src/data-access/observations.ts` — Canonical 5-step DAL pattern with runtime assertion
- `/Users/admin/Developer/AEGIS/src/data-access/audit-teams.ts` — Array filter pattern (`hasSome` in Prisma)
- `/Users/admin/Developer/AEGIS/src/data-access/__tests__/tenant-isolation.test.ts` — Tenant isolation test that new RBIA DAL files must pass
- `/Users/admin/Developer/AEGIS/src/app/(dashboard)/audit-execution/[engagementId]/page.tsx` — Existing page to be modified for gateway fork
- `/Users/admin/Developer/AEGIS/src/lib/rbia-scoring-engine.ts` — Phase 18 scoring engine (ScoredNode type, SCORE_VALUES)
- `/Users/admin/Developer/AEGIS/src/lib/engagement-state-machine.ts` — Phase 18 state machine (EngagementContext, EngagementStatus)
- `/Users/admin/Developer/AEGIS/src/lib/prisma.ts` — prismaForTenant implementation (returns singleton, UUID validation)

### Secondary (MEDIUM confidence)

- `/Users/admin/Developer/AEGIS/.planning/REQUIREMENTS.md` — ENGG-05, ENGG-06, ENGG-07, FIND-05 requirement text
- `/Users/admin/Developer/AEGIS/.planning/phases/18-foundation/18-RESEARCH.md` — Phase 18 architectural decisions (scoring engine, state machine)
- `/Users/admin/Developer/AEGIS/.planning/phases/18-foundation/18-VERIFICATION.md` — Phase 18 completion status (7/7 truths verified)

### Tertiary (LOW confidence)

- None — all findings derived from direct codebase analysis

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — No new dependencies; all existing Prisma + TypeScript + Next.js patterns
- DAL 5-step pattern: HIGH — Verified in 10+ existing DAL files
- Tree loading (flat + buildTree): HIGH — Standard approach for parent-ID trees; verified against schema
- Module selection filter: HIGH — `applicableBranchTypes` field verified in schema; filter logic is straightforward
- Engagement gateway: HIGH — `auditType` field verified in schema; `redirect()` from next/navigation is established pattern
- Carry-forward detection: MEDIUM — Schema field `carriedForwardToEngagementId` verified; enum mapping needs planner decision (see Open Question 1)
- Schema gap (sourceActionPointId): HIGH — confirmed absent via grep

**Research date:** 2026-02-23
**Valid until:** 2026-04-23 (stable domain — schema is frozen for this phase)
