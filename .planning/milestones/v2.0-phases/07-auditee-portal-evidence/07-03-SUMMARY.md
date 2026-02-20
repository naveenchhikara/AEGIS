# Plan 07-03 Summary: Auditee Server Actions + DAL

## Status: COMPLETE

## What was built

### 1. src/data-access/auditee.ts — Branch-scoped DAL (189 lines)

- `getUserBranches(session)` — queries UserBranchAssignment for user's branch IDs
- `getObservationsForAuditee(session, cursor?, limit?)` — cursor-based pagination, branch-scoped, filters to ISSUED/RESPONSE/COMPLIANCE/CLOSED statuses, ordered by dueDate ASC then createdAt DESC
- `getObservationDetailForAuditee(session, observationId)` — full observation with timeline, evidence (non-deleted), auditeeResponses, branch/auditArea/assignedTo/createdBy relations, branch authorization check
- All functions use prismaForTenant() + belt-and-suspenders WHERE tenantId
- Runtime tenant assertion in detail fetch
- `import "server-only"` guard

### 2. src/actions/auditee.ts — 4 Server Actions (470 lines)

- **submitAuditeeResponse**: Validates AUDITEE role + ISSUED/RESPONSE status + branch auth. Creates immutable AuditeeResponse record + timeline entry. Auto-transitions ISSUED→RESPONSE on first response with additional status_changed timeline entry.
- **requestEvidenceUpload**: Validates magic bytes via validateFileType(). Pre-checks evidence count < 20. Generates tenant-scoped S3 key + presigned PUT URL.
- **confirmEvidenceUpload**: Verifies S3 upload via HeadObject. Atomic evidence count check inside $transaction (prevents race conditions at max 20). Creates Evidence record + evidence_uploaded timeline entry.
- **getEvidenceDownloadUrl**: Any authenticated role can download. AUDITEE users additionally checked for branch authorization. Returns presigned GET URL.

All actions: Zod safeParse, session-only tenantId, `{ success, data?, error? }` return pattern, never throw.

### 3. src/data-access/audit-context.ts — Added AUDITEE action type

- Added `AUDITEE.RESPONSE_SUBMITTED: "auditee.response_submitted"` to AUDIT_ACTION_TYPES

### 4. shadcn UI components for Wave 2

- `src/components/ui/alert.tsx` — Alert component for OverdueBanner (07-04)
- `src/components/ui/radio-group.tsx` — RadioGroup for ResponseForm type selector (07-05)

## Deviations

- `fileName` from RequestUploadSchema is validated but not used in S3 key generation (S3 key uses UUID). Removed from destructuring to avoid unused variable warning.
- Added Alert and RadioGroup shadcn components proactively (Wave 2 prerequisites).

## Commits

1. `94c6de6 feat(07-03): implement auditee server actions and data access layer` — 5 files, 781 insertions

## Verification

- `pnpm build` — PASS (0 errors, 14 dynamic pages)
- DAL imports `server-only` ✓
- All 3 DAL functions exist with prismaForTenant + belt-and-suspenders ✓
- All 4 server actions exist with Zod validation ✓
- No action accepts userId/tenantId as client input ✓
- Branch authorization via getUserBranches in all relevant functions ✓
- Evidence count atomic check inside $transaction ✓
- Timeline events use stable values: auditee_response, evidence_uploaded, status_changed ✓
- AuditeeResponse is immutable (createdAt only, no update/delete) ✓
