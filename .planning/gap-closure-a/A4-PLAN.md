---
phase: gap-closure-a
plan: A4
type: execute
wave: 1
depends_on: []
files_modified:
  - src/actions/audit-execution/upload-examination-evidence.ts
  - src/actions/audit-execution/schemas.ts
  - src/data-access/audit-execution.ts
  - src/components/audit-execution/evidence-upload-panel.tsx
  - src/components/audit-execution/examination-evidence-list.tsx
  - src/app/(dashboard)/audit-execution/[id]/sections/[code]/page.tsx
autonomous: true
gap_closure: true
must_haves:
  truths:
    - "Auditors can upload evidence files (PDF/JPEG/PNG/DOCX/XLSX) to any AuditExaminationResponse"
    - "Evidence records are created in the Evidence table with examinationResponseId set"
    - "Uploaded evidence files appear in the examination item response UI"
    - "Evidence upload uses existing S3 presigned URL flow (generateUploadUrl → PUT → confirmEvidenceUpload)"
    - "Evidence model is used polymorphically for both observations and examination responses"
  artifacts:
    - path: "src/actions/audit-execution/upload-examination-evidence.ts"
      provides: "Server actions for requesting and confirming examination evidence uploads"
      exports:
        ["requestExaminationEvidenceUpload", "confirmExaminationEvidenceUpload"]
    - path: "src/components/audit-execution/evidence-upload-panel.tsx"
      provides: "Client component for uploading evidence to examination responses"
      contains: "requestExaminationEvidenceUpload"
    - path: "src/components/audit-execution/examination-evidence-list.tsx"
      provides: "Display component for evidence attached to an examination response"
      min_lines: 30
  key_links:
    - from: "src/components/audit-execution/evidence-upload-panel.tsx"
      to: "src/actions/audit-execution/upload-examination-evidence.ts"
      via: "Server action calls for presigned URL + confirmation"
      pattern: "requestExaminationEvidenceUpload"
    - from: "src/actions/audit-execution/upload-examination-evidence.ts"
      to: "src/lib/s3.ts"
      via: "S3 presigned URL generation and upload verification"
      pattern: "generateUploadUrl|verifyUpload|generateS3Key"
    - from: "src/app/(dashboard)/audit-execution/[id]/sections/[code]/page.tsx"
      to: "src/components/audit-execution/evidence-upload-panel.tsx"
      via: "Rendered per examination item in section page"
      pattern: "EvidenceUploadPanel"
---

## Objective

Implement R16 (evidence_refs on AuditExaminationResponse) and R27 (generalized Evidence model) by wiring evidence upload to examination responses. The Evidence model already supports polymorphic attachment via `examinationResponseId`, and S3 upload infrastructure exists (`src/lib/s3.ts`). This plan connects them end-to-end.

**Purpose:** Close the evidence pipeline gap so auditors can attach documentary proof to each examination item response during audit execution.

**Output:**

- Server actions for requesting presigned URLs and confirming uploads for examination evidence
- Client upload component reusable across all 25 section tabs
- Evidence list component showing attached files per examination item
- Updated section page to render evidence UI per item

## Execution Context

@/root/.openclaw/workspace/.claude/agents/gsd-planner.md
@/root/.openclaw/workspace/.claude/workflows/execute-plan.md

## Context

@AEGIS/.planning/REQUIREMENTS.md — R16, R27 specifications
@AEGIS/.planning/VALIDATION-REPORT.md — Evidence pipeline gap
@AEGIS/.planning/codebase/CONVENTIONS.md — Server action + component patterns
@AEGIS/prisma/schema.prisma — Evidence model (examinationResponseId), AuditExaminationResponse
@AEGIS/src/lib/s3.ts — generateUploadUrl, verifyUpload, generateS3Key, validateFileType
@AEGIS/src/actions/auditee.ts — requestEvidenceUpload/confirmEvidenceUpload pattern (observation evidence)
@AEGIS/src/components/auditee/evidence-uploader.tsx — Existing evidence upload UI pattern
@AEGIS/src/data-access/audit-execution.ts — getExaminationResponsesForSection

## Tasks

<task type="auto">
  <name>Task 1: Server actions — Examination evidence upload</name>
  <files>src/actions/audit-execution/upload-examination-evidence.ts, src/actions/audit-execution/schemas.ts</files>
  <action>
  **1a. Update `src/actions/audit-execution/schemas.ts` — add evidence schemas:**

Add to existing schemas file:

```typescript
export const RequestExamEvidenceUploadSchema = z.object({
  engagementId: z.string().uuid(),
  responseId: z.string().uuid(),
  fileHeader: z.string().min(1, "File header is required"),
  fileName: z.string().min(1, "File name is required"),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024, "File must be under 10MB"),
});

export const ConfirmExamEvidenceUploadSchema = z.object({
  engagementId: z.string().uuid(),
  responseId: z.string().uuid(),
  s3Key: z.string().min(1),
  filename: z.string().min(1),
  fileSize: z.number().int().positive(),
  contentType: z.string().min(1),
  description: z.string().optional(),
});

export type RequestExamEvidenceUploadInput = z.infer<
  typeof RequestExamEvidenceUploadSchema
>;
export type ConfirmExamEvidenceUploadInput = z.infer<
  typeof ConfirmExamEvidenceUploadSchema
>;
```

**1b. Create `src/actions/audit-execution/upload-examination-evidence.ts`:**

Follow the auditee.ts evidence upload pattern but scoped to examination responses:

```typescript
"use server";

import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import {
  validateFileType,
  generateS3Key,
  generateUploadUrl,
  verifyUpload,
} from "@/lib/s3";
import { logger } from "@/lib/logger";
import {
  RequestExamEvidenceUploadSchema,
  ConfirmExamEvidenceUploadSchema,
} from "./schemas";
```

**`requestExaminationEvidenceUpload(input)`:**

1. Auth + permission check: `examination:respond`
2. Validate input with RequestExamEvidenceUploadSchema
3. Validate file type via `validateFileType(fileHeader)`
4. Verify engagement + response exist and belong to tenant
5. Generate S3 key: `generateS3Key(tenantId, responseId, extension)` — Note: reuse generateS3Key but pass responseId instead of observationId (the function just builds a path)
6. Generate presigned URL: `generateUploadUrl(s3Key, mimeType, fileSize)`
7. Return `{ success: true, data: { uploadUrl, s3Key, contentType: mimeType } }`

**`confirmExaminationEvidenceUpload(input)`:**

1. Auth + permission check: `examination:respond`
2. Validate input with ConfirmExamEvidenceUploadSchema
3. Verify upload exists in S3: `verifyUpload(s3Key)`
4. Create Evidence record in transaction:
   ```typescript
   await tx.evidence.create({
     data: {
       tenantId,
       examinationResponseId: validated.responseId,
       filename: validated.filename,
       s3Key: validated.s3Key,
       fileSize: validated.fileSize,
       contentType: validated.contentType,
       description: validated.description ?? null,
       uploadedById: session.user.id,
     },
   });
   ```
5. revalidatePath("/audit-execution")
6. Return `{ success: true, data: { evidenceId } }`
   </action>
   <verify>

```bash
cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/actions/audit-execution/upload-examination-evidence.ts 2>&1 | head -20
```

Must compile without errors. Both functions must be exported.
</verify>
<done>

- `upload-examination-evidence.ts` exports `requestExaminationEvidenceUpload` and `confirmExaminationEvidenceUpload`
- Both actions follow server action boilerplate (auth → permission → validate → S3 → DB)
- Evidence records use `examinationResponseId` (not `observationId`)
- S3 key uses tenant-scoped path
- TypeScript compiles
  </done>
  </task>

<task type="auto">
  <name>Task 2: DAL — Include evidence in examination response queries</name>
  <files>src/data-access/audit-execution.ts</files>
  <action>
  Update `getExaminationResponsesForSection()` in `src/data-access/audit-execution.ts` to include evidence in the query:

In the `include` clause of the `auditExaminationResponse` query, add:

```typescript
evidence: {
  where: { deletedAt: null },
  select: {
    id: true,
    filename: true,
    s3Key: true,
    fileSize: true,
    contentType: true,
    description: true,
    createdAt: true,
    uploadedBy: { select: { id: true, name: true } },
  },
  orderBy: { createdAt: "asc" },
},
```

Also add a new function `getEvidenceForExaminationResponse()`:

```typescript
export async function getEvidenceForExaminationResponse(
  session: Session,
  responseId: string,
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.evidence.findMany({
    where: {
      examinationResponseId: responseId,
      tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
      filename: true,
      s3Key: true,
      fileSize: true,
      contentType: true,
      description: true,
      createdAt: true,
      uploadedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}
```

  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/data-access/audit-execution.ts 2>&1 | head -20
  ```
  Must compile. New function must be exported.
  </verify>
  <done>
  - `getExaminationResponsesForSection()` now includes evidence in its return data
  - `getEvidenceForExaminationResponse()` exported for standalone evidence queries
  - Evidence query filters out soft-deleted records (`deletedAt: null`)
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 3: Client components — Evidence upload panel + evidence list</name>
  <files>src/components/audit-execution/evidence-upload-panel.tsx, src/components/audit-execution/examination-evidence-list.tsx</files>
  <action>
  **3a. Create `src/components/audit-execution/evidence-upload-panel.tsx`:**

Mirror the pattern from `src/components/auditee/evidence-uploader.tsx` but adapted for examination evidence:

```typescript
"use client";
```

Props:

```typescript
interface EvidenceUploadPanelProps {
  engagementId: string;
  responseId: string;
  onUploadComplete?: () => void;
}
```

Implementation:

- Use `useDropzone` from react-dropzone for file selection
- On file drop: call `requestExaminationEvidenceUpload({ engagementId, responseId, fileHeader, fileName, fileSize })`
- On presigned URL received: PUT file to S3 via XHR with progress tracking
- On PUT complete: call `confirmExaminationEvidenceUpload({ engagementId, responseId, s3Key, filename, fileSize, contentType })`
- Show upload progress bar, success/error states
- Accepted file types: PDF, JPEG, PNG, DOCX, XLSX (same as existing uploader)
- Max file size: 10MB

Keep it compact — reuse the same queue/retry pattern from evidence-uploader.tsx but simplified (single file at a time is OK).

**3b. Create `src/components/audit-execution/examination-evidence-list.tsx`:**

```typescript
"use client";

import { generateDownloadUrl } from "@/lib/s3"; // Note: this is server-only
```

Actually, this should be a server component or use a download action. Create it as:

Props:

```typescript
interface EvidenceListProps {
  evidence: Array<{
    id: string;
    filename: string;
    fileSize: number;
    contentType: string;
    description: string | null;
    createdAt: Date;
    uploadedBy: { id: string; name: string };
  }>;
  engagementId: string;
  responseId: string;
}
```

Display:

- List of attached files with icon (PDF/image/doc), filename, size, uploader name, date
- Download link (use a server action `getEvidenceDownloadUrl(evidenceId)` that calls `generateDownloadUrl`)
- Empty state: "No evidence attached"
- Use FileText/Image icons from lucide-react based on contentType

**3c. Add download action** in `upload-examination-evidence.ts`:

```typescript
export async function getExaminationEvidenceDownloadUrl(evidenceId: string) {
  // Auth, verify evidence belongs to tenant, call generateDownloadUrl
}
```

  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/components/audit-execution/evidence-upload-panel.tsx src/components/audit-execution/examination-evidence-list.tsx 2>&1 | head -20
  ```
  Must compile. Components must be exported.
  </verify>
  <done>
  - `EvidenceUploadPanel` client component with file drop, S3 upload, and confirmation
  - `ExaminationEvidenceList` component displays attached evidence with download links
  - Download URL fetched via server action (presigned GET)
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 4: UI integration — Wire evidence into section pages</name>
  <files>src/app/(dashboard)/audit-execution/[id]/sections/[code]/page.tsx</files>
  <action>
  Update the section page to render evidence components for each examination item:

1. The page already renders examination items with response forms
2. For each item that has a response (or is being responded to), add:
   - `<ExaminationEvidenceList evidence={response.evidence} engagementId={engagementId} responseId={response.id} />`
   - `<EvidenceUploadPanel engagementId={engagementId} responseId={response.id} />`
3. Position the evidence section below the response form for each item
4. Wrap in a collapsible section (use Collapsible from shadcn/ui or an Accordion):
   ```tsx
   <div className="mt-2 border-t pt-2">
     <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
       <Paperclip className="h-4 w-4" />
       <span>Evidence ({response.evidence?.length ?? 0})</span>
     </div>
     <ExaminationEvidenceList evidence={response.evidence ?? []} ... />
     <EvidenceUploadPanel engagementId={engagementId} responseId={response.id} />
   </div>
   ```

**IMPORTANT:** The evidence upload panel should only show if the user has `examination:respond` permission. Check this in the server component and pass a `canUpload` prop.
</action>
<verify>

```bash
cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/app/\(dashboard\)/audit-execution/\[id\]/sections/\[code\]/page.tsx 2>&1 | head -20
```

Must compile without errors.
</verify>
<done>

- Section page renders EvidenceUploadPanel and ExaminationEvidenceList per examination item
- Evidence is loaded from the DAL query (included in response data)
- Upload panel is permission-gated
- Evidence count shown per item
- TypeScript compiles
  </done>
  </task>

## Verification

```bash
# 1. TypeScript compilation
cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit

# 2. Verify server actions exist
grep -l "requestExaminationEvidenceUpload\|confirmExaminationEvidenceUpload" src/actions/audit-execution/upload-examination-evidence.ts && echo "PASS" || echo "FAIL"

# 3. Verify Evidence model usage is polymorphic
grep "examinationResponseId" src/actions/audit-execution/upload-examination-evidence.ts && echo "PASS: Uses examinationResponseId" || echo "FAIL"

# 4. Verify evidence included in DAL queries
grep "evidence" src/data-access/audit-execution.ts && echo "PASS" || echo "FAIL"

# 5. Verify upload component exists
test -f src/components/audit-execution/evidence-upload-panel.tsx && echo "PASS" || echo "FAIL"
```

## Success Criteria

1. **R16 gap closed:** AuditExaminationResponse evidence pipeline fully wired
2. **R27 gap closed:** Evidence model used for both observations (existing) and examination responses (new)
3. **S3 integration:** Uses existing `src/lib/s3.ts` functions — no new S3 code
4. **Upload flow:** presigned URL request → client-side PUT → server-side confirmation → Evidence record
5. **Display:** Evidence attachments visible per examination item in section pages
6. **Download:** Presigned GET URLs generated on demand for secure downloads
7. **Permission-gated:** Only users with `examination:respond` can upload
8. **TypeScript:** All files compile successfully
9. **Conventions:** All patterns match CONVENTIONS.md (server action boilerplate, DAL pattern, client components)
