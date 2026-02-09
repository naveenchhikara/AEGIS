# Architecture Patterns: AEGIS v2.0 Backend Integration

**Project:** AEGIS UCB Internal Audit Platform
**Domain:** Multi-tenant SaaS backend integration
**Researched:** February 8, 2026
**Confidence:** HIGH (patterns verified against Next.js 16, Prisma 7, Better Auth official docs)

---

## Executive Summary

v2.0 replaces the clickable prototype's JSON data layer with a real PostgreSQL backend while preserving the existing 47 components and 13 routes. The integration strategy follows Next.js 16 App Router best practices: Data Access Layer (DAL) with `'use server'` functions replaces direct `@/data` imports, client components receive data as props from server component parents, and Server Actions handle mutations.

**Key architectural decisions:**

1. **Data Access Layer (DAL)** — Centralized `src/data-access/` with `'server-only'` directive replacing `src/data/` JSON imports
2. **PostgreSQL RLS** — Prisma Client Extensions with transaction-scoped `set_config()` for tenant isolation
3. **Better Auth** — Next.js 16 proxy (not middleware) with per-page session validation
4. **Server Actions** — Dedicated action files for mutations, imported into components
5. **S3 Presigned URLs** — Two-phase upload (server action generates URL, client uploads directly)
6. **Plain TypeScript State Machine** — 10-state observation workflow without XState dependency
7. **Docker Compose** — Single-VPS deployment with Next.js standalone output + PostgreSQL
8. **PostgreSQL Triggers** — Append-only audit trail with jsonb row storage

**Migration approach:** Incremental page-by-page migration starting with authentication, then dashboard (read-only aggregations), then observation CRUD (full workflow). Existing components require minimal changes — primarily prop type updates and lifting data fetching to parent server components.

---

## System Overview

### Current Architecture (v1.0)

```
Next.js 16 App Router (Turbopack)
├── Route Groups
│   ├── (auth) — login page
│   └── (dashboard) — 12 authenticated pages
├── Data Layer
│   └── src/data/index.ts — barrel export of JSON files
├── Components (47 files)
│   ├── Server components: 13 (pages + report sections)
│   └── Client components: 35 (interactive UI, charts, tables)
├── Client Components Import Pattern
│   └── import { findings } from '@/data' — CANNOT do async DB queries
└── Server Components Import Pattern
    └── import { findings } from '@/data' — CAN do async but still JSON
```

**Critical constraint:** 35 client components directly import from `@/data`. Client components cannot be async, therefore cannot directly query databases. This requires architectural refactoring, not just swapping data sources.

### Target Architecture (v2.0)

```
Next.js 16 App Router (Turbopack)
├── Route Groups (unchanged)
│   ├── (auth) — login + Better Auth API routes
│   └── (dashboard) — 12 pages (now with DB queries)
├── Data Access Layer (NEW)
│   ├── src/data-access/*.ts — Prisma queries with 'server-only'
│   ├── Session validation at every data access point
│   └── Prisma Client Extension for RLS (tenant context)
├── Server Actions (NEW)
│   ├── src/actions/*.ts — Mutations with 'use server'
│   └── Imported by both server and client components
├── Components (47 files + new)
│   ├── Server components: 13 → 20 (pages + data-fetching wrappers)
│   └── Client components: 35 → 42 (same UI + new forms)
├── Client Components Pattern (CHANGED)
│   ├── Receive data as props from server component parents
│   └── Call server actions for mutations
├── Server Components Pattern (CHANGED)
│   ├── Import from src/data-access/ (not @/data)
│   ├── Validate session via Better Auth
│   └── Pass queried data to client children
└── PostgreSQL Database
    ├── Multi-tenant with RLS policies
    ├── Prisma ORM with Client Extensions
    └── Trigger-based audit trail
```

---

## Component Responsibilities

### New Components/Layers

| Component             | Responsibility                                            | Technology               | Confidence |
| --------------------- | --------------------------------------------------------- | ------------------------ | ---------- |
| **Data Access Layer** | Centralized database queries with tenant scoping          | Prisma + 'server-only'   | HIGH       |
| **Better Auth API**   | Authentication endpoints (/api/auth/[...all])             | Better Auth v1.x         | HIGH       |
| **Proxy**             | Optimistic session checks for route protection            | Next.js 16 proxy.ts      | HIGH       |
| **Server Actions**    | Mutation operations (observation state, uploads, profile) | Next.js Server Actions   | HIGH       |
| **S3 Upload Actions** | Generate presigned URLs for direct client uploads         | AWS SDK v3               | HIGH       |
| **Prisma Extension**  | Transaction-scoped tenant ID via set_config               | Prisma Client Extensions | HIGH       |
| **Audit Triggers**    | Automatic change logging to append-only table             | PostgreSQL PL/pgSQL      | MEDIUM     |
| **State Machine**     | Observation lifecycle validation                          | Plain TypeScript         | HIGH       |

### Modified Existing Components

| Component Type        | Count | Current Pattern                             | New Pattern                                     | Change Scope |
| --------------------- | ----- | ------------------------------------------- | ----------------------------------------------- | ------------ |
| **Page Components**   | 13    | Import from @/data                          | Import from src/data-access/ + validate session | Medium       |
| **Dashboard Widgets** | 8     | Import from @/data, calculate locally       | Receive aggregated data as props                | Low          |
| **Data Tables**       | 3     | Import from @/data, filter/sort client-side | Receive filtered data, maintain UI state only   | Low-Medium   |
| **Detail Pages**      | 2     | Import from @/data, find by ID              | Receive entity from parent server component     | Low          |
| **Form Components**   | 5     | Demo data only                              | Call server actions, handle pending states      | Medium       |

---

## Recommended Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx — Better Auth client, redirect after session
│   ├── (dashboard)/
│   │   ├── layout.tsx — Session check, redirect if unauthenticated
│   │   ├── dashboard/
│   │   │   └── page.tsx — SERVER: validate session, query DAL, pass to widgets
│   │   ├── compliance/
│   │   │   └── page.tsx — SERVER: validate session, query requirements, pass to table
│   │   ├── findings/
│   │   │   ├── page.tsx — SERVER: list with filters from searchParams
│   │   │   └── [id]/
│   │   │       └── page.tsx — SERVER: fetch single observation + timeline
│   │   └── (other routes similarly)
│   ├── api/
│   │   └── auth/
│   │       └── [...all]/
│   │           └── route.ts — Better Auth handler (GET, POST)
│   └── proxy.ts — Session cookie check for route protection
│
├── data-access/ (NEW)
│   ├── index.ts — Barrel export all DAL functions
│   ├── session.ts — 'server-only', Better Auth session validation helper
│   ├── prisma.ts — Prisma client with RLS extension
│   ├── observations.ts — 'server-only', CRUD for observations with tenant scope
│   ├── compliance.ts — 'server-only', compliance requirements queries
│   ├── audit-plans.ts — 'server-only', audit plan queries
│   ├── branches.ts — 'server-only', branch/unit queries
│   ├── staff.ts — 'server-only', user/staff queries
│   └── reports.ts — 'server-only', board report aggregations
│
├── actions/ (NEW)
│   ├── observations.ts — 'use server', observation lifecycle mutations
│   ├── compliance.ts — 'use server', compliance status updates
│   ├── uploads.ts — 'use server', S3 presigned URL generation
│   ├── profile.ts — 'use server', user profile updates
│   └── onboarding.ts — 'use server', tenant setup wizard
│
├── lib/
│   ├── auth.ts — Better Auth configuration
│   ├── state-machine.ts — Observation workflow state machine
│   ├── validation.ts — Zod schemas for forms and actions
│   └── (existing utils)
│
├── components/
│   ├── dashboard/
│   │   ├── health-score-card.tsx — CLIENT: receive { compliant, total } props
│   │   ├── findings-count-cards.tsx — CLIENT: receive summary props
│   │   └── (others similarly)
│   ├── compliance/
│   │   ├── compliance-table.tsx — CLIENT: receive requirements[] props
│   │   └── compliance-form.tsx — NEW CLIENT: call server actions
│   ├── findings/
│   │   ├── findings-table.tsx — CLIENT: receive findings[] props
│   │   ├── observation-form.tsx — NEW CLIENT: call server actions
│   │   └── evidence-upload.tsx — NEW CLIENT: S3 presigned upload
│   └── (existing 47 components modified)
│
├── types/
│   └── index.ts — Add Prisma-generated types, extend with domain types
│
└── data/ (DEPRECATED in v2.0)
    └── (Keep for migration reference, remove after v2.0 complete)
```

---

## Architectural Patterns

### Pattern 1: Data Access Layer with 'server-only'

**What:** Centralized database access functions that enforce authentication and tenant scoping at every query.

**Why:** Next.js 16 official guidance emphasizes validating authentication "at every data access point" rather than relying on middleware prop drilling. The `'server-only'` directive ensures DAL functions cannot accidentally be imported into client components.

**Implementation:**

```typescript
// src/data-access/observations.ts
import "server-only";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prismaForTenant } from "./prisma";

export async function getObservations(filters?: ObservationFilters) {
  // 1. Validate session at data access point
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  // 2. Get tenant-scoped Prisma client
  const prisma = await prismaForTenant(session.user.tenantId);

  // 3. Query with RLS automatically enforced
  return prisma.observation.findMany({
    where: {
      ...(filters?.severity && { severity: filters.severity }),
      ...(filters?.status && { status: filters.status }),
    },
    include: {
      assignedTo: { select: { name: true, email: true } },
      branch: { select: { name: true, code: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
```

**Benefits:**

- Session validation cannot be bypassed (enforced at query level)
- Tenant isolation guaranteed by RLS (even if app bug, DB blocks cross-tenant access)
- Type-safe query results (Prisma generates types)
- Centralized location for query optimization and caching

**Sources:**

- [Next.js App Router: Updating Data](https://nextjs.org/docs/app/getting-started/updating-data) — recommends DAL pattern with 'server-only'
- [Medium: Advanced Patterns for 2026](https://medium.com/@beenakumawat002/next-js-app-router-advanced-patterns-for-2026-server-actions-ppr-streaming-edge-first-b76b1b3dcac7) — emphasizes authentication at data access points

### Pattern 2: PostgreSQL RLS with Prisma Client Extensions

**What:** Row-Level Security policies in PostgreSQL enforced via transaction-scoped `set_config()` calls wrapped by Prisma Client Extensions.

**Why:** Multi-tenant data isolation enforced at database level. Even if application code has bugs (e.g., missing WHERE clause), RLS prevents cross-tenant data leaks. Superior to app-level filtering.

**Implementation:**

```typescript
// src/data-access/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalPrisma = new PrismaClient();

export async function prismaForTenant(tenantId: string) {
  return globalPrisma.$extends({
    query: {
      $allOperations: async ({ operation, model, args, query }) => {
        // Start transaction and set tenant context
        return globalPrisma.$transaction(async (tx) => {
          // Set LOCAL parameter (transaction-scoped only)
          await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, TRUE)`;

          // Execute query with RLS enforced
          return query(args);
        });
      },
    },
  });
}
```

**Database Setup:**

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_plans ENABLE ROW LEVEL SECURITY;

-- Create RLS policy referencing runtime parameter
CREATE POLICY tenant_isolation_policy ON observations
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- Repeat for all tenant-scoped tables
```

**Key Characteristics:**

- `set_config(..., TRUE)` — Third parameter TRUE makes setting LOCAL (transaction-scoped)
- Transaction wrapper ensures all queries use same connection with same setting
- Policies are transparent to application code (automatic filtering)
- Bypass option for admin queries: `CREATE POLICY bypass_rls_policy ... USING (current_setting('app.bypass_rls', TRUE)::text = 'on')`

**Sources:**

- [Prisma Client Extensions: Row-Level Security](https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security) — official example
- [Medium: Multi-Tenant RLS with Prisma](https://medium.com/@francolabuschagne90/securing-multi-tenant-applications-using-row-level-security-in-postgresql-with-prisma-orm-4237f4d4bd35)

### Pattern 3: Better Auth with Next.js 16 Proxy

**What:** Cookie-based authentication with Better Auth, using Next.js 16 `proxy.ts` (not middleware) for optimistic route protection and per-page session validation.

**Why:** Next.js 16 replaces `middleware.ts` with `proxy.ts`. Better Auth recommends optimistic cookie checks in proxy (fast) and full session validation on each protected page (secure).

**Implementation:**

```typescript
// app/proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  // Optimistic check: redirect if no session cookie
  if (!sessionCookie && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/compliance/:path*", "/findings/:path*"],
};
```

```typescript
// app/(dashboard)/dashboard/page.tsx
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  // Full session validation on page
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect('/login');
  }

  // Session valid, proceed with data fetching
  const data = await getDashboardData(session.user.tenantId);

  return <DashboardView data={data} />;
}
```

**API Routes:**

```typescript
// app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

**Session in Server Actions:**

```typescript
// src/actions/observations.ts
"use server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function updateObservationStatus(id: string, status: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  // Mutation logic
}
```

**Key Characteristics:**

- Proxy for fast optimistic checks (no DB call)
- Per-page validation for security (cannot be bypassed)
- Session available in Server Actions via `headers: await headers()`
- Cookie handling automatic via `nextCookies()` plugin

**Sources:**

- [Better Auth: Next.js Integration](https://www.better-auth.com/docs/integrations/next) — official Next.js 16 patterns
- [Medium: Better Auth Complete Guide](https://medium.com/@amitupadhyay878/better-auth-with-next-js-a-complete-guide-for-modern-authentication-06eec09d6a64)

### Pattern 4: Server Actions for Mutations

**What:** Dedicated action files with `'use server'` directive at file level, imported by both server and client components for mutations.

**Why:** Next.js 16 best practice: centralize business logic separate from UI. Server Actions use POST (non-cacheable), appropriate for mutations. Data fetching should use Server Components (cacheable GET).

**Implementation:**

```typescript
// src/actions/observations.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prismaForTenant } from "@/data-access/prisma";
import { validateTransition } from "@/lib/state-machine";

const updateStatusSchema = z.object({
  observationId: z.string().uuid(),
  newStatus: z.enum(["draft", "submitted", "reviewed", "responded", "closed"]),
  comment: z.string().optional(),
});

export async function updateObservationStatus(
  input: z.infer<typeof updateStatusSchema>,
) {
  // 1. Validate session
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  // 2. Validate input
  const parsed = updateStatusSchema.parse(input);

  // 3. Get tenant-scoped Prisma
  const prisma = await prismaForTenant(session.user.tenantId);

  // 4. Fetch current observation
  const observation = await prisma.observation.findUnique({
    where: { id: parsed.observationId },
  });
  if (!observation) throw new Error("Not found");

  // 5. Validate state transition
  const canTransition = validateTransition(
    observation.status,
    parsed.newStatus,
    session.user.role,
  );
  if (!canTransition) throw new Error("Invalid transition");

  // 6. Update with transaction (audit trail via trigger)
  await prisma.observation.update({
    where: { id: parsed.observationId },
    data: {
      status: parsed.newStatus,
      statusUpdatedAt: new Date(),
      statusUpdatedBy: session.user.id,
    },
  });

  // 7. Create timeline event
  await prisma.observationTimeline.create({
    data: {
      observationId: parsed.observationId,
      event: "status_changed",
      oldValue: observation.status,
      newValue: parsed.newStatus,
      comment: parsed.comment,
      createdBy: session.user.id,
    },
  });

  // 8. Revalidate affected pages
  revalidatePath("/findings");
  revalidatePath(`/findings/${parsed.observationId}`);

  return { success: true };
}
```

**Client Component Usage:**

```typescript
// src/components/findings/status-transition-form.tsx
'use client';

import { useActionState } from 'react';
import { updateObservationStatus } from '@/actions/observations';

export function StatusTransitionForm({ observationId, currentStatus }) {
  const [state, formAction, isPending] = useActionState(updateObservationStatus, null);

  return (
    <form action={formAction}>
      <input type="hidden" name="observationId" value={observationId} />
      <select name="newStatus">
        {/* Options based on currentStatus */}
      </select>
      <button type="submit" disabled={isPending}>
        {isPending ? 'Updating...' : 'Update Status'}
      </button>
      {state?.error && <p className="text-red-600">{state.error}</p>}
    </form>
  );
}
```

**Key Characteristics:**

- File-level `'use server'` (not inline in client components)
- Input validation with Zod before database operations
- Session validation at action entry point
- Cache revalidation with `revalidatePath()` after mutations
- Progressive enhancement (forms work without JS)

**Sources:**

- [Next.js: Updating Data](https://nextjs.org/docs/app/getting-started/updating-data) — official Server Actions patterns
- [MakerKit: Server Actions Complete Guide](https://makerkit.dev/blog/tutorials/nextjs-server-actions)

### Pattern 5: S3 Presigned URL Upload

**What:** Two-phase upload flow where server action generates time-limited presigned URL, then client uploads directly to S3 (bypassing application server).

**Why:** Faster uploads (direct to S3), reduced server load, no sensitive credentials exposed to client, works with large files.

**Implementation:**

```typescript
// src/actions/uploads.ts
"use server";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { nanoid } from "nanoid";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function generateUploadUrl(
  filename: string,
  fileType: string,
  observationId: string,
) {
  // 1. Validate session
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  // 2. Generate unique key (prevent overwrites, namespace by tenant)
  const fileExt = filename.split(".").pop();
  const key = `${session.user.tenantId}/observations/${observationId}/${nanoid()}.${fileExt}`;

  // 3. Create presigned URL (60 second expiry)
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
    ContentType: fileType,
  });

  const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

  // 4. Return presigned URL and final S3 URL
  return {
    uploadUrl: presignedUrl,
    fileUrl: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
  };
}
```

**Client Component:**

```typescript
// src/components/findings/evidence-upload.tsx
'use client';

import { useState } from 'react';
import { generateUploadUrl } from '@/actions/uploads';

export function EvidenceUpload({ observationId }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      // Phase 1: Get presigned URL from server action
      const { uploadUrl, fileUrl } = await generateUploadUrl(
        file.name,
        file.type,
        observationId
      );

      // Phase 2: Upload directly to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      // Phase 3: Record evidence in database (server action)
      await recordEvidence({
        observationId,
        filename: file.name,
        fileUrl,
        fileType: file.type,
        fileSize: file.size,
      });

      // Success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
```

**S3 CORS Configuration:**

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://yourdomain.com"],
      "AllowedMethods": ["PUT", "GET"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

**Key Characteristics:**

- Server generates presigned URL (credentials never exposed)
- Client uploads directly to S3 (fast, no server bottleneck)
- 60-second expiry (security: limited exposure window)
- File key includes tenant ID (prevents cross-tenant access)
- IAM policy: minimum permissions (PutObject only)

**Sources:**

- [Presigned URLs in Next.js](https://conermurphy.com/blog/presigned-urls-nextjs-s3-upload/)
- [Medium: AWS S3 Upload with Server Actions](https://medium.com/@christopher_28348/aws-s3-upload-with-next-js-server-actions-and-zod-validation-dd3a2410bba4)

### Pattern 6: Plain TypeScript State Machine

**What:** Simple state machine for observation workflow lifecycle using discriminated unions and guard functions, without external library.

**Why:** 10-state, 12-transition workflow is moderately complex but doesn't require XState's advanced features (hierarchical states, visual debugging). Plain TypeScript keeps bundle small and reduces dependencies.

**Implementation:**

```typescript
// src/lib/state-machine.ts

// State definitions
export type ObservationState =
  | "draft"
  | "submitted"
  | "audit_manager_review"
  | "cae_review"
  | "auditee_notified"
  | "auditee_response_pending"
  | "auditee_responded"
  | "compliance_pending"
  | "compliance_submitted"
  | "closed";

export type ObservationEvent =
  | "SUBMIT"
  | "APPROVE"
  | "REJECT"
  | "NOTIFY_AUDITEE"
  | "REQUEST_CLARIFICATION"
  | "SUBMIT_RESPONSE"
  | "SUBMIT_COMPLIANCE"
  | "VERIFY_COMPLIANCE"
  | "CLOSE";

export type UserRole = "auditor" | "audit_manager" | "cae" | "cco" | "auditee";

// Transition definition
interface Transition {
  from: ObservationState;
  to: ObservationState;
  event: ObservationEvent;
  roles: UserRole[];
  guard?: (context: ObservationContext) => boolean;
}

interface ObservationContext {
  severity: "low" | "medium" | "high" | "critical";
  isRepeat: boolean;
  daysOpen: number;
}

// Transition table
const transitions: Transition[] = [
  // Auditor submits observation
  {
    from: "draft",
    to: "submitted",
    event: "SUBMIT",
    roles: ["auditor"],
  },
  // Audit Manager reviews (low/medium) or escalates (high/critical) to CAE
  {
    from: "submitted",
    to: "audit_manager_review",
    event: "APPROVE",
    roles: ["audit_manager"],
    guard: (ctx) => ["low", "medium"].includes(ctx.severity),
  },
  {
    from: "submitted",
    to: "cae_review",
    event: "APPROVE",
    roles: ["audit_manager"],
    guard: (ctx) => ["high", "critical"].includes(ctx.severity),
  },
  // After approval, notify auditee
  {
    from: "audit_manager_review",
    to: "auditee_notified",
    event: "NOTIFY_AUDITEE",
    roles: ["audit_manager"],
  },
  {
    from: "cae_review",
    to: "auditee_notified",
    event: "NOTIFY_AUDITEE",
    roles: ["cae"],
  },
  // Auditee responds
  {
    from: "auditee_notified",
    to: "auditee_response_pending",
    event: "REQUEST_CLARIFICATION",
    roles: ["auditee"],
  },
  {
    from: "auditee_response_pending",
    to: "auditee_responded",
    event: "SUBMIT_RESPONSE",
    roles: ["auditee"],
  },
  // Compliance submission
  {
    from: "auditee_responded",
    to: "compliance_pending",
    event: "SUBMIT_COMPLIANCE",
    roles: ["auditee"],
  },
  // CCO verifies and closes
  {
    from: "compliance_pending",
    to: "compliance_submitted",
    event: "VERIFY_COMPLIANCE",
    roles: ["cco"],
  },
  {
    from: "compliance_submitted",
    to: "closed",
    event: "CLOSE",
    roles: ["cae", "cco"],
  },
  // Reject transitions (back to draft)
  {
    from: "submitted",
    to: "draft",
    event: "REJECT",
    roles: ["audit_manager", "cae"],
  },
];

// Validation function
export function validateTransition(
  currentState: ObservationState,
  event: ObservationEvent,
  userRole: UserRole,
  context?: ObservationContext,
): { valid: boolean; nextState?: ObservationState; error?: string } {
  const validTransitions = transitions.filter(
    (t) =>
      t.from === currentState &&
      t.event === event &&
      t.roles.includes(userRole),
  );

  if (validTransitions.length === 0) {
    return {
      valid: false,
      error: `Invalid transition: ${event} from ${currentState} for role ${userRole}`,
    };
  }

  // If multiple transitions, apply guards
  const applicableTransition = validTransitions.find((t) =>
    t.guard ? t.guard(context!) : true,
  );

  if (!applicableTransition) {
    return {
      valid: false,
      error: "Guard condition not met",
    };
  }

  return {
    valid: true,
    nextState: applicableTransition.to,
  };
}

// Get allowed transitions for UI
export function getAllowedTransitions(
  currentState: ObservationState,
  userRole: UserRole,
  context?: ObservationContext,
): Array<{
  event: ObservationEvent;
  nextState: ObservationState;
  label: string;
}> {
  return transitions
    .filter(
      (t) =>
        t.from === currentState &&
        t.roles.includes(userRole) &&
        (!t.guard || (context && t.guard(context))),
    )
    .map((t) => ({
      event: t.event,
      nextState: t.to,
      label: formatEventLabel(t.event),
    }));
}

function formatEventLabel(event: ObservationEvent): string {
  const labels: Record<ObservationEvent, string> = {
    SUBMIT: "Submit for Review",
    APPROVE: "Approve",
    REJECT: "Reject",
    NOTIFY_AUDITEE: "Notify Auditee",
    REQUEST_CLARIFICATION: "Request Clarification",
    SUBMIT_RESPONSE: "Submit Response",
    SUBMIT_COMPLIANCE: "Submit Compliance Evidence",
    VERIFY_COMPLIANCE: "Verify Compliance",
    CLOSE: "Close Observation",
  };
  return labels[event];
}
```

**Key Characteristics:**

- Type-safe states and events (discriminated unions)
- Role-based transitions (auditor vs audit_manager vs CAE vs auditee)
- Guard conditions (severity-based routing)
- Zero dependencies (plain TypeScript)
- Testable (pure functions)

**When to Use XState Instead:**

- Hierarchical states (parent/child state relationships)
- Visual debugging needed (inspect state machine in browser)
- Complex parallel states
- Need for state machine visualization tools

**Sources:**

- [DEV: You Don't Need a Library for State Machines](https://dev.to/davidkpiano/you-don-t-need-a-library-for-state-machines-k7h)
- [Medium: Composable State Machines in TypeScript](https://medium.com/@MichaelVD/composable-state-machines-in-typescript-type-safe-predictable-and-testable-5e16574a6906)

### Pattern 7: PostgreSQL Audit Trail with Triggers

**What:** Append-only audit table capturing all changes (INSERT, UPDATE, DELETE) automatically via PostgreSQL triggers, storing row data as jsonb.

**Why:** Immutable audit trail required for banking compliance. Trigger-based approach is transparent to application code (works even if app forgets to log). jsonb storage flexible (survives schema changes).

**Implementation:**

```sql
-- Audit table schema
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  row_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],

  -- Transaction metadata
  transaction_id BIGINT NOT NULL DEFAULT txid_current(),
  transaction_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Session metadata
  user_id UUID,
  tenant_id UUID NOT NULL,
  session_id TEXT,
  client_ip INET,
  application_name TEXT,

  -- Indexing
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_audit_log_table_row ON audit_log(table_name, row_id);
CREATE INDEX idx_audit_log_tenant ON audit_log(tenant_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(transaction_timestamp);

-- Generic trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  changed_fields TEXT[];
BEGIN
  -- Capture old/new data based on operation
  IF (TG_OP = 'UPDATE') THEN
    old_data = to_jsonb(OLD);
    new_data = to_jsonb(NEW);

    -- Calculate changed fields
    SELECT array_agg(key)
    INTO changed_fields
    FROM jsonb_each(new_data)
    WHERE new_data->key IS DISTINCT FROM old_data->key;

  ELSIF (TG_OP = 'DELETE') THEN
    old_data = to_jsonb(OLD);
    new_data = NULL;

  ELSIF (TG_OP = 'INSERT') THEN
    old_data = NULL;
    new_data = to_jsonb(NEW);
  END IF;

  -- Insert audit record
  INSERT INTO audit_log (
    table_name,
    operation,
    row_id,
    old_data,
    new_data,
    changed_fields,
    user_id,
    tenant_id,
    client_ip,
    application_name
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    old_data,
    new_data,
    changed_fields,
    current_setting('app.current_user_id', TRUE)::UUID,
    current_setting('app.current_tenant_id', TRUE)::UUID,
    inet_client_addr(),
    current_setting('application_name', TRUE)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to observation table
CREATE TRIGGER audit_observations
  AFTER INSERT OR UPDATE OR DELETE ON observations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Repeat for other tables requiring audit trail
CREATE TRIGGER audit_compliance_requirements
  AFTER INSERT OR UPDATE OR DELETE ON compliance_requirements
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

**Application Integration:**

```typescript
// src/data-access/prisma.ts (modified)
export async function prismaForTenant(tenantId: string, userId?: string) {
  return globalPrisma.$extends({
    query: {
      $allOperations: async ({ operation, model, args, query }) => {
        return globalPrisma.$transaction(async (tx) => {
          // Set tenant context for RLS
          await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, TRUE)`;

          // Set user context for audit trail
          if (userId) {
            await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, TRUE)`;
          }

          return query(args);
        });
      },
    },
  });
}
```

**Querying Audit Trail:**

```typescript
// src/data-access/audit.ts
import "server-only";
import { prismaForTenant } from "./prisma";

export async function getAuditTrail(
  tenantId: string,
  filters: {
    tableName?: string;
    rowId?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  },
) {
  const prisma = await prismaForTenant(tenantId);

  return prisma.$queryRaw`
    SELECT
      id,
      table_name,
      operation,
      row_id,
      old_data,
      new_data,
      changed_fields,
      transaction_timestamp,
      user_id,
      client_ip
    FROM audit_log
    WHERE tenant_id = ${tenantId}
      AND (${filters.tableName}::TEXT IS NULL OR table_name = ${filters.tableName})
      AND (${filters.rowId}::UUID IS NULL OR row_id = ${filters.rowId})
      AND (${filters.userId}::UUID IS NULL OR user_id = ${filters.userId})
      AND (${filters.startDate}::TIMESTAMPTZ IS NULL OR transaction_timestamp >= ${filters.startDate})
      AND (${filters.endDate}::TIMESTAMPTZ IS NULL OR transaction_timestamp <= ${filters.endDate})
    ORDER BY transaction_timestamp DESC
    LIMIT 1000
  `;
}
```

**Key Characteristics:**

- Append-only (audit records never updated or deleted)
- Automatic (trigger fires on all changes, transparent to app)
- jsonb storage (survives schema changes, queryable with jsonb operators)
- Transaction metadata (txid, timestamp, user, IP)
- Tenant-scoped (audit trail isolated per tenant)

**Limitations:**

- Table grows indefinitely (needs archival strategy for long-term)
- Trigger overhead (small performance cost on writes)
- Not suitable for extremely high-write tables (consider alternative like Debezium CDC)

**Sources:**

- [PostgreSQL Wiki: Audit Trigger 91plus](https://wiki.postgresql.org/wiki/Audit_trigger_91plus)
- [Medium: PostgreSQL Trigger-Based Audit Log](https://medium.com/israeli-tech-radar/postgresql-trigger-based-audit-log-fd9d9d5e412c)

---

## Data Flow

### Read Flow (Dashboard Page Example)

```
1. User navigates to /dashboard
   ↓
2. proxy.ts checks session cookie (optimistic)
   ↓ (valid cookie)
3. DashboardPage server component renders
   ↓
4. auth.api.getSession({ headers }) — validate session
   ↓ (session valid)
5. getDashboardData(session.user.tenantId) — DAL function
   ├─ validateSession() again at DAL entry
   ├─ prismaForTenant(tenantId) — returns RLS-enabled client
   ├─ Execute queries (RLS automatically filters by tenant)
   └─ Return aggregated data
   ↓
6. Pass data as props to client components
   ├─ <HealthScoreCard compliant={data.compliant} total={data.total} />
   ├─ <FindingsCountCards summary={data.findingsSummary} />
   └─ <AuditCoverageChart audits={data.audits} />
   ↓
7. Client components render with data (interactive UI only)
```

### Write Flow (Observation Status Update Example)

```
1. Auditee clicks "Submit Compliance" button
   ↓
2. Client component calls server action: updateObservationStatus(id, 'compliance_submitted')
   ↓
3. Server action executes (src/actions/observations.ts)
   ├─ auth.api.getSession({ headers }) — validate session
   ├─ Zod schema validation on input
   ├─ prismaForTenant(tenantId) — get RLS client
   ├─ Fetch current observation (RLS filters by tenant)
   ├─ validateTransition(current, new, role, context) — state machine check
   ├─ prisma.observation.update() — UPDATE query
   │   ├─ RLS enforces tenant isolation
   │   └─ Trigger fires → audit_log INSERT
   ├─ prisma.observationTimeline.create() — timeline event
   ├─ revalidatePath('/findings') — clear cache
   └─ Return { success: true }
   ↓
4. Client component receives result
   ├─ Update UI optimistically or show success message
   └─ Next.js re-renders page with fresh data (revalidatePath triggered)
```

### Upload Flow (Evidence File)

```
1. Auditee selects file in <EvidenceUpload /> component
   ↓
2. Component calls generateUploadUrl(filename, fileType, observationId)
   ↓
3. Server action generates presigned URL
   ├─ auth.api.getSession({ headers }) — validate
   ├─ Generate unique S3 key: {tenantId}/observations/{observationId}/{nanoid}.{ext}
   ├─ Create PutObjectCommand with key
   ├─ getSignedUrl(s3Client, command, { expiresIn: 60 })
   └─ Return { uploadUrl, fileUrl }
   ↓
4. Client receives presigned URL (valid for 60 seconds)
   ↓
5. Client uploads file directly to S3
   fetch(uploadUrl, { method: 'PUT', body: file })
   ↓
6. On success, client calls recordEvidence(observationId, fileUrl, metadata)
   ↓
7. Server action records evidence in DB
   ├─ auth.api.getSession({ headers }) — validate
   ├─ prismaForTenant(tenantId)
   ├─ prisma.evidence.create({ observationId, fileUrl, ... })
   │   └─ Trigger fires → audit_log INSERT
   ├─ revalidatePath(`/findings/${observationId}`)
   └─ Return { success: true }
   ↓
8. UI shows uploaded evidence with link to S3
```

---

## Integration Points

### Page-by-Page Migration Map

| Route                 | Current (v1.0)                                      | v2.0 Changes                                 | Component Impact                                           | DAL Functions                                      | Server Actions                                                                                   | Priority                |
| --------------------- | --------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------- |
| **/login**            | Demo auth (localStorage)                            | Better Auth client                           | Medium — Replace login form logic                          | `session.ts`                                       | N/A                                                                                              | P0 (blocks everything)  |
| **/dashboard**        | Import from @/data                                  | Server component with DAL queries            | Low — Components receive props                             | `getDashboardData()`                               | N/A                                                                                              | P0 (first feature page) |
| **/compliance**       | Import from @/data                                  | Server component + filters from searchParams | Low-Medium — Table receives data, filters stay client-side | `getComplianceRequirements()`                      | `updateComplianceStatus()`                                                                       | P1                      |
| **/audit-plans**      | Import from @/data                                  | Server component + calendar/card views       | Low — Components receive audit plans array                 | `getAuditPlans()`, `getAuditPlanById()`            | `createAuditPlan()`, `updateAuditPlan()`                                                         | P1                      |
| **/findings**         | Import from @/data                                  | Server component + filters from searchParams | Low — Table receives data                                  | `getObservations()`                                | N/A (read-only list)                                                                             | P1                      |
| **/findings/[id]**    | Import from @/data, find by ID                      | Server component fetches single observation  | Low — Detail components receive observation + timeline     | `getObservationById()`, `getObservationTimeline()` | `updateObservationStatus()`, `addComment()`                                                      | P2                      |
| **/auditee**          | Placeholder                                         | NEW auditee portal                           | High — NEW components                                      | `getAuditeeObservations()`                         | `submitAuditeeResponse()`, `submitCompliance()`                                                  | P2                      |
| **/reports**          | Import from @/data, aggregations in report-utils.ts | Server component with board report DAL       | Low — Report sections receive aggregated data              | `getBoardReportData()`                             | N/A (read-only)                                                                                  | P2                      |
| **/settings**         | Placeholder                                         | User profile + tenant settings               | High — NEW forms                                           | `getUserProfile()`, `getTenantSettings()`          | `updateUserProfile()`, `updateTenantSettings()`                                                  | P3                      |
| **Onboarding Wizard** | N/A                                                 | NEW multi-step wizard                        | High — NEW pages and components                            | `getOnboardingState()`, `getRbiMasterDirections()` | `selectTier()`, `selectApplicableRequirements()`, `uploadOrgStructure()`, `completeOnboarding()` | P0 (first-run)          |

### New Components to Create

| Component                   | Type   | Purpose                                      | Dependencies                       | Complexity |
| --------------------------- | ------ | -------------------------------------------- | ---------------------------------- | ---------- |
| **OnboardingWizard**        | Server | Multi-step wizard container                  | Better Auth session                | Medium     |
| **TierSelector**            | Client | UCB tier selection (Tier I/II/III/IV)        | Server action                      | Low        |
| **RbiRequirementsSelector** | Client | Checklist of RBI Master Directions           | Server action, virtualized list    | Medium     |
| **OrgStructureUpload**      | Client | Excel template upload + manual forms         | S3 presigned upload action         | Medium     |
| **ObservationForm**         | Client | Create/edit observation with validation      | Server action, Zod validation      | High       |
| **StatusTransitionForm**    | Client | Change observation status with state machine | Server action, state machine lib   | Medium     |
| **EvidenceUpload**          | Client | S3 presigned URL upload for evidence files   | S3 upload action                   | Medium     |
| **AuditeeResponseForm**     | Client | Auditee clarification/compliance submission  | Server action, file upload         | Medium     |
| **CommentThread**           | Client | Discussion thread on observations            | Server action (real-time optional) | Low-Medium |
| **BoardReportGenerator**    | Server | React-PDF board report generation            | DAL aggregations, React-PDF        | High       |
| **AuditTrailViewer**        | Client | Paginated audit log with filters             | DAL audit queries                  | Medium     |

### Modified Existing Components

| Component              | Current Import                                        | New Props                                            | Migration Effort                                    |
| ---------------------- | ----------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| **HealthScoreCard**    | `import { demoComplianceRequirements } from '@/data'` | `{ compliant: number, total: number }`               | LOW — Replace data source, same calculation         |
| **FindingsCountCards** | `import { findings } from '@/data'`                   | `{ summary: { critical, high, medium, low } }`       | LOW — Replace data source, same UI                  |
| **AuditCoverageChart** | `import { auditPlans } from '@/data'`                 | `{ audits: AuditPlan[] }`                            | LOW — Replace data source, same chart               |
| **RiskIndicatorPanel** | `import { findings } from '@/data'`                   | `{ riskMetrics: RiskMetrics }`                       | LOW — Replace data source, same UI                  |
| **RegulatoryCalendar** | `import { demoComplianceRequirements } from '@/data'` | `{ upcomingDeadlines: Deadline[] }`                  | LOW — Replace data source, same calendar            |
| **ComplianceTable**    | `import { demoComplianceRequirements } from '@/data'` | `{ requirements: ComplianceRequirement[] }`          | LOW-MEDIUM — Replace data, add status update action |
| **FindingsTable**      | `import { findings } from '@/data'`                   | `{ findings: Observation[] }`                        | LOW — Replace data, same table UI                   |
| **FindingDetail**      | `import { findings } from '@/data', find by ID`       | `{ observation: Observation, timeline: Timeline[] }` | LOW — Replace data fetching, same detail UI         |
| **AuditFilterBar**     | Client state only                                     | Add `onFilterChange` callback for searchParams       | LOW — Wire up to server component                   |
| **ComplianceFilters**  | Client state only                                     | Add `onFilterChange` callback for searchParams       | LOW — Wire up to server component                   |

---

## Scaling Considerations

### Single VPS Deployment (Pilot A/B)

**Target:** AWS Lightsail Mumbai, 2 vCPU, 4GB RAM, 80GB SSD ($29/month)

**Architecture:**

```
AWS Lightsail VPS (ap-south-1)
├── Docker Compose
│   ├── nextjs (standalone build)
│   │   ├── Port 3000 (internal)
│   │   └── PM2 process manager
│   ├── postgres:16-alpine
│   │   ├── Port 5432 (internal)
│   │   └── Volume: /var/lib/postgresql/data
│   └── nginx (reverse proxy)
│       ├── Port 443 (HTTPS)
│       ├── SSL via Let's Encrypt (Certbot)
│       └── Security headers
├── AWS S3 (Mumbai)
│   └── Evidence file storage
└── AWS SES (Mumbai)
    └── Email notifications
```

**Docker Compose:**

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    container_name: aegis-postgres
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  nextjs:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: aegis-nextjs
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      BETTER_AUTH_URL: ${APP_URL}
      AWS_REGION: ap-south-1
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
      S3_BUCKET_NAME: ${S3_BUCKET_NAME}
      NODE_ENV: production
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    container_name: aegis-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - nextjs
    restart: unless-stopped

volumes:
  postgres_data:
```

**Next.js Dockerfile (Multi-stage):**

```dockerfile
# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable pnpm && pnpm build

# Stage 3: Production
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
```

**Capacity Estimates (Single VPS):**

| Metric               | Estimate | Basis                                  |
| -------------------- | -------- | -------------------------------------- |
| **Concurrent users** | 50-100   | 4GB RAM, Next.js standalone            |
| **Tenant limit**     | 10-20    | Pilot A/B scope                        |
| **Database size**    | 5-10GB   | Assuming 100K observations over pilot  |
| **S3 storage**       | 20-50GB  | Evidence files (PDFs, screenshots)     |
| **Request/sec**      | 100-200  | Typical audit workflow (not real-time) |

### Scaling Path (Post-Pilot)

**Phase 1: Vertical Scaling (Months 3-6)**

- Upgrade Lightsail to 4 vCPU, 8GB RAM ($58/month)
- Increase PostgreSQL connection pool (Prisma config)
- Add Redis for session caching (Docker Compose service)

**Phase 2: Managed Services (Months 6-12)**

- Migrate PostgreSQL to AWS RDS (db.t4g.medium, Multi-AZ)
- Move Next.js to AWS Fargate (ECS, auto-scaling)
- Add CloudFront CDN for static assets
- AWS SES production access (out of sandbox)

**Phase 3: Multi-Region (Year 2+)**

- Read replicas in other Indian regions (if needed)
- Multi-region S3 buckets for compliance
- Consider separate instances per large tenant (if contractually required)

**Performance Bottlenecks (Expected):**

1. **PostgreSQL connection exhaustion** — Prisma connection pooling (configured in DATABASE_URL), PgBouncer if needed
2. **Next.js build time** — Incremental Static Regeneration (ISR) for reports, caching
3. **S3 presigned URL generation** — Cache URLs for 55 seconds (before 60s expiry)
4. **Audit log table growth** — Partitioning by month, archival to cold storage after 2 years

---

## Anti-Patterns

### Anti-Pattern 1: Client Components Importing Data Directly

**What:** Client components with `"use client"` importing from `@/data` or `src/data-access/`.

**Why Bad:** Client components cannot be async, therefore cannot await database queries. Importing DAL functions (which use `'server-only'`) into client components causes build errors.

**Example:**

```typescript
// ❌ WRONG
'use client';
import { getObservations } from '@/data-access/observations'; // Build error

export function FindingsTable() {
  const findings = getObservations(); // Cannot await in client component
  return <table>...</table>;
}
```

**Instead:**

```typescript
// ✅ CORRECT — Server Component Parent
// app/findings/page.tsx
import { getObservations } from '@/data-access/observations';
import { FindingsTable } from '@/components/findings/findings-table';

export default async function FindingsPage() {
  const findings = await getObservations();
  return <FindingsTable findings={findings} />;
}

// ✅ CORRECT — Client Component Receives Props
// components/findings/findings-table.tsx
'use client';
export function FindingsTable({ findings }: { findings: Observation[] }) {
  // Client-side interactivity only (sorting, filtering UI state)
  return <table>...</table>;
}
```

### Anti-Pattern 2: Middleware for Authentication

**What:** Using Next.js middleware (or Next.js 16 proxy) for full session validation with database queries.

**Why Bad:** Middleware/proxy runs on every request, including static assets. Database queries in middleware create performance bottleneck. Better Auth and Next.js 16 docs explicitly recommend optimistic checks only in proxy.

**Example:**

```typescript
// ❌ WRONG
export async function proxy(request: NextRequest) {
  // Database query on EVERY request (including /_next/static/*)
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.redirect("/login");
  return NextResponse.next();
}
```

**Instead:**

```typescript
// ✅ CORRECT — Optimistic cookie check in proxy
export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

// ✅ CORRECT — Full validation on protected page
export default async function ProtectedPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  // Proceed with page
}
```

### Anti-Pattern 3: App-Level Tenant Filtering

**What:** Adding `WHERE tenant_id = ?` to every Prisma query manually in application code.

**Why Bad:** Easy to forget, security vulnerability (one missing WHERE clause leaks cross-tenant data), not DRY.

**Example:**

```typescript
// ❌ WRONG
export async function getObservations(tenantId: string) {
  return prisma.observation.findMany({
    where: { tenantId }, // Easy to forget in some queries
  });
}
```

**Instead:**

```typescript
// ✅ CORRECT — RLS enforced at database level
export async function getObservations(tenantId: string) {
  const prisma = await prismaForTenant(tenantId);
  return prisma.observation.findMany({
    // No WHERE tenantId needed, RLS policy enforces it
  });
}
```

**Why RLS is superior:** Even if developer forgets filtering, database blocks cross-tenant access. Defense in depth.

### Anti-Pattern 4: Nested Server Actions

**What:** Server Action calling another Server Action.

**Why Bad:** Server Actions use POST requests, not composable. Creates unnecessary network hops. Recommended pattern is shared DAL functions.

**Example:**

```typescript
// ❌ WRONG
"use server";
export async function updateObservation(id: string, data: any) {
  await validateSession(); // Server action calling server action
  return prisma.observation.update({ where: { id }, data });
}

export async function submitObservation(id: string) {
  await updateObservation(id, { status: "submitted" }); // Nested call
}
```

**Instead:**

```typescript
// ✅ CORRECT — Shared DAL function
// src/data-access/observations.ts
async function updateObservationInternal(prisma, id, data) {
  return prisma.observation.update({ where: { id }, data });
}

// src/actions/observations.ts
("use server");
export async function submitObservation(id: string) {
  const session = await validateSession();
  const prisma = await prismaForTenant(session.user.tenantId);
  return updateObservationInternal(prisma, id, { status: "submitted" });
}
```

### Anti-Pattern 5: Direct S3 Upload Without Server Validation

**What:** Client component uploading to S3 using static credentials or without server-generated presigned URL.

**Why Bad:** Exposes AWS credentials to client, no control over upload location/naming, no tenant isolation.

**Example:**

```typescript
// ❌ WRONG
"use client";
const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_KEY, // Exposed to client!
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET, // NEVER do this
  },
});
```

**Instead:**

```typescript
// ✅ CORRECT — Server action generates presigned URL
const { uploadUrl } = await generateUploadUrl(
  filename,
  fileType,
  observationId,
);
await fetch(uploadUrl, { method: "PUT", body: file });
```

---

## Build Dependency Chain

### Dependency Order (What Depends on What)

```
Phase 0: Infrastructure
├── Docker Compose setup
├── PostgreSQL container
└── S3 bucket + IAM user

Phase 1: Database Schema
├── Prisma schema definition
├── RLS policies
├── Audit trigger function
└── Initial migration

Phase 2: Authentication
├── Better Auth configuration
├── proxy.ts for route protection
├── API routes (/api/auth/[...all])
└── Login page

Phase 3: Data Access Layer
├── src/data-access/session.ts (depends on Better Auth)
├── src/data-access/prisma.ts (depends on RLS policies)
├── Individual DAL files (depend on prisma.ts)
└── State machine library

Phase 4: Server Actions
├── src/actions/*.ts (depend on DAL + session validation)
└── S3 upload action (depends on S3 bucket + IAM)

Phase 5: Component Migration
├── Dashboard page (depends on DAL)
├── Compliance page (depends on DAL + server actions)
├── Findings pages (depends on DAL + server actions + state machine)
├── Auditee portal (depends on all above + new components)
└── Onboarding wizard (depends on all above)

Phase 6: Reports & Audit Trail
├── Board report generation (depends on DAL aggregations)
└── Audit trail viewer (depends on audit log queries)
```

### Build Order (First to Last)

| Order | What to Build                   | Why First                                    | Blocks                    |
| ----- | ------------------------------- | -------------------------------------------- | ------------------------- |
| 1     | **Docker Compose + PostgreSQL** | Infrastructure foundation                    | Everything                |
| 2     | **Prisma Schema**               | Defines database structure                   | DAL, migrations           |
| 3     | **RLS Policies**                | Tenant isolation must exist before data      | DAL queries               |
| 4     | **Audit Trigger**               | Must be in place before writes               | All mutations             |
| 5     | **Better Auth Setup**           | Authentication blocks all features           | Login, session validation |
| 6     | **Login Page**                  | First user-facing feature                    | All authenticated routes  |
| 7     | **Data Access Layer**           | Centralized queries needed by all pages      | Pages, actions            |
| 8     | **State Machine**               | Observation workflow rules needed by actions | Observation mutations     |
| 9     | **Server Actions**              | Mutations needed by forms                    | Interactive features      |
| 10    | **Dashboard Page**              | First feature page (read-only, simpler)      | User validation           |
| 11    | **Compliance Page**             | Simple CRUD, table pattern                   | Other CRUD pages          |
| 12    | **Findings List**               | Read-only list, similar to compliance        | Findings detail           |
| 13    | **Findings Detail**             | Observation detail + timeline                | Observation forms         |
| 14    | **Observation Forms**           | Create/edit observations                     | Core workflow             |
| 15    | **Status Transitions**          | Observation lifecycle                        | Auditee portal            |
| 16    | **Auditee Portal**              | Auditee response + compliance                | Full workflow             |
| 17    | **Evidence Upload**             | S3 presigned upload                          | Evidence management       |
| 18    | **Onboarding Wizard**           | Tenant setup flow                            | New tenant activation     |
| 19    | **Board Reports**               | Aggregations + PDF generation                | Reporting                 |
| 20    | **Audit Trail Viewer**          | Compliance visibility                        | Audit compliance          |

### Parallel vs Sequential

**Can Build in Parallel:**

- Docker Compose setup + Prisma schema definition
- Better Auth configuration + RLS policies (independent)
- DAL functions for different entities (observations, compliance, audit-plans) — independent
- Server actions for different features (observations, uploads, profile) — independent
- Component migrations (dashboard widgets don't depend on each other)

**Must Build Sequentially:**

- Prisma schema → RLS policies → DAL (schema defines tables, RLS protects them, DAL queries them)
- Better Auth → Login page → Protected pages (auth must work before protecting routes)
- DAL → Server Actions (actions call DAL functions)
- Server Actions → Forms (forms call actions)
- Observation forms → Auditee portal (portal submits responses via observation actions)

---

## Sources

### Official Documentation (HIGH Confidence)

- [Next.js: Updating Data](https://nextjs.org/docs/app/getting-started/updating-data) — Data Access Layer pattern, Server Actions
- [Better Auth: Next.js Integration](https://www.better-auth.com/docs/integrations/next) — Next.js 16 proxy, session management
- [Prisma Client Extensions: Row-Level Security](https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security) — RLS implementation pattern
- [PostgreSQL Wiki: Audit Trigger 91plus](https://wiki.postgresql.org/wiki/Audit_trigger_91plus) — Audit trail trigger pattern

### Community Resources (MEDIUM Confidence)

- [Medium: Advanced Patterns for 2026](https://medium.com/@beenakumawat002/next-js-app-router-advanced-patterns-for-2026-server-actions-ppr-streaming-edge-first-b76b1b3dcac7) — Authentication at data access points
- [Medium: Multi-Tenant RLS with Prisma](https://medium.com/@francolabuschagne90/securing-multi-tenant-applications-using-row-level-security-in-postgresql-with-prisma-orm-4237f4d4bd35) — RLS practical implementation
- [Coner Murphy: Presigned URLs in Next.js](https://conermurphy.com/blog/presigned-urls-nextjs-s3-upload/) — S3 upload pattern
- [Medium: Composable State Machines in TypeScript](https://medium.com/@MichaelVD/composable-state-machines-in-typescript-type-safe-predictable-and-testable-5e16574a6906) — Plain TypeScript state machine
- [DEV: You Don't Need a Library for State Machines](https://dev.to/davidkpiano/you-don-t-need-a-library-for-state-machines-k7h) — XState vs plain TypeScript

### Deployment Resources (MEDIUM Confidence)

- [Medium: Dockerizing Next.js with PostgreSQL and Prisma](https://medium.com/@abhijariwala/dockerizing-a-next-js-and-node-js-app-with-postgresql-and-prisma-a-complete-guide-000527023e99) — Docker Compose structure
- [Johnny Metz: Dockerize Next.js App](https://johnnymetz.com/posts/dockerize-nextjs-app/) — Multi-stage Dockerfile pattern
- [DEV: Next.js Docker Multistage](https://dev.to/simplr_sh/hosting-your-nextjs-app-with-docker-a-multi-stage-approach-52ne) — Production Docker setup

---

**Research complete. Ready for roadmap creation and phase planning.**
