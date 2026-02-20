# Phase 7: Auditee Portal & Evidence

## Goal

Auditees can view findings assigned to their branch, submit responses, upload evidence, and see deadline countdowns.

## Research Findings

### 1. Existing Codebase Patterns

**Current auditee page** (`src/app/(dashboard)/auditee/page.tsx`):

- Server component with `getTranslations` for i18n
- Reads from JSON demo data (`@/data` barrel export)
- Shows 3 summary cards (pending response, awaiting review, total findings)
- Lists findings pending response with severity badge and due date
- No interactive features (read-only prototype)

**Existing types** (`src/types/index.ts`):

- `Finding` type has: id, auditId, title, category, severity, status, observation, rootCause, riskImpact, auditeeResponse, actionPlan, assignedAuditor, targetDate, timeline[], relatedCircular, relatedRequirement
- `FindingTimeline` has: id, date, action, actor

**Prisma schema** already defines:

- `Observation` model with: tenantId, branchId, assignedToId, dueDate, status (7-state enum), severity
- `ObservationTimeline` model with: event, comment, createdById
- `Evidence` model with: observationId, tenantId, filename, s3Key, fileSize, contentType, uploadedById, deletedAt (soft-delete)
- RLS policies on all tenant-scoped tables via `app.current_tenant_id` session variable

**Component patterns** (from findings/):

- `FindingDetail` — card-based layout with sections (observation, root cause, risk impact, response, action plan, related info, timeline)
- `StatusTimeline` — vertical timeline with dots, dates, actions, actors
- Uses `Badge`, `Card`, `formatDate()`, icons from `@/lib/icons`
- `SEVERITY_COLORS`, `FINDING_STATUS_COLORS` from `@/lib/constants`

**S3 infrastructure** (Phase 5, 05-01-PLAN):

- Bucket: `aegis-evidence-{env}` in ap-south-1 (Mumbai)
- IAM: PutObject + GetObject only (NO DeleteObject — evidence is immutable)
- Versioning enabled, SSE-S3 encryption
- CORS configured for localhost:3000 and production domain
- Lifecycle: delete incomplete multipart uploads after 7 days
- DR replication target: ap-south-2 (Hyderabad) only

### 2. AWS S3 Presigned URL Flow

**Architecture:**

1. Client selects file → calls server action with file metadata (name, size, type)
2. Server validates: file type (magic bytes), size (<=10MB), user authorization, observation belongs to user's branch
3. Server generates presigned PUT URL (5-minute expiry) with tenant-scoped S3 key
4. Client uploads directly to S3 via XMLHttpRequest (for progress tracking — `fetch` doesn't support upload progress)
5. Client notifies server action of upload completion
6. Server verifies upload via `HeadObject`, saves Evidence record to database, creates ObservationTimeline entry

**Key constraints:**

- Content-Type in presigned URL MUST match the PUT request header exactly
- Presigned URL expiry: 5 minutes (security vs UX balance)
- File size enforcement: client-side check + S3 bucket policy (NumericGreaterThan condition)
- XMLHttpRequest required for `upload.onprogress` events

**Dependencies:**

- `@aws-sdk/client-s3` — S3 operations
- `@aws-sdk/s3-request-presigner` — presigned URL generation
- `file-type` — server-side magic byte validation

### 3. Server-Side File Type Validation

**Magic byte signatures for allowed types:**

| Format | Magic Bytes (hex)              | MIME Type                                                                 |
| ------ | ------------------------------ | ------------------------------------------------------------------------- |
| PDF    | `25 50 44 46`                  | `application/pdf`                                                         |
| JPEG   | `FF D8 FF`                     | `image/jpeg`                                                              |
| PNG    | `89 50 4E 47 0D 0A 1A 0A`      | `image/png`                                                               |
| DOCX   | `50 4B 03 04` + internal check | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| XLSX   | `50 4B 03 04` + internal check | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`       |

**Strategy:** Use `file-type` npm package (16M+ weekly downloads, ESM, TypeScript support). It reads the first ~4KB of a file buffer to detect type from magic bytes. DOCX and XLSX share ZIP magic bytes but `file-type` differentiates them by inspecting archive contents.

**Validation flow:**

1. Client reads first 4KB of file via `FileReader.readAsArrayBuffer()`, converts to base64 string, sends to server action (not full file — saves bandwidth). Base64 encoding is necessary because Next.js server actions serialize parameters as JSON (binary buffers are not JSON-serializable).
2. Server decodes base64 → `Buffer`, runs `fileTypeFromBuffer()` on the chunk
3. If type not in allowlist → reject with error
4. If valid → generate presigned URL with validated MIME type

### 4. S3 Tenant Isolation

**Path structure:** `/{tenantId}/evidence/{observationId}/{uuid}.{ext}`

Example: `/550e8400-e29b-41d4-a716-446655440000/evidence/7c9e6679-7425-40de-944b-e07fc1f90ae7/a3f2b1c8.pdf`

**Isolation layers (defense in depth):**

1. **Application layer:** Server action verifies `user.tenantId === observation.tenantId` before generating presigned URL
2. **RLS layer:** Database queries automatically scoped by `app.current_tenant_id`
3. **S3 key prefix:** All paths start with `/{tenantId}/` — presigned URL is key-specific
4. **IAM policy:** Only PutObject and GetObject (no ListBucket, no DeleteObject)

**Download flow:** Server action generates presigned GET URL (5-minute expiry) after verifying the requesting user's tenant matches the evidence's tenant.

### 5. File Upload UX

**Library:** `react-dropzone` — React hooks-based, TypeScript support, 10M+ weekly downloads.

**Upload UX flow:**

1. Drag-and-drop zone with visual feedback (border color change, icon animation)
2. File validation on drop (type, size) with immediate error feedback
3. Upload progress bar per file (via XMLHttpRequest `upload.onprogress`)
4. Queue with max 3 concurrent uploads
5. Success/failure state per file with retry button on failure
6. Automatic retry with exponential backoff (1s, 2s, 4s — max 3 attempts)
7. Upload completion updates the observation timeline in real-time

### 6. Deadline Tracking System

**Implementation:**

- `dueDate` field already exists on `Observation` model
- Countdown calculation: `dueDate - now()` in days/hours
- Visual states:
  - **>7 days remaining:** Normal text, muted color
  - **3-7 days remaining:** Warning amber badge
  - **1-3 days remaining:** Urgent orange badge
  - **<24 hours:** Critical red badge with animation
  - **Overdue:** Red background highlight, "X days overdue" text

**Server-side deadline check:** Periodic check (cron or Phase 8 notification system) for approaching and overdue deadlines — but the UI rendering is Phase 7 scope.

---

## Architecture

### Route Structure

```
src/app/(dashboard)/auditee/
├── page.tsx                    # Auditee dashboard (list of assigned observations)
├── [observationId]/
│   └── page.tsx                # Observation detail + response submission + evidence upload
└── layout.tsx                  # Optional layout for auditee-specific breadcrumbs
```

### Component Architecture

```
src/components/auditee/
├── observation-list.tsx         # Filterable list of observations for auditee
├── observation-card.tsx         # Card showing observation summary with deadline countdown
├── deadline-badge.tsx           # Color-coded deadline countdown badge
├── response-form.tsx            # Text response submission form (clarification/compliance)
├── evidence-uploader.tsx        # Drag-and-drop file upload with progress
├── evidence-list.tsx            # List of uploaded evidence files with download links
├── evidence-timeline-entry.tsx  # Evidence entry in observation timeline
└── overdue-banner.tsx           # Banner highlighting overdue items
```

### Data Flow

```
[Auditee Browser]
    │
    ├─ GET /auditee ──────────────► Server Component
    │                                  │ getObservationsForAuditee(cursor?, limit?)
    │                                  │ → 0. Extract userId from Better Auth session
    │                                  │ → 1. Query UserBranchAssignment for user's branchIds
    │                                  │ → 2. Prisma query with RLS (tenantId) + branchId IN [assigned branches]
    │                                  │ → 3. Cursor-based pagination (default 50 per page)
    │                                  ▼
    │                                 { observations: Observation[], nextCursor? }
    │
    ├─ POST response ─────────────► Server Action: submitAuditeeResponse
    │                                  │ 1. Validate user is assignee or branch auditee
    │                                  │ 2. Create ObservationTimeline entry (immutable)
    │                                  │ 3. Update Observation.status if applicable
    │                                  │ 4. Log to AuditLog
    │                                  ▼
    │                                 Success + updated timeline
    │
    ├─ POST upload request ───────► Server Action: requestEvidenceUpload
    │                                  │ 1. Validate file type (magic bytes via file-type)
    │                                  │ 2. Validate file size (<=10MB)
    │                                  │ 3. Verify observation belongs to user's branch
    │                                  │ 4. Generate S3 key: /{tenantId}/evidence/{obsId}/{uuid}.{ext}
    │                                  │ 5. Create presigned PUT URL (5 min expiry)
    │                                  ▼
    │                                 { presignedUrl, s3Key, contentType }
    │
    ├─ PUT file ──────────────────► AWS S3 (direct browser-to-S3 upload)
    │   (XMLHttpRequest with progress)
    │
    └─ POST confirm upload ───────► Server Action: confirmEvidenceUpload
                                       │ 1. HeadObject to verify file exists in S3
                                       │ 2. Inside Prisma transaction:
                                       │    a. Re-check evidence count < 20 (atomic, prevents race condition)
                                       │    b. Create Evidence record in database
                                       │    c. Create ObservationTimeline entry
                                       │    d. Log to AuditLog
                                       ▼
                                      Success + updated evidence list + timeline
```

### API / Server Actions

| Action                      | Input                                                       | Output                                            | Auth                     |
| --------------------------- | ----------------------------------------------------------- | ------------------------------------------------- | ------------------------ |
| `getObservationsForAuditee` | cursor?, limit? (default 50)                                | { observations: Observation[], nextCursor?: str } | AUDITEE role (session)   |
| `getObservationDetail`      | observationId                                               | Observation + timeline + evidence                 | AUDITEE (branch check)   |
| `submitAuditeeResponse`     | observationId, responseText, responseType                   | Updated observation + timeline                    | AUDITEE (assignee check) |
| `requestEvidenceUpload`     | observationId, fileHeader (base64, 4KB), fileName, fileSize | presignedUrl, s3Key                               | AUDITEE (branch check)   |
| `confirmEvidenceUpload`     | s3Key, observationId, filename, fileSize, contentType       | Evidence record                                   | AUDITEE (same session)   |
| `getEvidenceDownloadUrl`    | evidenceId                                                  | presigned GET URL (5 min)                         | Any authorized role      |

**IMPORTANT:** All server actions derive `userId` and `tenantId` from the authenticated Better Auth session internally. No user ID is ever accepted as a client-supplied parameter — this prevents a malicious client from impersonating another user. Pattern:

```typescript
async function getObservationsForAuditee(cursor?: string, limit = 50) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) throw new Error("Unauthorized");
  const userId = session.user.id;
  // ... use userId from session, never from input
}
```

### Database Schema Additions

The Prisma schema already has `Evidence` and `ObservationTimeline` models. Phase 7 needs these additions:

**1. UserBranchAssignment model** (new — agreed with Phase 10 during cross-review):

This join table links auditee users to their branch(es). Many-to-many because a user may manage multiple branches (e.g., a branch manager covering two small branches). Phase 10 populates this during onboarding Step 5; Phase 7 queries it to scope observations.

```prisma
model UserBranchAssignment {
  id       String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId   String @db.Uuid
  user     User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  branchId String @db.Uuid
  branch   Branch @relation(fields: [branchId], references: [id], onDelete: Cascade)
  tenantId String @db.Uuid
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@unique([userId, branchId])
  @@index([tenantId])
  @@index([userId])
  @@index([branchId])
}
```

**Cross-phase ownership:** Phase 10 creates the model + RLS policy + populates during onboarding. Phase 7 reads it in `getObservationsForAuditee`. Also manageable post-onboarding via Settings.

**2. AuditeeResponse model** (new — captures formal responses separately from timeline):

```prisma
enum ResponseType {
  CLARIFICATION
  COMPLIANCE_ACTION
  REQUEST_EXTENSION
}

model AuditeeResponse {
  id            String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  observationId String @db.Uuid
  observation   Observation @relation(fields: [observationId], references: [id], onDelete: Cascade)

  tenantId String @db.Uuid
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  responseType ResponseType
  content      String    @db.Text

  submittedById String @db.Uuid
  submittedBy   User   @relation("ResponseSubmittedBy", fields: [submittedById], references: [id])

  createdAt DateTime @default(now())
  // No updatedAt — responses are IMMUTABLE once submitted (AUD-04)

  @@index([tenantId])
  @@index([observationId])
}
```

**3. Evidence model updates:**

- Add `description` field (optional text the auditee can add when uploading)
- Add `maxEvidencePerObservation` limit of 20 files (prevents abuse — per Phase 10 review feedback)
- The existing `deletedAt` field supports soft-delete (no actual S3 deletion)

**4. Observation model additions:**

- Add `responseDueDate` field — the deadline for the auditee to respond (set by Audit Manager when issuing the observation in Phase 6's ISSUED transition). Distinct from `dueDate` which is the overall audit finding closure target.
- Add relation to `AuditeeResponse[]`

### Security Considerations

1. **File type validation:** Magic bytes server-side (not extension check). Only PDF, JPEG, PNG, XLSX, DOCX.
2. **File size limit:** 10MB enforced client-side + server-side + S3 bucket policy.
3. **No executables:** Reject .exe, .bat, .sh, .js, .py, .dll, .com — enforced by magic byte allowlist.
4. **Presigned URL expiry:** 5 minutes for uploads, 5 minutes for downloads.
5. **Evidence immutability:** No S3 DeleteObject in IAM. No delete API endpoint. Soft-delete via `deletedAt` only.
6. **Tenant isolation:** RLS + application-level checks + S3 key prefix scoping.
7. **Branch scoping:** Auditees see only observations where `observation.branchId` matches their branch assignment.
8. **Response immutability:** `AuditeeResponse` has `createdAt` but no `updatedAt` — once submitted, content cannot be changed (AUD-04).
9. **Audit trail:** Every response and evidence upload logged to `AuditLog` with userId, IP, timestamp.
10. **CSRF protection:** Server actions in Next.js include built-in CSRF tokens.
11. **Content-Security-Policy:** S3 bucket domain must be in `connect-src` CSP header for direct uploads. **Note:** This CSP change should be documented as a Phase 5 infrastructure task since they own the S3 bucket setup and app headers.
12. **Virus scanning:** Deferred to post-MVP. AWS Malware Protection for S3 is now GA and can be enabled via bucket policy without code changes — recommend flagging to Phase 5 for production bucket setup. For now, magic byte validation + file type restriction provides baseline defense.
13. **Evidence count limit:** Max 20 evidence files per observation to prevent storage abuse. Pre-checked in `requestEvidenceUpload` (fast reject). Atomically re-checked inside `confirmEvidenceUpload` within a Prisma transaction (count + insert) to prevent race conditions from concurrent uploads.

---

## Dependencies

### On Phase 5 (Foundation & Migration)

| Phase 5 Output                      | Phase 7 Usage                                               |
| ----------------------------------- | ----------------------------------------------------------- |
| PostgreSQL + Prisma setup           | Database for Evidence, AuditeeResponse, ObservationTimeline |
| RLS policies                        | Tenant isolation for all auditee queries                    |
| Better Auth                         | User authentication, role verification (AUDITEE role)       |
| S3 bucket (immutable)               | Evidence file storage                                       |
| AuditLog model                      | Audit trail for responses and uploads                       |
| `app.current_tenant_id` session var | RLS tenant scoping                                          |

### On Phase 6 (Observation Lifecycle)

| Phase 6 Output                             | Phase 7 Usage                                                         |
| ------------------------------------------ | --------------------------------------------------------------------- |
| Observation CRUD                           | Observations that auditees respond to                                 |
| 7-state lifecycle                          | Status transitions (ISSUED → RESPONSE when auditee responds)          |
| ObservationTimeline                        | Timeline entries for responses and evidence uploads                   |
| Maker-checker workflow                     | Audit Manager reviews auditee responses                               |
| Branch + AuditArea models                  | Branch-scoped filtering for auditee view                              |
| `responseDueDate` set at ISSUED transition | Audit Manager sets auditee response deadline when issuing observation |

### On Phase 10 (Onboarding & Compliance)

| Phase 10 Output                           | Phase 7 Usage                                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `UserBranchAssignment` table + RLS policy | Branch-scoped query in `getObservationsForAuditee` — determines which branches an auditee can see |
| Auditee user creation (onboarding Step 5) | Users who access the auditee portal                                                               |
| Branch creation (onboarding Step 4)       | Branches that scope auditee observations                                                          |

### Consumed by Phase 8 (Notifications & Reports)

Phase 7 creates `ObservationTimeline` entries when auditees submit responses and upload evidence. Phase 8's notification system will consume these timeline events to trigger email notifications to audit managers. **The timeline entry `event` field values must be stable and documented:**

| Event Value           | Trigger                    | Phase 8 Notification            |
| --------------------- | -------------------------- | ------------------------------- |
| `auditee_response`    | Auditee submits response   | Email to assigned audit manager |
| `evidence_uploaded`   | Evidence upload confirmed  | Email to assigned audit manager |
| `extension_requested` | Auditee requests extension | Email to audit manager + CAE    |

Phase 8 should query `ObservationTimeline` by these event values to determine which notifications to send. This contract must remain stable across both phases.

### New Dependencies (npm packages)

| Package                         | Purpose                             | Size   |
| ------------------------------- | ----------------------------------- | ------ |
| `@aws-sdk/client-s3`            | S3 PutObject, GetObject, HeadObject | ~3MB   |
| `@aws-sdk/s3-request-presigner` | Generate presigned URLs             | ~200KB |
| `file-type`                     | Server-side magic byte validation   | ~200KB |
| `react-dropzone`                | Drag-and-drop file upload UI        | ~50KB  |

---

## Requirements Mapping

| Requirement                                                        | Implementation                                                                                                                                | Component/Action                                        |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **AUD-01**: Auditee sees only branch observations                  | Query `UserBranchAssignment` for user's branches, then Prisma query filtered by `branchId IN [...]` + RLS. Cursor-based pagination (50/page). | `getObservationsForAuditee` server action               |
| **AUD-02**: Submit clarification/response                          | Text form → server action → AuditeeResponse + timeline                                                                                        | `response-form.tsx` + `submitAuditeeResponse`           |
| **AUD-03**: Upload evidence (PDF, JPEG, PNG, XLSX, DOCX, max 10MB) | Drag-drop → presigned URL → S3 direct upload                                                                                                  | `evidence-uploader.tsx` + `requestEvidenceUpload`       |
| **AUD-04**: Responses timestamped and immutable                    | `AuditeeResponse.createdAt` (no updatedAt), no edit/delete API                                                                                | Schema design + server action validation                |
| **AUD-05**: Submit compliance action with evidence                 | Response type `COMPLIANCE_ACTION` (enum) + evidence attachment                                                                                | `response-form.tsx` with type selector                  |
| **AUD-06**: Deadline countdown per pending item                    | `dueDate` → client-side countdown calculation                                                                                                 | `deadline-badge.tsx` component                          |
| **AUD-07**: Overdue items highlighted                              | Conditional styling when `dueDate < now()`                                                                                                    | `observation-card.tsx` + `overdue-banner.tsx`           |
| **EVID-01**: Drag-and-drop with progress                           | react-dropzone + XMLHttpRequest progress                                                                                                      | `evidence-uploader.tsx`                                 |
| **EVID-02**: S3 Mumbai, tenant-scoped, SSE-S3                      | S3 key: `/{tenantId}/evidence/{obsId}/{uuid}.{ext}`                                                                                           | `requestEvidenceUpload` server action                   |
| **EVID-03**: File type validation client + server                  | Client: react-dropzone accept + Server: file-type magic bytes                                                                                 | Both layers                                             |
| **EVID-04**: Evidence in timeline with timestamp + uploader        | ObservationTimeline entry on upload confirmation                                                                                              | `confirmEvidenceUpload` + `evidence-timeline-entry.tsx` |
| **EVID-05**: Authorized download                                   | Presigned GET URL with role check                                                                                                             | `getEvidenceDownloadUrl` server action                  |

---

## Task Breakdown

### Wave 1: Database & Server Actions (no UI)

**Task 1: Schema additions and migration**

- Add `ResponseType` enum (CLARIFICATION, COMPLIANCE_ACTION, REQUEST_EXTENSION) to Prisma schema
- Add `AuditeeResponse` model to Prisma schema (uses `ResponseType` enum)
- Add `description` to Evidence model
- Add `responseDueDate` to Observation model
- Add relations on Tenant, User, Observation
- Run `prisma migrate dev`
- Add RLS policy for new `AuditeeResponse` table
- Files: `prisma/schema.prisma`, `prisma/migrations/add_rls_policies.sql`

**Task 2: S3 utility module**

- Create `src/lib/s3.ts` with S3Client singleton
- Functions: `generateUploadUrl()`, `generateDownloadUrl()`, `verifyUpload()`
- Validate file type with `file-type` package
- Validate file size (10MB limit)
- S3 key generation with tenant/observation/uuid structure
- Files: `src/lib/s3.ts`

**Task 3: Auditee server actions**

- `getObservationsForAuditee(cursor?, limit?)` — branch-scoped query with cursor-based pagination (default 50). Derives userId from Better Auth session.
- `getObservationDetail(observationId)` — with timeline + evidence. Derives userId from session for branch-scope validation.
- `submitAuditeeResponse(observationId, content, type)` — create response + timeline entry. Uses `ResponseType` enum.
- `requestEvidenceUpload(observationId, fileHeader, fileName, fileSize)` — validate (magic bytes via base64-decoded header) + presigned URL. Pre-check evidence count < 20.
- `confirmEvidenceUpload(s3Key, observationId, ...)` — verify S3 via HeadObject + create Evidence record inside Prisma transaction (re-check count < 20 atomically).
- `getEvidenceDownloadUrl(evidenceId)` — presigned GET URL
- **All actions:** derive userId/tenantId from authenticated session (NEVER from client input), verify AUDITEE role, verify branch scope, log to AuditLog
- Files: `src/app/(dashboard)/auditee/actions.ts`

### Wave 2: Core UI Components

**Task 4: Deadline badge component**

- Color-coded countdown (>7d normal, 3-7d amber, 1-3d orange, <24h red, overdue red bg)
- Shows "X days remaining" or "X days overdue"
- Client component (needs real-time calculation)
- Files: `src/components/auditee/deadline-badge.tsx`

**Task 5: Observation list and card for auditee**

- `observation-list.tsx` — filterable by status (pending response, awaiting review, all)
- `observation-card.tsx` — title, severity badge, status, deadline badge, branch name
- `overdue-banner.tsx` — top-of-page alert when overdue items exist
- Server component for list, client components for interactivity
- Files: `src/components/auditee/observation-list.tsx`, `observation-card.tsx`, `overdue-banner.tsx`

**Task 6: Evidence uploader component**

- Drag-and-drop zone with react-dropzone
- File type + size validation on drop
- XMLHttpRequest upload with progress bar
- Max 3 concurrent uploads (queue)
- Retry with exponential backoff (3 attempts)
- Success/failure state per file
- Files: `src/components/auditee/evidence-uploader.tsx`

**Task 7: Response form component**

- Text area for response content
- Response type selector (clarification / compliance action / extension request)
- Optional evidence attachment (integrates with evidence uploader)
- Submit button with loading state
- Confirmation dialog before submission (immutable warning)
- Files: `src/components/auditee/response-form.tsx`

### Wave 3: Pages & Integration

**Task 8: Auditee dashboard page (rewrite)**

- Replace JSON-based page with database-backed server component
- Summary cards: pending response, awaiting review, overdue, total
- Observation list with filters
- Overdue banner at top
- Files: `src/app/(dashboard)/auditee/page.tsx`

**Task 9: Observation detail page for auditee**

- Full observation view (condition, criteria, cause, effect, recommendation)
- Response submission form
- Evidence upload section
- Evidence list with download links
- Complete timeline (including evidence uploads)
- Deadline countdown prominently displayed
- Files: `src/app/(dashboard)/auditee/[observationId]/page.tsx`

**Task 10: Evidence list and timeline integration**

- `evidence-list.tsx` — list uploaded files with download button, timestamp, uploader
- `evidence-timeline-entry.tsx` — evidence entries in the observation timeline
- Integrate evidence entries into the existing StatusTimeline component pattern
- Files: `src/components/auditee/evidence-list.tsx`, `evidence-timeline-entry.tsx`

### Wave 4: Polish & Verification

**Task 11: Branch-scoped access verification**

- Middleware or server action guard: auditee can ONLY see observations for their branch
- **Automated integration tests** (server action tests with mock auth session):
  - Test: auditee from Branch A cannot access observations for Branch B (expects empty result or 403)
  - Test: non-AUDITEE roles calling `getObservationsForAuditee` get authorization error
  - Test: unauthenticated calls get redirected to login
- **Manual testing checklist** (documented in `07-VERIFICATION.md`):
  - [ ] Log in as Branch A auditee → only Branch A observations visible
  - [ ] Navigate directly to Branch B observation URL → 403 page shown
  - [ ] Log in as AUDITOR role → auditee portal not accessible
- Files: `src/app/(dashboard)/auditee/__tests__/access.test.ts`, `.planning/phases/07-auditee-portal-evidence/07-VERIFICATION.md`

**Task 12: Immutability verification**

- **Automated integration tests:**
  - Test: no update/delete server action exists for AuditeeResponse
  - Test: `confirmEvidenceUpload` creates immutable Evidence record (no updatedAt mutation)
  - Test: AuditLog entry created for every response submission and evidence upload
- **Manual testing checklist** (in same `07-VERIFICATION.md`):
  - [ ] Submit response → verify no edit/delete buttons appear in UI
  - [ ] Run `aws s3 rm` on evidence file → verify IAM policy denies deletion
  - [ ] Query AuditLog → confirm entries for response and upload actions
- Files: `src/app/(dashboard)/auditee/__tests__/immutability.test.ts`, `.planning/phases/07-auditee-portal-evidence/07-VERIFICATION.md`

---

## Success Criteria Verification

| #   | Criterion                                       | How to Verify                                                                                                |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | Auditee sees only branch observations           | Log in as auditee for Branch A → only Branch A observations shown. Try URL for Branch B observation → 403.   |
| 2   | Submit clarification/response                   | Fill response form → submit → AuditeeResponse created, ObservationTimeline updated, AuditLog entry exists.   |
| 3   | Upload evidence via drag-and-drop with progress | Drag PDF → see progress bar → file appears in S3 at `/{tenantId}/evidence/...` → Evidence record in DB.      |
| 4   | S3 Mumbai, tenant-scoped, encrypted             | Check S3 bucket region (ap-south-1). Check file path starts with tenantId. Check SSE-S3 encryption header.   |
| 5   | Responses and evidence immutable                | No edit/delete API for AuditeeResponse. `aws s3 rm` fails on evidence files. Soft-delete only via deletedAt. |
| 6   | Deadline countdown, overdue highlighted         | Observation with future dueDate shows countdown. Observation with past dueDate shows red "overdue" styling.  |
| 7   | Evidence in timeline with timestamp + uploader  | Upload evidence → timeline shows "Evidence uploaded: filename.pdf by User Name at 2026-02-09 10:30" entry.   |
