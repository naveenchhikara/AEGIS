---
phase: 07-auditee-portal-evidence
plan: 08
status: complete
type: checkpoint
started: 2026-02-09T17:30:00Z
completed: 2026-02-09T18:00:00Z
---

## What Was Done

E2E verification checkpoint for the complete auditee portal and evidence system. All 7 success criteria from the phase definition were validated through 17 browser-based tests.

## Verification Results

**16 of 17 tests passed, 1 skipped (permission guard requires different user login)**

### Success Criteria Verification

| Criteria                            | Status | Evidence                                                                                                                                                    |
| ----------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUD-01: Branch-scoped access        | PASS   | Vikram sees only Kothrud + Head Office observations. Direct URL to Bibvewadi observation triggers notFound() — no data leaked.                              |
| AUD-02: Response submission         | PASS   | Clarification, Compliance Action, Request Extension forms work. AlertDialog confirmation with immutability warning. Response appears in Previous Responses. |
| AUD-03/EVID-01: Evidence upload     | PASS   | Drag-and-drop PDF upload to S3 via presigned URL. Green checkmark on success. Counter updates to "1 of 20 files uploaded".                                  |
| EVID-02: S3 storage with encryption | PASS   | File stored at `{tenantId}/evidence/{observationId}/{uuid}.pdf` in aegis-evidence-dev bucket with AES256 encryption.                                        |
| AUD-04: Immutability                | PASS   | No edit/delete buttons on responses or evidence. Evidence list has no delete option. Response form disabled for CLOSED observations.                        |
| AUD-06/AUD-07: Deadline tracking    | PASS   | Deadline badges show visual states: overdue (red), due tomorrow (amber), remaining (muted). Overdue banner displays count above observation list.           |
| EVID-04: Evidence in timeline       | PASS   | "Evidence uploaded: file by Vikram Kulkarni, 09 Feb 2026" appears in EVIDENCE ACTIVITY section of timeline.                                                 |

### Bugs Fixed During Testing

1. **S3 presigned URL 403**: `PutObjectCommand` included `ServerSideEncryption` and `ContentLength` which signed those as required headers. Browser XHR only sends `Content-Type` → signature mismatch. Fixed by removing both params (bucket has default SSE-S3).
2. **Env var mismatch**: Code used `S3_EVIDENCE_BUCKET` but `.env` has `S3_BUCKET_NAME`. Fixed in `src/lib/s3.ts` and `src/app/api/reports/board-report/route.ts`.
3. **Dashboard API route missing**: Created `/api/dashboard/route.ts` to fix widget "Failed to load" errors.

### Infrastructure Configured

- AWS S3 bucket `aegis-evidence-dev` in ap-south-1 with versioning, SSE-S3, and CORS
- IAM user `aegis-deploy` with AdministratorAccess
- CORS configured for localhost:3000, localhost:3001, aegis-audit.com

## Files Modified

- `src/lib/s3.ts` — Fixed presigned URL params and env var name
- `src/app/api/reports/board-report/route.ts` — Fixed env var name
- `src/app/api/dashboard/route.ts` — Created (was missing)

## Remaining Gap

- Test 2 (Permission guard): Requires logging in as non-AUDITEE role. Code review confirms `requirePermission("observation:read")` guard exists in page.tsx. Will be fully testable when Phase 10 onboarding creates additional user accounts.
