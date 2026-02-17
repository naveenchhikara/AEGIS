# RBIAS v3.0 — Requirements Mapping

> Every v1 requirement maps to exactly one phase. No orphans.

## Phase 1: Core Audit Domain

| ID | Requirement | Module | Source |
|----|-------------|--------|--------|
| R1 | Extend Role enum: LEAD_AUDITOR, FIELD_AUDITOR, BRANCH_HEAD | M1 | SDD p.8 |
| R2 | Zone model with branch→zone mapping | M1 | SDD p.13, p.26 |
| R3 | Extend Branch: zone, category, business_size, staff_strength, ram_score, audit_frequency, last_audit_date/rating | M1 | SDD p.13 |
| R4 | RamParameterConfig table: 19 params with code, name, weight, scoring_criteria JSONB, max_score | M1 | SDD p.21, RBIA Policy §7 |
| R5 | RamAssessment table: per branch/year with composite_score, risk_category, computed_by/approved_by | M1 | SDD p.20 |
| R6 | RamAssessmentScore table: assessment_id + param_config_id + score (separate from config) | M1 | Review fix |
| R7 | RAM computation service: weighted scoring, composite calculation, frequency derivation | M1 | SDD p.32, RBIA Policy §7.3-7.6 |
| R8 | Frequency rules: >3.5→12mo, 2.5-3.5→18mo, <2.5→24mo (configurable) | M1 | SDD p.32 |
| R9 | Annual audit plan generator with auto-scheduling from RAM + last_audit_date | M1 | SDD p.33 |
| R10 | AuditTeamMember join model: engagement_id, user_id, role_in_engagement, assigned_sections | M1 | SDD p.15, Review fix |
| R11 | Extend AuditEngagement: audit_number, audit_type, visit_number, period_from/to, actual_start/end, overall_risk_rating, bh_cert fields | M1 | SDD p.14, Review fix |
| R12 | Pre-audit branch profiling: last audit data, RAM score, prior findings summary | M2 | SDD p.9 |
| R13 | Pre-audit team assignment with section allocation | M2 | SDD p.51 |
| R14 | ExaminationArea table: 25 areas with code, name, risk_weight, display_order | M3 | SDD p.23, IA Format |
| R15 | ExaminationItem table: 239 items with area_id, item_number, particulars, risk_category, regulatory_ref | M3 | SDD p.24, IA Format RBG |
| R16 | AuditExaminationResponse: audit_id + item_id + status (compliant/non-compliant/partial/na) + observation + evidence_refs | M3 | SDD p.25 |
| R17 | Auto-create Observation from non-compliant examination response | M3 | SDD p.35 |
| R18 | AuditSectionInstance: per-engagement section instances (Excel tab equivalent) with section_data JSONB + status | M3 | SDD pp.15-16, Review fix |
| R19 | CashCheck model: cash_in_hand, book_balance, diff, ATM balances, retention_limit, denomination_data JSONB | M3 | SDD p.20, IA Format §1 |
| R20 | LoanReview model: account_no, borrower, product, sanction, outstanding, asset_class, dpd, audit_observation | M3 | SDD p.17 |
| R21 | SmaNpaEntry model: category-wise SMA/NPA summary per audit (not per loan) | M3 | SDD p.18, Review fix |
| R22 | Section-based execution UI with 25 functional area tabs | M3 | SDD p.28 |
| R23 | Per-item examination response form (status + observation + risk + evidence) | M3 | SDD p.35 |
| R24 | Cash verification form with denomination-level capture | M3 | SDD p.20, IA Format §1.1 |
| R25 | Loan review form with bulk CSV import | M3 | SDD p.17 |
| R26 | BH Certificate workflow with digital sign-off | M3 | SDD p.28 |
| R27 | Evidence model generalization: support evidence on examination items, not just observations | M3 | Review fix |
| R28 | Seed data: 19 RAM params + 25 exam areas + 239 exam items | M3 | IA Format RBG |

## Phase 2: Reporting & Compliance Lifecycle

| ID | Requirement | Module | Source |
|----|-------------|--------|--------|
| R29 | XLSX multi-tab report (13+ sheets) matching existing bank audit format | M4 | SDD p.38 |
| R30 | PDF summary report with executive summary + BH Certificate | M4 | SDD p.39 |
| R31 | Risk rating computation: weighted avg of observation scores, 1.5× repeat multiplier | M4 | SDD p.39, RBIA Policy §8.9 |
| R32 | Rating bands: Poor ≤40%, Moderate 40-50%, Satisfactory 50-65%, Good 65-80%, Very Good >80% | M4 | RBIA Policy §8.9.1 |
| R33 | Report routing workflow: draft → reviewed → approved → issued | M4 | SDD implied |
| R34 | ComplianceItem model: observation_id (1:1), audit_id, branch_id, status, due_date, escalation_level, days_open | M5 | SDD p.22, Review fix |
| R35 | Branch response portal: submit response + evidence within 30-day SLA | M5 | SDD p.40 |
| R36 | ZAC review stage: accept/reject/request info at zone level | M5 | SDD p.40 |
| R37 | ACE processing: quarterly cycle, prepare ACB report | M5 | SDD p.40 |
| R38 | ACB reporting: board meeting cycle, consolidated view | M5 | SDD p.40 |
| R39 | Escalation engine: L1 (+15d email), L2 (+30d ZAC), L3 (+90d ACE), L4 (+180d ACB) | M5 | SDD p.40 |
| R40 | Repeat finding 1.5× risk weight in next RAM computation | M5 | SDD p.40 |
| R41 | Add ZONAL_AUDITOR role for ZAC workflow | M5 | SDD p.8 |
| R42 | Branch risk heatmap with real RAM data | M6 | SDD p.41 |
| R43 | Audit plan progress dashboard | M6 | SDD p.41 |
| R44 | Compliance aging analysis | M6 | SDD p.41 |
| R45 | Finding trend analysis (cross-period) | M6 | SDD p.41 |
| R46 | NPA movement waterfall | M6 | SDD p.41 |
| R47 | Audit calendar management | M7 | SDD p.29 |
| R48 | Template management for report sections/checklists with versioning | M7 | SDD p.38 |

## Phase 3: GRC & Issue Management

| ID | Requirement | Module | Source |
|----|-------------|--------|--------|
| R49 | AuditUniverseEntity: entity_type, name, branch_id, risk_score, last_audit_date/rating, required_frequency | M8 | SDD p.58 |
| R50 | RiskRegister: entity linkage, risk_statement, inherent/residual scores, risk_owner | M8 | SDD p.42 |
| R51 | KeyRiskIndicator: KRI definition, current_value, threshold, breach_status | M8 | SDD p.42 |
| R52 | Risk-to-audit linkage: thematic mapping across entities | M8 | SDD p.43 |
| R53 | What-if simulation for audit planning | M8 | SDD p.43 |
| R54 | ControlLibrary: control_code, process_area, type, frequency, owner, key_control, framework_mapping | M9 | SDD p.44 |
| R55 | TestProcedure: linked to controls, sample_methodology, expected_evidence, pass_criteria | M9 | SDD p.45 |
| R56 | WorkProgramItem: per-engagement, linked to test_procedure, assigned_to, status, result | M9 | SDD p.45 |
| R57 | Auto-generate work program on audit initiation | M9 | SDD p.45 |
| R58 | Control effectiveness analytics (trends, heatmaps) | M9 | SDD p.45 |
| R59 | Issue model: unified across sources (internal/regulatory/external/self-assessment) | M12 | SDD p.49 |
| R60 | Issue fields: source, type, severity, root_cause, risk_theme, linked_controls, linked_compliance | M12 | SDD p.49 |
| R61 | ActionPlan: per-issue milestones, partial closure, evidence, verified_by | M12 | SDD p.50 |
| R62 | Accepted risk tracking with formal management sign-off | M12 | SDD p.50 |
| R63 | Consolidated Board view of all open issues across sources | M12 | SDD p.50 |
| R64 | QA self-assessment questionnaires mapped to IIA Standards | M13 | SDD p.55 |
| R65 | Gap-to-issue conversion from quality assessments | M13 | SDD p.55 |
| R66 | Internal audit effectiveness KPIs (10 metrics) | M13 | SDD p.55 |
| R67 | Audit Function Health dashboard | M13 | SDD p.56 |
| R68 | Add ACE_OFFICER role | M12 | SDD p.8 |

## Phase 4: UCB Regulatory & Governance

| ID | Requirement | Module | Source |
|----|-------------|--------|--------|
| R69 | Audit universe entity registry (branch, department, process, channel, vendor) | M14 | SDD p.58 |
| R70 | Unified calendar: RBIA + concurrent + IS/EDP + statutory with periodicity | M14 | SDD p.58 |
| R71 | Surprise audit scheduling support | M14 | SDD p.58 |
| R72 | Add CONCURRENT_AUDITOR role | M15 | SDD p.8 |
| R73 | Concurrent audit scope templates (cash, investments, advances, off-BS, deposits, KYC, EDP) | M15 | SDD p.60, CA Policy |
| R74 | Rapid observation entry workbench for concurrent auditors | M15 | SDD p.60 |
| R75 | Serious irregularity escalation with auto-routing | M15 | SDD p.60 |
| R76 | De-duplication: concurrent findings surface in RBIA planning | M15 | SDD p.60 |
| R77 | RegulatoryObservation model: source, reference_no, para_no, severity, ATR status | M19 | SDD p.64 |
| R78 | ATR workflow: draft → submitted → accepted/further_info | M19 | SDD p.64 |
| R79 | Para-to-issue mapping for internal tracking | M19 | SDD p.64 |
| R80 | Housekeeping risk metrics (inter-branch, suspense, clearing) | M19 | SDD p.65 |
| R81 | ACB workspace with consolidated dashboards | M20 | SDD p.67 |
| R82 | ACB agenda builder: auto-generated quarterly packs | M20 | SDD p.67 |
| R83 | Board review calendar with RBI-mandated items | M20 | SDD p.67 |
| R84 | PolicyDocument model: name, category, approval_date, review_due, version history | M20 | SDD p.68 |
| R85 | Committee governance: committees, members, meetings, minutes_ref | M20 | SDD p.68 |
| R86 | RBI inspection support pack (one-click 9-component report) | M20 | SDD p.69 |
| R87 | Risk management MIS dashboards (CRAR, asset quality, liquidity, investment, operational) | M20 | SDD pp.69-70 |
| R88 | Inter-bank exposure monitoring (20% total, 5% per-bank) | M20 | SDD p.66 |
| R89 | Add IS_AUDITOR role | M18 | SDD p.8 |
| R90 | Add RISK_HEAD role | M20 | SDD p.8 |
| R91 | Add ACB_MEMBER role (upgrade from BOARD_OBSERVER) | M20 | SDD p.8 |
| R92 | Add SYSTEM_ADMIN role | M7/M20 | SDD p.8 |

## Phase 6: Specialized Regulatory Modules

| ID | Requirement | Module | Source |
|----|-------------|--------|--------|
| R93 | SGL/CSGL reconciliation tracking | M17 | SDD p.62 |
| R94 | Broker compliance analytics (5% cap per broker) | M17 | SDD p.62 |
| R95 | Non-SLR investment cap monitoring (10% of deposits) | M17 | SDD p.62 |
| R96 | HTM/HFT/AFS classification audit checklist | M17 | SDD p.62 |
| R97 | Quarterly auditor certification workflow for investments | M17 | SDD p.62 |
| R98 | ApplicationInventory model: app_name, vendor, version, hosting, criticality, dr_tested, last_is_audit | M18 | SDD p.63 |
| R99 | IS audit checklists: CBS, channels, access, BCP/DR, vendor, change mgmt | M18 | SDD p.63, IS Policy |
| R100 | Vendor risk tracking with SLA compliance | M18 | SDD p.63, IS Policy |
| R101 | CBS parameter audit items (interest rates, product masters, privileges) | M18 | SDD p.63 |
| R102 | Add IS_AUDITOR role with scoped access | M18 | SDD p.8 |
| R103 | Cyber security checklist (122 questionnaires / 25 baseline controls) | M18 | IS Policy §1.6, Annexure I |
| R104 | Technology control evidence collection and gap analysis | M18 | SDD p.63 |

## Deferred

| ID | Requirement | Module | Reason |
|----|-------------|--------|--------|
| D1-D12 | CBS connectors, ETL, rule engine, data_exceptions | M10 | Needs CBS data feeds |
| D13-D18 | AI anomaly detection, NLP, predictive models, smart suggestions | M11 | Needs ML infra |
| D19-D26 | IRAC computation pipeline, NPA recomputation, provision cross-check | M16 | Complex engine, needs loan data |

---

## Coverage Summary

| Phase | Requirements | Modules |
|-------|-------------|---------|
| 1 | R1-R28 (28) | M1, M2, M3 |
| 2 | R29-R48 (20) | M4, M5, M6, M7 |
| 3 | R49-R68 (20) | M8, M9, M12, M13 |
| 4 | R69-R92 (24) | M14, M15, M19, M20 |
| 6 | R93-R104 (12) | M17, M18 |
| **Total** | **104 requirements** | **18 modules** |
| Deferred | D1-D26 (26) | M10, M11, M16 |
