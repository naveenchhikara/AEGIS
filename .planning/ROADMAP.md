# Roadmap: AEGIS v6.0 RBIA Implementation

## Milestones

- ✅ **v1.0 Clickable Prototype** — Phases 1-4 (shipped 2026-02-08)
- ✅ **v2.0 Working Core MVP** — Phases 5-14 (shipped 2026-02-10)
- ✅ **v3.0 RBIAS Full Platform** — Phases 15-17 (shipped 2026-02-21)
- ✅ **v4.0 Platform Hardening** — (shipped 2026-02-21)
- ✅ **v5.0 Pilot Readiness** — (shipped 2026-02-22)
- 🚧 **v6.0 RBIA Implementation** — Phases 18-23 (in progress)

---

<details>
<summary>✅ v1.0–v5.0 (Phases 1-17) — SHIPPED</summary>

Phases 1-17 completed across v1.0 through v5.0 milestones. See `.planning/milestones/` for archived roadmaps and plans.

</details>

---

## 🚧 v6.0 RBIA Implementation (In Progress)

**Milestone Goal:** Implement the full RBIA audit workflow using v6.0 schema models — hierarchical examination tree, 4-point weighted scoring, dual findings model (ActionPoints + Observations), 8-state engagement lifecycle, branch RBIA scoring, BM batch response, and RBIA reporting.

**41 requirements across 6 phases (18-23). Phase numbering continues from v3.0's Phase 17.**

## Phases

- [x] **Phase 18: Foundation** — Scoring engine, engagement state machine, DB guards, data encryption, and terminology rename (completed 2026-02-23)
- [ ] **Phase 19: Data Access Layer** — Tenant-scoped DAL for tree, scoring, findings, meetings, and module selection
- [ ] **Phase 20: Server Actions** — Zod schemas and server action mutations for all v6.0 operations
- [ ] **Phase 21: Examination UI** — Hierarchical tree view, 4-button score picker, progress indicators, and filters
- [ ] **Phase 22: Findings and Meetings** — Dual findings tabs, opening/exit meeting forms, engagement lifecycle UI
- [ ] **Phase 23: BM Response and Reporting** — Branch manager response panel, overdue escalation, score display, and RBIA PDF report

## Phase Details

### Phase 18: Foundation

**Goal**: Pure scoring engine, typed state machine, database-level guards, and data encryption infrastructure exist and are verified before any data is written — providing a safe, precision-correct, encryption-protected foundation that all subsequent layers depend on.

**Depends on**: Nothing (first phase of v6.0 milestone)

**Requirements**: EXAM-05, EXAM-06, EXAM-11, EXAM-12, ENGG-01, ENGG-02, DSEC-01, DSEC-02, DSEC-03, DSEC-04, DSEC-05, TERM-01

**Success Criteria** (what must be TRUE):

1. A unit test passes that feeds known scores into the scoring engine and receives correct weighted roll-up values — including the critical-item cap behavior when a critical leaf is NON_COMPLIANT
2. A unit test verifies all 8 EngagementStatus states are handled by the state machine — TypeScript compile error if any enum value is missing
3. The database rejects any UPDATE attempt on a BranchRbiaScore row whose frozenAt is not null (verified by running the trigger guard SQL)
4. The ExaminationNode table has CHECK constraints that reject a path field that does not end with the node's own code
5. Every UI label that previously showed "Chief Audit Executive" or "CAE" now displays "Head of Internal Audit (HIA)" — the Role.CAE enum value is unchanged in the database
6. All client-server traffic uses TLS 1.2+ (HSTS header set, HTTP redirects to HTTPS), PostgreSQL connections use sslmode=require, S3 bucket has server-side encryption policy, and VPS data directory is encrypted at rest
7. Tenant data isolation audit confirms no cross-tenant leakage — verified by running isolation check queries

**Plans**: 5 plans (all Wave 1 — fully parallel)

Plans:

- [ ] 18-01-PLAN.md — RBIA scoring engine TDD (weighted roll-up, critical-item cap, rating bands, composite score)
- [ ] 18-02-PLAN.md — Engagement state machine TDD (8-state lifecycle, prerequisite guards, server action replacement)
- [ ] 18-03-PLAN.md — DB guards SQL migration (BranchRbiaScore immutability trigger + ExaminationNode path CHECK)
- [ ] 18-04-PLAN.md — TERM-01 CAE-to-HIA display string rename (5 source files + 1 test)
- [ ] 18-05-PLAN.md — Data encryption audit (SECURITY-AUDIT.md, PostgreSQL SSL guidance, tenant isolation test)

### Phase 19: Data Access Layer

**Goal**: All tenant-scoped DAL functions for the v6.0 RBIA workflow exist and enforce the same security and isolation patterns as the 39 existing DAL files — establishing the canonical `getEngagementFindings()` convention before any UI queries findings.

**Depends on**: Phase 18

**Requirements**: ENGG-05, ENGG-06, ENGG-07, FIND-05

**Success Criteria** (what must be TRUE):

1. A flat `findMany` query loads the full examination tree and `buildTree()` reconstructs the hierarchy correctly — no N+1 traversal, single query
2. Module selection for a SMALL branch auto-selects only modules with `applicableBranchTypes` including SMALL — verified by calling the DAL function with a SMALL branch fixture
3. The engagement detail page routes RBIA engagements to the v6.0 `/rbia/` path and legacy engagements to the existing `/sections/` path — the fork logic exists and is verified
4. Carry-forward ActionPoints from a previous engagement are surfaced when a new engagement starts for the same branch — the DAL function returns them correctly

**Plans**: 5 plans (all Wave 1 — fully parallel)

Plans:

- [ ] 19-01-PLAN.md — `rbia-examination.ts`: flat tree load + `buildTree()` + module auto-selection + manual add/remove
- [ ] 19-02-PLAN.md — `rbia-scoring.ts`: module scores query, BranchRbiaScore history, engagement score
- [ ] 19-03-PLAN.md — `rbia-findings.ts`: unified `getEngagementFindings()` (two typed arrays) + carry-forward detection
- [ ] 19-04-PLAN.md — `rbia-meetings.ts`: EngagementMeeting query + atomic upsert DAL functions
- [ ] 19-05-PLAN.md — Engagement gateway: fork RBIA to `/rbia/` route + stub page + auditType in DAL query

### Phase 20: Server Actions

**Goal**: Every v6.0 mutation has a server action with auth check, permission guard, and Zod validation — providing a stable, type-safe API that all UI components call without touching Prisma directly.

**Depends on**: Phase 19

**Requirements**: EXAM-03, EXAM-04, EXAM-09, EXAM-10, ENGG-03, ENGG-04, FIND-01, FIND-02, FIND-03, FIND-06, BMRP-01

**Success Criteria** (what must be TRUE):

1. Saving an examination response (score + working notes) upserts the ExaminationResponse row and conditionally creates a draft ActionPoint when the `flagForAP` field is set — all within a single Prisma transaction
2. Recording an opening meeting transitions the engagement to IN_PROGRESS only after the state machine confirms OPENING_MEETING is a valid predecessor — the server action rejects an invalid transition with an error
3. The freeze action writes a BranchRbiaScore snapshot atomically with the engagement status update — if the DB trigger fires (frozen score attempted re-freeze), the transaction rolls back with an error
4. A BmResponseBatch is created with a 15-day deadline when ActionPoints are issued at the REPORT_DRAFT transition — the batch has correct counts and deadline timestamp
5. New permissions (`rbia:examine`, `rbia:score_freeze`, `action_point:manage`, `action_point:bm_respond`) exist in `permissions.ts` and are enforced in each relevant server action

**Plans**: TBD

Plans:

- [ ] 20-01: `schemas.ts` — shared Zod schemas for all v6.0 operations
- [ ] 20-02: `save-examination-response` + `select-modules` server actions
- [ ] 20-03: `record-meeting` + `create-action-point` + `promote-to-observation` server actions
- [ ] 20-04: `submit-bm-response` + `freeze-rbia-score` server actions (atomic transactions)
- [ ] 20-05: Permissions — add `rbia:*` and `action_point:*` entries to `permissions.ts`

### Phase 21: Examination UI

**Goal**: Auditors can navigate, score, and annotate the full hierarchical examination tree in a single working UI — with live progress tracking and filtering — before any findings or reporting features are built.

**Depends on**: Phase 20

**Requirements**: EXAM-01, EXAM-02, EXAM-07, EXAM-08

**Success Criteria** (what must be TRUE):

1. Auditor can expand and collapse examination nodes at any of the 5 depth levels and see child items appear/disappear — the tree renders correctly for a branch with the full seeded examination set
2. Auditor can click one of the 4 score buttons (FULLY / LARGELY / PARTIALLY / NON_COMPLIANT) on a leaf item and the score saves immediately with optimistic UI — no full page reload required
3. Each module shows a progress indicator (e.g., "12 / 24 items scored — 50%") that updates in real time as items are scored
4. Auditor can filter the examination tree to show only: (a) unscored items, (b) items flagged for Action Point, (c) items flagged for Observation — the filtered view hides all non-matching items
5. Closing the browser mid-session and reopening the examination page shows all previously saved scores — no data loss from incomplete sessions

**Plans**: TBD

Plans:

- [ ] 21-01: `rbia-module-grid.tsx` — module selection grid with status badges and branch-type auto-selection display
- [ ] 21-02: `rbia-examination-tree.tsx` — TanStack Table expanding tree with 4-button score picker, critical item warning, and working notes input
- [ ] 21-03: `rbia-score-panel.tsx` — module score bars + composite score + freeze trigger (read-only display for Phase 21; freeze in Phase 20)
- [ ] 21-04: RBIA engagement dashboard page (`/rbia/page.tsx`) + module examination page (`/rbia/module/[moduleCode]/page.tsx`)

### Phase 22: Findings and Meetings

**Goal**: Auditors can create and manage ActionPoints and formal Observations in separate tabs, record opening and exit meetings with attendees, and the engagement lifecycle enforces meeting prerequisites before status transitions — completing the dual findings workflow.

**Depends on**: Phase 21

**Requirements**: FIND-04, BMRP-02, BMRP-03, BMRP-04

**Success Criteria** (what must be TRUE):

1. The findings page shows ActionPoints and Formal Observations in separate tabs — an auditor viewing "Action Points" sees only APs, never Observations mixed in
2. An auditor can create an ActionPoint with serial number, title, description, severity, module code, and source examination response link — all fields save and display correctly
3. Auditor can record an opening meeting with attendees list, minutes, and sign-off before the engagement transitions to IN_PROGRESS — the transition button is disabled until a meeting record exists
4. Auditor can record an exit meeting before the engagement transitions to REPORT_DRAFT — the transition button is disabled until an exit meeting record exists
5. The BM response panel shows a progress counter (responded / total ActionPoints) and a deadline countdown — updating after each individual AP response is submitted

**Plans**: TBD

Plans:

- [ ] 22-01: `action-points-table.tsx` + `action-point-form.tsx` — AP list with status filter, create/edit form
- [ ] 22-02: `meeting-form.tsx` — opening and exit meeting forms with attendee JSON array and sign-off
- [ ] 22-03: `/rbia/findings/page.tsx` + `/rbia/meetings/page.tsx` — page assembly with tabs
- [ ] 22-04: `bm-response-panel.tsx` stub — per-AP inline response forms, progress counter, deadline countdown (BM-facing route wired in Phase 23)

### Phase 23: BM Response and Reporting

**Goal**: Branch Managers can submit batch responses to issued ActionPoints with deadline tracking and overdue escalation, and HIA can generate the full RBIA audit report PDF and view analytics — completing the v6.0 workflow end-to-end.

**Depends on**: Phase 22

**Requirements**: BMRP-05, REPT-01, REPT-02, REPT-03, REPT-04, REPT-05

**Success Criteria** (what must be TRUE):

1. A Branch Manager can open the BM response route, respond to each ActionPoint individually with text and optional evidence upload, and submit the batch only when all ActionPoints have a response — the batch submit button is disabled while any AP is unaddressed
2. When a BmResponseBatch deadline passes without submission, the system automatically sets the batch status to OVERDUE and sends an email escalation to the Zonal Auditor — verified by advancing the clock and triggering the pg-boss cron job
3. The score display page shows composite RBIA score with module breakdown and rating band color coding (Poor=red through Very Good=dark green), a historical trend chart across previous engagements, and score drill-down from composite down to individual leaf item level
4. The RBIA audit report PDF generates successfully with dual sections (score summary + findings) in 8-section format — the generated PDF contains the engagement details, frozen score, meeting minutes, ActionPoints, and Observations
5. Board analytics includes a RadarChart displaying module scores and a branch rating distribution chart — both charts render with real engagement data

**Plans**: TBD

Plans:

- [ ] 23-01: `/auditee/[id]/action-points` route — BM response UI reusing existing evidence upload and auth infrastructure
- [ ] 23-02: BmResponseBatch overdue pg-boss cron job + email escalation to Zonal Auditor
- [ ] 23-03: Score display page — composite score, module breakdown, rating band colors, historical trend, drill-down tree
- [ ] 23-04: RBIA audit report PDF — `rbia-score-section.tsx` + modifications to `[engagementId]/report/page.tsx`
- [ ] 23-05: Board analytics additions — RadarChart for module scores + branch rating distribution chart

## Progress

**Execution Order:** 18 → 19 → 20 → 21 → 22 → 23

| Phase                         | Milestone | Plans Complete | Status      | Completed |
| ----------------------------- | --------- | -------------- | ----------- | --------- |
| 18. Foundation                | 5/5       | Complete       | 2026-02-23  | -         |
| 19. Data Access Layer         | 3/5       | In Progress    |             | -         |
| 20. Server Actions            | v6.0      | 0/5            | Not started | -         |
| 21. Examination UI            | v6.0      | 0/4            | Not started | -         |
| 22. Findings and Meetings     | v6.0      | 0/4            | Not started | -         |
| 23. BM Response and Reporting | v6.0      | 0/5            | Not started | -         |
