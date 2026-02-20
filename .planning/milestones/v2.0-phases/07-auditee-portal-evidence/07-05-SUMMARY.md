---
phase: 07-auditee-portal-evidence
plan: 05
status: complete
commit: 7fbcd63
---

# 07-05 Summary: Evidence Upload + Response Form UI Components

## What was done

Created four client-side components for auditee interactions in `src/components/auditee/`:

### 1. evidence-uploader.tsx (EvidenceUploader)

- Drag-and-drop file upload via `react-dropzone`
- Accepted types: PDF, JPEG, PNG, DOCX, XLSX (max 10MB each)
- Concurrent upload queue: max 3 simultaneous uploads, FIFO processing
- Per-file upload flow: read 4KB header → requestEvidenceUpload → XHR PUT to S3 → confirmEvidenceUpload
- XMLHttpRequest used (not fetch) for `upload.onprogress` support
- Retry with exponential backoff (1s, 2s, 4s; max 3 attempts)
- Visual states per file: queued, uploading (progress bar), confirming, complete (green check), error (red X + retry)

### 2. response-form.tsx (ResponseForm)

- Response type selector (RadioGroup): Clarification, Compliance Action, Extension Request
- Text area with dynamic label/placeholder based on selected type
- react-hook-form + Zod validation (min 10 chars)
- AlertDialog confirmation before submission with immutability warning (AUD-04)
- Only renders form when observation status is ISSUED or RESPONSE
- Calls `submitAuditeeResponse` server action

### 3. evidence-list.tsx (EvidenceList)

- Displays uploaded evidence files with file type badge, size, date, uploader name
- Download button triggers presigned URL via callback prop
- Loading state via useTransition during download
- Empty state: "No evidence uploaded yet"
- No delete functionality (evidence is immutable)

### 4. evidence-timeline-entry.tsx (EvidenceTimelineEntry)

- Renders evidence upload events in observation timeline
- Shows "Evidence uploaded: {filename} by {uploaderName}" with formatted date
- Blue file icon with compact layout

## Dependencies installed

- `react-dropzone` added explicitly to package.json (was transitive dependency)

## Verification

- `pnpm build` ✅ — all components compile without errors
- All must_haves satisfied:
  - react-dropzone drag-and-drop (EVID-01) ✅
  - XMLHttpRequest upload progress (EVID-01) ✅
  - Max 3 concurrent uploads ✅
  - Client-side file type/size validation (EVID-03) ✅
  - Response type selector with 3 options (AUD-02, AUD-05) ✅
  - Immutability confirmation dialog (AUD-04) ✅
  - Evidence list with download, no delete (EVID-04) ✅
  - Evidence timeline entry (EVID-04) ✅
