---
status: complete
phase: 26-evidence-upload
source: 26-01-SUMMARY.md
started: 2026-02-28T11:55:00Z
updated: 2026-02-28T12:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. BmEvidenceUploadPanel renders dropzone in AP card

expected: When expanding a BmResponseApCard that has status ISSUED or BM_RESPONSE_DUE, the response form shows a drag-and-drop zone with text "Drag & drop evidence or click to browse" and accepted file types "PDF, JPEG, PNG, DOCX, XLSX · Max 10.0 MB" below the response textarea.
result: pass

### 2. Upload disabled for responded APs

expected: When an ActionPoint has status BM_RESPONDED, the evidence upload area shows a read-only message "Evidence upload is not available for responded action points." instead of the dropzone — no drag-drop or click-to-browse available.
result: pass

### 3. Server action permission gating

expected: Both requestBmEvidenceUpload and confirmBmEvidenceUpload server actions check for action_point:bm_respond permission and return "You do not have permission to upload evidence for action points." if the user lacks the permission.
result: pass

### 4. S3 key namespace segregation

expected: The generateBmEvidenceS3Key function produces S3 keys in the format `{tenantId}/bm-evidence/{actionPointId}/{uuid}.{ext}` — distinct from the `evidence/` and `exam-evidence/` namespaces used by other upload features.
result: pass

### 5. Evidence count limit enforcement

expected: The confirmBmEvidenceUpload server action checks the evidence count per ActionPoint and returns "Maximum 5 evidence files per Action Point." when the count reaches 5 — preventing unlimited uploads.
result: pass

### 6. engagementId prop threading

expected: BmResponsePageClient passes engagementId to each BmResponseApCard, which passes it to BmEvidenceUploadPanel — the prop chain is complete from page to upload component.
result: pass

### 7. Graceful S3 error handling

expected: When S3 is not configured (CredentialsProviderError), the server action returns "Evidence upload is not configured. Please contact your administrator." instead of crashing — safe for dev environments without AWS.
result: pass

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
