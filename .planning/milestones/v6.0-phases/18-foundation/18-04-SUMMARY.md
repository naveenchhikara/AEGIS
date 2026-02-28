---
phase: 18
plan: 04
subsystem: permissions/terminology
tags: [terminology, display-strings, rbia, hia, cae]
dependency_graph:
  requires: []
  provides: [TERM-01]
  affects: [permissions, onboarding, concurrent-audit]
tech_stack:
  added: []
  patterns: [string-replacement, display-name-mapping]
key_files:
  created: []
  modified:
    - src/lib/permissions.ts
    - src/lib/__tests__/permissions.test.ts
    - src/app/(onboarding)/onboarding/_components/step-5-user-invites.tsx
    - src/components/concurrent-audit/escalation-panel.tsx
    - src/components/concurrent-audit/irregularity-escalation-dialog.tsx
decisions:
  - "Role.CAE enum and cae:* permissions unchanged — only display strings updated for TERM-01 compliance"
metrics:
  duration: 5 min
  completed: 2026-02-23
  tasks: 1
  files_modified: 5
requirements:
  - TERM-01
---

# Phase 18 Plan 04: CAE-to-HIA Terminology Rename Summary

**One-liner:** Display-only rename of "Chief Audit Executive" to "Head of Internal Audit (HIA)" across 5 source files, preserving Role.CAE enum and cae:\* permission names.

## What Was Built

Replaced all user-visible "Chief Audit Executive" and "Chief Audit Executive (CAE)" display strings with "Head of Internal Audit (HIA)" to align with current Indian audit standards (TERM-01). The underlying enum value `Role.CAE` and all `cae:*` permission strings remain unchanged to avoid breaking the auth/permission system.

## Tasks Completed

| Task | Name                                  | Commit   | Files                        |
| ---- | ------------------------------------- | -------- | ---------------------------- |
| 1    | Update all CAE display strings to HIA | e9fd7a4c | 5 source files + 1 test file |

## Changes Made

1. **`src/lib/permissions.ts`** — `getRoleDisplayName()` mapping: `"Chief Audit Executive"` → `"Head of Internal Audit (HIA)"`
2. **`src/lib/__tests__/permissions.test.ts`** — Updated test assertion to expect new HIA string
3. **`src/app/(onboarding)/onboarding/_components/step-5-user-invites.tsx`** — Two changes: role display map + warning message
4. **`src/components/concurrent-audit/escalation-panel.tsx`** — About-escalation paragraph updated
5. **`src/components/concurrent-audit/irregularity-escalation-dialog.tsx`** — Recipients list label updated

## Verification Results

- `grep "Chief Audit Executive" src/` — zero results (all cleared)
- `grep "Head of Internal Audit" src/` — 7 hits across 5 files
- `pnpm vitest run src/lib/__tests__/permissions.test.ts` — 39/39 tests passed
- Role.CAE enum verified preserved, cae:\* permission names unchanged

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- src/lib/permissions.ts — FOUND
- src/lib/**tests**/permissions.test.ts — FOUND
- src/app/(onboarding)/onboarding/\_components/step-5-user-invites.tsx — FOUND
- src/components/concurrent-audit/escalation-panel.tsx — FOUND
- src/components/concurrent-audit/irregularity-escalation-dialog.tsx — FOUND
- Commit e9fd7a4c — FOUND
