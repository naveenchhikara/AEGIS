---
phase: 07-auditee-portal-evidence
plan: 02
status: complete
executor: DELTA
---

## Summary

Created the S3 utility module for evidence file upload and download with presigned URLs, magic-byte file type validation, and tenant-scoped key generation.

## What Was Built

- **`src/lib/s3.ts`** (162 lines) — Server-only S3 utility module with:
  - S3Client singleton configured for `ap-south-1` (Mumbai)
  - `validateFileType(fileHeader)` — Base64 → Buffer → `fileTypeFromBuffer()` magic-byte detection
  - `generateS3Key(tenantId, observationId, extension)` — Tenant-scoped path: `{tenantId}/evidence/{observationId}/{uuid}.{ext}`
  - `generateUploadUrl(s3Key, contentType, fileSize)` — Presigned PUT with SSE-S3 encryption, 5-minute expiry, 10MB limit
  - `generateDownloadUrl(s3Key)` — Presigned GET with 5-minute expiry
  - `verifyUpload(s3Key)` — HeadObject with graceful NotFound handling
  - Exported constants: `ALLOWED_FILE_TYPES` (PDF, JPEG, PNG, DOCX, XLSX), `MAX_FILE_SIZE` (10MB)

## Packages Installed

- `@aws-sdk/client-s3` ^3.985.0
- `@aws-sdk/s3-request-presigner` ^3.985.0
- `file-type` ^21.3.0

## Verification

- `pnpm build` passes with no errors
- `import "server-only"` at line 1
- 5 exported functions present
- ALLOWED_FILE_TYPES: PDF, JPEG, PNG, DOCX, XLSX only
- File size limit: 10MB (10 _ 1024 _ 1024)
- Presigned URL expiry: 300 seconds (5 minutes)
- S3 key format: `{tenantId}/evidence/{observationId}/{uuid}.{ext}`
- NotFound errors handled gracefully in verifyUpload
- SSE-S3 (AES256) encryption in PutObjectCommand
