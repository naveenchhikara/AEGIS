# Project Research Summary

**Project:** AEGIS v6.0 — RBIA Workflow Implementation
**Domain:** Risk-Based Internal Audit (RBIA) for Indian Urban Cooperative Banks under RBI regulation
**Researched:** 2026-02-22
**Confidence:** HIGH

## Executive Summary

AEGIS v6.0 is a milestone implementation on top of a mature, production-deployed audit platform (580 source files, 71 DB models, 104 requirements complete). The core challenge is not greenfield product design but disciplined extension: adding a hierarchical examination engine, weighted scoring, dual findings model, and 8-state engagement lifecycle alongside existing models that must remain intact. The stack is locked — zero new runtime packages are needed. Every capability required for v6.0 already exists in the production stack (TanStack Table, Recharts, react-hook-form, Prisma 7, pg-boss), and the correct approach is to extend established patterns rather than introduce new libraries or architectural layers.

The regulatory context is non-negotiable. The RBI RBIA Policy (2020) mandates the hierarchical examination tree structure, the 4-point scoring scale, the 8-state engagement lifecycle gates, and the dual findings taxonomy (operational ActionPoints vs. formal 5C Observations). These are compliance requirements, not design choices. The implementation must produce an audit trail and scoring snapshot that can withstand RBI inspection — which means the immutable `BranchRbiaScore.scoringTreeSnapshot` JSONB field must be protected by a database-level trigger, and weighted score roll-up must use PostgreSQL NUMERIC arithmetic rather than JavaScript floating-point.

The biggest risks are not technical capability gaps but implementation discipline failures. Three of the five critical pitfalls stem from deviating from established patterns: computing scores in JavaScript instead of PostgreSQL (silent precision drift in the immutable snapshot), mutating frozen JSONB snapshots without a DB-level guard (destroyed audit record), and failing to update the engagement state machine when new enum values were added (engagements stuck with no forward path). All three pitfalls have clear prevention strategies requiring no new technology — only adherence to patterns already established in production code.

## Key Findings

### Recommended Stack

The production stack is fully capable. No new dependencies are required. TanStack Table 8.21.3 (already installed) handles the variable-depth examination tree natively via `getSubRows` + `getExpandedRowModel` — no tree-specific library needed. The 4-point weighted scoring engine is approximately 50 lines of pure TypeScript, making heavy libraries like `mathjs` or `ml-matrix` unnecessary and harmful (250KB+ bundle bloat for three lines of arithmetic). The 8-state engagement lifecycle uses the existing Server Actions + `useOptimistic` pattern established by the Observation lifecycle — XState would add 47KB and break pattern consistency.

**Core technologies in use (no additions required):**

- TanStack Table 8.21.3: variable-depth tree UI via `getSubRows` + `getExpandedRowModel` — depth 0-5, collapsible, already handles score columns
- Prisma 7 `findMany` + in-memory `buildTree()`: flat list loaded once, reconstructed client-side — O(n), single query, no N+1 traversal
- Pure TypeScript `ScoringEngine` in `src/lib/rbia-scoring-engine.ts`: weighted roll-up with critical-item override — follows existing `RiskRatingService` pattern
- Server Actions + `useOptimistic`: 8-state engagement transitions — identical pattern to existing Observation state machine
- `react-hook-form` `useFieldArray` + Prisma `$transaction`: Branch Manager batch response — all existing libraries
- Prisma `Json` field + `frozenAt` guard + PostgreSQL `BEFORE UPDATE` trigger: immutable JSONB scoring snapshot
- Recharts `RadarChart` + `@react-pdf/renderer`: RBIA board analytics widgets and new PDF report sections

**Critical version constraints:**

- Prisma 7 returns JSONB as parsed JS objects — no `JSON.parse` needed on reads; pass plain JS objects on write — no `JSON.stringify` needed
- Prisma 7 does NOT support `WITH RECURSIVE` natively (GitHub issue #3725) — use `findMany` + in-memory tree assembly; `$queryRaw` only for path-prefix subtree queries
- Prisma `Decimal` fields silently lose precision when converted via `Number()` (GitHub issues #6852, #10412) — never use `Number(decimalField)` in scoring calculations

### Expected Features

**Must have (table stakes) — blocks RBIA workflow completion, all 8 must ship together:**

- TS-V6-04: 8-state engagement lifecycle (PLANNED → TEAM_ASSIGNED → OPENING_MEETING → IN_PROGRESS → EXIT_MEETING → REPORT_DRAFT → COMPLETED + CANCELLED) with server-enforced prerequisite guards
- TS-V6-05: Opening and exit meeting records (EngagementMeeting model) — required gates for IN_PROGRESS and REPORT_DRAFT transitions
- TS-V6-01: Hierarchical examination checklist display — variable-depth tree, 4-button score picker at leaf nodes, progress per module, filter by score status
- TS-V6-02: 4-point scoring with weighted roll-up — FULLY/LARGELY/PARTIALLY/NON_COMPLIANT maps to 1.0/0.75/0.5/0.0 — critical-item cap at 0.5 when NON_COMPLIANT
- TS-V6-03: Dual findings — ActionPoints (15-40/audit, operational, BM-facing, 6-state lifecycle) and Observations (3-10/audit, formal 5C, board-facing, existing 7-state lifecycle)
- TS-V6-06: Branch Manager batch response workflow — BmResponseBatch with 15-day deadline, incremental per-AP response, overdue escalation, FACC generation
- TS-V6-07: RBIA score display — composite score, module breakdown, rating band with color coding (POOR=red through VERY_GOOD=dark-green), historical trend, drill-down to item level
- TS-V6-08: Positive observations capture — commendable practices, no lifecycle states, included in audit report before findings

**Should have (differentiators that multiply value of table-stakes features):**

- DIFF-V6-01: Live score roll-up with critical item override visual feedback — optimistic UI, real-time composite impact display as auditor scores items
- DIFF-V6-02: Carry-forward AP linkage across audit cycles — surfaces persistent issues from previous engagement at new engagement start
- DIFF-V6-03: Module-adaptive examination — auto-selects applicable modules by branch type (LARGE/MEDIUM/SMALL), reduces examination scope 20-40% for smaller branches
- DIFF-V6-04: RBIA audit report — dual-section PDF (score summary + findings), 8 sections, generated from digital record, saves 2-4 days of manual assembly per audit cycle

**Defer to post-v6.0:**

- DIFF-V6-05: Offline scoring sheet Excel export/import — accommodates rural branch low-connectivity but not blocking initial deployment
- FACC PDF certificate automation — can be produced manually in first pass
- ACE/ACB rating migration report — can extend existing board report

**Anti-features to explicitly avoid building:**

- Configurable scoring scales (other than 4-point): RBI-mandated, deviation is a compliance risk; allow label aliases for display only
- Real-time multi-user collaborative scoring: section ownership model is sufficient; CRDTs/OT would be months of overengineering
- AI/ML finding classification: premature at UCB data volume; keep human in the loop for ActionPoint vs. Observation decision
- Examination node CRUD via UI: tenant tree derives from RBI master; allow only N/A marking and supplementary items at depth 3+; no deletion of mandated nodes

### Architecture Approach

The architecture is additive — v6.0 places new files alongside existing files without restructuring anything. The layering rule is absolute: pages call DAL functions; server actions perform auth → permission → Zod → DB transaction; pure engines in `src/lib/` do computation with no DB access; the DAL enforces `WHERE tenantId = ?` on every query. The engagement gateway (`[engagementId]/page.tsx`) checks `auditType === "RBIA"` and routes to `/rbia/` sub-routes, leaving the legacy `/sections/` path intact. Old models (`ExaminationArea` / `ExaminationItem` / `AuditExaminationResponse`) coexist with new models (`ExaminationNode` / `ExaminationResponse`) throughout v6.0; cleanup is explicitly deferred to a post-v6.0 phase per CLAUDE.md.

**Major components and their strict build order (each layer depends on the prior):**

1. `src/lib/rbia-scoring-engine.ts` + `src/lib/engagement-state-machine.ts` — pure computation, zero dependencies beyond Prisma enums
2. `src/data-access/rbia-*.ts` (5 files) — tenant-scoped DAL functions for tree, scoring, findings, meetings, module selection
3. `src/actions/audit-execution/rbia/` (8 action files + shared `schemas.ts`) — Zod-validated mutations for all v6.0 operations
4. `src/components/audit-execution/rbia-*.tsx` (8 components) — tree UI, score panel, AP table, BM response panel, meeting form
5. `src/app/(dashboard)/audit-execution/[id]/rbia/**` (5 pages) — dashboard, module exam, findings, meetings, score/freeze
6. Modifications to 6 existing files — engagement gateway, report page, status action, permissions, DAL summary function, seed

**Key architectural decisions:**

- Tree loading: `prisma.examinationNode.findMany` (flat, ordered by path) + in-memory `buildTree()` — O(n), single query, no N+1
- Score computation: pure engine called from server action after each ExaminationResponse save; never in DAL, never client-side
- Snapshot freeze: single `prisma.$transaction([updateBranchRbiaScore, updateEngagementStatus])` — atomic, no partial state possible
- Dual coexistence: `engagement.auditType === "RBIA"` gates which model set is used — no data migration required during v6.0
- Unified findings query: canonical `getEngagementFindings()` DAL function always returns both `ActionPoint` and `Observation` as typed union — established as project convention before any findings UI is built

### Critical Pitfalls

1. **Materialized path corruption** (CRITICAL) — `ExaminationNode.path` and `depth` are application-managed. A single incorrect insert creates corrupted subtree queries that produce wrong audit scores silently. Prevent with a single `createExaminationNode()` service function as the only tree mutation entry point; add PostgreSQL `CHECK` constraint (`path LIKE '%' || code`); run integrity validation SQL after every seed run.

2. **Score floating-point drift in immutable snapshot** (CRITICAL) — Prisma `Decimal` fields silently lose precision when converted to JavaScript `Number`. Accumulated IEEE 754 errors produce scores like `0.7499999999999999` stored in the frozen snapshot that cannot be recalculated. Prevent by computing roll-up in PostgreSQL `NUMERIC` arithmetic via `$queryRaw` recursive CTE for the freeze calculation, or by keeping Decimal.js objects throughout — never call `Number(decimalField)` in any scoring path.

3. **Engagement state machine missing new states** (HIGH) — The existing `update-engagement-status.ts` hard-codes only `PLANNED → IN_PROGRESS → COMPLETED`. Adding 6 new `EngagementStatus` enum values without updating this map causes engagements to get stuck with no valid forward path. Prevent by replacing the ad-hoc record with a typed `Record<EngagementStatus, EngagementStatus[]>` — TypeScript will error at compile time if any enum value is unhandled.

4. **Frozen JSONB snapshot mutated after freeze** (CRITICAL) — Application-level `frozenAt !== null` checks are fragile across multiple code paths (scoring jobs, admin tools, direct DAL). A single missed check destroys the immutable audit record. Prevent by adding a PostgreSQL `BEFORE UPDATE` trigger on `BranchRbiaScore` that raises an exception if `OLD.frozenAt IS NOT NULL`. The DB trigger is not optional — it is the defense that application guards cannot provide.

5. **ActionPoint / Observation dual-model confusion** (HIGH) — During the coexistence period, developers write DAL queries that return only `Observation` records when "findings" are requested, silently omitting 15-40 `ActionPoint` records per engagement. A compliance officer sees an incomplete data picture; RBI inspection would flag missing action point tracking. Prevent by establishing a canonical `getEngagementFindings()` DAL function as a documented project convention before any findings UI is built.

## Implications for Roadmap

The architecture research defines a strict build order: pure engines first, then DAL, then server actions, then components, then pages, then modifications to existing files. This dependency chain maps directly to phases. The feature research identifies 8 table-stakes features that must all ship for the RBIA workflow to be usable end-to-end; several have LOW complexity (meetings, positive observations) and can run in parallel with higher-complexity work within phases.

### Phase 1: Foundation — Pure Engines, State Machine, and DB Guards

**Rationale:** Pure engines and the engagement state machine have zero dependencies (only Prisma-generated enums). They must exist before any DAL or server action can call them. The state machine refactor of the existing action file is safest to do before any new UI is built on top of it. The DB trigger for snapshot immutability and the path CHECK constraints must be applied before any scoring data is written — these cannot be retrofitted after the fact without risk of data corruption going undetected.
**Delivers:** `rbia-scoring-engine.ts` with unit tests for known-input/output pairs; `engagement-state-machine.ts` as typed `Record<EngagementStatus, ...>`; refactored `update-engagement-status.ts` using the machine; `BranchRbiaScore` immutability trigger applied to DB; `ExaminationNode` CHECK constraints applied; `pnpm db:push` verified in dev environment.
**Features addressed:** TS-V6-02 (scoring algorithm), TS-V6-04 (state machine foundation)
**Pitfalls avoided:** Score floating-point drift (establish the precision pattern early); state machine missing states (typed Record catches all gaps at compile time); frozen snapshot mutation (trigger applied before any freeze ever occurs)
**Research flag:** Standard patterns — no additional research needed. Scoring algorithm is fully specified in RBIA-POLICY-2020.md sections 7.4-8.9. State machine follows existing `src/lib/state-machine.ts` pattern exactly.

### Phase 2: Data Access Layer — Tree, Scoring, Findings, Meetings

**Rationale:** All 5 DAL files are independent of each other and can be built in parallel within this phase. Building DAL before any UI prevents ad-hoc direct Prisma calls in pages — the anti-pattern that bypasses tenant isolation enforcement. The canonical `getEngagementFindings()` unified function must be established here, before any findings component is built, to prevent the dual-model confusion pitfall.
**Delivers:** `rbia-examination.ts` (flat tree load + `buildTree()` helper), `rbia-scoring.ts` (module scores, BranchRbiaScore history), `rbia-findings.ts` (unified ActionPoint + Observation query), `rbia-meetings.ts` (EngagementMeeting queries), `rbia-module-selection.ts` (EngagementModuleSelection with `applicableBranchTypes` application-level filter); modification to `audit-execution.ts` to handle 8 EngagementStatus values.
**Features addressed:** All 8 table-stakes features need a DAL entry point established here
**Pitfalls avoided:** Direct Prisma calls in pages (DAL-first enforces the layer boundary); N+1 tree traversal (flat `findMany` + `buildTree()` established as the pattern); dual-model confusion (unified findings function established as convention); `applicableBranchTypes` empty-array semantics (application-level filter, not DB `@>` operator)
**Research flag:** Standard patterns — DAL follows existing 39-file `data-access/*.ts` precedents exactly.

### Phase 3: Server Actions and Zod Schemas

**Rationale:** Server actions are the mutation layer. Building them before components means components have a stable API to call. The shared `schemas.ts` must come first within this phase (shared Zod types consumed by all action files). All 8 action files within this phase are independent of each other after `schemas.ts` is done.
**Delivers:** `schemas.ts` (shared Zod schemas); 8 action files: `select-modules`, `save-examination-response` (upsert ExaminationResponse + conditional ActionPoint draft creation), `record-meeting`, `create-action-point`, `submit-bm-response` (Prisma `$transaction` for batch), `freeze-rbia-score` (atomic transaction: BranchRbiaScore + EngagementStatus update), `create-positive-observation`, `promote-to-observation`; new permissions in `permissions.ts` (`rbia:examine`, `rbia:score_freeze`, `action_point:manage`, `action_point:bm_respond`).
**Features addressed:** Mutation paths for TS-V6-01 through TS-V6-08
**Pitfalls avoided:** Scores computed in JS (scoring engine called from server action, PostgreSQL NUMERIC result written to snapshot); frozen snapshot mutated (server action checks `frozenAt` before write; DB trigger as backup); old model used for new engagements (`auditType` guard in `save-examination-response`)
**Research flag:** Standard patterns — follow existing `actions/audit-execution/` precedents. `$transaction` pattern for atomic freeze confirmed in STACK.md.

### Phase 4: Core Examination UI — Tree, Module Grid, Score Panel

**Rationale:** The examination tree is the highest complexity component (HIGH per FEATURES.md — 2-3 weeks estimated) and the central interaction of the RBIA workflow. Building it early allows more time for UX refinement and performance observation before the remaining phases are time-pressured. The module grid and score panel are prerequisites for the findings and meeting UIs (auditors must be able to score items before findings can be promoted).
**Delivers:** `rbia-module-grid.tsx` (module selection with status badges and branch-type auto-selection), `rbia-examination-tree.tsx` (TanStack Table expanding with 4-button score picker at leaves, critical item warning, progress per module), `rbia-score-panel.tsx` (module bar chart + composite score gauge + freeze trigger), `score-freeze-dialog.tsx` (shows unscored item count before freeze); RBIA engagement dashboard page (`/rbia/page.tsx`) and module examination page (`/rbia/module/[moduleCode]/page.tsx`); modification to `[engagementId]/page.tsx` to add `auditType === "RBIA"` routing fork.
**Features addressed:** TS-V6-01 (hierarchical checklist), TS-V6-02 (live scoring display), TS-V6-07 (score display and freeze UI), DIFF-V6-01 (live score feedback with critical item visual), DIFF-V6-03 (module-adaptive filtering)
**Pitfalls avoided:** Tree loaded without caching (use Next.js `cache()` wrapper in DAL for tree load within request); applicableBranchTypes empty-array semantics (application-level filter established in Phase 2 DAL, used here); UX pitfall of showing "X/568 scored" without grouping (show progress by module, not flat count)
**Research flag:** Light investigation recommended on TanStack Table expand/collapse performance with 200+ nodes. Official docs confirm the pattern; implementation may need `React.memo` on tree row components or virtualization for very large modules. Not a blocker — can be addressed iteratively after initial implementation.

### Phase 5: Findings Workflow — ActionPoints, Meetings, Positive Observations

**Rationale:** ActionPoints, meeting records, and positive observations are lower-complexity features (LOW to MEDIUM per FEATURES.md) that share the server action and DAL infrastructure built in Phases 2-3. Building them after the examination tree ensures ActionPoints can be promoted from real ExaminationResponse records. The carry-forward AP detection (DIFF-V6-02) has LOW complexity and fits naturally here alongside ActionPoint creation.
**Delivers:** `action-points-table.tsx` (AP list with status filter tabs — Action Points vs Formal Observations separate), `action-point-form.tsx`, `meeting-form.tsx` (opening/exit meeting with attendee JSON array, sign-off); `/rbia/findings/page.tsx`, `/rbia/meetings/page.tsx`; BmResponseBatch creation triggered at `REPORT_DRAFT` transition; positive observation CRUD; carry-forward AP detection and surface at new engagement start (DIFF-V6-02); i18n keys added to `messages/en.json` and translated files.
**Features addressed:** TS-V6-03 (dual findings), TS-V6-05 (opening/exit meetings), TS-V6-06 (BM batch response initiation), TS-V6-08 (positive observations), DIFF-V6-02 (carry-forward APs)
**Pitfalls avoided:** ActionPoint serialNo race condition (use `SELECT MAX(serialNo) + 1 FOR UPDATE` within transaction, or PostgreSQL sequence per engagement); old model used for new engagements (auditType guard in action layer from Phase 3 prevents this); UX pitfall of mixing APs and Observations in one unfiltered list (separate tabs established here)
**Research flag:** Standard patterns — BM response uses existing evidence upload infrastructure (S3 presigned URLs) and existing email notification service (SES) without modification.

### Phase 6: Branch Manager Response and RBIA Report Generation

**Rationale:** The BM response UI and RBIA audit report are the last pieces of the workflow. The BM response panel depends on ActionPoints being issued (Phase 5). The RBIA audit report (DIFF-V6-04) is the highest complexity differentiator — it requires all other v6.0 data to exist (scores frozen, APs issued, meeting minutes recorded, positive observations captured). The board analytics widgets (RadarChart, trend chart) are additive to existing dashboard infrastructure.
**Delivers:** `bm-response-panel.tsx` (scrollable AP list with inline response forms, progress counter, deadline countdown); `/auditee/[id]/action-points` route (reuses existing auth and evidence upload infrastructure); RBIA audit report PDF (`rbia-score-section.tsx` + modifications to `[engagementId]/report/page.tsx`); pg-boss cron job for `BmBatchStatus.OVERDUE` transitions with email escalation to Zonal Auditor; board analytics additions (RadarChart for module scores, quarter-over-quarter trend chart, branch rating distribution); JSONB snapshot schema version marker in freeze function.
**Features addressed:** TS-V6-06 (BM response complete end-to-end), DIFF-V6-04 (RBIA audit report), TS-V6-07 (board analytics additions)
**Pitfalls avoided:** BmResponseBatch count drift (count from `ActionPoint` directly via DAL, not from denormalized batch counter); score section absent for non-frozen scores (graceful conditional render if `BranchRbiaScore.frozenAt` is null); JSONB snapshot missing schema version (version marker added to freeze function output)
**Research flag:** The 8-section RBIA audit report layout should be validated against an actual UCB RBIA audit report before PDF implementation. The section sequence in FEATURES.md (DIFF-V6-04) is derived from domain practice — confirm against a real report template or client feedback before building the PDF renderer sections. This is a design validation, not a technical blocker.

### Phase 7: Legacy Model Cleanup (Deferred Post-v6.0)

**Rationale:** CLAUDE.md explicitly defers old model removal. The correct sequencing is to complete and validate the v6.0 workflow with dual coexistence, confirm no production data exists in old models, then remove the safety net. This phase cannot start until Phase 6 is complete and validated in production.
**Delivers:** Removal of `ExaminationArea`, `ExaminationItem`, `AuditExaminationResponse` models from Prisma schema; deletion of legacy `/sections/` routes; Prisma migration to drop old tables; cleanup of `examination-form.tsx` and `section-tabs.tsx` legacy components.
**Features addressed:** Technical debt reduction; schema simplification to 68 models
**Research flag:** Needs explicit migration planning — verify no production data exists in old models before removal. Run inventory query against production DB. Requires `/gsd:research-phase` for migration risk assessment and rollback strategy.

### Phase Ordering Rationale

- Pure engines before DAL before server actions before components before pages — strict dependency chain from ARCHITECTURE.md build order
- State machine refactor (Phase 1) before any RBIA UI (Phase 4) — prevents building UI on a broken 2-state transition map
- DB trigger for snapshot immutability (Phase 1) before any engagement can reach REPORT_DRAFT (Phase 4+) — trigger must exist before the first `frozenAt` is ever set; cannot be retrofitted
- Examination tree (Phase 4) before findings workflow (Phase 5) — ActionPoints are promoted from flagged ExaminationResponse records; tree must be scoreable first
- BM response (Phase 6) after ActionPoints are issued (Phase 5) — BmResponseBatch is created when ActionPoints are issued at REPORT_DRAFT transition
- RBIA audit report (Phase 6) last among v6.0 phases — requires all other data to exist (frozen score, APs, meetings, positive observations)

### Research Flags

Phases needing deeper research or design validation during planning:

- **Phase 4** (Examination Tree UI): TanStack Table expand/collapse performance with 200+ nodes per module. Low risk — official docs confirm the pattern. Likely needs `React.memo` on tree rows or row virtualization for modules with 100+ leaf items. Investigate after initial implementation if performance is unsatisfactory.
- **Phase 6** (RBIA Audit Report): UCB-specific audit report format validation. The 8-section layout is domain practice; confirm section ordering and required content against an actual RBI-compliant RBIA audit report before building the PDF template. Consider obtaining a sample report from the client UCB or RBI circular references.
- **Phase 7** (Legacy cleanup): Production data inventory in old models before removal. Requires `SELECT COUNT(*) FROM "ExaminationArea"` and related queries against the production database. Cannot be planned without knowing what data exists.

Phases with well-documented patterns (standard implementation, skip additional research):

- **Phase 1** (Pure Engines): Scoring algorithm fully specified in RBIA-POLICY-2020.md; state machine follows `src/lib/state-machine.ts` exactly
- **Phase 2** (DAL): Follows existing 39-file DAL pattern exactly; path-prefix index behavior confirmed in multiple sources
- **Phase 3** (Server Actions): Follows existing 81-file server actions pattern; Zod + `$transaction` pattern is production-proven
- **Phase 5** (Findings/Meetings): LOW-MEDIUM complexity per FEATURES.md; all patterns established in earlier phases; BM response reuses existing evidence upload and email infrastructure

## Confidence Assessment

| Area         | Confidence | Notes                                                                                                                                                                                                                                                                                                                                                             |
| ------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack        | HIGH       | Zero new packages confirmed. All capabilities verified against current `package.json` versions (TanStack Table 8.21.3, Recharts 3.7.0, Prisma 7.3.0, react-hook-form 7.71.1, date-fns 4.1.0). TanStack expanding feature confirmed via Context7 official docs.                                                                                                    |
| Features     | HIGH       | 6 of 8 table-stakes features verified against RBIA-POLICY-2020.md sections with high confidence. Positive observations (TS-V6-08) and opening/exit meeting specifics (TS-V6-05) are MEDIUM confidence — domain practice, not explicit RBI circular text. All schema models confirmed in prisma/schema.prisma.                                                     |
| Architecture | HIGH       | All patterns verified against existing production codebase. Build order derived from actual import dependency analysis. Dual coexistence strategy confirmed against CLAUDE.md v6.0 section. No speculative patterns — every decision has a production precedent in the same codebase.                                                                             |
| Pitfalls     | HIGH       | Three critical pitfalls backed by specific Prisma GitHub issues with known behavior (Decimal precision loss #6852/#10412, no recursive CTE #3725, no native tree support #4562). PostgreSQL trigger for immutability is established database practice. State machine completeness pitfall observed directly in current `update-engagement-status.ts` source code. |

**Overall confidence:** HIGH

### Gaps to Address

- **Scoring precision approach reconciliation**: STACK.md recommends pure TypeScript `ScoringEngine` for all scoring; PITFALLS.md recommends PostgreSQL NUMERIC CTE for the freeze calculation. These recommendations are not fully reconciled. Recommended resolution: use pure TypeScript engine for live score display (fast, client-side, accepted display approximation), use PostgreSQL NUMERIC CTE for the freeze calculation that writes to the immutable snapshot (precise, server-side, runs once). Validate this split approach against a known-values unit test before implementing the freeze action.

- **Rating band threshold discrepancy**: Minor difference between STACK.md (`> 85%` = VERY_GOOD) and FEATURES.md (`> 80%` = VERY_GOOD, per RBIA-POLICY-2020.md text). FEATURES.md values sourced from RBIA-POLICY-2020.md sections 7.4-8.9 should be treated as authoritative. Resolve in Phase 1 constants file before scoring engine unit tests are written.

- **Positive observations capture fields**: FEATURES.md rates confidence MEDIUM for the specific format (domain practice, not explicit RBI circular text). During Phase 5, validate the capture fields (title, description, moduleCode) against a real UCB audit report before finalizing the Zod schema and DB form.

- **ExaminationNode seed completeness**: The research assumes a canonical UCB RBIA examination tree exists (or will be seeded). The actual node count, depth distribution, weight values, and `applicableBranchTypes` assignments for the production-ready tree are not fully specified in research. This must be resolved before Phase 4 — the examination tree UI needs real seeded data to validate rendering performance and score roll-up correctness.

- **RBIA audit report section format**: The 8-section layout in FEATURES.md (DIFF-V6-04) derives from domain practice synthesis. Before Phase 6 PDF implementation, obtain or verify against an actual UCB RBIA audit report to confirm section order, required content, and formatting standards per RBI RBIA policy section 15.7.6.

## Sources

### Primary — HIGH confidence

- `/Users/admin/Developer/AEGIS/RBIA-POLICY-2020.md` — IDBI Bank RBIA Policy 2020, sections 7.3-8.9, 15.7, Appendix A — feature requirements and scoring specification
- `/Users/admin/Developer/AEGIS/prisma/schema.prisma` — v6.0 model definitions (ExaminationNode, ExaminationResponse, BranchRbiaScore, ActionPoint, EngagementMeeting, PositiveObservation, BmResponseBatch, EngagementStatus enum, ScoreLabel enum)
- [TanStack Table Expanding Guide](https://tanstack.com/table/v8/docs/guide/expanding) — `getSubRows` + `getExpandedRowModel` tree UI pattern (Context7 verified)
- [Prisma PostgreSQL JSONB Documentation](https://www.prisma.io/docs/orm/overview/databases/postgresql) — Json field type, JSONB write/read behavior
- [React useOptimistic Hook](https://react.dev/reference/react/useOptimistic) — state transition optimistic UI
- [Next.js Server Actions Documentation](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations) — mutation pattern
- Existing codebase: `src/lib/state-machine.ts`, `src/lib/ram-engine.ts`, `src/data-access/audit-execution.ts`, `src/actions/audit-execution/create-engagement.ts` — established patterns for every new component type

### Secondary — MEDIUM confidence

- [Prisma GitHub #6852](https://github.com/prisma/prisma/issues/6852) — Decimal precision loss in PostgreSQL
- [Prisma GitHub #10412](https://github.com/prisma/prisma/issues/10412) — Loss of precision with Decimal fields
- [Prisma GitHub #3725](https://github.com/prisma/prisma/issues/3725) — No recursive CTE support (open since 2019)
- [Prisma GitHub #4562](https://github.com/prisma/prisma/issues/4562) — No native tree structure support (open since 2020)
- [sqlfordevs.com: Materialized Path Pattern](https://sqlfordevs.com/tree-as-materialized-path) — LIKE prefix query pattern with B-tree index
- [ICAI Technical Guide on RBIA in Banks](https://kb.icai.org/pdfs/PDFFile663b07e9d230f9.29869545.pdf) — domain practice for dual findings taxonomy
- [RBI RBIA Framework Notification Feb 2021](https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12018&Mode=0) — regulatory mandate for UCBs

### Tertiary — LOW confidence (evaluated and rejected)

- `react-arborist` npm — evaluated, rejected: 43KB, drag-and-drop not needed, virtualization overkill for <200 nodes
- `prisma-extension-bark` npm — evaluated, rejected: last updated April 2024, Prisma 7 compatibility unconfirmed
- XState — evaluated, rejected: 47KB for 8-state linear workflow; Server Actions pattern already established in codebase

---

_Research completed: 2026-02-22_
_Synthesized from: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md_
_Ready for roadmap: yes_
