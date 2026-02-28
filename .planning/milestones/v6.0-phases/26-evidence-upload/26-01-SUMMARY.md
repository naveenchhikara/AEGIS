---
phase: 26-evidence-upload
plan: 01
subsystem: ui
tags:
  [
    s3,
    evidence-upload,
    presigned-url,
    rbia,
    action-points,
    react-dropzone,
    bm-response,
  ]

# Dependency graph
requires:
  - phase: 22-findings-ui
    provides: BmResponseApCard and BmResponsePageClient components for evidence wiring
  - phase: 19-data-access-layer
    provides: rbia-bm-response DAL with BmResponseActionPointData type
  - phase: 18-foundation
    provides: Evidence model with actionPointId FK in Prisma schema

provides:
  - generateBmEvidenceS3Key helper (bm-evidence S3 namespace)
  - requestBmEvidenceUpload server action (presigned URL with permission + magic-byte validation)
  - confirmBmEvidenceUpload server action (Evidence DB record creation with 5-file limit)
  - BmEvidenceUploadPanel component (dropzone, progress, retry, abort)
  - BmResponseApCard wired with functional evidence upload panel
  - engagementId prop threaded from BmResponsePageClient through to upload panel

affects:
  - auditee-branch-response

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "4-step presigned URL upload: header read → presign server action → XHR PUT → confirm server action"
    - "Permission + magic-byte file validation in server action request step"
    - "Evidence count limit (5/AP) enforced at confirm step before DB write"
    - "S3 namespace segregation: bm-evidence/ distinct from evidence/ and exam-evidence/"

key-files:
  created:
    - src/actions/rbia/bm-evidence.ts
    - src/components/rbia/bm-evidence-upload-panel.tsx
  modified:
    - src/lib/s3.ts
    - src/actions/rbia/schemas.ts
    - src/components/rbia/bm-response-ap-card.tsx
    - src/app/(dashboard)/auditee/[id]/action-points/bm-response-page-client.tsx

key-decisions:
  - "bm-evidence/ S3 path segment used (distinct from evidence/ and exam-evidence/) to keep namespaces clean and enable future IAM policy scoping"
  - "Upload disabled (read-only message) when isResponded=true — BM_RESPONDED APs show informational message not dropzone"
  - "Evidence count limit (5) enforced server-side in confirmBmEvidenceUpload before DB write — client has no knowledge of count"
  - "S3 unconfigured (CredentialsProviderError) returns user-friendly toast instead of crash — safe for dev environments without AWS"
  - "requestBmEvidenceUpload allows BM_RESPONDED status in AP lookup — supplemental evidence can be attached even after initial response"

patterns-established:
  - "BmEvidenceUploadPanel mirrors EvidenceUploadPanel pattern but uses actionPointId/engagementId instead of responseId"

requirements-completed: [BMRP-02]

# Metrics
duration: 10min
completed: 2026-02-28
---

# Phase 26 Plan 01: BM Evidence Upload Summary

**S3 presigned URL evidence upload wired into BM Action Point response workflow via BmEvidenceUploadPanel with dropzone, progress tracking, retry, and 5-file limit enforcement**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-28T11:33:00Z
- **Completed:** 2026-02-28T11:43:19Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added `generateBmEvidenceS3Key` to `src/lib/s3.ts` using `bm-evidence/` S3 namespace
- Added `RequestBmEvidenceUploadSchema` + `ConfirmBmEvidenceUploadSchema` to `src/actions/rbia/schemas.ts`
- Created `src/actions/rbia/bm-evidence.ts` with permission-gated server action pair following established 4-step presigned URL pattern
- Created `BmEvidenceUploadPanel` component with drag-and-drop dropzone, XHR upload with progress, error state, retry, and cancel
- Replaced disabled placeholder buttons in `BmResponseApCard` with functional `BmEvidenceUploadPanel`
- Threaded `engagementId` from `BmResponsePageClient` through `BmResponseApCard` to `BmEvidenceUploadPanel`

## Task Commits

1. **Task 1: Server-side — S3 key helper + Zod schemas + server action pair** - `bb303724` (feat)
2. **Task 2: Client-side — BmEvidenceUploadPanel component + BmResponseApCard wiring** - `6029ebf4` (feat)

## Files Created/Modified

- `src/lib/s3.ts` - Added `generateBmEvidenceS3Key` helper with `bm-evidence/` path namespace
- `src/actions/rbia/schemas.ts` - Added `RequestBmEvidenceUploadSchema` and `ConfirmBmEvidenceUploadSchema`
- `src/actions/rbia/bm-evidence.ts` - New file: `requestBmEvidenceUpload` + `confirmBmEvidenceUpload` server actions
- `src/components/rbia/bm-evidence-upload-panel.tsx` - New file: dropzone component with progress, retry, abort
- `src/components/rbia/bm-response-ap-card.tsx` - Replaced disabled buttons with `BmEvidenceUploadPanel`; added `engagementId` prop
- `src/app/(dashboard)/auditee/[id]/action-points/bm-response-page-client.tsx` - Thread `engagementId` to `BmResponseApCard`

## Decisions Made

- `bm-evidence/` S3 path segment used (distinct from `evidence/` and `exam-evidence/`) to keep namespaces clean and enable future IAM policy scoping
- Upload disabled (read-only message displayed) when `isResponded=true` — BM_RESPONDED APs show informational message instead of dropzone
- Evidence count limit (5 per AP) enforced server-side in `confirmBmEvidenceUpload` before DB write — client has no knowledge of count
- S3 unconfigured environments (`CredentialsProviderError`) return user-friendly toast instead of crashing — safe for dev without AWS
- `requestBmEvidenceUpload` allows `BM_RESPONDED` status in AP lookup — supplemental evidence can be attached even after initial response

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — TypeScript compiled cleanly. The 3 pre-existing TS errors (.next/ validator, test regex flag) were confirmed unrelated to this plan's changes via git stash verification.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- BMRP-02 fully satisfied: Branch Manager can attach evidence files (PDF, JPEG, PNG, DOCX, XLSX, max 10MB) when responding to Action Points
- Phase 26 Plan 01 complete — phase 26 is the final gap-closure phase
- Evidence uploaded via `bm-evidence/` S3 path; DB record created with `actionPointId` FK in `Evidence` table
- All v6.0 RBIA requirements gap-closure phases now complete (Phases 24, 25, 26)

---

_Phase: 26-evidence-upload_
_Completed: 2026-02-28_
