# Requirements: AEGIS v6.0 RBIA Implementation

**Defined:** 2026-02-22
**Core Value:** Individual audit observations flow upward through a structured lifecycle to form the complete risk and compliance picture — from a single branch finding to the board report.

## v6.0 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Examination & Scoring

- [ ] **EXAM-01**: Auditor can view hierarchical examination tree with expand/collapse navigation at each depth level (0-5)
- [ ] **EXAM-02**: Auditor can score leaf examination items using 4-button picker (FULLY / LARGELY / PARTIALLY / NON_COMPLIANT)
- [ ] **EXAM-03**: Auditor can add working notes (500-2000 chars) per leaf item as evidence and rationale
- [ ] **EXAM-04**: Auditor can flag leaf items for Action Point and/or Observation promotion
- [x] **EXAM-05**: System computes weighted score roll-up from leaf → parent → module → composite in real-time as items are scored
- [x] **EXAM-06**: Critical items (isCritical=true) cap parent module score at 0.5 when scored NON_COMPLIANT
- [ ] **EXAM-07**: System displays progress indicator per module ("12/24 items scored" with percentage)
- [ ] **EXAM-08**: Auditor can filter examination items by: not yet scored, flagged for AP, flagged for observation
- [ ] **EXAM-09**: Examination state saves incrementally — no data loss if auditor closes mid-session
- [ ] **EXAM-10**: HIA can freeze RBIA score at engagement completion, creating immutable BranchRbiaScore JSONB snapshot
- [x] **EXAM-11**: Frozen BranchRbiaScore cannot be mutated after freeze (DB-level trigger protection)
- [x] **EXAM-12**: System assigns rating band based on composite score (Poor ≤40%, Moderate >40-50%, Satisfactory >50-65%, Good >65-80%, Very Good >80%)

### Engagement Lifecycle

- [x] **ENGG-01**: Engagement follows 8-state lifecycle: PLANNED → TEAM_ASSIGNED → OPENING_MEETING → IN_PROGRESS → EXIT_MEETING → REPORT_DRAFT → COMPLETED (+ CANCELLED)
- [x] **ENGG-02**: Each state transition has server-enforced prerequisite guards (e.g., team assigned before TEAM_ASSIGNED, meeting recorded before IN_PROGRESS)
- [ ] **ENGG-03**: HIA/Audit Manager can record opening meeting with attendees, minutes, and sign-off before IN_PROGRESS transition
- [ ] **ENGG-04**: HIA/Audit Manager can record exit meeting with attendees, key discussion points, and sign-off before REPORT_DRAFT transition
- [x] **ENGG-05**: System auto-selects applicable examination modules based on branch type (LARGE/MEDIUM/SMALL) using applicableBranchTypes
- [x] **ENGG-06**: Auditor can manually add or remove modules from auto-selected set with documented reason
- [x] **ENGG-07**: Engagement gateway routes RBIA engagements to v6.0 UI while legacy engagements continue using existing sections path

### Findings

- [ ] **FIND-01**: Auditor can create ActionPoints from flagged examination responses (~15-40 per audit, operational findings)
- [ ] **FIND-02**: ActionPoint follows 6-state lifecycle: DRAFT → ISSUED → BM_RESPONSE_DUE → BM_RESPONDED → VERIFIED → CLOSED (or CARRIED_FORWARD)
- [ ] **FIND-03**: Auditor can promote flagged examination responses to formal Observations (5C format, ~3-10 per audit)
- [ ] **FIND-04**: ActionPoints and Observations display with clear type separation in findings view — implemented as unified list with type filter badges per user decision (filter toggles provide equivalent focused views to separate tabs)
- [x] **FIND-05**: System detects carry-forward ActionPoints from previous engagement and surfaces them at new engagement start
- [ ] **FIND-06**: Each ActionPoint has serial number, title, description, severity, module code, and source examination response link

### Branch Manager Response

- [ ] **BMRP-01**: System creates BmResponseBatch when ActionPoints are issued at REPORT_DRAFT transition with 15-day deadline
- [ ] **BMRP-02**: Branch Manager can respond to each ActionPoint individually with text response and evidence upload
- [ ] **BMRP-03**: BM response panel shows progress counter (responded/total) and deadline countdown
- [ ] **BMRP-04**: Batch submit enabled only when all ActionPoints have been addressed
- [ ] **BMRP-05**: System transitions BmResponseBatch to OVERDUE status when deadline passes with email escalation to Zonal Auditor

### Reporting & Analytics

- [ ] **REPT-01**: System displays composite RBIA score with module breakdown, rating band color coding (Poor=red through Very Good=dark green)
- [ ] **REPT-02**: System shows historical RBIA score trend across engagements for each branch
- [ ] **REPT-03**: Score drill-down from composite → module → sub-module → leaf item level
- [ ] **REPT-04**: RBIA audit report PDF generated with dual sections: score summary + findings (8-section format)
- [ ] **REPT-05**: Board analytics includes RadarChart for module scores and branch rating distribution chart

### Data Security

- [x] **DSEC-01**: All client-server communication encrypted via TLS 1.2+ (HTTPS enforced, HSTS header)
- [x] **DSEC-02**: PostgreSQL connections use SSL mode (sslmode=require in connection string)
- [x] **DSEC-03**: S3 evidence bucket has server-side encryption enabled (SSE-S3 or SSE-KMS) with bucket policy enforcing encryption
- [x] **DSEC-04**: VPS disk encryption at rest for PostgreSQL data directory (LUKS or equivalent)
- [x] **DSEC-05**: Tenant data isolation verified — no cross-tenant data leakage possible even with direct DB access (application-level WHERE + audit verification)

### Terminology

- [x] **TERM-01**: All UI displays "Head of Internal Audit (HIA)" instead of "Chief Audit Executive (CAE)" — Role.CAE enum preserved internally

## Future Requirements

Deferred to post-v6.0. Tracked but not in current roadmap.

### Positive Observations

- **POBS-01**: Auditor can capture commendable practices per engagement (title, description, module)
- **POBS-02**: Positive observations included in audit report before findings section

### Offline & Export

- **OFFL-01**: Offline scoring sheet Excel export for low-connectivity rural branches
- **OFFL-02**: Offline scoring sheet Excel import with conflict resolution

### Compliance Certificates

- **CERT-01**: FACC (Follow-up Action Completion Certificate) PDF auto-generation from resolved ActionPoints
- **CERT-02**: ACE/ACB rating migration report extending existing board report format

## Out of Scope

| Feature                                    | Reason                                                               |
| ------------------------------------------ | -------------------------------------------------------------------- |
| Configurable scoring scales                | RBI-mandated 4-point scale; deviation is compliance risk             |
| Real-time multi-user collaborative scoring | Section ownership sufficient; CRDTs/OT is overengineering            |
| AI/ML finding classification               | Premature at UCB data volume; keep human in the loop                 |
| Examination node CRUD via UI               | Tree derives from RBI master; allow only N/A marking at depth 3+     |
| XState for engagement workflow             | 47KB for 8-state linear workflow; Server Actions pattern established |
| react-arborist for tree UI                 | TanStack Table expanding is sufficient; 43KB extra not justified     |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase    | Status   |
| ----------- | -------- | -------- |
| EXAM-01     | Phase 21 | Pending  |
| EXAM-02     | Phase 21 | Pending  |
| EXAM-03     | Phase 20 | Pending  |
| EXAM-04     | Phase 20 | Pending  |
| EXAM-05     | Phase 18 | Complete |
| EXAM-06     | Phase 18 | Complete |
| EXAM-07     | Phase 21 | Pending  |
| EXAM-08     | Phase 21 | Pending  |
| EXAM-09     | Phase 20 | Pending  |
| EXAM-10     | Phase 20 | Pending  |
| EXAM-11     | Phase 18 | Complete |
| EXAM-12     | Phase 18 | Complete |
| ENGG-01     | Phase 18 | Complete |
| ENGG-02     | Phase 18 | Complete |
| ENGG-03     | Phase 20 | Pending  |
| ENGG-04     | Phase 20 | Pending  |
| ENGG-05     | Phase 19 | Complete |
| ENGG-06     | Phase 19 | Complete |
| ENGG-07     | Phase 19 | Complete |
| FIND-01     | Phase 20 | Pending  |
| FIND-02     | Phase 20 | Pending  |
| FIND-03     | Phase 20 | Pending  |
| FIND-04     | Phase 22 | Pending  |
| FIND-05     | Phase 19 | Complete |
| FIND-06     | Phase 20 | Pending  |
| BMRP-01     | Phase 20 | Pending  |
| BMRP-02     | Phase 22 | Pending  |
| BMRP-03     | Phase 22 | Pending  |
| BMRP-04     | Phase 22 | Pending  |
| BMRP-05     | Phase 23 | Pending  |
| REPT-01     | Phase 22 | Pending  |
| REPT-02     | Phase 23 | Pending  |
| REPT-03     | Phase 22 | Pending  |
| REPT-04     | Phase 23 | Pending  |
| REPT-05     | Phase 23 | Pending  |
| DSEC-01     | Phase 18 | Complete |
| DSEC-02     | Phase 18 | Complete |
| DSEC-03     | Phase 18 | Complete |
| DSEC-04     | Phase 18 | Complete |
| DSEC-05     | Phase 18 | Complete |
| TERM-01     | Phase 18 | Complete |

**Coverage:**

- v6.0 requirements: 41 total
- Mapped to phases: 41
- Unmapped: 0

Phase breakdown:

- Phase 18 (Foundation): EXAM-05, EXAM-06, EXAM-11, EXAM-12, ENGG-01, ENGG-02, DSEC-01, DSEC-02, DSEC-03, DSEC-04, DSEC-05, TERM-01 — 12 requirements
- Phase 19 (Data Access Layer): ENGG-05, ENGG-06, ENGG-07, FIND-05 — 4 requirements
- Phase 20 (Server Actions): EXAM-03, EXAM-04, EXAM-09, EXAM-10, ENGG-03, ENGG-04, FIND-01, FIND-02, FIND-03, FIND-06, BMRP-01 — 11 requirements
- Phase 21 (Examination UI): EXAM-01, EXAM-02, EXAM-07, EXAM-08 — 4 requirements
- Phase 22 (Findings and Meetings): FIND-04, BMRP-02, BMRP-03, BMRP-04, REPT-01, REPT-03 — 6 requirements
- Phase 23 (BM Response and Reporting): BMRP-05, REPT-02, REPT-04, REPT-05 — 4 requirements

---

_Requirements defined: 2026-02-22_
_Last updated: 2026-02-22 — traceability filled after roadmap creation_
