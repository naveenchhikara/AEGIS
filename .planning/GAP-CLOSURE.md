# RBIAS v3.0 — GSD Gap Closure Plan

> Source: GPT-5.2 Validation Report (D+ grade)
> Method: GSD Planner → Executor → GPT-5.2 Verifier gate per module
> Rule: Nothing marked complete until GPT-5.2 verifier clears it

## Gap Summary from Validation

- ❌ Missing (14 requirements): R9, R12, R19, R20, R21, R24, R25, R26, R33, R37, R38, R40, R52, R53, R63, R66, R67, R71, R76, R79, R101, R104
- ⚠️ Partial (30 requirements): R2, R3, R4, R8, R10, R11, R13, R16, R18, R23, R27, R30, R35, R39, R46, R48-R51, R54-R62, R64-R65, R69-R70, R73-R75, R77-R78, R80, R99-R100, R103

## Execution Order (Module-by-Module)

### Module A: Phase 1 Gap Closure (Core Audit — the foundation)
**Gaps:** R9, R10-R13, R16, R18-R21, R23-R27
**Priority:** P0 — everything else depends on this

Plan A1: Audit Plan Generator (R9) — auto-schedule from RAM + last_audit_date
Plan A2: Engagement Management (R10-R11, R13) — create/edit UI, team assignment with real users + sections
Plan A3: Pre-Audit Profiling (R12) — branch profile page with prior findings + RAM summary
Plan A4: Evidence Pipeline (R16, R23, R27) — upload to S3, attach to exam responses
Plan A5: Specialized Section Forms (R19-R21, R24-R25) — CashCheck, LoanReview, SmaNpaEntry CRUD + UI
Plan A6: BH Certificate Workflow (R26) — digital sign-off with state transitions
Plan A7: Tenant-configurable RAM thresholds (R4, R8) — admin UI for parameter management

### Module B: Phase 2 Gap Closure (Reporting & Compliance)
**Gaps:** R30, R33, R35, R37-R40, R46, R48
**Priority:** P1

Plan B1: Report Routing Workflow (R33) — draft→reviewed→approved→issued state machine
Plan B2: BH Cert in PDF + Compliance Evidence (R30, R35) — real signatures in PDF, file upload for branch responses
Plan B3: ACE/ACB Pipeline (R37, R38) — quarterly processing, consolidated board reports
Plan B4: Escalation Automation (R39) — cron job + level-specific notifications
Plan B5: Repeat Finding RAM Integration (R40) — feed repeat findings into next RAM computation
Plan B6: Template Admin UI + NPA Waterfall Widget (R46, R48)

### Module C: Phase 3 Gap Closure (GRC & Issue Management)
**Gaps:** R49-R67 (all ⚠️ — actions exist, pages are mock)
**Priority:** P1

Plan C1: Wire Risk Management UI (R49-R53) — replace mocks with real DAL calls
Plan C2: Wire Control Library UI (R54-R58) — real data, work program auto-trigger
Plan C3: Wire Issues UI (R59-R63) — real data, action plans, board consolidated view
Plan C4: Wire QA Assessment UI (R64-R67) — real questionnaires, gap-to-issue, KPI dashboard

### Module D: Phase 4 Gap Closure (UCB Regulatory & Governance)
**Gaps:** R69-R80 (all ⚠️ — actions exist, pages are mock)
**Priority:** P2

Plan D1: Wire Regulatory UI (R77-R79) — real data, ATR workflow, para-to-issue mapping
Plan D2: Wire Governance UI (R69-R71, R80) — audit universe, calendar integration, housekeeping
Plan D3: Concurrent Audit UI (R73-R76) — templates, rapid entry, de-duplication

### Module E: Phase 6 Gap Closure (Specialized Regulatory)
**Gaps:** R93-R104 (all ⚠️)
**Priority:** P2

Plan E1: Wire Investment UI (R93-R97) — real data, broker/SLR monitoring
Plan E2: Wire IS Audit UI (R98-R104) — app inventory, checklists, vendor risk

## GSD Pipeline Per Module

```
For each module:
  1. GSD Planner (Sonnet) → creates PLAN.md files with must_haves
  2. GSD Executor (Sonnet) → implements plans, atomic commits
  3. GPT-5.2 Verifier → 3-level verification (exists/substantive/wired)
  4. If FAIL → back to step 2 with gap list
  5. If PASS → module complete, move to next
```

## Execution Timeline

| Module | Plans | Est. Time | Depends On |
|--------|-------|-----------|------------|
| A (Phase 1) | A1-A7 | 60-90 min | — |
| B (Phase 2) | B1-B6 | 45-60 min | A |
| C (Phase 3) | C1-C4 | 30-45 min | — |
| D (Phase 4) | D1-D3 | 30-45 min | — |
| E (Phase 6) | E1-E2 | 20-30 min | — |

Modules C, D, E can run parallel to A+B since they're mostly wiring existing actions to UI.
