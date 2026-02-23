---
phase: 18-foundation
plan: "03"
subsystem: database
tags: [db-guards, trigger, constraint, immutability, rbia]
dependency_graph:
  requires: []
  provides:
    [BranchRbiaScore-immutability-trigger, ExaminationNode-path-constraint]
  affects: [BranchRbiaScore, ExaminationNode]
tech_stack:
  added: []
  patterns: [BEFORE UPDATE trigger, idempotent DO block, CHECK constraint]
key_files:
  created:
    - prisma/migrations/20260222_rbia_db_guards.sql
  modified: []
decisions:
  - "BEFORE UPDATE (not AFTER) chosen so exception fires before write occurs"
  - "DO block pattern for CHECK constraint makes script idempotent without error on re-run"
  - "Follows existing add_audit_log_rules.sql pattern (psql -f, not prisma migrate)"
metrics:
  duration: 5
  completed_date: "2026-02-23"
requirements_satisfied: [EXAM-11]
---

# Phase 18 Plan 03: DB Guards Summary

**One-liner:** PostgreSQL BEFORE UPDATE trigger blocks frozen BranchRbiaScore mutations; CHECK constraint enforces ExaminationNode path-code consistency.

## What Was Built

A standalone SQL migration file `prisma/migrations/20260222_rbia_db_guards.sql` containing two database-level integrity guards for the v6.0 RBIA schema:

**Guard 1 — BranchRbiaScore Immutability (EXAM-11)**

- `prevent_frozen_score_update()` PL/pgSQL function checks `OLD.frozenAt IS NOT NULL`
- `prevent_frozen_score_update_trigger` BEFORE UPDATE trigger on `BranchRbiaScore`
- Raises a descriptive exception including the row ID and frozenAt timestamp
- Uses `CREATE OR REPLACE` + `DROP TRIGGER IF EXISTS` for idempotency

**Guard 2 — ExaminationNode Path Integrity**

- `examination_node_path_ends_with_code` CHECK constraint on `ExaminationNode`
- Allows root nodes (`path = code`) and nested nodes (`path LIKE '%/' || code`)
- Wrapped in DO block that skips if constraint already exists (idempotent)
- Verification pre-check query included as comment

Both guards are applied via `psql $DATABASE_URL -f prisma/migrations/20260222_rbia_db_guards.sql`, consistent with the existing `add_audit_log_rules.sql` pattern.

## Tasks Completed

| Task | Name                                | Commit   | Files                                         |
| ---- | ----------------------------------- | -------- | --------------------------------------------- |
| 1    | Create DB guards SQL migration file | 6c8dc320 | prisma/migrations/20260222_rbia_db_guards.sql |

## Verification

- File exists at `prisma/migrations/20260222_rbia_db_guards.sql` (86 lines)
- Contains `prevent_frozen_score_update` function and BEFORE UPDATE trigger
- Contains `examination_node_path_ends_with_code` CHECK constraint in idempotent DO block
- Verification queries documented as SQL comments
- Script is idempotent (safe to run multiple times)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `prisma/migrations/20260222_rbia_db_guards.sql` exists
- [x] Commit 6c8dc320 verified in git log
- [x] File contains both required guards
- [x] File is idempotent
