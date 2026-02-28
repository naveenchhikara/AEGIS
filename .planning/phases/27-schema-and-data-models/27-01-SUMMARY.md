---
phase: 27-schema-and-data-models
plan: "01"
subsystem: database
tags: [schema, prisma, v7.0, loan-accounts, sampling, examination]
dependency_graph:
  requires: []
  provides:
    [
      LoanAccount,
      SamplingConfig,
      AccountExamResponse,
      ExaminationQuestion,
      AccountExamResponseStatus,
    ]
  affects: [Tenant, AuditEngagement, Evidence]
tech_stack:
  added: []
  patterns:
    [polymorphic-evidence-fk, jsonb-metadata, decoupled-moduleCode-linkage]
key_files:
  created: []
  modified:
    - prisma/schema.prisma
decisions:
  - "AccountExamResponse has no tenantId Tenant relation field (only the String column) — consistent with plan spec; tenantId is stored for query isolation but Tenant relation object not declared to avoid circular complexity"
  - "DB push skipped — no local PostgreSQL at localhost:5433; schema validated and client generated successfully"
metrics:
  duration: "~10 minutes"
  completed: "2026-02-28"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 1
---

# Phase 27 Plan 01: Schema and Data Models Summary

**One-liner:** Added 4 v7.0 Prisma models (ExaminationQuestion, LoanAccount, SamplingConfig, AccountExamResponse) plus AccountExamResponseStatus enum for sample-based credit module examination.

## What Was Built

All 4 new models and 1 new enum added to `prisma/schema.prisma`:

| Model                 | Purpose                           | Key Fields                                                                             |
| --------------------- | --------------------------------- | -------------------------------------------------------------------------------------- |
| `ExaminationQuestion` | Per-module question library       | `moduleCode`, `text`, `rbiReference`, `bestPracticeTip`, `weight`, `isCritical`        |
| `LoanAccount`         | Uploaded branch loan portfolio    | `accountNo`, `borrowerName`, `sanctionAmount`, `assetClass`, `dpd`, `metadata` (JSONB) |
| `SamplingConfig`      | HIA-configured sampling criteria  | `sampleSizePct`, `criteriaBuckets` (JSONB), `isLocked`, `sampleCount`                  |
| `AccountExamResponse` | Per-account per-question response | `status` (COMPLIANT/VIOLATION), `note`, `respondedById`                                |

**Existing models updated:**

- `Tenant` — added `examinationQuestions[]`, `loanAccounts[]`, `samplingConfigs[]` reverse relations
- `AuditEngagement` — added `loanAccounts[]`, `samplingConfigs[]`, `accountExamResponses[]` reverse relations
- `Evidence` — added `accountExamResponseId` FK + `accountExamResponse` relation + index

## Verification Results

- `npx prisma validate` — PASSED (schema valid)
- `pnpm db:generate` — PASSED (Prisma client 7.4.1 generated to `src/generated/prisma/`)
- `pnpm db:push` — SKIPPED (no local PostgreSQL at localhost:5433 — non-blocking per plan)
- Model count grep — 4 models confirmed present
- Enum grep — `AccountExamResponseStatus` confirmed present
- Reverse relation grep — all 7 relation arrays confirmed in Tenant and AuditEngagement
- Evidence FK grep — `accountExamResponseId` confirmed in Evidence model and indexes

## Requirements Satisfied

- **QMGT-04** — ExaminationQuestion has `text`, `rbiReference`, `bestPracticeTip`, `weight`, `isCritical` fields
- **XMOD-01** — ExaminationQuestion has `moduleCode` field enabling independent question sets per credit module
- **XMOD-02** — LoanAccount has JSONB `metadata` column for module-specific loan data

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `prisma/schema.prisma` — FOUND (modified, 166 lines added)
- Commit `cc0a042e` — FOUND
- 4 new models — FOUND (grep count = 4)
- `AccountExamResponseStatus` enum — FOUND
- Generated client types — FOUND in `src/generated/prisma/`
