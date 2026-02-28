# Phase 18: Foundation - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Pure scoring engine, typed engagement state machine, database-level guards, data encryption infrastructure, and CAE-to-HIA terminology rename. This phase delivers the correctness foundation that all subsequent v6.0 phases depend on — no UI pages, no data access layer, no server actions beyond what's needed for the state machine replacement.

</domain>

<decisions>
## Implementation Decisions

### Scoring Engine Behavior

- **Rating band thresholds:** Use RBIA Policy 2020 values — >80% Very Good, >65-80% Good, >50-65% Satisfactory, >40-50% Moderate, ≤40% Poor
- **Score mapping:** FULLY_COMPLIANT=1.0, LARGELY_COMPLIANT=0.75, PARTIALLY_COMPLIANT=0.5, NON_COMPLIANT=0.0 (confirmed, no changes)
- **Display precision:** Integer percentages only (e.g., 79%, not 78.54%) — both in live UI and frozen JSONB snapshot
- **Partial scoring:** Calculate from scored items only — score reflects what's been evaluated so far; unscored items excluded from calculation
- **N/A handling:** Exclude N/A items from the denominator entirely — score reflects only applicable items
- **Module weights:** Configurable per module, stored as percentages that must sum to 100% — configurable by HIA/admin
- **Item weights:** Configurable per examination item within a module — uses existing `ExaminationNode.weight` Decimal field (set during seed/setup, same for all engagements)
- **Frozen snapshot depth:** Summary only — composite score, per-module scores, and rating band stored in BranchRbiaScore JSONB (no individual item-level data in snapshot)

### Claude's Discretion (Scoring)

- Critical-item cap propagation behavior (module level only vs composite) — decide based on RBIA policy intent
- Whether rating band colors are defined in the engine or the UI layer — pick what's architecturally cleaner

### State Machine Rules

- **Scope:** RBIA engagements only — legacy engagements keep their existing status flow
- **Transitions:** Strictly linear, no backward transitions — PLANNED → TEAM_ASSIGNED → OPENING_MEETING → IN_PROGRESS → EXIT_MEETING → REPORT_DRAFT → COMPLETED
- **Cancellation:** CANCELLED reachable from any state — HIA can abort at any point
- **Cancellation data:** Preserve everything on cancellation — scores, meetings, draft ActionPoints all retained for audit history
- **Authorization:** Role-based per transition — different transitions require different roles (Claude assigns roles per transition based on RBIA audit practice)
- **Prerequisites enforced:** State machine enforces prerequisites before allowing transitions:
  - PLANNED → TEAM_ASSIGNED: at least one auditor assigned
  - OPENING_MEETING → IN_PROGRESS: opening meeting record must exist
  - EXIT_MEETING → REPORT_DRAFT: exit meeting record must exist
  - REPORT_DRAFT → COMPLETED: frozen BranchRbiaScore must exist
- **Type safety:** Compile-time prerequisite checking — TypeScript type includes prerequisite checker functions in the transition map; can't forget to check prerequisites
- **Invalid transitions:** Both UI-disabled buttons AND server-side validation as defense in depth
- **Audit trail:** Log all state transitions with timestamp, user, from/to state
- **Concurrency:** Single-user access per engagement state assumed (no two auditors can access same state for same branch concurrently) — Claude decides on implementation approach
- **Existing code:** Replace `update-engagement-status.ts` entirely with new state machine module + new server action — clean break
- **File location:** Claude decides (standalone in src/lib/ or co-located with action)
- **UI helper:** No `getValidTransitions()` method needed — UI hardcodes which buttons appear per state

### CAE-to-HIA Rename

- **Scope:** All user-visible text including UI labels, i18n messages, email notification templates, and seed data
- **Database:** Role.CAE enum value unchanged in database
- **Permissions:** Keep `cae:*` permission names as-is — only display text changes
- **i18n:** Keep "HIA" as universal abbreviation across all 4 languages (en, hi, mr, gu) — banking terminology stays in English in India
- **Seed data:** Update seed.ts references from "Chief Audit Executive" to "Head of Internal Audit"

### Data Encryption Posture

- **DSEC-01 through DSEC-04:** Claude assesses what's already in place and fills gaps — verify existing setup, add missing pieces (HSTS header, sslmode=require if missing), document findings
- **PostgreSQL SSL:** sslmode=require in production only — dev environment uses default connection without SSL
- **Tenant isolation audit (DSEC-05):** Both automated integration tests (runnable in CI) AND initial SQL audit script for comprehensive review
- **Documentation:** Create formal SECURITY-AUDIT.md checklist document with verification results — useful for compliance evidence

</decisions>

<specifics>
## Specific Ideas

- Rating band thresholds are authoritative from RBIA-POLICY-2020.md — no custom overrides needed
- The existing `ExaminationNode.weight` field in the schema is the single source of truth for item weights
- Engagement state machine is a clean replacement of the existing `update-engagement-status.ts` — not a wrapper or extension
- No two auditors can access the same engagement state concurrently for the same branch — concurrency handling can be simple

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 18-foundation_
_Context gathered: 2026-02-22_
