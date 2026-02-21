# Research: Critical Security & Quality Fixes

## Issue 1: IDOR Tenant Isolation (27 vulnerable points)

**DAL Layer (18 functions across 6 files):**

- `governance.ts`: 7 functions (updatePolicyDocument, deletePolicyDocument, updateCommittee, removeCommitteeMember, updateCommitteeMemberRole, updateCommitteeMeeting, updateHousekeepingMetric)
- `users.ts`: 2 functions (updateUserRoles, getUserById)
- `compliance-management.ts`: 2 functions (markRequirementNotApplicable, revertRequirementNotApplicable)
- `concurrent-audit.ts`: 2 functions (updateConcurrentAuditTemplate, deleteConcurrentAuditTemplate)
- `regulatory.ts`: 1 function (updateRegulatoryObservation)
- `investment.ts`: 4 functions (updateInvestmentRecord, updateApplication, updateVendorRiskAssessment, updateIsAuditChecklist)

**Action Layer (14 operations across 8 files):**

- manage-policy.ts, manage-committee.ts, manage-metric.ts, manage-observation.ts, submit-atr.ts, manage-template.ts, manage-records.ts, manage-is-audit.ts

**Already Fixed:** manage-calendar.ts (deleteCalendarEvent), manage-templates.ts (deactivateTemplate)

## Issue 2: Stored XSS (2 files)

- `manage-policy.ts`: `documentUrl: z.string().optional()` — no URL/protocol validation
- `policy-table.tsx`: `href={policy.documentUrl}` — renders user-stored URL as raw href

## Issue 3: N+1 and Unbounded Queries (19 findings)

**N+1 Loops:** analytics.ts (getAuditPlanProgress), run-escalation-job.ts, create-compliance-items.ts, generate-program.ts, compliance-items.ts (updateDaysOpenForOpenItems)
**Unbounded Fetches:** analytics.ts (3 functions), dashboard.ts (3 fallbacks), reports.ts, exports.ts (2), generate-inspection-pack.ts (5 full-table scans), qa-assessment.ts (13 serial queries)
**Raw SQL:** audit-trail.ts (generate_series without LIMIT)

## Issue 4: Session `as any` Casts (~417 occurrences)

- `(session.user as any).tenantId`: 269 occurrences, 116 files
- `(session.user as any).roles`: 138 occurrences, 99 files
- `const user = session.user as any`: 5 occurrences, 2 files
- `(session.user as any).tenantName`: 3 occurrences (BUG: property doesn't exist)
- Root cause: Better Auth types make tenantId/roles optional/nullable
- Fix: TypedSession type with single boundary cast in getRequiredSession()
