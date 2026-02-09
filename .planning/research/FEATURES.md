# Feature Landscape

**Domain:** Internal Audit Management SaaS for Urban Cooperative Banks (India)
**Researched:** 2026-02-08
**Overall Confidence:** MEDIUM-HIGH

---

## Table Stakes

Features that UCB audit teams expect from any digital audit management tool. Missing any of these means the product feels incomplete or untrustworthy compared to even spreadsheet workflows they currently use.

### TS-01: Observation/Finding Lifecycle Workflow

| Attribute        | Detail                                                                                                                                                                                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why Expected** | This is the core value proposition. Every audit management tool (Audit360, LaserGRC, TeamMate) implements a finding lifecycle. UCB auditors currently track this manually in Excel. If AEGIS cannot track an observation from draft to closure, it has no reason to exist. |
| **Complexity**   | HIGH                                                                                                                                                                                                                                                                       |
| **Confidence**   | HIGH (verified via PROJECT.md, Audit360 docs, RBI RBIA framework)                                                                                                                                                                                                          |

**Expected Behavior:**

The observation lifecycle for UCB internal audit follows this state machine:

```
Draft (Auditor creates)
  |
  v
Submitted (Auditor submits to Audit Manager for review)
  |
  +--> Returned (Manager sends back for revision) --> Draft
  |
  v
Reviewed / Accepted (Manager approves observation)
  |
  v
Issued to Auditee (Sent to Branch Manager / Department Head)
  |
  v
Auditee Response Received (BM/Dept Head submits clarification + evidence)
  |
  +--> Dropped / Resolved During Fieldwork (if auditee explanation accepted)
  |        [stays on record with "Resolved during fieldwork" status]
  |
  v
Final Report (Observation included in final audit report)
  |
  v
Compliance Submitted (Auditee submits compliance action + evidence)
  |
  v
Under Review (Reviewer checks compliance)
  |    - Low/Medium severity: Audit Manager reviews
  |    - High/Critical severity: CAE reviews
  |
  +--> Sent Back (compliance insufficient) --> Compliance Submitted
  |
  v
Closed (Reviewer accepts compliance; observation resolved)
```

**Key behaviors:**

- Each status transition records WHO, WHEN, and WHAT (comment/evidence) in an immutable timeline
- "Dropped" observations are NOT deleted -- they remain visible with status "Resolved during fieldwork" and a rationale
- Deadline tracking at each stage: auditee has N days to respond, N days to submit compliance
- Overdue triggers escalation notifications (email to auditee + their supervisor)
- The observation form captures: condition (what was found), criteria (what should be), cause (root cause), effect (risk/impact), recommendation (what to do)

**Dependencies:** Auth system (roles), email notifications, audit trail

**What v1.0 has:** Finding statuses `draft | submitted | reviewed | responded | closed` -- simplified. v2.0 needs the full state machine above with proper transitions, guards, and timeline events.

---

### TS-02: Role-Based Access Control (5 Roles)

| Attribute        | Detail                                                                                                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why Expected** | Banking audit has strict separation of duties. RBI RBIA framework mandates that audit functions have proper authorization levels. Audit360 and LaserGRC both implement role-based workflows. |
| **Complexity**   | MEDIUM                                                                                                                                                                                       |
| **Confidence**   | HIGH (RBI framework, competitor analysis, PROJECT.md role definitions)                                                                                                                       |

**Expected Roles and Permissions:**

| Role                               | Can Create Observations | Can Review             | Can Close              | Dashboard View                                         | Other                                                    |
| ---------------------------------- | ----------------------- | ---------------------- | ---------------------- | ------------------------------------------------------ | -------------------------------------------------------- |
| **Auditor**                        | Yes                     | No                     | No                     | Assigned findings, audit progress                      | Record observations during fieldwork                     |
| **Audit Manager**                  | Yes                     | Low/Medium severity    | Low/Medium severity    | Team workload, finding aging, audit plan progress      | Assign audit teams, manage audit plans                   |
| **CAE (Chief Audit Executive)**    | No (oversight only)     | High/Critical severity | High/Critical severity | All audits, compliance posture, risk picture           | Final sign-off on audit reports, board report generation |
| **CCO (Chief Compliance Officer)** | No                      | Compliance items only  | Compliance items only  | Compliance registry status, regulatory calendar        | Manage compliance requirements, certifications           |
| **CEO**                            | No                      | No (read-only)         | No                     | Executive summary: health score, risk indicators, KPIs | Read-only aggregated view across all modules             |

**Key behaviors:**

- Role determines what sidebar items are visible
- Role determines which observations a user can see (auditors see assigned; managers see team; CAE/CEO see all)
- Severity-based review authority is the critical distinction: Manager closes low/medium, CAE closes high/critical
- Auditee is a special role (see TS-05) that only sees findings assigned to their branch/department

**Dependencies:** Auth system, PostgreSQL RLS, middleware

---

### TS-03: Role-Based Dashboards

| Attribute        | Detail                                                                                                                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why Expected** | Every audit management platform provides dashboards. PwC explicitly recommends audit committee dashboard reporting. The CEO should not see the same view as the auditor. UCB leaders need a "single glance" view. |
| **Complexity**   | MEDIUM                                                                                                                                                                                                            |
| **Confidence**   | HIGH (PwC guidelines, Audit360 features, MetricStream docs)                                                                                                                                                       |

**Expected Dashboard Views:**

**Auditor Dashboard:**

- My assigned observations (open, overdue, due this week)
- Current audit engagement progress
- Pending auditee responses
- Quick action: create new observation

**Audit Manager Dashboard:**

- Team workload distribution (observations per auditor)
- Finding aging analysis (how long observations stay open by severity)
- Audit plan progress (planned vs. completed vs. in-progress)
- Overdue observations requiring escalation
- Pending review items (observations awaiting manager review)

**CAE Dashboard:**

- All-up audit coverage (audited entities vs. audit universe)
- High/critical observation trends (quarter-over-quarter)
- Compliance posture summary
- Observations awaiting CAE review
- Board report readiness indicators
- Repeat finding count and trend

**CCO Dashboard:**

- Compliance registry status (compliant / partial / non-compliant / pending breakdown)
- Regulatory calendar with upcoming deadlines
- Compliance task assignments and progress
- RBI circular tracker (new circulars mapped to requirements)

**CEO Dashboard (already built in v1.0):**

- Compliance health score (0-100)
- Audit coverage donut
- Finding count cards (total, critical, open, overdue)
- Risk indicator panel
- Regulatory calendar
- DAKSH score if available

**Key behavior:** All dashboards derive from the SAME underlying observation data, aggregated differently per role. This is the "bottom-up observation architecture" described in PROJECT.md.

**Dependencies:** Observation lifecycle (TS-01), RBAC (TS-02)

**What v1.0 has:** CEO dashboard only, with hardcoded data. v2.0 needs all 5 role views with real aggregation queries.

---

### TS-04: Maker-Checker for Audit Findings

| Attribute        | Detail                                                                                                                                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why Expected** | RBI mandates maker-checker (4-eyes principle) for banking operations. Audit360 explicitly advertises "multi-level verification." Any banking software without maker-checker will fail regulatory scrutiny. |
| **Complexity**   | MEDIUM                                                                                                                                                                                                     |
| **Confidence**   | HIGH (RBI guidelines, Wikipedia maker-checker, Audit360 feature list)                                                                                                                                      |

**Expected Behavior:**

Maker-checker applies to these operations:

| Operation                     | Maker                    | Checker                                | Notes                                     |
| ----------------------------- | ------------------------ | -------------------------------------- | ----------------------------------------- |
| Create/edit observation       | Auditor                  | Audit Manager                          | Manager reviews before issuing to auditee |
| Close observation (Low/Med)   | Audit Manager            | -- (single-level for low risk)         | Manager has authority for low/medium      |
| Close observation (High/Crit) | Audit Manager recommends | CAE approves                           | Two-level for high risk                   |
| Release audit report          | CAE drafts/approves      | -- (CAE is final authority)            | CAE signs off on final report             |
| Compliance certification      | CCO certifies            | CEO acknowledges (read receipt)        | For regulatory submissions                |
| Board report generation       | CAE generates            | -- (informational, no approval needed) | Board does not log in                     |

**Implementation approach:**

- NOT a generic approval engine. Build specific state transitions for each operation.
- Each approval action records the approver, timestamp, and any comments in the audit trail
- Rejection sends the item back to the maker with reviewer comments
- Pending approvals appear on the checker's dashboard
- Email notification on submission and on approval/rejection

**Anti-pattern to avoid:** Do NOT build a generic "workflow engine" with configurable states. The audit observation lifecycle is domain-specific and should be hardcoded as a state machine. A generic engine adds complexity without value for the UCB market.

**Dependencies:** Observation lifecycle (TS-01), RBAC (TS-02), email notifications (TS-06)

---

### TS-05: Auditee Self-Service Portal

| Attribute        | Detail                                                                                                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why Expected** | Modern audit management (Audit360, LaserGRC) provides auditee-facing interfaces. Without this, auditors email findings to branch managers who respond via email, and the auditor re-enters data -- defeating the purpose of the tool. |
| **Complexity**   | MEDIUM                                                                                                                                                                                                                                |
| **Confidence**   | HIGH (Audit360 "auditee screens", LaserGRC collaboration, Wayne State University audit response guidelines)                                                                                                                           |

**Expected Behavior:**

The auditee (Branch Manager, Department Head) gets a simplified portal:

**What they see:**

- List of observations assigned to their branch/department
- Status of each observation (pending response, compliance due, closed)
- Deadline countdown for each pending item
- History of their previous responses

**What they can do:**

- View full observation details (condition, criteria, cause, effect, recommendation)
- Submit clarification/response with text explanation
- Upload evidence documents (scanned letters, system screenshots, corrective action proof)
- Submit compliance action (after implementing recommendation)
- View reviewer feedback if compliance was sent back

**What they CANNOT do:**

- See observations from other branches/departments
- Edit or delete their submitted responses
- See internal audit team discussions
- Access any admin or configuration features

**Key behaviors:**

- Responses are timestamped and immutable once submitted
- Each response requires at least a text explanation; evidence attachment is optional but encouraged
- Deadline reminders: 7 days before, 3 days before, 1 day before, overdue (all via email)
- Overdue items are highlighted in red on the auditee's list
- The auditee can see their response history but cannot modify past submissions

**UCB-specific consideration:** Branch managers at Tier III/IV UCBs may have limited computer literacy. The portal must be extremely simple -- no complex navigation, large clear buttons, minimal form fields, support for Indian languages.

**Dependencies:** Auth (TS-02), observation lifecycle (TS-01), email notifications (TS-06), evidence upload (TS-09)

---

### TS-06: Email Notification System

| Attribute        | Detail                                                                                                                                                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why Expected** | Audit workflows are time-sensitive. Without notifications, users must log in daily to check for new items -- which UCB staff will not do. Audit360 includes "automated email notifications." Every SaaS audit tool sends emails. |
| **Complexity**   | MEDIUM                                                                                                                                                                                                                           |
| **Confidence**   | HIGH (PROJECT.md specifies AWS SES, industry standard)                                                                                                                                                                           |

**Expected Notification Triggers:**

| Trigger                           | Recipient              | Urgency       | Template                                                                            |
| --------------------------------- | ---------------------- | ------------- | ----------------------------------------------------------------------------------- |
| New observation assigned          | Auditee                | Normal        | "Audit observation [ID] has been issued to [branch]. Please respond by [deadline]." |
| Auditee response submitted        | Auditor + Manager      | Normal        | "[Auditee] has responded to observation [ID]."                                      |
| Observation pending review        | Manager or CAE         | Normal        | "[N] observations are awaiting your review."                                        |
| Compliance submitted              | Reviewer (Manager/CAE) | Normal        | "Compliance submitted for observation [ID]. Please verify."                         |
| Deadline approaching (7d, 3d, 1d) | Auditee                | Warning       | "Observation [ID] response is due in [N] days."                                     |
| Deadline overdue                  | Auditee + Supervisor   | Urgent        | "Observation [ID] is [N] days overdue. Escalating to [supervisor]."                 |
| Observation closed                | Auditee + Auditor      | Informational | "Observation [ID] has been closed."                                                 |
| Observation sent back             | Auditee or Auditor     | Action needed | "Observation [ID] compliance was insufficient. Reviewer comment: [...]"             |
| Weekly digest                     | CAE, CCO               | Informational | "Weekly audit summary: [N] new, [N] closed, [N] overdue."                           |

**Key behaviors:**

- Use AWS SES (Mumbai region) for delivery reliability and data localization
- Emails are bilingual: English + user's preferred language
- All emails include a deep link to the relevant item in the platform
- Notification preferences: users can mute non-critical notifications but CANNOT mute deadline/overdue notifications
- Rate limiting: batch digest for bulk operations (e.g., issuing 20 observations does not send 20 separate emails to the same manager)

**Dependencies:** Auth system (user email, preferences), AWS SES infrastructure

---

### TS-07: PDF Board Report Generation

| Attribute        | Detail                                                                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why Expected** | UCB boards do NOT log into software. The CAE generates a PDF report for the Audit Committee of the Board (ACB) meeting. This is the single most important output of the entire system for the people who approve audit budgets. |
| **Complexity**   | MEDIUM                                                                                                                                                                                                                          |
| **Confidence**   | HIGH (PROJECT.md specifies React-PDF, domain context confirms board workflow)                                                                                                                                                   |

**Expected Behavior:**

**Report Sections (per RBI RBIA framework):**

1. Executive Summary -- key metrics, overall risk assessment, compliance health score
2. Audit Coverage -- planned vs. actual audits by type, coverage percentage
3. Key Findings -- high/critical observations with status, aging, and management response summary
4. Compliance Scorecard -- per-category compliance status, trend charts
5. Recommendations -- prioritized action items for board attention
6. Repeat Findings Summary -- observations that recurred from prior audit cycles
7. Appendices -- detailed observation list, regulatory calendar, team utilization

**Key behaviors:**

- CAE selects reporting period (quarter or custom date range)
- Report auto-populates from live observation and compliance data
- CAE can add/edit executive commentary before generation
- Output is a professional PDF suitable for printing and distribution
- Report includes bank logo, confidentiality notice, page numbers
- Charts embedded as static images in PDF (compliance trend, severity distribution)
- Bilingual option: English report with Hindi/Marathi/Gujarati labels

**UCB-specific consideration:** Board members are typically senior citizens with banking backgrounds. The report format should mirror traditional audit committee report formats they are accustomed to, not SaaS dashboards.

**Dependencies:** Observation lifecycle (TS-01), compliance registry, dashboards (TS-03)

**What v1.0 has:** Board report preview with 5 sections and print stylesheet (HTML). v2.0 needs React-PDF generation from live data with CAE commentary.

---

### TS-08: Excel/MIS Exports

| Attribute        | Detail                                                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Why Expected** | UCB audit teams live in Excel. They will need to extract data for ad-hoc analysis, RBI submissions, and internal presentations. Every competitor (Audit360, LaserGRC) offers Excel export. |
| **Complexity**   | LOW                                                                                                                                                                                        |
| **Confidence**   | HIGH (universal expectation, PROJECT.md specifies this)                                                                                                                                    |

**Expected Export Capabilities:**

| Export              | Contents                                                            | Format                  |
| ------------------- | ------------------------------------------------------------------- | ----------------------- |
| Findings list       | All observations with status, severity, dates, auditee, branch      | XLSX                    |
| Compliance status   | All RBI requirements with current status, evidence count, owner     | XLSX                    |
| Audit plan progress | All engagements with planned/actual dates, progress, findings count | XLSX                    |
| Observation detail  | Single observation with full timeline, responses, evidence list     | XLSX or PDF             |
| DAKSH data          | Formatted data matching DAKSH upload format                         | XLSX (specific columns) |
| Custom MIS          | Date-range filtered data with user-selected columns                 | XLSX                    |

**Key behaviors:**

- Export button on every list/table view
- Date range filter for exports
- Export respects user's role permissions (auditor cannot export all-bank data)
- XLSX format (not CSV) -- Indian banking prefers Excel with formatted headers
- Include bank name, export date, and "Confidential" watermark in header

**Dependencies:** Data layer (all modules), RBAC

---

### TS-09: Evidence File Upload and Management

| Attribute        | Detail                                                                                                                                                                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why Expected** | Audit evidence (scanned documents, system screenshots, corrective action proof) must be attached to observations. Without this, the platform cannot replace the physical audit file. Audit360's mobile app captures "video, photo, and audio evidences." |
| **Complexity**   | MEDIUM                                                                                                                                                                                                                                                   |
| **Confidence**   | HIGH (Audit360, AWS documentation, RBI RBIA framework requires evidence)                                                                                                                                                                                 |

**Expected Behavior:**

**Upload contexts:**

- Auditor attaches evidence when creating observation (supporting documents)
- Auditee attaches evidence when submitting response or compliance action
- CCO attaches evidence for compliance certification

**File handling:**

- Supported formats: PDF, JPEG, PNG, XLSX, DOCX (no executables)
- Max file size: 10 MB per file (UCB staff have limited bandwidth)
- Max files per observation: 20
- Storage: AWS S3 (Mumbai region, SSE-S3 encryption)
- Files are organized by tenant_id/observation_id/filename
- Files are immutable once uploaded -- no editing or replacing, only adding new versions
- Download available to authorized users (auditor, manager, CAE, assigned auditee)
- Thumbnail preview for images; icon display for documents

**Key behaviors:**

- Drag-and-drop upload with progress indicator
- File type validation client-side and server-side
- Virus/malware scan consideration (defer to post-MVP, note as future requirement)
- Evidence appears in observation timeline with upload timestamp and uploader name
- Evidence list on observation detail page with download links

**Dependencies:** AWS S3, auth system, observation lifecycle

---

### TS-10: Immutable Audit Trail

| Attribute        | Detail                                                                                                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why Expected** | Regulatory requirement. RBI expects that audit records cannot be tampered with. "Immutable audit trail" is called out explicitly in PROJECT.md. Banking compliance (SOC 2, RBI guidelines) requires tamper-proof records. |
| **Complexity**   | MEDIUM                                                                                                                                                                                                                    |
| **Confidence**   | HIGH (RBI guidelines, PROJECT.md, industry standard for banking SaaS)                                                                                                                                                     |

**Expected Behavior:**

**What gets logged:**

- Every observation status transition (who, when, from-state, to-state, comment)
- Every login/logout
- Every file upload/download
- Every data export
- Every role change or permission modification
- Every maker-checker approval/rejection
- Every compliance certification

**Implementation approach:**

- Append-only PostgreSQL table (`audit_log`)
- Database user for application has INSERT-only permission on this table (no UPDATE, no DELETE)
- Each log entry includes: timestamp, user_id, tenant_id, action_type, entity_type, entity_id, old_value, new_value, ip_address
- Optional: cryptographic hash chain (each entry includes hash of previous entry) for tamper detection
- Audit log is viewable by CAE and CEO (read-only)
- Audit log is searchable by entity, user, date range, action type

**Key behaviors:**

- Log entries cannot be modified or deleted by ANY user, including admins
- Retention: minimum 8 years (RBI record retention requirement)
- Audit log viewer in the UI for CAE with filters
- Export audit log to Excel for external auditor review

**Anti-pattern to avoid:** Do NOT use soft deletes on audit log entries. Do NOT grant UPDATE or DELETE on the audit_log table to any application database user.

**Dependencies:** PostgreSQL schema, all other features (they write to audit log)

---

### TS-11: Multi-Tenant SaaS Onboarding

| Attribute        | Detail                                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Why Expected** | AEGIS is SaaS serving multiple UCBs. Each UCB needs its own isolated data space. AWS Well-Architected SaaS Lens explicitly recommends automated tenant onboarding. |
| **Complexity**   | HIGH                                                                                                                                                               |
| **Confidence**   | HIGH (PROJECT.md, AWS SaaS Lens, bootstrap execution plan)                                                                                                         |

**Expected Behavior:**

**Onboarding wizard flow:**

```
Step 1: Bank Registration
  - Bank name, RBI license number, tier (I/II/III/IV)
  - Primary contact (CAE or CEO) email, phone
  - Auto-validate RBI license format

Step 2: Tier-Based Configuration
  - System detects UCB tier from registration
  - Auto-selects applicable RBI Master Directions based on tier
  - Shows list of pre-built compliance checklists
  - Admin can select-applicable and add-custom requirements

Step 3: Organization Structure
  - Option A: Upload Excel template (branches, departments, staff)
  - Option B: Manual entry via forms
  - Branch details: name, code, manager, location
  - Department details: name, head, code

Step 4: User Setup
  - Create initial admin user (CAE)
  - Admin can invite other users with role assignment
  - Email invitations sent via SES

Step 5: Confirmation
  - Summary of configured tenant
  - "Your bank is ready" screen with quick-start guide links
```

**Key behaviors:**

- Each tenant gets Row-Level Security (RLS) isolation -- PostgreSQL policies on every table
- Tenant data is logically isolated (shared database, shared schema, tenant_id column)
- Pre-built RBI compliance checklists are copied into the tenant's data (not referenced) so they can customize
- Onboarding creates seed data: compliance requirements, default audit types, standard risk categories
- Admin can complete onboarding incrementally (save progress, return later)

**UCB-specific consideration:** Tier III/IV UCBs may not have a CAE. The "admin" role should be flexible -- could be the CEO or a senior manager designated for audit oversight. The wizard should not assume organizational hierarchy that smaller UCBs lack.

**Dependencies:** PostgreSQL multi-tenancy, auth system, RBI compliance data, AWS SES

---

## Differentiators

Features that set AEGIS apart from spreadsheets and generic audit tools. Not expected, but valued -- especially in the UCB market where domain expertise is the moat.

### DIFF-01: Pre-Built RBI Compliance Checklists

| Attribute             | Detail                                                                                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Value Proposition** | No competitor provides UCB-specific RBI compliance checklists out of the box. TeamMate and AuditBoard serve global markets. Audit360 serves larger banks. AEGIS knows exactly which Master Directions apply to which UCB tier. |
| **Complexity**        | MEDIUM (data curation, not code complexity)                                                                                                                                                                                    |
| **Confidence**        | HIGH (this is the project's stated moat)                                                                                                                                                                                       |

**Expected Behavior:**

- During onboarding, system auto-populates compliance requirements based on UCB tier
- Requirements sourced from RBI Master Directions: KYC, CRAR, SLR/CRR, cyber security, IS audit, RBIA
- Each requirement links to the source circular reference
- UCB admin can: mark requirements as not-applicable (with reason), add custom requirements
- When RBI issues new circulars, AEGIS team updates the master checklist; new requirements propagate to all tenants as "pending review"

**This is a differentiator because:** A Tier III UCB CAE does not need to manually identify which of 200+ RBI directions apply to their bank. The system tells them, and they only need to review and customize.

---

### DIFF-02: Repeat Finding Detection and Auto-Escalation

| Attribute             | Detail                                                                                                                                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Value Proposition** | Repeat findings are a red flag for RBI supervisors. If the same observation appears in consecutive audit cycles, it indicates management inaction. Auto-detecting repeats and escalating severity saves the CAE from manual tracking and demonstrates governance rigor to RBI. |
| **Complexity**        | MEDIUM                                                                                                                                                                                                                                                                         |
| **Confidence**        | MEDIUM (domain logic is clear from PROJECT.md; implementation specifics need validation)                                                                                                                                                                                       |

**Expected Behavior:**

**Detection:**

- When creating a new observation, system checks for similar past observations:
  - Same branch + same audit area + same risk category = potential repeat
  - Same RBI requirement reference = potential repeat
  - System suggests "This may be a repeat of [FND-XXX] from [audit cycle]"
- Auditor confirms or dismisses the repeat suggestion
- If confirmed, new observation is tagged as "Repeat" with reference to original

**Auto-escalation rules:**

- First occurrence: original severity stands
- Second occurrence (repeat): severity auto-escalated by one level (Low->Medium, Medium->High, High->Critical)
- Third occurrence: severity = Critical regardless of original assessment
- Escalation is automatic but auditor can override with documented justification

**Reporting:**

- Board report includes a dedicated "Repeat Findings" section
- Dashboard widget shows repeat finding count and trend
- Repeat findings are visually flagged in all observation lists (badge or icon)

**Why this matters for UCBs:** RBI RBIA framework specifically calls out that "repeat criticisms have escalated in importance because of insufficient attention or inaction." Demonstrating automated repeat tracking to RBI inspectors during DAKSH assessment is a significant advantage.

**Dependencies:** Observation lifecycle (TS-01), observation tagging/categorization

---

### DIFF-03: Multi-Dimensional Observation Tagging

| Attribute             | Detail                                                                                                                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value Proposition** | Most spreadsheet-based audit tracking has flat categorization. AEGIS allows tagging each observation across multiple dimensions, enabling rich cross-cutting analysis that manual methods cannot achieve. |
| **Complexity**        | LOW-MEDIUM                                                                                                                                                                                                |
| **Confidence**        | MEDIUM (domain logic clear, implementation standard)                                                                                                                                                      |

**Expected Tagging Dimensions:**

| Dimension       | Values                                                                | Purpose                          |
| --------------- | --------------------------------------------------------------------- | -------------------------------- |
| Risk Category   | Credit, Market, Operational, Liquidity, IT, Compliance, Governance    | Risk-based aggregation for board |
| RBI Requirement | Link to specific compliance requirement                               | Compliance gap analysis          |
| Audit Area      | KYC/AML, Advances, Deposits, Treasury, IT Systems, HR, Accounts       | Functional analysis              |
| Severity        | Critical, High, Medium, Low                                           | Priority management              |
| Branch/Unit     | Any branch or department                                              | Location-based analysis          |
| Audit Type      | Branch Audit, IS Audit, Credit Audit, Compliance Audit, Revenue Audit | Audit program analysis           |

**Key behavior:** Every dashboard widget and export can filter/group by any combination of these dimensions. The CEO asks "show me all high-severity credit risk findings across all branches this quarter" and gets the answer in one click.

**Dependencies:** Observation data model, dashboard aggregation queries

---

### DIFF-04: DAKSH Score Visualization and Export

| Attribute             | Detail                                                                                                                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value Proposition** | DAKSH is RBI's supervisory assessment tool for UCBs. No competitor provides DAKSH-aligned reporting. Showing the CAE how their audit data maps to DAKSH categories saves significant manual preparation. |
| **Complexity**        | MEDIUM                                                                                                                                                                                                   |
| **Confidence**        | LOW-MEDIUM (DAKSH format specifics need validation with actual RBI documents)                                                                                                                            |

**Expected Behavior:**

- Map audit findings and compliance data to DAKSH assessment categories
- Show estimated DAKSH scores based on current data
- Export data in the format required for DAKSH upload (structured Excel)
- Highlight gaps: "You have no observations covering [DAKSH category] -- consider adding to next audit plan"

**Note:** DAKSH API integration is explicitly out of scope. Start with formatted export for manual upload.

**Dependencies:** Observation tagging (DIFF-03), compliance registry, Excel export (TS-08)

---

### DIFF-05: Guided Compliance Workflow for Small Teams

| Attribute             | Detail                                                                                                                                                                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value Proposition** | Tier III/IV UCBs have 5-8 person audit teams. Enterprise audit tools (TeamMate, AuditBoard) assume 20+ person departments with specialized roles. AEGIS streamlines workflows for small teams where one person may wear multiple hats. |
| **Complexity**        | LOW                                                                                                                                                                                                                                    |
| **Confidence**        | HIGH (UCB market understanding from PROJECT.md)                                                                                                                                                                                        |

**Expected Behavior:**

- Allow one user to hold multiple roles (e.g., same person is Auditor + Audit Manager in a 3-person team)
- Simplify maker-checker when team is too small: configurable to allow single-person sign-off for low-severity items
- In-app guided tours for first-time users (tooltip walkthroughs)
- Contextual help: "What is CRAR?" links next to banking-specific fields
- Templates for common observation types (KYC deficiency, credit documentation gap, etc.)

**Dependencies:** RBAC (TS-02), onboarding (TS-11)

---

### DIFF-06: Indian Language Support for Audit Content

| Attribute             | Detail                                                                                                                                                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value Proposition** | v1.0 has UI label translation. v2.0 differentiator is allowing audit observations themselves to be written in Hindi/Marathi/Gujarati, with bilingual board reports. No competitor offers this for the UCB market. |
| **Complexity**        | LOW (UI already supports i18n; this extends to user-generated content)                                                                                                                                            |
| **Confidence**        | MEDIUM (feasibility is clear; user demand needs validation)                                                                                                                                                       |

**Expected Behavior:**

- Observation text fields accept Devanagari/Gujarati script input
- Search works across scripts (searching in English finds Hindi-titled observations if they have English tags)
- Board report can be generated in bilingual format (English + regional language)
- Excel exports include proper Unicode handling for Indian scripts

**Dependencies:** Existing i18n system (next-intl), font support (Noto Sans already configured)

---

## Anti-Features

Features to deliberately NOT build in v2.0. These are common requests or competitor features that would add complexity without proportional value for the UCB market at this stage.

### AF-01: Generic Configurable Workflow Engine

| Why Avoid                                                                                                                                                                                                                                                                                                                                                      | What to Do Instead                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UCB audit observation lifecycle is well-defined and standardized by RBI. A configurable workflow engine (like BPMN or drag-and-drop workflow builder) adds massive complexity and confuses small UCB teams who just need "the standard process." Enterprise tools like TeamMate offer this because they serve diverse industries -- AEGIS serves ONE vertical. | Hardcode the observation state machine. Make the states, transitions, and guards explicit in code. If a UCB asks "can we add a state?" the answer is "tell us about your process and we will evaluate if it should be standard." |

### AF-02: Real-Time Chat or Discussion Threads

| Why Avoid                                                                                                                                                                                                                                                                      | What to Do Instead                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adding Slack-like chat between auditor and auditee creates an informal communication channel that undermines the structured observation lifecycle. Audit records must be formal and traceable. Chat messages are ambiguous about whether they constitute "official responses." | Use the structured response mechanism in the observation lifecycle. Auditee submits formal response; auditor submits formal review. Comments are attached to status transitions, not free-floating. |

### AF-03: Mobile Native App

| Why Avoid                                                                                                                                                                                                                                                     | What to Do Instead                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tier III/IV UCB staff use desktop computers at branch offices. Mobile audit (field audits with photo evidence) is an enterprise feature. Building a native app doubles development effort for a small team. PROJECT.md explicitly lists this as out of scope. | Responsive web design (already in v1.0). If mobile field audit becomes a demand, consider PWA with camera access as a future differentiator, not a v2.0 feature. |

### AF-04: CBS Integration (Finacle/Flexcube)

| Why Avoid                                                                                                                                                                                                                                                                                  | What to Do Instead                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Core Banking System integration requires cooperation from CBS vendors (Infosys, Oracle) who have no incentive to support a startup SaaS platform. It also requires each UCB to provide API access to their CBS, which most Tier III/IV banks cannot do. PROJECT.md explicitly defers this. | Manual data entry for audit observations. Excel template upload for bulk data. AEGIS is an audit management overlay, not a CBS integration platform. CBS integration is a Phase 2+ feature after pilot validation. |

### AF-05: AI-Powered Risk Scoring or Predictive Analytics

| Why Avoid                                                                                                                                                                                                                                                           | What to Do Instead                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Marketing noise. AI/ML features require large training datasets and domain-specific models. UCB audit data is small (dozens of observations per year, not millions). AI features would be theater at this stage and distract from building reliable core workflows. | Rule-based severity scoring. Manual risk assessment by experienced auditors. The domain expertise is in the auditors' heads, not in an AI model. Revisit when AEGIS has data from 50+ tenants. |

### AF-06: TOTP/MFA Authentication

| Why Avoid                                                                                                                                                                                           | What to Do Instead                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PROJECT.md explicitly says "Email/password first; MFA added before Pilot B." TOTP adds complexity (backup codes, device management, recovery flows) that blocks the critical path to a working MVP. | Email/password authentication for v2.0. Add TOTP/MFA as a hardening feature before onboarding real client data (Pilot B stage). This is explicitly called out in the constraints. |

### AF-07: On-Premise Deployment Option

| Why Avoid                                                                                                                                                                                      | What to Do Instead                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UCBs that demand on-premise deployment need dedicated infrastructure management that a 2-3 person team cannot support. SaaS-only is the business model. PROJECT.md lists this as out of scope. | SaaS deployment on AWS Mumbai (data localization satisfied). Address on-premise concerns with security documentation, DPA, and Vendor Risk Pack. Consider managed private cloud as a premium tier later. |

### AF-08: Document Versioning / Collaborative Editing

| Why Avoid                                                                                                                                                                                                                | What to Do Instead                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Google Docs-style collaborative editing of audit reports adds massive complexity (operational transforms or CRDTs). Not needed for the UCB workflow where the CAE owns the report and generates it as a one-time action. | CAE adds executive commentary to auto-populated report. PDF is generated as a point-in-time snapshot. If edits are needed, regenerate. No real-time collaboration on documents. |

### AF-09: Custom Report Builder

| Why Avoid                                                                                                                                                                                                                | What to Do Instead                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A drag-and-drop report builder is an enterprise feature. UCB board reports follow a standard format mandated by RBI RBIA guidelines. Custom reports add development cost without value for standardized reporting needs. | Pre-built report templates: Board Report (quarterly), Compliance Status Report, Audit Plan Progress, Finding Summary. Excel export for ad-hoc analysis. If a specific MIS format is needed, build it as a dedicated template. |

### AF-10: Offline Mode / PWA

| Why Avoid                                                                                                                                                                                                                                             | What to Do Instead                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Offline capability requires service workers, local data sync, conflict resolution -- all significant complexity. UCB branch offices have internet connectivity (even if slow). Field audits that need offline are an edge case for Tier III/IV banks. | Responsive web app works on any device with a browser. Optimize for slow connections (small payloads, lazy loading) rather than building offline support. |

---

## Feature Dependencies

```
Authentication + Multi-Tenancy (foundation)
  |
  +-- Onboarding Wizard (TS-11)
  |     |
  |     +-- Pre-built RBI Checklists (DIFF-01)
  |     +-- Org Structure Setup
  |
  +-- RBAC (TS-02)
  |     |
  |     +-- Observation Lifecycle (TS-01)  <-- CORE, everything depends on this
  |     |     |
  |     |     +-- Maker-Checker (TS-04)
  |     |     +-- Auditee Portal (TS-05)
  |     |     +-- Repeat Finding Detection (DIFF-02)
  |     |     +-- Multi-Dimensional Tagging (DIFF-03)
  |     |     +-- Evidence Upload (TS-09)
  |     |
  |     +-- Role-Based Dashboards (TS-03)
  |     |     |
  |     |     +-- DAKSH Visualization (DIFF-04)
  |     |
  |     +-- Compliance Registry (real CRUD)
  |           |
  |           +-- CCO Dashboard
  |
  +-- Audit Trail (TS-10)  <-- cross-cutting, all features write to it
  |
  +-- Email Notifications (TS-06)  <-- cross-cutting, triggered by all workflows
  |
  +-- PDF Board Report (TS-07)  <-- depends on observation data + compliance data
  |
  +-- Excel Exports (TS-08)  <-- depends on all data models
```

---

## MVP Recommendation

For v2.0 Working Core MVP, prioritize in this order:

### Must Ship (blocks pilot usage)

1. **Auth + Multi-Tenancy** -- foundation for everything
2. **Observation Lifecycle (TS-01)** -- the core product value
3. **RBAC with 5 roles (TS-02)** -- required for any multi-user usage
4. **Auditee Portal (TS-05)** -- without this, the workflow is incomplete
5. **Maker-Checker (TS-04)** -- RBI expectation for banking software
6. **Evidence Upload (TS-09)** -- observations without evidence are incomplete
7. **Immutable Audit Trail (TS-10)** -- regulatory requirement, must be present from day one of real data
8. **Onboarding Wizard (TS-11)** -- needed to create new tenant instances
9. **Email Notifications (TS-06)** -- required for auditee to know they have pending items
10. **Role-Based Dashboards (TS-03)** -- at minimum CEO + CAE + Auditor views
11. **PDF Board Report (TS-07)** -- the output that justifies the entire system for board members
12. **Excel Exports (TS-08)** -- escape valve for any data need not covered by the UI

### Should Ship (strong differentiators)

13. **Pre-built RBI Checklists (DIFF-01)** -- the domain expertise moat
14. **Repeat Finding Detection (DIFF-02)** -- high-value, medium complexity
15. **Multi-Dimensional Tagging (DIFF-03)** -- enables all the rich dashboard aggregations

### Defer to Post-MVP

- **DAKSH Export (DIFF-04)** -- valuable but not blocking pilot usage
- **Indian Language Audit Content (DIFF-06)** -- UI i18n already exists; content-level i18n can wait
- **Guided Compliance Workflow (DIFF-05)** -- nice-to-have polish, not blocking

---

## Complexity Summary

| Feature                       | Complexity | Effort Estimate | Risk                                                     |
| ----------------------------- | ---------- | --------------- | -------------------------------------------------------- |
| Observation Lifecycle (TS-01) | HIGH       | 2-3 weeks       | State machine correctness, edge cases                    |
| RBAC (TS-02)                  | MEDIUM     | 1 week          | PostgreSQL RLS policy design                             |
| Role-Based Dashboards (TS-03) | MEDIUM     | 1.5 weeks       | Aggregation query performance                            |
| Maker-Checker (TS-04)         | MEDIUM     | 1 week          | Integration with observation lifecycle                   |
| Auditee Portal (TS-05)        | MEDIUM     | 1 week          | Simplified UX for low-tech users                         |
| Email Notifications (TS-06)   | MEDIUM     | 1 week          | SES setup, template management, rate limiting            |
| PDF Board Report (TS-07)      | MEDIUM     | 1 week          | React-PDF layout precision, chart embedding              |
| Excel Exports (TS-08)         | LOW        | 3-4 days        | Standard XLSX generation                                 |
| Evidence Upload (TS-09)       | MEDIUM     | 1 week          | S3 integration, file validation, security                |
| Audit Trail (TS-10)           | MEDIUM     | 3-4 days        | DB schema, INSERT-only permissions                       |
| Onboarding Wizard (TS-11)     | HIGH       | 1.5-2 weeks     | Multi-step form, RBI checklist data, tenant provisioning |
| RBI Checklists (DIFF-01)      | MEDIUM     | 1 week          | Data curation more than code                             |
| Repeat Detection (DIFF-02)    | MEDIUM     | 3-4 days        | Matching algorithm, auto-escalation rules                |
| Multi-Dim Tagging (DIFF-03)   | LOW-MEDIUM | 3-4 days        | Schema design, filter UI                                 |

**Total estimated effort:** 14-18 weeks for a 1-person technical lead with AI-assisted development. Aligns with the 16-week execution plan timeline (Weeks 4-14).

---

## Sources

**Industry competitors (MEDIUM confidence):**

- [Audit360 - Banking Audit Solution](https://www.audit360.in/domains/audit-solution-for-banks)
- [LaserGRC - Internal Audit Management](https://www.lasergrc.com/laser-audit-reporting-system.asp)
- [TeamMate+ Financial Services](https://www.wolterskluwer.com/en/solutions/teammate/teammate-financial-services)
- [AuditBoard - Operational Audit](https://auditboard.com/product/operational-audit)

**Regulatory framework (HIGH confidence):**

- [RBI Master Circular on Inspection and Audit in UCBs](https://taxguru.in/rbi/rbi-master-circular-inspection-audit-systems-primary-urban-cooperative-banks.html)
- [RBI RBIA Guidelines for UCBs and NBFCs](https://www.riskpro.in/blogs/rbi-issues-guidelines-risk-based-internal-audit-nbfc-and-ucb-step-forward-towards-quality-and)
- [RBI Circular 2023-24/117 - Internal Compliance Monitoring](https://cleartax.in/s/internal-compliance-monitoring-rbi-circular-117)

**Domain practices (MEDIUM confidence):**

- [Maker-Checker in Banking Domain](https://medium.com/@vdharam/implementation-of-maker-checker-flow-in-banking-domain-projects-17068cd05d73)
- [Audit Finding Management](https://sgsystemsglobal.com/glossary/audit-finding-management/)
- [PwC Audit Committee Dashboard Reporting](https://www.pwc.com/us/en/services/governance-insights-center/library/audit-committee-dashboard-reporting.html)
- [Immutable Audit Trail Guide](https://www.hubifi.com/blog/immutable-audit-log-basics)

**Technical approaches (MEDIUM confidence):**

- [AWS SaaS Lens - Tenant Onboarding](https://aws.amazon.com/blogs/apn/tenant-onboarding-best-practices-in-saas-with-the-aws-well-architected-saas-lens/)
- [PDF Generation with Next.js + React-PDF](https://medium.com/@stanleyfok/pdf-generation-with-react-componenets-using-next-js-at-server-side-ee9c2dea06a7)

**Project-internal (HIGH confidence):**

- `/Users/admin/Developer/AEGIS/.planning/PROJECT.md`
- `/Users/admin/Developer/AEGIS/Project Doc/UCB_Platform_Project_Plan.md`
- `/Users/admin/Developer/AEGIS/.planning/milestones/v1.0-REQUIREMENTS.md`
- `/Users/admin/Developer/AEGIS/src/types/index.ts`

---

_Researched: 2026-02-08_
_Researcher: Claude Opus 4.6_
_Mode: Ecosystem (Features dimension)_
