# Plan 07-07 Summary: Auditee Observation Detail Page

## Status: COMPLETE

## What was built

### 1. src/app/(dashboard)/auditee/[observationId]/page.tsx — Server Component (345 lines)

- Next.js 16 `params: Promise<{ observationId: string }>` pattern
- Route guard via `requirePermission("observation:read")`
- Fetches via `getObservationDetailForAuditee(session, observationId)` — branch-authorized
- Returns `notFound()` for unauthorized/missing observations (no information leakage)

**Layout sections (top to bottom):**

1. **Header**: Back link, title, severity badge + status badge, DeadlineBadge prominently displayed
2. **Metadata row**: Branch, Audit Area, Auditor, Due Date, Response Due Date
3. **5C Fields**: Condition, Criteria, Cause, Effect, Recommendation — each in labeled Card with icon
4. **Observation Details**: Risk Category, Created By, Created date, Version
5. **Previous Responses**: Read-only chronological list of AuditeeResponse records (immutable)
6. **Response Form**: Conditional on ISSUED/RESPONSE status via AuditeeDetailClient
7. **Evidence Section**: EvidenceList + EvidenceUploader (conditional on active), shows "X of 20 files uploaded"
8. **Timeline**: General events via StatusTimeline + Evidence events via EvidenceTimelineEntry

### 2. src/app/(dashboard)/auditee/[observationId]/detail-client.tsx — Client Component (96 lines)

- Wraps interactive components: ResponseForm, EvidenceUploader, EvidenceList
- `handleRefresh` via `router.refresh()` after response submission or evidence upload
- `handleDownload` calls `getEvidenceDownloadUrl` server action and opens presigned URL
- Conditional rendering: Response form and evidence uploader only for active observations (ISSUED/RESPONSE)
- Shows "Response period has ended" message for COMPLIANCE/CLOSED observations

## Deviations

- Used `requirePermission("observation:read")` instead of `auditee:view` since `auditee:view` permission doesn't exist in permissions.ts. AUDITEE role has `observation:read` — matching DELTA's 07-06 dashboard pattern.
- Split into server page + client wrapper (`detail-client.tsx`) to keep server component for data fetching while client handles interactive ResponseForm, EvidenceUploader, and EvidenceList with download actions.
- Timeline split into general events (StatusTimeline) and evidence events (EvidenceTimelineEntry) with a visual separator, rather than one combined timeline.

## Commits

1. `6e0f184 feat(07-07): implement auditee observation detail page` — 2 files, 445 insertions

## Verification

- `pnpm build` — PASS (0 errors, 15 dynamic pages including `auditee/[observationId]`)
- Page fetches via `getObservationDetailForAuditee` (branch-authorized) ✓
- 5C fields displayed in labeled Card sections with icons ✓
- ResponseForm shown only for ISSUED/RESPONSE status ✓
- EvidenceUploader shown only for active observations ✓
- Evidence count shows "X of 20 files uploaded" ✓
- Timeline includes general events + evidence events ✓
- DeadlineBadge prominently visible in header ✓
- Unauthorized access returns 404 (not leaking observation existence) ✓
- Previous responses shown as immutable read-only records ✓
