# Phase 19: Data Access Layer - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

All tenant-scoped DAL functions for the v6.0 RBIA workflow — tree loading, module scoring, findings queries, meeting records, and the engagement routing gateway that forks RBIA vs. legacy engagements. No UI work — this phase establishes the data contracts that Phase 20 (server actions) and Phase 21+ (UI) consume.

</domain>

<decisions>
## Implementation Decisions

### Tree loading strategy

- Claude's discretion on loading approach (all-at-once vs per-module) based on expected tree size (~200-500 nodes)
- Claude's discretion on return shape (flat array + buildTree() utility vs pre-built nested tree)
- Claude's discretion on whether ExaminationResponse scores load alongside tree nodes (joined) or separately
- Module selection: DAL auto-selects applicable modules based on branch type (filter to only modules where applicableBranchTypes includes the branch's type). Auditor sees pre-selected set, can optionally add/remove.

### Engagement gateway fork

- New `/rbia/` route group under `audit-execution/[engagementId]/rbia/` — clean separation from legacy pages
- Auto-redirect: if someone lands on `/audit-execution/[id]` for an RBIA engagement, server-side redirect to `/audit-execution/[id]/rbia/`
- Claude's discretion on routing key (auditType field vs ExaminationNode presence)
- Separate RBIA DAL: new `rbia-engagement.ts` handles RBIA-specific queries. Existing `audit-execution.ts` untouched for legacy.

### Findings data contract

- Claude's discretion on return shape (discriminated union vs two separate arrays) — note Phase 22 has separate tabs for APs and Observations
- ActionPoints include source link: `examinationResponseId` + node path/code for "flagged from: Cash > Vault Handling > Item 3.2" display
- BM response status inline with AP: each ActionPoint includes its response status (responded/pending/overdue) and response text if available
- Promote-to-observation is link-only: Observation references source AP via `sourceActionPointId`, AP data is NOT copied. Observation extends AP with 5C fields (criteria, condition, cause, consequence, corrective).

### Carry-forward ActionPoints

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

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches following existing DAL patterns (39 existing DAL files as reference).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

_Phase: 19-data-access-layer_
_Context gathered: 2026-02-23_
