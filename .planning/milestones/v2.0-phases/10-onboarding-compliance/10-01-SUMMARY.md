# 10-01 Summary: Database Schema Additions

## Status: COMPLETE

- **Files:** 1 modified (schema.prisma), 1 created (migration SQL), 1 updated (seed.ts)
- **Prisma validate:** Passes
- **Build:** Passes (`pnpm build` — 21 routes, 0 TS errors)

## Changes

### New Enum

- `UserStatus` (INVITED, ACTIVE, INACTIVE, SUSPENDED) — replaces string-based User.status

### New Models

| Model                | Scope                | Fields                                                                                           | Purpose                                               |
| -------------------- | -------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| `RbiMasterDirection` | Global (no tenantId) | shortId, title, description, rbiRef, category                                                    | RBI Master Direction templates for compliance seeding |
| `RbiChecklistItem`   | Global (no tenantId) | itemCode, title, description, category, tierApplicability, frequency, evidenceRequired, priority | Individual checklist items per Master Direction       |
| `OnboardingProgress` | Tenant-scoped (1:1)  | currentStep, completedSteps, stepData, status, expiresAt                                         | Save-and-return onboarding wizard state               |

### Extended Models

| Model                   | New Fields                                                                                        | Purpose                                |
| ----------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `User`                  | status (UserStatus enum), invitedAt, invitedBy, inviteTokenHash, inviteExpiry                     | User invitation flow (ONBD-04)         |
| `Tenant`                | established, pan, cin, registrationNo, registeredWith, onboardingCompleted, onboardingCompletedAt | Onboarding data capture                |
| `ComplianceRequirement` | title, description, priority, frequency, evidenceRequired, isCustom, sourceItemCode               | Seeded vs custom distinction (CMPL-04) |

### Migration SQL

- `prisma/migrations/20260209_onboarding_models.sql`
- UserStatus enum creation + migration from string to enum
- ALTER TABLE for User, Tenant, ComplianceRequirement extensions
- CREATE TABLE for RbiMasterDirection, RbiChecklistItem, OnboardingProgress
- RLS policy on OnboardingProgress (tenant-scoped)
- No RLS on global tables (RbiMasterDirection, RbiChecklistItem)
- Audit trigger on OnboardingProgress

## Must-Have Verification

| Requirement                                                         | Status                              |
| ------------------------------------------------------------------- | ----------------------------------- |
| RbiMasterDirection model exists (global, no tenantId)               | Done                                |
| RbiChecklistItem model exists (global) with tierApplicability array | Done                                |
| OnboardingProgress model exists (tenant-scoped) with stepData JSON  | Done                                |
| UserStatus enum replaces string status                              | Done — migration handles conversion |
| User has invitation fields (inviteTokenHash, inviteExpiry)          | Done                                |
| Tenant has onboarding fields (onboardingCompleted, pan, cin)        | Done                                |
| ComplianceRequirement has sourceItemCode for traceability           | Done                                |
| RLS policy on OnboardingProgress only                               | Done                                |
| Seed file updated for UserStatus enum                               | Done                                |
