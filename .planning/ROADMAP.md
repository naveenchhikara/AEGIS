# Roadmap: AEGIS v6.0 RBIA Implementation

## Milestones

- ✅ **v1.0 Clickable Prototype** — Phases 1-4 (shipped 2026-02-08)
- ✅ **v2.0 Working Core MVP** — Phases 5-14 (shipped 2026-02-10)
- ✅ **v3.0 RBIAS Full Platform** — Phases 15-17 (shipped 2026-02-21)
- ✅ **v4.0 Platform Hardening** — (shipped 2026-02-21)
- ✅ **v5.0 Pilot Readiness** — (shipped 2026-02-22)
- 🚧 **v6.0 RBIA Implementation** — Phases 18-26 (in progress)

---

<details>
<summary>✅ v1.0–v5.0 (Phases 1-17) — SHIPPED</summary>

Phases 1-17 completed across v1.0 through v5.0 milestones. See `.planning/milestones/` for archived roadmaps and plans.

</details>

---

## 🚧 v6.0 RBIA Implementation (In Progress)

**Milestone Goal:** Implement the full RBIA audit workflow using v6.0 schema models — hierarchical examination tree, 4-point weighted scoring, dual findings model (ActionPoints + Observations), 8-state engagement lifecycle, branch RBIA scoring, BM batch response, and RBIA reporting.

**41 requirements across 9 phases (18-26). Phase numbering continues from v3.0's Phase 17. Phases 24-26 are gap closure phases from milestone audit.**

## Phases

- [x] **Phase 18: Foundation** — Scoring engine, engagement state machine, DB guards, data encryption, and terminology rename (completed 2026-02-23)
- [x] **Phase 19: Data Access Layer** — Tenant-scoped DAL for tree, scoring, findings, meetings, and module selection (completed 2026-02-23)
- [x] **Phase 20: Server Actions** — Zod schemas and server action mutations for all v6.0 operations (completed 2026-02-25)
- [x] **Phase 21: Examination UI** — Hierarchical tree view, 4-button score picker, progress indicators, and filters (completed 2026-02-25)
- [x] **Phase 22: Findings and Meetings** — Dual findings tabs, opening/exit meeting forms, engagement lifecycle UI (completed 2026-02-25)
- [x] **Phase 23: BM Response and Reporting** — Branch manager response panel, overdue escalation, score display, and RBIA PDF report (completed 2026-02-25)
- [x] **Phase 24: Score Freeze & Score Page Fixes** — Wire freeze button, fix TS2322 error, wire gauge-to-drilldown, delete orphaned component (gap closure) (completed 2026-02-28)
- [ ] **Phase 25: Module Selection UI** — Add/remove module controls in module grid for manual module management (gap closure)
- [ ] **Phase 26: Evidence Upload** — S3 presigned URL generation and evidence upload for BM action point responses (gap closure)

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

**Plans**: 5 plans (Wave 1: foundation, Wave 2: domain actions, Wave 3: freeze)

Plans:

- [ ] 20-01-PLAN.md — Schema change (sourceActionPointId) + 4 RBIA permissions + shared Zod schemas + ActionResult type
- [ ] 20-02-PLAN.md — saveExaminationResponse (upsert + silent draft AP) + module selection server actions
- [ ] 20-03-PLAN.md — recordMeeting (atomic meeting + status transition) + signOffMeeting server actions
- [ ] 20-04-PLAN.md — createActionPoint + updateActionPoint + deleteActionPoint + promoteToObservation + submitBmResponse
- [ ] 20-05-PLAN.md — freezeRbiaScore (5-step atomic transaction: scores + BranchRbiaScore + issue APs + BmResponseBatch)

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

**Plans**: 4 plans (Wave 1: components, Wave 2: page assembly)

Plans:

- [ ] 21-01-PLAN.md — `rbia-module-grid.tsx`: module selection grid with status badges, progress bars, and branch-type auto-selection display
- [ ] 21-02-PLAN.md — `rbia-examination-tree.tsx`: TanStack Table expanding tree with 4-button score picker, working notes expansion, filter toggles, URL state, and critical item styling
- [ ] 21-03-PLAN.md — `rbia-score-panel.tsx`: composite score display with module breakdown, rating band badge, and freeze button stub
- [ ] 21-04-PLAN.md — RBIA engagement dashboard page (`/rbia/page.tsx`) + module examination page (`/rbia/module/[moduleCode]/page.tsx`)

### Phase 22: Findings and Meetings

**Goal**: Auditors can create and manage ActionPoints and formal Observations in a unified findings list with type filters, record opening and exit meetings with structured minutes and attendee sign-off, view composite RBIA score with drill-down, and the engagement lifecycle enforces meeting prerequisites before status transitions — completing the dual findings workflow and score visualization.

**Depends on**: Phase 21

**Requirements**: FIND-04, BMRP-02, BMRP-03, BMRP-04, REPT-01, REPT-03

**Success Criteria** (what must be TRUE):

1. The findings page shows ActionPoints and Formal Observations in a unified list with type badges — auditor can filter by type (AP only, Observation only) to get focused views
2. An auditor can create an ActionPoint with serial number, title, description, severity, module code, and source examination response link — all fields save and display correctly
3. Auditor can record an opening meeting with attendees list, structured minutes, and sign-off before the engagement transitions to IN_PROGRESS — the transition button is disabled until a meeting record exists
4. Auditor can record an exit meeting before the engagement transitions to REPORT_DRAFT — the transition button is disabled until an exit meeting record exists
5. The BM response panel shows a progress counter (responded / total ActionPoints) and a deadline countdown — updating after each individual AP response is submitted
6. Composite RBIA score displayed as a prominent gauge with module breakdown bars and 5-color rating band gradient — drill-down from composite to leaf level available

**Plans**: 5 plans (Wave 1: components, Wave 2: page assembly)

Plans:

- [ ] 22-01-PLAN.md — Engagement stepper + unified findings list with type filters + finding form (FIND-04)
- [ ] 22-02-PLAN.md — Meeting forms (opening + exit) with attendee multi-select and structured minutes (BMRP-02)
- [ ] 22-03-PLAN.md — Score gauge visualization + module bars + drill-down tree (REPT-01, REPT-03)
- [ ] 22-04-PLAN.md — BM response panel with stacked AP cards, progress counter, deadline countdown (BMRP-02, BMRP-03, BMRP-04)
- [ ] 22-05-PLAN.md — Page assembly: RBIA layout with tab navigation + findings/meetings/score server pages (all requirements)

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

**Plans**: 5 plans (all Wave 1 — fully parallel)

Plans:

- [ ] 23-01-PLAN.md — BM response page + DAL + components (AP card, deadline banner, submit modal)
- [ ] 23-02-PLAN.md — BmResponseBatch overdue escalation cron job + email template + pipeline wiring
- [ ] 23-03-PLAN.md — Score visualization: circular gauge, module breakdown with accordion drill-down, historical trend chart
- [ ] 23-04-PLAN.md — RBIA audit report PDF (8 sections) + DAL + generatePdfReport RBIA branch
- [ ] 23-05-PLAN.md — Board analytics: KPI cards, RadarChart for module scores, branch rating distribution chart

## Progress

**Execution Order:** 18 → 19 → 20 → 21 → 22 → 23

| Phase                         | Milestone | Plans Complete | Status     | Completed |
| ----------------------------- | --------- | -------------- | ---------- | --------- |
| 18. Foundation                | 5/5       | Complete       | 2026-02-23 | -         |
| 19. Data Access Layer         | 5/5       | Complete       | 2026-02-23 | -         |
| 20. Server Actions            | 5/5       | Complete       | 2026-02-25 | -         |
| 21. Examination UI            | 4/4       | Complete       | 2026-02-25 | -         |
| 22. Findings and Meetings     | 5/5       | Complete       | 2026-02-25 | -         |
| 23. BM Response and Reporting | 5/5       | Complete       | 2026-02-25 | -         |
| 24. Score Freeze & Score Page | 2/2 | Complete   | 2026-02-28 | -         |
| 25. Module Selection UI       | -         | Planned        | -          | -         |
| 26. Evidence Upload           | -         | Planned        | -          | -         |

### Phase 24: Score Freeze & Score Page Fixes

**Goal:** Wire the freeze score button to enable the BM response workflow end-to-end, fix TypeScript compilation error in score page, wire gauge-to-drilldown interaction, and remove orphaned component.

**Depends on:** Phase 23

**Requirements:** EXAM-10, REPT-03

**Gap Closure:** Closes critical freeze flow gap + score page compilation/wiring gaps from v6.0 audit.

### Phase 25: Module Selection UI

**Goal:** Provide UI controls for auditors to manually add or remove examination modules from the auto-selected set, completing the module management feature.

**Depends on:** Phase 24

**Requirements:** ENGG-06

**Gap Closure:** Closes module add/remove UI gap — DAL and server actions exist from Phase 19/20 but lack UI consumers.

### Phase 26: Evidence Upload

**Goal:** Enable Branch Managers to upload evidence files when responding to Action Points, using S3 presigned URLs for secure direct-to-bucket uploads.

**Depends on:** Phase 25

**Requirements:** BMRP-02

**Gap Closure:** Closes evidence upload gap — buttons exist but are disabled pending S3 presigned URL integration.
