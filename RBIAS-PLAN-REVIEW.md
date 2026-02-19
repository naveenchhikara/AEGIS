# RBIAS v3.0 — Implementation Plan Validation Review (against SDD)

**Reviewer role:** Plan Validator (RBIAS v3.0 expansion)

**Inputs**

- Implementation plan: `AEGIS/RBIAS-PLAN.md` (366 lines)
- Vision/SDD: `AEGIS/RBIAS-SDD.md` (Version 3.0, Feb 2026, ~79 pages)
- Current Prisma schema: `AEGIS/prisma/schema.prisma`

> **Citation format**
>
> - **Plan** cites line numbers from `RBIAS-PLAN.md` (via `nl -ba`).
> - **SDD** cites the printed page markers inside the SDD (e.g., “Confidential | Page 32”).

---

## Executive Summary (Gate)

The plan is directionally aligned (waves, module ordering, and AEGIS-stack reality are sensible), and it correctly defers **M10 + M11** and **M16 IRAC** as stated (**Plan** lines 78–84, 239–241). However, **it is not yet execution-grade** versus the SDD:

### Blockers / must-fix before Wave 1 execution

1. **Schema misalignment for core “audit engagement” domain:** the SDD’s _audits/audit_sections/audit_team_members_ model (SDD pp.14–16) is not fully represented in either the current schema or the plan. Without it, M2/M3/M4 can’t match the SDD’s Excel-tab workflow reliably.
2. **M3 scope is under-modeled:** the plan covers only **cash checks + loan reviews + SMA/NPA + value statements**, but the SDD’s execution module includes **13+ standardized sections** and multiple additional section data tables (SDD pp.28–38; Supporting tables p.26).
3. **Compliance lifecycle (M5) requires a first-class `compliance_items`-equivalent table** (SDD p.22). Current `ComplianceRequirement` is a different concept; plan doesn’t specify the necessary schema.
4. **Hidden dependencies:** RAM and scheduling in SDD depend on _previous audit rating_ and _previous audit compliance closure_ (SDD p.32); the plan places RAM in Wave 1 before the mechanisms that compute those (M4/M5 in Wave 3).
5. **Roles/RBAC is internally inconsistent and incomplete:** the plan says “4 additions” but lists 8 roles (Plan lines 64–72). It also doesn’t clearly map all **11 SDD roles** (SDD p.8) to concrete permissions.

### Recommendation

Proceed only after updating the plan to include the missing core schema + RBAC mapping + dependency adjustments described below. Otherwise Wave 1 will create “wrong primitives” that later waves must undo.

---

## 1) Coverage Analysis (M1–M20)

### Legend

- **✅ Covered** = plan addresses the SDD’s key requirements with enough specificity.
- **🟨 Partial** = addressed, but missing key SDD requirements, data model, or workflows.
- **🟥 Missing** = SDD requirements not in the plan (or implicitly dropped).

### Module-by-module validation

#### M1 — Audit Planning & RAM

- **SDD key requirements:**
  - RAM engine: **19 parameters + weights + thresholds** stored/configurable (SDD pp.20–21, 32).
  - Frequency derivation: 12/18/24 months based on composite score (SDD p.32).
  - **Annual audit plan generator** with auto-scheduling, workload balancing, drag-drop re-scheduling, conflict detection, export, and version tracking (SDD p.33).
  - Inputs beyond RAM: external findings, KRIs, “what-if” simulation (SDD pp.42–43).
- **Plan coverage:** **🟨 Partial**
  - RAM tables + compute service planned (Plan lines 94–117).
  - Auto-scheduling from risk category planned (Plan line 114) but **does not specify SDD’s 12/18/24 mapping**.
  - The plan does **not** describe annual plan _versioning / drag-drop / conflict detection / workload balancing / quarter mapping_.
- **Gaps / silent drops:**
  - RAM parameter list in plan **does not match SDD parameter list** (SDD p.32): SDD includes _Gross NPA, Net NPA, SMA-2, complaints, forex volume, cash handling volume, IT/cyber incidents, etc._; plan’s seed list includes _Capital Adequacy, Profitability, Management Quality, Deposit/Credit concentration, Market/Liquidity risk_ etc (Plan lines 331–334). If you intend a “v3 RAM” different from SDD, it must be explicitly reconciled.
  - No plan for **zone-based planning** (SDD branch schema includes `zone/region`, p.13; dashboards also expect zone views, p.41).

#### M2 — Pre-Audit

- **SDD key requirements:** requisition/document collection, previous audit review, checklist preparation (SDD p.9 and “Pre-Audit” in module list; also implied by workflow).
- **Plan coverage:** **🟨 Partial** (Plan lines 131–136)
  - Branch profiling and document pack generation included.
- **Gaps:**
  - SDD implies **branch data requisition + document collection workflow**; plan doesn’t define artifact storage model (evidence/document pack storage separate from observation evidence).
  - Team assignment depends on **skills matrix** (SDD p.51). Plan mentions skill matching (Plan line 133) but skills data model is not defined until later (“skills matrix” mentioned as M7 gap, Plan line 49).

#### M3 — Audit Execution

- **SDD key requirements:**
  - Full **13–16 standardized audit sections** mirroring Excel tabs (SDD pp.28–38).
  - Value statement exam framework: **12 functional areas, 220–280 items**, status options, mandatory observation on non-compliance, evidence linking (SDD pp.34–36).
  - **Auto-save + offline** (IndexedDB/service worker) and tablet-friendly UX (SDD pp.37, 53).
  - Auto-observation creation from non-compliant exam items (SDD p.35).
  - Section-specific data structures: Branch Details, Register, Housekeeping (150+), Non-Fund, Staff Matters, Fixed Assets, “Other Observations”, etc (SDD pp.28, 37; Supporting tables p.26).
- **Plan coverage:** **🟨 Partial**
  - Exam areas/items + responses + cash check + loan review + SMA/NPA are planned (Plan lines 94–105, 138–153).
  - Offline support is claimed (Plan line 142) but without a PWA plan.
- **Gaps / misalignments:**
  - Plan’s `AuditSection` is described as “maps to examination areas” (Plan line 101), but SDD’s `audit_sections` are **Excel section tabs** (Risk Rating, Summary, Cash Check, Branch Details, Register, Loans I/II, SMA/NPA, Non-Fund, Housekeeping, Staff Matters, Fixed Assets, Other Obs; SDD pp.15–16, 28, 37). You likely need **both** concepts: “Excel Sections” and “Functional Areas (Value Statements)”.
  - Missing core SDD execution tables/structures: `housekeeping_items`, `register_checks`, `branch_details`, `fixed_assets`, `non_fund_facilities` (SDD p.26).
  - Missing audit team model: `audit_team_members` (SDD p.15).
  - Evidence model in current AEGIS is tied to `Observation` only (`Evidence` has `observationId`), but SDD needs evidence tied to **examination items** too (SDD p.24 and evidence attachment workflow p.35).

#### M4 — Reports

- **SDD key requirements:**
  - XLSX multi-tab report matching existing bank format (SDD p.38–39).
  - PDF report + executive summary report; BH certificate with signatures (SDD pp.28, 38–39).
  - Risk rating computation: weighted average across observation scores; repeat findings 1.5× weight (SDD p.39).
  - Routing: draft → reviewed → issued (implied and in plan).
- **Plan coverage:** **🟨 Partial** (Plan lines 166–173)
- **Gaps:**
  - Plan doesn’t state the **risk rating algorithm** nor how it maps to SDD’s score bands and weighting (SDD p.39).
  - Report generation depends on having the **correct underlying section data structures** (SDD pp.15–16, 37). Those are incomplete in plan.

#### M5 — Compliance Tracking

- **SDD key requirements:** `compliance_items` table with full lifecycle (Branch → ZAC → ACE → ACB), SLA/escalations, overdue computation, due_date, escalation_level (SDD pp.22, 40).
- **Plan coverage:** **🟨 Partial** (Plan lines 175–180)
- **Gaps:**
  - Plan does not specify an SDD-equivalent schema model (`compliance_items`). Current AEGIS has `ComplianceRequirement`, which is a recurring compliance obligation concept, not observation-to-closure tracking.
  - SDD compliance lifecycle stages and escalation rules are quite specific (SDD p.40). Plan says “configurable SLAs” but doesn’t define policy rules or defaults.

#### M6 — Analytics & Dashboards

- **SDD key requirements:** heat map, plan progress, compliance aging, distribution analytics, trend analysis, productivity, NPA movement waterfall, SLA performance (SDD p.41).
- **Plan coverage:** **🟨 Partial** (Plan lines 182–188)
- **Gaps:**
  - Several analytics depend on tables not in plan: compliance aging needs `compliance_items`; NPA movement needs SMA/NPA data across periods; productivity needs `audit_team_members` and section completion (SDD p.41).

#### M7 — Administration

- **SDD key requirements:** branch master with zone hierarchy, audit parameters/templates, notification templates, user/role mgmt (SDD p.29; also “supporting tables” include zones, report_templates; SDD p.26).
- **Plan coverage:** **🟨 Partial** (Plan line 188)
- **Gaps:**
  - No mention of **Zone** master or branch→zone mapping (SDD p.26 and branch schema p.13).
  - No explicit template/versioning system for report sections/checklists (SDD p.38 and p.37 template-driven checklists).

#### M8 — Enterprise Risk Register

- **SDD key requirements:** audit universe + enterprise risk register with entity_type/entity_id, inherent/residual risk, KRI definition/current value/breach status, linkage to controls and audit history (SDD pp.42–43).
- **Plan coverage:** **🟨 Partial** (Plan lines 203–209)
- **Gaps:**
  - Plan names models but doesn’t specify fields. Risk register in SDD is a single structured record (SDD p.42). Plan splits across `RiskRegister`, `RiskStatement`, `KeyRiskIndicator`—fine, but must preserve SDD’s linkage semantics and reporting needs.
  - SDD’s “What-if simulation” and configurable weighting layer (SDD p.43) are not mentioned.

#### M9 — Control Library & Work Programs

- **SDD key requirements:** control_library with attributes; test_procedures; work_program_items; control effectiveness analytics (SDD pp.44–45).
- **Plan coverage:** **🟨 Partial** (Plan lines 203–209)
- **Gaps:** field-level spec missing; also workpaper management linkage appears later in SDD (p.53) but not in plan.

#### M10 — Continuous Auditing

- **SDD requirements:** connectors/ETL, rules engine, data_exceptions, monitoring dashboards (SDD pp.46–47).
- **Plan coverage:** **🟥 Deferred (explicit)** (Plan lines 52–53, 239–241). ✅ Correctly identified as deferred.

#### M11 — AI Analytics

- **SDD requirements:** anomaly detection, NLP similarity, smart suggestions UI (SDD p.48).
- **Plan coverage:** **🟥 Deferred (explicit)** (Plan lines 52–53, 239–241). ✅ Correctly identified as deferred.

#### M12 — Issue & Action Management

- **SDD requirements:** unified issues across sources; fields include source, type, severity, root cause, owner, linked controls, partial closure, accepted risk, action plans with milestones/evidence/verified_by (SDD pp.49–50).
- **Plan coverage:** **🟨 Partial** (Plan lines 210–216)
- **Gaps:** model field requirements not stated; must ensure partial closure + accepted-risk are included.

#### M13 — Quality Management

- **SDD requirements:** self-assessment questionnaires, gap analysis to issues, external QA support, KPIs (SDD pp.55–56).
- **Plan coverage:** **🟨 Partial** (Plan lines 210–216)
- **Gaps:** KPI definitions exist in SDD; plan doesn’t state what data will be captured to compute them.

#### M14 — Unified Audit Universe & Calendar

- **SDD requirements:** audit universe entity table with required_frequency_months, audit_scope_types, surprise_required, etc (SDD p.58).
- **Plan coverage:** **🟨 Partial** (Plan lines 218–228)
- **Gaps:** SDD expects multiple audit types (RBIA/internal inspection/concurrent/IS) in one calendar with periodicity compliance (SDD p.58). Plan says “unified calendar” but doesn’t specify periodicity logic, surprise scheduling, or audit-type data model.

#### M15 — Concurrent Audit

- **SDD requirements:** scope templates, rapid entry UI, serious irregularity escalation, de-duplication with RBIA (SDD p.60).
- **Plan coverage:** **🟨 Partial** (Plan lines 218–228)

#### M16 — IRAC / Provisioning

- **SDD requirements:** loan_raw_imports + irac_computed_positions, deviation exceptions to issues, dashboards (SDD p.61).
- **Plan coverage:** **🟥 Deferred (explicit)** (Plan line 58 and 83–84). ✅ Correctly identified as deferred.

#### M17 — Investment / Treasury

- **SDD requirements:** SGL/CSGL recon, broker 5% cap, non-SLR cap, HTM/HFT/AFS classification, quarterly certification workflow (SDD p.62).
- **Plan coverage:** **🟨 Partial** (Plan lines 250–255)
- **Gap:** plan omits HTM/HFT/AFS classification and related analytics explicitly.

#### M18 — EDP / IS Audit

- **SDD requirements:** application inventory fields (visitorial rights, DR tested date, last IS audit date, criticality) + IS checklist engine + vendor risk tracking (SDD p.63).
- **Plan coverage:** **🟨 Partial** (Plan lines 257–262)
- **Gap:** plan is high-level; must ensure SDD-required fields/workflows are carried.

#### M19 — Regulatory Hub / Follow-up

- **SDD requirements:** regulatory observations table, ATR workflow/status, para mapping to internal issues (SDD p.64).
- **Plan coverage:** **🟨 Partial** (Plan lines 218–225)
- **Dependency:** relies on Issue model in Sprint 4B; schedule order within Wave 4 is OK.

#### M20 — Governance / Board

- **SDD requirements:**
  - ACB workspace + agenda builder (SDD p.67)
  - Board review calendar (SDD p.67)
  - Policy library + version history (SDD p.68)
  - Committee governance metadata: committees, members, meetings (SDD p.68)
  - RBI inspection support pack (one-click pack) (SDD p.69)
  - Risk management MIS dashboards (capital adequacy, asset quality, liquidity, investments, operational risk, concentration) (SDD pp.69–70)
- **Plan coverage:** **🟨 Partial** (Plan lines 225–228)
- **Gaps:** inspection support pack and risk MIS are not explicitly planned.

---

## 2) Schema Gap Analysis (SDD vs current Prisma vs plan)

### 2.1 Current Prisma schema vs SDD core tables

Below is the **minimum** SDD-aligned core that M1–M5 expect, and how it maps today.

| SDD table (page)                                   | SDD intent                                                                                                                                             | Current Prisma model | Status / Gap                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `branches` (SDD p.13)                              | branch master incl. zone/region, category, staff, business size, audit history, RAM score/frequency                                                    | `Branch`             | **Major gap**: current Branch lacks zone/region/address/branch_head_id/category/business_size_lakhs/staff_strength/is_currency_chest/is_forex_branch/last_audit_date/ram_composite_score/audit_frequency_months. Plan adds only `last_ram_score/risk_category/last_audit_rating` (Plan line 107). |
| `audits` (SDD p.14)                                | each audit visit: audit_number, type, visit_number, audit_period_from/to, planned/actual dates, lead auditor, overall risk rating/score, BH cert flags | `AuditEngagement`    | **Major gap**: missing audit_number, audit_type, visit_number, period_from/to, actual start/end, overall risk rating/score, BH certified flags. Plan adds a lead auditor + pre-audit + BH certificate status (Plan line 106) but still far from SDD.                                              |
| `audit_team_members` (SDD p.15)                    | many-to-many: users assigned to audits with section responsibility                                                                                     | (none)               | **Missing**. Current `AuditEngagement.assignedToId` is a single assignee and can’t represent a team.                                                                                                                                                                                              |
| `audit_sections` (SDD pp.15–16)                    | standardized section instances per audit, with status and `section_data` JSONB                                                                         | (none equivalent)    | **Missing/unclear**. Plan adds `AuditSection` but describes mapping to exam areas (Plan line 101), not to Excel tabs.                                                                                                                                                                             |
| `audit_observations` (SDD p.17)                    | observation rows with section_code, sr_no, risk score 1–5, particulars, amount, repeat finding link                                                    | `Observation`        | **Misfit**: current Observation uses condition/criteria/cause/effect/recommendation; no section*code/sr_no/amount_involved. If you keep Observation, you likely need a \_branch-audit observation subtype* or additional fields.                                                                  |
| `loan_reviews` (SDD p.17)                          | loan-account table with product, sanction, outstanding, asset class, dpd, etc                                                                          | (none)               | Plan adds `LoanReview` (Plan line 103).                                                                                                                                                                                                                                                           |
| `sma_npa_entries` (SDD p.18)                       | category-wise SMA/NPA summary per audit                                                                                                                | (none)               | Plan adds `SmaNpaEntry` (Plan line 104) but its description is “per loan”; SDD is category-wise table per audit.                                                                                                                                                                                  |
| `cash_checks` (SDD p.20)                           | one cash check per audit + denomination JSONB                                                                                                          | (none)               | Plan adds `CashCheck` (Plan line 105).                                                                                                                                                                                                                                                            |
| `ram_assessments` (SDD p.20)                       | annual RAM scores per branch + approvals                                                                                                               | (none)               | Plan adds `RamAssessment` (Plan line 97).                                                                                                                                                                                                                                                         |
| `ram_parameters` (SDD p.21)                        | parameter config: code, name, weight, scoring criteria JSONB, active                                                                                   | (none)               | Plan creates `RamParameter` but describes it as “19 individual parameter scores per assessment” (Plan line 98). This is a **semantic mismatch**: SDD separates _config_ (ram*parameters) from \_assessment scores*.                                                                               |
| `compliance_items` (SDD p.22)                      | per-observation compliance lifecycle with due_date and escalations                                                                                     | (none)               | **Missing**. `ComplianceRequirement` is not the same concept.                                                                                                                                                                                                                                     |
| `examination_areas/items/responses` (SDD pp.23–25) | master IA format + per-audit responses                                                                                                                 | (none)               | Plan adds `ExaminationArea`, `ExaminationItem`, `AuditExaminationResponse` (Plan lines 99–103).                                                                                                                                                                                                   |
| supporting: `zones` (SDD p.26)                     | zone master for ZAC reporting                                                                                                                          | (none)               | **Missing**.                                                                                                                                                                                                                                                                                      |
| supporting: `report_templates` (SDD p.26)          | configurable templates/versioning for sections                                                                                                         | (none)               | **Missing**. Plan mentions template management (Plan line 188) but no schema.                                                                                                                                                                                                                     |

### 2.1b SDD advanced/regulatory tables (M8–M20)

The plan **names** many Wave 4/6 domain objects (Plan lines 203–228, 245–263), but the SDD specifies additional concrete tables/columns and, more importantly, **cross-linking** between them (issues ↔ compliance ↔ regulatory obs ↔ governance packs).

### 2.1c Supporting tables & “already exists” mapping (SDD p.26 vs AEGIS)

The SDD lists a set of “supporting tables” (SDD p.26). Some concepts exist in AEGIS but often with **different semantics**:

| SDD supporting table (SDD p.26)                                                                                               | AEGIS current model(s)                                     | Alignment notes                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`                                                                                                                       | `User` (+ BetterAuth `Session`, `Account`, `Verification`) | Exists, but SDD assumes single-role + zone mapping; AEGIS uses `roles: Role[]` and currently has no Zone entity.                                   |
| `audit_logs`                                                                                                                  | `AuditLog`                                                 | Exists and is richer than SDD; ensure new models also emit audit logs.                                                                             |
| `notifications`                                                                                                               | `NotificationQueue`, `EmailLog`, `NotificationPreference`  | Exists, but SDD expects in-app read tracking (`is_read`) which AEGIS doesn’t currently model.                                                      |
| `audit_evidence`                                                                                                              | `Evidence`                                                 | Exists but is constrained to `observationId`; SDD needs evidence linked to examination items and compliance responses too.                         |
| `audit_plans`                                                                                                                 | `AuditPlan`                                                | **Semantic mismatch**: SDD’s `audit_plans` is an annual branch-frequency plan matrix; AEGIS `AuditPlan` is year+quarter container for engagements. |
| `housekeeping_items`, `register_checks`, `branch_details`, `fixed_assets`, `non_fund_facilities`, `report_templates`, `zones` | (none)                                                     | All missing and required for SDD-faithful M3/M7/M14/M20 workflows.                                                                                 |

| SDD table / concept (page)                                                                                               | Module              | Current Prisma | Plan mention                                                         | Gap / notes                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------- | -------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Enterprise risk register (entity_type/entity_id, inherent/residual scores, KRI current value & breach status) (SDD p.42) | M8                  | (none)         | `RiskRegister`, `RiskStatement`, `KeyRiskIndicator` (Plan line 204)  | Field-level spec missing; ensure entity registry linkage + KRI breach workflow.                                |
| Control library (control_code, process_area, key_control, mapping to COSO/ISO, linked risks) (SDD p.44)                  | M9                  | (none)         | `ControlLibrary`, `TestProcedure`, `WorkProgramItem` (Plan line 204) | Field-level spec missing; also needs runtime work-program completion/review tracking.                          |
| `data_exceptions` (exceptions from rules engine) (SDD p.47)                                                              | M10                 | (none)         | **Deferred** (Wave 5) (Plan lines 239–241)                           | OK to defer, but note downstream analytics assumptions in SDD.                                                 |
| `issues` + `action_plans` with partial closure + accepted risk (SDD pp.49–50)                                            | M12                 | (none)         | `Issue`, `ActionPlan` (Plan lines 210–214)                           | Must include accepted-risk and partial closure semantics; link issues to compliance + regulatory observations. |
| `audit_universe_entities` with audit_scope_types + periodicity + surprise flag (SDD p.58)                                | M14                 | (none)         | `AuditUniverseEntity` (Plan line 219)                                | Need data model to represent multiple audit types and periodicity compliance.                                  |
| IRAC staging + computed positions (SDD p.61)                                                                             | M16                 | (none)         | **Deferred** (Plan lines 83–84)                                      | OK to defer, but governance “inspection pack” in SDD expects IRAC deviation summaries (SDD p.69).              |
| Regulatory observation hub table (source/ref/para, ATR status/text, linked_issue_ids) (SDD p.64)                         | M19                 | (none)         | “Regulatory observation hub + ATR workflow” (Plan lines 223–225)     | Schema requirements not stated; must link to issues and governance packs.                                      |
| Governance: policy library + committees/members/meetings (SDD p.68)                                                      | M20                 | (none)         | “Policy library… Board committee governance” (Plan lines 225–227)    | Missing explicit table design; must support version history + minutes/report refs.                             |
| Housekeeping metrics + inter-bank exposure monitoring + regulatory_metrics feed (SDD pp.65–66, 69–70)                    | M20 (and analytics) | (none)         | Not mentioned                                                        | SDD treats these as Board/RMC dashboards; plan currently omits the data model entirely.                        |

### 2.2 Plan-proposed schema: critical corrections needed

1. **Split RAM config vs RAM scores (SDD p.21):**
   - Keep `RamParameterConfig` (code, name, weight, criteria, max score, active)
   - Keep `RamAssessment` (per branch/year)
   - Keep `RamAssessmentScore` (assessment_id + param_config_id + score)

   The plan currently conflates this (Plan line 98).

2. **Introduce an audit team join model (SDD p.15) early (Wave 1):**
   - `AuditTeamMember { engagementId, userId, roleInEngagement, assignedSectionCodes[]/JSON }`

3. **Clarify “Sections” vs “Functional Areas”:**
   - `AuditSectionInstance` for SDD’s Excel tabs (SDD pp.15–16)
   - `ExaminationArea/Item` for value statements (SDD pp.34–36)

4. **Add the missing M3 section tables or a general section_data model:**
   - Either implement SDD’s approach (`audit_sections.section_data` JSONB) or create explicit tables for BranchDetails, RegisterChecks, HousekeepingItems, NonFundFacilities, FixedAssets, StaffMatters, etc (SDD p.26).

5. **Create `ComplianceItem` (SDD p.22) and link it 1:1 with branch-audit observations.**

6. **Evidence model must be generalized:** current `Evidence` requires `observationId`. SDD needs evidence at least for examination responses (SDD p.24) and for compliance items (branch evidence files, SDD p.22).

---

## 3) Role & RBAC Analysis (SDD 11 roles vs plan)

### 3.1 SDD roles (11)

SDD enumerates the following personas/roles (SDD p.8):

1. Field Auditor
2. Lead Auditor
3. Branch Head
4. Zonal Auditor
5. IAD Manager
6. ACE Officer
7. ACB Member
8. Concurrent Auditor
9. IS/EDP Auditor
10. Risk Head / RMC Member
11. System Admin

### 3.2 Current roles in Prisma

Current `Role` enum has 7: `AUDITOR, AUDIT_MANAGER, CAE, CCO, CEO, AUDITEE, BOARD_OBSERVER`.

### 3.3 Plan role changes: issues

- Plan says “**New Roles Needed (4 additions)**” but lists **8** roles (Plan lines 64–72). This is a plan correctness bug.
- The plan proposes incremental role enum extension (Plan line 74), which is fine, but only if you also define **permission policies** (what each role can do per module + per record scope).

### 3.4 Suggested mapping (must be made explicit)

| SDD role           | Closest current role |            Plan adds? | Key permission scope required (SDD p.8 + module specs)                     | Gap risk                                                    |
| ------------------ | -------------------- | --------------------: | -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Field Auditor      | AUDITOR              |   Yes (FIELD_AUDITOR) | Assigned audits only; section entry; evidence upload; cannot approve/issue | Need record-level scoping by engagement/team membership     |
| Lead Auditor       | AUDIT_MANAGER or CAE |    Yes (LEAD_AUDITOR) | Full engagement mgmt; review/submit; generate report; close fieldwork      | Requires audit_team_members + review workflow               |
| Branch Head        | AUDITEE              |     Yes (BRANCH_HEAD) | Own branch audits only; respond, upload evidence; BH certificate sign      | Needs branch→user assignment and sign-off capture           |
| Zonal Auditor      | AUDIT_MANAGER?       | Later (ZONAL_AUDITOR) | Zone-level compliance review (ZAC stage)                                   | Requires Zone model + branch.zone                           |
| IAD Manager        | CAE                  | No (assumes existing) | Planning/config; RAM compute approval; dashboards                          | Must ensure CAE has these permissions                       |
| ACE Officer        | CCO?                 |         Not mentioned | Compliance processing/ACB pack prep                                        | Missing explicit role mapping & UI scoping                  |
| ACB Member         | BOARD_OBSERVER       |      Yes (ACB_MEMBER) | Oversight dashboards; approvals; agenda/committee workflows                | Must avoid giving global write to BOARD_OBSERVER by mistake |
| Concurrent Auditor | (none)               |                   Yes | Scope-limited entry; serious irregularity escalation                       | Needs dedicated module permissions                          |
| IS/EDP Auditor     | (none)               |          Yes (Wave 6) | IS audit checklists + app inventory                                        | Must not expose branch RBIA data broadly                    |
| Risk Head / RMC    | CEO/CCO?             |       Yes (RISK_HEAD) | Read-only risk MIS dashboards                                              | Need separate “risk views” and data minimization            |
| System Admin       | (none)               |         Not mentioned | System config/master data/tenants                                          | Missing; today “admin” is implicit in CAE? risk.            |

**RBAC missing requirement:** SDD explicitly calls for segregation and function-level RBAC (SDD p.72). Plan’s DoD checklist says “RBAC enforced” (Plan line 359) but doesn’t specify the policy matrix.

---

## 4) Wave Dependency Validation

### 4.1 Claimed dependencies

- Wave 2 depends on Wave 1 (Plan lines 126–129): reasonable.
- Wave 3 depends on Wave 2 (Plan line 164): reasonable.
- Wave 4 depends on Wave 3 (Plan line 201): reasonable.

### 4.2 Hidden dependencies and sequencing risks

1. **RAM depends on M4/M5 outputs** (SDD p.32):
   - RAM parameter “Previous Audit Rating” and “Compliance of Previous Audit” require (a) risk rating computation (M4, SDD p.39) and (b) compliance closure metrics (M5, SDD p.40).
   - Plan schedules RAM in Wave 1 (Plan lines 89–117) and compliance/reporting in Wave 3 (Plan lines 161–189).
   - **Mitigation options:**
     - (Preferred) Move minimum viable risk-rating + compliance stats computation earlier, or
     - Allow manual input/stubs for those parameters in Wave 1, with explicit “Phase 1 RAM v0” definition.

2. **Pre-audit skill matching depends on skills matrix** (SDD p.51):
   - Plan includes skill matching in Wave 2 (Plan line 133) but “skills matrix” is listed under admin gaps (Plan line 49) and not scoped to any sprint.

3. **Execution offline support depends on PWA infrastructure**:
   - SDD details offline (IndexedDB/service workers) (SDD p.37, also PWA module p.53).
   - Plan claims offline in Wave 2 (Plan line 142) but has no PWA wave.

4. **Compliance workflow depends on org hierarchy (zones)**:
   - ZAC stage requires zone mapping (SDD p.22 + zone table listed in supporting tables p.26).
   - Plan does not include Zone model in Wave 1.

5. **Wave 4 intra-wave dependency:**
   - Sprint 4C (Regulatory hub) depends on Issues/ActionPlans (Sprint 4B). This is OK if executed in-order, but if sub-agents do parallel work, enforce the order.

### 4.3 Circular dependencies

No strict circular dependency in the plan as written, but **RAM ↔ compliance ↔ risk rating** creates a feedback loop in the SDD. Define which version is authoritative in early waves.

---

## 5) Risk & Feasibility (sub-agent execution realism)

### 5.1 Overloaded sprints/waves

- **Wave 1 is overloaded**:
  - It combines: new roles + 9 new models + seed 220+ items + audit/branch extensions + RAM engine + UI + tests (Plan lines 94–117).
  - Risk: migration + seed + engine + UI + tests in one conceptual wave will spill.
- **Wave 3 is also very heavy**:
  - M4 reports (multiple templates + routing) + M5 multi-level compliance with escalation engine + M6 analytics + M7 admin (Plan lines 166–189).

### 5.2 Critical path

**Critical path** to an SDD-faithful “core RBIA” is:

1. Correct audit domain schema (audits/sections/team) + RAM basics
2. Execution forms + value statements + observations/evidence model
3. Report generation (XLSX) + risk rating
4. Compliance lifecycle + escalation

If Wave 1 ships a misaligned schema, everything downstream will be rework.

### 5.3 Sub-agent constraints / risk areas

- **Seed data (220+ items) correctness** is a domain/data task, not just “seed script.” Needs verification harness.
- **Offline support** in Next.js is non-trivial (service worker, caching strategy, conflict resolution). Very risky for a single sprint unless explicitly scoped.
- **Compliance workflows** are policy-heavy: SLA clocks, escalation triggers, audit trail, notifications; must be tested with time-travel/fake timers.

---

## 6) SDD vs AEGIS Stack Gaps (React+Express+JWT+MinIO vs Next.js+BetterAuth+S3)

### 6.1 Where the AEGIS stack makes SDD features _different/harder_

- **Offline-first execution** (SDD p.37, p.53): Next.js App Router + Server Actions does not automatically give offline sync; you still need a PWA/service worker + local persistence + conflict strategy.
- **API design assumptions:** SDD’s REST API (SDD p.12) vs plan’s Server Actions (Plan lines 304–313). This is fine, but you must ensure:
  - audit logging, RBAC middleware equivalents,
  - stable integration points for future CBS connectors (even if deferred),
  - background jobs for report generation if needed.
- **JWT vs cookie sessions:** SDD expects JWT w/ refresh tokens (SDD p.10–12; NFR security p.71). BetterAuth cookie sessions are OK, but may complicate mobile/offline patterns.

### 6.2 Where the AEGIS stack improves upon SDD

- Existing multi-tenant primitives already exist (`Tenant`, roles array on `User`, notification queue, audit log, dashboards).
- Using S3 over MinIO reduces infra burden while remaining S3-compatible.

### 6.3 SDD integration / "Open API layer" expectations vs plan

The SDD expects explicit integration points (ERM, ITSM, HRMS/IAM via SCIM/LDAP/SAML, regulatory reporting exports, CBS connectors, document management via WebDAV/REST) (SDD p.52). The plan does **not** mention an integration layer/API surface beyond internal server actions.

**Risk:** deferring M10/M11 is fine, but you still want an **integration-friendly boundary** early (stable internal APIs, eventing/webhooks, background jobs), otherwise later CBS/ERM connectors become a rewrite.

---

## 7) Missing Items (SDD features not covered or under-specified)

### 7.1 Major functional misses vs SDD

1. **Zones/region hierarchy** (SDD p.13 + supporting table zones p.26) — required for ZAC workflow and zone dashboards.
2. **Full section set for audit execution** (SDD pp.28–38; supporting tables p.26) — housekeeping/register/branch_details/non-fund/fixed-assets/staff-matters etc.
3. **Data migration strategy and tooling** (SDD p.79) — plan has no wave/sprint for importing historical Excel audits.
4. **Inspection support pack + risk MIS dashboards** (SDD pp.69–70) — not explicitly planned.
5. **GRC integration / open API layer** (SDD p.52) — plan does not mention.
6. **Multi-entity audits + geography-aware scheduling** (SDD p.51) — not in plan.
7. **Template/versioning governance for RAM parameters and checklists** (SDD p.71 security change-management) — plan mentions seed data but not approval workflow/versioning.

### 7.2 Non-functional requirements not addressed in plan

SDD NFRs include performance, scalability, security, encryption, DR/backup, observability, retention, exportability (SDD pp.71–72). Plan only lightly mentions performance/indexing and tenant isolation (Plan lines 342–365).

**At minimum**, add to plan:

- Field-level encryption / masking for sensitive identifiers (SDD p.71).
- Retention policy implementation (8y/10y) and audit-log immutability guarantees beyond application logic (SDD p.71–72).
- Backup/DR approach and monitoring/alerting.

### 7.3 Data migration considerations

SDD’s migration appendix (SDD p.79) expects an import utility that parses 13–16 sheet workbooks and produces a migration report. The plan should reserve a sprint (or explicit acceptance criteria in Wave 3/4) for:

- Schema mapping decisions (especially observations/sections)
- Import pipeline + validations + idempotency
- Audit log entries for imported data

### 7.4 Mobility / collaboration / workpapers (explicit SDD scope not planned)

The SDD includes substantial “Mobility, UX & productization” scope: PWA/mobile evidence capture (photo/video/voice), push notifications, electronic workpaper management with version history and export packs, inline comments/review notes, real-time presence, and multilingual support (SDD pp.53–54). The plan mentions offline autosave in Wave 2 (Plan line 142) but **does not plan** these broader capabilities.

**Decision needed:** either explicitly defer this whole capability-set (and remove “offline support” claims from Wave 2), or add a dedicated wave/sprint for PWA + workpapers + collaboration.

---

## Concrete plan edits (recommended)

### A) Amend Wave 1 scope (reduce risk, fix primitives)

1. Add core schema missing pieces **before** RAM/execution UI:
   - `Zone`
   - `AuditTeamMember`
   - `AuditSectionTemplate` + `AuditSectionInstance` (or SDD JSONB `section_data` approach)
   - RAM config vs RAM score separation
2. Define “RAM v0” explicitly: which of the 19 parameters are computable in Wave 1 and which are manual/placeholder until Wave 3.

### B) Amend Wave 2 (execution)

- Add missing section capture strategy (either per-table or section_data JSONB) for the remaining SDD sections.
- Plan evidence model refactor to support attachments to examination items and compliance responses.
- If offline is a must-have: add PWA tasks (service worker, IndexedDB, sync/conflict rules) and test plan.

### C) Amend Wave 3 (report/compliance)

- Specify risk rating algorithm and ensure required fields exist (SDD p.39).
- Add `ComplianceItem` model and default SLA/escalation rules (SDD p.40).

### D) RBAC deliverable

- Add an explicit role→permission matrix and record-scoping rules (assigned audits, own branch, zone-level, etc.), plus automated tests.

---

## Final verdict

**Not approved for execution as-is.** The plan needs targeted corrections to core schema + RBAC + hidden dependencies. With those adjustments, the wave approach is workable and consistent with AEGIS stack constraints.
