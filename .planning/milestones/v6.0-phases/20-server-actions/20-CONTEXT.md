# Phase 20: Server Actions - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Zod schemas and server action mutations for all v6.0 RBIA operations — providing a stable, type-safe API that all UI components call without touching Prisma directly. Covers: examination response save, module selection, meeting recording, ActionPoint CRUD, promote-to-observation, BM response submission, score freeze, and new RBIA permissions.

</domain>

<decisions>
## Implementation Decisions

### Validation & Error Feedback

- Inline field errors (react-hook-form style) — no toast notifications for validation failures
- Working notes required only when score is PARTIALLY_COMPLIANT or NON_COMPLIANT — optional for FULLY/LARGELY
- Server action errors return structured result object: `{ success: false, error: string, code: string }` — UI maps codes to messages
- Examination response uses explicit Save button (not auto-save on score click) — auditor clicks score, types notes, then clicks Save

### Transaction Atomicity

- Freeze action failure shows specific step that failed ("Score snapshot failed" or "Status transition blocked") — not a generic error
- Draft ActionPoint creation from flagForAP is silent — no toast or notification, user sees it when visiting findings tab
- Meeting recording + engagement transition is one atomic action — recording the meeting automatically triggers the status transition in the same transaction
- Freeze is all-in-one: freeze score + issue all draft APs (DRAFT→ISSUED) + create BmResponseBatch — single Prisma transaction

### Permission Mapping

- `rbia:examine` (score items): LEAD_AUDITOR + FIELD_AUDITOR only — not general AUDITOR role
- `rbia:score_freeze` (freeze score + complete engagement): CAE + AUDIT_MANAGER — allows delegation from HIA
- `action_point:manage` (create, edit, promote APs): LEAD_AUDITOR only — field auditors score but don't manage APs
- `action_point:bm_respond` (respond to issued APs): BRANCH_HEAD only — single point of accountability, no delegation to AUDITEE

### ActionPoint Lifecycle Flow

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

</decisions>

<specifics>
## Specific Ideas

- Structured error result `{ success, error, code }` should be consistent across ALL v6.0 server actions — create a shared return type
- The all-in-one freeze transaction is the most complex action: compute composite → write BranchRbiaScore → transition to COMPLETED → issue all draft APs → create BmResponseBatch with deadline. Must be a single Prisma.$transaction with specific step failure reporting
- sourceActionPointId field on Observation model is a pending TODO from Phase 19 — must be added to schema in this phase

</specifics>

<deferred>
## Deferred Ideas

- Configurable working notes character limit (currently 500-2000 chars from requirements) — post-v6.0 tenant config
- Bulk AP operations (select multiple, bulk issue/close) — future enhancement

</deferred>

---

_Phase: 20-server-actions_
_Context gathered: 2026-02-23_
