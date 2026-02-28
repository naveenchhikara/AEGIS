# Roadmap: AEGIS

## Milestones

- ✅ **v1.0 Clickable Prototype** — Phases 1-4 (shipped 2026-02-08)
- ✅ **v2.0 Working Core MVP** — Phases 5-14 (shipped 2026-02-10)
- ✅ **v3.0 RBIAS Full Platform** — Phases 15-17 (shipped 2026-02-21)
- ✅ **v4.0 Platform Hardening** — (shipped 2026-02-21)
- ✅ **v5.0 Pilot Readiness** — (shipped 2026-02-22)
- ✅ **v6.0 RBIA Implementation** — Phases 18-26 (shipped 2026-02-28)
- 🚧 **v7.0 Sample-Based Account Examination** — Phases 27-31 (in progress)

---

<details>
<summary>✅ v1.0–v6.0 (Phases 1-26) — SHIPPED</summary>

Phases 1-26 completed across v1.0 through v6.0 milestones. See `.planning/milestones/` for archived roadmaps and plans.

</details>

---

## 🚧 v7.0 Sample-Based Account Examination (In Progress)

**Milestone Goal:** Transform RBIA credit module examination from static checklists to account-level sample-based auditing — loan data upload, HIA-controlled sampling, per-account question workflow with RBI guidance, and instance-based compliance scoring.

**20 requirements across 5 phases (27-31). Phase numbering continues from v6.0's Phase 26.**

## Phases

- [x] **Phase 27: Schema and Data Models** — New Prisma models for loan accounts, sampling config, account exam responses, and question management (DATA-01, DATA-02, DATA-03, QMGT-01, QMGT-04, XMOD-01, XMOD-02) (completed 2026-02-28)
- [x] **Phase 28: Loan Data Upload** — CSV/Excel upload UI, field validation, import summary, and per-branch storage (DATA-01, DATA-02, DATA-03) (completed 2026-02-28)
- [ ] **Phase 29: Sampling Engine** — HIA sampling criteria configuration, locked auditor view, auto-selection algorithm (SMPL-01, SMPL-02, SMPL-03, SMPL-04)
- [ ] **Phase 30: Account Examination UI** — Per-account question workflow, RBI references, instance tracking, notes/evidence (AEXM-01, AEXM-02, AEXM-03, AEXM-04, AEXM-05, QMGT-02, QMGT-03)
- [ ] **Phase 31: Instance-Based Scoring** — Compliance % computation, 4-point scale mapping, score roll-up integration, visualization (CSCR-01, CSCR-02, CSCR-03, CSCR-04)

## Phase Details

### Phase 27: Schema and Data Models

**Goal**: New database models for sample-based examination exist, are seeded with default question sets, and enforce the architectural contracts that all subsequent phases depend on — before any UI or business logic is built.

**Depends on**: Phase 26 (v6.0 complete)

**Requirements**: QMGT-01, QMGT-04, XMOD-01, XMOD-02

**Success Criteria** (what must be TRUE):

1. Prisma schema contains LoanAccount, SamplingConfig, AccountExamResponse, and ExaminationQuestion models with correct foreign keys and tenant isolation fields — `pnpm db:push` succeeds with no errors
2. Default question set for Housing Loans credit module is seeded with at least 15 questions, each having text, optional RBI reference, optional best practice tip, weight, and isCritical flag
3. ExaminationQuestion model supports a moduleCode field allowing different credit modules (Housing Loans, Gold Loans, Vehicle Loans) to each have independent question sets while sharing the same schema
4. A new question can be created via Prisma Studio with all required fields and persists correctly — confirms schema is deployable and fields are correctly typed

**Plans**: TBD

### Phase 28: Loan Data Upload

**Goal**: HIA can upload a branch loan portfolio as CSV or Excel and immediately see a validated import summary — rejected rows are explained, accepted rows are stored and available for sampling.

**Depends on**: Phase 27

**Requirements**: DATA-01, DATA-02, DATA-03

**Success Criteria** (what must be TRUE):

1. HIA can select a CSV or Excel file on the loan data upload page, and the system parses it, displaying a summary of total accounts found, valid rows accepted, and invalid rows rejected with specific field error messages
2. A file with a missing mandatory field (e.g., account number) shows that row as rejected in the import summary — the row does not appear in the stored portfolio
3. After a successful upload, the stored loan accounts are queryable by branch and credit module — a subsequent sampling run can retrieve them without re-uploading
4. Uploading a second file for the same branch and credit module replaces the previous portfolio — no duplicate accounts from prior uploads remain

**Plans**: TBD

### Phase 29: Sampling Engine

**Goal**: HIA can define sampling criteria with locked % share allocations that auditors cannot modify, and the system auto-selects a representative sample of accounts from the uploaded portfolio based on those criteria.

**Depends on**: Phase 28

**Requirements**: SMPL-01, SMPL-02, SMPL-03, SMPL-04

**Success Criteria** (what must be TRUE):

1. HIA can set overall sample size % (e.g., 10%) and allocate that sample across criteria buckets (newly sanctioned, amount-wise, age-wise, DPD-wise, prior observations) — the allocations must sum to 100% before saving is permitted
2. An auditor viewing the sampling configuration page sees the criteria and percentages in a read-only display — no edit controls are visible or accessible to auditor role
3. After HIA saves sampling criteria, clicking "Generate Sample" auto-selects accounts from the uploaded portfolio according to the configured criteria, and the selected accounts are visible in a sample list
4. If a criteria bucket requests more accounts than exist in that segment (e.g., 5 newly sanctioned requested but only 3 exist), the system fills from the next-largest bucket and displays a warning — no error or crash occurs

**Plans:** 2/2 plans complete

Plans:

- [ ] 29-01-PLAN.md — TDD: Pure sampling algorithm with deterministic bucket-fill, overflow redistribution, dedup
- [ ] 29-02-PLAN.md — DAL functions + server actions for criteria save and sample generation
- [ ] 29-03-PLAN.md — Sampling UI: criteria config form, sample list table, RBIA tab integration

### Phase 30: Account Examination UI

**Goal**: Auditors can examine sampled accounts one-by-one — ALL questions are asked for each account (account-centric workflow) with embedded RBI guidance, marking each as compliant or violation with optional notes — and HIA can manage the question library.

**Depends on**: Phase 29

**Requirements**: AEXM-01, AEXM-02, AEXM-03, AEXM-04, AEXM-05, QMGT-02, QMGT-03

**Success Criteria** (what must be TRUE):

1. When an auditor opens a credit module with a generated sample, the UI presents the first sampled account with questions in a randomized order — navigating to the next account shows a different account with questions in a new randomized order
2. Each question card displays the question text and, where available, an RBI guideline reference and best practice tip in a collapsible or tooltip panel
3. Auditor can mark any question for an account as "Compliant" or "Violation" and the response saves immediately — closing the browser and returning shows the previously saved answer
4. Auditor can add a text note and upload evidence against any individual question-account combination — both save and are retrievable on the same question card
5. A progress indicator shows how many accounts in the sample have been fully answered (all questions marked) vs. remaining — giving the auditor a clear sense of examination completion
6. HIA can add a new custom question to a credit module, and it immediately appears in the question list for future examinations — existing AccountExamResponse records for completed accounts are not affected
7. HIA can deactivate an existing question — it no longer appears in new examinations but historical response data for that question remains intact

**Plans:** 3 plans

Plans:

- [ ] 30-01-PLAN.md — DAL + server actions for account examination responses and question management
- [ ] 30-02-PLAN.md — Account examination UI: sidebar, question cards, progress bar, RBIA tab integration
- [ ] 30-03-PLAN.md — Question management UI: tabbed module view, question table, add/edit dialogs

### Phase 31: Instance-Based Scoring

**Goal**: Compliance scores for credit modules are derived from violation rates across sampled accounts — wiring into the existing 4-point scale, weighted roll-up engine, and score visualizations so the end-to-end RBIA score reflects actual loan portfolio compliance.

**Depends on**: Phase 30

**Requirements**: CSCR-01, CSCR-02, CSCR-03, CSCR-04

**Success Criteria** (what must be TRUE):

1. For any question in a credit module, the system computes compliance % as (accounts marked compliant / total sampled accounts) and displays this percentage alongside the question in the examination view
2. Compliance % maps to the existing 4-point scale label: 100% = FULLY_COMPLIANT, 75-99% = LARGELY_COMPLIANT, 50-74% = PARTIALLY_COMPLIANT, below 50% = NON_COMPLIANT — thresholds are consistent with existing RBIA policy
3. Module-level and composite RBIA scores update when instance-based responses are saved — the existing scoring engine consumes compliance % inputs without requiring a new scoring code path
4. The existing score gauge, module breakdown bars, rating band badge, and drill-down views render correctly when scores are sourced from instance-based computation — no visual regressions on the score page

**Plans:** 3 plans

Plans:

- [ ] 31-01-PLAN.md — TDD: Pure compliance % computation + ScoreLabel mapping (instance-scoring.ts)
- [ ] 31-02-PLAN.md — DAL wiring + freeze action integration for instance-based scores
- [ ] 31-03-PLAN.md — ComplianceSummary UI component + module page integration + visual regression verification

## Progress

**Execution Order:** 27 → 28 → 29 → 30 → 31

| Phase                      | Plans Complete | Status      | Completed  |
| -------------------------- | -------------- | ----------- | ---------- |
| 27. Schema and Data Models | 2/2            | Complete    | 2026-02-28 |
| 28. Loan Data Upload       | 2/2            | Complete    | 2026-02-28 |
| 29. Sampling Engine        | 0/TBD          | Not started | -          |
| 30. Account Examination UI | 0/TBD          | Not started | -          |
| 31. Instance-Based Scoring | 0/TBD          | Not started | -          |
