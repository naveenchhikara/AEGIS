# Roadmap: AEGIS

## Milestones

- ✅ **v1.0 Clickable Prototype** — Phases 1-4 (shipped 2026-02-08) — see archived section below
- ✅ **v2.0 Working Core MVP** — Phases 5-10 (audit complete 2026-02-10)
- 🔧 **v2.0 Gap Closure** — Phases 11-14 (closing audit gaps)

## Phases

<details>
<summary>✅ v1.0 Clickable Prototype (Phases 1-4) — SHIPPED 2026-02-08</summary>

- [x] Phase 1: Project Setup & Demo Data (4/4 plans)
- [x] Phase 2: Core Screens (6/6 plans)
- [x] Phase 3: Finding Management & Reports (5/5 plans)
- [x] Phase 4: Polish & Deploy (8/8 plans)

</details>

### ✅ v2.0 Working Core MVP (Audit Complete)

**Milestone Goal:** Replace clickable prototype with real PostgreSQL backend, authentication, multi-tenancy, and full observation-to-board-report workflow. A UCB audit team can use AEGIS for an actual audit cycle.

#### Phase 5: Foundation & Migration

**Goal:** Establish multi-tenant PostgreSQL backend with authentication and audit trail, then validate the data access pattern by migrating one page from JSON to database.

**Depends on:** Phase 4 (v1.0 complete)

**Requirements:** FNDN-01, FNDN-02, FNDN-03, FNDN-04, FNDN-05, FNDN-06, FNDN-07, FNDN-08

**Success Criteria** (what must be TRUE):

1. New tenant is automatically provisioned with isolated database on signup
2. User can sign up, log in, and session persists across browser refresh
3. Admin can assign roles and users see only sidebar items permitted by their role
4. Every data-modifying action is recorded in append-only audit log that cannot be modified
5. CAE can view and search audit trail with filters
6. Settings page fetches data from PostgreSQL instead of JSON files

**Plans:** TBD

Plans:

- [ ] 05-01: TBD (to be planned)

---

#### Phase 6: Observation Lifecycle

**Goal:** Auditors can create observations that flow through a 7-state workflow with maker-checker approval, multi-dimensional tagging, and repeat finding detection.

**Depends on:** Phase 5

**Requirements:** OBS-01, OBS-02, OBS-03, OBS-04, OBS-05, OBS-06, OBS-07, OBS-08, OBS-09, OBS-10, OBS-11

**Success Criteria** (what must be TRUE):

1. Auditor can create observation with condition, criteria, cause, effect, recommendation
2. Observation flows through 7-state lifecycle: Draft → Submitted → Reviewed → Issued → Response → Compliance → Closed
3. Each state transition is recorded with who, when, and comment in immutable timeline
4. Audit Manager reviews and approves observations before issuing to auditee
5. Low/Medium findings closed by Audit Manager; High/Critical findings closed by CAE
6. User can tag observation across multiple dimensions (risk category, RBI requirement, audit area, severity, branch)
7. System suggests potential repeat findings and auto-escalates severity when confirmed
8. Findings page displays real observation data from PostgreSQL

**Plans:** 7 plans

Plans:

- [ ] 06-01-PLAN.md — Schema extension (version, resolvedDuringFieldwork, RBI circular junction table, pg_trgm indexes)
- [ ] 06-02-PLAN.md — State machine TDD (canTransition, getAvailableTransitions, escalateSeverity)
- [ ] 06-03-PLAN.md — Observation CRUD server actions + DAL (create, transition, resolve-fieldwork)
- [ ] 06-04-PLAN.md — Repeat finding detection + confirm/dismiss (pg_trgm, severity escalation)
- [ ] 06-05-PLAN.md — Create observation form UI + findings list migration to PostgreSQL
- [ ] 06-06-PLAN.md — Observation detail page migration + timeline + actions panel
- [ ] 06-07-PLAN.md — End-to-end verification checkpoint

---

#### Phase 7: Auditee Portal & Evidence

**Goal:** Auditees can view findings assigned to their branch, submit responses, upload evidence, and see deadline countdowns.

**Depends on:** Phase 6

**Requirements:** AUD-01, AUD-02, AUD-03, AUD-04, AUD-05, AUD-06, AUD-07, EVID-01, EVID-02, EVID-03, EVID-04, EVID-05

**Success Criteria** (what must be TRUE):

1. Auditee sees only observations assigned to their branch/department
2. Auditee can submit clarification/response with text explanation
3. Auditee can upload evidence files (PDF, JPEG, PNG, XLSX, DOCX) via drag-and-drop with progress indicator
4. Files are stored in AWS S3 Mumbai with tenant-scoped paths and encryption
5. Auditee responses and evidence uploads are timestamped and immutable
6. Auditee sees deadline countdown for each pending item and overdue items are visually highlighted
7. Evidence appears in observation timeline with timestamp and uploader

**Plans:** TBD

Plans:

- [ ] 07-01: TBD (to be planned)

---

#### Phase 8: Notifications & Reports

**Goal:** Users receive email notifications for assignments and deadlines, CAE can generate PDF board reports, and users can export data as formatted Excel files.

**Depends on:** Phase 7

**Requirements:** NOTF-01, NOTF-02, NOTF-03, NOTF-04, NOTF-05, NOTF-06, RPT-01, RPT-02, RPT-03, RPT-04, RPT-05, EXP-01, EXP-02, EXP-03, EXP-04, EXP-05

**Success Criteria** (what must be TRUE):

1. Auditee receives email when new observation is assigned
2. Auditor/Manager receives email when auditee submits response
3. Auditee receives deadline reminder emails (7d, 3d, 1d before due)
4. Overdue observations trigger escalation emails to auditee and supervisor
5. CAE/CCO receive weekly digest email with audit summary
6. Bulk operations batch notifications into digest instead of sending individual emails
7. CAE can generate PDF board report with 5 sections: executive summary, audit coverage, key findings, compliance scorecard, recommendations
8. Board report includes bank logo, confidentiality notice, page numbers, embedded charts, and repeat findings summary
9. User can export findings, compliance, and audit plan data as formatted XLSX with headers
10. Exports respect user role permissions and include bank name, date, and confidentiality header

**Plans:** TBD

Plans:

- [ ] 08-01: TBD (to be planned)

---

#### Phase 9: Dashboards

**Goal:** Five role-based dashboards aggregate real-time observation data to show audit coverage, compliance posture, and risk indicators.

**Depends on:** Phase 8

**Requirements:** DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06

**Success Criteria** (what must be TRUE):

1. Auditor dashboard shows assigned observations, current engagement progress, and pending responses
2. Audit Manager dashboard shows team workload, finding aging, audit plan progress, and pending reviews
3. CAE dashboard shows audit coverage, high/critical trends, compliance posture, and board report readiness
4. CCO dashboard shows compliance registry status, regulatory calendar, and compliance task progress
5. CEO dashboard shows executive summary with health score, risk indicators, and KPIs (read-only)
6. All dashboards derive from real-time observation data aggregation (no manual data entry)
7. Dashboard page displays real aggregated metrics from PostgreSQL

**Plans:** TBD

Plans:

- [ ] 09-01: TBD (to be planned)

---

#### Phase 10: Onboarding & Compliance

**Goal:** New banks complete guided onboarding wizard that seeds compliance registry with pre-built RBI checklists based on UCB tier.

**Depends on:** Phase 9

**Requirements:** ONBD-01, ONBD-02, ONBD-03, ONBD-04, ONBD-05, ONBD-06, CMPL-01, CMPL-02, CMPL-03, CMPL-04

**Success Criteria** (what must be TRUE):

1. New bank completes 5-step wizard: registration → tier selection → RBI directions → org structure → user invites
2. System auto-selects applicable RBI Master Directions based on UCB tier
3. Admin can upload org structure via Excel template or enter manually
4. Admin can invite users with role assignment via email
5. Onboarding seeds compliance registry with selected RBI requirements
6. Admin can save onboarding progress and return later
7. System includes pre-built checklists for 10 most common RBI Master Directions
8. Each requirement links to source RBI circular reference
9. Admin can mark requirements as not-applicable with documented reason
10. Admin can add custom compliance requirements

**Plans:** TBD

Plans:

- [ ] 10-01: TBD (to be planned)

---

### 🔧 v2.0 Gap Closure (Phases 11-14)

**Milestone Goal:** Close all gaps identified by v2.0 milestone audit. Fix auth security, wire missing data pipelines, complete ONBD-03, and formalize verification for all phases.

#### Phase 11: Auth Security Hardening

**Goal:** Add rate limiting, account lockout, concurrent session limits, and explicit cookie configuration to Better Auth — closing all 4 HIGH-severity auth security gaps from Phase 5 verification.

**Depends on:** Phase 10

**Requirements:** (tech debt closure — FNDN-02, FNDN-03 hardening)

**Gap Closure:** Phase 5 tech debt (HIGH severity)

**Success Criteria** (what must be TRUE):

1. Rate limiting configured: max 10 login attempts per 15 minutes per IP
2. Account lockout after 5 consecutive failed attempts with 30-minute lockout period
3. Concurrent session limit enforced: max 2 active sessions per user
4. Session cookies explicitly set: httpOnly=true, secure=true, sameSite=lax

**Plans:** 1 plan

Plans:

- [x] 11-01-PLAN.md — Rate limiting, account lockout, session limits, and cookie hardening

---

#### Phase 12: Dashboard Data Pipeline & Schema Fixes

**Goal:** Build historical data pipeline for trend dashboard widgets, add engagementId to Observation model, and wire repeat findings to board report section.

**Depends on:** Phase 11

**Requirements:** (tech debt closure — DASH-03, DASH-05, RPT-05 hardening)

**Gap Closure:** Phase 8 tech debt (repeat findings), Phase 9 tech debt (trend widgets, engagementId)

**Success Criteria** (what must be TRUE):

1. Trend widgets (high-critical-trend, severity-trend, compliance-trend) render real historical data
2. Historical data snapshots captured via scheduled job (daily or weekly)
3. Observation model has engagementId field — getMyEngagementProgress returns real counts
4. Board report repeat findings section renders actual repeat observation data

**Plans:** 2 plans

Plans:

- [x] 12-01-PLAN.md — Schema: DashboardSnapshot model + engagementId/repeatOfId on Observation + engagement progress query
- [x] 12-02-PLAN.md — Snapshot job + trend queries from DashboardSnapshot + repeat findings board report wiring

---

#### Phase 13: Onboarding Persistence & Excel Upload

**Goal:** Wire server-side onboarding save to PostgreSQL and build Excel template upload for org structure — closing ONBD-03 (partial → satisfied).

**Depends on:** Phase 12

**Requirements:** ONBD-03 (completing partial → satisfied), ONBD-06 (server-side persistence)

**Gap Closure:** Phase 10 tech debt (server-side save, Excel upload)

**Success Criteria** (what must be TRUE):

1. Onboarding wizard progress saves to PostgreSQL OnboardingProgress table via server action
2. User can resume onboarding from server-side state (not just localStorage)
3. Admin can download Excel template for org structure
4. Admin can upload filled Excel template and system parses branches/departments/units

**Plans:** 2 plans

Plans:

- [x] 13-01-PLAN.md — Server-side onboarding persistence (Zustand saveToServer/loadFromServer, auto-save on step advance, Save & Exit to PostgreSQL)
- [ ] 13-02-PLAN.md — Excel org structure upload (template download, drag-and-drop upload, multi-layer validation, parsed data populates Step 4)

---

#### Phase 14: Verification & Production Readiness

**Goal:** Create VERIFICATION.md for phases 6-10, execute pending E2E tests, and confirm AWS SES domain verification — formalizing all phase completions.

**Depends on:** Phase 13

**Requirements:** (quality assurance — no new features)

**Gap Closure:** Missing verification for phases 6-10, pending E2E tests

**Success Criteria** (what must be TRUE):

1. VERIFICATION.md exists for phases 6, 7, 8, 9, and 10
2. Phase 6 E2E browser tests executed (9 manual test cases from 06-07)
3. Phase 7 permission guard test completed
4. AWS SES domain verified and first test email sent successfully
5. Re-audit passes with 59/59 requirements satisfied and 0 HIGH tech debt

Plans:

- [ ] 14-01: TBD (to be planned)

---

## Progress

**Execution Order:**
Phases execute in numeric order: 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14

| Phase                           | Milestone | Plans Complete | Status   | Completed  |
| ------------------------------- | --------- | -------------- | -------- | ---------- |
| 1. Project Setup & Demo Data    | v1.0      | 4/4            | Complete | 2026-02-07 |
| 2. Core Screens                 | v1.0      | 6/6            | Complete | 2026-02-08 |
| 3. Finding Management & Reports | v1.0      | 5/5            | Complete | 2026-02-08 |
| 4. Polish & Deploy              | v1.0      | 8/8            | Complete | 2026-02-08 |
| 5. Foundation & Migration       | v2.0      | 6/6            | Complete | 2026-02-09 |
| 6. Observation Lifecycle        | v2.0      | 7/7            | Complete | 2026-02-09 |
| 7. Auditee Portal & Evidence    | v2.0      | 8/8            | Complete | 2026-02-09 |
| 8. Notifications & Reports      | v2.0      | 6/6            | Complete | 2026-02-09 |
| 9. Dashboards                   | v2.0      | 5/5            | Complete | 2026-02-09 |
| 10. Onboarding & Compliance     | v2.0      | 8/8            | Complete | 2026-02-10 |
| 11. Auth Security Hardening     | v2.0 fix  | 1/1            | Complete | 2026-02-10 |
| 12. Dashboard Data Pipeline     | v2.0 fix  | 2/2            | Complete | 2026-02-10 |
| 13. Onboarding Persistence      | v2.0 fix  | 0/0            | Planned  | —          |
| 14. Verification & Prod Ready   | v2.0 fix  | 0/0            | Planned  | —          |

---

_Roadmap created: February 7, 2026_
_Updated: February 10, 2026 — Added gap closure phases 11-14 from v2.0 milestone audit_
