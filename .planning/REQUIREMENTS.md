# Requirements: AEGIS v7.0 Sample-Based Account Examination

**Defined:** 2026-02-28
**Core Value:** Individual audit observations flow upward through a structured lifecycle to form the complete risk and compliance picture — from a single branch finding to the board report.

## v7.0 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Loan Data Management

- [ ] **DATA-01**: HIA can upload branch loan portfolio as CSV/Excel with standardized fields (account number, borrower name, sanction amount, sanction date, outstanding, DPD, loan type, etc.)
- [ ] **DATA-02**: System validates uploaded loan data and displays import summary (total accounts, field mapping, errors)
- [ ] **DATA-03**: Uploaded loan data is stored per branch per credit module and available for sampling

### Sampling Configuration

- [ ] **SMPL-01**: HIA can configure sampling criteria with % share allocations (newly sanctioned, amount-wise, age-wise, DPD-wise, prior observations)
- [ ] **SMPL-02**: HIA can set overall sample size % (e.g., 10% of branch loan portfolio)
- [ ] **SMPL-03**: Sampling criteria are locked from auditor modification — auditors can only view the configured criteria
- [ ] **SMPL-04**: System auto-selects sample accounts from uploaded portfolio based on configured criteria and share percentages

### Account Examination

- [ ] **AEXM-01**: When auditor opens a credit module, system presents sampled accounts one-by-one — ALL questions are asked for each account (full question set per account, account-centric workflow)
- [ ] **AEXM-02**: Each question displays embedded RBI guideline reference (if applicable) and best practice tips for auditor guidance
- [ ] **AEXM-03**: Auditor marks each question per account as compliant or violation (instance tracking)
- [ ] **AEXM-04**: Auditor can add notes/evidence per question per account to document findings
- [ ] **AEXM-05**: System tracks violation instances across all sampled accounts per question

### Question Management

- [x] **QMGT-01**: System ships with expanded default question set per credit module (including account-level checks like PSL classification)
- [ ] **QMGT-02**: HIA can add custom questions to any credit module
- [ ] **QMGT-03**: HIA can edit or deactivate existing questions (without deleting historical data)
- [x] **QMGT-04**: Each question has fields: text, RBI reference (optional), best practice tip (optional), weight, isCritical flag

### Compliance Scoring

- [ ] **CSCR-01**: System computes compliance % per question as (compliant instances / total sampled accounts)
- [ ] **CSCR-02**: Compliance % maps to FC/LC/PC/NC using existing 4-point scale thresholds
- [ ] **CSCR-03**: Module-level and composite scores roll up from instance-based compliance percentages using existing weighted scoring engine
- [ ] **CSCR-04**: All existing score visualization (gauge, module breakdown, rating bands) works with instance-based scores

### Cross-Module

- [x] **XMOD-01**: Architecture supports all credit modules (Housing Loans, Gold Loans, Vehicle Loans, etc.) with same sample-based workflow
- [x] **XMOD-02**: Each credit module can have its own loan data field schema while sharing the sampling/examination framework

## v8.0 Requirements

Deferred to future release. Tracked but not in current roadmap.

### CBS Integration

- **CBS-01**: Automated loan data feed from Core Banking System (Finacle/Flexcube) replacing manual upload
- **CBS-02**: Real-time account status sync during examination

### Advanced Sampling

- **ASMPL-01**: ML-based risk-weighted sampling that prioritizes accounts with higher risk indicators
- **ASMPL-02**: Comparative sampling across branches to identify systemic issues

## Out of Scope

| Feature                        | Reason                                                             |
| ------------------------------ | ------------------------------------------------------------------ |
| CBS/Finacle integration        | Requires CBS vendor cooperation; manual upload sufficient for v7.0 |
| Real-time loan data sync       | Batch upload model; real-time deferred to CBS integration          |
| AI-powered question generation | Rule-based questions with manual management sufficient             |
| Cross-bank benchmarking        | Single-tenant scope; multi-tenant analytics deferred               |
| Mobile offline examination     | Responsive web sufficient; offline deferred                        |

## Traceability

| Requirement | Phase                            | Status   |
| ----------- | -------------------------------- | -------- |
| QMGT-01     | Phase 27: Schema and Data Models | Complete |
| QMGT-04     | Phase 27: Schema and Data Models | Complete |
| XMOD-01     | Phase 27: Schema and Data Models | Complete |
| XMOD-02     | Phase 27: Schema and Data Models | Complete |
| DATA-01     | Phase 28: Loan Data Upload       | Pending  |
| DATA-02     | Phase 28: Loan Data Upload       | Pending  |
| DATA-03     | Phase 28: Loan Data Upload       | Pending  |
| SMPL-01     | Phase 29: Sampling Engine        | Pending  |
| SMPL-02     | Phase 29: Sampling Engine        | Pending  |
| SMPL-03     | Phase 29: Sampling Engine        | Pending  |
| SMPL-04     | Phase 29: Sampling Engine        | Pending  |
| AEXM-01     | Phase 30: Account Examination UI | Pending  |
| AEXM-02     | Phase 30: Account Examination UI | Pending  |
| AEXM-03     | Phase 30: Account Examination UI | Pending  |
| AEXM-04     | Phase 30: Account Examination UI | Pending  |
| AEXM-05     | Phase 30: Account Examination UI | Pending  |
| QMGT-02     | Phase 30: Account Examination UI | Pending  |
| QMGT-03     | Phase 30: Account Examination UI | Pending  |
| CSCR-01     | Phase 31: Instance-Based Scoring | Pending  |
| CSCR-02     | Phase 31: Instance-Based Scoring | Pending  |
| CSCR-03     | Phase 31: Instance-Based Scoring | Pending  |
| CSCR-04     | Phase 31: Instance-Based Scoring | Pending  |

**Coverage:**

- v7.0 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0

---

_Requirements defined: 2026-02-28_
_Last updated: 2026-02-28 after roadmap creation (all 20 requirements mapped)_
