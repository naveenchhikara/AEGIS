# Pitfalls Research: RBIA Audit Workflow Implementation

**Domain:** Adding RBIA hierarchical audit workflow to existing multi-tenant audit platform
**Context:** AEGIS already has 71 Prisma models, flat ExaminationArea/Item structure (39 areas, 568 items), 8-state EngagementStatus machine, and application-level tenant isolation. v6.0 adds ExaminationNode tree, weighted scoring, ActionPoints, and JSONB frozen snapshots alongside old models.
**Researched:** 2026-02-22
**Confidence:** HIGH (codebase analysis + official Prisma/PostgreSQL docs + 2026 web research)

---

## Critical Pitfalls

### Pitfall 1: Materialized Path Corruption from Application-Level Path Management

**What goes wrong:**

The `ExaminationNode.path` field (e.g., `"OPS/OPS-KYC/OPS-KYC-001"`) is maintained in application code, not enforced by PostgreSQL. Any insert or move operation that sets `path` incorrectly creates a permanently corrupted tree:

```typescript
// DANGEROUS: path manually set, can diverge from parentId hierarchy
await db.examinationNode.create({
  data: {
    code: "OPS-KYC-001",
    path: "OPS/OPS-KYC/OPS-KYC-001", // Must exactly match parent's path + "/" + code
    parentId: parentNode.id, // But what if parent's path was "OPS/KYC"?
    depth: 2, // Must == parent.depth + 1
  },
});
// Result: parentId points to node with path "OPS/KYC" but this node's path says "OPS/OPS-KYC"
// All subtree queries using LIKE 'OPS/OPS-KYC/%' now return wrong results
```

**Why it happens:**

Prisma has no native tree structure support (GitHub issue #4562, open since 2020). There is no trigger or constraint preventing path/parentId divergence. The `depth` field is similarly application-managed and can drift from the actual tree depth. Developers writing bulk import scripts or node-move operations forget to recalculate paths for entire subtrees.

**How to avoid:**

Write a single `createNode` and `moveNode` service function — the ONLY entry points for tree mutations — that compute path and depth from the parent:

```typescript
// src/services/examination-tree.ts
export async function createExaminationNode(
  tx: PrismaTransactionClient,
  tenantId: string,
  input: { code: string; name: string; parentId: string | null; weight: number; ... }
) {
  let path: string;
  let depth: number;

  if (input.parentId) {
    const parent = await tx.examinationNode.findFirstOrThrow({
      where: { id: input.parentId, tenantId },
      select: { path: true, depth: true },
    });
    path = `${parent.path}/${input.code}`;
    depth = parent.depth + 1;
  } else {
    path = input.code;
    depth = 0;
  }

  return tx.examinationNode.create({
    data: { ...input, path, depth, tenantId },
  });
}
```

Add a database CHECK constraint to catch the most obvious corruption:

```sql
-- Apply after db:push, alongside other manual SQL
ALTER TABLE "ExaminationNode"
  ADD CONSTRAINT chk_path_ends_with_code
  CHECK (path LIKE '%' || code);

ALTER TABLE "ExaminationNode"
  ADD CONSTRAINT chk_depth_non_negative
  CHECK (depth >= 0 AND depth <= 5);
```

Add an integrity validation script runnable as a health check:

```sql
-- Detects path/parentId divergence
SELECT child.id, child.code, child.path AS child_path,
       parent.path || '/' || child.code AS expected_path
FROM "ExaminationNode" child
JOIN "ExaminationNode" parent ON child."parentId" = parent.id
WHERE child.path != parent.path || '/' || child.code;
-- Must return 0 rows
```

**Warning signs:**

- Subtree queries using `path LIKE ?` return nodes from unexpected branches
- `depth` values in UI don't match visual nesting depth
- Any bulk import script or admin tool that sets `path` directly instead of calling a service function

**Phase to address:** Tree seed phase (Phase 1 of RBIA implementation). Integrity check should run before any scoring calculation.

**Severity:** CRITICAL — corrupted paths silently return wrong nodes in all tree traversals; scoring roll-up computes over wrong subtrees; produces wrong audit scores reported to RBI.

---

### Pitfall 2: Weighted Score Roll-Up Computed in JavaScript Instead of PostgreSQL

**What goes wrong:**

Loading all leaf `ExaminationResponse` rows into JavaScript and computing weighted averages produces floating-point precision drift. With 568+ leaf nodes per engagement across depth 0-5 trees, accumulated errors are visible in final composite scores:

```typescript
// DANGEROUS: JavaScript floating-point arithmetic
const responses = await db.examinationResponse.findMany({
  where: { engagementId, tenantId },
  include: { node: { select: { weight: true, isCritical: true } } },
});

// Running total using JS number type
let weightedSum = 0;
let totalWeight = 0;
for (const r of responses) {
  const score = Number(r.score); // Decimal → number: precision loss
  const weight = Number(r.node.weight); // Same
  weightedSum += score * weight; // Accumulates fp error
  totalWeight += weight;
}
const composite = weightedSum / totalWeight; // Final drift
// Stored as: 0.7499999999999999 instead of 0.75
```

Prisma returns `Decimal` fields as `Decimal.js` objects, not JavaScript `number`. Calling `.toNumber()` or using them in arithmetic silently converts to IEEE 754 float (confirmed Prisma GitHub issues #6852, #10412, #17894).

Additionally, the `isCritical` cap rule (if any leaf with `isCritical=true` scores NON_COMPLIANT, the parent's computed score is capped) is easy to forget in JS roll-up loops, especially across multiple levels.

**Why it happens:**

Developers pull data into application code to avoid raw SQL complexity. The `Number()` cast is the instinctive way to get a numeric value from a Decimal.js object. Prisma's documentation warns about this but it is easy to overlook.

**How to avoid:**

Compute roll-up entirely in PostgreSQL using a recursive CTE with `NUMERIC` arithmetic. Never pass decimal scores through JavaScript arithmetic:

```sql
-- src/lib/sql/compute-rbia-scores.sql (used via Prisma $queryRaw)
WITH RECURSIVE node_scores AS (
  -- Base: leaf nodes with actual responses
  SELECT
    n.id,
    n."parentId",
    n.depth,
    n.weight,
    n."isCritical",
    n.path,
    COALESCE(r.score, NULL) AS raw_score,  -- NULL = unscored
    r.score AS computed_score
  FROM "ExaminationNode" n
  LEFT JOIN "ExaminationResponse" r
    ON r."nodeId" = n.id AND r."engagementId" = $1
  WHERE n."tenantId" = $2 AND n."isLeaf" = true AND n."isActive" = true

  UNION ALL

  -- Roll-up: non-leaf nodes get weighted average of children
  SELECT
    parent.id,
    parent."parentId",
    parent.depth,
    parent.weight,
    parent."isCritical",
    parent.path,
    NULL,
    -- Weighted average of scored children only (skip NULLs)
    CASE
      -- Critical cap: if any critical child is NON_COMPLIANT (score=0), cap at 0.5
      WHEN EXISTS (
        SELECT 1 FROM node_scores child
        WHERE child."parentId" = parent.id AND child."isCritical" = true AND child.computed_score = 0
      ) THEN LEAST(
        SUM(child.computed_score * child.weight) / NULLIF(SUM(CASE WHEN child.computed_score IS NOT NULL THEN child.weight ELSE 0 END), 0),
        0.5
      )
      ELSE
        SUM(child.computed_score * child.weight) / NULLIF(SUM(CASE WHEN child.computed_score IS NOT NULL THEN child.weight ELSE 0 END), 0)
    END
  FROM "ExaminationNode" parent
  JOIN node_scores child ON child."parentId" = parent.id
  GROUP BY parent.id, parent."parentId", parent.depth, parent.weight, parent."isCritical", parent.path
)
SELECT id, depth, computed_score, path FROM node_scores
WHERE depth = 0;  -- Return only root module scores
```

For the TypeScript service layer, never convert Decimal to number — pass the raw SQL result directly:

```typescript
// src/services/rbia-scoring.ts
export async function computeRbiaScore(engagementId: string, tenantId: string) {
  // Prisma TypedSQL or $queryRaw — scores stay as strings from pg driver
  const scores = await db.$queryRaw<
    Array<{ id: string; computed_score: string }>
  >`
    -- recursive CTE above --
  `;
  // Store computed_score as string directly into BranchRbiaScore.compositeScore
  // Do NOT do: Number(scores[0].computed_score)
}
```

**Warning signs:**

- Composite scores stored as `0.7499999999999999` or `0.8333333333333334` in database
- Different scores produced on the same engagement data when recalculated
- `isCritical` flag present in `ExaminationNode` but not referenced in any scoring code
- Null scores for unvisited items silently treated as 0 (deflating incomplete audits)

**Phase to address:** Scoring engine phase, before BranchRbiaScore snapshot is written. Write unit tests with known weighted average inputs and verify exact NUMERIC output.

**Severity:** CRITICAL — incorrect scores stored in the immutable JSONB snapshot cannot be recalculated later. An incorrect score reported to a UCB's board is a regulatory compliance failure.

---

### Pitfall 3: EngagementStatus Transition Map Not Updated — Old States Hard-Coded in Actions

**What goes wrong:**

The existing `update-engagement-status.ts` has a hard-coded `VALID_TRANSITIONS` map covering only 2 states (`PLANNED → IN_PROGRESS`, `IN_PROGRESS → COMPLETED`). The v6.0 schema added 6 states (`TEAM_ASSIGNED`, `OPENING_MEETING`, `EXIT_MEETING`, `REPORT_DRAFT` plus existing ones) but the transition enforcement is application-level only:

```typescript
// CURRENT CODE — update-engagement-status.ts line 14-17:
const VALID_TRANSITIONS: Record<string, string[]> = {
  PLANNED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
};
// The new states (TEAM_ASSIGNED, OPENING_MEETING, EXIT_MEETING, REPORT_DRAFT)
// are NOT in this map. Any engagement stuck in OPENING_MEETING can be
// transitioned to CANCELLED... but not to IN_PROGRESS because it's not listed.
// Result: engagements become stuck in intermediate states with no valid path forward.
```

The v6.0 `EngagementStatus` enum has 8 values but the UI components rendering the "Advance" button only know the old 2-state flow. A REPORT_DRAFT engagement shows no valid next action in the UI.

**Why it happens:**

Schema is additive (new enum values added), but the application code enforcing transitions was never updated to match. TypeScript doesn't catch this: the enum accepts all 8 values but the `VALID_TRANSITIONS` record doesn't error on missing keys — it silently returns `undefined`, which fails the `!allowed` check and blocks all transitions.

**How to avoid:**

Implement the full 8-state transition map as a type-safe constant checked at compile time:

```typescript
// src/lib/engagement-state-machine.ts
import { EngagementStatus } from "@/generated/prisma";

// Exhaustive type: TypeScript errors if any EngagementStatus value is missing
type TransitionMap = Record<EngagementStatus, EngagementStatus[]>;

export const ENGAGEMENT_TRANSITIONS: TransitionMap = {
  PLANNED: ["TEAM_ASSIGNED", "CANCELLED"],
  TEAM_ASSIGNED: ["OPENING_MEETING", "PLANNED", "CANCELLED"],
  OPENING_MEETING: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["EXIT_MEETING", "CANCELLED"],
  EXIT_MEETING: ["REPORT_DRAFT", "IN_PROGRESS"],
  REPORT_DRAFT: ["COMPLETED", "EXIT_MEETING"],
  COMPLETED: [],
  CANCELLED: [],
};

// Role restrictions per transition (add RBIA-specific roles)
export const TRANSITION_ROLES: Partial<
  Record<`${EngagementStatus}_${EngagementStatus}`, string[]>
> = {
  PLANNED_TEAM_ASSIGNED: ["CAE", "AUDIT_MANAGER", "LEAD_AUDITOR"],
  OPENING_MEETING_IN_PROGRESS: ["LEAD_AUDITOR", "FIELD_AUDITOR"],
  EXIT_MEETING_REPORT_DRAFT: ["LEAD_AUDITOR", "AUDIT_MANAGER"],
  REPORT_DRAFT_COMPLETED: ["CAE", "AUDIT_MANAGER"],
};
```

Map TypeScript's `Record<EngagementStatus, ...>` to catch unhandled states at compile time — if a new enum value is added without updating the map, TypeScript will error.

Also: check whether the meeting records (opening/exit `EngagementMeeting` with `signedOff=true`) are prerequisites before allowing certain transitions. A transition to `IN_PROGRESS` should require an `OPENING_MEETING` record exists and is signed off.

**Warning signs:**

- Engagements stuck in intermediate states with no UI action to advance them
- `VALID_TRANSITIONS[engagement.status]` returns `undefined` in logs
- Unit tests only cover PLANNED → IN_PROGRESS → COMPLETED path
- No test file for state machine transitions at all

**Phase to address:** State machine refactor phase, before any RBIA workflow UI is built. Regression test the old PLANNED/IN_PROGRESS/COMPLETED path still works after the refactor.

**Severity:** HIGH — engagements stuck in intermediate states block the entire audit cycle; auditors cannot complete audits; reported as a product-breaking bug.

---

### Pitfall 4: Dual Entity Confusion — ActionPoint vs Observation Ambiguity in UI and Queries

**What goes wrong:**

`ActionPoint` (v6.0, 6-state simple lifecycle, `ActionPointStatus`) and `Observation` (existing, 7-state formal 5C lifecycle, `ObservationStatus`) coexist. Both live in the same UI context (an engagement's findings view). Developers write DAL functions querying "findings" that return only one type, silently omitting the other:

```typescript
// COMMON MISTAKE: "Get all findings for engagement" returns only Observations
export async function getEngagementFindings(
  engagementId: string,
  tenantId: string,
) {
  return db.observation.findMany({
    where: { engagementId, tenantId },
    // ActionPoints not returned — user sees incomplete picture
  });
}

// UI shows "3 findings" but auditor created 15 action points + 2 observations
// Branch manager sees 2 items in compliance portal, misses 15 action points
```

The `Observation.observationType` field (`"FORMAL"` vs `"AUTO_LEGACY"`) adds a third category — legacy auto-created observations from `AuditExaminationResponse` (old model) that have no analog in the new flow. Dashboard widgets counting open findings are inconsistent depending on which query they use.

**Why it happens:**

The dual-model period is explicitly a coexistence phase ("both coexist until Phase 6 cleanup"). Without a shared interface or query convention, each developer independently decides which model(s) to query. Dashboard aggregations, reports, and compliance portals each make different choices.

**How to avoid:**

Define a canonical "unified findings" DAL function that always returns both types for engagement-scoped queries:

```typescript
// src/data-access/engagement-findings.ts
export type EngagementFinding =
  | { type: "ACTION_POINT"; data: ActionPoint }
  | { type: "OBSERVATION"; data: Observation };

export async function getEngagementFindings(
  engagementId: string,
  tenantId: string,
): Promise<EngagementFinding[]> {
  const [actionPoints, observations] = await Promise.all([
    db.actionPoint.findMany({ where: { engagementId, tenantId } }),
    db.observation.findMany({
      where: { engagementId, tenantId, observationType: "FORMAL" }, // Formal only
    }),
  ]);

  return [
    ...actionPoints.map((ap) => ({ type: "ACTION_POINT" as const, data: ap })),
    ...observations.map((o) => ({ type: "OBSERVATION" as const, data: o })),
  ];
}
```

Establish a project convention documented in CLAUDE.md:

- `ActionPoint`: operational per-engagement findings, `engagementId` required
- `Observation` with `observationType="FORMAL"`: formal 5C audit findings, engagement-linked
- `Observation` with `observationType="AUTO_LEGACY"`: created by old `submit-examination-response.ts` from flat model — display-only, do not create new ones

**Warning signs:**

- Different counts for "open findings" on dashboard vs. engagement detail page
- Compliance portal shows different number of items than the audit team's view
- Code that `findMany` only `observation` for engagement-scoped queries
- Any new server action that creates an `Observation` for v6.0 engagements (should create `ActionPoint` instead)

**Phase to address:** Foundation phase, before any dual-model UI is built. Convention must be established before multiple developers touch finding queries.

**Severity:** HIGH — a compliance officer reviewing an engagement sees incomplete data; RBI inspection would flag missing action point tracking.

---

### Pitfall 5: BranchRbiaScore JSONB Snapshot Mutated After Freezing

**What goes wrong:**

`BranchRbiaScore` has `frozenAt: DateTime?` — `null` means live/draft, non-null means immutable. There is no database constraint preventing updates to a frozen snapshot. A background job or server action that recalculates scores could overwrite a frozen record:

```typescript
// DANGEROUS: no check for frozenAt before overwriting
export async function upsertBranchScore(engagementId: string, scores: ScoringResult) {
  await db.branchRbiaScore.upsert({
    where: { engagementId },
    update: {
      compositeScore: scores.composite,
      scoringTreeSnapshot: scores.tree,  // Overwrites frozen historical record!
    },
    create: { ... }
  });
}
// If engagement.status = COMPLETED and branchRbiaScore.frozenAt != null,
// this silently destroys the immutable audit record.
```

Additionally, `scoringTreeSnapshot` is a raw JSONB blob. If `ExaminationNode` weights or names change after a snapshot is frozen, the snapshot's tree structure represents the state at freeze time but there is no version marker indicating which schema version generated it. Future code reading the snapshot must deserialize against an unknown structure.

**Why it happens:**

Application-enforced immutability ("trust the app to check `frozenAt`") is fragile across multiple code paths: the scoring engine, score recalculation jobs, admin recompute tools, and direct DAL updates. One missed check defeats immutability.

**How to avoid:**

Enforce immutability at the database level with a trigger:

```sql
-- Apply manually (not in Prisma migrations)
CREATE OR REPLACE FUNCTION prevent_frozen_score_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."frozenAt" IS NOT NULL THEN
    RAISE EXCEPTION 'BranchRbiaScore % is frozen (frozenAt=%) and cannot be modified',
      OLD.id, OLD."frozenAt";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_frozen_rbia_score
  BEFORE UPDATE ON "BranchRbiaScore"
  FOR EACH ROW EXECUTE FUNCTION prevent_frozen_score_mutation();
```

Add a version marker to the JSONB snapshot at creation time:

```typescript
const scoringTreeSnapshot = {
  schemaVersion: "v6.0", // Identifies which ExaminationNode schema generated this
  generatedAt: new Date().toISOString(),
  engagementId,
  tree: computedTree, // Full node-score tree
};
```

**Warning signs:**

- Score recalculation service uses `upsert` without checking `frozenAt` first
- No database trigger on `BranchRbiaScore` UPDATE
- `scoringTreeSnapshot` JSONB has no version marker field
- Tests exist for freezing but not for mutation-after-freeze

**Phase to address:** BranchRbiaScore implementation phase, before any engagement can be completed. The trigger must be applied before any `frozenAt` is ever set.

**Severity:** CRITICAL — overwriting a frozen score means the audit trail no longer reflects what was reported to the board and to RBI; a regulatory audit would find a discrepancy between the issued report and the current database record.

---

### Pitfall 6: Prisma Lacks Recursive CTE Support — N+1 Tree Traversals

**What goes wrong:**

Loading the full ExaminationNode tree for an engagement using Prisma's relational API requires recursive includes or N+1 patterns:

```typescript
// NAIVE: loads root, then for each child loads its children — depth 5 tree = 5 round trips minimum
async function getFullTree(nodeId: string): Promise<TreeNode> {
  const node = await db.examinationNode.findFirst({
    where: { id: nodeId },
    include: { children: true }, // Only 1 level deep
  });
  // Must repeat for each child... recursively
}

// OR: load all nodes and reconstruct in memory (better, but can be 600+ rows per engagement)
const allNodes = await db.examinationNode.findMany({
  where: { tenantId, isActive: true },
  orderBy: { path: "asc" }, // Path-ordered = parent before children
});
// This works but is a full table scan on every engagement load
```

Prisma has no `WITH RECURSIVE` CTE support (GitHub issue #3725, open since 2019). All recursive tree queries require either `$queryRaw` or the load-all-and-reconstruct pattern.

**Why it happens:**

Developers unfamiliar with the Prisma limitation write `include: { children: { include: { children: ... } } }` which is static depth (hardcoded 5 levels) and extremely verbose. The `$queryRaw` path is unfamiliar so developers avoid it.

**How to avoid:**

Use `$queryRaw` with `WITH RECURSIVE` for subtree fetches, with `ltree`-compatible path prefix queries for simpler cases:

```typescript
// src/data-access/examination-tree.ts

// Fast: load full tenant tree once, reconstruct in memory (cache-friendly for shared trees)
export async function getExaminationTree(tenantId: string) {
  const nodes = await db.examinationNode.findMany({
    where: { tenantId, isActive: true },
    orderBy: { path: "asc" }, // Ensures parent always before child
    select: {
      id: true,
      code: true,
      name: true,
      path: true,
      depth: true,
      parentId: true,
      weight: true,
      isCritical: true,
      isLeaf: true,
      displayOrder: true,
      description: true,
    },
  });
  return buildTreeFromFlatList(nodes); // O(n) reconstruction
}

// For subtree by path prefix (uses PostgreSQL LIKE index on path column):
export async function getSubtreeByPath(tenantId: string, pathPrefix: string) {
  return db.examinationNode.findMany({
    where: {
      tenantId,
      path: { startsWith: pathPrefix },
      isActive: true,
    },
    orderBy: { path: "asc" },
  });
}
```

The `@@index([tenantId, path])` index already in the schema makes the `LIKE 'prefix%'` pattern efficient. The full tree load is feasible because the tree is shared across all engagements for a tenant — cache it in the request or use React's `cache()`.

**Warning signs:**

- Any function with `include: { children: { include: { children: ... } } }` — this is static depth, will break on deeper trees
- Engagement page takes >2s to load when tree has 100+ nodes
- Separate DB queries for each module when rendering the scoring UI

**Phase to address:** Tree DAL implementation phase. Establish the `getExaminationTree` + `buildTreeFromFlatList` pattern before any scoring UI is built.

**Severity:** MODERATE — performance degrades linearly with tree depth and node count; at 568 items this is tolerable but queries become slow without the path-prefix index strategy.

---

### Pitfall 7: ExaminationNode tenantId Scoping Mixed with Global Master Data

**What goes wrong:**

The `ExaminationNode` tree is scoped per tenant (`tenantId` required). This is correct for tenant-customized frameworks but creates a data management problem: the master RBI examination framework must be seeded separately for each new tenant, and any update to the framework (new regulatory requirement) must be applied to all tenants independently.

The current `ExaminationArea`/`ExaminationItem` models are also tenant-scoped (the seed creates identical copies for each tenant). The v6.0 `ExaminationNode` follows the same pattern. This means:

```typescript
// Seeding a new tenant requires copying the entire master tree:
// 39 areas × ~14 items each = 568 items duplicated per tenant
// With ExaminationNode: potentially 600+ nodes per tenant in the tree

// When RBI updates regulations (adds a new checklist item):
// Must UPDATE all tenants' ExaminationNode records
// No single "master" to update — must iterate all tenants
```

Additionally: if `applicableBranchTypes` is empty (meaning "all branch types"), the EngagementModuleSelection filter by branch type must handle this correctly. If a developer queries `applicableBranchTypes @> ARRAY['LARGE']` it will return false for nodes with an empty array — the opposite of the intended semantics.

**Why it happens:**

Per-tenant tree scoping was chosen to allow tenant customization. But without a "master → tenant copy" mechanism, framework updates are operationally expensive. The empty-array "all types" semantics is a non-obvious convention.

**How to avoid:**

Document the seeding pattern and create a one-command tenant tree provisioning script:

```typescript
// scripts/provision-tenant-tree.ts
export async function provisionExaminationTreeForTenant(tenantId: string) {
  // Read master tree from canonical source (e.g., src/data/rbia-master-tree.ts)
  // Deep-copy with new IDs, preserving parent relationships via code-based lookup
  // Single transaction
}
```

For `applicableBranchTypes` filtering, use application-level logic not database operators:

```typescript
// CORRECT: treat empty array as "applicable to all"
function isNodeApplicableForBranch(
  node: ExaminationNode,
  branchType: string,
): boolean {
  if (node.applicableBranchTypes.length === 0) return true; // Empty = all
  return node.applicableBranchTypes.includes(branchType);
}
```

Document this in CLAUDE.md under "Gotchas" so future developers don't use `@>` array operators in database queries for this field.

**Warning signs:**

- New tenant onboarded but has 0 examination nodes
- After RBI regulation update, some tenants have the new item, others don't
- Module auto-selection for a branch returns no modules (empty `applicableBranchTypes` filtered out by DB operator)

**Phase to address:** Tree seeding phase and onboarding flow. The provisioning script must exist before the first tenant is onboarded with the v6.0 flow.

**Severity:** HIGH — a new tenant with no examination tree cannot run any RBIA audit; applicableBranchTypes bug silently drops modules from all audits.

---

## Technical Debt Patterns

| Shortcut                                                         | Immediate Benefit         | Long-term Cost                                                         | When Acceptable                                                   |
| ---------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Computing roll-up scores in JavaScript                           | Avoids raw SQL complexity | Floating-point drift in stored scores; wrong values in immutable JSONB | Never — always use PostgreSQL NUMERIC arithmetic                  |
| Hard-coding `PLANNED → IN_PROGRESS → COMPLETED` transitions      | Works for current UI      | New states inaccessible; engagements stuck                             | Never — the transition map must cover all 8 states                |
| Loading full tree on every request without caching               | Simpler code              | 600+ row query per engagement page load                                | MVP only, add `cache()` wrapper before production                 |
| Using `AuditExaminationResponse` (old model) for new engagements | No migration needed       | Dual model confusion perpetuated; old model removal blocked            | Never for new v6.0 engagements — always use `ExaminationResponse` |
| Storing scores as JavaScript `number` (not `Decimal.js`)         | Easier arithmetic         | Precision loss stored in DB                                            | Never — keep as string until final formatting                     |
| Setting `path` manually in seed scripts                          | Faster to write           | Path/parentId divergence goes undetected                               | Only in seed scripts that also run the integrity validation query |

---

## Integration Gotchas

| Integration                                                                           | Common Mistake                                                                                        | Correct Approach                                                                                                                            |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `BranchRbiaScore.scoringTreeSnapshot` JSONB                                           | Deserializing without checking `schemaVersion` field; breaks when tree structure changes              | Always check `schemaVersion` before deserializing; handle `undefined` as legacy v5.x format                                                 |
| `ExaminationResponse ↔ ActionPoint`                                                   | Assuming all `ActionPoint` records have a `sourceResponseId` — some are manually created              | Always treat `sourceResponseId` as nullable; do not JOIN unconditionally                                                                    |
| `EngagementMeeting` prerequisites                                                     | Advancing to `IN_PROGRESS` without verifying opening meeting is signed off                            | Check `EngagementMeeting.signedOff = true` WHERE `meetingType = OPENING` before transition                                                  |
| `BmResponseBatch` vs individual `ActionPoint.bmResponseDate`                          | Using `BmResponseBatch.respondedActionPoints` as authoritative count vs. actual `ActionPoint` records | Count from `ActionPoint` directly; `BmResponseBatch` is a denormalized summary that can drift                                               |
| Old `initializeSections` action creates `AuditSectionInstance` from `ExaminationArea` | v6.0 engagements should use `ExaminationNode` modules, not `ExaminationArea` sections                 | Gate `initializeSections` by `engagementType` or `auditType` — RBIA engagements use `EngagementModuleSelection`, not `AuditSectionInstance` |

---

## Performance Traps

| Trap                                                                     | Symptoms                                                                 | Prevention                                                                                                           | When It Breaks                                                        |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Loading `ExaminationNode` tree per request without caching               | Engagement page slow; 600+ rows queried for every auditor action         | Use Next.js `cache()` or React cache for tree load within a request                                                  | 10+ concurrent auditors on same tenant                                |
| Recursive CTE without depth limit                                        | Query runs indefinitely if circular path corruption exists               | Add `WHERE depth < 6` to CTE termination condition                                                                   | Any corrupted path creates cycle                                      |
| JSONB `scoringTreeSnapshot` indexed and searched                         | `GIN` index on full snapshot JSON is large and updates are expensive     | Never index `scoringTreeSnapshot`; query by `engagementId` (unique) or `branchId` + `frozenAt`                       | Any GIN index on a 600-node snapshot                                  |
| Scoring recomputation as a request-path operation                        | Report page takes 30+ seconds; user sees timeout                         | Compute scores async in a pg-boss job triggered on `ExaminationResponse` save; store in `BranchRbiaScore` as a draft | Any audit with 100+ responses                                         |
| `ActionPoint.serialNo` sequential within engagement — computed at insert | Race condition: two simultaneous ActionPoint creates get same `serialNo` | Use `SELECT MAX(serialNo) + 1 FOR UPDATE` within a transaction, or use a PostgreSQL sequence per engagement          | Any engagement with 2+ auditors creating action points simultaneously |

---

## Security Mistakes

| Mistake                                                      | Risk                                                                         | Prevention                                                                                        |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `ExaminationNode` tree loaded without `tenantId` filter      | Cross-tenant tree access — auditor sees another bank's examination framework | ALL `ExaminationNode` queries MUST include `WHERE tenantId = ?`; the tree is tenant-scoped        |
| `BranchRbiaScore` read by engagementId without tenant check  | Engagement ID is guessable UUID — could read another tenant's frozen score   | Always scope by `tenantId AND engagementId` in every DAL query                                    |
| `ActionPoint` branch assignment not validated against tenant | Creating an ActionPoint with a `branchId` belonging to another tenant        | Verify `branch.tenantId = session.tenantId` before creating ActionPoint                           |
| Frozen `BranchRbiaScore` served via API without auth check   | Historical scores exposed to unauthenticated requests                        | All score endpoints require session + permission check; `frozenAt != null` does not mean "public" |

---

## UX Pitfalls

| Pitfall                                                                                 | User Impact                                                                        | Better Approach                                                                                   |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Showing scoring progress as "X/568 items scored" with no grouping                       | Overwhelming; auditors don't know where to start                                   | Show progress by module (depth=1 nodes): "Operations: 12/45", "Credit: 0/38"                      |
| ActionPoints and Observations mixed in a single unfiltered list                         | Auditor cannot distinguish 5C formal findings from quick action items              | Separate tabs or badges: "Action Points (15)" and "Formal Observations (3)"                       |
| Tree loading spinner blocks the entire engagement page                                  | Auditor waits for all 600+ nodes before seeing any UI                              | Render tree skeleton, load modules top-down, let auditors start on Module 1 before Module 2 loads |
| "Freeze score" button available on REPORT_DRAFT engagements without completion check    | Score frozen with many unscored items (NULL scores silently excluded from roll-up) | Show "X items not yet scored will be excluded" warning before freeze; require CAE confirmation    |
| Engagement status badge shows "IN_PROGRESS" for OPENING_MEETING and EXIT_MEETING states | Auditors and managers cannot tell which stage the audit is in                      | Map all 8 states to distinct UI labels and colors; never collapse intermediate states             |

---

## "Looks Done But Isn't" Checklist

- [ ] **ExaminationNode tree seeding:** Nodes exist for one tenant but provisioning script not tested for new tenant onboarding — verify new tenant gets complete tree via `getExaminationTree(newTenantId)`
- [ ] **Weighted score roll-up:** Calculation produces correct result for known inputs — write a test with a 3-node tree (parent + 2 leaves, weights 0.4/0.6, scores 1.0/0.5) and verify parent = 0.70 exactly
- [ ] **Critical item cap:** `isCritical=true` leaf with `NON_COMPLIANT` score caps parent at 0.5 — unit test this rule specifically
- [ ] **State machine completeness:** All 8 `EngagementStatus` values covered in `VALID_TRANSITIONS` — TypeScript `Record<EngagementStatus, ...>` will catch missing entries at compile time
- [ ] **Frozen snapshot immutability:** Database trigger exists on `BranchRbiaScore` UPDATE — query `SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'BranchRbiaScore'`
- [ ] **ActionPoint serialNo uniqueness:** Two concurrent ActionPoint creates in same engagement — run a concurrent test to verify no duplicate `serialNo`
- [ ] **Old model isolation:** No new `AuditExaminationResponse` records created for v6.0 engagements — add a CHECK or application guard gated by `engagement.auditType`
- [ ] **Path integrity:** After seeding, run `SELECT COUNT(*) FROM "ExaminationNode" child JOIN "ExaminationNode" parent ON child."parentId" = parent.id WHERE child.path != parent.path || '/' || child.code` — must return 0
- [ ] **Dual model dashboard:** Dashboard "open findings" count includes both `ActionPoint` (DRAFT/ISSUED/BM_RESPONSE_DUE) and `Observation` (DRAFT/SUBMITTED) counts — verify by creating one of each and checking dashboard widget

---

## Recovery Strategies

| Pitfall                                   | Recovery Cost | Recovery Steps                                                                                                                                                |
| ----------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Corrupted materialized paths              | HIGH          | Write a repair script: for each node ordered by depth, recompute `path = parent.path + '/' + code`; run in a transaction; validate with integrity check query |
| Floating-point scores in frozen snapshots | HIGH          | Cannot recalculate (immutable); must unfreeze (set `frozenAt = null`), recompute using PostgreSQL NUMERIC, refreeze; log the re-freeze in audit trail         |
| Engagements stuck in unmapped states      | MEDIUM        | Admin script: identify engagements with status not in `VALID_TRANSITIONS`; manually advance to nearest valid state; add missing transitions to map            |
| Duplicate ActionPoint serialNos           | MEDIUM        | Query: `SELECT serialNo, COUNT(*) FROM "ActionPoint" GROUP BY engagementId, serialNo HAVING COUNT(*) > 1`; renumber duplicates in a transaction               |
| Mutation of frozen BranchRbiaScore        | CRITICAL      | If scores were overwritten: check git history / audit log for previous value; restore from pre-overwrite backup; add the database trigger immediately         |
| Missing tenant tree                       | MEDIUM        | Run `provisionExaminationTreeForTenant(tenantId)` script; verify node count matches master template; no data loss risk                                        |

---

## Pitfall-to-Phase Mapping

| Pitfall                                      | Prevention Phase                        | Severity | Verification                                                      |
| -------------------------------------------- | --------------------------------------- | -------- | ----------------------------------------------------------------- |
| Materialized path corruption                 | Tree seeding / ExaminationNode DAL      | CRITICAL | Integrity check SQL returns 0 rows                                |
| Score roll-up floating-point drift           | Scoring engine implementation           | CRITICAL | Unit test: known inputs produce exact NUMERIC output              |
| State machine missing new states             | State machine refactor (before RBIA UI) | HIGH     | TypeScript `Record<EngagementStatus, ...>` compiles without error |
| ActionPoint/Observation dual model confusion | Foundation: establish naming convention | HIGH     | Unified `getEngagementFindings` used everywhere                   |
| Frozen JSONB snapshot mutation               | BranchRbiaScore implementation          | CRITICAL | DB trigger exists; mutation attempt raises exception              |
| N+1 tree traversal (no Prisma recursive CTE) | Tree DAL implementation                 | MODERATE | Engagement page loads in <1s with 600 nodes                       |
| Per-tenant tree — global updates expensive   | Onboarding + provisioning scripts       | HIGH     | New tenant onboarded via script in <30s                           |
| `applicableBranchTypes` empty = all          | Module selection logic                  | HIGH     | Engagement for LARGE branch includes nodes with empty array       |
| Critical item cap not applied                | Scoring engine implementation           | CRITICAL | Unit test: critical NON_COMPLIANT leaf caps parent at 0.5         |
| ActionPoint serialNo race condition          | ActionPoint creation action             | MODERATE | Concurrent test produces unique serial numbers                    |
| Old model used in new engagements            | New engagement creation guard           | HIGH     | No `AuditExaminationResponse` created for RBIA engagements        |
| JSONB snapshot missing schema version        | BranchRbiaScore freeze function         | MODERATE | All snapshots have `schemaVersion` field in JSON                  |

---

## Sources

- [Prisma GitHub issue #4562 — Tree structures support (open since 2020)](https://github.com/prisma/prisma/issues/4562)
- [Prisma GitHub issue #3725 — Recursive relationship CTE support](https://github.com/prisma/prisma/issues/3725)
- [Prisma GitHub issue #6852 — Decimals lose precision (postgres)](https://github.com/prisma/prisma/issues/6852)
- [Prisma GitHub issue #10412 — Loss of precision when creating records with Decimal](https://github.com/prisma/prisma/issues/10412)
- [Prisma GitHub issue #9170 — Decimal objects cannot be serialized as JSON](https://github.com/prisma/prisma/issues/9170)
- [Prisma Documentation — Special fields and types (Decimal)](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types)
- [PostgreSQL Numeric Types documentation](https://www.postgresql.org/docs/current/datatype-numeric.html)
- [PostgreSQL WITH RECURSIVE queries](https://www.postgresql.org/docs/current/queries-with.html)
- [Cybertec — Speeding up recursive queries and hierarchical data](https://www.cybertec-postgresql.com/en/postgresql-postgresql-speeding-up-recursive-queries-and-hierarchic-data/)
- [MinervaDB — Materialized Path implementation in PostgreSQL](https://minervadb.xyz/materialized-path-model-in-postgresql/)
- [DZone — Materialized paths for tree structures in relational databases](https://dzone.com/articles/materialized-paths-tree-structures-relational-database)
- [Heap.io — When to avoid JSONB in a PostgreSQL schema](https://www.heap.io/blog/when-to-avoid-jsonb-in-a-postgresql-schema)
- [Medium — Zero-downtime PostgreSQL JSONB migration](https://medium.com/@shinyjai2011/zero-downtime-postgresql-jsonb-migration-a-practical-guide-for-scalable-schema-evolution-9f74124ef4a1)
- [PlanetScale — Backward compatible database changes](https://planetscale.com/blog/backward-compatible-databases-changes)
- [AEGIS codebase — `prisma/schema.prisma` ExaminationNode, BranchRbiaScore, ActionPoint models](prisma/schema.prisma)
- [AEGIS codebase — `src/actions/audit-execution/update-engagement-status.ts` current VALID_TRANSITIONS map](src/actions/audit-execution/update-engagement-status.ts)
- [AEGIS codebase — `src/actions/audit-execution/submit-examination-response.ts` old model usage](src/actions/audit-execution/submit-examination-response.ts)

---

_Pitfalls research for: RBIA Audit Workflow Implementation — Adding hierarchical scoring, dual models, state machine expansion to AEGIS_
_Researched: 2026-02-22_
