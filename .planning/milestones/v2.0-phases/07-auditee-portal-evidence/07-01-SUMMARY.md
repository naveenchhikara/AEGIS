---
phase: 07-auditee-portal-evidence
plan: 01
status: complete
executor: BRAVO
commit: 235ac38
---

## Summary

Added database models required for the auditee portal: UserBranchAssignment (branch-scoped access), AuditeeResponse (immutable response records), Evidence description field, and Observation responseDueDate.

## What Was Built

### Task 1: Prisma Schema Additions

- **`ResponseType` enum** — CLARIFICATION, COMPLIANCE_ACTION, REQUEST_EXTENSION
- **`UserBranchAssignment` model** — Many-to-many join table linking users to branches with tenant scoping. Created here, populated by Phase 10 onboarding. Has `@@unique([userId, branchId])` constraint and indexes on tenantId, userId, branchId.
- **`AuditeeResponse` model** — Immutable response records with `responseType`, `content`, `submittedById`. Has `createdAt` but intentionally NO `updatedAt` to enforce immutability (AUD-04). Cascades on observation delete.
- **`Evidence.description`** — Optional `String? @db.Text` field for upload notes
- **`Observation.responseDueDate`** — Optional `DateTime?` for auditee response deadline (set by Audit Manager at ISSUED transition)
- **Relations added:**
  - Tenant: `userBranchAssignments`, `auditeeResponses`
  - User: `branchAssignments`, `auditeeResponses` (via "ResponseSubmittedBy")
  - Branch: `userAssignments`
  - Observation: `auditeeResponses`

### Task 2: RLS Migration SQL

- **`prisma/migrations/add_auditee_portal_schema.sql`** — Contains:
  - RLS enable + force for `UserBranchAssignment` (full CRUD grants)
  - RLS enable + force for `AuditeeResponse` (SELECT + INSERT only — no UPDATE/DELETE for immutability)
  - Composite index `idx_observation_branch_status` on `("tenantId", "branchId", status)` for auditee portal queries
  - Composite index `idx_user_branch_assignment_user` on `("userId", "tenantId")` for branch lookups

## Verification

- `pnpm prisma validate` passes
- `pnpm prisma generate` succeeds (Prisma Client 7.3.0)
- `pnpm build` passes with all 15 routes
- UserBranchAssignment has @@unique([userId, branchId])
- AuditeeResponse has ResponseType enum, no updatedAt field
- Evidence has description field
- Observation has responseDueDate field
- RLS SQL has INSERT-only grants for AuditeeResponse

## Key Decisions

- AuditeeResponse is INSERT-only at database level (no UPDATE/DELETE grants to aegis_app role) — defense in depth for immutability beyond application layer
- UserBranchAssignment created now but will be populated by Phase 10 onboarding — cross-phase ownership model
- Added composite indexes for anticipated auditee portal query patterns (branch + status filtering)
