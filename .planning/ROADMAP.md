# RBIAS v3.0 — GSD Roadmap

> Expanding AEGIS v2.0 into Risk-Based Internal Audit System for UCBs
> Stack: Next.js 16 + PostgreSQL + Prisma 7 + Better Auth + S3/SES

---

## Phase 1: Core Audit Domain (Foundation)

**Goal:** Auditors can plan RAM-based audits, assign teams, and execute structured section-based examinations at branches with 239 value statements.

**Success Criteria:**

1. RAM assessment can be created for any branch with 19 configurable parameters, producing a composite score and risk category
2. Annual audit plan generates engagement schedule based on RAM scores and frequency rules (6/9/12/15/18 months)
3. Audit engagement has a team (lead + members) with section assignments
4. Auditor can execute examination across 25 functional areas, marking each of 239 items as Compliant/Non-Compliant/Partial/NA
5. Non-compliant items auto-create observations linked to the examination response
6. Cash verification, loan review, and SMA/NPA entry forms capture structured data per audit
7. Branch Head can view findings and sign BH Certificate

**Modules:** M1 (RAM + Planning), M2 (Pre-Audit), M3 (Execution/Value Statement)
**Depends on:** Nothing (foundation)

**Requirements:** R1-R28

---

## Phase 2: Reporting & Compliance Lifecycle

**Goal:** Completed audits produce standardized reports matching bank format, and every observation flows through a tracked compliance lifecycle from Branch → ZAC → ACE → ACB with SLA enforcement.

**Success Criteria:**

1. Multi-sheet XLSX report generates with 13+ tabs matching existing bank audit format
2. PDF summary report with executive summary, key findings, and BH Certificate
3. Risk rating computed from weighted observation scores (repeat findings get 1.5× multiplier)
4. Every observation auto-creates a compliance item with due date and assigned owner
5. Compliance progresses through Branch Response → ZAC Review → ACE Processing → ACB Reporting
6. Escalation triggers automatically at +15d/+30d/+90d/+180d overdue
7. Zone model exists and ZAC-level compliance views work

**Modules:** M4 (Reports), M5 (Compliance), M6 (Analytics), M7 (Admin enhancements)
**Depends on:** Phase 1

**Requirements:** R29-R48

---

## Phase 3: GRC & Issue Management

**Goal:** Enterprise risk register links risks to controls and audits. Unified issue management tracks findings from all assurance sources. Quality assessment measures the audit function itself.

**Success Criteria:**

1. Risk register with risk statements, inherent/residual scores, and KRI tracking per entity
2. Control library with test procedures and auto-generated work programs per engagement
3. Unified issue model ingests from internal audit, regulatory, external audit, and self-assessment
4. Action plans with milestones, partial closure, and accepted-risk tracking
5. Quality self-assessment questionnaires with gap-to-issue conversion
6. Internal audit effectiveness KPIs dashboard (plan completion, cycle time, resolution rates)

**Modules:** M8 (Risk Register), M9 (Control Library), M12 (Issue Management), M13 (Quality)
**Depends on:** Phase 2

**Requirements:** R49-R68

---

## Phase 4: UCB Regulatory & Governance

**Goal:** Unified audit universe covers all mandated audit types (RBIA, concurrent, IS/EDP, statutory). Concurrent audit workbench enables daily/weekly checks. Governance module supports ACB agenda building and RBI inspection readiness.

**Success Criteria:**

1. Audit universe registry with branches, departments, processes, vendors as auditable entities
2. Unified calendar showing all audit types with periodicity compliance
3. Concurrent audit rapid entry workbench with scope templates (cash, investments, advances, off-BS)
4. Serious irregularity escalation with auto-routing to HO/IAD
5. Regulatory observation hub tracking RBI/statutory/concurrent findings with ATR workflow
6. ACB workspace with auto-generated quarterly meeting packs
7. Policy library with version history and review reminders
8. Board committee composition and meeting tracking

**Modules:** M14 (Audit Universe), M15 (Concurrent Audit), M19 (Regulatory Hub), M20 (Governance)
**Depends on:** Phase 3

**Requirements:** R69-R92

---

## Phase 5: DEFERRED — Advanced Analytics & AI

**Goal:** Data connectors + rule-based analytics engine + AI anomaly detection.
**Modules:** M10 (Continuous Auditing), M11 (AI Analytics)
**Status:** Deferred — requires CBS data feeds and ML infrastructure

---

## Phase 6: Specialized Regulatory Modules

**Goal:** Investment/treasury audit controls and EDP/IS audit module with application inventory and IS checklists.

**Success Criteria:**

1. SGL/CSGL reconciliation tracking and broker compliance (5% cap) analytics
2. Non-SLR investment cap monitoring with drill-down
3. Quarterly auditor certification workflow for investments
4. Application inventory with criticality, vendor, DR status
5. IS audit checklists covering CBS, channels, access, BCP/DR, vendor management
6. IS-specific role with scoped access

**Modules:** M17 (Investment/Treasury), M18 (EDP/IS Audit)
**Depends on:** Phase 4

**Requirements:** R93-R104

---

## DEFERRED: M16 IRAC Engine

**Status:** Deferred — complex computation engine requiring CBS loan data pipeline

---

## Phase 17: Critical Security & Quality

**Goal:** Eliminate critical security vulnerabilities, type safety issues, and quality gaps identified in the security audit. Non-functional improvements that harden existing features.

**Plans:**

| Plan | Title                                         | Status   | Commit    |
| ---- | --------------------------------------------- | -------- | --------- |
| 01   | IDOR hardening across all mutations           | -        | -         |
| 02   | Stored XSS Fix — documentUrl protocol val.    | COMPLETE | `9689632` |
| 03   | Typed Session Helpers — eliminate ~417 as any | COMPLETE | `ff4678b` |
| 04   | Input validation & sanitization gaps          | -        | -         |

**Depends on:** All prior phases (hardening existing features)

---

## Phase Dependencies

```
Phase 1 (Foundation)
    └── Phase 2 (Reports + Compliance)
        └── Phase 3 (GRC + Issues)
            └── Phase 4 (Regulatory + Governance)
                └── Phase 6 (Treasury + IS Audit)

Phase 5 (AI/Analytics) — DEFERRED
M16 (IRAC) — DEFERRED
```
