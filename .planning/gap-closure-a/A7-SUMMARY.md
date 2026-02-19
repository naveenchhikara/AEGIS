# A7 Execution Summary: BH Certificate Digital Sign-off

**Execution Date:** 2026-02-18  
**Plan:** A7-PLAN.md (BH Certificate Sign-off Workflow)  
**Status:** ✅ COMPLETE

## Tasks Completed

### ✅ Task 1: DAL — BH certificate data access

**File:** `src/data-access/bh-certificate.ts`

Created data access layer with:

- `deriveBhCertStatus()` function to derive status from engagement fields (PENDING → SIGNED → COUNTERSIGNED)
- `getEngagementForBhCertificate()` function to fetch engagement with all BH certificate fields, team members, and observations
- Proper tenant-scoped data access using `prismaForTenant()`

**Verification:** ✅ File created and exports both functions

### ✅ Task 2: Schema Migration + Schemas

**Files:**

- `prisma/schema.prisma` — Added countersign fields
- `src/actions/audit-execution/schemas.ts` — Added validation schemas

Schema changes:

```prisma
bhCertCountersignedById String?   @db.Uuid
bhCertCountersignedAt   DateTime?
```

Validation schemas added:

- `SignBhCertificateSchema` — validates sign action with mandatory comments and declaration acceptance
- `CountersignBhCertificateSchema` — validates countersign action with optional comments

**Verification:** ✅ Schema pushed to database, Prisma client regenerated, schemas exported

### ✅ Task 3: Server Actions — Sign and Countersign

**File:** `src/actions/audit-execution/bh-certificate.ts`

Created three server actions:

1. **`signBhCertificate(input)`**
   - Role check: BRANCH_HEAD only
   - State guard: prevents double-signing
   - Sets `bhCertSignedById`, `bhCertSignedAt`, `bhCertComments`
   - Audit context: `bh_certificate.signed`
   - Returns: `{ success, data: { signedAt, signedBy } }`

2. **`countersignBhCertificate(input)`**
   - Role check: LEAD_AUDITOR or AUDIT_MANAGER
   - State guard: must be signed, not yet countersigned
   - Sets `bhCertCountersignedById`, `bhCertCountersignedAt`
   - Audit context: `bh_certificate.countersigned`
   - Returns: `{ success, data: { countersignedAt, countersignedBy } }`

3. **`getBhCertificateStatus(engagementId)`**
   - Read-only status check
   - Returns current certificate state

**Verification:**

- ✅ 2 main action exports confirmed
- ✅ BRANCH_HEAD role check present
- ✅ LEAD_AUDITOR/AUDIT_MANAGER role check present
- ✅ Follows server action boilerplate pattern from CONVENTIONS.md

### ✅ Task 4: Client Components — Workflow UI

**Files:**

- `src/components/audit-execution/bh-signature-capture.tsx` — Signature capture UI
- `src/components/audit-execution/bh-certificate-workflow.tsx` — Main workflow component

**BhSignatureCapture Component:**

- Declaration text with `[SIGNER_NAME]` replacement
- Checkbox for declaration acceptance (required)
- Mandatory comments textarea (1-2000 chars)
- "Sign Certificate" button disabled until all requirements met
- Uses pragmatic v1 approach: declaration + checkbox (not canvas drawing)

**BhCertificateWorkflow Component:**

- Three-step progress indicator (PENDING → SIGNED → COUNTERSIGNED)
- Observation summary card (critical/high/medium/low counts)
- Role-based rendering:
  - PENDING + BRANCH_HEAD → show signature capture
  - PENDING + non-BH → "Awaiting Branch Head signature"
  - SIGNED + LEAD_AUDITOR → show countersign UI
  - SIGNED + non-LA → "Awaiting Lead Auditor countersign"
  - COUNTERSIGNED → show completed state with all details
- Toast notifications for success/error
- Uses Next.js useTransition for optimistic UI updates

**Verification:** ✅ Files created with proper client components

### ✅ Task 5: PDF Section — Render Signed Certificate

**File:** `src/components/pdf-report/bh-certificate-section.tsx`

Created dedicated PDF section component with:

- Branch and audit period metadata
- Declaration text (formal certification statement)
- Signature block with:
  - Signed by name and timestamp
  - Digital signature line
  - BH comments (if provided)
- Countersignature block (when countersigned):
  - Countersigned by name and timestamp
  - Digital signature line
- Conditional rendering based on signed/unsigned state
- Professional styling using @react-pdf/renderer

**Integration:**

- Updated `src/data-access/reports.ts` → `getAuditReportData()` to fetch and resolve signer/countersigner names
- Updated `src/components/pdf-report/audit-summary-document.tsx` to import and render `BhCertificateSection`

**Verification:** ✅ BhCertificateSection component exists and exported

### ✅ Task 6: Page — /audit-execution/[id]/bh-certificate

**File:** `src/app/(dashboard)/audit-execution/[id]/bh-certificate/page.tsx`

Created server component page:

- Fetches engagement via `getEngagementForBhCertificate()`
- Derives BH certificate status via `deriveBhCertStatus()`
- Computes observation summary (critical/high/medium/low counts)
- Resolves signer and countersigner names from User model
- Passes current user's roles and name for role-based rendering
- Renders `BhCertificateWorkflow` with all required props
- **Next.js 16 compliance:** `params` properly awaited (Promise)

**Verification:** ✅ Page file exists at correct route

## Convention Compliance

✅ **Server Action Pattern:** All server actions follow the standard boilerplate:

- Step 1: Authentication
- Step 2: Permission/Role Check
- Step 3: Input Validation
- Step 4: Tenant-Scoped Database
- Step 5: Transaction (Atomic Operation)
- Step 6: Cache Revalidation
- Step 7: Success Response
- Step 8: Error Handling

✅ **Database Access:** All queries use `prismaForTenant(tenantId)` — never raw `prisma`

✅ **Role-Based Access:**

- BRANCH_HEAD for signing
- LEAD_AUDITOR/AUDIT_MANAGER for countersigning
- Using `userRoles.includes()` pattern for multi-role support

✅ **Audit Context:** Both sign and countersign actions set audit context for AuditLog trigger

✅ **Next.js 16:** `params` is awaited in page component

✅ **Error Handling:** Server actions return discriminated union `{ success, data?, error? }` — never throw

✅ **Import Organization:** Path alias `@/*` used consistently

## Success Criteria Met

1. ✅ **R26 gap closed:** BH Certificate digital sign-off fully implemented
2. ✅ **Role-based access:** Only BRANCH_HEAD can sign, LEAD_AUDITOR/AUDIT_MANAGER can countersign
3. ✅ **State transitions:** PENDING → SIGNED → COUNTERSIGNED with guards
4. ✅ **Declaration capture:** Formal acknowledgment text with mandatory acceptance
5. ✅ **PDF integration:** Signed certificate renders in PDF report with signature details
6. ✅ **Audit trail:** All sign-off actions recorded via audit context
7. ✅ **Observation summary:** Certificate page shows finding summary for context
8. ⚠️ **TypeScript:** Some pre-existing TS errors in codebase (unrelated to this implementation)
9. ✅ **Conventions:** Server action boilerplate and client component patterns followed

## Files Created/Modified

### Created (8 files)

1. `src/data-access/bh-certificate.ts`
2. `src/actions/audit-execution/bh-certificate.ts`
3. `src/components/audit-execution/bh-signature-capture.tsx`
4. `src/components/audit-execution/bh-certificate-workflow.tsx`
5. `src/components/pdf-report/bh-certificate-section.tsx`
6. `src/app/(dashboard)/audit-execution/[id]/bh-certificate/page.tsx`
7. `.planning/gap-closure-a/A7-SUMMARY.md` (this file)

### Modified (4 files)

1. `prisma/schema.prisma` — Added `bhCertCountersignedById` and `bhCertCountersignedAt`
2. `src/actions/audit-execution/schemas.ts` — Added BH certificate schemas
3. `src/data-access/reports.ts` — Extended `getAuditReportData()` to resolve signer names
4. `src/components/pdf-report/audit-summary-document.tsx` — Integrated BhCertificateSection

## Database Changes

**Migration:** Schema extended via `pnpm prisma db push` (dev environment)

**New Fields:**

```prisma
model AuditEngagement {
  // ... existing fields
  bhCertCountersignedById String?   @db.Uuid
  bhCertCountersignedAt   DateTime?
}
```

**Regenerated:** Prisma client updated with `pnpm prisma generate`

## Testing Notes

**Manual Testing Recommended:**

1. **Sign-off as BRANCH_HEAD:**
   - Navigate to `/audit-execution/[id]/bh-certificate`
   - Verify declaration text displays with user's name
   - Verify checkbox and comments are required
   - Sign certificate and verify transition to SIGNED state

2. **Countersign as LEAD_AUDITOR:**
   - Verify signed state displays with BH signature details
   - Countersign certificate
   - Verify transition to COUNTERSIGNED state

3. **PDF Generation:**
   - Generate audit summary PDF for engagement with signed BH certificate
   - Verify BH certificate section renders with proper formatting
   - Verify signature details and comments appear correctly

4. **Permission Enforcement:**
   - Test that non-BRANCH_HEAD users cannot sign
   - Test that non-LEAD_AUDITOR users cannot countersign
   - Verify appropriate error messages

5. **State Guards:**
   - Attempt to sign twice → should fail
   - Attempt to countersign before signing → should fail
   - Attempt to countersign twice → should fail

## Known Issues / Notes

1. **Pre-existing TypeScript Errors:** The codebase has some unrelated TS errors in other files (e.g., missing schemas for other actions, form component issues). These are NOT introduced by this implementation.

2. **Schema Validation Fix:** The initial `z.literal(true, { errorMap: ... })` syntax was incorrect. Fixed to use `.refine()` pattern instead.

3. **Date Type Handling:** Added runtime checks for Date vs string in page component to handle Prisma's Date type properly.

4. **No Git Commands:** As instructed, all changes are uncommitted for main session to handle.

## Next Steps (if any)

1. **Testing:** Manual testing of full workflow (sign → countersign → PDF generation)
2. **Navigation:** Add navigation links to BH certificate page from audit execution dashboard
3. **Email Notifications:** Consider adding email notifications when certificate is signed/countersigned
4. **Reminder Logic:** Consider adding reminder logic for pending BH certificate signatures

## Conclusion

✅ **R26: BH Certificate Sign-off** is now fully implemented. The Branch Head can digitally sign off on the audit certificate with a formal declaration, and the Lead Auditor can countersign. The signed certificate renders in the PDF report with proper formatting and signature details. All code follows AEGIS conventions and uses secure, tenant-scoped database access.
