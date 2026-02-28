---
gsd_state_version: 1.0
milestone: v7.0
milestone_name: Sample-Based Account Examination
status: roadmap_complete
last_updated: "2026-02-28T12:30:00.000Z"
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** Individual audit observations flow upward through a structured lifecycle to form the complete risk and compliance picture — from a single branch finding to the board report.
**Current focus:** v7.0 Sample-Based Account Examination — roadmap complete, ready to plan Phase 27

## Current Position

Phase: 27 (Schema and Data Models) — not started
Plan: —
Status: Roadmap complete, awaiting phase planning
Last activity: 2026-02-28 — v7.0 roadmap created (5 phases, 20 requirements mapped)

Progress: [----------] 0% (0/TBD plans complete)

## Phase Overview

| Phase | Name                   | Requirements                                                  | Status      |
| ----- | ---------------------- | ------------------------------------------------------------- | ----------- |
| 27    | Schema and Data Models | QMGT-01, QMGT-04, XMOD-01, XMOD-02                            | Not started |
| 28    | Loan Data Upload       | DATA-01, DATA-02, DATA-03                                     | Not started |
| 29    | Sampling Engine        | SMPL-01, SMPL-02, SMPL-03, SMPL-04                            | Not started |
| 30    | Account Examination UI | AEXM-01, AEXM-02, AEXM-03, AEXM-04, AEXM-05, QMGT-02, QMGT-03 | Not started |
| 31    | Instance-Based Scoring | CSCR-01, CSCR-02, CSCR-03, CSCR-04                            | Not started |

## Performance Metrics

**Velocity (v6.0 baseline):**

- Total plans completed: 34 (v6.0)
- Average duration: ~10 min/plan
- Total phases: 9 phases (18-26)

**By Phase (v6.0):**

| Phase | Plans | Avg/Plan |
| ----- | ----- | -------- |
| 18    | 5     | ~10m     |
| 19    | 5     | ~10m     |
| 20    | 5     | ~10m     |
| 21    | 4     | ~10m     |
| 22    | 5     | ~10m     |
| 23    | 5     | ~10m     |
| 24    | 2     | ~10m     |
| 25    | 2     | ~10m     |
| 26    | 1     | ~10m     |

_Updated after each plan completion_

## Milestone History

| Version | Name                             | Date        | Phases     |
| ------- | -------------------------------- | ----------- | ---------- |
| v1.0    | Clickable Prototype              | 2026-02-08  | 1-4        |
| v2.0    | Working Core MVP                 | 2026-02-10  | 5-14       |
| v3.0    | RBIAS Full Platform              | 2026-02-21  | 1-6, 15-17 |
| v4.0    | Platform Hardening               | 2026-02-21  | —          |
| v5.0    | Pilot Readiness                  | 2026-02-22  | —          |
| v6.0    | RBIA Implementation              | 2026-02-28  | 18-26      |
| v7.0    | Sample-Based Account Examination | in progress | 27-31      |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- v7.0: Sample-based examination builds on top of v6.0 ExaminationNode tree — leaf items become per-account questions
- v7.0: New models needed: LoanAccount, SamplingConfig, AccountExamResponse, ExaminationQuestion
- v7.0: Existing scoring-engine.ts adapts to consume violation rates (compliance %) rather than direct 4-point scores
- v7.0: Sampling criteria locked from auditor modification — HIA-only write access
- v7.0: Phase ordering: schema first → upload → sampling → exam UI → scoring (each unblocks the next)
- v7.0: QMGT-01 (default question set) placed in Phase 27 (schema) because seeding requires the model to exist
- v7.0: XMOD-01 and XMOD-02 (cross-module architecture) placed in Phase 27 as they are schema-level concerns (moduleCode field on question model)
- v7.0: DATA-01 upload UI placed in Phase 28 (separate from schema) to allow schema to be independently verifiable
- v7.0: Compliance % thresholds for 4-point mapping to be confirmed against RBIA-POLICY-2020.md during Phase 31 planning

### Pending Todos

- Confirm exact compliance % thresholds for FC/LC/PC/NC mapping (Phase 31 planning)
- Confirm default question set content for Housing Loans (Phase 27 planning)
- Confirm whether AccountExamResponse evidence upload reuses v6.0 S3 presigned URL pattern (Phase 30 planning)

### Blockers/Concerns

- ExaminationQuestion weight field: confirm whether questions inside a credit module use the same weighted roll-up as ExaminationNode items or a simpler average
- Sampling bucket overflow behavior (e.g., not enough newly sanctioned loans) needs product decision before Phase 29 implementation

## Session Continuity

Last session: 2026-02-28
Stopped at: v7.0 roadmap created — 5 phases, 20 requirements mapped
Resume with: `/gsd:plan-phase 27`
