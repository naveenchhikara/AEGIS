# Phase 20: Server Actions - Research

**Researched:** 2026-02-23
**Domain:** Next.js Server Actions, Zod v4, Prisma transactions, RBAC, RBIA lifecycle
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Validation & Error Feedback:**

- Inline field errors (react-hook-form style) — no toast notifications for validation failures
- Working notes required only when score is PARTIALLY_COMPLIANT or NON_COMPLIANT — optional for FULLY/LARGELY
- Server action errors return structured result object: `{ success: false, error: string, code: string }` — UI maps codes to messages
- Examination response uses explicit Save button (not auto-save on score click) — auditor clicks score, types notes, then clicks Save

**Transaction Atomicity:**

- Freeze action failure shows specific step that failed ("Score snapshot failed" or "Status transition blocked") — not a generic error
- Draft ActionPoint creation from flagForAP is silent — no toast or notification, user sees it when visiting findings tab
- Meeting recording + engagement transition is one atomic action — recording the meeting automatically triggers the status transition in the same transaction
- Freeze is all-in-one: freeze score + issue all draft APs (DRAFT→ISSUED) + create BmResponseBatch — single Prisma transaction

**Permission Mapping:**

- `rbia:examine` (score items): LEAD_AUDITOR + FIELD_AUDITOR only — not general AUDITOR role
- `rbia:score_freeze` (freeze score + complete engagement): CAE + AUDIT_MANAGER — allows delegation from HIA
- `action_point:manage` (create, edit, promote APs): LEAD_AUDITOR only — field auditors score but don't manage APs
- `action_point:bm_respond` (respond to issued APs): BRANCH_HEAD only — single point of accountability, no delegation to AUDITEE

**ActionPoint Lifecycle Flow:**

- Draft AP is fully prefilled from examination response: module code, item description, severity suggestion from score — auditor edits as needed
- Promote-to-observation creates a NEW linked Observation with sourceActionPointId — AP stays as-is, both coexist in dual findings model
- Carry-forward APs are auto-imported as draft APs in new engagement — auditor can delete unwanted ones (no manual import step)
- BmResponseBatch deadline is configurable per tenant — default 15 days, tenant admin can adjust

### Claude's Discretion

- Zod schema organization (single file vs per-domain files)
- Exact error code taxonomy
- Prisma transaction isolation level
- Server action file naming convention (match existing AEGIS patterns)
- revalidatePath strategy after mutations

### Deferred Ideas (OUT OF SCOPE)

None — all ideas were categorized.

</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                                                                     | Research Support                                                                                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| EXAM-03 | Auditor can add working notes (500-2000 chars) per leaf item as evidence and rationale                                          | `saveExaminationResponse` action: `workingNotes` field on `ExaminationResponse`; schema enforces char range                                                                    |
| EXAM-04 | Auditor can flag leaf items for Action Point and/or Observation promotion                                                       | `flagForActionPoint` + `flagForObservation` booleans on `ExaminationResponse`; upsert updates flags in same save                                                               |
| EXAM-09 | Examination state saves incrementally — no data loss if auditor closes mid-session                                              | Upsert on `engagementId_nodeId` compound unique — each Save overwrites the record; no session state required                                                                   |
| EXAM-10 | HIA can freeze RBIA score at engagement completion, creating immutable BranchRbiaScore JSONB snapshot                           | `freezeRbiaScore` action: calls scoring engine, writes frozen BranchRbiaScore, issues draft APs, creates BmResponseBatch, transitions to COMPLETED — all in one `$transaction` |
| ENGG-03 | HIA/Audit Manager can record opening meeting with attendees, minutes, and sign-off before IN_PROGRESS transition                | `recordMeeting` action: upserts EngagementMeeting + transitions engagement to OPENING_MEETING in one `$transaction`; `signOffMeeting` separately sets `signedOff=true`         |
| ENGG-04 | HIA/Audit Manager can record exit meeting with attendees, key discussion points, and sign-off before REPORT_DRAFT transition    | Same `recordMeeting` action with `meetingType: "EXIT"`                                                                                                                         |
| FIND-01 | Auditor can create ActionPoints from flagged examination responses (~15-40 per audit, operational findings)                     | `createActionPoint` action: prefills from ExaminationResponse (moduleCode, description, severity suggestion); assigns serial number atomically                                 |
| FIND-02 | ActionPoint follows 6-state lifecycle: DRAFT → ISSUED → BM_RESPONSE_DUE → BM_RESPONDED → VERIFIED → CLOSED (or CARRIED_FORWARD) | Lifecycle transitions handled by dedicated `transitionActionPoint` action with role guards; freeze batch-issues DRAFT→ISSUED                                                   |
| FIND-03 | Auditor can promote flagged examination responses to formal Observations (5C format, ~3-10 per audit)                           | `promoteToObservation` action: creates linked Observation with `sourceActionPointId`; adds `sourceActionPointId` field to schema                                               |
| FIND-06 | Each ActionPoint has serial number, title, description, severity, module code, and source examination response link             | `serialNo` computed as `COUNT(*) + 1` within engagement, atomically inside transaction to prevent races                                                                        |
| BMRP-01 | System creates BmResponseBatch when ActionPoints are issued at REPORT_DRAFT transition with 15-day deadline                     | Handled inside `freezeRbiaScore` transaction: count draft APs, compute deadline, create BmResponseBatch                                                                        |

</phase_requirements>

---

## Summary

Phase 20 is a pure server-actions phase — no UI work, no new DAL files, no schema changes except one (adding `sourceActionPointId` to `Observation`). The output is a new `src/actions/rbia/` directory containing Zod schemas and server action functions that all v6.0 UI (Phase 21+) will call.

The implementation pattern is already fully established in the codebase. All 81 existing server actions in `src/actions/` follow the same 5-step pattern: auth → permission check → Zod validation → `prismaForTenant()` → transaction with `setAuditContext()`. The Phase 20 actions are new instances of this pattern applied to RBIA-specific models (`ExaminationResponse`, `ActionPoint`, `EngagementMeeting`, `BranchRbiaScore`, `BmResponseBatch`).

The most complex action is `freezeRbiaScore`. It orchestrates five sequential steps inside a single Prisma transaction: (1) load all ExaminationResponses for the engagement and reconstruct a scored tree, (2) call `computeCompositeScore()` + `getRatingBand()` from the already-implemented scoring engine in `src/lib/rbia-scoring-engine.ts`, (3) write/update the `BranchRbiaScore` record with the frozen snapshot, (4) batch-update all DRAFT ActionPoints to ISSUED, (5) create a `BmResponseBatch` record. Each step can produce a specific error code for the UI to display.

Three new permissions must be added to `src/lib/permissions.ts`: `rbia:examine`, `rbia:score_freeze`, and `action_point:manage`, `action_point:bm_respond`. These are new string literals added to the `Permission` type union and mapped to appropriate roles in `ROLE_PERMISSIONS`. No library changes required — this is purely additive TypeScript.

**Primary recommendation:** Create `src/actions/rbia/` directory with one schemas file and one action file per functional domain (examination, meetings, findings, freeze). Follow the established 5-step action pattern exactly. Add four new permissions to `permissions.ts` before writing the actions. Add `sourceActionPointId` to `Observation` in schema and run `pnpm db:push` before implementing `promoteToObservation`.

---

## Standard Stack

### Core

| Library                | Version         | Purpose                                                                              | Why Standard                                         |
| ---------------------- | --------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| Next.js Server Actions | 16 (App Router) | Mutation entry point — `"use server"` functions called from client/server components | Project standard; replaces API routes for mutations  |
| Zod                    | v4              | Schema validation at action boundary                                                 | Already used across all 81 existing actions          |
| Prisma                 | 7               | ORM — `$transaction()` for atomicity, `upsert` for idempotent saves                  | Project ORM; `@prisma/adapter-pg` with pg.Pool       |
| `getRequiredSession()` | project         | Auth check + tenantId extraction                                                     | AEGIS standard — NEVER accept tenantId from URL/body |
| `hasPermission()`      | project         | RBAC gate                                                                            | `src/lib/permissions.ts` — multi-role aware          |
| `prismaForTenant()`    | project         | Returns singleton Prisma client (tenantId applied at app layer, not RLS)             | `src/data-access/prisma.ts`                          |
| `setAuditContext()`    | project         | Sets PostgreSQL session vars for audit trigger                                       | `src/data-access/audit-context.ts`                   |
| `revalidatePath()`     | Next.js         | Invalidates RSC cache after mutation                                                 | Standard Next.js pattern                             |

### Supporting

| Library                       | Version | Purpose                              | When to Use                                                                                                 |
| ----------------------------- | ------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `rbia-scoring-engine.ts`      | project | Pure functions for score computation | Used inside `freezeRbiaScore` to compute composite/per-module scores before snapshot                        |
| `engagement-state-machine.ts` | project | Validates engagement transitions     | Used inside meeting sign-off actions to guard OPENING_MEETING → IN_PROGRESS and EXIT_MEETING → REPORT_DRAFT |

### Alternatives Considered

| Instead of                        | Could Use             | Tradeoff                                                                                                                |
| --------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Per-domain schema files           | Single `schemas.ts`   | Per-domain is preferred in AEGIS (see `src/actions/observations/schemas.ts`) — easier to co-locate with the action file |
| Inline Zod schemas in action file | Separate schemas file | Separate file is AEGIS standard — schemas are imported by UI for client-side validation too                             |

**Installation:** No new packages. All dependencies already in project.

---

## Architecture Patterns

### Recommended Project Structure

```
src/actions/rbia/
├── schemas.ts               # All Zod schemas for RBIA actions (exported for client use)
├── examination.ts           # saveExaminationResponse, setModuleSelection
├── meetings.ts              # recordMeeting, signOffMeeting
├── findings.ts              # createActionPoint, updateActionPoint, deleteActionPoint, promoteToObservation, submitBmResponse
└── freeze.ts                # freezeRbiaScore (most complex — isolated for clarity)
```

This matches the existing multi-file pattern in `src/actions/audit-execution/` where related actions are grouped by domain in separate files with shared schemas.

### Pattern 1: AEGIS Standard Server Action (5-step pattern)

**What:** Every server action follows this identical structure — no exceptions.
**When to use:** Every action in Phase 20.

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import {
  SaveExaminationResponseSchema,
  type SaveExaminationResponseInput,
} from "./schemas";

export async function saveExaminationResponse(
  input: SaveExaminationResponseInput,
) {
  // Step 1: Auth
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  // Step 2: Permission check
  if (!hasPermission(userRoles, "rbia:examine")) {
    return {
      success: false as const,
      error: "No permission",
      code: "PERMISSION_DENIED",
    };
  }

  // Step 3: Validate input
  const parsed = SaveExaminationResponseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
      code: "VALIDATION_ERROR",
    };
  }
  const validated = parsed.data;

  // Step 4: Tenant-scoped Prisma
  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx: any) => {
      // Step 5: Audit context (inside transaction, before mutation)
      await setAuditContext(tx, {
        actionType: "examination_response.saved",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // ... mutations ...
    });

    revalidatePath(`/audit-execution/${validated.engagementId}/rbia`);
    return { success: true as const, data: result };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save response.";
    logger.error(
      { error, action: "save_examination_response", tenantId },
      message,
    );
    return { success: false as const, error: message, code: "INTERNAL_ERROR" };
  }
}
```

Source: Pattern verified in `src/actions/audit-execution/submit-examination-response.ts` and `src/actions/observations/create.ts`.

### Pattern 2: Structured Error Result Type

**What:** A shared return type used by ALL v6.0 server actions — consistent for UI error mapping.

```typescript
// src/actions/rbia/schemas.ts — exported shared types

export type ActionSuccess<T> = { success: true; data: T };
export type ActionError = {
  success: false;
  error: string;
  code: ActionErrorCode;
};
export type ActionResult<T> = ActionSuccess<T> | ActionError;

export type ActionErrorCode =
  | "PERMISSION_DENIED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT" // e.g., engagement not in correct state
  | "TRANSITION_BLOCKED" // state machine rejection
  | "SCORE_FROZEN" // score already frozen (immutable)
  | "INTERNAL_ERROR";
```

This `code` field is the key decision from CONTEXT.md — UI components use `code` to show specific messages rather than relying on the English `error` string.

### Pattern 3: Upsert for Idempotent Examination Saves (EXAM-09)

**What:** Examination responses use `upsert` on the compound unique `(engagementId, nodeId)` — same as the existing DAL. No lost data if auditor saves multiple times.

```typescript
await tx.examinationResponse.upsert({
  where: {
    engagementId_nodeId: {
      engagementId: validated.engagementId,
      nodeId: validated.nodeId,
    },
  },
  create: {
    tenantId,
    engagementId: validated.engagementId,
    nodeId: validated.nodeId,
    score: scoreValue,
    scoreLabel: validated.scoreLabel,
    workingNotes: validated.workingNotes ?? null,
    flagForObservation: validated.flagForObservation,
    flagForActionPoint: validated.flagForActionPoint,
    respondedById: session.user.id,
    respondedAt: new Date(),
  },
  update: {
    score: scoreValue,
    scoreLabel: validated.scoreLabel,
    workingNotes: validated.workingNotes ?? null,
    flagForObservation: validated.flagForObservation,
    flagForActionPoint: validated.flagForActionPoint,
    respondedById: session.user.id,
    respondedAt: new Date(),
  },
});
```

The `score` (Decimal) must be computed from `scoreLabel` using `SCORE_VALUES` from the scoring engine: `SCORE_VALUES[validated.scoreLabel]`.

### Pattern 4: Atomic Serial Number Assignment (FIND-06)

**What:** `serialNo` on ActionPoint must be assigned atomically to prevent duplicate numbers when concurrent saves happen.

```typescript
// Inside $transaction:
const maxSerialNo = await tx.actionPoint.aggregate({
  where: { engagementId: validated.engagementId },
  _max: { serialNo: true },
});
const nextSerialNo = (maxSerialNo._max.serialNo ?? 0) + 1;

const ap = await tx.actionPoint.create({
  data: {
    ...fields,
    serialNo: nextSerialNo,
  },
});
```

The transaction isolation ensures no two concurrent calls get the same `serialNo`. Prisma's default isolation is `READ COMMITTED` which is sufficient here — the `_max + 1` within the same transaction prevents duplicates because the read is within the transaction scope.

### Pattern 5: Freeze Transaction (EXAM-10, FIND-02, BMRP-01)

**What:** The most complex action — 5 steps in a single Prisma `$transaction` with step-specific error codes.

```typescript
export async function freezeRbiaScore(input: FreezeRbiaScoreInput): ActionResult<FreezeResult> {
  // ... auth + permission (rbia:score_freeze = CAE + AUDIT_MANAGER) ...

  const db = prismaForTenant(tenantId);

  // Step tracking for error reporting
  let currentStep = "loading";

  try {
    const result = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, { actionType: "rbia_score.frozen", ... });

      // Step 1: Load all ExaminationResponses for the engagement
      currentStep = "loading_responses";
      const responses = await tx.examinationResponse.findMany({
        where: { engagementId: validated.engagementId },
        include: { node: { select: { id, code, weight, isCritical, isLeaf, depth, parentId } } },
      });

      // Step 2: Load ExaminationNode tree (all active nodes for tenant)
      currentStep = "building_tree";
      const allNodes = await tx.examinationNode.findMany({
        where: { tenantId, isActive: true },
        select: { id, code, weight, isCritical, isLeaf, parentId, depth },
      });

      // Build ScoredNode tree and attach responses (mapping scoreLabel → ScoredNode.scoreLabel)
      // Then call computeModuleScore() per module and computeCompositeScore() overall

      // Step 3: Write/update BranchRbiaScore
      currentStep = "writing_score";
      await tx.branchRbiaScore.upsert({
        where: { engagementId: validated.engagementId },
        create: { tenantId, engagementId, branchId, compositeScore, ratingBand, moduleScores, scoringTreeSnapshot, frozenAt: new Date(), frozenById: session.user.id },
        update: { compositeScore, ratingBand, moduleScores, scoringTreeSnapshot, frozenAt: new Date(), frozenById: session.user.id },
      });

      // Step 4: Issue all DRAFT ActionPoints (batch update)
      currentStep = "issuing_action_points";
      await tx.actionPoint.updateMany({
        where: { engagementId: validated.engagementId, status: "DRAFT" },
        data: { status: "ISSUED" },
      });

      // Count total APs being issued
      const apCount = await tx.actionPoint.count({
        where: { engagementId: validated.engagementId },
      });

      // Step 5: Create BmResponseBatch
      currentStep = "creating_bm_batch";
      const deadlineDays = 15; // TODO: read from tenant settings once configurable
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + deadlineDays);
      await tx.bmResponseBatch.create({
        data: { tenantId, engagementId: validated.engagementId, totalActionPoints: apCount, deadline },
      });

      return { compositeScore, ratingBand, apCount };
    });

    revalidatePath(`/audit-execution/${validated.engagementId}/rbia`);
    return { success: true, data: result };
  } catch (error) {
    // Step-specific error reporting
    const stepMessages: Record<string, string> = {
      loading_responses: "Failed to load examination responses",
      building_tree: "Failed to compute scores",
      writing_score: "Score snapshot failed",
      issuing_action_points: "Failed to issue action points",
      creating_bm_batch: "Failed to create response batch",
    };
    const userMessage = stepMessages[currentStep] ?? "Status transition blocked";
    logger.error({ error, currentStep, engagementId: validated.engagementId, tenantId }, userMessage);
    return { success: false, error: userMessage, code: "INTERNAL_ERROR" };
  }
}
```

### Pattern 6: Meeting Record + Status Transition (ENGG-03, ENGG-04)

**What:** Recording a meeting atomically transitions the engagement status. Two separate concerns in one transaction: upsert the meeting record, then update the engagement status.

```typescript
// Recording opening meeting → engagement status becomes OPENING_MEETING
// Recording exit meeting → engagement status becomes EXIT_MEETING
// The status transition is validated using the state machine before the upsert.

const transitionResult = canTransitionEngagement(engagement.status, targetStatus, userRoles, ctx);
if (!transitionResult.allowed) {
  throw new Error(transitionResult.reason);
}

await tx.engagementMeeting.upsert({ ... }); // Create/update meeting record
await tx.auditEngagement.update({ where: { id }, data: { status: targetStatus } });
```

Sign-off is a separate action (`signOffMeeting`) that only sets `signedOff: true` + validates the state machine for the NEXT transition (e.g., from OPENING_MEETING to IN_PROGRESS requires `hasOpeningMeeting: true`).

### Anti-Patterns to Avoid

- **Accepting tenantId from input:** Every action MUST get tenantId from `session.user.tenantId` only. Never from `input.tenantId` or URL params.
- **Permission check after Zod parse:** Always check permissions BEFORE Zod validation — don't leak which fields are invalid to unauthorized users.
- **Using `db.examinationResponse.create()` instead of `upsert()`:** The unique constraint on `(engagementId, nodeId)` means create will throw if the auditor re-saves. Always use upsert.
- **Computing serialNo outside transaction:** Race condition — two concurrent AP creates could get the same number. Must use `_max + 1` inside `$transaction`.
- **Direct `engagement.status === "COMPLETED"` checks:** Never hardcode status logic — always use `canTransitionEngagement()` from the state machine.
- **Forgetting `"use server"` directive:** Without it, the function runs on the client. The existing project has never missed this — follow the same file pattern.

---

## Don't Hand-Roll

| Problem                | Don't Build                                          | Use Instead                                                                                                  | Why                                                                             |
| ---------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Score computation      | Custom roll-up math in the action                    | `computeModuleScore()` + `computeCompositeScore()` + `getRatingBand()` from `src/lib/rbia-scoring-engine.ts` | Already implemented, tested, pure functions with zero side effects              |
| State machine guards   | `if (engagement.status !== "OPENING_MEETING") throw` | `canTransitionEngagement()` from `src/lib/engagement-state-machine.ts`                                       | Covers all 8 states, role checks, prerequisite guards — mismatches compile-time |
| Permission checks      | Custom role arrays in each action                    | `hasPermission(userRoles, "rbia:examine")` from `src/lib/permissions.ts`                                     | Multi-role aware, centralized, auditable                                        |
| Audit logging          | Direct DB writes                                     | `setAuditContext(tx, {...})` inside each `$transaction`                                                      | Sets PostgreSQL session vars — audit trigger reads them automatically           |
| revalidatePath strings | Hardcoded path guessing                              | Mirror paths already used by same-domain actions in audit-execution                                          | Consistent with RSC cache invalidation patterns                                 |

**Key insight:** The scoring engine and state machine were implemented in Phase 18 specifically to be consumed by Phase 20 actions. Do not re-implement any of that logic inside the actions.

---

## Common Pitfalls

### Pitfall 1: Schema Gap — `sourceActionPointId` Missing from Observation

**What goes wrong:** `promoteToObservation` needs to link the new Observation back to the source ActionPoint, but `sourceActionPointId` field does NOT exist on the `Observation` model in `schema.prisma` yet. Attempting `tx.observation.create({ data: { sourceActionPointId: ... } })` will throw a Prisma client error.

**Why it happens:** The field was identified as a gap in Phase 19 research (documented as a TODO in `src/data-access/rbia-findings.ts` line 77) but intentionally deferred to Phase 20.

**How to avoid:** The FIRST task in Phase 20 must be: add `sourceActionPointId String? @db.Uuid` to the `Observation` model in `prisma/schema.prisma` and run `pnpm db:push`. Only then write `promoteToObservation`.

**Warning signs:** Prisma Studio shows no `sourceActionPointId` column on the Observation table.

### Pitfall 2: Carry-Forward ActionPoints — Auto-Import vs Read-Only Display

**What goes wrong:** The CONTEXT.md says carry-forward APs are "auto-imported as draft APs in new engagement" — this means the server action must CREATE new ActionPoint rows in the new engagement when triggered. However the Phase 19 DAL (`getCarryForwardActionPoints`) returns them as read-only references. Confusing the two leads to either: (a) never actually creating the carried-forward rows, or (b) duplicate creation.

**Why it happens:** Two different concepts share similar names. The DAL returns data for DISPLAY. The server action performs the IMPORT.

**How to avoid:** `importCarryForwardActionPoints` action takes `engagementId` and calls `getCarryForwardActionPoints()` from the DAL to find candidates, then creates new ActionPoint rows (with `status: DRAFT`) in the current engagement and marks the originals with `carriedForwardToEngagementId`. The DAL function is read-only; the action does the write.

### Pitfall 3: Freeze Idempotency — BmResponseBatch Unique Constraint

**What goes wrong:** `BranchRbiaScore` uses `upsert` (can be called again if freeze fails partway through), but `BmResponseBatch` has `@unique engagementId` — calling `create` a second time will throw a Prisma unique violation error.

**Why it happens:** The freeze transaction might succeed on `BranchRbiaScore.upsert` but then fail on `BmResponseBatch.create` if the batch was already created (e.g., from a partial prior run that was retried).

**How to avoid:** Use `upsert` for `BmResponseBatch` as well (not `create`), using the `engagementId` unique key. On retry, the upsert will update the existing record instead of failing.

### Pitfall 4: Serial Number Race Condition

**What goes wrong:** Two LEAD_AUDITORs simultaneously create ActionPoints for the same engagement. Both read `maxSerialNo = 5`, both compute `nextSerialNo = 6`, and one of them fails with a unique violation (if `serialNo` has a unique constraint) or both succeed with duplicate serial numbers (if it doesn't).

**Why it happens:** `COUNT` or `MAX` reads outside a transaction are not safe in concurrent scenarios.

**How to avoid:** The `_max + 1` pattern must be inside the `$transaction`. Prisma's `READ COMMITTED` isolation guarantees the max query sees committed data, and concurrent transactions will serialize on the row lock when both try to insert. The second transaction's `_max` will read the first's committed `serialNo = 6`, computing `nextSerialNo = 7`.

Alternatively, consider a DB sequence (Postgres `SEQUENCE`) for `serialNo` — but the current schema uses `Int` not a sequence, so the `_max + 1` approach is correct for now.

### Pitfall 5: Zod v4 `zodResolver` Compatibility

**What goes wrong:** Schemas defined for server-side validation are also imported by client forms using `react-hook-form`. Zod v4's `safeParse()` result shape changed slightly from v3 — `zodResolver(Schema)` may need `zodResolver(Schema as any)` for compatibility.

**Why it happens:** Project is on Zod v4 with react-hook-form resolver — CLAUDE.md notes `zodResolver(Schema as any)`.

**How to avoid:** Export schema types alongside schemas (e.g., `export type SaveExaminationResponseInput = z.infer<typeof SaveExaminationResponseSchema>`). When importing schemas into client forms, use `zodResolver(SaveExaminationResponseSchema as any)`.

### Pitfall 6: Working Notes Conditional Validation

**What goes wrong:** The CONTEXT.md decision says working notes are required only for PARTIALLY_COMPLIANT and NON_COMPLIANT scores. Simple Zod `z.string().min(500)` on the `workingNotes` field fails for FULLY/LARGELY where notes are optional.

**Why it happens:** Conditional cross-field validation is a common Zod pitfall.

**How to avoid:** Use `z.superRefine()` or `.refine()` after the base object schema:

```typescript
export const SaveExaminationResponseSchema = z
  .object({
    engagementId: z.string().uuid(),
    nodeId: z.string().uuid(),
    scoreLabel: z.enum([
      "FULLY_COMPLIANT",
      "LARGELY_COMPLIANT",
      "PARTIALLY_COMPLIANT",
      "NON_COMPLIANT",
    ]),
    workingNotes: z.string().max(2000).optional(),
    flagForObservation: z.boolean().default(false),
    flagForActionPoint: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    const requiresNotes = ["PARTIALLY_COMPLIANT", "NON_COMPLIANT"].includes(
      data.scoreLabel,
    );
    if (
      requiresNotes &&
      (!data.workingNotes || data.workingNotes.length < 500)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["workingNotes"],
        message:
          "Working notes (min 500 chars) are required for Partially or Non-Compliant scores",
      });
    }
  });
```

### Pitfall 7: Missing `"use server"` on Meetings Action File

**What goes wrong:** The meetings action file imports `canTransitionEngagement` from the state machine lib. TypeScript will compile fine. But without `"use server"` at the top of the file, Next.js will attempt to run it as a module — importing it in a Server Component works, but importing in a Client Component causes a build error.

**How to avoid:** Every file in `src/actions/rbia/` must begin with `"use server"` as its first line.

---

## Code Examples

Verified patterns from the AEGIS codebase:

### Structured Return Type (from existing actions)

```typescript
// Source: src/actions/audit-execution/transition-engagement-status.ts
return {
  success: true as const,
  data: { id: result.id, status: targetStatus },
};
// or
return { success: false as const, error: message };
```

Phase 20 extends this with `code`:

```typescript
return {
  success: false as const,
  error: message,
  code: "TRANSITION_BLOCKED" as const,
};
```

### Permission Check Pattern (from permissions.ts)

```typescript
// Source: src/lib/permissions.ts — existing roles
// New permissions needed for Phase 20 (add to Permission type union):
| "rbia:examine"          // ExaminationResponse save + flag
| "rbia:score_freeze"     // freeze score + complete engagement
| "action_point:manage"  // create, update, delete, promote APs
| "action_point:bm_respond" // submit BM response to issued APs

// New role assignments needed in ROLE_PERMISSIONS:
LEAD_AUDITOR: [...existing, "rbia:examine", "action_point:manage"],
FIELD_AUDITOR: [...existing, "rbia:examine"],
CAE: [...existing, "rbia:score_freeze", "action_point:manage"],
AUDIT_MANAGER: [...existing, "rbia:score_freeze", "action_point:manage"],
BRANCH_HEAD: [...existing, "action_point:bm_respond"],
```

### revalidatePath Strategy for RBIA Routes

```typescript
// After examination response save:
revalidatePath(`/audit-execution/${engagementId}/rbia`);

// After AP create/update:
revalidatePath(`/audit-execution/${engagementId}/rbia/findings`);

// After meeting record/sign-off:
revalidatePath(`/audit-execution/${engagementId}/rbia`);

// After freeze (affects multiple pages):
revalidatePath(`/audit-execution/${engagementId}/rbia`);
revalidatePath(`/audit-execution`);
```

The RBIA route is `src/app/(dashboard)/audit-execution/[engagementId]/rbia/` — confirmed to exist.

### Score Decimal Conversion (from rbia-scoring-engine.ts)

```typescript
// Source: src/lib/rbia-scoring-engine.ts
import { SCORE_VALUES } from "@/lib/rbia-scoring-engine";

// In saveExaminationResponse action, before upsert:
const score = SCORE_VALUES[validated.scoreLabel]; // e.g., "PARTIALLY_COMPLIANT" → 0.5
// Write both score (Decimal) and scoreLabel (enum) to ExaminationResponse
```

### Module Score Computation for Freeze

```typescript
// Source: src/lib/rbia-scoring-engine.ts
import {
  computeModuleScore,
  computeCompositeScore,
  getRatingBand,
  type ScoredNode,
} from "@/lib/rbia-scoring-engine";

// Inside freeze transaction:
// 1. Load responses and nodes from DB
// 2. Build ScoredNode[] tree (similar to buildTree in rbia-examination.ts)
// 3. For each depth-1 module node: computeModuleScore(moduleNode)
// 4. computeCompositeScore([{ weight, score }]) across modules
// 5. getRatingBand(compositeScore)
// 6. Write to BranchRbiaScore
```

---

## State of the Art

| Old Approach                   | Current Approach                | When Changed                    | Impact                                                                   |
| ------------------------------ | ------------------------------- | ------------------------------- | ------------------------------------------------------------------------ |
| API routes (`/api/...`)        | Server Actions (`"use server"`) | Next.js 13+ App Router          | Server actions co-locate with the feature; no separate route file needed |
| Single `schemas.ts` per domain | Separate file per action        | Phase 18 architectural decision | Smaller files, easier to test individually                               |
| Inline Zod validation          | `safeParse()` + return error    | AEGIS standard since Phase 1    | Never throws — all errors returned as `{ success: false }`               |

**Deprecated/outdated:**

- Old examination actions (`src/actions/audit-execution/submit-examination-response.ts`): targets `AuditExaminationResponse` (old v5 model). Phase 20 targets `ExaminationResponse` (new v6.0 model). Do NOT modify the old action — it's used by legacy engagements.

---

## Open Questions

1. **Carry-forward import trigger: when does it run?**
   - What we know: CONTEXT.md says "auto-imported as draft APs in new engagement"
   - What's unclear: Is this triggered when the RBIA engagement page first loads? Or a dedicated "Import Carry-Forward" button? Or when IN_PROGRESS status is entered?
   - Recommendation: Trigger it as part of the engagement status transition to IN_PROGRESS (inside `transitionEngagementStatus` when `targetStatus === "IN_PROGRESS"` for RBIA engagements). This ensures it happens exactly once and is atomic with the status change.

2. **`scoringTreeSnapshot` format: what goes in the JSONB field?**
   - What we know: `BranchRbiaScore.scoringTreeSnapshot Json` should store "Full tree with per-node scores for drill-down" (schema comment)
   - What's unclear: Exact shape — is it the full `ScoredNode[]` tree with resolved scores, or just the scored leaf nodes?
   - Recommendation: Serialize the full scored tree (`ScoredNode[]` with `score` field populated) — this enables Phase 23 report drill-down without re-querying historical responses.

3. **BmResponseBatch deadline configurability: where is the tenant setting stored?**
   - What we know: CONTEXT.md says "default 15 days, tenant admin can adjust". `Tenant.settings Json?` exists for flexibility.
   - What's unclear: The `settings` JSON field on Tenant has no schema for its contents. No existing code reads `bmResponseDeadlineDays` from tenant settings.
   - Recommendation: Hardcode 15 days in Phase 20 with a `// TODO Phase 23: read from tenant.settings.bmResponseDeadlineDays` comment. Don't design the settings structure in this phase — that's Phase 23 scope.

---

## Sources

### Primary (HIGH confidence)

- Codebase: `src/actions/audit-execution/submit-examination-response.ts` — canonical 5-step action pattern, `$transaction` with `setAuditContext`
- Codebase: `src/actions/audit-execution/transition-engagement-status.ts` — state machine integration in actions, `{ success: true/false }` return pattern
- Codebase: `src/lib/rbia-scoring-engine.ts` — scoring engine functions Phase 20 must call
- Codebase: `src/lib/engagement-state-machine.ts` — state machine Phase 20 must call for meeting sign-off guards
- Codebase: `src/lib/permissions.ts` — existing Permission type and ROLE_PERMISSIONS (must extend)
- Codebase: `prisma/schema.prisma` — ExaminationResponse, ActionPoint, BranchRbiaScore, EngagementMeeting, BmResponseBatch model definitions
- Codebase: `src/data-access/rbia-findings.ts` — sourceActionPointId TODO at line 77, confirms schema gap
- Codebase: `src/data-access/rbia-examination.ts` — upsert DAL for meetings, buildTree pattern
- Codebase: `src/data-access/rbia-scoring.ts` — BranchRbiaScore read patterns for scoring DAL
- Codebase: `src/data-access/rbia-meetings.ts` — EngagementMeeting DAL Phase 20 wraps

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — No new libraries; all patterns verified in codebase
- Architecture: HIGH — Direct extension of 81 existing actions following same pattern
- Pitfalls: HIGH — Schema gap confirmed by code inspection (line 77 in rbia-findings.ts); race condition analysis from Prisma transaction semantics
- Error codes: MEDIUM — Taxonomy defined per CONTEXT.md decisions; exact strings are Claude's discretion

**Research date:** 2026-02-23
**Valid until:** 2026-03-23 (30-day estimate; stable platform)
