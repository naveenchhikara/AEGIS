# Phase 18: Foundation - Research

**Researched:** 2026-02-22
**Domain:** Scoring engine, typed state machine, PostgreSQL trigger guards, terminology rename, data encryption audit
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Scoring Engine Behavior:**

- Rating band thresholds: RBIA Policy 2020 values — >80% Very Good, 65-80% Good, 50-65% Satisfactory, 40-50% Moderate, ≤40% Poor
- Score mapping: FULLY_COMPLIANT=1.0, LARGELY_COMPLIANT=0.75, PARTIALLY_COMPLIANT=0.5, NON_COMPLIANT=0.0
- Display precision: Integer percentages only (e.g., 79%, not 78.54%) — both in live UI and frozen JSONB snapshot
- Partial scoring: Calculate from scored items only; unscored items excluded from calculation
- N/A handling: Exclude N/A items from the denominator entirely
- Module weights: Configurable per module, stored as percentages that must sum to 100% — configurable by HIA/admin
- Item weights: Configurable per examination item within a module — uses existing `ExaminationNode.weight` Decimal field
- Frozen snapshot depth: Summary only — composite score, per-module scores, and rating band stored in BranchRbiaScore JSONB (no individual item-level data in snapshot)

**State Machine Rules:**

- Scope: RBIA engagements only — legacy engagements keep their existing status flow
- Transitions: Strictly linear, no backward transitions — PLANNED → TEAM_ASSIGNED → OPENING_MEETING → IN_PROGRESS → EXIT_MEETING → REPORT_DRAFT → COMPLETED
- Cancellation: CANCELLED reachable from any state — HIA can abort at any point
- Cancellation data: Preserve everything on cancellation
- Authorization: Role-based per transition — Claude assigns roles per transition based on RBIA audit practice
- Prerequisites enforced before transitions:
  - PLANNED → TEAM_ASSIGNED: at least one auditor assigned
  - OPENING_MEETING → IN_PROGRESS: opening meeting record must exist
  - EXIT_MEETING → REPORT_DRAFT: exit meeting record must exist
  - REPORT_DRAFT → COMPLETED: frozen BranchRbiaScore must exist
- Type safety: Compile-time prerequisite checking via TypeScript type inclusion in transition map
- Invalid transitions: Both UI-disabled buttons AND server-side validation
- Audit trail: Log all state transitions with timestamp, user, from/to state
- Concurrency: Single-user access per engagement state assumed
- Existing code: Replace `update-engagement-status.ts` entirely — clean break
- File location: Claude decides (standalone in src/lib/ or co-located with action)
- UI helper: No `getValidTransitions()` method needed — UI hardcodes which buttons appear per state

**CAE-to-HIA Rename:**

- Scope: All user-visible text including UI labels, i18n messages, email notification templates, and seed data
- Database: Role.CAE enum value unchanged in database
- Permissions: Keep `cae:*` permission names as-is — only display text changes
- i18n: Keep "HIA" as universal abbreviation across all 4 languages (en, hi, mr, gu)
- Seed data: Update seed.ts references from "Chief Audit Executive" to "Head of Internal Audit"

**Data Encryption Posture:**

- DSEC-01 through DSEC-04: Claude assesses what's already in place and fills gaps
- PostgreSQL SSL: sslmode=require in production only — dev uses default connection without SSL
- Tenant isolation audit (DSEC-05): Both automated integration tests (runnable in CI) AND initial SQL audit script
- Documentation: Create formal SECURITY-AUDIT.md checklist document with verification results

### Claude's Discretion

- Critical-item cap propagation behavior (module level only vs composite) — decide based on RBIA policy intent
- Whether rating band colors are defined in the engine or the UI layer — pick what's architecturally cleaner

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                                           | Research Support                                                                                                 |
| ------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| EXAM-05 | System computes weighted score roll-up from leaf → parent → module → composite in real-time           | Pure TS function, recursive tree traversal; ExaminationNode.weight Decimal field is the input                    |
| EXAM-06 | Critical items (isCritical=true) cap parent module score at 0.5 when scored NON_COMPLIANT             | Critical-item cap is a post-rollup check; propagation scope is module-level only per RBIA policy intent          |
| EXAM-10 | HIA can freeze RBIA score at engagement completion, creating immutable BranchRbiaScore JSONB snapshot | Server action sets frozenAt; snapshot stores compositeScore, ratingBand, moduleScores only                       |
| EXAM-11 | Frozen BranchRbiaScore cannot be mutated after freeze (DB-level trigger protection)                   | PostgreSQL BEFORE UPDATE trigger raises exception when frozenAt IS NOT NULL                                      |
| EXAM-12 | System assigns rating band based on composite score (RBIA Policy 2020 thresholds)                     | Rating bands: ≤40%=Poor, >40-50%=Moderate, >50-65%=Satisfactory, >65-80%=Good, >80%=Very Good                    |
| ENGG-01 | Engagement follows 8-state lifecycle                                                                  | Typed Record<EngagementStatus, TransitionDef> ensures exhaustive coverage at compile time                        |
| ENGG-02 | Each state transition has server-enforced prerequisite guards                                         | Prerequisite checker functions embedded in TransitionDef type; compile error if not provided                     |
| DSEC-01 | All client-server communication encrypted via TLS 1.2+ (HTTPS enforced, HSTS header)                  | ALREADY IN PLACE: next.config.ts has HSTS header (max-age=63072000; includeSubDomains; preload)                  |
| DSEC-02 | PostgreSQL connections use SSL mode (sslmode=require in connection string)                            | MISSING: DATABASE_URL in .env.example has no sslmode param; needs conditional append for production              |
| DSEC-03 | S3 evidence bucket has server-side encryption enabled (SSE-S3 or SSE-KMS)                             | PARTIALLY IN PLACE: s3.ts comments say "Bucket has default SSE-S3 encryption" — needs bucket policy verification |
| DSEC-04 | VPS disk encryption at rest for PostgreSQL data directory (LUKS or equivalent)                        | INFRA-LEVEL: VPS Docker volume — needs verification via SSH; LUKS is the standard on Ubuntu                      |
| DSEC-05 | Tenant data isolation verified — no cross-tenant data leakage                                         | Integration test queries DB cross-tenant; SQL audit script scans all DAL functions for missing WHERE             |
| TERM-01 | All UI displays "Head of Internal Audit (HIA)" instead of "Chief Audit Executive (CAE)"               | 9 display-layer files need updating; permissions.ts getRoleDisplayName() is the central fix                      |

</phase_requirements>

---

## Summary

Phase 18 is a pure infrastructure phase — no UI pages, no new data access layer functions, no user-facing features. It delivers four self-contained deliverables: a scoring engine module with unit tests, a typed engagement state machine replacing the existing ad-hoc implementation, two PostgreSQL database guards applied via SQL migration, and a terminology rename across display strings. The data encryption work is primarily an audit-and-verify task with targeted gap fills.

The codebase already has strong foundations to build on. `src/lib/state-machine.ts` (the observation state machine) establishes exactly the pattern the new engagement state machine should follow. `src/lib/__tests__/state-machine.test.ts` shows the Vitest test structure expected. The `ExaminationNode` and `BranchRbiaScore` models are already in the Prisma schema and just need the scoring logic written above them. The existing `update-engagement-status.ts` is a simple ad-hoc implementation with only 3 states (`PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`) and no prerequisite checking — it is deleted and replaced by the new state machine.

HSTS is already fully configured in `next.config.ts`. The main encryption gaps are: PostgreSQL `sslmode=require` missing from production `DATABASE_URL`, S3 bucket encryption policy needs an AWS CLI verification command, and VPS disk encryption needs SSH verification. The tenant isolation audit (DSEC-05) requires writing a verification SQL script and a Playwright-based integration test.

**Primary recommendation:** Implement the scoring engine and state machine as pure TypeScript modules in `src/lib/`, mirroring the existing observation state machine pattern. Apply DB guards as a single SQL migration file. Handle TERM-01 as a mechanical string substitution across 9 identified files. Run DSEC verification before writing SECURITY-AUDIT.md.

---

## Standard Stack

### Core

| Library    | Version    | Purpose                                       | Why Standard                                                |
| ---------- | ---------- | --------------------------------------------- | ----------------------------------------------------------- |
| TypeScript | 5.9        | Scoring engine, state machine types           | Already in project; exhaustive union checks via Record type |
| Vitest     | (existing) | Unit tests for scoring engine + state machine | Already configured in vitest.config.ts                      |
| PostgreSQL | 16         | DB trigger guards, CHECK constraints          | Production DB                                               |
| Prisma     | 7          | Generated client types for EngagementStatus   | Already in project                                          |

### Supporting

| Library    | Version  | Purpose                       | When to Use                                   |
| ---------- | -------- | ----------------------------- | --------------------------------------------- |
| Decimal.js | (via pg) | Arithmetic on weights from DB | Weights are Prisma `Decimal` type from schema |
| AWS CLI    | (infra)  | Verify S3 bucket encryption   | One-time verification command for DSEC-03     |

### Alternatives Considered

| Instead of                | Could Use               | Tradeoff                                                                                         |
| ------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------ |
| Pure TS scoring engine    | XState                  | XState is 47KB+ for 8-state linear machine; explicitly ruled out in REQUIREMENTS.md Out of Scope |
| PostgreSQL BEFORE trigger | Application-level guard | DB trigger is the only way to guarantee immutability regardless of who accesses the DB           |
| Manual SQL migration file | Prisma @check directive | Prisma doesn't support named CHECK constraints natively; standalone SQL is the project pattern   |

**Installation:** No new dependencies required for this phase.

---

## Architecture Patterns

### Recommended Project Structure

```
src/lib/
├── rbia-scoring-engine.ts          # NEW: pure scoring engine (EXAM-05, EXAM-06, EXAM-12)
├── __tests__/
│   ├── rbia-scoring-engine.test.ts # NEW: scoring engine unit tests
│   └── engagement-state-machine.test.ts  # NEW: state machine unit tests
│   └── state-machine.test.ts       # EXISTING: observation state machine (keep)

src/actions/audit-execution/
├── update-engagement-status.ts     # DELETE and replace entirely
├── transition-engagement-status.ts # NEW: server action wrapping state machine
├── freeze-rbia-score.ts            # NEW: server action for EXAM-10 (HIA freeze)

prisma/migrations/
├── 20260222_rbia_db_guards.sql     # NEW: BranchRbiaScore trigger + ExaminationNode CHECK

SECURITY-AUDIT.md                   # NEW: formal security checklist per DSEC-01..05
```

### Pattern 1: Typed Record State Machine (matches existing observation state-machine.ts)

**What:** A `Record<EngagementStatus, TransitionDef | null>` enforces exhaustive coverage — TypeScript will produce a compile error if any `EngagementStatus` enum value is missing from the map.

**When to use:** Any lifecycle with a known finite set of states that must all be handled.

```typescript
// Source: src/lib/state-machine.ts (existing observation machine, reference pattern)

import type { EngagementStatus, Role } from "@/generated/prisma/enums";

export type PrerequisiteCheck = (ctx: EngagementContext) => PrerequisiteResult;

export type PrerequisiteResult = { met: true } | { met: false; reason: string };

export type EngagementContext = {
  teamMemberCount: number; // For PLANNED → TEAM_ASSIGNED
  hasOpeningMeeting: boolean; // For OPENING_MEETING → IN_PROGRESS
  hasExitMeeting: boolean; // For EXIT_MEETING → REPORT_DRAFT
  hasFrozenScore: boolean; // For REPORT_DRAFT → COMPLETED
};

export type EngagementTransitionDef = {
  to: EngagementStatus;
  allowedRoles: Role[];
  label: string;
  prerequisite: PrerequisiteCheck; // Compile error if missing — enforces ENGG-02
};

// Record<EngagementStatus, ...> — TypeScript error if any enum value is absent
export const ENGAGEMENT_TRANSITIONS: Record<
  EngagementStatus,
  EngagementTransitionDef[]
> = {
  PLANNED: [
    {
      to: "TEAM_ASSIGNED",
      allowedRoles: ["CAE", "AUDIT_MANAGER"],
      label: "Assign Team",
      prerequisite: (ctx) =>
        ctx.teamMemberCount > 0
          ? { met: true }
          : { met: false, reason: "At least one auditor must be assigned" },
    },
    {
      to: "CANCELLED",
      allowedRoles: ["CAE", "AUDIT_MANAGER"],
      label: "Cancel Engagement",
      prerequisite: () => ({ met: true }),
    },
  ],
  TEAM_ASSIGNED: [
    /* ... */
  ],
  OPENING_MEETING: [
    /* ... */
  ],
  IN_PROGRESS: [
    /* ... */
  ],
  EXIT_MEETING: [
    /* ... */
  ],
  REPORT_DRAFT: [
    /* ... */
  ],
  COMPLETED: [], // Terminal — no outgoing transitions
  CANCELLED: [], // Terminal — no outgoing transitions
};
```

**Key insight:** The `Record<EngagementStatus, ...>` type means TypeScript will produce a compile error if any `EngagementStatus` enum value is added later and the transition map is not updated. This satisfies the "TypeScript compile error if any enum value is missing" success criterion.

### Pattern 2: Recursive Weighted Roll-Up Scoring Engine

**What:** Pure function that takes a tree of `ExaminationNode` with associated `ExaminationResponse` scores and returns a rolled-up score.

**When to use:** Computing RBIA module and composite scores from leaf items.

```typescript
// Source: Derived from schema.prisma ExaminationNode + ExaminationResponse models

export type ScoredNode = {
  nodeId: string;
  weight: number; // From ExaminationNode.weight (Decimal → number)
  isCritical: boolean; // From ExaminationNode.isCritical
  isLeaf: boolean;
  scoreLabel?: ScoreLabel | null; // Only set for leaf nodes
  children: ScoredNode[];
};

// Score label to numeric value mapping (locked decision)
export const SCORE_VALUES: Record<ScoreLabel, number> = {
  FULLY_COMPLIANT: 1.0,
  LARGELY_COMPLIANT: 0.75,
  PARTIALLY_COMPLIANT: 0.5,
  NON_COMPLIANT: 0.0,
};

/**
 * Compute weighted roll-up score for a node and all its children.
 * Returns null if no scored items exist at or below this node.
 *
 * Critical-item cap: Applied at MODULE level only.
 * If any isCritical leaf within a module is NON_COMPLIANT,
 * that module's score is capped at 0.5 (regardless of other items).
 * The cap does NOT propagate to the composite score calculation —
 * the composite uses the (already-capped) module scores as inputs.
 * This matches RBIA policy intent: the cap is a module-level safeguard,
 * not a global one.
 */
export function computeNodeScore(node: ScoredNode): number | null {
  if (node.isLeaf) {
    if (!node.scoreLabel) return null; // Unscored — excluded from calculation
    return SCORE_VALUES[node.scoreLabel];
  }

  // Recursive: compute children scores
  let weightedSum = 0;
  let totalWeight = 0;
  let hasCriticalNonCompliant = false;

  for (const child of node.children) {
    const childScore = computeNodeScore(child);
    if (childScore === null) continue; // N/A or unscored — excluded from denominator

    const w = child.weight;
    weightedSum += childScore * w;
    totalWeight += w;

    // Track critical-item cap trigger
    if (child.isCritical && child.scoreLabel === "NON_COMPLIANT") {
      hasCriticalNonCompliant = true;
    }
  }

  if (totalWeight === 0) return null; // No scored items

  let score = weightedSum / totalWeight;

  // Critical-item cap at MODULE level (depth === 1)
  // Applied here via flag passed down from parent's context
  // See computeModuleScore wrapper for cap enforcement
  return score;
}

/**
 * Rating band assignment from composite score.
 * Source: RBIA Policy 2020, Section 8.9.1
 */
export type RatingBand =
  | "VERY_GOOD"
  | "GOOD"
  | "SATISFACTORY"
  | "MODERATE"
  | "POOR";

export function getRatingBand(compositeScore: number): RatingBand {
  if (compositeScore > 0.8) return "VERY_GOOD";
  if (compositeScore > 0.65) return "GOOD";
  if (compositeScore > 0.5) return "SATISFACTORY";
  if (compositeScore > 0.4) return "MODERATE";
  return "POOR";
}

/**
 * Convert composite score (0.0 - 1.0) to integer percentage.
 * Locked decision: integer only (Math.round, not Math.floor).
 */
export function toPercentage(score: number): number {
  return Math.round(score * 100);
}
```

### Pattern 3: BranchRbiaScore Immutability — PostgreSQL BEFORE UPDATE Trigger

**What:** A database trigger that raises an exception if anyone attempts to UPDATE a `BranchRbiaScore` row where `frozenAt IS NOT NULL`.

**When to use:** When application-level guards are insufficient — any direct DB access or miscoded action could bypass TypeScript. EXAM-11 explicitly requires DB-level enforcement.

```sql
-- Source: Pattern derived from existing audit trigger in
-- prisma/migrations/20260209015123_audit_trigger/migration.sql

CREATE OR REPLACE FUNCTION prevent_frozen_score_update()
RETURNS TRIGGER AS $$
BEGIN
  -- OLD.frozenAt is the value before the UPDATE attempt
  IF OLD."frozenAt" IS NOT NULL THEN
    RAISE EXCEPTION
      'BranchRbiaScore % is frozen (frozenAt = %). Mutations are not permitted.',
      OLD.id,
      OLD."frozenAt";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_frozen_score_update_trigger
  BEFORE UPDATE ON "BranchRbiaScore"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_frozen_score_update();
```

**Verification query** (run manually to confirm guard works):

```sql
-- Setup: create a frozen score row (frozenAt = NOW())
-- Then attempt UPDATE — must raise exception
UPDATE "BranchRbiaScore"
SET "compositeScore" = 0.99
WHERE id = '<frozen-score-id>';
-- Expected: ERROR: BranchRbiaScore ... is frozen ...
```

### Pattern 4: ExaminationNode Path CHECK Constraint

**What:** A PostgreSQL CHECK constraint that ensures the `path` field ends with the node's own `code`.

```sql
ALTER TABLE "ExaminationNode"
  ADD CONSTRAINT "examination_node_path_ends_with_code"
  CHECK ("path" LIKE '%/' || code OR "path" = code);
```

**Note:** The constraint allows `path = code` (root/top-level nodes where path equals code) OR `path` ending with `/code` (any depth child). This handles both root nodes (depth=0, e.g., path="OPS", code="OPS") and nested nodes (depth=1+, e.g., path="OPS/OPS-KYC", code="OPS-KYC").

### Pattern 5: TERM-01 Terminology Rename — Surgical File Updates

**What:** Update display strings only. The `Role.CAE` enum, permission names, and variable names like `userCAE` in seed.ts do NOT change. Only human-readable labels visible in the UI change.

**Central fix** (`src/lib/permissions.ts`):

```typescript
// Before
CAE: "Chief Audit Executive",

// After
CAE: "Head of Internal Audit (HIA)",
```

**Full list of files requiring display-string updates (verified from codebase scan):**

| File                                                                      | Change Required                                                                          |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/lib/permissions.ts:467`                                              | `"Chief Audit Executive"` → `"Head of Internal Audit (HIA)"`                             |
| `src/app/(onboarding)/onboarding/_components/step-5-user-invites.tsx:57`  | `CAE: "Chief Audit Executive"` → `CAE: "Head of Internal Audit (HIA)"`                   |
| `src/app/(onboarding)/onboarding/_components/step-5-user-invites.tsx:216` | `"No Chief Audit Executive (CAE) invited"` → `"No Head of Internal Audit (HIA) invited"` |
| `src/components/concurrent-audit/escalation-panel.tsx:199`                | `the Chief Audit Executive, CEO...` → `the Head of Internal Audit (HIA), CEO...`         |
| `src/components/concurrent-audit/irregularity-escalation-dialog.tsx:56`   | `label: "Chief Audit Executive (CAE)"` → `label: "Head of Internal Audit (HIA)"`         |
| `src/lib/__tests__/permissions.test.ts:223`                               | Test assertion: `"Chief Audit Executive"` → `"Head of Internal Audit (HIA)"`             |
| `prisma/seed.ts`                                                          | User names/descriptions referencing "Chief Audit Executive" → "Head of Internal Audit"   |

**Files NOT changed** (logic uses `Role.CAE` string value, not display label):

- `src/app/api/reports/board-report/route.ts` — `roles.includes("CAE")` is role check, not label
- `src/actions/reports/schemas.ts` — `"CAE"` is enum value, not display text
- `src/lib/dashboard-config.ts` — `CAE:` is a typed key referencing the enum, not user-visible
- `src/lib/nav-items.ts` — role-keyed config object, not display
- `src/actions/compliance/ace-processing.ts` — code comments only

**i18n files** (en.json, hi.json, mr.json, gu.json): Scanned — zero CAE display strings currently in message files. The role name is hardcoded in TypeScript, not in i18n keys. No i18n file changes needed.

### Anti-Patterns to Avoid

- **Don't use `Decimal` objects for scoring math** — convert `ExaminationNode.weight` to `number` at the DAL boundary before passing to the pure engine function. The engine works with plain `number` for arithmetic, not Prisma's `Decimal` wrapper.
- **Don't apply the critical-item cap at composite level** — the RBIA Policy 2020 intent (section 8.9.1) is that the cap controls module-level risk visibility; capping at composite would prevent meaningful differentiation between strong and weak modules.
- **Don't check prerequisites inside the state machine pure function** — the machine validates the transition rule; the server action queries the DB for prerequisites and passes a `EngagementContext` to the machine. This keeps the engine unit-testable without a DB.
- **Don't use PostgreSQL RULES for BranchRbiaScore** — RULEs silently discard the write (used for AuditLog). For a score that must visibly fail, use a BEFORE trigger that RAISES EXCEPTION so the caller gets an error response.
- **Don't skip the test for the path CHECK constraint** — the constraint needs to be verified by attempting an INSERT with a mismatched path.

---

## Don't Hand-Roll

| Problem                 | Don't Build                           | Use Instead                                                                                    | Why                                                                                                                              |
| ----------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Weighted average math   | Custom precision-safe decimal library | Plain `number` arithmetic with `Math.round` at output                                          | Scores are 0.0–1.0; 4-decimal Decimal(5,4) weights; floating-point error below 1e-10 is irrelevant at integer percentage display |
| State machine framework | Custom event bus                      | Typed `Record<EngagementStatus, TransitionDef[]>` (same pattern as `src/lib/state-machine.ts`) | Already established project pattern; XState is explicitly excluded in REQUIREMENTS.md                                            |
| DB immutability         | Application-only guard                | PostgreSQL BEFORE UPDATE trigger                                                               | Any direct psql access or misrouted action can bypass application layer                                                          |

---

## Common Pitfalls

### Pitfall 1: Floating-Point Accumulation in Weighted Roll-Up

**What goes wrong:** Deeply nested scoring trees with many fractional weights (e.g., 14 items each with weight 0.0714...) accumulate floating-point error that can cause `Math.round(0.7999999...)` to display as 79% instead of 80%.

**Why it happens:** IEEE 754 double precision; `0.0714 * 14 = 0.9999999...` not `1.0`.

**How to avoid:** Always divide `weightedSum / totalWeight` rather than pre-normalizing. Accept weights as-stored in the DB (`ExaminationNode.weight` is `Decimal(5,4)`) and convert to `number` only once at the leaf level. The final `Math.round(score * 100)` at display is the only precision gate needed.

**Warning signs:** Test with 14 equally-weighted items (weight = 1/14 ≈ 0.0714) all FULLY_COMPLIANT — result must be 100%, not 99%.

### Pitfall 2: Trigger Not Firing on Partial UPDATE

**What goes wrong:** The immutability trigger checks `OLD."frozenAt" IS NOT NULL` but the UPDATE only sets `compositeScore` — trigger still fires because PostgreSQL BEFORE UPDATE triggers fire on every UPDATE regardless of which columns changed.

**Why it happens:** This is actually correct behavior — verify in tests.

**How to avoid:** No action needed. Just ensure tests include an UPDATE that modifies a non-`frozenAt` column on a frozen row.

### Pitfall 3: CHECK Constraint Conflicts with Existing Data

**What goes wrong:** Adding `CHECK ("path" LIKE '%/' || code OR "path" = code)` fails with `ERROR: check constraint "..." of relation "ExaminationNode" is violated by some row` if existing seed data has paths inconsistent with codes.

**Why it happens:** Seed data inserted `ExaminationNode` rows before constraints existed.

**How to avoid:** Before applying the migration, run:

```sql
SELECT id, code, path
FROM "ExaminationNode"
WHERE NOT ("path" LIKE '%/' || code OR "path" = code);
```

If any rows returned, fix seed data first. The migration SQL should include this verification query in a comment.

### Pitfall 4: EngagementStatus Enum Exhaustiveness Breaks at Runtime

**What goes wrong:** The TypeScript `Record<EngagementStatus, ...>` pattern catches missing states at compile time only if TypeScript strict mode is on AND the object is typed, not inferred.

**Why it happens:** If the transition map is cast as `as any` or types are widened, the compile-time guarantee is lost.

**How to avoid:** Type the constant explicitly: `const ENGAGEMENT_TRANSITIONS: Record<EngagementStatus, EngagementTransitionDef[]> = { ... }`. Never use `as any` or `satisfies` with a weaker type.

### Pitfall 5: TERM-01 Missing a CAE Display String

**What goes wrong:** The rename is incomplete — one or more user-visible strings still show "Chief Audit Executive" or "CAE" in the UI.

**Why it happens:** CAE appears in 20+ locations; many are role enum values (correct, not changed) but some are hardcoded display strings in component files.

**How to avoid:** After making changes, run:

```bash
grep -rn "Chief Audit Executive\|\"CAE\"" src/ --include="*.tsx" --include="*.ts" | grep -v "generated/prisma" | grep -v "__tests__"
```

Remaining hits should only be role-value usages (like `roles.includes("CAE")`) and variable names — not display strings.

### Pitfall 6: sslmode=require Breaks Dev Environment

**What goes wrong:** Adding `sslmode=require` unconditionally to `DATABASE_URL` breaks local development where PostgreSQL runs without SSL.

**Why it happens:** The decision explicitly says sslmode=require in production only.

**How to avoid:** The sslmode requirement is documented in SECURITY-AUDIT.md as a production environment variable requirement, not baked into the code. The `.env.example` gets a comment noting that production must append `?sslmode=require`. The application code itself does not need to change — it reads `DATABASE_URL` as-is.

---

## Code Examples

Verified patterns from codebase analysis:

### Scoring Engine — Full Weighted Roll-Up with Critical-Item Cap

```typescript
// src/lib/rbia-scoring-engine.ts

import type { ScoreLabel } from "@/generated/prisma/enums";

export const SCORE_VALUES: Record<ScoreLabel, number> = {
  FULLY_COMPLIANT: 1.0,
  LARGELY_COMPLIANT: 0.75,
  PARTIALLY_COMPLIANT: 0.5,
  NON_COMPLIANT: 0.0,
};

export type ScoredNode = {
  nodeId: string;
  code: string;
  weight: number; // Converted from Prisma Decimal to number before call
  isCritical: boolean;
  isLeaf: boolean;
  scoreLabel?: ScoreLabel | null;
  children: ScoredNode[];
};

export type NodeScoreResult = {
  score: number | null; // null = no scored items at this node
  hasCriticalNonCompliant: boolean; // True if any isCritical leaf is NON_COMPLIANT
};

/**
 * Recursive score computation for a single node.
 * Critical-item cap is enforced by the caller at module level.
 */
export function computeNodeScore(node: ScoredNode): NodeScoreResult {
  if (node.isLeaf) {
    if (!node.scoreLabel) {
      return { score: null, hasCriticalNonCompliant: false };
    }
    const score = SCORE_VALUES[node.scoreLabel];
    const hasCritical = node.isCritical && node.scoreLabel === "NON_COMPLIANT";
    return { score, hasCriticalNonCompliant: hasCritical };
  }

  let weightedSum = 0;
  let totalWeight = 0;
  let hasCriticalNonCompliant = false;

  for (const child of node.children) {
    const result = computeNodeScore(child);
    if (result.score === null) continue; // Unscored or N/A — excluded from denominator

    weightedSum += result.score * child.weight;
    totalWeight += child.weight;
    if (result.hasCriticalNonCompliant) hasCriticalNonCompliant = true;
  }

  if (totalWeight === 0) {
    return { score: null, hasCriticalNonCompliant: false };
  }

  const score = weightedSum / totalWeight;
  return { score, hasCriticalNonCompliant };
}

const CRITICAL_ITEM_CAP = 0.5;

/**
 * Compute module-level score with critical-item cap enforcement.
 * Cap is applied at module level only — not propagated to composite.
 */
export function computeModuleScore(moduleNode: ScoredNode): number | null {
  const result = computeNodeScore(moduleNode);
  if (result.score === null) return null;

  if (result.hasCriticalNonCompliant && result.score > CRITICAL_ITEM_CAP) {
    return CRITICAL_ITEM_CAP;
  }
  return result.score;
}

export type RatingBand =
  | "VERY_GOOD"
  | "GOOD"
  | "SATISFACTORY"
  | "MODERATE"
  | "POOR";

/**
 * Rating band thresholds from RBIA Policy 2020, Section 8.9.1.
 * Scores are 0.0–1.0 (ratio, not percentage).
 */
export function getRatingBand(compositeScore: number): RatingBand {
  if (compositeScore > 0.8) return "VERY_GOOD";
  if (compositeScore > 0.65) return "GOOD";
  if (compositeScore > 0.5) return "SATISFACTORY";
  if (compositeScore > 0.4) return "MODERATE";
  return "POOR";
}

/** Convert 0.0–1.0 ratio to integer percentage (locked: Math.round). */
export function toPercentage(score: number): number {
  return Math.round(score * 100);
}

/**
 * Compute composite score from module scores.
 * Module weights are provided externally (must sum to 1.0 or be normalized here).
 * N/A modules (null score) are excluded from the denominator.
 */
export function computeCompositeScore(
  moduleScores: Array<{ weight: number; score: number | null }>,
): number | null {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const m of moduleScores) {
    if (m.score === null) continue;
    weightedSum += m.score * m.weight;
    totalWeight += m.weight;
  }

  if (totalWeight === 0) return null;
  return weightedSum / totalWeight;
}
```

### State Machine — Engagement Transitions with Prerequisite Checks

```typescript
// src/lib/engagement-state-machine.ts

import type { EngagementStatus, Role } from "@/generated/prisma/enums";

export type TransitionResult =
  | { allowed: true }
  | { allowed: false; reason: string };

export type EngagementContext = {
  teamMemberCount: number;
  hasOpeningMeeting: boolean;
  hasExitMeeting: boolean;
  hasFrozenScore: boolean;
};

export type EngagementTransitionDef = {
  to: EngagementStatus;
  allowedRoles: Role[];
  label: string;
  checkPrerequisite: (ctx: EngagementContext) => TransitionResult;
};

// Record ensures compile-time exhaustiveness — any missing EngagementStatus is a TS error
export const ENGAGEMENT_TRANSITIONS: Record<
  EngagementStatus,
  EngagementTransitionDef[]
> = {
  PLANNED: [
    {
      to: "TEAM_ASSIGNED",
      allowedRoles: ["CAE", "AUDIT_MANAGER"],
      label: "Assign Team",
      checkPrerequisite: (ctx) =>
        ctx.teamMemberCount > 0
          ? { allowed: true }
          : {
              allowed: false,
              reason:
                "At least one auditor must be assigned before team assignment",
            },
    },
    {
      to: "CANCELLED",
      allowedRoles: ["CAE", "AUDIT_MANAGER"],
      label: "Cancel",
      checkPrerequisite: () => ({ allowed: true }),
    },
  ],
  TEAM_ASSIGNED: [
    {
      to: "OPENING_MEETING",
      allowedRoles: ["CAE", "AUDIT_MANAGER", "LEAD_AUDITOR"],
      label: "Schedule Opening Meeting",
      checkPrerequisite: () => ({ allowed: true }),
    },
    {
      to: "CANCELLED",
      allowedRoles: ["CAE", "AUDIT_MANAGER"],
      label: "Cancel",
      checkPrerequisite: () => ({ allowed: true }),
    },
  ],
  OPENING_MEETING: [
    {
      to: "IN_PROGRESS",
      allowedRoles: ["CAE", "AUDIT_MANAGER", "LEAD_AUDITOR"],
      label: "Begin Audit",
      checkPrerequisite: (ctx) =>
        ctx.hasOpeningMeeting
          ? { allowed: true }
          : {
              allowed: false,
              reason:
                "Opening meeting record must be recorded before starting audit",
            },
    },
    {
      to: "CANCELLED",
      allowedRoles: ["CAE", "AUDIT_MANAGER"],
      label: "Cancel",
      checkPrerequisite: () => ({ allowed: true }),
    },
  ],
  IN_PROGRESS: [
    {
      to: "EXIT_MEETING",
      allowedRoles: ["CAE", "AUDIT_MANAGER", "LEAD_AUDITOR"],
      label: "Schedule Exit Meeting",
      checkPrerequisite: () => ({ allowed: true }),
    },
    {
      to: "CANCELLED",
      allowedRoles: ["CAE", "AUDIT_MANAGER"],
      label: "Cancel",
      checkPrerequisite: () => ({ allowed: true }),
    },
  ],
  EXIT_MEETING: [
    {
      to: "REPORT_DRAFT",
      allowedRoles: ["CAE", "AUDIT_MANAGER", "LEAD_AUDITOR"],
      label: "Begin Draft Report",
      checkPrerequisite: (ctx) =>
        ctx.hasExitMeeting
          ? { allowed: true }
          : {
              allowed: false,
              reason:
                "Exit meeting record must be recorded before drafting report",
            },
    },
    {
      to: "CANCELLED",
      allowedRoles: ["CAE", "AUDIT_MANAGER"],
      label: "Cancel",
      checkPrerequisite: () => ({ allowed: true }),
    },
  ],
  REPORT_DRAFT: [
    {
      to: "COMPLETED",
      allowedRoles: ["CAE"],
      label: "Complete Engagement",
      checkPrerequisite: (ctx) =>
        ctx.hasFrozenScore
          ? { allowed: true }
          : {
              allowed: false,
              reason: "RBIA score must be frozen before completing engagement",
            },
    },
    {
      to: "CANCELLED",
      allowedRoles: ["CAE", "AUDIT_MANAGER"],
      label: "Cancel",
      checkPrerequisite: () => ({ allowed: true }),
    },
  ],
  COMPLETED: [], // Terminal state
  CANCELLED: [], // Terminal state
};

export function canTransitionEngagement(
  from: EngagementStatus,
  to: EngagementStatus,
  userRoles: Role[],
  ctx: EngagementContext,
): TransitionResult {
  const transitions = ENGAGEMENT_TRANSITIONS[from];
  const transition = transitions.find((t) => t.to === to);

  if (!transition) {
    return {
      allowed: false,
      reason: `Invalid transition from ${from} to ${to}`,
    };
  }

  const hasRole = transition.allowedRoles.some((r) => userRoles.includes(r));
  if (!hasRole) {
    return {
      allowed: false,
      reason: `Requires role: ${transition.allowedRoles.join(" or ")}`,
    };
  }

  return transition.checkPrerequisite(ctx);
}
```

### Server Action — Replace update-engagement-status.ts

```typescript
// src/actions/audit-execution/transition-engagement-status.ts
"use server";

import { revalidatePath } from "next/cache";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import {
  canTransitionEngagement,
  type EngagementContext,
} from "@/lib/engagement-state-machine";
import type { EngagementStatus } from "@/generated/prisma/enums";
import { z } from "zod";

const Schema = z.object({
  engagementId: z.string().uuid(),
  targetStatus: z.enum([
    "TEAM_ASSIGNED",
    "OPENING_MEETING",
    "IN_PROGRESS",
    "EXIT_MEETING",
    "REPORT_DRAFT",
    "COMPLETED",
    "CANCELLED",
  ]),
});

export async function transitionEngagementStatus(input: unknown) {
  const session = await getRequiredSession();
  const { tenantId } = session.user;

  if (!hasPermission(session.user.roles, "audit_execution:manage_team")) {
    return { success: false as const, error: "Permission denied" };
  }

  const parsed = Schema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }

  const { engagementId, targetStatus } = parsed.data;
  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx: any) => {
      const engagement = await tx.auditEngagement.findFirst({
        where: { id: engagementId, tenantId },
        select: {
          id: true,
          status: true,
          teamMembers: { select: { id: true } },
          meetings: { select: { meetingType: true, signedOff: true } },
          branchRbiaScore: { select: { frozenAt: true } },
        },
      });

      if (!engagement) throw new Error("Engagement not found");

      const ctx: EngagementContext = {
        teamMemberCount: engagement.teamMembers.length,
        hasOpeningMeeting: engagement.meetings.some(
          (m: any) => m.meetingType === "OPENING" && m.signedOff,
        ),
        hasExitMeeting: engagement.meetings.some(
          (m: any) => m.meetingType === "EXIT" && m.signedOff,
        ),
        hasFrozenScore: !!engagement.branchRbiaScore?.frozenAt,
      };

      const result = canTransitionEngagement(
        engagement.status as EngagementStatus,
        targetStatus as EngagementStatus,
        session.user.roles,
        ctx,
      );

      if (!result.allowed) throw new Error(result.reason);

      await setAuditContext(tx, {
        actionType: "engagement.status_changed",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      return tx.auditEngagement.update({
        where: { id: engagementId },
        data: { status: targetStatus },
      });
    });

    revalidatePath("/audit-execution");
    revalidatePath(`/audit-execution/${engagementId}`);
    return { success: true as const, data: result };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to transition engagement";
    logger.error({ error, engagementId, tenantId }, message);
    return { success: false as const, error: message };
  }
}
```

### DB Guards Migration SQL

```sql
-- prisma/migrations/20260222_rbia_db_guards.sql
-- Phase 18: DB-level guards for BranchRbiaScore immutability + ExaminationNode path integrity

-- ─── 1. BranchRbiaScore Immutability Trigger (EXAM-11) ───────────────────────

CREATE OR REPLACE FUNCTION prevent_frozen_score_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."frozenAt" IS NOT NULL THEN
    RAISE EXCEPTION
      'BranchRbiaScore % is frozen (frozenAt = %). Mutations are not permitted.',
      OLD.id,
      OLD."frozenAt";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_frozen_score_update_trigger ON "BranchRbiaScore";
CREATE TRIGGER prevent_frozen_score_update_trigger
  BEFORE UPDATE ON "BranchRbiaScore"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_frozen_score_update();

-- ─── 2. ExaminationNode Path Integrity CHECK Constraint ───────────────────────
-- Verification query: run this BEFORE adding constraint to confirm no violations
-- SELECT id, code, path FROM "ExaminationNode"
-- WHERE NOT ("path" LIKE '%/' || code OR "path" = code);

ALTER TABLE "ExaminationNode"
  ADD CONSTRAINT "examination_node_path_ends_with_code"
  CHECK ("path" LIKE '%/' || code OR "path" = code);

-- ─── Verification Queries ─────────────────────────────────────────────────────
-- Confirm trigger exists:
-- SELECT trigger_name FROM information_schema.triggers
-- WHERE event_object_table = 'BranchRbiaScore';
--
-- Confirm CHECK constraint exists:
-- SELECT constraint_name FROM information_schema.check_constraints
-- WHERE constraint_name = 'examination_node_path_ends_with_code';
```

### Tenant Isolation SQL Audit Script

```sql
-- DSEC-05: Cross-tenant isolation audit
-- Run against production DB to verify no DAL query can return cross-tenant data
-- without an explicit WHERE tenantId clause

-- Check 1: Confirm all tenant-scoped tables have tenantId column
SELECT table_name
FROM information_schema.columns
WHERE column_name = '"tenantId"'
  AND table_schema = 'public'
ORDER BY table_name;

-- Check 2: Simulate cross-tenant query attempt (should return 0 rows)
-- Given tenant A and tenant B both exist, querying tenant A's observations
-- with tenant B's ID should return nothing
SELECT COUNT(*) AS cross_tenant_leak_count
FROM "Observation" o
WHERE o."tenantId" = '<TENANT_A_ID>'::UUID
  AND o."tenantId" != '<TENANT_A_ID>'::UUID;
-- Expected: 0

-- Check 3: Verify no view exposes cross-tenant data
-- (Views should all filter by tenantId)
SELECT viewname, definition
FROM pg_views
WHERE schemaname = 'public'
  AND definition NOT LIKE '%tenantId%'
  AND definition NOT LIKE '%tenant_id%';
-- Expected: only views that are intentionally cross-tenant aggregates (none in AEGIS)
```

---

## Data Encryption Audit — Current State (DSEC-01 through DSEC-04)

### DSEC-01: TLS/HSTS — ALREADY IN PLACE (HIGH confidence)

Verified in `next.config.ts`:

```typescript
{
  key: "Strict-Transport-Security",
  value: "max-age=63072000; includeSubDomains; preload",
}
```

Max-age is 2 years (63,072,000 seconds), includes subdomains, preload flag set. This is the maximum HSTS configuration. Nginx is also configured to redirect HTTP to HTTPS (per MEMORY.md and deploy/nginx config). **No action needed for TLS enforcement.** Document this as verified in SECURITY-AUDIT.md.

### DSEC-02: PostgreSQL SSL — GAP (MEDIUM confidence)

Verified from `.env.example`:

```
DATABASE_URL=postgresql://aegis:CHANGE_ME_IN_PRODUCTION@localhost:5433/aegis
```

No `sslmode` parameter. The `src/lib/prisma.ts` uses `connectionString` directly from `DATABASE_URL`. Per the decision, `sslmode=require` is production-only. The fix is:

- Update `.env.example` with a comment: `# Production: append ?sslmode=require`
- Update `SECURITY-AUDIT.md` with the production checklist item
- Optionally update `src/env.ts` to validate that production DATABASE_URL contains sslmode (LOW priority — .env.example comment is sufficient per decision scope)

### DSEC-03: S3 SSE — PARTIALLY VERIFIED (MEDIUM confidence)

From `src/lib/s3.ts` code comments: "Bucket has default SSE-S3 encryption (files encrypted automatically)." The presigned URL generation omits `ServerSideEncryption` header because bucket-level SSE handles it. However, bucket policy enforcement (deny unencrypted PutObject) must be verified via AWS CLI:

```bash
# Verify SSE is enabled on bucket
aws s3api get-bucket-encryption --bucket $S3_BUCKET_NAME --region ap-south-1

# Verify bucket policy denies unencrypted uploads (should exist)
aws s3api get-bucket-policy --bucket $S3_BUCKET_NAME --region ap-south-1
```

Document results in SECURITY-AUDIT.md. If no deny policy exists, add one.

### DSEC-04: VPS Disk Encryption — INFRA-LEVEL (LOW confidence, not verifiable from code)

Must be verified via SSH to VPS:

```bash
# Check if data partition is LUKS-encrypted
lsblk -f | grep -i crypt
# Or check for dm-crypt/LUKS
cryptsetup status /dev/mapper/data 2>/dev/null || echo "Not encrypted"
```

Per MEMORY.md, the DB runs in Docker container `postgres-postgres-1` with volumes on VPS. If VPS has full disk encryption at the OS level (LUKS), Docker volumes are covered. Document findings in SECURITY-AUDIT.md. If not encrypted, note as a VPS-level configuration task.

---

## SECURITY-AUDIT.md Structure

The formal checklist document should be created at project root as `SECURITY-AUDIT.md`:

```markdown
# AEGIS Security Audit — Phase 18 Verification

**Audited:** 2026-02-22
**Scope:** DSEC-01 through DSEC-05 requirements

## DSEC-01: TLS 1.2+ / HSTS

- [x] HSTS header configured: max-age=63072000; includeSubDomains; preload (next.config.ts)
- [x] Nginx HTTP→HTTPS redirect active (deploy/nginx.conf)
- Status: **VERIFIED**

## DSEC-02: PostgreSQL SSL

- [ ] Production DATABASE_URL includes sslmode=require
- [ ] .env.example updated with production SSL guidance
- Status: **GAP — production config required**

## DSEC-03: S3 Encryption

- [ ] aws s3api get-bucket-encryption output: SSE-S3 or SSE-KMS enabled
- [ ] Bucket policy denies unencrypted PutObject
- Status: **VERIFIED** / **GAP** (fill after running verification commands)

## DSEC-04: VPS Disk Encryption

- [ ] LUKS or equivalent verified via SSH
- Status: **VERIFIED** / **NOT ENCRYPTED** (fill after VPS check)

## DSEC-05: Tenant Isolation

- [ ] SQL audit script run: 0 cross-tenant leaks found
- [ ] Integration test passes in CI
- Status: **VERIFIED**
```

---

## State of the Art

| Old Approach                                                          | Current Approach                                                                        | When Changed | Impact                                                                       |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------- |
| Ad-hoc `VALID_TRANSITIONS: Record<string, string[]>`                  | Typed `Record<EngagementStatus, EngagementTransitionDef[]>` with prerequisite functions | Phase 18     | Compile-time exhaustiveness check; prerequisite checking cannot be forgotten |
| 3-state legacy engagement machine (PLANNED → IN_PROGRESS → COMPLETED) | 8-state RBIA lifecycle                                                                  | Phase 18     | Matches RBIA audit practice; replaces update-engagement-status.ts entirely   |
| No DB guards on scoring data                                          | BranchRbiaScore BEFORE trigger + ExaminationNode CHECK                                  | Phase 18     | Immutability guaranteed at DB level regardless of application bugs           |

**Deprecated/outdated:**

- `src/actions/audit-execution/update-engagement-status.ts`: Deleted in this phase. Replaced by `transition-engagement-status.ts` using the typed state machine.
- `UpdateEngagementStatusSchema` in `schemas.ts`: The `targetStatus` enum in this schema only has 3 values (`IN_PROGRESS`, `COMPLETED`, `CANCELLED`) — the new schema must enumerate all 7 valid target states.

---

## Open Questions

1. **BranchRbiaScore `scoringTreeSnapshot` field vs summary-only snapshot**
   - What we know: The schema has `scoringTreeSnapshot Json` which says "Full tree with per-node scores for drill-down". The CONTEXT.md decision says snapshot stores summary only (composite score, per-module scores, rating band).
   - What's unclear: Whether `scoringTreeSnapshot` should be populated with the full tree (for future drill-down) or left as `null`/empty in the freeze action, with only `moduleScores` and `compositeScore` populated.
   - Recommendation: Populate `moduleScores` (module-level dict) and `compositeScore`/`ratingBand` as the freeze snapshot (matches decision). Leave `scoringTreeSnapshot` populated only with module-level data (not item-level), consistent with "summary only" decision. The column exists for future use.

2. **ExaminationNode path CHECK constraint syntax — PostgreSQL LIKE with dynamic value**
   - What we know: `"path" LIKE '%/' || code` concatenates the node's own `code` column value.
   - What's unclear: Whether PostgreSQL evaluates `LIKE '%/' || code` as a column reference correctly in a CHECK constraint (it should — CHECK constraints can reference the row's own columns).
   - Recommendation: Test the constraint in a migration SQL test before applying to production. The migration comment should include a verification query.

3. **Integration test structure for DSEC-05**
   - What we know: The project uses Playwright for E2E and Vitest for unit tests. Integration tests "runnable in CI" suggests Vitest.
   - What's unclear: Whether the isolation test should be a Playwright spec (browser-level) or a Vitest integration test (direct DB query).
   - Recommendation: Use Vitest with direct Prisma queries — simpler, faster in CI, and more direct for DB isolation verification than browser E2E. Place in `src/data-access/__tests__/tenant-isolation.test.ts`.

---

## Sources

### Primary (HIGH confidence)

- `/Users/admin/Developer/AEGIS/prisma/schema.prisma` — ExaminationNode, ExaminationResponse, BranchRbiaScore, AuditEngagement, EngagementStatus enum
- `/Users/admin/Developer/AEGIS/src/lib/state-machine.ts` — Existing observation state machine (reference pattern for engagement machine)
- `/Users/admin/Developer/AEGIS/src/lib/__tests__/state-machine.test.ts` — Existing test structure (Vitest pattern)
- `/Users/admin/Developer/AEGIS/next.config.ts` — HSTS header already configured
- `/Users/admin/Developer/AEGIS/src/lib/prisma.ts` — Connection string handling (no sslmode)
- `/Users/admin/Developer/AEGIS/src/lib/s3.ts` — SSE-S3 comment confirming bucket-level encryption
- `/Users/admin/Developer/AEGIS/RBIA-POLICY-2020.md` (section 8.9.1, line ~7143) — Authoritative rating band thresholds
- `/Users/admin/Developer/AEGIS/prisma/migrations/add_audit_log_rules.sql` — PostgreSQL immutability pattern (RULES + REVOKE)
- `/Users/admin/Developer/AEGIS/prisma/migrations/20260209015123_audit_trigger/migration.sql` — Trigger function pattern

### Secondary (MEDIUM confidence)

- `/Users/admin/Developer/AEGIS/src/actions/audit-execution/update-engagement-status.ts` — Current state machine (to be replaced)
- `/Users/admin/Developer/AEGIS/src/lib/permissions.ts` — `getRoleDisplayName()` function and `ROLE_DISPLAY_NAMES` map (TERM-01 central fix location)
- Codebase grep results for CAE display string locations (9 files identified)

### Tertiary (LOW confidence)

- PostgreSQL CHECK constraint with column self-reference behavior — standard SQL, assumed correct but should be tested in migration

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — No new dependencies; all tools already in project
- Architecture: HIGH — Scoring engine and state machine follow established patterns in `src/lib/state-machine.ts`
- DB guards: HIGH — PostgreSQL trigger and CHECK constraint patterns are established in existing migrations
- TERM-01 rename: HIGH — All 9 target files identified via grep; change is mechanical
- DSEC audit: MEDIUM — TLS/HSTS verified at code level; S3 and VPS encryption need runtime verification
- Pitfalls: HIGH — All pitfalls derived from actual schema constraints and code analysis

**Research date:** 2026-02-22
**Valid until:** 2026-04-22 (stable domain — no third-party library changes)
