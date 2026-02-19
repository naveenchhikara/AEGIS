# RBIAS v3.0 — Plan vs Implementation Validation Report

_Generated: 2026-02-18_

## Legend

- ✅ Implemented end-to-end (schema + server logic + UI/workflow)
- ⚠️ Partially implemented (schema exists but workflow/UI incomplete, or security/config gaps)
- ❌ Not implemented

## Executive Summary

Strongest coverage is **Phase 1 RAM + audit execution (examination areas/items, per-item responses, auto-observation creation)** and **Phase 2 reporting/analytics/compliance basics** (XLSX/PDF generators, ZAC review, analytics dashboards, notification job infrastructure).

Major gaps remain in **annual audit plan generation**, **cash/loan/NPA section forms**, **report routing + BH digital sign-off**, and most of **Phase 3–6** which are present in schema/actions but still **UI-stubbed (mock arrays)** and not wired into a usable workflow.

Several admin actions (calendar/templates) bypass the tenant-scoped DAL pattern and miss tenant filters on update/delete — this is a **P0 multi-tenant data isolation risk**.

## Build Inventory Checks (Plan vs Build Sanity)

- **Prisma schema:** 63 models found (matches plan).
- **Roles:** 17 roles in `Role` enum (matches plan) and all are present in `ROLE_PERMISSIONS`.
  - `BOARD_OBSERVER` is effectively read-only (no permissions) and is excluded from `getAssignableRoles()`.
- **Orphan / unused Prisma models (in `src/` code):** `Verification`, `ObservationRbiCircular`.
- **Routes with mock/stub data despite schema/actions existing:** `/audit-plans`, `/controls`, `/work-program`, `/issues`, `/risk-management`, `/qa-assessment`, `/governance`, `/investments`, `/is-audit`, `/regulatory`.

## 1) Requirement-by-Requirement Status (R1–R104)

| ID   | Requirement                                                                                                                           | Status | Evidence / Notes                                                                                                         |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| R1   | Extend Role enum: LEAD_AUDITOR, FIELD_AUDITOR, BRANCH_HEAD                                                                            | ✅     | Role enum has LEAD_AUDITOR/FIELD_AUDITOR/BRANCH_HEAD; RBAC entries exist.                                                |
| R2   | Zone model with branch→zone mapping                                                                                                   | ⚠️     | Zone model + Branch.zoneId exist; onboarding/org structure lacks zone capture/UI.                                        |
| R3   | Extend Branch: zone, category, business_size, staff_strength, ram_score, audit_frequency, last_audit_date/rating                      | ⚠️     | Branch has some fields; onboarding BranchEntry lacks category/business_size/staff_strength; no branch profiling UI.      |
| R4   | RamParameterConfig table: 19 params with code, name, weight, scoring_criteria JSONB, max_score                                        | ⚠️     | ramParameterConfig model + seed (ram-parameters.json) + DAL; no admin UI to manage configs.                              |
| R5   | RamAssessment table: per branch/year with composite_score, risk_category, computed_by/approved_by                                     | ✅     | RAM assessment lifecycle implemented (create/save/compute/approve) + UI /ram/[assessmentId].                             |
| R6   | RamAssessmentScore table: assessment_id + param_config_id + score (separate from config)                                              | ✅     | Separate RamAssessmentScore persisted; used by RamScoreForm.                                                             |
| R7   | RAM computation service: weighted scoring, composite calculation, frequency derivation                                                | ✅     | ram-engine computes weighted composite + category + frequency.                                                           |
| R8   | Frequency rules: >3.5→12mo, 2.5-3.5→18mo, <2.5→24mo (configurable)                                                                    | ⚠️     | Thresholds hardcoded in ram-engine (12/18/24); not tenant-configurable.                                                  |
| R9   | Annual audit plan generator with auto-scheduling from RAM + last_audit_date                                                           | ❌     | /audit-plans uses mock data; no generator action/cron found.                                                             |
| R10  | AuditTeamMember join model: engagement_id, user_id, role_in_engagement, assigned_sections                                             | ⚠️     | AuditTeamMember model + assign/remove actions; UI has placeholder user select and no section allocation.                 |
| R11  | Extend AuditEngagement: audit_number, audit_type, visit_number, period_from/to, actual_start/end, overall_risk_rating, bh_cert fields | ⚠️     | Schema fields exist; no engagement create/edit UI; BH cert fields not used in workflow.                                  |
| R12  | Pre-audit branch profiling: last audit data, RAM score, prior findings summary                                                        | ❌     | No dedicated branch profiling page/aggregation (prior findings/RAM summary) for pre-audit.                               |
| R13  | Pre-audit team assignment with section allocation                                                                                     | ⚠️     | TeamPanel exists but cannot select real users; assignedSections unused.                                                  |
| R14  | ExaminationArea table: 25 areas with code, name, risk_weight, display_order                                                           | ✅     | ExaminationArea seeded from JSON; initializeSections creates AuditSectionInstances from active areas.                    |
| R15  | ExaminationItem table: 239 items with area_id, item_number, particulars, risk_category, regulatory_ref                                | ✅     | ExaminationItem seeded (239 items); used in section pages.                                                               |
| R16  | AuditExaminationResponse: audit_id + item_id + status (compliant/non-compliant/partial/na) + observation + evidence_refs              | ⚠️     | AuditExaminationResponse exists; action schema omits evidence refs; evidence relation not wired.                         |
| R17  | Auto-create Observation from non-compliant examination response                                                                       | ✅     | submit-examination-response auto-creates linked Observation for NON_COMPLIANT.                                           |
| R18  | AuditSectionInstance: per-engagement section instances (Excel tab equivalent) with section_data JSONB + status                        | ⚠️     | AuditSectionInstance exists + UI tabs/status; sectionData/assignedTo not implemented.                                    |
| R19  | CashCheck model: cash_in_hand, book_balance, diff, ATM balances, retention_limit, denomination_data JSONB                             | ❌     | CashCheck model only; no actions/pages to capture cash verification.                                                     |
| R20  | LoanReview model: account_no, borrower, product, sanction, outstanding, asset_class, dpd, audit_observation                           | ❌     | LoanReview model only; no CRUD/UI; no CSV import.                                                                        |
| R21  | SmaNpaEntry model: category-wise SMA/NPA summary per audit (not per loan)                                                             | ❌     | SmaNpaEntry model only; no entry UI/ingest.                                                                              |
| R22  | Section-based execution UI with 25 functional area tabs                                                                               | ✅     | /audit-execution/[id]/sections/[code] supports per-area execution via tabs.                                              |
| R23  | Per-item examination response form (status + observation + risk + evidence)                                                           | ⚠️     | ExaminationForm captures status/observation/riskRating; missing evidence upload/refs.                                    |
| R24  | Cash verification form with denomination-level capture                                                                                | ❌     | No cash verification UI incl denomination capture.                                                                       |
| R25  | Loan review form with bulk CSV import                                                                                                 | ❌     | No loan review UI; no CSV import pipeline.                                                                               |
| R26  | BH Certificate workflow with digital sign-off                                                                                         | ❌     | PDF renders BH certificate block, but no digital sign-off workflow/UI.                                                   |
| R27  | Evidence model generalization: support evidence on examination items, not just observations                                           | ⚠️     | Evidence model generalized and related to AuditExaminationResponse; no upload/attach flows.                              |
| R28  | Seed data: 19 RAM params + 25 exam areas + 239 exam items                                                                             | ✅     | Seed script seeds RAM params + exam areas/items.                                                                         |
| R29  | XLSX multi-tab report (13+ sheets) matching existing bank audit format                                                                | ✅     | generate-xlsx action produces multi-tab workbook (>=13, actually 30+ sheets).                                            |
| R30  | PDF summary report with executive summary + BH Certificate                                                                            | ⚠️     | generate-pdf exists; BH certificate section is static; no signature fields.                                              |
| R31  | Risk rating computation: weighted avg of observation scores, 1.5× repeat multiplier                                                   | ✅     | RiskRatingService uses severity weights with 1.5× repeat multiplier; action updates engagement.                          |
| R32  | Rating bands: Poor ≤40%, Moderate 40-50%, Satisfactory 50-65%, Good 65-80%, Very Good >80%                                            | ✅     | Rating bands implemented in RiskRatingService.                                                                           |
| R33  | Report routing workflow: draft → reviewed → approved → issued                                                                         | ❌     | No report entity/workflow for draft→reviewed→approved→issued.                                                            |
| R34  | ComplianceItem model: observation_id (1:1), audit_id, branch_id, status, due_date, escalation_level, days_open                        | ✅     | ComplianceItem model + create/branch response/ZAC review actions + UI table.                                             |
| R35  | Branch response portal: submit response + evidence within 30-day SLA                                                                  | ⚠️     | Branch response form exists; evidence stored as string[] (no file storage); SLA dueDate set at creation time.            |
| R36  | ZAC review stage: accept/reject/request info at zone level                                                                            | ✅     | ZAC review workflow implemented (approve/reject/request info).                                                           |
| R37  | ACE processing: quarterly cycle, prepare ACB report                                                                                   | ❌     | No ACE quarterly processing pipeline/job/UI.                                                                             |
| R38  | ACB reporting: board meeting cycle, consolidated view                                                                                 | ❌     | No ACB consolidated reporting UI/workflow; board report job handler is placeholder.                                      |
| R39  | Escalation engine: L1 (+15d email), L2 (+30d ZAC), L3 (+90d ACE), L4 (+180d ACB)                                                      | ⚠️     | escalation-engine + compute action update levels; lacks automated email/escalation routing per level.                    |
| R40  | Repeat finding 1.5× risk weight in next RAM computation                                                                               | ❌     | Repeat findings detection exists but not used to adjust next RAM computation.                                            |
| R41  | Add ZONAL_AUDITOR role for ZAC workflow                                                                                               | ✅     | ZONAL_AUDITOR role present in Role enum + permissions.                                                                   |
| R42  | Branch risk heatmap with real RAM data                                                                                                | ✅     | Analytics branch heatmap implemented via DAL + UI.                                                                       |
| R43  | Audit plan progress dashboard                                                                                                         | ✅     | Audit plan progress chart implemented in analytics.                                                                      |
| R44  | Compliance aging analysis                                                                                                             | ✅     | Compliance aging analytics implemented in analytics.                                                                     |
| R45  | Finding trend analysis (cross-period)                                                                                                 | ✅     | Finding trend analytics implemented in analytics.                                                                        |
| R46  | NPA movement waterfall                                                                                                                | ⚠️     | DAL function exists (getNpaMovement) but no dashboard/widget/page uses it; no SMA/NPA data capture.                      |
| R47  | Audit calendar management                                                                                                             | ✅     | Audit calendar page + create/delete actions; delete uses base prisma without tenant guard (security gap).                |
| R48  | Template management for report sections/checklists with versioning                                                                    | ⚠️     | ReportTemplate model + versioning action; no /admin/templates UI; actions lack tenant checks on update.                  |
| R49  | AuditUniverseEntity: entity_type, name, branch_id, risk_score, last_audit_date/rating, required_frequency                             | ⚠️     | AuditUniverseEntity model + manage-entity action; risk-management UI is mock.                                            |
| R50  | RiskRegister: entity linkage, risk_statement, inherent/residual scores, risk_owner                                                    | ⚠️     | RiskRegister model + manage-risk action; UI is mock.                                                                     |
| R51  | KeyRiskIndicator: KRI definition, current_value, threshold, breach_status                                                             | ⚠️     | KRI engine + models/actions exist; risk-management UI is mock.                                                           |
| R52  | Risk-to-audit linkage: thematic mapping across entities                                                                               | ❌     | No implemented linkage/mapping layer between risks and audit plan/engagement selection.                                  |
| R53  | What-if simulation for audit planning                                                                                                 | ❌     | No what-if simulation UI/engine.                                                                                         |
| R54  | ControlLibrary: control_code, process_area, type, frequency, owner, key_control, framework_mapping                                    | ⚠️     | ControlLibrary model + manage-control action; /controls page uses mock data.                                             |
| R55  | TestProcedure: linked to controls, sample_methodology, expected_evidence, pass_criteria                                               | ⚠️     | TestProcedure model used by generateWorkProgram; no UI for procedure management.                                         |
| R56  | WorkProgramItem: per-engagement, linked to test_procedure, assigned_to, status, result                                                | ⚠️     | WorkProgramItem model + execute-item/generate actions; /work-program page uses mock.                                     |
| R57  | Auto-generate work program on audit initiation                                                                                        | ⚠️     | Generate action exists; not auto-triggered on engagement initiation; no UX flow.                                         |
| R58  | Control effectiveness analytics (trends, heatmaps)                                                                                    | ⚠️     | control-effectiveness lib exists; no analytics UI/queries for trends/heatmaps.                                           |
| R59  | Issue model: unified across sources (internal/regulatory/external/self-assessment)                                                    | ⚠️     | Issue model + actions exist; /issues page uses mock.                                                                     |
| R60  | Issue fields: source, type, severity, root_cause, risk_theme, linked_controls, linked_compliance                                      | ⚠️     | Schema supports fields; UI/actions do not cover full linkage (controls/compliance relationships) end-to-end.             |
| R61  | ActionPlan: per-issue milestones, partial closure, evidence, verified_by                                                              | ⚠️     | ActionPlan model + manage-action-plan; no UI and evidence workflow missing.                                              |
| R62  | Accepted risk tracking with formal management sign-off                                                                                | ⚠️     | accept-risk action exists; no UI/workflow for management sign-off.                                                       |
| R63  | Consolidated Board view of all open issues across sources                                                                             | ❌     | No board-level consolidated issues dashboard.                                                                            |
| R64  | QA self-assessment questionnaires mapped to IIA Standards                                                                             | ⚠️     | QAAssessment models/actions exist; /qa-assessment page uses mock.                                                        |
| R65  | Gap-to-issue conversion from quality assessments                                                                                      | ⚠️     | gap-to-issue action exists; no UI automation from QA results.                                                            |
| R66  | Internal audit effectiveness KPIs (10 metrics)                                                                                        | ❌     | No full set of 10 IA effectiveness KPIs implemented as metrics/widgets.                                                  |
| R67  | Audit Function Health dashboard                                                                                                       | ❌     | No dedicated Audit Function Health dashboard beyond partial dashboard widgets.                                           |
| R68  | Add ACE_OFFICER role                                                                                                                  | ✅     | ACE_OFFICER role present.                                                                                                |
| R69  | Audit universe entity registry (branch, department, process, channel, vendor)                                                         | ⚠️     | Same as R49; registry concept not surfaced in UI.                                                                        |
| R70  | Unified calendar: RBIA + concurrent + IS/EDP + statutory with periodicity                                                             | ⚠️     | Calendar supports eventType; lacks periodicity rules + integration with audit plans/templates.                           |
| R71  | Surprise audit scheduling support                                                                                                     | ❌     | No surprise-audit scheduling UX or generator.                                                                            |
| R72  | Add CONCURRENT_AUDITOR role                                                                                                           | ✅     | CONCURRENT_AUDITOR role present.                                                                                         |
| R73  | Concurrent audit scope templates (cash, investments, advances, off-BS, deposits, KYC, EDP)                                            | ⚠️     | Concurrent audit templates actions exist; no UI routes.                                                                  |
| R74  | Rapid observation entry workbench for concurrent auditors                                                                             | ⚠️     | rapid-entry action exists; no UI routes.                                                                                 |
| R75  | Serious irregularity escalation with auto-routing                                                                                     | ⚠️     | escalate-irregularity action exists; no UI routes; notification type reused.                                             |
| R76  | De-duplication: concurrent findings surface in RBIA planning                                                                          | ❌     | No de-dup surfacing of concurrent findings into RBIA planning.                                                           |
| R77  | RegulatoryObservation model: source, reference_no, para_no, severity, ATR status                                                      | ⚠️     | RegulatoryObservation model + actions exist; /regulatory page uses mock.                                                 |
| R78  | ATR workflow: draft → submitted → accepted/further_info                                                                               | ⚠️     | ATR transitions supported in actions; UI missing.                                                                        |
| R79  | Para-to-issue mapping for internal tracking                                                                                           | ❌     | No para-to-issue mapping workflow tying RegulatoryObservation → Issue.                                                   |
| R80  | Housekeeping risk metrics (inter-branch, suspense, clearing)                                                                          | ⚠️     | HousekeepingMetric model exists; no capture UI; used indirectly by non-SLR cap check.                                    |
| R81  | ACB workspace with consolidated dashboards                                                                                            | ❌     | No ACB workspace dashboards.                                                                                             |
| R82  | ACB agenda builder: auto-generated quarterly packs                                                                                    | ⚠️     | build-acb-agenda action exists; board report generation handler is placeholder; UI missing.                              |
| R83  | Board review calendar with RBI-mandated items                                                                                         | ❌     | No board review calendar with mandated items.                                                                            |
| R84  | PolicyDocument model: name, category, approval_date, review_due, version history                                                      | ⚠️     | PolicyDocument model + manage-policy action; governance UI is mock.                                                      |
| R85  | Committee governance: committees, members, meetings, minutes_ref                                                                      | ⚠️     | Committee/Meeting models + manage-committee action; governance UI is mock.                                               |
| R86  | RBI inspection support pack (one-click 9-component report)                                                                            | ❌     | No one-click RBI inspection support pack.                                                                                |
| R87  | Risk management MIS dashboards (CRAR, asset quality, liquidity, investment, operational)                                              | ⚠️     | Dashboard has generic metrics; no CRAR/liq/asset-quality MIS suite.                                                      |
| R88  | Inter-bank exposure monitoring (20% total, 5% per-bank)                                                                               | ❌     | No inter-bank exposure monitoring logic/models/UI.                                                                       |
| R89  | Add IS_AUDITOR role                                                                                                                   | ✅     | IS_AUDITOR role present.                                                                                                 |
| R90  | Add RISK_HEAD role                                                                                                                    | ✅     | RISK_HEAD role present.                                                                                                  |
| R91  | Add ACB_MEMBER role (upgrade from BOARD_OBSERVER)                                                                                     | ✅     | ACB_MEMBER role present.                                                                                                 |
| R92  | Add SYSTEM_ADMIN role                                                                                                                 | ✅     | SYSTEM_ADMIN role present.                                                                                               |
| R93  | SGL/CSGL reconciliation tracking                                                                                                      | ⚠️     | InvestmentRecord model supports SGL/CSGL; manage-records action exists; UI missing; tenant checks incomplete on updates. |
| R94  | Broker compliance analytics (5% cap per broker)                                                                                       | ⚠️     | Broker concentration check implemented; depends on investment data; no UI/analytics view.                                |
| R95  | Non-SLR investment cap monitoring (10% of deposits)                                                                                   | ⚠️     | Non-SLR cap check implemented; requires TOTAL_DEPOSITS housekeeping metric; no UI for deposits.                          |
| R96  | HTM/HFT/AFS classification audit checklist                                                                                            | ❌     | No dedicated HTM/HFT/AFS checklist templates/UI.                                                                         |
| R97  | Quarterly auditor certification workflow for investments                                                                              | ❌     | No quarterly investment certification workflow.                                                                          |
| R98  | ApplicationInventory model: app_name, vendor, version, hosting, criticality, dr_tested, last_is_audit                                 | ⚠️     | ApplicationInventory model + action exists; UI missing.                                                                  |
| R99  | IS audit checklists: CBS, channels, access, BCP/DR, vendor, change mgmt                                                               | ⚠️     | IS audit checklist action exists; UI missing; no seeded checklists.                                                      |
| R100 | Vendor risk tracking with SLA compliance                                                                                              | ⚠️     | VendorRiskAssessment action exists; UI missing.                                                                          |
| R101 | CBS parameter audit items (interest rates, product masters, privileges)                                                               | ❌     | No CBS parameter audit questionnaire set/engine.                                                                         |
| R102 | Add IS_AUDITOR role with scoped access                                                                                                | ✅     | IS_AUDITOR role + permissions exist.                                                                                     |
| R103 | Cyber security checklist (122 questionnaires / 25 baseline controls)                                                                  | ⚠️     | Checklist category exists but no 122-question baseline controls set.                                                     |
| R104 | Technology control evidence collection and gap analysis                                                                               | ❌     | No tech control evidence collection + gap analysis workflows.                                                            |

## 1b) Deferred Requirements (D1–D26)

All deferred items are correctly out-of-scope for this build.

| ID      | Status | Notes                                                             |
| ------- | ------ | ----------------------------------------------------------------- |
| D1–D12  | ⏸️     | CBS connectors/ETL/rule engine depend on external feeds.          |
| D13–D18 | ⏸️     | AI/ML anomaly detection and smart suggestions deferred.           |
| D19–D26 | ⏸️     | IRAC/NPA/provision recomputation needs loan-level data pipelines. |

## 2) Gap Analysis (What is Missing / Incomplete)

### Core audit planning & execution

- **R9 Annual audit plan generator** is missing; `/audit-plans` page uses mock data and there is no server action to generate plans from RAM + last audit dates.
- **R19/R20/R21/R24/R25** section-specific forms (CashCheck, LoanReview, SMA/NPA summaries) exist only as Prisma models.
- **Evidence workflow (R16/R27)** is not wired: `AuditExaminationResponse` relates to `Evidence`, but examination response submission schema/actions/UI do not accept/upload/attach evidence.

### Reporting workflow

- **R33 report routing** is not implemented (no report entity/workflow).
- **BH digital certificate workflow (R26)** is not implemented (no signer identity, signature capture, or state transitions; PDF section is static).

### Compliance lifecycle & escalations

- Compliance/ZAC stages exist, but **ACE/ACB stages (R37/R38)** are not implemented beyond schema fields.
- Escalation computation exists (R39) but lacks **scheduled automation + level-specific routing/emails** per SDD.
- **Repeat finding uplift into RAM (R40)** is not implemented.

### Phase 3–6 breadth vs depth

- Many Phase 3–6 modules have schema + actions, but dashboard pages still use **mock arrays** (risk management, control library, work program UI, issues, QA, governance, investments, IS audit, regulatory).
- Concurrent audit features (R73–R75) exist as server actions but have **no routes/UI**.

## 3) Quality Observations

### Multi-tenant isolation inconsistencies (P0)

- Canonical pattern uses `prismaForTenant()` + explicit `tenantId` filters, but several actions use base `prisma` and update/delete by `id` only:
  - `src/actions/admin/manage-calendar.ts` (`deleteCalendarEvent`)
  - `src/actions/admin/manage-templates.ts` (`deactivateTemplate`)
    These should include `tenantId` in `where` clauses and preferably use `prismaForTenant`.

### Role/permission drift risk

- `src/lib/nav-items.ts` duplicates authorization requirements independently from `src/lib/permissions.ts`, risking drift and mis-guarded navigation/UX.

### Workflow correctness gaps

- Observation transitions are role-gated in a way that can block newly introduced roles (e.g., users with only `LEAD_AUDITOR`/`FIELD_AUDITOR` may not satisfy transition checks if code expects `AUDITOR`). Prefer permission-based checks.

### Hardcoded policy thresholds

- RAM frequency thresholds are hardcoded (R8 non-configurable).
- KRI breach detection uses a fixed 10% buffer.
- Repeat-finding similarity thresholds are hardcoded.

### Input validation

- Many actions use Zod schemas and follow good patterns.
- Some schemas are incomplete vs requirements (evidence refs missing in examination response), and `z.looseObject({})` is used for template data (weak validation).

## 4) Recommended Fixes (Prioritized)

### P0 (must fix)

1. **Tenant isolation on admin mutations**: update calendar/templates actions to use `prismaForTenant()` and include `tenantId` in `where` for update/delete.
2. **Implement R9 audit plan generator** end-to-end (DAL + action + UI + schedule preview) and remove mock `/audit-plans` data.
3. **Evidence attachment pipeline for examination responses (R16/R27)**: add evidenceRefs/files to submit schema, implement upload (S3) + Evidence records, display attachments in UI.

### P1 (should fix)

1. **CashCheck/LoanReview/SMA-NPA capture UIs** (R19–R21, R24–R25) with minimal CRUD + (for LoanReview) CSV import.
2. **BH certificate workflow (R26)**: add signer, signature capture, state transitions, and render into PDF.
3. **Escalation automation (R39)**: cron/job to compute compliance escalations + create notifications per level (L1–L4) aligned to SDD.
4. **Replace mock pages** (controls, work program, issues, risk mgmt, QA, governance, investments, IS audit, regulatory) by wiring existing DAL/actions.

### P2 (nice to have)

1. Make RAM frequency thresholds and KRI buffers **tenant-configurable**.
2. Consolidate authorization: derive nav visibility from `permissions.ts` to avoid drift.
3. Expand seeded templates/checklists (e.g., cyber security questionnaires) and add management screens.

## 5) Overall Grade

**Grade: D+**

The foundation (multi-tenant schema, RAM computation, audit execution for examination items, reporting generators, basic compliance/ZAC workflow, analytics, job infrastructure) is real and cohesive.

However, several Phase 1 “must-have” operational workflows are still missing (audit plan generation, cash/loan/NPA section forms, BH sign-off), and most Phase 3–6 features are not usable end-to-end due to missing UI wiring and incomplete workflows.
