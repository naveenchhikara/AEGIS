# Domain Pitfalls: Adding Backend to AEGIS Prototype

**Domain:** Multi-tenant SaaS internal audit platform
**Context:** Adding PostgreSQL + Prisma + Better Auth + workflows to existing Next.js 16 prototype
**Researched:** 2026-02-08
**Confidence:** HIGH (2026 web search + codebase analysis + official documentation)

## Critical Pitfalls

### Pitfall 1: "use client" Data Import Trap

**What goes wrong:**

The current AEGIS codebase has ~20 client components that directly import JSON data from `@/data`. When migrating to Prisma:

```tsx
// Current pattern (WILL BREAK)
"use client";
import { findings } from "@/data"; // ❌ Cannot be replaced with async Prisma call

const findingsData = findings as unknown as FindingsData;
const totalFindings = findingsData.findings.length; // Computed at module scope
```

**Why it happens:**

1. `"use client"` components cannot be async
2. Prisma queries are async and server-only
3. Module-scope data imports execute once at component definition, not at render time
4. Next.js 16 App Router enforces strict server/client boundaries

**Consequences:**

- Cannot simply replace `import { findings } from "@/data"` with `const findings = await prisma.finding.findMany()`
- Breaking change affects ~20 components across dashboard, compliance, audit, findings pages
- Naive refactor creates waterfall requests (parent fetches → child fetches → grandchild fetches)
- Props drilling hell if passing data down multiple levels

**Prevention:**

**Server-Component Wrapper Pattern:**

```tsx
// app/(dashboard)/dashboard/page.tsx (Server Component)
import { getFindingsStats } from "@/lib/data/findings";
import { FindingsCountCardsClient } from "@/components/dashboard/findings-count-cards-client";

export default async function DashboardPage() {
  const stats = await getFindingsStats(); // Fetch once at page level

  return (
    <div>
      <FindingsCountCardsClient stats={stats} /> {/* Pass as props */}
    </div>
  );
}

// components/dashboard/findings-count-cards-client.tsx
("use client");
type Props = {
  stats: { total: number; critical: number; open: number; overdue: number };
};

export function FindingsCountCardsClient({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Render using stats prop */}
    </div>
  );
}
```

**Composition Pattern for Deep Nesting:**

```tsx
// Server component fetches and renders structure
export default async function DashboardPage() {
  const findings = await getFindingsStats();
  const compliance = await getComplianceStats();

  return (
    <ClientLayout>
      {/* Pass server components as children to client components */}
      <FindingsSection stats={findings} />
      <ComplianceSection stats={compliance} />
    </ClientLayout>
  );
}
```

**Detection:**

- Grep for `"use client"` + `from "@/data"`
- Identify components with module-scope calculations (lines 11-21 in `findings-count-cards.tsx`)
- Find components that filter/transform imported data

**Warning Signs:**

- Editing more than 3 files simultaneously to "replace data sources"
- Client components that try to use `async/await`
- TypeScript errors: "Cannot find namespace 'Promise'" in client components

**Phase:** Phase 1 (Data Layer Migration) — address systematically before adding auth

**Recovery Strategy:**

If discovered mid-migration:

1. Create data fetching functions in `src/lib/data/` (one per domain)
2. Move page components to server components by removing `"use client"`
3. Split interactive components into `-client.tsx` variants that receive props
4. Use Next.js automatic request deduplication (no need for global state)

**Sources:**

- [Next.js 16 Migration Guide](https://learnwebcraft.com/blog/next-js-16-migration-guide)
- [Common mistakes with App Router](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them)
- [Props drilling avoidance in App Router](https://nextjs-forum.com/post/1196426844916949023)

---

### Pitfall 2: PostgreSQL RLS Connection Pool Contamination

**What goes wrong:**

Multi-tenant RLS relies on setting session variables (`SET app.current_tenant_id = 'abc'`) before queries. In pooled connections, these settings persist and can leak between requests:

```typescript
// Request 1: User from Tenant A
await prisma.$executeRaw`SET app.current_tenant_id = 'tenant-a'`;
const findings = await prisma.finding.findMany(); // ✅ Sees Tenant A data
// Connection returned to pool

// Request 2: User from Tenant B (gets same connection from pool)
// ❌ app.current_tenant_id STILL SET TO 'tenant-a'
const findings = await prisma.finding.findMany(); // 🚨 SEES TENANT A DATA!
```

**Why it happens:**

1. PgBouncer/Prisma connection pooling reuses connections
2. Session variables (`SET`) persist for the connection lifetime
3. Next.js middleware runs once per request, but connection may outlive request
4. On single VPS with limited connections (~20-50), high reuse rate increases collision probability

**Consequences:**

- **Cross-tenant data leakage** — the worst-case security failure (CVE-level)
- Intermittent, non-deterministic (only fails when pooled connection reused)
- Hard to reproduce in development (single user, no pool pressure)
- Discovered only in production with concurrent multi-tenant traffic
- Recent CVEs (CVE-2024-10976, CVE-2025-8713) show RLS can leak data through optimizer statistics

**Prevention:**

**Prisma Middleware with Reset:**

```typescript
// lib/prisma.ts
const prismaClientSingleton = () => {
  const prisma = new PrismaClient();

  prisma.$use(async (params, next) => {
    const tenantId = await getTenantId(); // From session/context

    if (!tenantId) {
      throw new Error("Tenant context missing");
    }

    // Set tenant context BEFORE every query
    await prisma.$executeRaw`SET app.current_tenant_id = ${tenantId}`;

    try {
      return await next(params);
    } finally {
      // CRITICAL: Reset after query completes
      await prisma.$executeRaw`RESET app.current_tenant_id`;
    }
  });

  return prisma;
};
```

**Alternative: Transaction-scoped RLS:**

```typescript
// Wrap every data access in transaction
export async function getTenantFindings(tenantId: string) {
  return await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL app.current_tenant_id = ${tenantId}`;
    return tx.finding.findMany(); // RLS applies within transaction only
  });
}
```

**Defense-in-Depth:**

1. Add `tenant_id` to ALL queries as explicit WHERE clause (double-check RLS)
2. Use database-level foreign key constraints with `ON DELETE CASCADE`
3. Test with concurrent requests to different tenants in staging
4. Add tenant mismatch detection in API responses (log if RLS result ≠ explicit filter result)
5. NEVER connect as superuser — RLS doesn't apply to superusers (table owners)

**Detection:**

- Load test with 2+ demo tenants hitting same endpoint concurrently
- Check for cross-tenant data in response (response.tenant_id !== session.tenant_id)
- Monitor Prisma query logs for missing SET statements
- Test with `ALTER TABLE ... FORCE ROW LEVEL SECURITY` to enforce even for table owners

**Warning Signs:**

- Tests pass with superuser but fail with application user
- Intermittent data appearing for wrong tenant
- Connection pool exhaustion followed by data leakage

**Phase:** Phase 2 (Multi-Tenancy Infrastructure) — MUST be in place before any real data

**Recovery Strategy:**

If data leakage detected:

1. IMMEDIATE: Disable affected tenant accounts, clear connection pool
2. Implement transaction-scoped RLS across all queries
3. Audit trail analysis to identify leaked data (who saw what)
4. Notification to affected UCBs (regulatory/legal requirement)

**Sources:**

- [Multi-Tenant Leakage: When RLS Fails in SaaS](https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c)
- [Securing Multi-Tenant Apps with PostgreSQL RLS and Prisma](https://medium.com/@francolabuschagne90/securing-multi-tenant-applications-using-row-level-security-in-postgresql-with-prisma-orm-4237f4d4bd35)
- [Common Postgres RLS Footguns](https://www.bytebase.com/blog/postgres-row-level-security-footguns/)
- [PostgreSQL RLS Implementation Guide](https://www.permit.io/blog/postgres-rls-implementation-guide)

---

### Pitfall 3: Better Auth + next-intl Middleware Conflict

**What goes wrong:**

Both Better Auth and next-intl want to control Next.js middleware:

```typescript
// middleware.ts (Next.js 16: proxy.ts) — CONFLICT
import { betterAuth } from "@/lib/auth"; // Better Auth
import createMiddleware from "next-intl/middleware"; // next-intl

// ❌ Only one default export allowed
export default authMiddleware; // Or createMiddleware?
```

**Why it happens:**

1. Next.js 16 renamed `middleware` → `proxy`, but pattern remains: single default export
2. Better Auth needs to intercept all requests for session cookies
3. next-intl needs to read/set locale cookies (`NEXT_LOCALE`)
4. Both operate on `request.headers` and `cookies()`, order matters
5. `getSessionCookie()` function does not automatically reference the auth config — if you customized cookie name or prefix, configuration mismatch breaks auth

**Consequences:**

- Authentication broken (sessions not detected)
- OR locale switching broken (cookie not read)
- Redirects fail (auth redirects to `/login` but locale not preserved)
- Edge cases: logout clears locale, language selector doesn't work after auth
- Security risk: next-intl cookie lacks HttpOnly flag by default

**Prevention:**

**Middleware Composition Pattern:**

```typescript
// middleware.ts (Next.js 16: proxy.ts)
import { betterAuth, getSessionCookie } from "@/lib/auth";
import createIntlMiddleware from "next-intl/middleware";

const intlMiddleware = createIntlMiddleware({
  locales: ["en", "hi", "mr", "gu"],
  defaultLocale: "en",
  localePrefix: "never", // Cookie-based, no URL prefix
});

export default betterAuth({
  // Better Auth config
  callbacks: {
    async handleValidToken(request) {
      // Auth succeeded, pass to i18n
      return intlMiddleware(request);
    },
    async handleInvalidToken(request) {
      // Auth failed, but still handle i18n
      const response = intlMiddleware(request);
      // Then redirect to login with locale preserved
      response.headers.set("Location", "/login");
      return response;
    },
    async handleError(request, error) {
      console.error("Auth error:", error);
      return intlMiddleware(request);
    },
  },
});

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
```

**Critical Considerations:**

1. Better Auth runs first (session must be established before i18n)
2. Preserve locale cookie through auth flow (don't clear on logout)
3. Test: login → switch language → logout → login again (locale should persist)
4. Ensure `getSessionCookie()` config matches `auth.ts` cookie settings (name, prefix)
5. Node.js runtime in middleware is experimental before Next.js 16 — ensure you're on v16+

**Detection:**

- Inspect Network tab: auth cookie (`better-auth.session_token`) and locale cookie (`NEXT_LOCALE`) both present
- Test: `/dashboard` → browser language preference ignored (cookie takes precedence)
- Test: Logout → `/login` still shows last selected language

**Warning Signs:**

- Redirect loops after login
- Session cookie present but auth middleware doesn't detect it
- Locale resets to default after navigation

**Phase:** Phase 1 (Authentication) — resolve before users can switch language

**Recovery Strategy:**

If conflict discovered:

1. Temporarily disable one middleware to isolate issue
2. Review both libraries' request/response header modifications
3. Ensure Better Auth processes first, passes modified request to next-intl
4. Add integration test covering auth + locale cookie scenarios

**Sources:**

- [Better Auth Next.js Integration](https://www.better-auth.com/docs/integrations/next)
- [Better Auth with Next.js Complete Guide](https://medium.com/@amitupadhyay878/better-auth-with-next-js-a-complete-guide-for-modern-authentication-06eec09d6a64)
- [next-intl middleware integration discussion](https://github.com/amannn/next-intl/discussions/1613)
- [Next.js 16 middleware to proxy changes](https://medium.com/@amitupadhyay878/next-js-16-update-middleware-js-5a020bdf9ca7)

---

### Pitfall 4: Observation Workflow State Machine — Invalid Transitions

**What goes wrong:**

Observation lifecycle has maker-checker flow with role-based transitions:

```
draft → auditee_review → final → compliance → review → closed
         ↑                ↑          ↑           ↑
      Auditor          Auditor   Auditee      Manager/CAE
```

Without database-level enforcement:

```typescript
// ❌ Application code allows invalid transition
await prisma.observation.update({
  where: { id },
  data: { status: "closed" }, // No validation!
});
// User jumped from 'draft' → 'closed' (bypassing auditee review)
```

**Why it happens:**

1. Prisma doesn't enforce custom business rules
2. Multiple API routes update observation status (redundant validation logic)
3. Concurrent requests create race conditions (check-then-act pattern)
4. Role permissions checked in API route, but not in database

**Consequences:**

- Regulatory non-compliance (audit observations must follow documented process)
- Auditee bypasses review by exploiting race condition
- Invalid state transitions visible in audit trail
- RBI audit failure (process not followed)

**Prevention:**

**PostgreSQL Function with State Machine:**

```sql
-- migrations/add_observation_state_machine.sql
CREATE TYPE observation_status AS ENUM (
  'draft', 'auditee_review', 'final', 'compliance', 'review', 'closed'
);

CREATE OR REPLACE FUNCTION transition_observation_status(
  p_observation_id UUID,
  p_new_status observation_status,
  p_user_id UUID
) RETURNS void AS $$
DECLARE
  v_current_status observation_status;
  v_user_role TEXT;
  v_severity TEXT;
BEGIN
  -- Lock row for update (prevent race conditions)
  SELECT status, severity INTO v_current_status, v_severity
  FROM observations
  WHERE id = p_observation_id
  FOR UPDATE;

  -- Get user role
  SELECT role INTO v_user_role FROM users WHERE id = p_user_id;

  -- State transition validation
  IF v_current_status = 'draft' AND p_new_status = 'auditee_review' THEN
    IF v_user_role NOT IN ('auditor', 'audit_manager') THEN
      RAISE EXCEPTION 'Only auditors can submit observations for review';
    END IF;
  ELSIF v_current_status = 'auditee_review' AND p_new_status = 'final' THEN
    IF v_user_role NOT IN ('auditor', 'audit_manager') THEN
      RAISE EXCEPTION 'Only auditors can finalize observations';
    END IF;
  ELSIF v_current_status = 'final' AND p_new_status = 'compliance' THEN
    IF v_user_role NOT IN ('auditee', 'branch_manager') THEN
      RAISE EXCEPTION 'Only auditees can submit compliance';
    END IF;
  ELSIF v_current_status = 'compliance' AND p_new_status = 'review' THEN
    IF v_user_role NOT IN ('audit_manager', 'cae') THEN
      RAISE EXCEPTION 'Only managers can review compliance';
    END IF;
  ELSIF v_current_status = 'review' AND p_new_status = 'closed' THEN
    -- High/Critical requires CAE approval
    IF v_severity IN ('high', 'critical') AND v_user_role != 'cae' THEN
      RAISE EXCEPTION 'High/Critical findings require CAE closure';
    END IF;
    IF v_user_role NOT IN ('audit_manager', 'cae') THEN
      RAISE EXCEPTION 'Only managers can close observations';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid state transition: % → %', v_current_status, p_new_status;
  END IF;

  -- Update status
  UPDATE observations
  SET status = p_new_status, updated_at = NOW()
  WHERE id = p_observation_id;
END;
$$ LANGUAGE plpgsql;
```

**Application Layer:**

```typescript
// lib/data/observations.ts
export async function transitionObservation(
  observationId: string,
  newStatus: ObservationStatus,
  userId: string,
) {
  return await prisma.$executeRaw`
    SELECT transition_observation_status(
      ${observationId}::uuid,
      ${newStatus}::observation_status,
      ${userId}::uuid
    )
  `;
}
```

**Detection:**

- Test matrix of all role × status combinations
- Try concurrent updates to same observation (simulate race condition)
- Audit trail query for invalid status sequences

**Warning Signs:**

- Status changes bypass expected workflow steps
- Users can transition to any status from UI
- Concurrent form submissions both succeed

**Phase:** Phase 3 (Observation Workflow) — state machine before workflow UI

**Recovery Strategy:**

If invalid transitions occur:

1. Identify observations with invalid status history (query audit log)
2. Manual correction by CAE (rollback to valid state)
3. Deploy database function ASAP
4. Add monitoring: daily report of status transition anomalies

**Sources:**

- [Implementing State Machines in PostgreSQL](https://felixge.de/2017/07/27/implementing-state-machines-in-postgresql/)
- [Winning Race Conditions With PostgreSQL](https://dev.to/mistval/winning-race-conditions-with-postgresql-54gn)
- [PostgreSQL locking through views](https://dev.to/aws-heroes/postgresql-when-locking-though-views-tldr-test-for-race-conditions-and-check-execution-plan-with-buffers-verbose-28je)

---

### Pitfall 5: S3 Presigned URL Path Traversal

**What goes wrong:**

Presigned URL generation without path validation allows file access outside intended scope:

```typescript
// ❌ VULNERABLE
export async function generateUploadUrl(fileName: string) {
  const command = new PutObjectCommand({
    Bucket: "aegis-evidence",
    Key: fileName, // User-controlled, not validated
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

// Attacker sends: fileName = "../../../sensitive/bank-data.xlsx"
// Gets presigned URL to overwrite file outside evidence folder!
```

**Why it happens:**

1. File paths from user input not sanitized
2. S3 allows `..` in object keys (unlike filesystem)
3. Presigned URLs bypass application-layer validation
4. No content-type validation on upload
5. Bucket enumeration possible by passing empty bucketName parameter

**Consequences:**

- Unauthorized file access across tenants
- Evidence tampering (overwrite existing files)
- Malicious file upload (executable disguised as PDF)
- S3 bucket enumeration (list all files)
- IDOR attacks via path parameter manipulation

**Prevention:**

**Strict Path Validation:**

```typescript
// lib/storage.ts
import { randomUUID } from "crypto";
import path from "path";

const ALLOWED_EXTENSIONS = [".pdf", ".xlsx", ".docx", ".png", ".jpg", ".jpeg"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function generateUploadUrl(
  tenantId: string,
  userId: string,
  originalFileName: string,
  contentType: string,
) {
  // Validate content type
  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/png",
    "image/jpeg",
  ];

  if (!allowedTypes.includes(contentType)) {
    throw new Error("Invalid content type");
  }

  // Validate file extension
  const ext = path.extname(originalFileName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error("Invalid file extension");
  }

  // Generate safe key (no user input in path)
  const fileId = randomUUID();
  const safeKey = `tenants/${tenantId}/evidence/${fileId}${ext}`;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: safeKey,
    ContentType: contentType,
    ContentLength: MAX_FILE_SIZE, // Enforce size limit
    Metadata: {
      "original-filename": originalFileName,
      "uploaded-by": userId,
      "tenant-id": tenantId, // For cross-check
      checksum: calculateChecksum(originalFileName), // MD5 for integrity
    },
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 900 }); // 15 min

  // Store mapping in database
  await prisma.evidenceFile.create({
    data: {
      id: fileId,
      tenantId,
      uploadedBy: userId,
      originalFileName,
      contentType,
      s3Key: safeKey,
      status: "pending_upload",
    },
  });

  return { uploadUrl: url, fileId };
}
```

**S3 Bucket Policy (Defense-in-Depth):**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EnforceTenantIsolation",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::aegis-evidence/*",
      "Condition": {
        "StringNotLike": {
          "s3:x-amz-meta-tenant-id": "${aws:userid}"
        }
      }
    }
  ]
}
```

**Content Validation:**

- Use S3's Content-MD5 header for integrity checks
- Verify uploaded file matches expected content-type (not just extension)
- Maximum presigned URL validity: 7 days (AWS limit), but use 15 minutes for uploads

**Detection:**

- Penetration test: send `../` in fileName parameter
- Monitor S3 access logs for unusual key patterns
- Check for files outside `tenants/{tenant_id}/` prefix

**Warning Signs:**

- User-provided filenames used directly in S3 keys
- No validation of file extension vs. content-type
- Presigned URLs with >1 hour expiration

**Phase:** Phase 4 (File Upload) — implement before S3 integration

**Recovery Strategy:**

If exploited:

1. Audit S3 bucket for files outside tenant folders
2. Check database for `evidenceFile` records with mismatched `tenantId`
3. Revoke all active presigned URLs (rotate S3 credentials)
4. Notify affected tenants if cross-tenant access occurred

**Sources:**

- [Securing Amazon S3 Presigned URLs](https://aws.amazon.com/blogs/compute/securing-amazon-s3-presigned-urls-for-serverless-applications/)
- [Security Vulnerabilities in AWS S3 Pre-signed URLs](https://medium.com/@dienbase/understanding-and-preventing-security-vulnerabilities-in-aws-s3-pre-signed-urls-0378cbf3f99f)
- [Pre-signed at your service](https://labs.withsecure.com/publications/pre-signed-at-your-service)
- [S3 Presigned URL Security Slides](https://reinforce.awsevents.com/content/dam/reinforce/2024/slides/IAM321_Amazon-S3-presigned-URL-security.pdf)

---

## Technical Debt Patterns

### Pattern 1: Prisma Schema Tenant Scoping Inconsistency

**What:**

Forgetting `tenant_id` on new models or making it optional when it should be required.

```prisma
// ❌ Missing tenant_id
model AuditTemplate {
  id          String @id @default(uuid())
  name        String
  description String?
  // Should have: tenantId String
}

// ❌ Optional tenant_id (should be required)
model Observation {
  id       String  @id @default(uuid())
  tenantId String?  // ❌ Should be: String (non-nullable)
  // ...
}
```

**Why bad:**

- Global templates leak across tenants
- NULL `tenant_id` bypasses RLS policies
- Cascade deletes fail (FK constraint requires non-null)
- Having non-nullable FK with ON DELETE CASCADE leads to Prisma errors

**Prevention:**

1. Schema review checklist: Every model (except `User`, `Tenant`) must have `tenantId String`
2. Prisma lint rule (custom script):

```typescript
// scripts/validate-schema.ts
const modelsWithoutTenantId = schema.models.filter(
  (m) =>
    !["User", "Tenant", "RbiCircular"].includes(m.name) &&
    !m.fields.find((f) => f.name === "tenantId" && f.isRequired),
);
if (modelsWithoutTenantId.length > 0) {
  throw new Error(
    `Missing required tenantId: ${modelsWithoutTenantId.map((m) => m.name).join(", ")}`,
  );
}
```

3. Migration review: `git diff` on `schema.prisma` must show `tenantId` for new models

**Sources:**

- [Multi-Tenancy Implementation with Prisma and ZenStack](https://zenstack.dev/blog/multi-tenant)

---

### Pattern 2: Forgetting Cascading Deletes

**What:**

Tenant deletion leaves orphaned records or fails with FK constraint errors.

```prisma
// ❌ No cascade
model Observation {
  id       String @id
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id])
  // Missing: onDelete: Cascade
}
```

**Why bad:**

- `DELETE FROM tenants WHERE id = 'x'` fails with FK violation
- OR (with `onDelete: Restrict`) orphaned observations remain after tenant cancels
- Manual cleanup required (data residue violates GDPR/data retention)
- Existing data that violates FK constraints causes migration failures

**Prevention:**

```prisma
model Observation {
  id       String @id
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  //                                                              ^^^^^^^^^^^^^^^^
}
```

**Testing:**

```typescript
// tests/tenant-deletion.test.ts
test("tenant deletion cascades to all related records", async () => {
  const tenant = await prisma.tenant.create({ data: { name: "Test Bank" } });
  await prisma.observation.create({ data: { tenantId: tenant.id /* ... */ } });

  await prisma.tenant.delete({ where: { id: tenant.id } });

  const orphans = await prisma.observation.findMany({
    where: { tenantId: tenant.id },
  });
  expect(orphans).toHaveLength(0); // Should be empty
});
```

**Warning Signs:**

- Tenant deletion fails with FK constraint error
- Migration adding cascading deletes fails due to existing data
- Orphaned records found after tenant cancellation

**Sources:**

- [Prisma Referential Actions](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/referential-actions)
- [Configure cascading deletes with Prisma and MySQL](https://www.prisma.io/docs/guides/database/advanced-database-tasks/cascading-deletes/mysql)

---

### Pattern 3: Email Notifications in Request Path

**What:**

Sending emails synchronously during API request handling.

```typescript
// ❌ Blocks request
export async function POST(request: Request) {
  const observation = await prisma.observation.create({ data: /* ... */ });

  // 🐌 Blocks for 2-5 seconds while SES sends email
  await sendEmailNotification({
    to: observation.auditeeEmail,
    subject: 'New observation assigned',
    body: renderTemplate(observation),
  });

  return NextResponse.json(observation);  // User waits for email to send!
}
```

**Why bad:**

- API response delayed by 2-5 seconds (poor UX)
- SES rate limit (14 emails/sec) causes request failures
- Email delivery failure blocks API success
- No retry on transient failures

**Prevention:**

**Background Job Queue:**

```typescript
// lib/queue.ts (using BullMQ or pg-boss)
import { Queue } from 'bullmq';

export const emailQueue = new Queue('emails', {
  connection: { host: 'localhost', port: 6379 },  // Redis
});

// API route
export async function POST(request: Request) {
  const observation = await prisma.observation.create({ data: /* ... */ });

  // Enqueue email (non-blocking)
  await emailQueue.add('observation-assigned', {
    observationId: observation.id,
    recipientId: observation.auditeeId,
  });

  return NextResponse.json(observation);  // Fast response
}

// workers/email-worker.ts
emailQueue.process('observation-assigned', async (job) => {
  const { observationId, recipientId } = job.data;
  const observation = await getObservation(observationId);
  const recipient = await getUser(recipientId);

  await sendEmailNotification({
    to: recipient.email,
    subject: 'New observation assigned',
    body: renderTemplate(observation),
  });
});
```

**Budget Alternative (No Redis):**

```typescript
// lib/email-queue-db.ts (PostgreSQL-based queue)
export async function enqueueEmail(type: string, data: any) {
  await prisma.emailQueue.create({
    data: { type, payload: data, status: "pending" },
  });
}

// cron job or long-running worker
async function processEmailQueue() {
  const pending = await prisma.emailQueue.findMany({
    where: { status: "pending" },
    take: 10, // Process 10 at a time (respect SES rate limit)
  });

  for (const job of pending) {
    try {
      await sendEmail(job.type, job.payload);
      await prisma.emailQueue.update({
        where: { id: job.id },
        data: { status: "sent", sentAt: new Date() },
      });
    } catch (error) {
      await prisma.emailQueue.update({
        where: { id: job.id },
        data: {
          status: "failed",
          error: error.message,
          retryCount: { increment: 1 },
        },
      });
    }
  }
}
```

---

## Integration Gotchas

### Gotcha 1: AWS SES Sandbox Limits Block Production Launch

**What:**

SES account starts in sandbox mode with severe restrictions:

- 200 emails/day limit
- 1 email/second rate
- Can only send to **verified email addresses**

**Why it breaks production:**

UCB pilot launches with 15 users → try to send 20 onboarding emails → 15 bounce (unverified addresses) → 5 get through → users think system is broken.

**Prevention:**

1. **Request production access EARLY** (2-3 weeks before launch):
   - AWS Console → SES → Account Dashboard → Request production access
   - Provide: use case description, email types, expected volume, opt-in process
   - Response time: 24-48 hours (can be rejected if insufficient detail)

2. **Verify domain (not individual emails):**

   ```bash
   # Add TXT records to DNS
   _amazonses.aegis-audit.com TXT "verification_token_from_ses"
   ```

3. **Monitor bounce/complaint rates from DAY ONE:**
   - Bounce rate > 5% → SES pauses sending
   - Complaint rate > 0.1% → SES pauses sending
   - Set up SNS notifications for bounces/complaints

4. **Implement email validation before sending:**

   ```typescript
   const disposableEmailDomains = ["tempmail.com", "10minutemail.com"];

   function isValidEmail(email: string) {
     const domain = email.split("@")[1];
     return !disposableEmailDomains.includes(domain);
   }
   ```

5. **Volume ramping for reputation:**
   - Don't jump from 50K to 500K emails/day overnight
   - Increase by 20-30% per week to build sender reputation
   - Start with 50,000 emails/day limit after sandbox exit

**Testing in Sandbox:**

- Use SES verified email as sender
- Send test emails to verified addresses only
- Test templates/formatting, NOT deliverability

**Warning Signs:**

- "Email address not verified" errors in production
- Sudden drop in email delivery rate
- AWS suspends account for high bounce rate

**Phase:** Phase 1 (Authentication) — request production access BEFORE building email features

**Sources:**

- [AWS SES Service Quotas](https://docs.aws.amazon.com/ses/latest/dg/quotas.html)
- [AWS SES Best Practices](https://blog.campaignhq.co/aws-ses-dos-and-donts/)
- [Increasing SES Sending Limits](https://elasticscale.com/blog/aws-ses-best-practices-increase-sending-limits-improve-deliverability/)

---

### Gotcha 2: React-PDF Devanagari/Gujarati Font Rendering

**What:**

`@react-pdf/renderer` has **documented, unresolved issues** with Indic scripts:

- Hindi characters render as blank spaces
- Gujarati conjuncts display incorrectly
- Font loading fails silently in production builds
- Custom font registration can cause usePDF to hang indefinitely

**Why it happens:**

- React-PDF uses custom font rendering (not browser engine)
- Complex text layout (CTL) for Devanagari/Gujarati not fully supported
- Noto Sans Devanagari works in browser but fails in PDF generation
- Bidirectional text support introduced rendering bugs for complex scripts

**Consequences:**

- Board reports for Hindi/Marathi/Gujarati banks are illegible
- Manual workaround: generate in English, translate offline (defeats purpose)
- Customer complaint: "Why can't I generate reports in my language?"

**Prevention:**

**Test Early (Phase 1):**

```typescript
// tests/pdf-fonts.test.ts
import { Document, Page, Text, Font } from '@react-pdf/renderer';

Font.register({
  family: 'Noto Sans Devanagari',
  src: '/fonts/NotoSansDevanagari-Regular.ttf',
});

test('Hindi text renders in PDF', async () => {
  const doc = (
    <Document>
      <Page>
        <Text style={{ fontFamily: 'Noto Sans Devanagari' }}>
          यह एक परीक्षण है
        </Text>
      </Page>
    </Document>
  );

  const pdfBytes = await renderToBuffer(doc);
  // Manual inspection: Open PDF, verify Hindi text visible
});
```

**Workarounds:**

1. **Fallback to English for MVP:**
   - Generate PDFs in English only
   - Provide UI in all languages, but reports in English
   - Document as known limitation

2. **Alternative: HTML → PDF with Puppeteer:**

   ```typescript
   // More reliable for complex scripts but requires headless Chrome
   import puppeteer from "puppeteer";

   export async function generatePDF(html: string) {
     const browser = await puppeteer.launch();
     const page = await browser.newPage();
     await page.setContent(html);
     const pdf = await page.pdf({ format: "A4" });
     await browser.close();
     return pdf;
   }
   ```

   - ⚠️ Higher resource usage (Chromium ~300MB RAM per instance)
   - ⚠️ Deployment complexity on VPS (install Chrome dependencies)

3. **Wait for library fix:**
   - Track https://github.com/diegomura/react-pdf/issues/454
   - Consider contributing fix or sponsoring maintainer

**Warning Signs:**

- PDF previews show blank spaces where Indic text should be
- Font registration hangs in production
- Different rendering between dev and production

**Phase:** Phase 3 (Reports) — validate font rendering BEFORE implementing board report feature

**Sources:**

- [Devanagari fonts not properly rendered](https://github.com/diegomura/react-pdf/issues/454)
- [Non-Latin Hindi Unicode Characters Not Rendering](https://github.com/diegomura/react-pdf/issues/856)
- [Arabic characters not working since bidi support](https://github.com/diegomura/react-pdf/issues/2638)
- [React-PDF Fonts Documentation](https://react-pdf.org/fonts)

---

### Gotcha 3: Prisma Connection Pool Exhaustion on Budget VPS

**What:**

AWS Lightsail 2GB VPS (~$29/month) with PostgreSQL:

- Default Prisma pool: 10 connections
- PostgreSQL default: 100 max connections
- 10 concurrent Next.js SSR requests → pool exhausted → `Error: Prepared statement "foobar" already exists`

**Why it happens:**

1. Each Next.js request holds Prisma connection for duration of SSR
2. Slow queries (reports, dashboard aggregations) hold connections longer
3. Dev mode hot reload creates new Prisma instances (leaks connections)
4. PgBouncer adds overhead on small VPS

**Consequences:**

- API requests fail with connection errors during load spikes
- Dashboard times out (waiting for connection)
- Can't scale past ~10 concurrent users

**Prevention:**

**Optimize Connection Pool:**

```typescript
// lib/prisma.ts
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Single instance pattern for Next.js
});

// In production, set:
// DATABASE_URL="postgresql://user:pass@localhost:5432/aegis?connection_limit=5&pool_timeout=10"
```

**PgBouncer Configuration:**

```ini
# /etc/pgbouncer/pgbouncer.ini
[databases]
aegis = host=localhost port=5432 dbname=aegis

[pgbouncer]
pool_mode = transaction  # ⚠️ NOT session (RLS requires session variables)
max_client_conn = 100
default_pool_size = 20
reserve_pool_size = 5
```

**⚠️ RLS Compatibility:**

- PgBouncer `transaction` mode BREAKS RLS (session variables reset between queries)
- MUST use `session` mode → fewer connections available
- Alternative: Use Supavisor (RLS-aware pooler) or connection-per-request (slower)

**Query Optimization:**

```typescript
// ❌ N+1 query in dashboard
const findings = await prisma.finding.findMany();
for (const finding of findings) {
  finding.auditee = await prisma.user.findUnique({
    where: { id: finding.auditeeId },
  });
}

// ✅ Single query with include
const findings = await prisma.finding.findMany({
  include: { auditee: true },
});
```

**Warning Signs:**

- "Prepared statement already exists" errors
- Connection timeout errors during traffic spikes
- Progressive slowdown over time in development

**Phase:** Phase 2 (Infrastructure) — before scaling to 10+ users

**Sources:**

- [PostgreSQL connection limit issue on AWS RDS](https://repost.aws/questions/QUmk4QIjQVTU-g-fV8WtoxhA/postgresql-connection-limit-issue-on-aws-rds)
- [Multi-tenant RLS with connection pooling](https://www.permit.io/blog/implementing-fine-grained-postgres-permissions-for-multi-tenant-applications)

---

## Performance Traps

### Trap 1: Excel Export Memory Overflow

**What:**

Exporting compliance registry (500+ requirements across 12 months) to Excel crashes Node.js:

```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Why it happens:**

1. ExcelJS builds entire workbook in memory before writing
2. Each cell with formatting = ~500 bytes
3. 500 rows × 20 columns × 500 bytes = 5MB → with overhead, ~50MB per export
4. 10 concurrent exports = 500MB (exceeds VPS memory)

**Prevention:**

**Streaming Approach:**

```typescript
import { Workbook } from "exceljs";
import { Readable } from "stream";

export async function streamComplianceExport(tenantId: string) {
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet("Compliance Registry");

  // Header row
  worksheet.columns = [
    { header: "Requirement", key: "requirement", width: 50 },
    { header: "Status", key: "status", width: 15 },
    // ...
  ];

  // Stream rows (don't load all into memory)
  const requirements = await prisma.complianceRequirement.findMany({
    where: { tenantId },
    select: { id: true, requirement: true, status: true }, // Only needed fields
  });

  // Process in batches
  for (let i = 0; i < requirements.length; i += 100) {
    const batch = requirements.slice(i, i + 100);
    batch.forEach((req) => worksheet.addRow(req));

    // Allow GC between batches
    if (i % 500 === 0) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  }

  // Write to stream (not buffer)
  const stream = new Readable();
  stream._read = () => {};

  workbook.xlsx.write(stream).then(() => stream.push(null));

  return stream;
}
```

**Response Streaming:**

```typescript
// app/api/export/compliance/route.ts
export async function GET(request: Request) {
  const tenantId = await getTenantId();
  const stream = await streamComplianceExport(tenantId);

  return new Response(stream as any, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="compliance-export.xlsx"',
    },
  });
}
```

**Best Practices:**

- For 10MB+ files, always use streaming
- Always call `.commit()` when writing
- Disable features you don't use (reduces memory footprint)
- For 10,000+ rows, stream with batch processing

**Warning Signs:**

- Heap out of memory errors during export
- Export takes >30 seconds
- Server becomes unresponsive during large exports

**Phase:** Phase 4 (Excel Export) — implement streaming from start

**Sources:**

- [ExcelJS failure on large datasets](https://github.com/exceljs/exceljs/issues/709)
- [Process huge excel files using streams](https://riddheshganatra.medium.com/process-huge-excel-file-in-node-js-using-streams-67d55f19d038)
- [How to Read Excel Files as Stream in ExcelJS 2026](https://copyprogramming.com/howto/stream-huge-excel-file-using-exceljs-in-node)
- [SheetJS Large Datasets](https://docs.sheetjs.com/docs/demos/bigdata/stream/)

---

### Trap 2: Dashboard Widget N+1 Queries

**What:**

Current prototype: Dashboard loads 6 widgets, each imports JSON directly (1 file read each). With Prisma:

```typescript
// ❌ 6 separate database queries
export default async function DashboardPage() {
  return (
    <>
      <HealthScoreCard />        {/* Query 1: SELECT FROM audits */}
      <AuditCoverageChart />     {/* Query 2: SELECT FROM audits */}
      <FindingsCountCards />     {/* Query 3: SELECT FROM findings */}
      <RiskIndicatorPanel />     {/* Query 4: SELECT FROM findings + audits */}
      <RegulatoryCalendar />     {/* Query 5: SELECT FROM compliance_requirements */}
      <QuickActions />           {/* Query 6: (no query, static) */}
    </>
  );
}
```

**Why it happens:**

- Each widget fetches own data in isolation
- Next.js automatic deduplication doesn't work (different `findMany` args)
- Widgets don't share aggregations (e.g., both need `COUNT(findings)`)

**Consequences:**

- Dashboard load time: 6 × 50ms = 300ms (vs. single query: 80ms)
- Database load: 6 concurrent queries instead of 1
- Connection pool pressure (each query holds connection)

**Prevention:**

**Single Data Fetch:**

```typescript
// lib/data/dashboard.ts
export async function getDashboardData(tenantId: string) {
  const [audits, findings, complianceReqs] = await Promise.all([
    prisma.audit.findMany({
      where: { tenantId },
      select: { id: true, status: true, completionDate: true },
    }),
    prisma.finding.findMany({
      where: { tenantId },
      select: { id: true, severity: true, status: true, targetDate: true },
    }),
    prisma.complianceRequirement.findMany({
      where: { tenantId },
      select: { id: true, status: true, nextReviewDate: true },
    }),
  ]);

  // Compute all aggregations once
  return {
    healthScore: calculateHealthScore(audits, findings, complianceReqs),
    auditCoverage: calculateAuditCoverage(audits),
    findingsCounts: {
      total: findings.length,
      critical: findings.filter(f => f.severity === 'critical').length,
      open: findings.filter(f => f.status !== 'closed').length,
      overdue: findings.filter(f => f.targetDate < new Date() && f.status !== 'closed').length,
    },
    riskIndicators: calculateRiskIndicators(findings, audits),
    upcomingDeadlines: complianceReqs.filter(r => isUpcoming(r.nextReviewDate)),
  };
}

// app/(dashboard)/dashboard/page.tsx
export default async function DashboardPage() {
  const data = await getDashboardData(await getTenantId());

  return (
    <>
      <HealthScoreCard score={data.healthScore} />
      <AuditCoverageChart coverage={data.auditCoverage} />
      <FindingsCountCards counts={data.findingsCounts} />
      <RiskIndicatorPanel indicators={data.riskIndicators} />
      <RegulatoryCalendar deadlines={data.upcomingDeadlines} />
    </>
  );
}
```

**Caching Layer (Optional):**

```typescript
import { unstable_cache } from "next/cache";

export const getCachedDashboardData = unstable_cache(
  async (tenantId: string) => getDashboardData(tenantId),
  ["dashboard-data"],
  { revalidate: 300 }, // 5-minute cache
);
```

**Phase:** Phase 1 (Data Layer Migration) — establish pattern before scaling features

---

## Security Mistakes

### Mistake 1: Audit Trail Missing Tenant Scoping

**What:**

Audit log records changes but doesn't scope by tenant:

```sql
-- ❌ Missing tenant_id in audit_log table
CREATE TABLE audit_log (
  id UUID PRIMARY KEY,
  table_name TEXT,
  record_id UUID,
  action TEXT,
  changed_by UUID,
  changed_at TIMESTAMP,
  old_value JSONB,
  new_value JSONB
);

-- Trigger function
CREATE TRIGGER audit_trigger
  AFTER UPDATE ON observations
  FOR EACH ROW EXECUTE FUNCTION log_changes();
```

**Why it fails:**

1. Superadmin viewing audit logs sees ALL tenants' data
2. Cross-tenant compliance report includes other UCBs' audit trails
3. RBI audit: "Show me all changes to observation XYZ" → leaks other banks' data

**Prevention:**

**Tenant-Scoped Audit Log:**

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,  -- INSERT, UPDATE, DELETE
  changed_by UUID NOT NULL REFERENCES users(id),
  changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  old_value JSONB,
  new_value JSONB
);

-- Tenant scoping for audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_tenant_isolation ON audit_log
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- Trigger function with tenant context
CREATE OR REPLACE FUNCTION log_changes() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (tenant_id, table_name, record_id, action, changed_by, old_value, new_value)
  VALUES (
    COALESCE(NEW.tenant_id, OLD.tenant_id),  -- Get tenant from record
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    current_setting('app.current_user_id', TRUE)::uuid,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Immutability Enforcement:**

```sql
-- Prevent modification/deletion of audit logs
CREATE POLICY audit_log_immutable ON audit_log
  FOR UPDATE
  USING (FALSE);

CREATE POLICY audit_log_no_delete ON audit_log
  FOR DELETE
  USING (FALSE);
```

**Warning Signs:**

- Audit logs from multiple tenants visible to one user
- Audit trail can be modified or deleted
- Triggers don't capture tenant context

**Phase:** Phase 2 (Multi-Tenancy Infrastructure) — implement with RLS

**Sources:**

- [PostgreSQL Audit Logging Best Practices](https://severalnines.com/blog/postgresql-audit-logging-best-practices/)
- [Row change auditing options](https://www.cybertec-postgresql.com/en/row-change-auditing-options-for-postgresql/)
- [Postgres Audit Logging Guide](https://www.bytebase.com/blog/postgres-audit-logging/)

---

### Mistake 2: SECURITY DEFINER Functions Bypass RLS

**What:**

Audit trigger runs with SECURITY DEFINER (table owner privileges), which bypasses RLS:

```sql
CREATE FUNCTION log_changes() RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER  -- ⚠️ Runs as table owner, bypasses RLS
AS $$
BEGIN
  -- This INSERT bypasses RLS policies!
  INSERT INTO audit_log (...) VALUES (...);
END;
$$;
```

**Why dangerous:**

- Trigger can insert audit logs for ANY tenant (ignores RLS)
- Malicious user exploits this to inject fake audit entries
- Compliance violation: audit trail not trustworthy

**Prevention:**

**Restrict Search Path:**

```sql
CREATE FUNCTION log_changes() RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public  -- ⚠️ Prevent schema injection
AS $$
BEGIN
  -- Function body
END;
$$;
```

**Principle of Least Privilege:**

```sql
-- Create dedicated audit role
CREATE ROLE audit_writer;
GRANT INSERT ON audit_log TO audit_writer;
REVOKE ALL ON audit_log FROM PUBLIC;

-- Function runs as audit_writer (not superuser)
ALTER FUNCTION log_changes() OWNER TO audit_writer;
```

**Testing:**

```sql
-- Test RLS enforcement in trigger
SET app.current_tenant_id = 'tenant-a';
UPDATE observations SET status = 'final' WHERE id = 'obs-1';

-- Verify audit log has correct tenant_id
SELECT tenant_id FROM audit_log WHERE record_id = 'obs-1';
-- Should return 'tenant-a', NOT bypass RLS
```

**Warning Signs:**

- Audit logs created with wrong tenant_id
- RLS policies don't apply to audit_log inserts
- Function owner is superuser or table owner

**Phase:** Phase 2 (Multi-Tenancy Infrastructure)

**Sources:**

- [PostgreSQL Triggers in 2026](https://thelinuxcode.com/postgresql-triggers-in-2026-design-performance-and-production-reality/)
- [RLS bypass through SECURITY DEFINER](https://www.bytebase.com/blog/postgres-row-level-security-footguns/)
- [How to Implement RLS in PostgreSQL](https://oneuptime.com/blog/post/2026-01-21-postgresql-row-level-security/view)

---

## UX Pitfalls

### Pitfall 1: RLS Query Performance Degradation

**What:**

RLS policies add `WHERE tenant_id = 'xxx'` to every query, but indexes may not exist:

```sql
-- RLS policy adds filter
SELECT * FROM observations WHERE tenant_id = 'tenant-a';

-- Without index, full table scan (slow)
EXPLAIN ANALYZE;
-- Seq Scan on observations (cost=0.00..5432.00 rows=1000)
--   Filter: (tenant_id = 'tenant-a')
```

**Why it happens:**

- Prisma auto-migration doesn't add indexes for RLS columns
- Developer forgets to index `tenant_id` on large tables
- Query planner doesn't optimize RLS filters well

**Consequences:**

- Dashboard loads in 5 seconds instead of 500ms
- Finding search times out with "Statement timeout" error
- Users complain: "It was faster in the demo!"

**Prevention:**

**Index All Tenant Foreign Keys:**

```sql
-- migrations/add_tenant_indexes.sql
CREATE INDEX idx_observations_tenant_id ON observations(tenant_id);
CREATE INDEX idx_findings_tenant_id ON findings(tenant_id);
CREATE INDEX idx_audits_tenant_id ON audits(tenant_id);
CREATE INDEX idx_compliance_requirements_tenant_id ON compliance_requirements(tenant_id);
CREATE INDEX idx_evidence_files_tenant_id ON evidence_files(tenant_id);

-- Composite indexes for common queries
CREATE INDEX idx_observations_tenant_status ON observations(tenant_id, status);
CREATE INDEX idx_findings_tenant_severity ON findings(tenant_id, severity);
```

**Query Monitoring:**

```typescript
// lib/prisma.ts
const prisma = new PrismaClient({
  log: [{ emit: "event", level: "query" }],
});

prisma.$on("query", (e) => {
  if (e.duration > 1000) {
    // Log slow queries (>1s)
    console.warn("Slow query detected:", e.query, `Duration: ${e.duration}ms`);
  }
});
```

**Phase:** Phase 2 (Multi-Tenancy Infrastructure) — add indexes before load testing

---

### Pitfall 2: Next.js Server Action Error Handling

**What:**

Server actions throw errors that aren't caught on client:

```typescript
// actions/observation.ts
"use server";

export async function updateObservation(id: string, data: any) {
  // ❌ Error not serialized properly
  const result = await prisma.observation.update({ where: { id }, data });
  return result; // Works

  // If error thrown:
  throw new Error("Invalid state transition"); // ❌ Generic error on client
}

// Client component
async function handleSubmit() {
  try {
    await updateObservation(id, data);
  } catch (error) {
    // error.message is lost! Shows: "An error occurred"
  }
}
```

**Why it happens:**

- Server actions serialize errors as generic messages (security)
- Stack traces not sent to client (GOOD for security, BAD for debugging)
- Prisma errors (FK violations, unique constraints) show as "Database error"

**Prevention:**

**Structured Error Returns:**

```typescript
// lib/errors.ts
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

// actions/observation.ts
export async function updateObservation(
  id: string,
  data: UpdateData,
): Promise<ActionResult<Observation>> {
  try {
    const result = await prisma.observation.update({ where: { id }, data });
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return {
          success: false,
          error: "Observation not found",
          code: "NOT_FOUND",
        };
      }
    }

    if (error instanceof InvalidTransitionError) {
      return {
        success: false,
        error: error.message,
        code: "INVALID_TRANSITION",
      };
    }

    // Log full error server-side
    console.error("Observation update failed:", error);
    return { success: false, error: "Update failed", code: "UNKNOWN" };
  }
}

// Client component
async function handleSubmit() {
  const result = await updateObservation(id, data);

  if (!result.success) {
    toast.error(result.error); // User-friendly message
    return;
  }

  toast.success("Observation updated");
}
```

**Phase:** Phase 3 (Observation Workflow) — establish pattern before building forms

---

## Docker Deployment Pitfalls

### Pitfall 1: Zero-Downtime Deployment Without Health Checks

**What:**

Deploying new Docker containers without health checks causes downtime:

```dockerfile
# ❌ No health check
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci --production
CMD ["npm", "start"]
```

**Why it fails:**

- Container starts before Next.js server is ready
- Load balancer routes traffic to unhealthy container
- Users see connection errors during deployment

**Prevention:**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci --production

# Health check every 30s
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node healthcheck.js

CMD ["npm", "start"]
```

```javascript
// healthcheck.js
const http = require("http");

const options = {
  host: "localhost",
  port: 3000,
  path: "/api/health",
  timeout: 2000,
};

const req = http.request(options, (res) => {
  process.exit(res.statusCode === 200 ? 0 : 1);
});

req.on("error", () => process.exit(1));
req.end();
```

**Docker Compose:**

```yaml
services:
  web:
    image: aegis:latest
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 40s
    deploy:
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first # Start new container before stopping old
```

**Warning Signs:**

- Brief downtime during every deployment
- 502/503 errors immediately after deploy
- Containers marked healthy before app is ready

**Phase:** Phase 5 (Deployment) — configure before first production deploy

**Sources:**

- [Zero Downtime Deployments with Dokploy](https://docs.dokploy.com/docs/core/applications/zero-downtime)
- [Docker health checks best practices](https://blog.logrocket.com/zero-downtime-deploys-with-digitalocean-github-and-docker/)

---

## "Looks Done But Isn't" Checklist

Features that SEEM complete but have hidden gaps:

### Authentication

- [ ] Users can log in → ✅ Working
- [ ] Session persists across page refresh → ⚠️ Test in incognito
- [ ] Logout clears session cookie → ⚠️ Check browser DevTools
- [ ] Session expires after inactivity → ⚠️ Default: never expires
- [ ] Role-based route protection → ⚠️ Client-side only = insecure
- [ ] Concurrent sessions handled (user logs in on 2 devices) → ⚠️ Test
- [ ] Password reset email delivered → ⚠️ Only works in SES production

### Multi-Tenancy

- [ ] Users see only their tenant's data → ✅ RLS policy works
- [ ] RLS tested with superuser account → ❌ Superuser bypasses RLS!
- [ ] RLS tested with concurrent requests to different tenants → ⚠️ Pool contamination
- [ ] Tenant deletion cascades to all records → ⚠️ Check orphaned data
- [ ] File uploads scoped by tenant → ⚠️ S3 path validation
- [ ] Audit logs scoped by tenant → ⚠️ Missing `tenant_id` column?
- [ ] Background jobs (email queue) respect tenant context → ⚠️ Easy to miss

### Observation Workflow

- [ ] Status transitions work in UI → ✅ Dropdown changes
- [ ] Invalid transitions blocked → ⚠️ Only client-side validation?
- [ ] Role permissions enforced → ⚠️ API route checks role?
- [ ] Concurrent updates handled → ❌ Race condition not tested
- [ ] State machine tested with ALL role × status combinations → ⚠️ 6 statuses × 5 roles = 30 tests
- [ ] Audit trail records state changes → ⚠️ Trigger installed?
- [ ] Email notifications sent on status change → ⚠️ Queue configured?

### File Upload

- [ ] Files upload successfully → ✅ S3 presigned URL works
- [ ] File size limit enforced → ⚠️ Client-side only = bypassable
- [ ] File type validated → ⚠️ Extension check or MIME type?
- [ ] Malicious files blocked (executable disguised as PDF) → ❌ No magic number validation
- [ ] Path traversal prevented → ⚠️ User input in S3 key?
- [ ] Files deleted when parent record deleted → ⚠️ Orphaned S3 objects?
- [ ] Tenant isolation enforced → ⚠️ Can user access other tenant's files via URL manipulation?

### Email Notifications

- [ ] Test email sends successfully → ✅ Works in sandbox
- [ ] Production SES approved → ⚠️ Still in sandbox = 200/day limit
- [ ] Email template renders correctly → ⚠️ Test with long text, special chars
- [ ] Unsubscribe link works → ❌ Not implemented yet
- [ ] Bounce handling configured → ❌ SNS topic not set up
- [ ] Rate limiting prevents spam → ❌ User can trigger 100 emails
- [ ] Email queue prevents blocking requests → ⚠️ Synchronous sending?

### Reports

- [ ] PDF generates in English → ✅ Works
- [ ] PDF generates in Hindi → ❌ Blank spaces (font issue)
- [ ] PDF with 100+ pages → ⚠️ Memory overflow not tested
- [ ] PDF includes images → ⚠️ S3 presigned URLs expire before render?
- [ ] Excel export with 10,000 rows → ❌ Heap out of memory
- [ ] Report generation doesn't block UI → ⚠️ Background job?

### Performance

- [ ] Dashboard loads in <1s → ✅ Works with demo data
- [ ] Dashboard loads in <1s with 1000 findings → ⚠️ Not tested
- [ ] Connection pool doesn't exhaust → ⚠️ Test with 20 concurrent users
- [ ] No N+1 queries → ⚠️ Check Prisma query logs
- [ ] Database indexes on foreign keys → ⚠️ `tenant_id` indexed?
- [ ] Long queries don't block short ones → ⚠️ Read replica needed?

---

## Recovery Strategies

### If Data Leakage Detected (RLS Failure)

**Immediate (within 1 hour):**

1. **Contain breach:**
   - Disable affected tenant accounts (prevent further access)
   - Clear PostgreSQL connection pool (`SELECT pg_terminate_backend(pid) FROM pg_stat_activity`)
   - Deploy hotfix with transaction-scoped RLS

2. **Assess damage:**
   - Query audit logs for cross-tenant access:
     ```sql
     SELECT * FROM audit_log
     WHERE tenant_id != current_setting('app.current_tenant_id')
     AND changed_at > NOW() - INTERVAL '24 hours';
     ```
   - Identify affected users/records

3. **Notify stakeholders:**
   - Internal: Escalate to CEO, legal
   - External: Prepare notification to affected UCBs

**Short-term (within 24 hours):**

1. **Implement fix:**
   - Deploy transaction-scoped RLS across all data access
   - Add explicit `WHERE tenant_id` filters (defense-in-depth)
   - Enable mismatch detection logging

2. **Forensic analysis:**
   - Export audit logs for investigation
   - Identify root cause (pool contamination, missing policy, etc.)
   - Document timeline of breach

3. **Customer notification:**
   - Email affected UCBs (mandatory under GDPR/DPDP Act)
   - Explain: what data, when accessed, by whom, mitigation steps

**Long-term (within 1 week):**

1. **Prevent recurrence:**
   - Add integration tests for RLS (all models)
   - Implement tenant mismatch monitoring
   - Security audit by third party

2. **Regulatory compliance:**
   - Report to RBI if material breach
   - Document in incident log
   - Update security controls documentation

---

### If State Machine Bypassed (Invalid Transition)

**Immediate:**

1. **Identify affected observations:**

   ```sql
   -- Find observations with invalid status history
   SELECT o.id, o.tenant_id, o.status,
          lag(o.status) OVER (PARTITION BY o.id ORDER BY al.changed_at) AS prev_status
   FROM observations o
   JOIN audit_log al ON al.record_id = o.id
   WHERE NOT is_valid_transition(prev_status, o.status);
   ```

2. **Freeze observation workflow:**
   - Temporarily disable status updates (API route returns 503)
   - Notify users: "Workflow temporarily unavailable for maintenance"

3. **Manual correction:**
   - CAE reviews each invalid observation
   - Rollback to valid state or approve exception

**Short-term:**

1. **Deploy database state machine function**
2. **Re-test all transitions** (30-test matrix)
3. **Re-enable workflow with database enforcement**

**Long-term:**

1. Add state machine tests to CI/CD
2. Audit trail analysis for compliance report
3. Document as lesson learned

---

### If S3 Presigned URL Exploited

**Immediate:**

1. **Revoke access:**
   - Rotate S3 IAM credentials (invalidates all presigned URLs)
   - Review S3 access logs for unauthorized activity

2. **Identify leaked files:**

   ```bash
   aws s3api list-objects-v2 --bucket aegis-evidence \
     --query "Contents[?Key !~ 'tenants/']" --output json
   ```

3. **Quarantine affected bucket:**
   - Enable versioning (if not already)
   - Lock bucket policy (prevent further uploads)

**Short-term:**

1. Deploy path validation (UUID-based keys)
2. Re-upload legitimate files with new keys
3. Notify affected tenants if sensitive files accessed

---

## Pitfall-to-Phase Mapping

| Pitfall                            | Phase   | Priority | Why This Phase                            |
| ---------------------------------- | ------- | -------- | ----------------------------------------- |
| "use client" Data Import Trap      | Phase 1 | Critical | Blocks all data layer work                |
| RLS Connection Pool Contamination  | Phase 2 | Critical | Must be in place before real data         |
| Better Auth + next-intl Conflict   | Phase 1 | High     | Breaks auth or i18n                       |
| State Machine Invalid Transitions  | Phase 3 | Critical | Core workflow logic                       |
| S3 Presigned URL Path Traversal    | Phase 4 | High     | Security before file upload feature       |
| Tenant Scoping Inconsistency       | Phase 2 | Medium   | Caught during schema review               |
| Cascading Deletes Missing          | Phase 2 | Medium   | Prevents tenant deletion                  |
| Email in Request Path              | Phase 4 | Medium   | Performance/UX issue                      |
| SES Sandbox Limits                 | Phase 1 | High     | Request access early (2-3 week lead time) |
| React-PDF Font Rendering           | Phase 3 | High     | Test before building report feature       |
| Connection Pool Exhaustion         | Phase 2 | Medium   | Before scaling to 10+ users               |
| Excel Export Memory Overflow       | Phase 4 | Medium   | Implement streaming from start            |
| Dashboard N+1 Queries              | Phase 1 | Medium   | Establish pattern early                   |
| Audit Trail Missing Tenant Scoping | Phase 2 | Critical | Security/compliance requirement           |
| SECURITY DEFINER Bypass            | Phase 2 | Critical | RLS enforcement                           |
| RLS Query Performance              | Phase 2 | Medium   | Add indexes before load testing           |
| Server Action Error Handling       | Phase 3 | Medium   | UX pattern for forms                      |

**Phase Definitions:**

- **Phase 1:** Authentication & Data Layer (Prisma, Better Auth, data fetching patterns)
- **Phase 2:** Multi-Tenancy Infrastructure (RLS, tenant isolation, audit trail, indexes)
- **Phase 3:** Observation Workflow (state machine, permissions, lifecycle management)
- **Phase 4:** Advanced Features (file upload, email, reports, Excel export)
- **Phase 5:** Deployment & Monitoring (Docker, health checks, logging)

---

## Sources

### Official Documentation

- [Prisma Next.js Help](https://www.prisma.io/docs/orm/more/help-and-troubleshooting/nextjs-help)
- [Prisma Deployment Docs](https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate)
- [Better Auth Next.js Integration](https://www.better-auth.com/docs/integrations/next)
- [Next.js 16 App Router Migration](https://learnwebcraft.com/blog/next-js-16-migration-guide)
- [Next.js Server Components Security](https://nextjs.org/blog/security-nextjs-server-components-actions)
- [next-intl Server/Client Components](https://next-intl.dev/docs/environments/server-client-components)
- [AWS SES Service Quotas](https://docs.aws.amazon.com/ses/latest/dg/quotas.html)
- [React-PDF Fonts](https://react-pdf.org/fonts)

### 2026 Research

- [Next.js 16 Migration Guide](https://learnwebcraft.com/blog/next-js-16-migration-guide)
- [Multi-Tenant Leakage: When RLS Fails](https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c)
- [Better Auth Next.js Complete Guide](https://medium.com/@amitupadhyay878/better-auth-with-next-js-a-complete-guide-for-modern-authentication-06eec09d6a64)
- [PostgreSQL Triggers in 2026](https://thelinuxcode.com/postgresql-triggers-in-2026-design-performance-and-production-reality/)
- [How to Implement RLS in PostgreSQL](https://oneuptime.com/blog/post/2026-01-21-postgresql-row-level-security/view)
- [S3 Presigned URL Security Vulnerabilities](https://medium.com/@dienbase/understanding-and-preventing-security-vulnerabilities-in-aws-s3-pre-signed-urls-0378cbf3f99f)
- [ExcelJS Streaming for Large Datasets](https://riddheshganatra.medium.com/process-huge-excel-file-in-node-js-using-streams-67d55f19d038)
- [Zero Downtime Docker Deployments](https://docs.dokploy.com/docs/core/applications/zero-downtime)

### Community Sources

- [Prisma PostgreSQL RLS](https://medium.com/@francolabuschagne90/securing-multi-tenant-applications-using-row-level-security-in-postgresql-with-prisma-orm-4237f4d4bd35)
- [Common Postgres RLS Footguns](https://www.bytebase.com/blog/postgres-row-level-security-footguns/)
- [PostgreSQL Audit Logging Best Practices](https://severalnines.com/blog/postgresql-audit-logging-best-practices/)
- [Implementing State Machines in PostgreSQL](https://felixge.de/2017/07/27/implementing-state-machines-in-postgresql/)
- [Winning Race Conditions With PostgreSQL](https://dev.to/mistval/winning-race-conditions-with-postgresql-54gn)
