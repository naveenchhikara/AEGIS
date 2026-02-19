# AEGIS RBIAS v3.0 Security Audit Report

**Classification:** CONFIDENTIAL  
**Date:** 2026-02-18  
**Auditor:** Security Review Sub-Agent  
**System:** Risk-Based Internal Audit System (RBIAS) for Urban Cooperative Banks

---

## 1. Executive Summary

AEGIS is a comprehensive internal audit platform for Urban Cooperative Banks (UCBs) in India, handling sensitive financial data, regulatory observations, audit findings, and compliance records. This security audit examined authentication, authorization, input validation, data access patterns, sensitive data handling, schema design, and API surface.

### Overall Security Posture: **MEDIUM-HIGH** ⚠️

The codebase demonstrates **strong foundational security practices** including:

- Robust RBAC system with 17 roles and granular permissions
- Row-Level Security (RLS) via PostgreSQL `prismaForTenant` wrapper
- Zod validation on all server action inputs
- File type validation via magic bytes (not extensions)
- Account lockout and rate limiting on authentication endpoints
- Comprehensive audit logging with 10-year retention
- Maker-checker enforcement for sensitive operations

However, **critical gaps exist** in consistent application of tenant isolation across all data access patterns, which could enable cross-tenant data access or deletion.

---

## 2. Findings by Severity

### 🔴 CRITICAL

#### CRIT-001: Cross-Tenant Deletion Vulnerability in Calendar Events

**File:** `/src/actions/admin/manage-calendar.ts`  
**Lines:** 58-64

```typescript
export async function deleteCalendarEvent(eventId: string) {
  // ...
  await prisma.auditCalendar.delete({ where: { id: eventId } });
```

**Description:** The delete operation uses raw `prisma` client without tenant scoping. Any authenticated user with `calendar:manage` permission can delete calendar events from ANY tenant by providing the event ID.

**Risk:** Complete bypass of tenant isolation for calendar deletion. A malicious user could delete audit schedules, meeting records, and compliance timelines from other banks.

**Recommended Fix:**

```typescript
export async function deleteCalendarEvent(eventId: string) {
  const session = await getRequiredSession();
  const user = session.user as any;
  const tenantId = user.tenantId;

  // Use prismaForTenant OR verify tenant ownership
  const db = prismaForTenant(tenantId);

  const deleted = await db.auditCalendar.deleteMany({
    where: { id: eventId, tenantId },
  });

  if (deleted.count === 0) {
    return { success: false, error: "Event not found" };
  }
  // ...
}
```

---

#### CRIT-002: Template Deactivation Bypasses Tenant Isolation

**File:** `/src/actions/admin/manage-templates.ts`  
**Lines:** 68-74

```typescript
export async function deactivateTemplate(templateId: string) {
  // ...
  await prisma.reportTemplate.update({
    where: { id: templateId },
    data: { isActive: false },
  });
```

**Description:** Template deactivation uses raw `prisma` without verifying the template belongs to the user's tenant. The permission check exists, but tenant isolation is absent.

**Risk:** A user with `template:manage` permission can deactivate report templates from any tenant, potentially disrupting other banks' audit reporting capabilities.

**Recommended Fix:**

```typescript
export async function deactivateTemplate(templateId: string) {
  const session = await getRequiredSession();
  const user = session.user as any;
  const tenantId = user.tenantId;

  const result = await prisma.reportTemplate.updateMany({
    where: { id: templateId, tenantId },
    data: { isActive: false },
  });

  if (result.count === 0) {
    return { success: false, error: "Template not found" };
  }
  // ...
}
```

---

### 🟠 HIGH

#### HIGH-001: Inconsistent Use of `prismaForTenant` Across Admin Actions

**Files:**

- `/src/actions/admin/manage-templates.ts`
- `/src/actions/admin/manage-calendar.ts`

**Description:** These files use raw `prisma` client instead of `prismaForTenant()`, bypassing the Row-Level Security (RLS) wrapper. While `tenantId` is correctly included in CREATE operations, UPDATE and DELETE operations lack tenant verification.

**Affected Operations:**
| File | Operation | Has Tenant Scope |
|------|-----------|------------------|
| manage-templates.ts | createReportTemplate | ✅ (in data) |
| manage-templates.ts | deactivateTemplate | ❌ |
| manage-calendar.ts | createCalendarEvent | ✅ (in data) |
| manage-calendar.ts | deleteCalendarEvent | ❌ |

**Risk:** Partial tenant isolation bypass. While new records are correctly scoped, modifications and deletions are not.

**Recommended Fix:** Replace all raw `prisma` calls with `prismaForTenant(tenantId)` for all tenant-scoped tables, or add explicit `tenantId` checks to all UPDATE/DELETE operations.

---

#### HIGH-002: Governance DAL Update/Delete Operations Missing Tenant Verification

**File:** `/src/data-access/governance.ts`  
**Lines:** 106-114, 143-149, 221-227, 280-287, 343-351

**Description:** Multiple update and delete functions do not include `tenantId` in their WHERE clause, relying solely on the record ID.

**Affected Functions:**

- `updatePolicyDocument()` - no tenant check
- `deletePolicyDocument()` - no tenant check
- `updateCommittee()` - no tenant check
- `updateCommitteeMeeting()` - no tenant check
- `updateHousekeepingMetric()` - no tenant check

**Example:**

```typescript
export async function updatePolicyDocument(
  session: Session,
  policyId: string,
  data: {...}
) {
  // ...
  return db.policyDocument.update({
    where: { id: policyId }, // No tenantId check!
    data,
  });
}
```

**Risk:** Cross-tenant data modification. While `prismaForTenant` provides RLS at the database level (belt-and-suspenders approach), these functions violate the explicit WHERE clause security invariant documented in `prismaForTenant`.

**Recommended Fix:**

```typescript
export async function updatePolicyDocument(
  session: Session,
  policyId: string,
  data: {...}
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.policyDocument.updateMany({
    where: { id: policyId, tenantId },
    data,
  });
}
```

---

#### HIGH-003: User Invitation Management Uses Raw Prisma

**File:** `/src/actions/user-invitations.ts`

**Description:** User invitation functions use raw `prisma` instead of `prismaForTenant`. While this is partially justified (User table spans tenants), the branch assignment validation and user lookups should be tenant-scoped.

**Specific Concerns:**

1. `resendInvitation()` and `revokeInvitation()` query users by ID without verifying they belong to the admin's tenant
2. Branch lookups during invitation use raw prisma without tenant context validation

**Risk:** Potential for admin from one bank to view/revoke invitations from another bank if they obtain user IDs.

**Recommended Fix:** Add explicit `tenantId` checks to user operations where the actor's tenant context should apply:

```typescript
export async function revokeInvitation(userId: string) {
  // ...
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId }, // Add tenantId check
    // ...
  });
}
```

---

### 🟡 MEDIUM

#### MED-001: Raw SQL Queries in Repeat Finding Detection

**File:** `/src/actions/repeat-findings/detect.ts`  
**Lines:** 64-90

**Description:** The `detectRepeatFindings` function uses raw `prisma.$queryRaw` with string interpolation for similarity searches. While tenantId is included in WHERE clause, the function doesn't use `prismaForTenant`.

**Code:**

```typescript
candidates = await prisma.$queryRaw`
  SELECT id, title, severity, status, "createdAt",
         similarity(title, ${title}) as similarity_score
  FROM "Observation"
  WHERE "tenantId" = ${tenantId}::uuid
    AND "branchId" = ${branchId}::uuid
    ...
```

**Risk:** LOW - The tenantId is properly parameterized (not string interpolated), preventing SQL injection. However, this bypasses the RLS wrapper.

**Recommended Fix:** This is acceptable for read-only similarity searches, but ensure the pattern is documented as an exception. Consider adding a comment explaining why raw SQL is used.

---

#### MED-002: Evidence Upload Lacks Virus Scanning

**File:** `/src/lib/s3.ts`

**Description:** File uploads are validated for type (via magic bytes) and size (10MB limit) but are not scanned for malware before storage.

**Risk:** Malicious files could be uploaded as "evidence" and later downloaded by other users, potentially spreading malware.

**Recommended Fix:** Integrate S3 virus scanning (e.g., ClamAV Lambda layer or third-party service) before confirming uploads.

---

#### MED-003: Presigned URLs Have 5-Minute Expiry

**File:** `/src/lib/s3.ts`  
**Line:** 33

```typescript
const PRESIGNED_URL_EXPIRY = 300; // 5 minutes
```

**Description:** Presigned URLs for evidence upload/download expire after 5 minutes. This is reasonable but should be documented and potentially reduced for sensitive operations.

**Risk:** A leaked URL remains valid for 5 minutes.

**Recommended Fix:** Consider reducing to 60-120 seconds for uploads. Document the rationale for the current timeout.

---

#### MED-004: Missing Input Validation on Some Direct String Parameters

**File:** `/src/actions/user-invitations.ts`  
**Lines:** 162, 187

**Description:** Functions like `resendInvitation(userId)` and `revokeInvitation(userId)` accept userId as a plain string without Zod validation.

```typescript
export async function resendInvitation(userId: string) {
  // No validation that userId is a valid UUID
```

**Risk:** Invalid input could cause unexpected database errors or potentially be exploited in edge cases.

**Recommended Fix:** Add Zod validation:

```typescript
const UserIdSchema = z.string().uuid();

export async function resendInvitation(userId: string) {
  const parsed = UserIdSchema.safeParse(userId);
  if (!parsed.success) {
    return { success: false, error: "Invalid user ID" };
  }
  // ...
}
```

---

#### MED-005: Board Report Download URL Exposure

**File:** `/src/app/api/reports/board-report/route.ts`  
**Lines:** 140-144

**Description:** The GET endpoint returns a presigned download URL in the response body. While this is authenticated and role-checked, the URL could be shared.

**Risk:** Board report PDFs could be shared outside the system via the presigned URL (valid for 5 minutes).

**Recommended Fix:** Consider streaming the file content directly instead of returning a URL, or reduce URL expiry for report downloads specifically.

---

### 🔵 LOW

#### LOW-001: Error Messages May Reveal Internal State

**Files:** Multiple server actions

**Description:** Some error messages return database-level error text that could reveal information about the system:

```typescript
} catch (error) {
  const message = error instanceof Error ? error.message : "Failed...";
  return { success: false as const, error: message };
}
```

**Risk:** Information leakage about database structure, constraints, or internal IDs.

**Recommended Fix:** In production, log the detailed error but return a generic message:

```typescript
} catch (error) {
  logger.error({ error, ... }, "Operation failed");
  return { success: false as const, error: "Operation failed. Please try again." };
}
```

---

#### LOW-002: Session Cookie Name Reveals Framework

**File:** `/src/middleware.ts`  
**Lines:** 40-43

```typescript
const SESSION_COOKIES = [
  "__Secure-better-auth.session_token",
  "better-auth.session_token",
];
```

**Description:** Cookie names reveal the authentication framework (Better Auth).

**Risk:** Minor - Helps attackers target known vulnerabilities in Better Auth.

**Recommended Fix:** Consider customizing cookie names in Better Auth configuration.

---

#### LOW-003: Invite Tokens Logged to Console

**File:** `/src/actions/user-invitations.ts`  
**Lines:** 85-88

```typescript
console.log(
  `[INVITATION] Email would be sent to ${invite.email} with token link: /accept-invite?token=${rawToken}...`,
);
```

**Description:** Raw invitation tokens are logged to console (not the structured logger). In production, this could expose tokens in log files.

**Risk:** Invitation tokens could be intercepted from logs.

**Recommended Fix:** Remove token from log message, or ensure console.log is replaced with structured logging in production.

---

### ℹ️ INFO (Positive Observations)

#### INFO-001: Robust RBAC Implementation

**File:** `/src/lib/permissions.ts`

The RBAC system is well-designed:

- 17 distinct roles aligned with UCB organizational structure
- Granular permissions (50+ distinct permissions)
- Multi-role support with proper `roles.some()` checking (per Decision D20)
- Clear separation of duties (e.g., AUDITOR creates, AUDIT_MANAGER reviews, CAE approves)

---

#### INFO-002: State Machine Enforces Workflow Security

**File:** `/src/lib/state-machine.ts`

The observation state machine properly enforces:

- Role-based transition guards
- Severity-based closing (CAE required for HIGH/CRITICAL)
- Return transitions for maker-checker workflows
- Automatic severity escalation for repeat findings

---

#### INFO-003: Strong Authentication Security

**File:** `/src/lib/auth.ts`

Authentication is well-secured:

- Rate limiting: 10 login attempts per IP per 15 minutes
- Account lockout: 5 failures → 30-minute lock
- Concurrent session limit: max 2 per user
- Cookie security: httpOnly, secure (prod), sameSite=lax
- UUID-compatible session IDs

---

#### INFO-004: Comprehensive Audit Logging

**Files:** `/src/data-access/audit-context.ts`, Prisma schema

Audit logging includes:

- Business-level action types (not just CRUD)
- Actor info (userId, sessionId, IP address)
- Data snapshots (oldData/newData)
- 10-year retention (PMLA compliance)
- Justification requirement for sensitive operations

---

#### INFO-005: File Upload Security

**File:** `/src/lib/s3.ts`

File uploads are properly secured:

- Magic byte validation (not extension-based)
- Limited to safe types: PDF, JPEG, PNG, DOCX, XLSX
- 10MB size limit
- Presigned URLs (no direct S3 access)
- S3 server-side encryption (AES-256)

---

#### INFO-006: Tenant Isolation Architecture

**File:** `/src/data-access/prisma.ts`

The `prismaForTenant` function implements defense-in-depth:

- PostgreSQL RLS via `set_config('app.current_tenant_id', ...)`
- Transaction-scoped (safe for connection pooling)
- Explicit recommendation to add WHERE tenantId clauses

---

#### INFO-007: CSRF Protection

**File:** `/src/lib/csrf.ts`

Origin/referer validation prevents CSRF attacks on non-GET API routes.

---

#### INFO-008: Structured Logging with Redaction

**File:** `/src/lib/logger.ts`

Pino logger with automatic redaction of:

- password, token, authorization, cookie, secret, apiKey
- Nested paths (req.headers.authorization, etc.)

---

#### INFO-009: AUDITEE Role Properly Restricted

**Files:** `/src/lib/permissions.ts`, `/src/actions/auditee.ts`

AUDITEE role is correctly limited:

- Can only read observations assigned to them
- Can only submit responses, not modify observations
- Branch-scoped access via `UserBranchAssignment`
- Evidence uploads require observation ownership verification

---

#### INFO-010: Optimistic Locking for Observations

**File:** `/src/actions/observations/transition.ts`

The `version` field prevents concurrent modification conflicts and provides audit trail.

---

## 3. Summary of Required Actions

### Immediate (Critical - Fix Within 24 Hours)

| ID       | Issue                                           | Fix                          |
| -------- | ----------------------------------------------- | ---------------------------- |
| CRIT-001 | Calendar deletion bypasses tenant isolation     | Add tenantId to WHERE clause |
| CRIT-002 | Template deactivation bypasses tenant isolation | Add tenantId to WHERE clause |

### Short-Term (High - Fix Within 1 Week)

| ID       | Issue                                     | Fix                                             |
| -------- | ----------------------------------------- | ----------------------------------------------- |
| HIGH-001 | Admin actions use raw prisma              | Migrate to prismaForTenant                      |
| HIGH-002 | Governance DAL missing tenant checks      | Add tenantId to all UPDATE/DELETE WHERE clauses |
| HIGH-003 | User invitations lack tenant verification | Add tenantId checks                             |

### Medium-Term (Medium - Fix Within 1 Month)

| ID      | Issue                        | Fix                         |
| ------- | ---------------------------- | --------------------------- |
| MED-002 | No virus scanning on uploads | Integrate malware scanning  |
| MED-004 | Missing UUID validation      | Add Zod schemas             |
| MED-005 | Report URL exposure          | Consider streaming approach |

---

## 4. Compliance Considerations

This system handles data subject to:

- **RBI IT Framework** for Urban Cooperative Banks
- **PMLA (Prevention of Money Laundering Act)** - 10-year audit retention
- **Information Technology Act, 2000** - Data protection requirements

The audit logging and retention mechanisms appear to meet PMLA requirements. However, cross-tenant data access vulnerabilities (CRIT-001, CRIT-002) could constitute data breaches under IT Act provisions.

---

## 5. Conclusion

AEGIS demonstrates mature security architecture with strong foundations in RBAC, audit logging, and authentication. The primary concern is **inconsistent application of tenant isolation** across the codebase. The `prismaForTenant` wrapper is well-designed, but several admin and governance actions bypass it using raw `prisma` calls.

**Recommended Priority:**

1. Fix CRIT-001 and CRIT-002 immediately (data deletion vulnerabilities)
2. Audit all uses of raw `prisma` in tenant-scoped operations
3. Add automated tests for tenant isolation boundaries
4. Consider adding database-level RLS policies as an additional layer

---

_End of Security Audit Report_
