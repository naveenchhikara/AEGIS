# Requirements: AEGIS v2.0 Working Core MVP

**Defined:** 2026-02-08
**Core Value:** Individual audit observations flow upward through a structured lifecycle to form the complete risk and compliance picture — from a single branch finding to the board report.

## v2.0 Requirements

Requirements for v2.0 Working Core MVP. Each maps to roadmap phases.

### Foundation

- [ ] **FNDN-01**: System provisions isolated tenant with PostgreSQL Row-Level Security on signup
- [ ] **FNDN-02**: User can sign up with email and password via Better Auth
- [ ] **FNDN-03**: User session persists across browser refresh with secure cookie
- [ ] **FNDN-04**: Admin can assign roles (Auditor, Audit Manager, CAE, CCO, CEO) to users
- [ ] **FNDN-05**: User sees only sidebar items and data permitted by their role
- [ ] **FNDN-06**: Every data-modifying action is recorded in append-only audit log
- [ ] **FNDN-07**: Audit log entries cannot be modified or deleted by any user including admins
- [ ] **FNDN-08**: CAE can view and search audit trail with filters (entity, user, date, action)

### Observation Lifecycle

- [ ] **OBS-01**: Auditor can create observation with condition, criteria, cause, effect, recommendation
- [ ] **OBS-02**: Observation follows 7-state lifecycle: Draft → Submitted → Reviewed → Issued → Response → Compliance → Closed
- [ ] **OBS-03**: Each state transition records who, when, and comment in immutable timeline
- [ ] **OBS-04**: Audit Manager reviews and approves/returns observations before issuing to auditee
- [ ] **OBS-05**: Audit Manager can close Low/Medium severity observations
- [ ] **OBS-06**: CAE reviews and closes High/Critical severity observations
- [ ] **OBS-07**: Observation dropped during fieldwork retains "Resolved during fieldwork" status with rationale
- [ ] **OBS-08**: User can tag observation across multiple dimensions (risk category, RBI requirement, audit area, severity, branch)
- [ ] **OBS-09**: System detects potential repeat findings by matching branch + audit area + risk category
- [ ] **OBS-10**: Repeat finding severity auto-escalates (2nd occurrence +1 level, 3rd occurrence = Critical)
- [ ] **OBS-11**: Auditor can confirm or dismiss repeat finding suggestion

### Auditee Portal

- [ ] **AUD-01**: Auditee sees only observations assigned to their branch/department
- [ ] **AUD-02**: Auditee can submit clarification/response with text explanation
- [ ] **AUD-03**: Auditee can upload evidence documents (PDF, JPEG, PNG, XLSX, DOCX, max 10MB)
- [ ] **AUD-04**: Auditee responses are timestamped and immutable once submitted
- [ ] **AUD-05**: Auditee can submit compliance action with supporting evidence
- [ ] **AUD-06**: Auditee sees deadline countdown for each pending item
- [ ] **AUD-07**: Overdue items highlighted visually in auditee's list

### Dashboards

- [ ] **DASH-01**: Auditor dashboard shows assigned observations, current engagement progress, pending responses
- [ ] **DASH-02**: Audit Manager dashboard shows team workload, finding aging, audit plan progress, pending reviews
- [ ] **DASH-03**: CAE dashboard shows audit coverage, high/critical trends, compliance posture, board report readiness
- [ ] **DASH-04**: CCO dashboard shows compliance registry status, regulatory calendar, compliance task progress
- [ ] **DASH-05**: CEO dashboard shows executive summary with health score, risk indicators, KPIs (read-only)
- [ ] **DASH-06**: All dashboards derive from real-time observation data aggregation

### Notifications

- [ ] **NOTF-01**: Auditee receives email when new observation is assigned
- [ ] **NOTF-02**: Auditor/Manager receives email when auditee submits response
- [ ] **NOTF-03**: Auditee receives deadline reminder emails (7d, 3d, 1d before due)
- [ ] **NOTF-04**: Auditee + supervisor receive escalation email when observation is overdue
- [ ] **NOTF-05**: CAE/CCO receive weekly digest email with audit summary
- [ ] **NOTF-06**: Bulk operations batch notifications into digest (no 20 individual emails)

### Reports

- [ ] **RPT-01**: CAE can generate PDF board report for selected reporting period
- [ ] **RPT-02**: Board report includes 5 sections: executive summary, audit coverage, key findings, compliance scorecard, recommendations
- [ ] **RPT-03**: CAE can add executive commentary before PDF generation
- [ ] **RPT-04**: Report includes bank logo, confidentiality notice, page numbers, embedded charts
- [ ] **RPT-05**: Board report includes repeat findings summary section

### Exports

- [ ] **EXP-01**: User can export findings list as formatted XLSX with headers and filters
- [ ] **EXP-02**: User can export compliance status as formatted XLSX
- [ ] **EXP-03**: User can export audit plan progress as formatted XLSX
- [ ] **EXP-04**: Exports respect user role permissions (auditor cannot export all-bank data)
- [ ] **EXP-05**: Exported XLSX includes bank name, date, and "Confidential" header

### Evidence

- [ ] **EVID-01**: User can upload evidence files via drag-and-drop with progress indicator
- [ ] **EVID-02**: Files stored in AWS S3 Mumbai with tenant-scoped paths and SSE-S3 encryption
- [ ] **EVID-03**: File type validation enforced client-side and server-side (no executables)
- [ ] **EVID-04**: Evidence appears in observation timeline with upload timestamp and uploader
- [ ] **EVID-05**: Authorized users can download evidence files

### Onboarding

- [ ] **ONBD-01**: New bank completes 5-step wizard: registration → tier selection → RBI directions → org structure → user invites
- [ ] **ONBD-02**: System auto-selects applicable RBI Master Directions based on UCB tier
- [ ] **ONBD-03**: Admin can upload org structure via Excel template or enter manually
- [ ] **ONBD-04**: Admin can invite users with role assignment via email
- [ ] **ONBD-05**: Onboarding seeds compliance registry with selected RBI requirements
- [ ] **ONBD-06**: Admin can save onboarding progress and return later

### Compliance Content

- [ ] **CMPL-01**: System includes pre-built checklists for 10 most common RBI Master Directions
- [ ] **CMPL-02**: Each requirement links to source RBI circular reference
- [ ] **CMPL-03**: Admin can mark requirements as not-applicable with documented reason
- [ ] **CMPL-04**: Admin can add custom compliance requirements

## Future Requirements

Deferred to post-MVP. Tracked but not in current roadmap.

### DAKSH Integration

- **DAKSH-01**: Map audit findings and compliance data to DAKSH assessment categories
- **DAKSH-02**: Export data in DAKSH upload format (structured Excel)
- **DAKSH-03**: Highlight gaps in DAKSH category coverage

### Advanced Language Support

- **LANG-01**: Observation text fields accept Devanagari/Gujarati script input
- **LANG-02**: Board report generated in bilingual format (English + regional language)
- **LANG-03**: Search works across scripts

### Guided Compliance Workflow

- **GCOMP-01**: Allow one user to hold multiple roles for small teams
- **GCOMP-02**: In-app guided tours for first-time users
- **GCOMP-03**: Contextual help links for banking-specific fields

### Security Hardening

- **SEC-01**: TOTP/MFA authentication (required before Pilot B)
- **SEC-02**: Rate limiting on auth endpoints
- **SEC-03**: Session timeout and forced re-authentication

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature                                     | Reason                                                                      |
| ------------------------------------------- | --------------------------------------------------------------------------- |
| Generic configurable workflow engine        | UCB audit lifecycle is standardized by RBI; hardcode the state machine      |
| Real-time chat / discussion threads         | Undermines structured observation lifecycle; use formal responses instead   |
| Mobile native app                           | Responsive web sufficient; Tier III/IV UCBs use desktop at branch offices   |
| CBS integration (Finacle/Flexcube)          | Requires CBS vendor cooperation; defer to post-pilot                        |
| AI-powered risk scoring                     | Requires large training datasets; UCB data is too small; rule-based instead |
| On-premise deployment                       | SaaS-only business model; data localization via AWS Mumbai                  |
| Document versioning / collaborative editing | CAE generates point-in-time PDF; no real-time collaboration needed          |
| Custom report builder                       | RBI RBIA format is standardized; pre-built templates sufficient             |
| Offline mode / PWA                          | UCB offices have internet; optimize for slow connections instead            |
| DAKSH API integration                       | Start with formatted export for manual upload                               |

## Traceability

Which phases cover which requirements. Updated after roadmap creation.

| Requirement | Phase    | Status  |
| ----------- | -------- | ------- |
| FNDN-01     | Phase 5  | Pending |
| FNDN-02     | Phase 5  | Pending |
| FNDN-03     | Phase 5  | Pending |
| FNDN-04     | Phase 5  | Pending |
| FNDN-05     | Phase 5  | Pending |
| FNDN-06     | Phase 5  | Pending |
| FNDN-07     | Phase 5  | Pending |
| FNDN-08     | Phase 5  | Pending |
| OBS-01      | Phase 6  | Pending |
| OBS-02      | Phase 6  | Pending |
| OBS-03      | Phase 6  | Pending |
| OBS-04      | Phase 6  | Pending |
| OBS-05      | Phase 6  | Pending |
| OBS-06      | Phase 6  | Pending |
| OBS-07      | Phase 6  | Pending |
| OBS-08      | Phase 6  | Pending |
| OBS-09      | Phase 6  | Pending |
| OBS-10      | Phase 6  | Pending |
| OBS-11      | Phase 6  | Pending |
| AUD-01      | Phase 7  | Pending |
| AUD-02      | Phase 7  | Pending |
| AUD-03      | Phase 7  | Pending |
| AUD-04      | Phase 7  | Pending |
| AUD-05      | Phase 7  | Pending |
| AUD-06      | Phase 7  | Pending |
| AUD-07      | Phase 7  | Pending |
| EVID-01     | Phase 7  | Pending |
| EVID-02     | Phase 7  | Pending |
| EVID-03     | Phase 7  | Pending |
| EVID-04     | Phase 7  | Pending |
| EVID-05     | Phase 7  | Pending |
| NOTF-01     | Phase 8  | Pending |
| NOTF-02     | Phase 8  | Pending |
| NOTF-03     | Phase 8  | Pending |
| NOTF-04     | Phase 8  | Pending |
| NOTF-05     | Phase 8  | Pending |
| NOTF-06     | Phase 8  | Pending |
| RPT-01      | Phase 8  | Pending |
| RPT-02      | Phase 8  | Pending |
| RPT-03      | Phase 8  | Pending |
| RPT-04      | Phase 8  | Pending |
| RPT-05      | Phase 8  | Pending |
| EXP-01      | Phase 8  | Pending |
| EXP-02      | Phase 8  | Pending |
| EXP-03      | Phase 8  | Pending |
| EXP-04      | Phase 8  | Pending |
| EXP-05      | Phase 8  | Pending |
| DASH-01     | Phase 9  | Pending |
| DASH-02     | Phase 9  | Pending |
| DASH-03     | Phase 9  | Pending |
| DASH-04     | Phase 9  | Pending |
| DASH-05     | Phase 9  | Pending |
| DASH-06     | Phase 9  | Pending |
| ONBD-01     | Phase 10 | Pending |
| ONBD-02     | Phase 10 | Pending |
| ONBD-03     | Phase 10 | Pending |
| ONBD-04     | Phase 10 | Pending |
| ONBD-05     | Phase 10 | Pending |
| ONBD-06     | Phase 10 | Pending |
| CMPL-01     | Phase 10 | Pending |
| CMPL-02     | Phase 10 | Pending |
| CMPL-03     | Phase 10 | Pending |
| CMPL-04     | Phase 10 | Pending |

**Coverage:**

- v2.0 requirements: 59 total
- Mapped to phases: 59
- Unmapped: 0

**Phase distribution:**

- Phase 5 (Foundation & Migration): 8 requirements
- Phase 6 (Observation Lifecycle): 11 requirements
- Phase 7 (Auditee Portal & Evidence): 12 requirements
- Phase 8 (Notifications & Reports): 16 requirements
- Phase 9 (Dashboards): 6 requirements
- Phase 10 (Onboarding & Compliance): 10 requirements

**Coverage:** 100% ✓

---

_Requirements defined: 2026-02-08_
_Last updated: 2026-02-08 after roadmap creation with phase mappings_
