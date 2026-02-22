# Feature Research — RBIA Audit Workflow Implementation

**Domain:** Risk-Based Internal Audit (RBIA) for Indian Urban Cooperative Banks (UCBs)
**Milestone:** v6.0 — Adding RBIA examination, scoring, and dual-findings workflow to existing audit platform
**Researched:** 2026-02-22
**Confidence:** MEDIUM-HIGH

---

## Context: What Already Exists vs What This Milestone Adds

The platform already has (DO NOT re-implement):

- 7-state observation lifecycle (Draft → Submitted → Reviewed → Issued → Response → Compliance → Closed)
- RAM risk assessment with 19-parameter scoring
- Audit planning with annual plan simulation
- Section-based audit execution with cash/loan/SMA-NPA forms
- Compliance lifecycle: Branch Response → ZAC → ACE → ACB
- Escalation engine (L1-L4), PDF board reports, XLSX exports
- 5 role-based dashboards, 568 examination items in flat 2-level structure

v6.0 adds:

- Hierarchical examination checklist (ExaminationNode tree with variable depth)
- 4-point compliance scoring (FULLY/LARGELY/PARTIALLY/NON_COMPLIANT)
- Dual findings: ActionPoints (operational) vs Observations (formal 5C findings)
- 8-state engagement lifecycle (PLANNED → TEAM_ASSIGNED → OPENING_MEETING → IN_PROGRESS → EXIT_MEETING → REPORT_DRAFT → COMPLETED)
- Opening and exit meeting records (EngagementMeeting model)
- Branch Manager batch response workflow (BmResponseBatch)
- Frozen RBIA score snapshots (BranchRbiaScore)
- Positive observations (PositiveObservation model)

---

## Table Stakes

Features that RBI and UCB audit teams expect in any RBIA-compliant system. Missing any of these means the system fails regulatory requirements or auditors cannot complete their workflow.

---

### TS-V6-01: Hierarchical Examination Checklist Display and Navigation

| Attribute        | Detail                                                                                                                                                                                                                                                                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why Expected** | RBI RBIA policy (section 7.3-7.4, 2020) mandates that scoring models be structured as a hierarchical tree of Parts → Sub-parts → Activities, each with assigned percentage weights. Auditors work through this tree during fieldwork. The existing flat 2-level structure (ExaminationArea → ExaminationItem) cannot represent a 4-5 level deep compliance tree. |
| **Complexity**   | HIGH                                                                                                                                                                                                                                                                                                                                                             |
| **Confidence**   | HIGH — verified from RBIA-POLICY-2020.md sections 7.3-7.5, ExaminationNode model in schema                                                                                                                                                                                                                                                                       |

**Expected Behavior:**

The ExaminationNode tree has variable depth (0=root area, 1=module, 2=sub-module, 3-5=leaf items). Each depth level has a conceptual meaning:

```
Level 0: Audit Area          (e.g., "Operations")
  Level 1: Module            (e.g., "KYC/AML Compliance")
    Level 2: Sub-module      (e.g., "Customer Due Diligence")
      Level 3: Leaf item     (e.g., "Obtain valid KYC docs for all accounts")
```

**What auditors need from the UI:**

- Tree navigation with expand/collapse for each level
- Progress indicator per module: "12/24 items scored" with percentage
- Filter by: not yet scored, flagged for action point, flagged for observation
- Module-level summary score computed live as leaves are scored (weighted roll-up)
- Critical items (isCritical=true) visually marked — these cap parent score if NON_COMPLIANT
- Module selection per engagement (EngagementModuleSelection) — auditor picks applicable modules at engagement start
- Modules auto-selected by branch type (LARGE/MEDIUM/SMALL) based on applicableBranchTypes

**Key behaviors:**

- Non-leaf nodes display roll-up score, not a user-entered score
- Leaf nodes display a 4-button score picker (FULLY / LARGELY / PARTIALLY / NON_COMPLIANT)
- Working notes field (500-2000 chars) per leaf for auditor's evidence and rationale
- Flag toggles per leaf: "Flag for Action Point" and "Flag for Observation" (both can be set)
- Tree state is saved incrementally — no loss if auditor closes mid-session

**Dependencies:** ExaminationNode schema (already seeded), ExaminationResponse DAL, 4-point scoring (TS-V6-02)

---

### TS-V6-02: 4-Point Compliance Scoring with Weighted Roll-Up

| Attribute        | Detail                                                                                                                                                                                                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why Expected** | RBI RBIA Policy (2020) section 7.5 defines scoring thresholds: > 80% = Very Good, > 65-80% = Good, > 50-65% = Satisfactory, > 40-50% = Moderate, ≤ 40% = Poor. The 4-point scale (FULLY=1.0, LARGELY=0.75, PARTIALLY=0.5, NON_COMPLIANT=0.0) maps to this framework. Weighted roll-up is explicitly mandated in sections 7.4.1-7.4.3. |
| **Complexity**   | MEDIUM                                                                                                                                                                                                                                                                                                                                |
| **Confidence**   | HIGH — verified from RBIA-POLICY-2020.md sections 7.4-8.9, schema ScoreLabel enum                                                                                                                                                                                                                                                     |

**Score scale:**

| Label               | Decimal | Meaning                                         |
| ------------------- | ------- | ----------------------------------------------- |
| FULLY_COMPLIANT     | 1.00    | Controls fully in place, no gaps                |
| LARGELY_COMPLIANT   | 0.75    | Controls mostly in place, minor gaps            |
| PARTIALLY_COMPLIANT | 0.50    | Significant gaps, controls exist but inadequate |
| NON_COMPLIANT       | 0.00    | Controls absent or completely ineffective       |

**Roll-up algorithm:**

1. Leaf node score = decimal value of ScoreLabel (1.0/0.75/0.5/0.0)
2. Parent node score = Σ(child.score × child.weight) / Σ(child.weight) for scored children only
3. Critical item override: if any leaf with isCritical=true scores NON_COMPLIANT, the parent module score is capped at 0.50 (PARTIALLY_COMPLIANT ceiling)
4. Module scores roll up to composite engagement score by module weights
5. N/A items (not scored): excluded from denominator — calibrated scoring as per RBIA policy 7.6.2

**Rating bands from composite score:**

| Score    | Rating Band  | Risk Level Implied                     |
| -------- | ------------ | -------------------------------------- |
| > 80%    | VERY_GOOD    | Low risk, sound control environment    |
| > 65-80% | GOOD         | Generally good, room for improvement   |
| > 50-65% | SATISFACTORY | Basic controls but needs strengthening |
| > 40-50% | MODERATE     | Controls not commensurate with risk    |
| ≤ 40%    | POOR         | Weak controls, highly vulnerable       |

**Key behaviors:**

- Roll-up computed server-side on save (not just client-side display)
- Score displayed at every tree level as auditor works
- BranchRbiaScore frozen snapshot taken at REPORT_DRAFT state — never changed after freeze
- Both module-level scores (moduleScores JSONB) and full tree (scoringTreeSnapshot JSONB) stored

**Dependencies:** ExaminationNode tree (TS-V6-01), BranchRbiaScore model

---

### TS-V6-03: Dual Findings — Action Points vs Formal Observations

| Attribute        | Detail                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why Expected** | Indian bank RBIA practice distinguishes between operational findings (resolved at branch level) and formal 5C observations (escalated through ZAC/ACE/ACB). The RBIA policy (section 15.7) requires both types with different timelines and authority levels. Without this distinction, the system either over-documents trivial issues or under-formalizes serious ones. |
| **Complexity**   | HIGH                                                                                                                                                                                                                                                                                                                                                                      |
| **Confidence**   | HIGH — verified from schema (ActionPoint + Observation models coexist), RBIA policy section 4.8.4.3(h), IIA 5C standard                                                                                                                                                                                                                                                   |

**When to use each:**

| Type             | Trigger                                                                                 | Volume per Audit | Lifecycle                                                                                           | Authority                                 |
| ---------------- | --------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **Action Point** | Flagged from ExaminationResponse (operational gap, process deviation, minor deficiency) | 15-40 per audit  | DRAFT → ISSUED → BM_RESPONSE_DUE → BM_RESPONDED → VERIFIED → CLOSED / CARRIED_FORWARD               | Branch Manager responds; Auditor verifies |
| **Observation**  | Escalated from ExaminationResponse OR created directly (systemic, high-risk, repeat)    | 3-10 per audit   | Existing 7-state lifecycle (Draft → Submitted → Reviewed → Issued → Response → Compliance → Closed) | Full ZAC/ACE/ACB review chain             |

**Action Point details:**

- Promoted from flagged ExaminationResponse items (sourceResponseId linkage)
- Serial number within engagement: AP-001, AP-002, etc.
- Branch Manager has 15 days from report issuance to respond (bmResponseDeadline)
- BM responds in batch via BmResponseBatch (total/responded counters)
- Auditor verifies response adequacy
- Unresolved APs at next audit: CARRIED_FORWARD status with reference to new engagement

**Formal Observation (5C) details:**

- Promoted from critical/systemic ExaminationResponse items (flagForObservation=true)
- Must contain: Condition, Criterion, Cause, Consequence, Corrective Recommendation
- Enters the existing observation lifecycle (already built)
- High/Critical severity: routed through ACE → ACB

**Key behaviors:**

- Auditor can flag the same ExaminationResponse for BOTH ActionPoint AND Observation
- ActionPoints are audit-team facing; Observations are board-facing
- ActionPoint list included in audit report appendix
- Observation list is the core of the formal audit report

**Dependencies:** ExaminationResponse flagging (TS-V6-01), existing Observation model, BmResponseBatch, ActionPoint model

---

### TS-V6-04: 8-State Engagement Lifecycle with State Guards

| Attribute        | Detail                                                                                                                                                                                                                                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why Expected** | RBI RBIA policy (Appendix A, section 9) defines pre-audit → during audit → wrap-up stages. The existing 3-state engagement (PLANNED/IN_PROGRESS/COMPLETED) cannot track the opening meeting, examination, exit meeting, and report drafting as separate phases requiring different actions and permissions. |
| **Complexity**   | MEDIUM                                                                                                                                                                                                                                                                                                      |
| **Confidence**   | HIGH — verified from schema EngagementStatus enum, RBIA policy sections                                                                                                                                                                                                                                     |

**State machine:**

```
PLANNED
  → TEAM_ASSIGNED (Lead Auditor assigns team members)
    → OPENING_MEETING (Opening meeting record created + signed off)
      → IN_PROGRESS (Active examination, scoring responses)
        → EXIT_MEETING (Exit meeting record created + signed off)
          → REPORT_DRAFT (BranchRbiaScore frozen, action points issued to BM)
            → COMPLETED (BM responses received and verified, FACC submitted)
              (or)
            → CANCELLED (at any state, CAE authority only)
```

**State guards (server-side enforced):**

- Cannot advance to OPENING_MEETING without at least 1 team member assigned
- Cannot advance to IN_PROGRESS without opening meeting signed off
- Cannot advance to EXIT_MEETING without minimum % of examination items scored (configurable, default 90%)
- Cannot advance to REPORT_DRAFT without exit meeting signed off
- REPORT_DRAFT transition triggers: BranchRbiaScore freeze, ActionPoint issuance to BM, 15-day deadline set
- Cannot advance to COMPLETED until all APs have BM_RESPONDED status (or CARRIED_FORWARD decision made)

**Key behaviors:**

- Current state displayed prominently on engagement header
- Next-state action button shown only to role with authority (Lead Auditor advances, CAE cancels)
- State transition recorded in audit trail with timestamp and user
- State regress NOT permitted (once past opening meeting, cannot go back to team-assigned)

**Dependencies:** EngagementMeeting (TS-V6-05), BranchRbiaScore freeze (TS-V6-02), ActionPoint issuance (TS-V6-03)

---

### TS-V6-05: Opening and Exit Meeting Records

| Attribute        | Detail                                                                                                                                                                                                                                                                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why Expected** | RBI RBIA policy (Appendix A, section 9B-C) mandates pre-audit discussions and wrap-up discussions. Opening meeting: auditor explains scope, requests documents. Exit meeting: auditor presents preliminary findings, branch manager can clarify. Both meetings must be formally recorded with attendees and signed off. These records are RBI inspector evidence. |
| **Complexity**   | LOW                                                                                                                                                                                                                                                                                                                                                               |
| **Confidence**   | HIGH — verified from EngagementMeeting model in schema, RBIA policy Appendix A                                                                                                                                                                                                                                                                                    |

**Opening Meeting captures:**

- Date/time of meeting
- Attendees: name, designation, department (JSON array — not system users, may include branch staff)
- Audit scope communicated (modules selected for this engagement)
- Documents requested from branch (pre-audit data collection)
- Minutes text (free text, 2000+ chars)
- Key discussion points (structured)
- Sign-off by Lead Auditor (required to advance to IN_PROGRESS)

**Exit Meeting captures:**

- Date/time
- Attendees (same structure)
- Preliminary findings discussed (reference to flagged ExaminationResponses)
- Branch Manager comments on preliminary findings (may reduce scope of APs/Observations)
- Key discussion points
- Sign-off by Lead Auditor (required to advance to REPORT_DRAFT)

**Key behaviors:**

- One opening meeting, one exit meeting per engagement (@@unique constraint)
- Meeting date must be within engagement date range (server validation)
- Attendees list allows free-form names (branch staff not in the system)
- PDF export of meeting minutes (append to audit report)
- Findings raised and subsequently resolved at exit meeting: status "Resolved at Exit Meeting" (not dropped silently)

**Dependencies:** EngagementMeeting model, 8-state lifecycle (TS-V6-04)

---

### TS-V6-06: Branch Manager Response Workflow (Batch)

| Attribute        | Detail                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why Expected** | RBI RBIA policy (section 15.7.7) mandates compliance within one month of report receipt. Standard Indian bank practice for branch audits: BM receives all action points as a list, responds to each with explanation and evidence, submits a Final Audit Compliance-cum-Closure Certificate (FACC). Implementing individual AP responses without a batch view defeats the BM's workflow. |
| **Complexity**   | MEDIUM                                                                                                                                                                                                                                                                                                                                                                                   |
| **Confidence**   | HIGH — verified from RBIA policy section 15.7.7, BmResponseBatch model in schema                                                                                                                                                                                                                                                                                                         |

**BM workflow:**

```
REPORT_DRAFT state triggers:
  1. All ActionPoints status → BM_RESPONSE_DUE
  2. BmResponseBatch created with deadline (15 days from issuance, configurable)
  3. BM notified by email with list of all APs

BM responds:
  1. BM sees all APs for their branch in one batch view
  2. For each AP: enter response text + attach evidence documents
  3. Can respond to APs incrementally (no forced all-at-once submission)
  4. Batch shows progress: "12 of 27 APs responded"
  5. BM submits batch (changes BmResponseBatch.status → SUBMITTED)

Auditor reviews batch:
  1. Auditor sees each AP with BM response + evidence
  2. Per AP: mark as VERIFIED (accepted) or CARRIED_FORWARD (persistent issue)
  3. Carried-forward APs link to new engagement if one is being planned
```

**Key behaviors:**

- BM can see all APs in a single page, scrollable list with inline response forms
- Response deadline countdown shown prominently (days remaining)
- BmResponseBatch.status becomes OVERDUE if deadline passes without SUBMITTED
- Overdue triggers email escalation to Zonal Auditor
- BM cannot modify response after submission (immutable)
- FACC generation: PDF certificate confirming all APs responded + auditor verification status

**Dependencies:** ActionPoint lifecycle (TS-V6-03), BmResponseBatch model, email notifications

---

### TS-V6-07: RBIA Score Display and Module Breakdown

| Attribute        | Detail                                                                                                                                                                                                                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why Expected** | RBI RBIA policy (section 8) mandates that the rating be communicated to branches in writing. The CAE informs ACE/ACB of rating migrations annually. UCB CAEs need to see score trends to identify deteriorating branches. This is the primary output RBI inspectors look for during DAKSH assessment. |
| **Complexity**   | MEDIUM                                                                                                                                                                                                                                                                                                |
| **Confidence**   | HIGH — verified from RBIA policy sections 8.1-8.7, BranchRbiaScore model                                                                                                                                                                                                                              |

**Score display surfaces:**

1. **Engagement completion screen:** Composite score, rating band, module-by-module breakdown
2. **Branch profile page:** History of RBIA scores across audits with trend chart
3. **CAE/Manager dashboard:** All branches with their latest rating and risk migration table
4. **ACE/ACB report section:** Rating migration summary (how many branches moved between bands)

**Rating migration tracking (per RBIA policy 8.6-8.7):**

- Quarterly: ZAC sees migration of branch ratings within zone
- Annual: CAE presents rating migration to ACE/ACB

**Key behaviors:**

- BranchRbiaScore.frozenAt timestamp shows when score was locked (immutable after freeze)
- Score drill-down: click on composite → see module scores → click on module → see item-level scores
- scoringTreeSnapshot JSONB provides full historical tree (not just totals) for any past audit
- Score comparison: show current audit score vs previous audit score (delta)
- Rating band shown with color coding (POOR=red, MODERATE=amber, SATISFACTORY=yellow, GOOD=green, VERY_GOOD=dark-green)
- Download certificate of audit rating (PDF) — communicated to branch manager per policy 8.4

**Dependencies:** BranchRbiaScore model, 4-point scoring roll-up (TS-V6-02), existing branch model

---

### TS-V6-08: Positive Observations Capture and Report Inclusion

| Attribute        | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why Expected** | RBI RBIA policy (section 4.5.2c) describes internal audit's role as "business enabler providing on-going feedback." Indian bank audit practice includes commendable practices in the audit report — branches with strong controls are recognized, which incentivizes compliance. Every UCB audit report template has a "Positive Observations" section alongside findings. Without this, the report is purely critical and misses RBI's intent. |
| **Complexity**   | LOW                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Confidence**   | MEDIUM — verified from PositiveObservation model in schema, RBIA policy 4.5.2c; specific format from domain practice (MEDIUM confidence — standard in Indian banking but not explicitly stated in RBI circular text)                                                                                                                                                                                                                            |

**Expected behavior:**

- During IN_PROGRESS state, auditor can create positive observations at any point
- Form: title (required), description (required, 200-2000 chars), moduleCode (linked to ExaminationNode)
- No lifecycle states — purely informational capture
- Multiple positive observations per engagement (no limit)
- Appear in audit report: "Commendable Practices" section before findings
- Appear in BranchRbiaScore report to acknowledge what is working well
- Branch Manager can see them — motivating feedback

**Key behaviors:**

- Positive observations do NOT affect the composite score (purely qualitative)
- No evidence upload required (optional)
- Created by auditor, not editable after EXIT_MEETING state
- Included in report PDF in dedicated section

**Dependencies:** AuditEngagement, PositiveObservation model, ExaminationNode (for module reference)

---

## Differentiators

Features that set AEGIS apart from manual spreadsheet-based RBIA workflows and generic audit tools. These are the competitive advantages in the UCB market.

---

### DIFF-V6-01: Live Score Roll-Up with Critical Item Override Visual Feedback

| Attribute             | Detail                                                                                                                                                                                                                                                                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value Proposition** | Spreadsheet-based RBIA scoring requires auditors to manually calculate weighted averages and track which critical items would cap scores. AEGIS computes this live as each item is scored, showing the impact immediately. Auditors understand the composite score implications of each finding in real time — this changes how they prioritize fieldwork. |
| **Complexity**        | MEDIUM                                                                                                                                                                                                                                                                                                                                                     |
| **Confidence**        | HIGH (technical feasibility clear; market differentiation is clear given spreadsheet baseline)                                                                                                                                                                                                                                                             |

**What this looks like:**

- As auditor scores a leaf item, parent and module scores update instantly (optimistic UI + server sync)
- Critical items display a warning banner: "This item is marked CRITICAL. A NON_COMPLIANT score will cap this module's score at PARTIALLY_COMPLIANT (50%)"
- Score delta shown: "Scoring this PARTIALLY vs NON_COMPLIANT would improve module score from 42% to 58%"
- Module completion percentage shown: "OPS module: 18/24 items scored (75% complete)"

**Dependencies:** TS-V6-01, TS-V6-02, ExaminationNode isCritical flag

---

### DIFF-V6-02: Carry-Forward AP Linkage Across Audit Cycles

| Attribute             | Detail                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value Proposition** | Persistent unresolved Action Points are a key RBI concern. AEGIS tracks which APs were carried forward from the previous engagement and surfaces them prominently in the new audit. The auditor can immediately see: "Branch X has 5 carry-forward APs from last audit — these must be re-examined first." This is the digital equivalent of the "previous audit findings" review in RBIA pre-audit stage (policy section A.h). |
| **Complexity**        | MEDIUM                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Confidence**        | HIGH — explicitly in ActionPoint.carriedForwardToEngagementId schema field; RBIA policy Appendix A explicitly requires review of previous findings                                                                                                                                                                                                                                                                              |

**Expected behavior:**

- When a new engagement is created for a branch, system finds all CARRIED_FORWARD APs from the most recent completed engagement for that branch
- These appear at the top of the examination view: "3 carried-forward action points from previous audit (Audit #2024-APR)"
- Each carry-forward AP must be explicitly re-assessed: "Resolved", "Still Pending" (creates new AP), or "Upgraded to Observation" (systemic pattern)
- Three or more consecutive carry-forwards for the same AP should trigger an automatic observation flag

**Dependencies:** ActionPoint model (carriedForwardToEngagementId), TS-V6-03

---

### DIFF-V6-03: Module-Adaptive Examination (Branch-Type Filtering)

| Attribute             | Detail                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value Proposition** | A large urban branch has different applicable examination modules than a small rural branch. Manual RBIA checklists apply everything to everyone and auditors manually skip non-applicable items. AEGIS auto-filters modules by applicableBranchTypes on the ExaminationNode, showing only what's relevant. This reduces examination scope by 20-40% for smaller branches and focuses auditor attention. |
| **Complexity**        | LOW                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Confidence**        | HIGH — applicableBranchTypes field in ExaminationNode schema, RBIA policy 7.6.2 explicitly addresses N/A calibration                                                                                                                                                                                                                                                                                     |

**Expected behavior:**

- Engagement creation: select branch type (LARGE/MEDIUM/SMALL from branch profile)
- System auto-selects applicable modules (EngagementModuleSelection with isAutoSelected=true)
- Lead Auditor can manually add or remove modules with a reason (selectionReason)
- Non-applicable nodes excluded from scoring denominator (calibrated scoring)
- Report shows: "Modules examined: 8 of 12 available (4 not applicable for branch type)"

**Dependencies:** TS-V6-01, ExaminationNode.applicableBranchTypes, EngagementModuleSelection

---

### DIFF-V6-04: RBIA Audit Report — Dual-Section Report with Scores + Findings

| Attribute             | Detail                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value Proposition** | The RBIA audit report is fundamentally different from a plain observation list: it has a score summary + rating, module-level scorecards, positive observations, action point table, and formal 5C observations. Generating this from the digital record — instead of Word/Excel assembly — saves 2-4 days of report writing per audit cycle and eliminates transcription errors. |
| **Complexity**        | HIGH                                                                                                                                                                                                                                                                                                                                                                              |
| **Confidence**        | HIGH — this is the primary output of the RBIA workflow; RBIA policy section 15.7.6 mandates submission within 3 weeks                                                                                                                                                                                                                                                             |

**Report sections (sequential):**

1. Cover page: branch name, audit period, team, rating badge
2. Executive summary: composite score, rating band, vs previous audit
3. Positive observations: commendable practices table
4. Module scorecards: per-module score, items count, key gaps
5. Action point register: AP-001 to AP-N, module, description, BM deadline
6. Formal observations: 5C format observations (high/critical only in main report, others in appendix)
7. Opening/exit meeting minutes (appendix)
8. Full examination scoring tree (appendix, for branch manager reference)

**Key behaviors:**

- CAE/Lead Auditor can add/edit commentary on each section before PDF generation
- Report generated in REPORT_DRAFT state after score freeze
- Report regeneration permitted until COMPLETED (for corrections)
- Final report is immutable once engagement reaches COMPLETED
- Bilingual report option: English primary + Indian language labels

**Dependencies:** BranchRbiaScore (TS-V6-07), PositiveObservation (TS-V6-08), ActionPoint (TS-V6-03), Observation (existing), EngagementMeeting (TS-V6-05)

---

### DIFF-V6-05: Offline Scoring Sheet Export (for Low-Connectivity Field Audits)

| Attribute             | Detail                                                                                                                                                                                                                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Value Proposition** | UCB branches in rural areas may have poor internet connectivity. Auditors conducting fieldwork at a branch may be unable to use the web app continuously. An Excel-based scoring sheet export (pre-populated with examination items) lets auditors work offline, then import back. This is a practical accommodation that generic tools don't provide. |
| **Complexity**        | MEDIUM                                                                                                                                                                                                                                                                                                                                                 |
| **Confidence**        | MEDIUM — domain need is clear; implementation feasibility is high (ExcelJS); no direct policy requirement                                                                                                                                                                                                                                              |

**Expected behavior:**

- Export: XLSX file with one sheet per module, pre-populated with item codes/descriptions
- Auditor fills in score (dropdown: FC/LC/PC/NC) and working notes per item in Excel
- Import: system reads back Excel, maps by item code, updates ExaminationResponse records
- Conflict handling: if item already scored in app, prompt for which version to keep
- Import validation: flag unknown item codes, invalid score values

**Dependencies:** ExaminationNode seed data, ExaminationResponse DAL, ExcelJS

---

## Anti-Features

Features to deliberately NOT build in v6.0. These are commonly requested but would hurt quality, timeline, or product focus.

---

### AF-V6-01: Configurable Scoring Scales (Other Than 4-Point)

| Why Avoid                                                                                                                                                                                                                                                                                                                                                                                                                  | What to Do Instead                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UCBs under RBI RBIA mandate are converging on the 4-point scale (FULLY/LARGELY/PARTIALLY/NON_COMPLIANT) as the standard interpretation of the weighted scoring approach. Allowing custom scales (3-point, 5-point, percentage input) would fragment reporting, break roll-up algorithms, and make cross-bank comparisons impossible. One bank asking for a 5-point scale is a red flag that they want to game the ratings. | Hardcode FULLY/LARGELY/PARTIALLY/NON_COMPLIANT. If a tenant wants different labels, support label aliases in display only (e.g., "Satisfactory" instead of "Largely Compliant") — not different weights. |

---

### AF-V6-02: Real-Time Multi-User Collaborative Scoring

| Why Avoid                                                                                                                                                                                                                                                                                                                                                                                                        | What to Do Instead                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| During a branch audit, 2-3 auditors simultaneously score different sections. Building real-time collaborative editing (like Google Docs) would require CRDTs or operational transforms — significant complexity. UCB audit teams have clear section ownership (one auditor owns KYC, another owns loans). Lock-based concurrency (each leaf item locked to one auditor at a time) is sufficient and far simpler. | Section ownership model: Lead Auditor assigns team members to specific modules at engagement start. Each module is owned by one auditor for scoring. Conflict is impossible if module ownership is respected. Display "Currently being scored by [name]" if another user has the module open. |

---

### AF-V6-03: Auto-Classification of Findings Using AI/ML

| Why Avoid                                                                                                                                                                                                                                                                                                                                                   | What to Do Instead                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Automatically classifying whether a flagged item should be an Action Point vs a Formal Observation using AI is premature. UCB audit teams have domain expertise; the distinction depends on context (severity, systemic nature, branch history) that an AI model cannot reliably assess at this data volume. False positives would undermine auditor trust. | Provide clear UI guidance: a pop-up when auditor flags for Action Point vs Observation, explaining when each applies. Show "Previous similar findings at this branch" to help auditor decide. Keep the human in the loop for all classification decisions. |

---

### AF-V6-04: Examination Node Editing via UI (Admin CRUD for Checklist)

| Why Avoid                                                                                                                                                                                                                                                                                                               | What to Do Instead                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Allowing tenants to freely edit the examination node tree (add/remove/rename items) would quickly diverge from RBI-mandated structure, making cross-audit comparisons impossible and creating compliance risk. If a bank removes a KYC node, they could technically claim they "examined" it by not having it in scope. | Seed the examination tree at tenant creation from the master template. Allow tenants to mark nodes as not-applicable for their branch type (via applicableBranchTypes). Allow CAE to add custom supplementary items at depth 3+ only, clearly marked as "custom" (separate flag). No deletion of RBI-mandated nodes. |

---

### AF-V6-05: BM Portal Full Re-Design for v6.0

| Why Avoid                                                                                                                                                                                                                                                                                                           | What to Do Instead                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The existing auditee portal already handles the formal Observation response workflow. Redesigning it from scratch to also handle ActionPoint batch responses in v6.0 is scope creep. The BM Action Point batch response UI is a new interface but should reuse existing component patterns and auth infrastructure. | Add a new `/auditee/[id]/action-points` route that lists all APs for the branch engagement, inline response forms, and batch submission. Reuse existing auth, evidence upload, and notification infrastructure. Do not build a separate portal or redesign existing auditee flows. |

---

### AF-V6-06: Granular Auditor-Level Permission for Each Examination Node

| Why Avoid                                                                                                                                                                                                                                                               | What to Do Instead                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fine-grained permissions per examination node (e.g., "Auditor A can only score KYC nodes") require a complex permission matrix that increases code complexity with minimal real-world benefit. UCB audit teams are small (2-5 auditors per engagement) and trust-based. | Use module ownership (Auditor assigned to module at engagement level via EngagementModuleSelection). Any team member can score any module if needed — module ownership is guidance, not enforcement. Only state transitions (advancing engagement lifecycle) require role authority. |

---

## Feature Dependencies

```
Module Selection
  └──requires──> ExaminationNode tree (seeded)
  └──requires──> Branch type on AuditEngagement

4-Point Scoring (TS-V6-02)
  └──requires──> Hierarchical Checklist Display (TS-V6-01)
  └──requires──> Module Selection
  └──enables──> BranchRbiaScore freeze

8-State Lifecycle (TS-V6-04)
  └──requires──> Opening Meeting (TS-V6-05) [gate: OPENING_MEETING → IN_PROGRESS]
  └──requires──> Exit Meeting (TS-V6-05) [gate: EXIT_MEETING → REPORT_DRAFT]
  └──requires──> Scoring completion threshold [gate: IN_PROGRESS → EXIT_MEETING]
  └──triggers──> BranchRbiaScore freeze [at REPORT_DRAFT]
  └──triggers──> ActionPoint issuance to BM [at REPORT_DRAFT]

Dual Findings (TS-V6-03)
  └──requires──> ExaminationResponse flagging (TS-V6-01)
  └──enhances──> Existing Observation lifecycle (already built)

BM Response Workflow (TS-V6-06)
  └──requires──> ActionPoint issuance (TS-V6-03)
  └──requires──> 8-State lifecycle REPORT_DRAFT trigger (TS-V6-04)
  └──requires──> Existing evidence upload infrastructure

RBIA Audit Report (DIFF-V6-04)
  └──requires──> BranchRbiaScore (TS-V6-02)
  └──requires──> Positive Observations (TS-V6-08)
  └──requires──> ActionPoint list (TS-V6-03)
  └──requires──> Meeting minutes (TS-V6-05)
  └──requires──> Formal Observations (existing)

Live Score Feedback (DIFF-V6-01)
  └──requires──> 4-Point Scoring (TS-V6-02)
  └──enhances──> Hierarchical Checklist Display (TS-V6-01)

Carry-Forward APs (DIFF-V6-02)
  └──requires──> ActionPoint lifecycle (TS-V6-03)
  └──requires──> Multi-engagement data per branch (existing)

Positive Observations (TS-V6-08)
  └──requires──> AuditEngagement (8-state lifecycle)
  └──enhances──> RBIA Audit Report (DIFF-V6-04)
```

---

## MVP Definition for v6.0

### Must Ship (blocks RBIA workflow completion — auditors cannot complete an audit without these)

- [ ] **TS-V6-04**: 8-state engagement lifecycle with state guards — the backbone of the RBIA process
- [ ] **TS-V6-05**: Opening and exit meeting records — required gates in the lifecycle
- [ ] **TS-V6-01**: Hierarchical examination checklist display — auditors cannot score without this
- [ ] **TS-V6-02**: 4-point scoring with weighted roll-up — the core RBIA compliance assessment
- [ ] **TS-V6-03**: Dual findings — Action Points creation from flagged responses — operational output
- [ ] **TS-V6-06**: BM response batch workflow — branch manager cannot respond without this
- [ ] **TS-V6-07**: RBIA score display with module breakdown — required for report and ACE/ACB reporting
- [ ] **TS-V6-08**: Positive observations capture — required for complete audit report

### Should Ship (differentiators that multiply value significantly)

- [ ] **DIFF-V6-01**: Live score roll-up with critical item visual feedback — changes how auditors work
- [ ] **DIFF-V6-02**: Carry-forward AP linkage across cycles — enables continuity tracking
- [ ] **DIFF-V6-03**: Module-adaptive examination (branch-type filtering) — reduces noise for small branches
- [ ] **DIFF-V6-04**: RBIA audit report with dual sections — the primary deliverable; without it the data has no output

### Defer to Post-v6.0

- [ ] **DIFF-V6-05**: Offline scoring sheet export/import — useful but not blocking initial deployment
- Additional: FACC certificate PDF automation (can be manual in v6.0 first pass)
- Additional: ACE/ACB rating migration report (can use existing board report with new data)

---

## Feature Prioritization Matrix

| Feature                            | User Value | Implementation Cost | Priority |
| ---------------------------------- | ---------- | ------------------- | -------- |
| 8-State Lifecycle (TS-V6-04)       | HIGH       | MEDIUM              | P1       |
| Opening/Exit Meetings (TS-V6-05)   | HIGH       | LOW                 | P1       |
| Hierarchical Checklist (TS-V6-01)  | HIGH       | HIGH                | P1       |
| 4-Point Scoring Roll-Up (TS-V6-02) | HIGH       | MEDIUM              | P1       |
| Action Points (TS-V6-03)           | HIGH       | MEDIUM              | P1       |
| BM Response Batch (TS-V6-06)       | HIGH       | MEDIUM              | P1       |
| RBIA Score Display (TS-V6-07)      | HIGH       | LOW                 | P1       |
| Positive Observations (TS-V6-08)   | MEDIUM     | LOW                 | P1       |
| Live Score Feedback (DIFF-V6-01)   | HIGH       | MEDIUM              | P2       |
| Carry-Forward APs (DIFF-V6-02)     | HIGH       | LOW                 | P2       |
| Module-Adaptive Exam (DIFF-V6-03)  | MEDIUM     | LOW                 | P2       |
| RBIA Audit Report (DIFF-V6-04)     | HIGH       | HIGH                | P2       |
| Offline Scoring Sheet (DIFF-V6-05) | LOW        | MEDIUM              | P3       |

**Priority key:**

- P1: Must have — blocks RBIA workflow
- P2: Should have — multiplies value of P1 features
- P3: Defer — low urgency, medium effort

---

## Complexity Estimates

| Feature                               | Complexity | Effort Estimate | Key Risk                                                          |
| ------------------------------------- | ---------- | --------------- | ----------------------------------------------------------------- |
| Hierarchical Checklist UI (TS-V6-01)  | HIGH       | 2-3 weeks       | Tree rendering performance, state management for large trees      |
| 4-Point Scoring + Roll-Up (TS-V6-02)  | MEDIUM     | 1-1.5 weeks     | Roll-up algorithm correctness, critical-item override             |
| Dual Findings — APs (TS-V6-03)        | MEDIUM     | 1 week          | Promotion flow from ExaminationResponse, serial number generation |
| 8-State Lifecycle (TS-V6-04)          | MEDIUM     | 1 week          | State guard enforcement, transition side effects                  |
| Opening/Exit Meetings (TS-V6-05)      | LOW        | 3-4 days        | Attendee JSON form, sign-off workflow                             |
| BM Response Batch (TS-V6-06)          | MEDIUM     | 1.5 weeks       | Batch progress tracking, deadline enforcement                     |
| Score Display + Drill-Down (TS-V6-07) | MEDIUM     | 1 week          | Historical snapshot rendering from JSONB                          |
| Positive Observations (TS-V6-08)      | LOW        | 2-3 days        | Simple CRUD with module reference                                 |
| Live Score Feedback (DIFF-V6-01)      | MEDIUM     | 3-4 days        | Optimistic UI, debounced server sync                              |
| Carry-Forward AP Linkage (DIFF-V6-02) | LOW        | 2-3 days        | Cross-engagement query, UI surfacing                              |
| Module Filtering (DIFF-V6-03)         | LOW        | 2-3 days        | Branch-type → module selection logic                              |
| RBIA Audit Report PDF (DIFF-V6-04)    | HIGH       | 2-3 weeks       | Report template layout, score tree rendering in PDF               |

**Total estimated effort:** 16-22 weeks for 1-person technical lead with AI assistance.

---

## Answers to Specific Research Questions

### Q1: Hierarchical examination checklists — how deep, how structured, how scored?

**Answer (HIGH confidence):** RBI RBIA policy (sections 7.3-7.4) defines three tiers: Parts → Sub-parts → Activities. In practice, Indian bank audit systems implement 4-5 levels for complex areas. The ExaminationNode schema correctly models this with variable depth (0-5). Depth 0 = audit area, depth 1 = module (product/process), depth 2 = sub-module, depth 3-5 = leaf items (value statements). Scoring is bottom-up: only leaf items receive scores, parents compute via weighted average of children. Weights must sum to 100% within any parent-children group (the schema stores individual child weights and normalizes on roll-up).

### Q2: 4-point compliance scoring — standard scale, weight mechanics?

**Answer (HIGH confidence):** The RBI RBIA policy does not prescribe a specific 4-point scale by name but defines rating bands based on percentage scores (≤40%=Poor, >40-50%=Moderate, >50-65%=Satisfactory, >65-80%=Good, >80%=Very Good). The 4-point FULLY/LARGELY/PARTIALLY/NON_COMPLIANT scale with 1.0/0.75/0.5/0.0 values is a widely adopted interpretation in the industry (used by ICAI technical guidance and audit tool vendors). This maps logically: FULLY=80-100%, LARGELY=65-80%, PARTIALLY=50-65%, NON_COMPLIANT=0-40%. Weight mechanics: each node has a weight (Decimal 5,4) within its parent group; roll-up is weighted average of scored children only (N/A items excluded from denominator per policy 7.6.2).

### Q3: Dual findings — when does each apply?

**Answer (HIGH confidence from domain practice, MEDIUM from explicit policy text):** Action Points are operational/process observations that the Branch Manager can resolve at branch level — no senior committee involvement needed. They are the operational audit output (15-40 per audit). Formal Observations (5C findings) are systemic, high-risk, or repeat issues that require escalation through ZAC/ACE/ACB. They are the governance audit output (3-10 per audit). The key distinction: if the branch can self-correct within 15-30 days without systemic change → Action Point. If it represents a systemic control failure or regulatory risk → Formal Observation. The RBIA policy section 4.8.4.3(h) explicitly references different escalation paths for "critical findings" (ACB) vs other observations.

### Q4: Branch Manager response workflow — timeline, process?

**Answer (HIGH confidence):** Per RBIA policy section 15.7.7: initial compliance submission within 1 month of audit report receipt; FACC (Final Audit Compliance-cum-Closure Certificate) within 3 months. Standard UCB practice for Action Points: 15 days from issuance. This aligns with the BmResponseBatch.deadline field in the schema. The BM receives the full AP list as a batch (not individual emails per AP), responds per-AP with text + evidence, and submits the batch. The auditor then verifies each response and either closes or carries forward.

### Q5: RBIA scoring and rating bands — how composite scores computed?

**Answer (HIGH confidence):** Per RBIA policy sections 7.4-8.9: Total Score distributed to Parts (by significance weight), Sub-parts (sum must equal parent allocation), Activities (sum must equal sub-part weight). Composite score = (sum of weighted activity scores achieved) / (maximum achievable score for applicable parts). Rating bands: ≤40%=Poor (Very High/High risk), >40-50%=Moderate (Medium risk), >50-65%=Satisfactory, >65-80%=Good (Low risk), >80%=Very Good (Low risk). N/A calibration: when a part is not applicable, it is excluded from both numerator and denominator. The AEGIS implementation (BranchRbiaScore) stores composite (0.00-1.00) and rating band as a frozen snapshot.

### Q6: Opening/exit meeting protocols — what's captured?

**Answer (MEDIUM confidence — policy principle is clear, specifics are implementation practice):** Opening meeting (pre-audit): auditor explains scope, requests data/documents, introduces team. Required captures: date, attendees (name+designation+department), scope of modules to be examined, documents requested, key discussion points, sign-off. Exit meeting (wrap-up): auditor presents preliminary findings, BM can provide clarifications that may resolve some findings before report issuance. Required captures: date, attendees, preliminary observations discussed, BM's on-the-spot clarifications, sign-off. The EngagementMeeting model in schema correctly captures this. Policy Appendix A section 9C mandates a "Wrap-up Discussion Report."

### Q7: Positive observations — how tracked and reported?

**Answer (MEDIUM confidence — common practice, not explicit in RBI circular):** Positive observations ("commendable practices") are standard in Indian bank audit reports — they acknowledge branches maintaining strong controls. The RBIA policy 4.5.2c frames internal audit as "business enabler providing feedback to strengthen products, policies and processes." In practice: 1-5 positive observations per audit, title + description + module reference, no lifecycle (purely informational), included in the report before the findings section. They do not affect the composite score but are tracked per engagement. The PositiveObservation model in schema correctly captures this. Including them in the CAE dashboard ("branches with commendable practices") is a differentiator.

---

## Sources

**Primary source — project internal (HIGH confidence):**

- `/Users/admin/Developer/AEGIS/RBIA-POLICY-2020.md` — IDBI Bank RBIA Policy 2020, particularly sections 7.3-7.6, 8.1-8.9, 15.7, Appendix A
- `/Users/admin/Developer/AEGIS/prisma/schema.prisma` — v6.0 data models (ExaminationNode, ExaminationResponse, BranchRbiaScore, ActionPoint, EngagementMeeting, PositiveObservation, BmResponseBatch)
- `/Users/admin/Developer/AEGIS/CLAUDE.md` — v6.0 design decisions in "v6.0 RBIA Redesign" section

**RBI regulatory sources (HIGH confidence):**

- [RBI RBIA Framework Notification (Feb 2021)](https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12018&Mode=0) — mandates RBIA for UCBs with asset size > Rs.500 Cr
- [FIDC India — RBI RBIA Circular Feb 2021](https://fidcindia.org.in/wp-content/uploads/2021/02/RBI-CIRCULAR-03-02-21-RISK-BASED-INTERNAL-AUDIT-1.pdf)
- [RBI Master Circular on Inspection and Audit in UCBs](https://www.rbi.org.in/commonman/english/scripts/Notification.aspx?Id=1402)

**Domain guidance (MEDIUM confidence):**

- [ICAI Technical Guide on Risk-Based Internal Audit in Banks](https://kb.icai.org/pdfs/PDFFile663b07e9d230f9.29869545.pdf)
- [ICAI Technical Guide on RBIA for NBFC (2024)](https://internalaudit.icai.org/wp-content/uploads/2024/07/final-pub.-57-4_TG-on-Risk-Based-Internal-Audit-of-NBFC-24.pdf)
- [Vinod Kothari on Risk-based Internal Audit](https://vinodkothari.com/2021/03/risk-based-internal-prescription-for-audit-function/)
- [Audit360 — RBIA vs Checklist Audit](https://www.audit360.in/post/risk-based-internal-audit-and-checklist-based-audit-are-they-mutually-exclusive)
- [IIA 5C Framework for Internal Audit Findings](https://www.mbgcorp.com/in/insights/relevance-of-5-cs-in-internal-audit/)

---

_Feature research for: RBIA Audit Workflow — Indian UCBs_
_Researched: 2026-02-22_
_Researcher: Claude Sonnet 4.6_
_Mode: Project Research — Features dimension (Subsequent milestone)_
