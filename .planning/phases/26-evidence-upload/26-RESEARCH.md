# Phase 26: Evidence Upload - Research

**Researched:** 2026-02-28
**Domain:** S3 presigned URL evidence upload for Branch Manager Action Point responses
**Confidence:** HIGH

## Summary

Phase 26 is a targeted gap-closure phase that wires up the evidence upload feature for Branch Manager (BM) Action Point responses. The infrastructure is almost entirely built. The `src/lib/s3.ts` module already provides `validateFileType`, `generateUploadUrl`, `generateDownloadUrl`, and `verifyUpload`. Two evidence upload UI components already exist and are fully functional (`EvidenceUploader` for observations, `EvidenceUploadPanel` for examination responses). The `Evidence` Prisma model already has an `actionPointId` foreign key field with the `ActionPointEvidence` relation on `ActionPoint`. The BM response page (`BmResponseApCard`) has the "Attach Evidence" and "Upload" buttons present but explicitly `disabled={true}`.

The primary work is: (1) a new server action pair (`requestBmEvidenceUpload` / `confirmBmEvidenceUpload`) that gates on `action_point:bm_respond` and links Evidence to `actionPointId`; (2) an `ActionPointEvidenceUpload` React client component adapted from `EvidenceUploadPanel` to accept `actionPointId`; and (3) wiring the component into `BmResponseApCard` to replace the disabled buttons. No schema changes, no new dependencies, no new DAL files are required.

**Primary recommendation:** Reuse `EvidenceUploadPanel`'s exact pattern — identical 4-step flow (read header → presign → XHR PUT → confirm). Create a `BmEvidenceUploadPanel` component and two server actions in `src/actions/rbia/`. The `generateS3Key` function only needs a new S3 path prefix (`${tenantId}/bm-evidence/${actionPointId}/...`) to distinguish from examination evidence.

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                                        | Research Support                                                                                                                                                                                       |
| ------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BMRP-02 | Branch Manager can respond to each ActionPoint individually with text response and evidence upload | Server action pair (request + confirm) + BmEvidenceUploadPanel component + wire into BmResponseApCard. All prerequisite infrastructure (s3.ts, Evidence model with actionPointId, permissions) exists. |

</phase_requirements>

## Standard Stack

### Core

| Library                         | Version                 | Purpose                               | Why Standard                                     |
| ------------------------------- | ----------------------- | ------------------------------------- | ------------------------------------------------ |
| `@aws-sdk/client-s3`            | Installed (project dep) | S3 PutObjectCommand, GetObjectCommand | Already used in `src/lib/s3.ts`                  |
| `@aws-sdk/s3-request-presigner` | Installed (project dep) | `getSignedUrl` for presigned PUT/GET  | Already used in `src/lib/s3.ts`                  |
| `react-dropzone`                | `^14.4.0` (installed)   | Drag-and-drop file selection UI       | Already used in both existing upload components  |
| `file-type`                     | `^21.3.0` (installed)   | Magic-byte MIME validation on server  | Already used in `src/lib/s3.ts:validateFileType` |
| `sonner`                        | Installed (project dep) | Toast notifications for upload state  | Already used in all client components            |

### Supporting

| Library                           | Version | Purpose                              | When to Use                                          |
| --------------------------------- | ------- | ------------------------------------ | ---------------------------------------------------- |
| `XMLHttpRequest` (browser native) | N/A     | XHR PUT to S3 with progress tracking | Required — fetch API does not expose upload progress |

### Alternatives Considered

| Instead of    | Could Use                | Tradeoff                                                                                              |
| ------------- | ------------------------ | ----------------------------------------------------------------------------------------------------- |
| XHR PUT to S3 | Fetch API                | Fetch has no upload progress events — XHR is required for `xhr.upload.onprogress`                     |
| Presigned URL | Server-side proxy upload | Presigned URL avoids 10MB body going through Next.js server (only works if S3_BUCKET_NAME configured) |

**Installation:** No new packages needed — all dependencies already installed.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── actions/rbia/
│   └── findings.ts              # Add requestBmEvidenceUpload + confirmBmEvidenceUpload here
├── components/rbia/
│   ├── bm-evidence-upload-panel.tsx   # NEW: BmEvidenceUploadPanel component
│   └── bm-response-ap-card.tsx        # MODIFY: Wire in BmEvidenceUploadPanel
└── lib/
    └── s3.ts                          # MODIFY: Add generateBmEvidenceS3Key helper
```

### Pattern 1: 4-Step Presigned Upload Flow (Project Standard)

**What:** Client reads file header → server validates and returns presigned URL → client XHR PUTs to S3 → client calls confirm action → server verifies with HeadObject and creates Evidence DB record.

**When to use:** Always — this is the established project pattern for all evidence uploads.

**Example (from `src/components/audit-execution/evidence-upload-panel.tsx`):**

```typescript
// Step 1: Read file header (first 4KB as base64 for magic-byte validation)
const fileHeader = await readFileHeader(file); // slice(0, 4096) → arrayBuffer → btoa

// Step 2: Get presigned URL from server action
const requestResult = await requestBmEvidenceUpload({
  actionPointId,
  engagementId,
  fileHeader,
  fileName: file.name,
  fileSize: file.size,
  contentType: file.type,
});
// Returns: { uploadUrl, s3Key, contentType }

// Step 3: XHR PUT directly to S3 (with progress tracking)
const xhr = new XMLHttpRequest();
xhr.upload.onprogress = (e) => {
  /* update progress % */
};
xhr.open("PUT", requestResult.data.uploadUrl);
xhr.setRequestHeader("Content-Type", requestResult.data.contentType);
xhr.send(file);

// Step 4: Confirm upload — server runs HeadObject then creates Evidence record
const confirmResult = await confirmBmEvidenceUpload({
  actionPointId,
  engagementId,
  s3Key: requestResult.data.s3Key,
  filename: file.name,
  fileSize: file.size,
  contentType: requestResult.data.contentType,
});
// Returns: { evidenceId }
```

### Pattern 2: S3 Key Namespace for BM Evidence

**What:** The existing `generateS3Key(tenantId, observationId, extension)` encodes `observation` in the path. For ActionPoint BM evidence, use a distinct path prefix.

**Example (new helper to add to `src/lib/s3.ts`):**

```typescript
export function generateBmEvidenceS3Key(
  tenantId: string,
  actionPointId: string,
  extension: string,
): string {
  const uuid = crypto.randomUUID();
  return `${tenantId}/bm-evidence/${actionPointId}/${uuid}.${extension}`;
}
```

This keeps BM evidence files logically separated from observation and examination evidence in S3.

### Pattern 3: Server Action Pair for BM Evidence

**What:** Two server actions gated on `action_point:bm_respond` permission (BRANCH_HEAD role).

```typescript
// src/actions/rbia/findings.ts (additions)

// ─── requestBmEvidenceUpload ────────────────────────────────────────────────
export async function requestBmEvidenceUpload(input: RequestBmEvidenceInput) {
  const session = await getRequiredSession();
  const tenantId = session.user.tenantId;

  if (!hasPermission(session.user.roles, "action_point:bm_respond")) {
    return { success: false as const, error: "Permission denied." };
  }

  const parsed = RequestBmEvidenceUploadSchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, error: parsed.error.issues[0].message };

  const { actionPointId, engagementId, fileHeader, fileName, fileSize } =
    parsed.data;
  const db = prismaForTenant(tenantId);

  // Verify ActionPoint exists, belongs to tenant, is in respondable state
  const ap = await db.actionPoint.findFirst({
    where: {
      id: actionPointId,
      tenantId,
      engagementId,
      status: { in: ["ISSUED", "BM_RESPONSE_DUE", "BM_RESPONDED"] },
    },
    select: { id: true },
  });
  if (!ap)
    return {
      success: false as const,
      error: "Action Point not found or not accessible.",
    };

  const fileTypeResult = await validateFileType(fileHeader);
  if (!fileTypeResult.valid)
    return { success: false as const, error: fileTypeResult.error };

  const s3Key = generateBmEvidenceS3Key(
    tenantId,
    actionPointId,
    fileTypeResult.extension,
  );
  const uploadUrl = await generateUploadUrl(
    s3Key,
    fileTypeResult.mimeType,
    fileSize,
  );

  return {
    success: true as const,
    data: { uploadUrl, s3Key, contentType: fileTypeResult.mimeType },
  };
}

// ─── confirmBmEvidenceUpload ────────────────────────────────────────────────
export async function confirmBmEvidenceUpload(input: ConfirmBmEvidenceInput) {
  // verify upload in S3 via HeadObject
  // create Evidence record with actionPointId set
  // revalidatePath auditee/[id]/action-points
}
```

### Pattern 4: BmEvidenceUploadPanel Component

**What:** A focused single-file upload component (not multi-file queue like EvidenceUploader). Mirrors `EvidenceUploadPanel` but uses `requestBmEvidenceUpload` / `confirmBmEvidenceUpload` and accepts `actionPointId` instead of `responseId`.

```typescript
// src/components/rbia/bm-evidence-upload-panel.tsx
interface BmEvidenceUploadPanelProps {
  actionPointId: string;
  engagementId: string;
  disabled?: boolean; // passed true when ap.status === "BM_RESPONDED"
  onUploadComplete?: () => void;
}
```

### Anti-Patterns to Avoid

- **Using fetch for S3 PUT:** fetch has no `upload.onprogress` — always use `XMLHttpRequest` for upload progress.
- **Skipping HeadObject verification:** `confirmBmEvidenceUpload` MUST call `verifyUpload(s3Key)` before creating the Evidence DB record — this validates the file actually reached S3.
- **ContentLength in presigned URL:** Do NOT include `ContentLength` or `ServerSideEncryption` in `PutObjectCommand` for presigned URLs — causes 403 signature mismatch in browser XHR (documented comment in `src/lib/s3.ts:generateUploadUrl`).
- **Accepting tenantId from client:** `tenantId` MUST come from session only, never from URL, body, or query params.
- **Allowing upload to already-responded APs:** The `requestBmEvidenceUpload` action must verify the AP is in `ISSUED`, `BM_RESPONSE_DUE`, or `BM_RESPONDED` status — evidence can attach to a responded AP for post-hoc supplemental evidence.
- **Storing file data server-side:** The presigned URL approach is specifically chosen so file bytes never pass through the Next.js server. Don't introduce `FormData` or `multer`-style parsing.

## Don't Hand-Roll

| Problem                  | Don't Build                   | Use Instead                                | Why                                                                                    |
| ------------------------ | ----------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------- |
| File type validation     | Extension check on filename   | `validateFileType()` from `src/lib/s3.ts`  | Magic-byte validation is already implemented; extension checking is trivially bypassed |
| Drag-and-drop UI         | Custom drag event handlers    | `react-dropzone` (already installed)       | Already used in both existing upload components; handles all edge cases                |
| Presigned URL generation | Custom S3 signature           | `generateUploadUrl()` from `src/lib/s3.ts` | Already handles SSE, expiry, and AWS SDK type workaround                               |
| Upload verification      | Trust client-reported success | `verifyUpload()` from `src/lib/s3.ts`      | HeadObject is already implemented and called in examination upload confirmation        |
| S3 key generation        | Ad-hoc path string            | `generateBmEvidenceS3Key()` (new)          | Ensures UUID uniqueness and tenant scoping — mirrors existing `generateS3Key` pattern  |

**Key insight:** The project already has a complete, battle-tested evidence upload infrastructure. Phase 26 is wiring an existing pattern to a new context (ActionPoints instead of Observations/ExaminationResponses), not building something new.

## Common Pitfalls

### Pitfall 1: Forgetting the `actionPointId` field in Evidence schema

**What goes wrong:** Creating an Evidence record without setting `actionPointId` — the evidence is created but not linked to the AP, it becomes an orphaned row.
**Why it happens:** `Evidence` model is polymorphic — `observationId`, `examinationResponseId`, `newExaminationResponseId`, and `actionPointId` are all nullable. Easy to miss the correct field.
**How to avoid:** In `confirmBmEvidenceUpload`, explicitly set `actionPointId: validated.actionPointId` and `observationId: null, examinationResponseId: null, newExaminationResponseId: null` when creating the Evidence record.
**Warning signs:** Evidence records in DB with all foreign keys null.

### Pitfall 2: BmResponseApCard disabled state management

**What goes wrong:** Evidence upload is enabled when AP is `BM_RESPONDED` but the textarea is disabled. Or vice versa — textarea re-enables after evidence upload triggers revalidation.
**Why it happens:** The `isResponded` boolean controls textarea `disabled` state but was not accounted for in the upload component design.
**How to avoid:** Pass `disabled={isResponded}` to `BmEvidenceUploadPanel` independently of whether the form is collapsed — BMs should be able to add supplemental evidence even after responding.
**Warning signs:** TypeScript type mismatch on `disabled` prop, or upload panel allows upload when it shouldn't.

### Pitfall 3: Missing `revalidatePath` for auditee page

**What goes wrong:** After confirming upload, the evidence count doesn't update in UI until manual refresh.
**Why it happens:** Both the auditee page and the RBIA findings page display AP state. Both need revalidation.
**How to avoid:** Call `revalidatePath(\`/auditee/${engagementId}/action-points\`)` and `revalidatePath(\`/audit-execution/${engagementId}/rbia/findings\`)`in`confirmBmEvidenceUpload`.
**Warning signs:** Toast shows "success" but UI shows old evidence list.

### Pitfall 4: `generateS3Key` signature mismatch

**What goes wrong:** `generateS3Key` takes `(tenantId, observationId, extension)` — its second param is named `observationId` but semantically it's just a resource ID used in the path. Passing `actionPointId` there would work technically but pollute the key path with misleading segment names.
**Why it happens:** The existing helper's name implies observation context.
**How to avoid:** Add a new `generateBmEvidenceS3Key(tenantId, actionPointId, extension)` that encodes `bm-evidence` in the path instead of `evidence`. This clarifies the S3 structure and is the same 3-line function.
**Warning signs:** S3 keys like `<tenantId>/evidence/<actionPointId>/...` — ambiguous with examination evidence.

### Pitfall 5: S3 not configured in dev environment

**What goes wrong:** `generateUploadUrl` throws because `AWS_ACCESS_KEY_ID` etc. are not set in `.env.local`. The upload button triggers an internal server error.
**Why it happens:** S3 env vars are optional per `src/env.ts` — the S3Client is initialized unconditionally but AWS SDK credential resolution fails at runtime.
**How to avoid:** The server action should catch S3 errors and return a user-friendly message: "Evidence upload is not configured in this environment." The component should surface this as a toast, not a crash.
**Warning signs:** 500 error in server action with `CredentialsProviderError` from AWS SDK.

## Code Examples

Verified patterns from existing codebase:

### Evidence DB record creation with actionPointId

```typescript
// Source: src/lib/s3.ts + confirmed pattern from src/actions/audit-execution/upload-examination-evidence.ts
const evidence = await tx.evidence.create({
  data: {
    tenantId,
    actionPointId: validated.actionPointId, // <-- key field for BM evidence
    // all other polymorphic fields left null by default (not setting them)
    filename: validated.filename,
    s3Key: validated.s3Key,
    fileSize: validated.fileSize,
    contentType: validated.contentType,
    description: validated.description ?? null,
    uploadedById: session.user.id,
  },
});
```

### Zod schema for BM evidence request (add to `src/actions/rbia/schemas.ts`)

```typescript
export const RequestBmEvidenceUploadSchema = z.object({
  actionPointId: z.string().uuid(),
  engagementId: z.string().uuid(),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive(),
  contentType: z.string().min(1),
  fileHeader: z.string().optional(), // first 4KB as base64
});

export const ConfirmBmEvidenceUploadSchema = z.object({
  actionPointId: z.string().uuid(),
  engagementId: z.string().uuid(),
  s3Key: z.string().min(1),
  filename: z.string().min(1),
  fileSize: z.number().positive(),
  contentType: z.string().min(1),
  description: z.string().optional(),
});
```

### BmResponseApCard wiring (how disabled buttons get replaced)

```typescript
// src/components/rbia/bm-response-ap-card.tsx (modified section)
{expanded && (
  <div className="space-y-3 border-t pt-3">
    <Textarea ... disabled={isResponded} rows={4} />

    {/* Replace disabled buttons with actual upload component */}
    <BmEvidenceUploadPanel
      actionPointId={actionPoint.id}
      engagementId={engagementId}   // <-- need to thread engagementId prop into card
      disabled={isResponded}
    />
  </div>
)}
```

Note: `BmResponseApCard` currently does not receive `engagementId` as a prop. This must be added as a new prop threaded down from `BmResponsePageClient`.

### Evidence list display in BmResponseApCard (optional enhancement)

After upload, the component can optionally show uploaded filenames. This requires the DAL to return evidence for each AP. The `BmResponseActionPointData` type does not currently include evidence. If evidence display is in scope, the DAL query in `rbia-bm-response.ts` needs `include: { evidence: { select: { id, filename } } }`.

## State of the Art

| Old Approach                    | Current Approach                        | When Changed            | Impact                                                 |
| ------------------------------- | --------------------------------------- | ----------------------- | ------------------------------------------------------ |
| Direct server-side file upload  | S3 presigned URL (client → S3 directly) | Phase 23 implementation | Eliminates 10MB files transiting Next.js server memory |
| Extension-based file type check | Magic-byte validation via `file-type`   | Phase 23 implementation | Prevents MIME spoofing                                 |

**Deprecated/outdated:**

- None — the presigned URL pattern in this codebase is current and correct.

## Open Questions

1. **Evidence display after upload**
   - What we know: `BmResponseApCard` has no evidence list display. `BmResponseActionPointData` type has no `evidence` field. The BM response DAL does not fetch evidence.
   - What's unclear: Should uploaded files be listed in the card after upload? The requirement (BMRP-02) says "evidence upload" but doesn't specify display.
   - Recommendation: Implement upload-only for BMRP-02 compliance. Add evidence list display as a follow-up if desired — keep this phase focused.

2. **Evidence count limit for AP responses**
   - What we know: Observation evidence has a 20-file limit enforced atomically. ActionPoint evidence has no documented limit.
   - What's unclear: Should AP evidence have a limit?
   - Recommendation: Implement a reasonable limit (e.g., 5 files per AP) to guard against abuse. Add a non-atomic pre-check in `requestBmEvidenceUpload` and atomic check in `confirmBmEvidenceUpload` transaction.

3. **Download URL for existing evidence**
   - What we know: `src/lib/s3.ts` has `generateDownloadUrl()`. The auditee AP page doesn't display evidence download links.
   - What's unclear: Do auditors viewing the RBIA findings page need to see and download BM-submitted evidence?
   - Recommendation: Out of scope for Phase 26 (BMRP-02 is upload-only). Evidence download can be a follow-up in a subsequent phase.

## Sources

### Primary (HIGH confidence)

- `src/lib/s3.ts` — S3 utility functions already implemented: `validateFileType`, `generateS3Key`, `generateUploadUrl`, `generateDownloadUrl`, `verifyUpload`, `uploadToS3`
- `src/components/auditee/evidence-uploader.tsx` — Multi-file dropzone pattern with queue, progress, retry (observation evidence)
- `src/components/audit-execution/evidence-upload-panel.tsx` — Single-file dropzone pattern with abort, progress (examination response evidence)
- `src/actions/audit-execution/upload-examination-evidence.ts` — Complete server action pair: `requestExaminationEvidenceUpload` + `confirmExaminationEvidenceUpload`
- `prisma/schema.prisma` — `Evidence` model with `actionPointId String? @db.Uuid` and `ActionPointEvidence` relation confirmed
- `src/components/rbia/bm-response-ap-card.tsx` — Confirmed: "Attach Evidence" and "Upload" buttons exist with `disabled={true}` hardcoded
- `src/actions/rbia/schemas.ts` — Existing Zod schemas; location for new `RequestBmEvidenceUploadSchema` and `ConfirmBmEvidenceUploadSchema`
- `src/lib/permissions.ts` — `action_point:bm_respond` permission confirmed for `BRANCH_HEAD` role
- `package.json` — `react-dropzone@^14.4.0` and `file-type@^21.3.0` confirmed installed

### Secondary (MEDIUM confidence)

- N/A — All findings based on direct codebase inspection (HIGH confidence)

### Tertiary (LOW confidence)

- N/A

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries confirmed installed and in use
- Architecture: HIGH — pattern is directly derived from two existing working implementations in the same codebase
- Pitfalls: HIGH — derived from code reading of existing implementation comments and schema structure

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (stable codebase, no fast-moving dependencies)
